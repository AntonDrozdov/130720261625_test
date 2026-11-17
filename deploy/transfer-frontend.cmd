@echo off
call "%~dp0transfer-images.cmd" -Service frontend %*
exit /b %errorlevel%

