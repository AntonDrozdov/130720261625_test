@echo off
call "%~dp0transfer-images.cmd" -Service backend %*
exit /b %errorlevel%

