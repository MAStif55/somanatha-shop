<#
.SYNOPSIS
Installs and Provisions Yandex Cloud Infrastructure (VM, MongoDB Serverless, S3) using the YC CLI.
#>
$ErrorActionPreference = "Stop"

$FolderId = "b1gq2s47f6s25vsqrfce"
$KeyFile = "authorized_key.json"

# Check if SSH keys exist locally (required for VM creation)
$SshKeyPath = "$HOME\.ssh\id_rsa"
if (-not (Test-Path "$SshKeyPath.pub")) {
    Write-Host "Creating new SSH key pair for the VM..." -ForegroundColor Yellow
    if (-not (Test-Path "$HOME\.ssh")) { New-Item -ItemType Directory -Force "$HOME\.ssh" | Out-Null }
    # Using cmd.exe to gracefully handle the empty password argument issue in PowerShell
    cmd.exe /c "ssh-keygen -q -t rsa -b 4096 -f `"$SshKeyPath`" -N `"`""
}

$YcPath = "$HOME\yandex-cloud\bin\yc.exe"
if (-not (Test-Path $YcPath)) {
    Write-Host "Downloading and installing Yandex Cloud CLI in the background..." -ForegroundColor Yellow
    iex (New-Object System.Net.WebClient).DownloadString('https://storage.yandexcloud.net/yandexcloud-yc/install.ps1')
}

function Run-Yc {
    param([Parameter(ValueFromRemainingArguments=$true)]$ycargs)
    & $YcPath $ycargs
}

Write-Host "1. Automating Authentication..." -ForegroundColor Green
Run-Yc config profile create somanatha-deploy 2>$null
Run-Yc config set service-account-key $KeyFile
Run-Yc config set folder-id $FolderId

Write-Host "2. Creating Next.js Server (Ubuntu VM)..." -ForegroundColor Green
Run-Yc compute instance create `
  --name somanatha-app-server `
  --folder-id $FolderId `
  --zone ru-central1-a `
  --platform standard-v3 `
  --network-interface subnet-name=default-ru-central1-a,nat=true `
  --create-boot-disk image-folder-id=standard-images,image-family=ubuntu-2204-lts,size=20,type=network-ssd `
  --memory 2G `
  --cores 2 `
  --core-fraction 20 `
  --ssh-key "$SshKeyPath.pub" `
  --async

Write-Host "3. Creating Serverless Managed MongoDB..." -ForegroundColor Green
Run-Yc managed-mongodb cluster create `
  --name somanatha-db `
  --folder-id $FolderId `
  --environment production `
  --network-name default `
  --type serverless `
  --database name=somanatha_data `
  --user name=admin,password="SomanathaSuperSafe123!" `
  --async

Write-Host "4. Creating Object Storage Bucket for Media..." -ForegroundColor Green
$RandomSuffix = Get-Random -Minimum 1000 -Maximum 9999
$BucketName = "somanatha-media-$RandomSuffix"

Run-Yc storage bucket create `
  --name $BucketName `
  --folder-id $FolderId `
  --public-read

Write-Host ""
Write-Host "✅ Provisioning commands have been sent to Yandex Cloud!" -ForegroundColor Green
Write-Host "VM and DB creation usually takes ~3-5 minutes."
Write-Host "To see the IP address of your new server, run: yc compute instance list"
