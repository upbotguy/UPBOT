import { InlineKeyboard } from 'grammy';
import { DecryptedWallet, DBSettings, DBLimitOrder } from '../db/index.js';
import { formatAddress, WalletPortfolio } from '../services/wallet.js';
import { getT, SupportedLanguage } from '../i18n/index.js';

/**
 * Main Menu Keyboard
 */
export function getMainMenuKeyboard(lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  return new InlineKeyboard()
    .text(t.btn_trade, 'menu:trade')
    .text(t.btn_portfolio, 'menu:portfolio')
    .row()
    .text(t.btn_orders, 'menu:orders')
    .text(t.btn_wallets, 'menu:security')
    .row()
    .text(t.btn_settings, 'menu:settings')
    .text(t.btn_language, 'menu:language')
    .row()
    .text(t.btn_refresh, 'menu:refresh');
}

/**
 * Language Selection Keyboard
 */
export function getLanguageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🇺🇸 English', 'lang:set:en')
    .text('🇲🇲 မြန်မာစာ', 'lang:set:my')
    .row()
    .text('🔙 Main Menu', 'menu:main');
}

/**
 * Security & Wallet Management Keyboard
 */
export function getSecurityKeyboard(wallets: DecryptedWallet[], lang: SupportedLanguage = 'en'): InlineKeyboard {
  const kb = new InlineKeyboard();

  // Switch active wallet buttons
  if (wallets.length > 0) {
    wallets.forEach((w, index) => {
      const activeMark = w.isActive ? '✅ (Active)' : '⚪';
      kb.text(`${activeMark} W${index + 1}: ${formatAddress(w.publicKey)}`, `wallet:select:${w.publicKey}`).row();
    });
  }

  kb.text('➕ Add Wallet', 'wallet:add')
    .text('🗑️ Remove Wallet', 'wallet:remove')
    .row()
    .text('✨ Generate New Wallet', 'wallet:generate')
    .text('🔑 Backup / Export Key', 'wallet:export_menu')
    .row()
    .text('🔙 Main Menu', 'menu:main');

  return kb;
}

/**
 * Export Wallet Selection Keyboard
 */
export function getExportWalletKeyboard(wallets: DecryptedWallet[]): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (wallets.length === 0) {
    kb.text('❌ No wallets found', 'noop').row();
  } else {
    wallets.forEach((w, index) => {
      kb.text(`🔑 Export W${index + 1} (${formatAddress(w.publicKey)})`, `wallet:export_confirm:${w.publicKey}`).row();
    });
  }

  kb.text('🔙 Back to Security', 'menu:security');
  return kb;
}

/**
 * Confirm Export Warning Keyboard
 */
export function getConfirmExportKeyboard(publicKey: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('⚠️ Yes, Show Private Key', `wallet:export_show:${publicKey}`)
    .row()
    .text('❌ Cancel', 'menu:security');
}

/**
 * Self Destruct Private Key View Keyboard
 */
export function getSelfDestructKeyboard(messageId: number): InlineKeyboard {
  return new InlineKeyboard().text('🔒 Hide & Delete Immediately', `wallet:hide:${messageId}`);
}

/**
 * Remove Wallet Keyboard
 */
export function getRemoveWalletKeyboard(wallets: DecryptedWallet[]): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (wallets.length === 0) {
    kb.text('❌ No wallets found', 'noop').row();
  } else {
    wallets.forEach((w, index) => {
      kb.text(`🗑️ Remove W${index + 1} (${formatAddress(w.publicKey)})`, `wallet:remove_confirm:${w.publicKey}`).row();
    });
  }

  kb.text('🔙 Back to Security', 'menu:security');
  return kb;
}

/**
 * Token Trading Dashboard Keyboard
 */
export function getTokenTradeKeyboard(tokenAddress: string, dexUrl?: string): InlineKeyboard {
  const kb = new InlineKeyboard()
    // Buy presets
    .text('🟢 Buy 0.5 SOL', 'buy:preset:0.5')
    .text('🟢 Buy 1.0 SOL', 'buy:preset:1.0')
    .text('🟢 Buy 2.0 SOL', 'buy:preset:2.0')
    .row()
    .text('🟢 Buy 5.0 SOL', 'buy:preset:5.0')
    .text('✏️ Custom Buy', 'buy:custom')
    .row()
    // Sell presets
    .text('🔴 Sell 10%', 'sell:preset:10')
    .text('🔴 Sell 25%', 'sell:preset:25')
    .text('🔴 Sell 50%', 'sell:preset:50')
    .row()
    .text('🔴 Sell 75%', 'sell:preset:75')
    .text('🔴 Sell 100%', 'sell:preset:100')
    .text('✏️ Custom Sell', 'sell:custom')
    .row()
    // Limit Orders row
    .text('⏱️ Limit Buy (Dip)', 'limit:buy:menu')
    .text('⏱️ Limit Sell (TP/SL)', 'limit:sell:menu')
    .row()
    .text('🔄 Refresh', 'token:refresh');

  if (dexUrl) {
    kb.url('📊 DexScreener', dexUrl);
  }

  kb.row().text('🔙 Main Menu', 'menu:main');
  return kb;
}

/**
 * Limit Buy Options Keyboard
 */
export function getLimitBuyOptionsKeyboard(tokenAddress: string, currentPriceUsd: number): InlineKeyboard {
  const p5 = currentPriceUsd * 0.95;
  const p10 = currentPriceUsd * 0.9;
  const p20 = currentPriceUsd * 0.8;

  const fmt = (n: number) => (n < 0.01 ? n.toFixed(6) : n.toFixed(4));

  return new InlineKeyboard()
    .text(`🟢 -5% Dip ($${fmt(p5)})`, 'limit:buy:preset:5')
    .row()
    .text(`🟢 -10% Dip ($${fmt(p10)})`, 'limit:buy:preset:10')
    .row()
    .text(`🟢 -20% Dip ($${fmt(p20)})`, 'limit:buy:preset:20')
    .row()
    .text('✏️ Custom Target Price / Dip', 'limit:buy:custom')
    .row()
    .text('🔙 Back to Token', 'token:refresh');
}

/**
 * Limit Sell Options Keyboard (TP / SL)
 */
export function getLimitSellOptionsKeyboard(tokenAddress: string, currentPriceUsd: number): InlineKeyboard {
  const p25 = currentPriceUsd * 1.25;
  const p50 = currentPriceUsd * 1.5;
  const p100 = currentPriceUsd * 2.0;

  const fmt = (n: number) => (n < 0.01 ? n.toFixed(6) : n.toFixed(4));

  return new InlineKeyboard()
    .text(`🚀 +25% TP ($${fmt(p25)})`, 'limit:sell:preset:25:GTE')
    .text(`🚀 +50% TP ($${fmt(p50)})`, 'limit:sell:preset:50:GTE')
    .row()
    .text(`🚀 +100% (2x) ($${fmt(p100)})`, 'limit:sell:preset:100:GTE')
    .text('🛑 -15% Stop Loss', 'limit:sell:preset:15:LTE')
    .row()
    .text('✏️ Custom TP / SL Price', 'limit:sell:custom')
    .row()
    .text('🔙 Back to Token', 'token:refresh');
}

/**
 * Active Orders List Keyboard
 */
export function getOrdersKeyboard(orders: DBLimitOrder[]): InlineKeyboard {
  const kb = new InlineKeyboard();
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');

  if (pendingOrders.length > 0) {
    pendingOrders.forEach((o) => {
      const typeStr = o.order_type === 'BUY_LIMIT' ? '🟢 Buy' : '🔴 Sell';
      const amountStr = o.order_type === 'BUY_LIMIT' ? `${o.amount_sol} SOL` : `${o.amount_percent}%`;
      kb.text(`🔍 #${o.id} $${o.token_symbol} (${typeStr} ${amountStr})`, `order:view:${o.id}`)
        .text('❌ Cancel', `orders:cancel:${o.id}`)
        .row();
    });
  }

  kb.text('🔄 Refresh Orders', 'menu:orders').row().text('🔙 Main Menu', 'menu:main');
  return kb;
}

/**
 * Single Order Detail & Action Keyboard
 */
export function getOrderDetailKeyboard(order: DBLimitOrder): InlineKeyboard {
  return new InlineKeyboard()
    .text('✏️ Edit Target Price', `order:edit:price:${order.id}`)
    .text('✏️ Edit Amount', `order:edit:amount:${order.id}`)
    .row()
    .text('🗑️ Cancel / Delete Order', `orders:cancel:${order.id}`)
    .row()
    .text('🎯 Trade Token', `token:refresh:${order.token_address}`)
    .text('📋 All Orders', 'menu:orders')
    .row()
    .text('🔙 Main Menu', 'menu:main');
}

/**
 * Portfolio Keyboard
 */
export function getPortfolioKeyboard(portfolio: WalletPortfolio): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (portfolio.tokens.length > 0) {
    portfolio.tokens.slice(0, 8).forEach((t) => {
      kb.text(`🎯 Trade $${t.symbol}`, `token:refresh:${t.mint}`).row();
    });
  }

  kb.text('🔄 Refresh Portfolio', 'menu:portfolio')
    .row()
    .text('🔙 Main Menu', 'menu:main');
  return kb;
}

/**
 * Settings Keyboard
 */
export function getSettingsKeyboard(settings: DBSettings, lang: SupportedLanguage = 'en'): InlineKeyboard {
  return new InlineKeyboard()
    .text(`⚡ Slippage: ${settings.slippage_bps / 100}%`, 'settings:slippage_menu')
    .text(`⛽ Priority Fee: ${settings.priority_fee_sol} SOL`, 'settings:priority_menu')
    .row()
    .text('🌐 Language / ဘာသာစကား', 'menu:language')
    .row()
    .text('🔙 Main Menu', 'menu:main');
}

/**
 * Slippage Presets Keyboard
 */
export function getSlippageSettingsKeyboard(currentBps: number): InlineKeyboard {
  const is1 = currentBps === 100 ? '✅ 1%' : '1%';
  const is3 = currentBps === 300 ? '✅ 3%' : '3%';
  const is5 = currentBps === 500 ? '✅ 5% (Default)' : '5%';
  const is10 = currentBps === 1000 ? '✅ 10%' : '10%';

  return new InlineKeyboard()
    .text(is1, 'settings:set_slippage:100')
    .text(is3, 'settings:set_slippage:300')
    .text(is5, 'settings:set_slippage:500')
    .row()
    .text(is10, 'settings:set_slippage:1000')
    .text('✏️ Custom %', 'settings:custom_slippage')
    .row()
    .text('🔙 Back to Settings', 'menu:settings');
}

/**
 * Priority Fee Presets Keyboard
 */
export function getPriorityFeeKeyboard(currentFee: number): InlineKeyboard {
  const isLow = currentFee === 0.0005 ? '✅ Standard (0.0005)' : 'Standard (0.0005)';
  const isHigh = currentFee === 0.001 ? '✅ High (0.001)' : 'High (0.001)';
  const isTurbo = currentFee === 0.002 ? '✅ Turbo (0.002)' : 'Turbo (0.002)';

  return new InlineKeyboard()
    .text(isLow, 'settings:set_fee:0.0005')
    .row()
    .text(isHigh, 'settings:set_fee:0.001')
    .row()
    .text(isTurbo, 'settings:set_fee:0.002')
    .row()
    .text('🔙 Back to Settings', 'menu:settings');
}
