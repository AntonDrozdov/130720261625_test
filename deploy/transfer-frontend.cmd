@echo off
docker save mwworks-frontend:latest | ssh root@45.12.238.40 docker load

