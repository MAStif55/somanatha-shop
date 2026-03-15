# Upload .env.local secrets to GitHub repository
# Requires: gh CLI installed and authenticated (run 'gh auth login' first)
# Usage: .\scripts\upload-secrets.ps1

$envFile = Join-Path $PSScriptRoot "..\.env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.local not found at $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "=== Uploading secrets from .env.local ===" -ForegroundColor Cyan
Write-Host ""

$lines = Get-Content $envFile
$uploaded = 0
$skipped = 0

foreach ($line in $lines) {
    # Skip comments and empty lines
    if ($line -match '^\s*#' -or $line -match '^\s*$') {
        continue
    }

    # Parse KEY=VALUE
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $key = $Matches[1]
        $value = $Matches[2]

        Write-Host "  Uploading: $key ... " -NoNewline
        try {
            $value | gh secret set $key --repo "MAStif55/somanatha-shop" 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "OK" -ForegroundColor Green
                $uploaded++
            } else {
                Write-Host "FAILED" -ForegroundColor Red
                $skipped++
            }
        } catch {
            Write-Host "FAILED ($_)" -ForegroundColor Red
            $skipped++
        }
    }
}

Write-Host ""
Write-Host "=== Done: $uploaded uploaded, $skipped failed ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next step: Upload your Firebase service account key:" -ForegroundColor Yellow
Write-Host '  1. Download from: https://console.firebase.google.com/project/somanatha-shop/settings/serviceaccounts/adminsdk' -ForegroundColor White
Write-Host '  2. Run: $sa = Get-Content path\to\serviceAccountKey.json -Raw; $sa | gh secret set FIREBASE_SERVICE_ACCOUNT --repo "MAStif55/somanatha-shop"' -ForegroundColor White
