#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Syncs all required GitHub Actions secrets from local .env files.
  Run from the repository root: pwsh scripts/sync-secrets-to-github.ps1

.NOTES
  Requires: GitHub CLI (gh) authenticated to MAStif55/somanatha-shop
  Source files: .env.local  +  functions/.env
#>

$Repo   = "MAStif55/somanatha-shop"
$EnvLocal     = Join-Path $PSScriptRoot ".." ".env.local"
$EnvFunctions = Join-Path $PSScriptRoot ".." "functions" ".env"

# ─── ANSI helpers ─────────────────────────────────────────────────────────────
function Write-OK   { param($m) Write-Host "  [OK] $m" -ForegroundColor Green  }
function Write-FAIL { param($m) Write-Host "  [!!] $m" -ForegroundColor Red    }
function Write-SKIP { param($m) Write-Host "  [--] $m" -ForegroundColor Yellow }
function Write-INFO { param($m) Write-Host "  [i]  $m" -ForegroundColor Cyan   }

# ─── Parse a .env file into a hashtable ──────────────────────────────────────
function Read-DotEnv {
    param([string]$Path)
    $vars = @{}
    if (-not (Test-Path $Path)) { return $vars }
    foreach ($line in Get-Content $Path -Encoding UTF8) {
        $line = $line.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { continue }
        $idx = $line.IndexOf("=")
        if ($idx -lt 1) { continue }
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim().Trim('"').Trim("'")
        $vars[$key] = $val
    }
    return $vars
}

# ─── Push one secret with up to 3 retries ─────────────────────────────────────
function Push-Secret {
    param([string]$Key, [string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-SKIP "$Key  (empty — skipping)"
        return $false
    }

    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $result = $Value | gh secret set $Key --repo $Repo 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "$Key"
            return $true
        }
        if ($attempt -lt 3) {
            Write-Host "    Attempt $attempt failed, retrying in 3s..." -ForegroundColor DarkYellow
            Start-Sleep -Seconds 3
        }
    }
    Write-FAIL "$Key  →  $result"
    return $false
}

# ─── MAIN ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SOMANATHA SHOP — GitHub Secrets Sync" -ForegroundColor Cyan
Write-Host "  Repo: $Repo" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Load both env files
$envL = Read-DotEnv $EnvLocal
$envF = Read-DotEnv $EnvFunctions

# Merge: functions/.env wins for keys present in both (it has real SMTP/Telegram values)
$merged = @{}
foreach ($k in $envL.Keys) { $merged[$k] = $envL[$k] }
foreach ($k in $envF.Keys) { $merged[$k] = $envF[$k] }   # overwrite with production values

Write-INFO "Loaded $($envL.Count) vars from .env.local"
Write-INFO "Loaded $($envF.Count) vars from functions/.env"
Write-INFO "Merged total: $($merged.Count) unique keys"
Write-Host ""

# ─── SECRET MANIFEST ──────────────────────────────────────────────────────────
# Maps GitHub Secret name → key to look up in the merged env (same unless noted)
$manifest = @(
    # Firebase Client SDK
    @{ Secret = "NEXT_PUBLIC_FIREBASE_API_KEY";             Env = "NEXT_PUBLIC_FIREBASE_API_KEY"             },
    @{ Secret = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN";         Env = "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"         },
    @{ Secret = "NEXT_PUBLIC_FIREBASE_PROJECT_ID";          Env = "NEXT_PUBLIC_FIREBASE_PROJECT_ID"          },
    @{ Secret = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET";      Env = "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"      },
    @{ Secret = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"; Env = "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" },
    @{ Secret = "NEXT_PUBLIC_FIREBASE_APP_ID";              Env = "NEXT_PUBLIC_FIREBASE_APP_ID"              },
    @{ Secret = "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID";      Env = "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"      },
    # Telegram
    @{ Secret = "TELEGRAM_BOT_TOKEN";   Env = "TELEGRAM_BOT_TOKEN" },
    @{ Secret = "TELEGRAM_CHAT_ID";     Env = "TELEGRAM_CHAT_ID"   },
    # SMTP / Email
    @{ Secret = "SMTP_HOST";    Env = "SMTP_HOST"    },
    @{ Secret = "SMTP_PORT";    Env = "SMTP_PORT"    },
    @{ Secret = "SMTP_USER";    Env = "SMTP_USER"    },
    @{ Secret = "SMTP_PASS";    Env = "SMTP_PASS"    },
    @{ Secret = "EMAIL_FROM";   Env = "EMAIL_FROM"   },
    @{ Secret = "EMAIL_TO";     Env = "EMAIL_TO"     },
    # YooKassa
    @{ Secret = "YOOKASSA_SHOP_ID";    Env = "YOOKASSA_SHOP_ID"    },
    @{ Secret = "YOOKASSA_SECRET_KEY"; Env = "YOOKASSA_SECRET_KEY" }
)

$ok   = 0
$fail = 0
$skip = 0

Write-Host "  Pushing $($manifest.Count) secrets to GitHub..." -ForegroundColor White
Write-Host ""

foreach ($entry in $manifest) {
    $val = $merged[$entry.Env]
    $result = Push-Secret -Key $entry.Secret -Value $val
    if ($result -eq $true)        { $ok++ }
    elseif ($val -eq $null -or $val -eq "") { $skip++ }
    else                          { $fail++ }
}

# ─── SERVICE ACCOUNT (separate — needs a file) ────────────────────────────────
Write-Host ""
Write-Host "  Checking for Firebase Service Account JSON..." -ForegroundColor White

$saSearchPaths = @(
    (Join-Path $PSScriptRoot ".." "serviceAccount.json"),
    (Join-Path $PSScriptRoot ".." "service-account.json"),
    (Join-Path $PSScriptRoot ".." "firebase-adminsdk.json"),
    (Join-Path $env:USERPROFILE "Downloads" "somanatha-shop-firebase-adminsdk*.json")
)

$saFound = $null
foreach ($p in $saSearchPaths) {
    $resolved = Resolve-Path $p -ErrorAction SilentlyContinue
    if ($resolved) { $saFound = $resolved.Path; break }
}

# Also check Downloads folder with wildcard
if (-not $saFound) {
    $dlMatches = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "*somanatha*adminsdk*.json" -ErrorAction SilentlyContinue
    if (-not $dlMatches) {
        $dlMatches = Get-ChildItem "$env:USERPROFILE\Downloads" -Filter "*firebase*adminsdk*.json" -ErrorAction SilentlyContinue
    }
    if ($dlMatches) { $saFound = $dlMatches[0].FullName }
}

if ($saFound) {
    Write-INFO "Found service account: $saFound"
    $saContent = Get-Content $saFound -Raw -Encoding UTF8
    # Validate it's actually a service account
    if ($saContent -match '"private_key_id"') {
        $result = $saContent | gh secret set FIREBASE_SERVICE_ACCOUNT --repo $Repo 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-OK "FIREBASE_SERVICE_ACCOUNT  (from $([System.IO.Path]::GetFileName($saFound)))"
            $ok++
        } else {
            Write-FAIL "FIREBASE_SERVICE_ACCOUNT  →  $result"
            $fail++
        }
    } else {
        Write-FAIL "File found but doesn't look like a service account JSON: $saFound"
        $fail++
    }
} else {
    Write-Host ""
    Write-Host "  [!!] FIREBASE_SERVICE_ACCOUNT — NOT FOUND" -ForegroundColor Red
    Write-Host ""
    Write-Host "  This secret is required for the backup workflow to export Firestore data." -ForegroundColor Yellow
    Write-Host "  Download it from Firebase Console:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    1. Go to: https://console.firebase.google.com/project/somanatha-shop/settings/serviceaccounts/adminsdk" -ForegroundColor White
    Write-Host "    2. Click: 'Generate new private key'" -ForegroundColor White
    Write-Host "    3. Save the downloaded JSON file to this path:" -ForegroundColor White
    Write-Host "       $((Join-Path $PSScriptRoot '..') | Resolve-Path)\serviceAccount.json" -ForegroundColor Cyan
    Write-Host "    4. Re-run this script — it will auto-detect and upload the file." -ForegroundColor White
    Write-Host ""
    $fail++
}

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RESULTS:" -ForegroundColor Cyan
Write-Host "    OK:      $ok secrets uploaded" -ForegroundColor Green
if ($skip -gt 0) { Write-Host "    SKIPPED: $skip secrets (empty values)" -ForegroundColor Yellow }
if ($fail -gt 0) { Write-Host "    FAILED:  $fail secrets" -ForegroundColor Red }
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) {
    Write-Host "  Some secrets failed. Resolve the issues above and re-run." -ForegroundColor Yellow
    Write-Host "  To re-run:  pwsh scripts\sync-secrets-to-github.ps1" -ForegroundColor White
    exit 1
} else {
    Write-Host "  All secrets synced! Ready to trigger backup." -ForegroundColor Green
    Write-Host "  Run:  gh workflow run backup.yml --repo $Repo" -ForegroundColor White
    exit 0
}
