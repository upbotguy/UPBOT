import { DecryptedWallet, DBSettings, DBLimitOrder, UserTokenPosition, DBCopyTarget } from '../db/index.js';
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
  const walletText = activeWallet ? activeWallet.publicKey : t.none_add_in_wallets;
  return t.main_welcome(userName, walletText, solBalance);
}

export function getSecurityMessage(
  wallets: { wallet: DecryptedWallet; balance: number }[],
  lang: SupportedLanguage = 'en'
): string {
  const t = getT(lang);
  let listText = '';
  if (wallets.length === 0) {
    listText = t.security_empty;
  } else {
    listText = wallets
      .map((item, index) => {
        const w = item.wallet;
        const active = w.isActive ? '⭐ *[ACTIVE]*' : '';
        return `*${index + 1}.* \`${formatAddress(w.publicKey, 6)}\` — \`${item.balance.toFixed(4)} SOL\` ${active}\n   Full: \`${w.publicKey}\``;
      })
      .join('\n\n');
  }

  return t.security_title(listText);
}

export function getTokenDashboardMessage(
  token: TokenInfo,
  activeWallet: DecryptedWallet | null,
  solBalance: number,
  tokenBalance: { uiAmount: number },
  lang: SupportedLanguage = 'en',
  position?: UserTokenPosition | null
): string {
  const t = getT(lang);
  const walletStr = activeWallet
    ? `💳 \`${formatAddress(activeWallet.publicKey, 4)}\` (${t.wallet_balance}: \`${solBalance.toFixed(4)} SOL\`)`
    : `⚠️ ${t.none_add_in_wallets}`;

  let positionSection = '';
  if (position && position.totalBoughtTokens > 0 && tokenBalance.uiAmount > 0) {
    const avgEntryPrice = position.avgEntryPriceUsd;
    const avgEntryMc = position.avgEntryMarketCap;
    const pnlPct = avgEntryPrice > 0 ? ((token.priceUsd - avgEntryPrice) / avgEntryPrice) * 100 : 0;
    const pnlSign = pnlPct >= 0 ? '+' : '';
    const pnlEmoji = pnlPct >= 0 ? '🟢' : '🔴';
    const pnlUsd = (token.priceUsd - avgEntryPrice) * tokenBalance.uiAmount;
    const multiplier = avgEntryPrice > 0 ? (token.priceUsd / avgEntryPrice).toFixed(2) : '1.00';
    const holdingValUsd = tokenBalance.uiAmount * token.priceUsd;

    positionSection =
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *Your Position & PnL:*\n` +
      `• *Holding:* \`${tokenBalance.uiAmount.toLocaleString()} ${token.symbol}\` (~$${holdingValUsd.toFixed(2)})\n` +
      `• *Avg Entry Price:* \`${formatCurrency(avgEntryPrice)}\`\n` +
      `• *Avg Entry MC:* \`${formatCurrency(avgEntryMc)}\` _(Current: ${formatCurrency(token.marketCap)})_\n` +
      `• *PnL:* ${pnlEmoji} *${pnlSign}${pnlPct.toFixed(2)}%* (${pnlUsd >= 0 ? '+' : ''}$${pnlUsd.toFixed(2)}) \`[🚀 ${multiplier}x]\`\n` +
      `• *Active Wallet:* ${walletStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n`;
  } else {
    positionSection =
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 *Holdings:*\n` +
      `• *Holding:* \`${tokenBalance.uiAmount.toLocaleString()} ${token.symbol}\`\n` +
      `• *Active Wallet:* ${walletStr}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n`;
  }

  return (
    `🪙 *${token.name}* | *$${token.symbol}*\n` +
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
    positionSection +
    `👇 _Select a trading option below:_`
  );
}

export function getPortfolioMessage(portfolio: WalletPortfolio, lang: SupportedLanguage = 'en'): string {
  const t = getT(lang);

  if (portfolio.tokens.length === 0) {
    return (
      t.portfolio_title(
        portfolio.walletAddress ? formatAddress(portfolio.walletAddress) : 'None',
        portfolio.solBalance,
        portfolio.solValueUsd,
        portfolio.totalValueUsd
      ) + `\n\n${t.portfolio_empty}`
    );
  }

  const tokenLines = portfolio.tokens
    .map((item, idx) => {
      const priceStr = item.priceUsd < 0.01 ? item.priceUsd.toFixed(6) : item.priceUsd.toFixed(4);
      return (
        `*${idx + 1}.* *$${item.symbol}* (${item.name})\n` +
        `   • Amount: \`${item.uiAmount.toLocaleString()}\`\n` +
        `   • Value: \`$${priceStr}\` (~$${item.valueUsd.toFixed(2)})`
      );
    })
    .join('\n\n');

  return (
    t.portfolio_title(
      portfolio.walletAddress ? formatAddress(portfolio.walletAddress) : 'None',
      portfolio.solBalance,
      portfolio.solValueUsd,
      portfolio.totalValueUsd
    ) +
    `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
    tokenLines +
    `\n\n👇 _Select a token below to trade or sell instantly:_`
  );
}

export function getSettingsMessage(settings: DBSettings, lang: SupportedLanguage = 'en'): string {
  const t = getT(lang);
  return t.settings_title(settings.slippage_bps / 100, settings.priority_fee_sol);
}

export function getOrdersListMessage(orders: DBLimitOrder[], lang: SupportedLanguage = 'en'): string {
  const t = getT(lang);
  const pending = orders.filter((o) => o.status === 'PENDING');
  const history = orders.filter((o) => o.status !== 'PENDING');

  if (pending.length === 0) {
    return (
      `📋 *Limit Orders*\n\n` +
      `❌ _No active pending limit orders found._\n\n` +
      `_Select a token in Trade menu to create a Limit Buy (Dip) or Limit Sell (TP/SL) order._`
    );
  }

  const list = pending
    .map((o) => {
      const typeStr = o.order_type === 'BUY_LIMIT' ? '🟢 BUY' : '🔴 SELL';
      const amountStr = o.order_type === 'BUY_LIMIT' ? `${o.amount_sol} SOL` : `${o.amount_percent}%`;

      return (
        `⏳ *#${o.id}* [${typeStr}] *$${o.token_symbol}*\n` +
        `   • Target: \`${formatCurrency(o.target_price_usd)}\` (${o.condition === 'LTE' ? '≤' : '≥'})\n` +
        `   • Amount: \`${amountStr}\``
      );
    })
    .join('\n\n');

  return t.orders_list_title(pending.length, history.length, list);
}

export function getOrderDetailMessage(order: DBLimitOrder, currentPrice?: number, lang: SupportedLanguage = 'en'): string {
  const t = getT(lang);
  const isBuy = order.order_type === 'BUY_LIMIT';
  const typeStr = isBuy ? 'BUY LIMIT' : (order.condition === 'GTE' ? 'TAKE PROFIT (TP)' : 'STOP LOSS (SL)');
  const amountStr = isBuy ? `${order.amount_sol} SOL` : `${order.amount_percent}%`;
  const condStr = order.condition === 'LTE' ? '≤ Dip' : '≥ Rise';

  return t.order_detail_title(
    order.id,
    typeStr,
    order.token_symbol,
    order.status,
    order.target_price_usd,
    amountStr,
    condStr,
    order.created_at
  );
}

export function getCopyMenuMessage(targets: DBCopyTarget[], lang: SupportedLanguage = 'en'): string {
  const t = getT(lang);
  const activeCount = targets.filter((t) => t.is_active === 1).length;

  if (targets.length === 0) {
    const emptyText = `_No target wallets added yet._\n\nClick the "➕ Add Target Wallet" button below to start automatically copying trades from any Solana wallet address!`;
    return t.copy_menu_title(0, emptyText);
  }

  const listText = targets
    .map((target, idx) => {
      const statusStr = target.is_active === 1 ? '🟢 [ACTIVE]' : '⏸️ [PAUSED]';
      const labelStr = target.label ? `*${target.label}*` : `Target #${target.id}`;
      const mirrorStr = target.mirror_sell === 1 ? 'Auto %' : 'Off';
      return (
        `*${idx + 1}.* ${labelStr} ${statusStr}\n` +
        `   • Address: \`${formatAddress(target.target_wallet, 6)}\`\n` +
        `   • Buy SOL: \`${target.buy_amount_sol} SOL\` | Mirror Sell: \`${mirrorStr}\`\n` +
        `   • Full: \`${target.target_wallet}\``
      );
    })
    .join('\n\n');

  return t.copy_menu_title(activeCount, listText);
}

export function getCopyTargetDetailMessage(target: DBCopyTarget, lang: SupportedLanguage = 'en'): string {
  const statusStr = target.is_active === 1 ? '🟢 ACTIVE (Monitoring)' : '⏸️ PAUSED';
  const labelStr = target.label ? target.label : 'None';
  const mirrorStr = target.mirror_sell === 1 ? 'Enabled (Auto proportional sell)' : 'Disabled';

  return (
    `👥 *Copy Target #${target.id} Details*\n\n` +
    `👤 *Label:* \`${labelStr}\`\n` +
    `💳 *Wallet Address:*\n\`${target.target_wallet}\`\n\n` +
    `📊 *Status:* \`${statusStr}\`\n` +
    `💰 *Buy Amount Per Trade:* \`${target.buy_amount_sol} SOL\`\n` +
    `🔄 *Mirror Sell:* \`${mirrorStr}\`\n` +
    `⚡ *Max Slippage:* \`${(target.max_slippage_bps / 100).toFixed(1)}%\`\n` +
    `🕒 *Added At:* \`${target.created_at}\``
  );
}

