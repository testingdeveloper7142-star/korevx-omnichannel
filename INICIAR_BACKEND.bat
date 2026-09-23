@echo off
title KorevX Omnichannel - Backend
cd /d "%~dp0backend"
echo ===================================================
echo     Iniciando Backend KorevX (NestJS + Supabase)
echo ===================================================
echo.
node dist\src\main.js
pause
