@echo off
pushd "%~dp0"
docker build -t mwworks-frontend:latest .
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %BUILD_EXIT_CODE%

