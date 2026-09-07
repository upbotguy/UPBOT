#!/usr/bin/env bash

echo "==================================================="
echo "   UPBOT AI - Solana Sniper & Limit Trading Bot"
echo "                 0% Fee Direct Swap"
echo "==================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
fi

# Check .env
if [ ! -f .env ]; then
    echo "[WARNING] .env file not found!"
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "[IMPORTANT] Created .env from .env.example. Please edit .env with your BOT_TOKEN."
    fi
fi

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies..."
    npm install
fi

# Build project & sync web assets
echo "[INFO] Building UPBOT AI..."
npm run build
mkdir -p dist/server/public
cp -r src/server/public/* dist/server/public/ 2>/dev/null || true

# Start bot
echo ""
echo "[INFO] Starting UPBOT AI..."
echo "==================================================="
echo "Web Dashboard: http://localhost:3000"
echo "Press Ctrl+C anytime to stop."
echo "==================================================="
echo ""
node dist/index.js
