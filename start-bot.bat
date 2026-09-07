@echo off
cd /d "%~dp0"

title UPBOT AI - Solana 0% Fee Trading Terminal
color 0A

echo ===================================================
echo      UPBOT AI - Solana Sniper and Limit Trading Bot
echo                   0% Fee Direct Swap
echo ===================================================
echo.

node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist .env (
    echo [WARNING] .env configuration file not found!
    if exist .env.example copy .env.example .env
    notepad .env
    pause
)

if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
)

if not exist dist\index.js (
    echo [INFO] Building TypeScript code...
    call npm run build
)

if exist src\server\public (
    if not exist dist\server\public mkdir dist\server\public
    xcopy /E /I /Y src\server\public dist\server\public >nul 2>&1
)

start "" http://localhost:8926

echo ===================================================
echo   Web Terminal is live at: http://localhost:8926
echo   Press Ctrl+C anytime in this window to stop.
echo ===================================================
echo.

node dist/index.js

echo.
echo [INFO] Bot process stopped.
pause
