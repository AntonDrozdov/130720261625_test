@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0transfer-images.ps1" %*
exit /b %errorlevel%

