@echo off
title Hostinger PostgreSQL SSH Tunnel
cls
echo ============================================================
echo   Starting Encrypted SSH Tunnel to Hostinger PostgreSQL
echo ============================================================
echo Target VPS: 201.18.202.84
echo Local Port: 5435 -> Remote: 127.0.0.1:5435
echo.
echo If prompted, enter your VPS root password.
echo Keep this window OPEN while developing locally.
echo ============================================================
echo.

ssh -N -L 5435:127.0.0.1:5435 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes root@201.18.202.84

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  Port 5435 tunnel ended or failed. Trying default PostgreSQL port 5432...
    echo.
    ssh -N -L 5435:127.0.0.1:5432 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes root@201.18.202.84
)

pause
