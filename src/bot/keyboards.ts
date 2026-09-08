import { InlineKeyboard } from 'grammy';
import { DecryptedWallet, DBSettings, DBLimitOrder, DBCopyTarget } from '../db/index.js';
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
    .text(t.btn_copy_trading, 'menu:copy')
    .text(t.btn_orders, 'menu:orders')
    .row()
    .text(t.btn_wallets, 'menu:security')
    .text(t.btn_settings, 'menu:settings')
    .row()
    .text(t.btn_language, 'menu:language')
    .text(t.btn_refresh, 'menu:refresh');
}

/**
 * Language Selection Keyboard with 6 languages
 */
export function getLanguageKeyboard(lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  return new InlineKeyboard()
    .text('🇺🇸 English', 'lang:set:en')
    .text('🇨🇳 Chinese', 'lang:set:zh')
    .row()
    .text('🇷🇺 Russian', 'lang:set:ru')
    .text('🇰🇷 Korean', 'lang:set:ko')
    .row()
    .text('🇪🇸 Spanish', 'lang:set:es')
    .text('🇲🇲 Burmese', 'lang:set:my')
    .row()
    .text(t.btn_back_main, 'menu:main');
}

/**
 * Security & Wallet Management Keyboard
 */
export function getSecurityKeyboard(wallets: DecryptedWallet[], lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const kb = new InlineKeyboard();

  // Switch active wallet buttons
  if (wallets.length > 0) {
    wallets.forEach((w, index) => {
      const activeMark = w.isActive ? '✅' : '⚪';
      kb.text(`${activeMark} W${index + 1}: ${formatAddress(w.publicKey)}`, `wallet:select:${w.publicKey}`).row();
    });
  }

  kb.text(t.btn_add_wallet, 'wallet:add')
    .text(t.btn_remove_wallet, 'wallet:remove')
    .row()
    .text(t.btn_generate_wallet, 'wallet:generate')
    .text(t.btn_export_key, 'wallet:export_menu')
    .row()
    .text(t.btn_back_main, 'menu:main');

  return kb;
}

/**
 * Export Wallet Selection Keyboard
 */
export function getExportWalletKeyboard(wallets: DecryptedWallet[], lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const kb = new InlineKeyboard();

  if (wallets.length === 0) {
    kb.text('❌ No wallets found', 'noop').row();
  } else {
    wallets.forEach((w, index) => {
      kb.text(`🔑 W${index + 1} (${formatAddress(w.publicKey)})`, `wallet:export_confirm:${w.publicKey}`).row();
    });
  }

  kb.text(t.btn_back_security, 'menu:security');
  return kb;
}

/**
 * Confirm Export Warning Keyboard
 */
export function getConfirmExportKeyboard(publicKey: string, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  return new InlineKeyboard()
    .text(t.btn_confirm_export, `wallet:export_show:${publicKey}`)
    .row()
    .text(t.btn_cancel, 'menu:security');
}

/**
 * Self Destruct Private Key View Keyboard
 */
export function getSelfDestructKeyboard(messageId: number, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  return new InlineKeyboard().text(t.btn_hide_key, `wallet:hide:${messageId}`);
}

/**
 * Remove Wallet Keyboard
 */
export function getRemoveWalletKeyboard(wallets: DecryptedWallet[], lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const kb = new InlineKeyboard();

  if (wallets.length === 0) {
    kb.text('❌ No wallets found', 'noop').row();
  } else {
    wallets.forEach((w, index) => {
      kb.text(`🗑️ Remove W${index + 1} (${formatAddress(w.publicKey)})`, `wallet:remove_confirm:${w.publicKey}`).row();
    });
  }

  kb.text(t.btn_back_security, 'menu:security');
  return kb;
}

/**
 * Token Trading Dashboard Keyboard
 */
export function getTokenTradeKeyboard(tokenAddress: string, dexUrl?: string, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const kb = new InlineKeyboard()
    // Buy presets
    .text('🟢 Buy 0.5 SOL', 'buy:preset:0.5')
    .text('🟢 Buy 1.0 SOL', 'buy:preset:1.0')
    .text('🟢 Buy 2.0 SOL', 'buy:preset:2.0')
    .row()
    .text('🟢 Buy 5.0 SOL', 'buy:preset:5.0')
    .text(t.btn_buy_custom, 'buy:custom')
    .row()
    // Sell presets
    .text('🔴 Sell 10%', 'sell:preset:10')
    .text('🔴 Sell 25%', 'sell:preset:25')
    .text('🔴 Sell 50%', 'sell:preset:50')
    .row()
    .text('🔴 Sell 75%', 'sell:preset:75')
    .text('🔴 Sell 100%', 'sell:preset:100')
    .text(t.btn_sell_custom, 'sell:custom')
    .row()
    // Limit Orders row
    .text(t.btn_limit_buy, 'limit:buy:menu')
    .text(t.btn_limit_sell, 'limit:sell:menu')
    .row()
    .text('🖼️ Share PnL Card', `token:pnl:${tokenAddress}`)
    .text(t.btn_refresh, 'token:refresh');

  if (dexUrl) {
    kb.url('📊 DexScreener', dexUrl);
  }

  kb.row().text(t.btn_back_main, 'menu:main');
  return kb;
}

/**
 * Limit Buy Options Keyboard (with Presets, Custom Dip %, and Custom Price)
 */
export function getLimitBuyOptionsKeyboard(tokenAddress: string, currentPriceUsd: number, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const p5 = currentPriceUsd * 0.95;
  const p10 = currentPriceUsd * 0.9;
  const p15 = currentPriceUsd * 0.85;
  const p20 = currentPriceUsd * 0.8;

  const fmt = (n: number) => (n < 0.01 ? n.toFixed(6) : n.toFixed(4));

  return new InlineKeyboard()
    .text(`🟢 -5% Dip ($${fmt(p5)})`, 'limit:buy:preset:5')
    .text(`🟢 -10% Dip ($${fmt(p10)})`, 'limit:buy:preset:10')
    .row()
    .text(`🟢 -15% Dip ($${fmt(p15)})`, 'limit:buy:preset:15')
    .text(`🟢 -20% Dip ($${fmt(p20)})`, 'limit:buy:preset:20')
    .row()
    .text(t.btn_custom_dip_pct, 'limit:buy:custom_dip')
    .text(t.btn_custom_price, 'limit:buy:custom_price')
    .row()
    .text(t.btn_trade_dashboard, 'token:refresh');
}

/**
 * Limit Sell Options Keyboard (with Presets, Custom TP/SL %, and Custom Price)
 */
export function getLimitSellOptionsKeyboard(tokenAddress: string, currentPriceUsd: number, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const p25 = currentPriceUsd * 1.25;
  const p50 = currentPriceUsd * 1.5;
  const p100 = currentPriceUsd * 2.0;
  const sl15 = currentPriceUsd * 0.85;

  const fmt = (n: number) => (n < 0.01 ? n.toFixed(6) : n.toFixed(4));

  return new InlineKeyboard()
    .text(`🚀 +25% TP ($${fmt(p25)})`, 'limit:sell:preset:25:GTE')
    .text(`🚀 +50% TP ($${fmt(p50)})`, 'limit:sell:preset:50:GTE')
    .row()
    .text(`🚀 +100% (2x) ($${fmt(p100)})`, 'limit:sell:preset:100:GTE')
    .text(`🛑 -15% SL ($${fmt(sl15)})`, 'limit:sell:preset:15:LTE')
    .row()
    .text(t.btn_custom_tpsl_pct, 'limit:sell:custom_pct')
    .text(t.btn_custom_price, 'limit:sell:custom_price')
    .row()
    .text(t.btn_trade_dashboard, 'token:refresh');
}

/**
 * Active Orders List Keyboard
 */
export function getOrdersKeyboard(orders: DBLimitOrder[], lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const kb = new InlineKeyboard();
  const pendingOrders = orders.filter((o) => o.status === 'PENDING');

  if (pendingOrders.length > 0) {
    pendingOrders.forEach((o) => {
      const typeStr = o.order_type === 'BUY_LIMIT' ? '🟢 Buy' : '🔴 Sell';
      const amountStr = o.order_type === 'BUY_LIMIT' ? `${o.amount_sol} SOL` : `${o.amount_percent}%`;
      kb.text(`🔍 #${o.id} $${o.token_symbol} (${typeStr} ${amountStr})`, `order:view:${o.id}`)
        .text(t.btn_cancel, `orders:cancel:${o.id}`)
        .row();
    });
  }

  kb.text(t.btn_refresh, 'menu:orders').row().text(t.btn_back_main, 'menu:main');
  return kb;
}

/**
 * Single Order Detail & Action Keyboard
 */
export function getOrderDetailKeyboard(order: DBLimitOrder, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  return new InlineKeyboard()
    .text(t.btn_edit_price, `order:edit:price:${order.id}`)
    .text(t.btn_edit_amount, `order:edit:amount:${order.id}`)
    .row()
    .text(t.btn_cancel_order, `orders:cancel:${order.id}`)
    .row()
    .text(t.btn_trade_dashboard, `token:refresh:${order.token_address}`)
    .text(t.btn_back_orders, 'menu:orders')
    .row()
    .text(t.btn_back_main, 'menu:main');
}

/**
 * Portfolio Keyboard
 */
export function getPortfolioKeyboard(portfolio: WalletPortfolio, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const kb = new InlineKeyboard();

  if (portfolio.tokens.length > 0) {
    portfolio.tokens.slice(0, 8).forEach((tItem) => {
      kb.text(t.portfolio_trade_btn(tItem.symbol), `token:refresh:${tItem.mint}`).row();
    });
  }

  kb.text(t.btn_refresh, 'menu:portfolio')
    .row()
    .text(t.btn_back_main, 'menu:main');
  return kb;
}

/**
 * Settings Keyboard
 */
export function getSettingsKeyboard(settings: DBSettings, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  return new InlineKeyboard()
    .text(t.btn_slippage(settings.slippage_bps / 100), 'settings:slippage_menu')
    .text(t.btn_priority_fee(settings.priority_fee_sol), 'settings:priority_menu')
    .row()
    .text(t.btn_language, 'menu:language')
    .row()
    .text(t.btn_back_main, 'menu:main');
}

/**
 * Slippage Presets Keyboard
 */
export function getSlippageSettingsKeyboard(currentBps: number, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
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
    .text(t.btn_custom_slippage, 'settings:custom_slippage')
    .row()
    .text(t.btn_back_main, 'menu:settings');
}

/**
 * Priority Fee Presets Keyboard
 */
export function getPriorityFeeKeyboard(currentFee: number, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
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
    .text(t.btn_back_main, 'menu:settings');
}

/**
 * Copy Trading Hub Keyboard
 */
export function getCopyMenuKeyboard(targets: DBCopyTarget[], lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const kb = new InlineKeyboard();

  if (targets.length > 0) {
    targets.forEach((target, index) => {
      const statusIcon = target.is_active === 1 ? '🟢' : '⏸️';
      const label = target.label || `Target #${target.id}`;
      kb.text(`${statusIcon} ${label} (${formatAddress(target.target_wallet, 4)})`, `copy:view:${target.id}`).row();
    });
  }

  kb.text(t.btn_add_copy_target, 'copy:add')
    .row()
    .text(t.btn_refresh, 'menu:copy')
    .text(t.btn_back_main, 'menu:main');

  return kb;
}

/**
 * Single Copy Target Detail Keyboard
 */
export function getCopyTargetDetailKeyboard(target: DBCopyTarget, lang: SupportedLanguage = 'en'): InlineKeyboard {
  const t = getT(lang);
  const toggleText = target.is_active === 1 ? t.btn_pause_target : t.btn_resume_target;

  return new InlineKeyboard()
    .text(toggleText, `copy:toggle:${target.id}`)
    .text(t.btn_delete_target, `copy:delete:${target.id}`)
    .row()
    .url(t.btn_view_solscan, `https://solscan.io/account/${target.target_wallet}`)
    .row()
    .text(t.btn_back_copy, 'menu:copy');
}

/**
 * Mirror Sell Selection Keyboard (For Conversation)
 */
export function getCopyMirrorChoiceKeyboard(lang: SupportedLanguage = 'en'): InlineKeyboard {
  const yesText = 'Yes, Enable Mirror Sell';
  const noText = 'No, Buy Only';

  return new InlineKeyboard()
    .text(yesText, 'copy:mirror:yes')
    .text(noText, 'copy:mirror:no')
    .row()
    .text('Cancel', 'copy:cancel');
}

