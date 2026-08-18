# Deploy the standalone EduBird socket server to the Ubuntu VM and run it with PM2.
# Run this from PowerShell inside the project root directory.

$SSH_KEY = "$HOME\Downloads\ssh-key-2026-07-23.key"
$REMOTE_USER = "ubuntu"
$REMOTE_HOST = "92.4.82.173"
$LOCAL_DIR = "Edubird\socket-server"
$REMOTE_ROOT = "/home/ubuntu/Edubird"
$REMOTE_DIR = "$REMOTE_ROOT/socket-server"
$PROCESS_NAME = "edubird-socket-server"
$TAR_NAME = "edubird-socket-server.tar.gz"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Starting EduBird socket server deployment..." -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

if (-not (Test-Path $LOCAL_DIR)) {
    Write-Error "Local socket server folder not found: $LOCAL_DIR"
    Exit 1
}

Write-Host "[1/6] Checking local socket server syntax..." -ForegroundColor Yellow
Push-Location $LOCAL_DIR
npm run check
$checkStatus = $?
Pop-Location
if (-not $checkStatus) {
    Write-Error "Local socket server syntax check failed."
    Exit 1
}

Write-Host "[2/6] Packaging socket server source..." -ForegroundColor Yellow
if (Test-Path $TAR_NAME) {
    Remove-Item $TAR_NAME -Force
}
tar -czf $TAR_NAME -C $LOCAL_DIR src package.json ecosystem.config.cjs .env.example .gitignore README.md
if (-not $?) {
    Write-Error "Failed to package socket server."
    Exit 1
}

Write-Host "[3/6] Preparing remote folder..." -ForegroundColor Yellow
ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p $REMOTE_ROOT && pm2 delete $PROCESS_NAME || true && rm -rf $REMOTE_DIR.new && mkdir -p $REMOTE_DIR.new"
if (-not $?) {
    Write-Warning "Remote cleanup had warnings; continuing."
}

Write-Host "[4/6] Uploading package to remote server ($REMOTE_HOST)..." -ForegroundColor Yellow
scp -i $SSH_KEY -o StrictHostKeyChecking=no $TAR_NAME "${REMOTE_USER}@${REMOTE_HOST}:/home/ubuntu/$TAR_NAME"
if (-not $?) {
    Write-Error "Failed to upload package via SCP."
    Remove-Item $TAR_NAME -Force
    Exit 1
}

Write-Host "[5/6] Extracting and installing on remote server..." -ForegroundColor Yellow
ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" "tar -xzf /home/ubuntu/$TAR_NAME -C $REMOTE_DIR.new && rm /home/ubuntu/$TAR_NAME && if [ -f $REMOTE_DIR/.env ]; then cp $REMOTE_DIR/.env $REMOTE_DIR.new/.env; else cp $REMOTE_DIR.new/.env.example $REMOTE_DIR.new/.env; fi && rm -rf $REMOTE_DIR.old && if [ -d $REMOTE_DIR ]; then mv $REMOTE_DIR $REMOTE_DIR.old; fi && mv $REMOTE_DIR.new $REMOTE_DIR && cd $REMOTE_DIR && npm install --omit=dev"
if (-not $?) {
    Write-Error "Remote install failed."
    Remove-Item $TAR_NAME -Force
    Exit 1
}

Write-Host "[6/6] Starting socket server via PM2..." -ForegroundColor Yellow
ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" "cd $REMOTE_DIR && pm2 start ecosystem.config.cjs --only $PROCESS_NAME && pm2 save && pm2 status $PROCESS_NAME"
if (-not $?) {
    Write-Error "Failed to start socket server under PM2."
    Remove-Item $TAR_NAME -Force
    Exit 1
}

Write-Host "Cleaning up local temporary package archive..." -ForegroundColor Yellow
Remove-Item $TAR_NAME -Force

Write-Host "=============================================" -ForegroundColor Green
Write-Host "Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "Remote folder: $REMOTE_DIR" -ForegroundColor Green
Write-Host "Open TCP port 3040 on Oracle, or proxy it behind Nginx/443." -ForegroundColor Green
Write-Host "Update env on server: ssh -i $SSH_KEY ${REMOTE_USER}@${REMOTE_HOST} 'nano $REMOTE_DIR/.env && pm2 restart $PROCESS_NAME'" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
