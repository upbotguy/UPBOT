# ⚡ UPBOT AI - Solana 0% Fee Telegram Trading Bot & Web Terminal

> **Official Website:** [upbotai.app](https://upbotai.app/)
> **A high-speed, self-hosted Solana Telegram trading bot with 0% fees, Limit Orders (Dip Buy, Take Profit, Stop Loss), Web Dashboard, Portfolio Tracking, and AES-256 Military-Grade Encryption.**

---

## 🌟 Key Features

* **⚡ 0% Trading Fee (No Dev Cut):** Unlike Trojan (1%), BonkBot (1%), or Maestro (1%), UPBOT AI executes direct Jupiter V6 swaps with zero developer fee.
* **⏱️ Full Limit Order Engine:**
  * **Buy the Dip:** Auto-buy when token drops by -5%, -10%, -20%, or custom target price.
  * **Take Profit (TP) & Stop Loss (SL):** Auto-sell when target gain (+25%, +50%, 2x) or stop-loss limit is reached.
  * **Order Management:** View all active orders, inspect live differences, edit target prices or amounts, and cancel/delete anytime.
* **💼 Token Portfolio / Positions Tracker:**
  * Real-time SPL token holdings scan with live USD valuations.
  * 1-Click Quick Sell / Trade directly from the portfolio view.
* **🖥️ Web Trading Terminal & Browser Extension:**
  * Embedded live TradingView chart, multi-wallet switcher, Slippage Bar (1%, 2%, 5%, 10%, 20%, Custom), and Phantom/Solflare extension support.
* **🚀 Turbo Swap Engine:**
  * Dynamic Priority Fees (`Standard`, `High`, `Turbo`).
  * 400ms Leader Rebroadcasting loop & 300ms signature polling to prevent expired transactions.
* **🌐 Multi-Language Support:**
  * **English 🇺🇸** (Default)
  * **Myanmar / Burmese 🇲🇲** (Switchable in 1 click)
* **🛡️ Military-Grade Security & Privacy:**
  * 100% Non-Custodial: Private keys are stored exclusively in your local SQLite database (`upbot.db`).
  * **AES-256-GCM Encryption:** Keys are encrypted with a user-defined secret key.
  * **Admin Whitelist Lock:** Restricts Telegram access strictly to authorized usernames or user IDs.
* **🖱️ 1-Click Launchers:** Ready-to-use `start-bot.bat` (Windows) and `start-bot.sh` (Linux/macOS).

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) v18.0.0 or higher.
* A Telegram account.

### 1. Clone the Repository
```bash
git clone https://github.com/upbotguy/UPBOT.git
cd UPBOT
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your configuration details in `.env`:
```env
# Telegram Bot Token from @BotFather
BOT_TOKEN=your_telegram_bot_token_here

# Solana RPC Endpoint (Recommended: Free Helius RPC)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=your_helius_api_key

# 32-character encryption key for AES-256-GCM
ENCRYPTION_KEY=your_secret_32_char_encryption_key!

# Admin Whitelist (Your Telegram Username without @)
ADMIN_USERNAMES=your_telegram_username
```

### 3. Launch the Bot
* **Windows:** Simply double-click `start-bot.bat`
* **Linux / Mac:** Run `./start-bot.sh`
* **Manual Terminal Run:**
  ```bash
  npm install
  npm run build
  npm start
  ```

---

## 📖 How to Use

1. Open your Telegram bot and send `/start`.
2. Go to **`💳 Wallets`** -> **`➕ Add / Import Wallet`** (or **`🔑 Generate New Wallet`**).
3. Paste any Solana Token Contract Address (CA) into the chat to view the live Token Dashboard.
4. Click **`🟢 Buy`**, **`🔴 Sell`**, or set **`⏱️ Limit Orders`** instantly!

---

## 🗺️ Project Roadmap (6-Phase Protocol Evolution)

Structured evolution from self-hosted bot to full decentralized trading suite.

### Phase 1: Fair Launch & Core Bot `[DONE]`
* [x] 1B $UPBOT Token Minted (`UPLs8yhf76YyB1DnEZGmjDBPE3okTT3ZdaEp2uWMo6t`)
* [x] Raydium CPMM Pool Deployed
* [x] 100% LP Locked on Streamflow (1-Year)
* [x] Mint & Freeze Authority Revoked
* [x] DexScreener Paid & Verified
* [x] Live 0% Fee Jupiter V6 Terminal

### Phase 2: Copy-Trading Engine `[DONE]`
* [x] 1-Click Whale & KOL Auto-Copy
* [x] Target Wallet Activity Tracker
* [x] Custom Buy/Sell Multipliers
* [x] Anti-MEV / Priority Fee Turbo
* [x] Interactive PnL Card Generator
* [x] 0.008 SOL Network Safety Reserve & Slippage Defense

### Phase 3: UPBOT Fair Launchpad & 100% Auto-Buyback Burn `[IN PROGRESS]`
* [x] Solana Bonding Curve AMM (0 Initial Seed Cost)
* [x] Mandatory 1% Platform Fee (Treasury Vault)
* [x] Creator Royalty Custom Allocation (0% - 4%)
* [x] 100% Fee Auto-Buyback & Burn for $UPBOT via Raydium CPMM
* [x] Token-2022 TransferFeeConfig On-Chain Extension
* [x] Automatic Raydium DEX Graduation at 85 SOL

### Phase 4: Multi-Chain (BSC / BNB) `[UPCOMING]`
* [ ] BNB Chain (BSC) Integration
* [ ] PancakeSwap V3 Direct Routing
* [ ] Unified Dual-Chain Telegram Bot
* [ ] Auto BNB/SOL Gas Station
* [ ] Cross-Chain Token Bridge

### Phase 5: TradFi & CEX Bridge `[PLANNED]`
* [ ] Robinhood Portfolio Sync API
* [ ] Real-time Stock & Forex Alerts
* [ ] Top CEX (Binance, Bybit) Watcher
* [ ] Cross-Market Arbitrage Signals
* [ ] Global Macro Event Triggers

### Phase 6: AI Sniper & RevShare `[FUTURE]`
* [ ] AI Twitter & Social Sentiment Scanner
* [ ] Autonomous Rug-Filter Sniper
* [ ] $UPBOT Holder Revenue Sharing
* [ ] DAO Governance & VIP Alpha Hub
* [ ] Cross-DEX Liquidity Arbitrage

---

## 🔒 Security & Privacy Notice
UPBOT AI is 100% self-hosted and non-custodial. Your keys never leave your device. As a standard crypto safety best practice, always use a dedicated trading sub-wallet with only the funds you intend to trade.

---

## 📄 License
This project is licensed under the MIT License - free to use, modify, and distribute.
