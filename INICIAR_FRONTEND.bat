@echo off
title KorevX Omnichannel - Frontend
cd /d "%~dp0frontend"
echo ===================================================
echo     Iniciando Frontend KorevX (React + Vite)
echo ===================================================
echo.
node node_modules\vite\bin\vite.js --host --port 5173
pause
