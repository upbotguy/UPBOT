@echo off
title MYANBOT AI - Solana 0% Fee Trading Bot
color 0A

echo ===================================================
echo     MYANBOT AI - Solana Sniper & Limit Trading Bot
echo                  0% Fee Direct Swap
echo ===================================================
echo.

:: Check Node.js installation
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if .env exists
if not exist .env (
    echo [WARNING] .env configuration file not found!
    if exist .env.example (
        echo Creating .env from .env.example...
        copy .env.example .env
        echo [IMPORTANT] Please open .env and enter your BOT_TOKEN and SOLANA_RPC_URL.
        notepad .env
    ) else (
        echo Please create a .env file with your BOT_TOKEN and SOLANA_RPC_URL.
    )
    echo.
    pause
)

:: Install dependencies if node_modules missing
if not exist node_modules (
    echo [INFO] Installing dependencies (first-time setup)...
    call npm install
    echo.
)

:: Build TypeScript code
echo [INFO] Building MYANBOT AI...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Check errors above.
    pause
    exit /b 1
)

:: Start the bot
echo.
echo [INFO] Starting MYANBOT AI Telegram Engine...
echo ===================================================
echo Press Ctrl+C anytime to stop the bot.
echo ===================================================
echo.
node dist/index.js

pause
