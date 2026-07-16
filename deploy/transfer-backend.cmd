@echo off
docker save mwworks-backend:latest | ssh root@45.12.238.40 docker load

