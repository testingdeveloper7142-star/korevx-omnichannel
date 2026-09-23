@echo off
title Subir KorevX a GitHub
color 0b
echo =======================================================
echo         SUBIENDO PROYECTO KOREVX A GITHUB
echo =======================================================
echo.
cd /d "%~dp0"

echo Ejecutando: git push -u origin main
echo Si aparece una ventana emergente de GitHub, haz clic en:
echo "Sign in with your browser"
echo.
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    color 0a
    echo =======================================================
    echo   [EXITO] El codigo se subio correctamente a GitHub!
    echo =======================================================
) else (
    color 0c
    echo =======================================================
    echo   [AVISO] Si pide credenciales, autoriza en el navegador.
    echo =======================================================
)
echo.
echo Presiona cualquier tecla para salir...
pause >nul
