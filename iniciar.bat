@echo off
rem Arranca «Estudia Python» con doble clic (Windows).
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo No se encuentra Node.js. Instálalo desde https://nodejs.org y vuelve a intentarlo.
  pause
  exit /b 1
)

if not exist "node_modules\pyodide\pyodide.mjs" (
  echo Instalando las bibliotecas necesarias ^(solo la primera vez^)...
  call npm install
  if errorlevel 1 (
    echo Error al instalar las bibliotecas.
    pause
    exit /b 1
  )
)

rem Abre el navegador un par de segundos después, cuando el servidor ya esté listo.
start "" cmd /c "timeout /t 2 >nul & start http://127.0.0.1:8000"
node server.mjs
pause
