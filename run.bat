@echo off
setlocal EnableDelayedExpansion
title Aammii Tharcharbu Santhai - Starting...
chcp 65001 >nul 2>&1

echo.
echo  ================================================================
echo    AAMMII THARCHARBU SANTHAI
echo    Natural Lifestyle Products - Farm-direct from Tamil Nadu
echo  ================================================================
echo.

REM --- Find Python (py launcher first, then python, then python3) ---
set PYTHON=
where py >nul 2>&1
if %ERRORLEVEL%==0 ( set PYTHON=py & goto :py_found )
where python >nul 2>&1
if %ERRORLEVEL%==0 ( set PYTHON=python & goto :py_found )
where python3 >nul 2>&1
if %ERRORLEVEL%==0 ( set PYTHON=python3 & goto :py_found )

echo  ERROR: Python not found.
echo  Install Python 3.8+ from https://python.org
echo  (tick "Add Python to PATH" during install)
echo.
pause
exit /b 1

:py_found
for /f "tokens=*" %%v in ('!PYTHON! --version 2^>^&1') do set PY_VER=%%v
echo  Python found: !PY_VER!
echo.

REM --- Install / upgrade required packages ---
echo  Installing dependencies (first run takes a minute)...
!PYTHON! -m pip install --upgrade pip --quiet 2>nul
!PYTHON! -m pip install flask flask-cors pdfplumber pillow reportlab --quiet
if %ERRORLEVEL% NEQ 0 (
  echo  WARNING: Some packages may not have installed correctly.
  echo  Run manually:  pip install flask flask-cors pdfplumber pillow reportlab
  echo.
)
echo  Dependencies ready.
echo.

REM --- Create required directories ---
if not exist "uploads"          mkdir uploads
if not exist "generated_images" mkdir generated_images
if not exist "orders"           mkdir orders

REM --- Auto-open browser after short delay ---
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:5000"

REM --- Start the Flask server ---
echo  Starting server...
echo  Open your browser at:  http://localhost:5000
echo  Admin panel:           http://localhost:5000/#/admin
echo.
echo  Press Ctrl+C to stop the server.
echo.

cd /d "%~dp0backend"
!PYTHON! app.py

echo.
echo  Server stopped.
pause
