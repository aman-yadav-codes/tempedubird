<#
.SYNOPSIS
  Starts an encrypted SSH tunnel to the Hostinger PostgreSQL database.
.DESCRIPTION
  Forwards local port 5435 to remote 127.0.0.1:5435 on Hostinger VPS (201.18.202.84).
#>
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   Starting Encrypted SSH Tunnel to Hostinger PostgreSQL    " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Target VPS: 201.18.202.84"
Write-Host "Local Port: 5435 -> Remote: 127.0.0.1:5435"
Write-Host ""
Write-Host "If prompted, enter your VPS root password." -ForegroundColor Yellow
Write-Host "Keep this PowerShell window OPEN while developing locally." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

ssh -N -L 5435:127.0.0.1:5435 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes root@201.18.202.84

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "⚠️  Port 5435 forward failed. Attempting fallback to remote port 5432..." -ForegroundColor Yellow
    Write-Host ""
    ssh -N -L 5435:127.0.0.1:5432 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes root@201.18.202.84
}
