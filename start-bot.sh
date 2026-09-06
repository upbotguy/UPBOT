#!/usr/bin/env bash

echo "==================================================="
echo "   MYANBOT AI - Solana Sniper & Limit Trading Bot"
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

# Build project
echo "[INFO] Building MYANBOT AI..."
npm run build

# Start bot
echo ""
echo "[INFO] Starting MYANBOT AI..."
echo "==================================================="
echo "Press Ctrl+C anytime to stop."
echo "==================================================="
echo ""
node dist/index.js
