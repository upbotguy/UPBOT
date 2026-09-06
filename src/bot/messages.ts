import { DecryptedWallet, DBSettings, DBLimitOrder } from '../db/index.js';
import { TokenInfo, formatCurrency, formatChange } from '../services/token.js';
import { formatAddress, WalletPortfolio } from '../services/wallet.js';
import { getT, SupportedLanguage } from '../i18n/index.js';

export function getMainMenuMessage(
  userName: string,
  activeWallet: DecryptedWallet | null,
  solBalance: number,
  lang: SupportedLanguage = 'en'
): string {
  const t = getT(lang);
  const isEn = lang === 'en';

  const walletSection = activeWallet
    ? `💳 *${t.wallet_active}:* \`${activeWallet.publicKey}\`\n💰 *${t.wallet_balance}:* \`${solBalance.toFixed(4)} SOL\``
    : `⚠️ *${t.wallet_active}:* ${isEn ? 'None (Add in Wallets menu)' : 'မရှိသေးပါ (Wallets တွင် ထည့်ပါ)'}`;

  if (isEn) {
    return `⚡ *MYANBOT AI - Solana Sniper & Limit Trading* ⚡\n\n` +
      `👤 *User:* ${userName}\n` +
      `${walletSection}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Fee Direct Swap:* Fastest Jupiter V6 Turbo Routing\n` +
      `⏱️ *Limit Orders:* Buy Dip, Take Profit (TP), Stop Loss (SL)\n` +
      `💼 *Portfolio Tracker:* Track held SPL tokens & 1-click sell\n` +
      `🛡️ *Security:* Local AES-256-GCM encryption & Admin Whitelist\n\n` +
      `👇 _Select a menu below or send any Solana Token CA to trade:_`;
  } else {
    return `⚡ *MYANBOT AI - Solana Trading Terminal* ⚡\n\n` +
      `👤 *အသုံးပြုသူ:* ${userName}\n` +
      `${walletSection}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Fee Swap:* Jupiter V6 Turbo ဖြင့် အမြန်ဆုံး ဝယ်/ရောင်း\n` +
      `⏱️ *Limit Orders:* Dip Buy, Take Profit (TP), Stop Loss (SL)\n` +
      `💼 *Portfolio Tracker:* ပိုင်ဆိုင်သော Token စာရင်းနှင့် ချက်ချင်းရောင်းချမှု\n` +
      `🛡️ *လုံခြုံရေး:* Local AES-256-GCM နှင့် Admin Lock\n\n` +
      `👇 _အောက်ပါ Menu မှ ရွေးချယ်ပါ သို့မဟုတ် Solana Token CA ပို့ပေးပါ:_`;
  }
}

export function getSecurityMessage(
  wallets: { wallet: DecryptedWallet; balance: number }[],
  lang: SupportedLanguage = 'en'
): string {
  const isEn = lang === 'en';
  let listText = '';
  if (wallets.length === 0) {
    listText = isEn
      ? '❌ _No wallets found. Click "Add Wallet" or "Generate New Wallet" to add one._'
      : '❌ _လက်ရှိ Wallet မရှိသေးပါ။ "Add Wallet" သို့မဟုတ် "Generate New Wallet" ဖြင့် ထည့်သွင်းပါ_';
  } else {
    listText = wallets
      .map((item, index) => {
        const w = item.wallet;
        const active = w.isActive ? '⭐ *[ACTIVE]*' : '';
        return `*${index + 1}.* \`${formatAddress(w.publicKey, 6)}\` — \`${item.balance.toFixed(4)} SOL\` ${active}\n   Full: \`${w.publicKey}\``;
      })
      .join('\n\n');
  }

  if (isEn) {
    return `🔐 *Security & Wallet Management*\n\n` +
      `All private keys and seeds are securely encrypted with AES-256-GCM on your local device.\n\n` +
      `📋 *Connected Wallets:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Add Wallet:* Import Base58 Private Key or Seed Phrase\n` +
      `✨ *Generate New Wallet:* Create a brand new Solana Keypair\n` +
      `🔑 *Export Key:* Backup your private key\n` +
      `🗑️ *Remove Wallet:* Delete disconnected wallet`;
  } else {
    return `🔐 *Security & Wallet စီမံခန့်ခွဲမှု*\n\n` +
      `User ၏ Private Key များကို AES-256-GCM ဖြင့် အလုံခြုံဆုံး Encrypt လုပ်ပြီး Local တွင် သိမ်းဆည်းထားပါသည်။\n\n` +
      `📋 *ချိတ်ဆက်ထားသော Wallets များ:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Add Wallet:* Private Key သို့မဟုတ် Seed Phrase ထည့်သွင်းခြင်း\n` +
      `✨ *Generate New Wallet:* Solana Wallet အသစ်တစ်ခု အလိုအလျောက် ပြုလုပ်ခြင်း\n` +
      `🔑 *Export Key:* Private key ကို Backup ထုတ်ယူခြင်း\n` +
      `🗑️ *Remove Wallet:* မလိုတော့သော Wallet ဖျက်ထုတ်ခြင်း`;
  }
}

export function getTokenDashboardMessage(
  token: TokenInfo,
  activeWallet: DecryptedWallet | null,
  solBalance: number,
  tokenBalance: { uiAmount: number },
  lang: SupportedLanguage = 'en'
): string {
  const isEn = lang === 'en';
  const walletStr = activeWallet
    ? `💳 \`${formatAddress(activeWallet.publicKey, 4)}\` (${isEn ? 'Balance' : 'လက်ကျန်'}: \`${solBalance.toFixed(4)} SOL\`)`
    : `⚠️ No Active Wallet`;

  return `🪙 *${token.name}* | *$${token.symbol}*\n` +
    `\`${token.address}\`\n\n` +
    `💵 *Price USD:* \`${formatCurrency(token.priceUsd)}\` (\`${token.priceNative.toFixed(6)} SOL\`)\n` +
    `📊 *Market Cap:* \`${formatCurrency(token.marketCap)}\`\n` +
    `💧 *Liquidity:* \`${formatCurrency(token.liquidityUsd)}\`\n` +
    `📈 *24h Volume:* \`${formatCurrency(token.volume24h)}\`\n\n` +
    `🕒 *Price Changes:*\n` +
    `• 5m: ${formatChange(token.priceChange.m5)}\n` +
    `• 1h: ${formatChange(token.priceChange.h1)}\n` +
    `• 6h: ${formatChange(token.priceChange.h6)}\n` +
    `• 24h: ${formatChange(token.priceChange.h24)}\n\n` +
    `⚡ *24h Swaps:* 🟢 ${token.txns24h.buys} Buys | 🔴 ${token.txns24h.sells} Sells\n` +
    `🏪 *DEX:* \`${token.dexId}\`\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *${isEn ? 'Your Holdings' : 'သင့်ပိုင်ဆိုင်မှု'}:*\n` +
    `• Holding: \`${tokenBalance.uiAmount.toLocaleString()} ${token.symbol}\`\n` +
    `• Active Wallet: ${walletStr}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👇 _${isEn ? 'Use buttons below to Buy, Sell, or set Limit Orders:' : 'ဝယ်ယူရန် (Buy) သို့မဟုတ် ရောင်းချရန် (Sell) အောက်ပါခလုတ်များကို နှိပ်ပါ:'}_`;
}

export function getPortfolioMessage(portfolio: WalletPortfolio, lang: SupportedLanguage = 'en'): string {
  const isEn = lang === 'en';
  const solText = `💰 *SOL Balance:* \`${portfolio.solBalance.toFixed(4)} SOL\` (~$${portfolio.solValueUsd.toFixed(2)})\n`;
  const totalText = `📊 *Total Portfolio Value:* \`$${portfolio.totalValueUsd.toFixed(2)} USD\`\n`;

  if (portfolio.tokens.length === 0) {
    return (
      `💼 *${isEn ? 'Token Portfolio / Holdings' : 'သင်၏ Token ပိုင်ဆိုင်မှုများ (Portfolio)'}*\n\n` +
      solText +
      totalText +
      `\n` +
      `_${isEn ? 'No SPL tokens currently held in this wallet. Buy some tokens to track them here!' : 'ဤ Wallet ထဲတွင် မည်သည့် Token မျှ မရှိသေးပါ။ Token ဝယ်ယူပြီးပါက ဤနေရာတွင် စာရင်းပြပေးပါမည်။'}_`
    );
  }

  const tokenLines = portfolio.tokens
    .map((t, idx) => {
      const priceStr = t.priceUsd < 0.01 ? t.priceUsd.toFixed(6) : t.priceUsd.toFixed(4);
      return (
        `*${idx + 1}.* *$${t.symbol}* (${t.name})\n` +
        `   • ${isEn ? 'Amount' : 'ပမာဏ'}: \`${t.uiAmount.toLocaleString()}\`\n` +
        `   • ${isEn ? 'Value' : 'တန်ဖိုး'}: \`$${priceStr}\` (~$${t.valueUsd.toFixed(2)})`
      );
    })
    .join('\n\n');

  return (
    `💼 *${isEn ? 'Token Portfolio / Holdings' : 'သင်၏ Token ပိုင်ဆိုင်မှုများ (Portfolio)'}*\n\n` +
    solText +
    totalText +
    `\n━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *${isEn ? 'Held Tokens:' : 'ပိုင်ဆိုင်ထားသော Tokens များ:'}*\n\n` +
    tokenLines +
    `\n\n👇 _${isEn ? 'Select a token below to Trade or Sell instantly:' : 'ချက်ချင်း အရောင်းအဝယ် ပြုလုပ်လိုသော Token ကို ရွေးချယ်ပါ:'}_`
  );
}

export function getSettingsMessage(settings: DBSettings, lang: SupportedLanguage = 'en'): string {
  const isEn = lang === 'en';
  if (isEn) {
    return `⚙️ *Trading Settings*\n\n` +
      `Current Configuration:\n` +
      `• ⚡ *Slippage:* \`${settings.slippage_bps / 100}%\` (Default 5%)\n` +
      `• ⛽ *Priority Gas Fee:* \`${settings.priority_fee_sol} SOL\` (Turbo)\n\n` +
      `_Use the buttons below to change settings:_`;
  } else {
    return `⚙️ *Trading Settings (ချိန်ညှိချက်များ)*\n\n` +
      `လက်ရှိ Configuration များ -\n` +
      `• ⚡ *Slippage:* \`${settings.slippage_bps / 100}%\` (Default 5%)\n` +
      `• ⛽ *Priority Gas Fee:* \`${settings.priority_fee_sol} SOL\` (Turbo)\n\n` +
      `_Setting ပြောင်းလဲရန် အောက်ပါ ခလုတ်များကို အသုံးပြုနိုင်ပါသည်:_`;
  }
}

export function getOrdersListMessage(orders: DBLimitOrder[], lang: SupportedLanguage = 'en'): string {
  const isEn = lang === 'en';
  const pending = orders.filter((o) => o.status === 'PENDING');
  if (pending.length === 0) {
    return `📋 *Active Limit Orders*\n\n❌ _${isEn ? 'No pending limit orders found.' : 'လက်ရှိ Pending Order များ မရှိသေးပါ။'}_\n\n${isEn ? 'Select a token via Trade menu to create a Limit Buy or Limit Sell order.' : 'Trade menu မှတဆင့် Token ရွေးချယ်ပြီး Limit Buy / Limit Sell တင်နိုင်ပါသည်။'}`;
  }

  const list = pending
    .map((o) => {
      const typeStr = o.order_type === 'BUY_LIMIT' ? '🟢 BUY' : '🔴 SELL';
      const amountStr = o.order_type === 'BUY_LIMIT' ? `${o.amount_sol} SOL` : `${o.amount_percent}%`;

      return `⏳ *#${o.id}* [${typeStr}] *$${o.token_symbol}*\n` +
        `   • Target: \`${formatCurrency(o.target_price_usd)}\` (${o.condition === 'LTE' ? '≤' : '≥'})\n` +
        `   • Amount: \`${amountStr}\``;
    })
    .join('\n\n');

  return `📋 *Active Limit Orders (${pending.length})*\n\n${list}\n\n━━━━━━━━━━━━━━━━━━━━\n👇 _${isEn ? 'Click an order button below to inspect details, edit price/amount, or cancel:' : 'အသေးစိတ်ကြည့်ရှုရန်၊ Edit ပြင်ဆင်ရန် သို့မဟုတ် Cancel ပြုလုပ်ရန် Order ခလုတ်ကို နှိပ်ပါ:'}_`;
}

export function getOrderDetailMessage(order: DBLimitOrder, currentPrice?: number, lang: SupportedLanguage = 'en'): string {
  const isEn = lang === 'en';
  const isBuy = order.order_type === 'BUY_LIMIT';
  const typeStr = isBuy ? '🟢 BUY LIMIT (Dip)' : (order.condition === 'GTE' ? '🚀 SELL LIMIT (Take Profit)' : '🛑 SELL LIMIT (Stop Loss)');
  const amountStr = isBuy ? `💰 \`${order.amount_sol} SOL\`` : `📦 \`${order.amount_percent}%\``;
  const condStr = order.condition === 'LTE' ? (isEn ? '≤ Target Price (Dip / Drop)' : '≤ Target Price (ကျဆင်းချိန်)') : (isEn ? '≥ Target Price (Gain / Rise)' : '≥ Target Price (မြင့်တက်ချိန်)');
  const currentStr = currentPrice ? `\n💵 *Live Market Price:* \`${formatCurrency(currentPrice)}\`` : '';

  return `⏱️ *Order #${order.id} Details* [${order.status}]\n\n` +
    `🪙 *Token:* *$${order.token_symbol}*\n` +
    `📍 *Contract Address:*\n\`${order.token_address}\`\n` +
    `${currentStr}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎯 *Order Type:* ${typeStr}\n` +
    `💵 *Target Price:* \`${formatCurrency(order.target_price_usd)}\`\n` +
    `⚡ *Trigger Condition:* ${condStr}\n` +
    `${amountStr}\n` +
    `💳 *Wallet:* \`${formatAddress(order.wallet_address)}\`\n` +
    `📅 *Created At:* \`${order.created_at}\`\n\n` +
    `👇 _${isEn ? 'Use Edit buttons below to change Target Price or Amount, or Cancel:' : 'Target Price သို့မဟုတ် Amount ကို ပြင်ဆင်လိုပါက အောက်ပါ Edit ခလုတ်များကို အသုံးပြုနိုင်ပါသည်:'}_`;
}
