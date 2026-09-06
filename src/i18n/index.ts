export type SupportedLanguage = 'en' | 'my';

export interface Translations {
  btn_back_main: string;
  btn_cancel: string;
  btn_refresh: string;
  btn_trade: string;
  btn_wallets: string;
  btn_portfolio: string;
  btn_orders: string;
  btn_settings: string;
  btn_security: string;
  btn_language: string;

  wallet_active: string;
  wallet_balance: string;

  main_welcome: (name: string, walletText: string, balance: number) => string;
  portfolio_title: (wallet: string, solBal: number, solVal: number, totalVal: number) => string;
  portfolio_empty: string;
  portfolio_trade_btn: (symbol: string) => string;

  settings_title: (slippage: number, priorityFee: number) => string;
  btn_slippage: (val: number) => string;
  btn_priority_fee: (val: number) => string;
  btn_custom_slippage: string;

  lang_select_title: string;
  lang_switched: (langName: string) => string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  en: {
    btn_back_main: '🔙 Main Menu',
    btn_cancel: '❌ Cancel',
    btn_refresh: '🔄 Refresh',
    btn_trade: '🎯 Trade Token',
    btn_wallets: '💳 Wallets',
    btn_portfolio: '💼 Portfolio',
    btn_orders: '📋 Active Orders',
    btn_settings: '⚙️ Settings',
    btn_security: '🛡️ Security',
    btn_language: '🌐 Language / ဘာသာစကား',

    wallet_active: 'Active Wallet',
    wallet_balance: 'SOL Balance',

    main_welcome: (name, walletText, balance) =>
      `⚡ *Welcome to MYANBOT AI Solana Trading Bot!* ⚡\n\n` +
      `👤 *User:* ${name}\n` +
      `💳 *Active Wallet:* \`${walletText}\`\n` +
      `💰 *Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `🎯 *Features:*\n` +
      `• *0% Fee Direct Swap:* Fastest Jupiter V6 Turbo Routing.\n` +
      `• *Limit Orders:* Buy Dip, Take Profit (TP), Stop Loss (SL).\n` +
      `• *Security:* Local AES-256-GCM encryption.\n\n` +
      `_Paste any Solana Token Contract Address (CA) to start trading._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *Token Portfolio / Holdings*\n\n` +
      `💳 *Wallet:* \`${wallet}\`\n` +
      `💰 *SOL Balance:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *Total Value:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *Select a token below to Trade or Sell instantly:*`,
    portfolio_empty: `_No SPL tokens found in this wallet._`,
    portfolio_trade_btn: (symbol) => `🎯 Trade $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Bot Settings*\n\n` +
      `⚡ *Current Slippage:* \`${slippage}%\`\n` +
      `⛽ *Priority Fee:* \`${priorityFee} SOL\` (Turbo)\n\n` +
      `_Select an option below to configure:_`,
    btn_slippage: (val) => `⚡ Slippage: ${val}%`,
    btn_priority_fee: (val) => `⛽ Priority Fee: ${val} SOL`,
    btn_custom_slippage: '✏️ Custom Slippage',

    lang_select_title: `🌐 *Select Your Language / ဘာသာစကား ရွေးချယ်ပါ*\n\nCurrent Language: *English 🇺🇸*`,
    lang_switched: (langName) => `✅ Language switched to *${langName}*!`,
  },

  my: {
    btn_back_main: '🔙 Main Menu',
    btn_cancel: '❌ Cancel',
    btn_refresh: '🔄 Refresh',
    btn_trade: '🎯 Trade Token',
    btn_wallets: '💳 Wallets',
    btn_portfolio: '💼 Portfolio',
    btn_orders: '📋 Active Orders',
    btn_settings: '⚙️ Settings',
    btn_security: '🛡️ လုံခြုံရေး (Security)',
    btn_language: '🌐 Language / ဘာသာစကား',

    wallet_active: 'အသုံးပြုနေသော Wallet',
    wallet_balance: 'လက်ကျန်ငွေ',

    main_welcome: (name, walletText, balance) =>
      `⚡ *MYANBOT AI Solana Trading Bot မှ ကြိုဆိုပါသည်!* ⚡\n\n` +
      `👤 *အသုံးပြုသူ:* ${name}\n` +
      `💳 *Active Wallet:* \`${walletText}\`\n` +
      `💰 *လက်ကျန်ငွေ:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `🎯 *အဓိက စွမ်းဆောင်ချက်များ:*\n` +
      `• *0% Fee Direct Swap:* Jupiter V6 Turbo ဖြင့် အမြန်ဆုံး ဝယ်/ရောင်း။\n` +
      `• *Limit Orders:* Dip Buy, Take Profit (TP), Stop Loss (SL) အလိုအလျောက် ရောင်း/ဝယ်။\n` +
      `• *စစ်တပ်အဆင့် လုံခြုံရေး:* Local AES-256-GCM encryption။\n\n` +
      `_Solana Token CA ပို့ပေးပြီး အရောင်းအဝယ် စတင်နိုင်ပါပြီ။_`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *သင်၏ Token ပိုင်ဆိုင်မှုများ (Portfolio)*\n\n` +
      `💳 *Wallet:* \`${wallet}\`\n` +
      `💰 *SOL လက်ကျန်ငွေ:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *စုစုပေါင်း တန်ဖိုး:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *အရောင်းအဝယ် ပြုလုပ်လိုသော Token ကို ရွေးချယ်ပါ:*`,
    portfolio_empty: `_ဤ Wallet ထဲတွင် မည်သည့် Token မျှ မရှိသေးပါ။_`,
    portfolio_trade_btn: (symbol) => `🎯 Trade $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Bot ချိန်ညှိချက်များ (Settings)*\n\n` +
      `⚡ *လက်ရှိ Slippage:* \`${slippage}%\`\n` +
      `⛽ *Priority Fee:* \`${priorityFee} SOL\` (Turbo)\n\n` +
      `_အောက်ပါ ခလုတ်များမှတစ်ဆင့် ပြင်ဆင်နိုင်ပါသည်:_`,
    btn_slippage: (val) => `⚡ Slippage: ${val}%`,
    btn_priority_fee: (val) => `⛽ Priority Fee: ${val} SOL`,
    btn_custom_slippage: '✏️ Custom Slippage',

    lang_select_title: `🌐 *Select Your Language / ဘာသာစကား ရွေးချယ်ပါ*\n\nလက်ရှိ ဘာသာစကား: *မြန်မာ 🇲🇲*`,
    lang_switched: (langName) => `✅ ဘာသာစကားကို *${langName}* သို့ ပြောင်းလဲပြီးပါပြီ!`,
  },
};

export function getT(lang: SupportedLanguage = 'en'): Translations {
  return translations[lang] || translations.en;
}
