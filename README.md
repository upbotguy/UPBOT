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
git clone https://github.com/upbotguy/QuickBot.git
cd QuickBot
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

## 🇲🇲 မြန်မာဘာသာ အသုံးပြုနည်းလမ်းညွှန်

### အဓိက အားသာချက်များ
1. **Trading Fee ဝယ်/ရောင်းတိုင်း ၀% (အခမဲ့):** အခြား Bot များကဲ့သို့ ၁% Fee ဖြတ်ယူခြင်း လုံးဝ မရှိပါ။
2. **Limit Orders စနစ်:** Token စျေးကျချိန် အလိုအလျောက် ဝယ်ယူခြင်း (Dip Buy) နှင့် အမြတ်ယူ/အရှုံးကာကွယ်ခြင်း (TP/SL) အပြည့်အစုံ ပါဝင်ပါသည်။
3. **Portfolio Tracker:** မိမိ Wallet ထဲရှိ Token များ၏ စုစုပေါင်း USD တန်ဖိုးကို ကြည့်ရှုနိုင်ပြီး ချက်ချင်း ရောင်းချနိုင်ပါသည်။
4. **စစ်တပ်အဆင့် လုံခြုံရေး:** Private Key များကို AES-256-GCM ဖြင့် လျှို့ဝှက်ကုဒ်ပြောင်းပြီး သင့်စက်တွင်း၌သာ သိမ်းဆည်းပါသည်။

### အသုံးပြုရန် အဆင့်များ
1. Windows တွင် **`start-bot.bat`** ကို Double Click နှိပ်၍ Bot ကို ဖွင့်ပါ။
2. Telegram တွင် `/start` နှိပ်ပါ။ **`🌐 Language`** မှတစ်ဆင့် **`🇲🇲 မြန်မာစာ`** သို့ ပြောင်းလဲနိုင်ပါသည်။

---

## 🔒 Security & Privacy Notice
UPBOT AI is 100% self-hosted and non-custodial. Your keys never leave your device. As a standard crypto safety best practice, always use a dedicated trading sub-wallet with only the funds you intend to trade.

---

## 📄 License
This project is licensed under the MIT License - free to use, modify, and distribute.
