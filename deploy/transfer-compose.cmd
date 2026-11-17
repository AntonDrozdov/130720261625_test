@echo off
setlocal EnableExtensions
set "REMOTE_HOST=root@45.12.237.102"
set "REMOTE_DIR=/opt/mwworks"
set "COMPOSE_FILE=%~dp0docker-compose.yml"
set "ENV_FILE=%~dp0.env"

if not exist "%COMPOSE_FILE%" (
    echo ERROR: Compose file not found: "%COMPOSE_FILE%"
    exit /b 1
)
if not exist "%ENV_FILE%" (
    echo ERROR: Version file not found: "%ENV_FILE%"
    exit /b 1
)

ssh %REMOTE_HOST% "mkdir -p %REMOTE_DIR%"
if errorlevel 1 goto :error

scp "%COMPOSE_FILE%" "%ENV_FILE%" "%REMOTE_HOST%:%REMOTE_DIR%/"
if errorlevel 1 goto :error

echo Compose and .env uploaded to %REMOTE_HOST%:%REMOTE_DIR%/
echo Containers were not restarted.
exit /b 0

:error
echo ERROR: Transfer failed. Check the output above.
exit /b 1
