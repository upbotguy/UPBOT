import { Bot, session, InputFile } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { CONFIG } from './config.js';
import {
  initDB,
  getOrCreateUser,
  getUserWallets,
  getActiveWallet,
  setActiveWallet,
  removeWallet,
  getUserSettings,
  updateUserSettings,
  getUserLanguage,
  setUserLanguage,
  addWallet,
  getWalletByPublicKey,
  getUserLimitOrders,
  getLimitOrderById,
  cancelLimitOrder,
  deleteLimitOrder,
  getUserTokenPosition,
} from './db/index.js';
import {
  getSolBalance,
  getTokenBalance,
  generateNewWallet,
  isValidSolanaAddress,
  formatAddress,
  getWalletPortfolio,
} from './services/wallet.js';
import { fetchTokenInfo, formatCurrency } from './services/token.js';
import { generatePnLCard } from './services/pnlCard.js';
import {
  getMainMenuMessage,
  getSecurityMessage,
  getTokenDashboardMessage,
  getSettingsMessage,
  getOrdersListMessage,
  getOrderDetailMessage,
  getPortfolioMessage,
} from './bot/messages.js';
import {
  getMainMenuKeyboard,
  getSecurityKeyboard,
  getRemoveWalletKeyboard,
  getExportWalletKeyboard,
  getConfirmExportKeyboard,
  getSelfDestructKeyboard,
  getTokenTradeKeyboard,
  getSettingsKeyboard,
  getSlippageSettingsKeyboard,
  getPriorityFeeKeyboard,
  getOrdersKeyboard,
  getOrderDetailKeyboard,
  getPortfolioKeyboard,
  getLanguageKeyboard,
  getLimitBuyOptionsKeyboard,
  getLimitSellOptionsKeyboard,
} from './bot/keyboards.js';
import {
  MyContext,
  addWalletConversation,
  tradeInputConversation,
  customBuyConversation,
  customSellConversation,
  limitBuyConversation,
  limitSellConversation,
  editOrderPriceConversation,
  editOrderAmountConversation,
  customSlippageConversation,
  executeBuyFlow,
  executeSellFlow,
  setUserTradeState,
  getUserTradeState,
  extractTokenAddressFromContext,
} from './bot/conversations.js';
import { startOrderEngine } from './services/orderEngine.js';
import { startWebServer } from './server/app.js';
import { getT, SupportedLanguage } from './i18n/index.js';

// Initialize Database
initDB();

// Initialize Bot
const bot = new Bot<MyContext>(CONFIG.BOT_TOKEN);

// Admin Whitelist Security Middleware
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username?.toLowerCase().replace(/^@/, '') || '';
  if (!userId) return;

  const hasWhitelist = CONFIG.ADMIN_USER_IDS.length > 0 || CONFIG.ADMIN_USERNAMES.length > 0;

  if (hasWhitelist) {
    const isIdAllowed = CONFIG.ADMIN_USER_IDS.includes(userId);
    const isUsernameAllowed = username ? CONFIG.ADMIN_USERNAMES.includes(username) : false;

    if (!isIdAllowed && !isUsernameAllowed) {
      console.warn(
        `[Security Alert] Unauthorized access blocked from @${username || 'unknown'} (ID: ${userId})`
      );
      try {
        if (ctx.callbackQuery) {
          await ctx.answerCallbackQuery({ text: '⛔ Access Denied! Private Bot.', show_alert: true });
        } else {
          await ctx.reply(
            `⛔ *Access Denied!*\n\n` +
              `This bot is restricted to authorized administrator usernames (@${CONFIG.ADMIN_USERNAMES.join(', @')}).\n\n` +
              `👤 *Your Username:* @${username || 'No username'}\n` +
              `🆔 *Your Telegram User ID:* \`${userId}\``,
            { parse_mode: 'Markdown' }
          );
        }
      } catch {}
      return;
    }
  }

  await next();
});

// Register Session & Conversations Plugin
bot.use(
  session({
    initial: () => ({
      targetTokenAddress: '',
    }),
  })
);
bot.use(conversations());

// Register Conversation handlers
bot.use(createConversation(addWalletConversation));
bot.use(createConversation(tradeInputConversation));
bot.use(createConversation(customBuyConversation));
bot.use(createConversation(customSellConversation));
bot.use(createConversation(limitBuyConversation));
bot.use(createConversation(limitSellConversation));
bot.use(createConversation(editOrderPriceConversation));
bot.use(createConversation(editOrderAmountConversation));
bot.use(createConversation(customSlippageConversation));

/**
 * Handle /start command
 */
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  getOrCreateUser(userId, ctx.from?.username, ctx.from?.first_name);
  const lang = getUserLanguage(userId);
  const activeWallet = getActiveWallet(userId);
  const balance = activeWallet ? await getSolBalance(activeWallet.publicKey) : 0;

  const message = getMainMenuMessage(
    ctx.from?.first_name || ctx.from?.username || 'Trader',
    activeWallet,
    balance,
    lang
  );

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: getMainMenuKeyboard(lang),
  });
});

/**
 * Menu: Main
 */
bot.callbackQuery('menu:main', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  getOrCreateUser(userId, ctx.from.username, ctx.from.first_name);
  const lang = getUserLanguage(userId);
  const activeWallet = getActiveWallet(userId);
  const balance = activeWallet ? await getSolBalance(activeWallet.publicKey) : 0;

  const message = getMainMenuMessage(
    ctx.from.first_name || ctx.from.username || 'Trader',
    activeWallet,
    balance,
    lang
  );

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(lang),
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(lang),
    });
  }
});

/**
 * Menu: Refresh
 */
bot.callbackQuery('menu:refresh', async (ctx) => {
  ctx.answerCallbackQuery({ text: '🔄 Refreshed!' }).catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const activeWallet = getActiveWallet(userId);
  const balance = activeWallet ? await getSolBalance(activeWallet.publicKey, true) : 0;

  const message = getMainMenuMessage(
    ctx.from.first_name || ctx.from.username || 'Trader',
    activeWallet,
    balance,
    lang
  );

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(lang),
    });
  } catch {}
});

/**
 * Menu: Language Selection
 */
bot.callbackQuery('menu:language', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const t = getT(lang);

  const message = t.lang_select_title;
  const keyboard = getLanguageKeyboard(lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Switch Language Trigger
 */
bot.callbackQuery(/^lang:set:(en|zh|ru|ko|es|my)$/, async (ctx) => {
  const newLang = ctx.match[1] as SupportedLanguage;
  const userId = ctx.from.id;
  setUserLanguage(userId, newLang);

  const langNames: Record<SupportedLanguage, string> = {
    en: 'English 🇺🇸',
    zh: '简体中文 🇨🇳',
    ru: 'Русский 🇷🇺',
    ko: '한국어 🇰🇷',
    es: 'Español 🇪🇸',
    my: 'မြန်မာစာ 🇲🇲',
  };
  const langName = langNames[newLang] || 'English 🇺🇸';
  ctx.answerCallbackQuery({ text: `Language changed to ${langName}!` }).catch(() => {});

  const activeWallet = getActiveWallet(userId);
  const balance = activeWallet ? await getSolBalance(activeWallet.publicKey) : 0;
  const message = getMainMenuMessage(
    ctx.from.first_name || ctx.from.username || 'Trader',
    activeWallet,
    balance,
    newLang
  );

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(newLang),
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(newLang),
    });
  }
});

/**
 * Menu: Portfolio / Holdings
 */
bot.callbackQuery('menu:portfolio', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const activeWallet = getActiveWallet(userId);
  const t = getT(lang);

  if (!activeWallet) {
    await ctx.reply(t.no_active_wallet_err, {
      reply_markup: { inline_keyboard: [[{ text: t.btn_wallets, callback_data: 'menu:security' }]] },
    });
    return;
  }

  const portfolio = await getWalletPortfolio(activeWallet.publicKey);
  const message = getPortfolioMessage(portfolio, lang);
  const keyboard = getPortfolioKeyboard(portfolio, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Trade Button Handler
 */
bot.callbackQuery('menu:trade', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  await ctx.conversation.enter('tradeInputConversation');
});

/**
 * Security / Wallet Management Handler
 */
bot.callbackQuery('menu:security', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const wallets = getUserWallets(userId);

  const walletBalances = await Promise.all(
    wallets.map(async (w) => ({
      wallet: w,
      balance: await getSolBalance(w.publicKey),
    }))
  );

  const message = getSecurityMessage(walletBalances, lang);
  const keyboard = getSecurityKeyboard(wallets, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Add Wallet Handler
 */
bot.callbackQuery('wallet:add', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('addWalletConversation');
});

/**
 * Generate New Wallet Handler
 */
bot.callbackQuery('wallet:generate', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const newWallet = generateNewWallet();

  addWallet(userId, newWallet.keypair.publicKey.toBase58(), newWallet.privateKeyBase58, newWallet.mnemonic);

  const msg =
    `🎉 *New Solana Wallet Generated!*\n\n` +
    `💳 *Public Address:*\n\`${newWallet.keypair.publicKey.toBase58()}\`\n\n` +
    `🔑 *Private Key (Base58):*\n\`${newWallet.privateKeyBase58}\`\n\n` +
    `📝 *Seed Phrase (12 Words):*\n\`${newWallet.mnemonic}\`\n\n` +
    `⚠️ *Security Warning:* Please backup this private key and seed phrase immediately. Never share it with anyone!`;

  const sent = await ctx.reply(msg, {
    parse_mode: 'Markdown',
    reply_markup: getSelfDestructKeyboard(0, lang),
  });

  try {
    await ctx.api.editMessageReplyMarkup(ctx.chat!.id, sent.message_id, {
      reply_markup: getSelfDestructKeyboard(sent.message_id, lang),
    });
  } catch {}
});

/**
 * Switch Active Wallet Handler
 */
bot.callbackQuery(/^wallet:select:(.+)$/, async (ctx) => {
  const pubkey = ctx.match[1];
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  setActiveWallet(userId, pubkey);
  ctx.answerCallbackQuery({ text: `⭐ Active wallet changed!` }).catch(() => {});

  const wallets = getUserWallets(userId);
  const walletBalances = await Promise.all(
    wallets.map(async (w) => ({
      wallet: w,
      balance: await getSolBalance(w.publicKey),
    }))
  );

  const message = getSecurityMessage(walletBalances, lang);
  const keyboard = getSecurityKeyboard(wallets, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {}
});

/**
 * Export Wallet Menu
 */
bot.callbackQuery('wallet:export_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const wallets = getUserWallets(userId);

  try {
    await ctx.editMessageText('🔑 *Select a wallet to export private key:*', {
      parse_mode: 'Markdown',
      reply_markup: getExportWalletKeyboard(wallets, lang),
    });
  } catch {}
});

/**
 * Confirm Export Warning
 */
bot.callbackQuery(/^wallet:export_confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const pubkey = ctx.match[1];
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  const warningMsg =
    `⚠️ *Security Warning*\n\n` +
    `You are about to export the private key for wallet \`${formatAddress(pubkey, 6)}\`.\n\n` +
    `Ensure no one is looking at your screen.\n` +
    `Click the button below to confirm:`;

  try {
    await ctx.editMessageText(warningMsg, {
      parse_mode: 'Markdown',
      reply_markup: getConfirmExportKeyboard(pubkey, lang),
    });
  } catch {}
});

/**
 * Show Decrypted Private Key
 */
bot.callbackQuery(/^wallet:export_show:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const pubkey = ctx.match[1];
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  const wallet = getWalletByPublicKey(userId, pubkey);
  if (!wallet) {
    await ctx.reply('❌ Wallet not found.');
    return;
  }

  const mnemonicText = wallet.mnemonic
    ? `\n\n📝 *Seed Phrase (12 Words):*\n\`${wallet.mnemonic}\``
    : '';

  const revealMsg =
    `🔑 *Wallet Private Key Details*\n\n` +
    `💳 *Public Address:*\n\`${wallet.publicKey}\`\n\n` +
    `🔐 *Private Key (Base58):*\n\`${wallet.privateKey}\`${mnemonicText}\n\n` +
    `⚠️ _Click "Hide & Delete" button below once backed up._`;

  const sent = await ctx.reply(revealMsg, {
    parse_mode: 'Markdown',
    reply_markup: getSelfDestructKeyboard(0, lang),
  });

  try {
    await ctx.api.editMessageReplyMarkup(ctx.chat!.id, sent.message_id, {
      reply_markup: getSelfDestructKeyboard(sent.message_id, lang),
    });
  } catch {}
});

/**
 * Self Destruct Private Key Handler
 */
bot.callbackQuery(/^wallet:hide:([0-9]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '🔒 Deleted securely!' });
  const msgId = parseInt(ctx.match[1], 10);
  try {
    if (msgId > 0) {
      await ctx.api.deleteMessage(ctx.chat!.id, msgId);
    } else if (ctx.callbackQuery.message) {
      await ctx.deleteMessage();
    }
  } catch {}
});

/**
 * Remove Wallet Menu
 */
bot.callbackQuery('wallet:remove', async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const wallets = getUserWallets(userId);

  try {
    await ctx.editMessageText('🗑️ *Select a wallet to remove:*', {
      parse_mode: 'Markdown',
      reply_markup: getRemoveWalletKeyboard(wallets, lang),
    });
  } catch {}
});

/**
 * Remove Confirm Handler
 */
bot.callbackQuery(/^wallet:remove_confirm:(.+)$/, async (ctx) => {
  const pubkey = ctx.match[1];
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  const success = removeWallet(userId, pubkey);
  if (success) {
    ctx.answerCallbackQuery({ text: `🗑️ Wallet ${formatAddress(pubkey, 4)} removed!` }).catch(() => {});
  } else {
    ctx.answerCallbackQuery({ text: '❌ Failed to remove wallet' }).catch(() => {});
  }

  const wallets = getUserWallets(userId);
  const walletBalances = await Promise.all(
    wallets.map(async (w) => ({
      wallet: w,
      balance: await getSolBalance(w.publicKey),
    }))
  );

  const message = getSecurityMessage(walletBalances, lang);
  const keyboard = getSecurityKeyboard(wallets, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {}
});

/**
 * Buy Preset Trigger
 */
bot.callbackQuery(/^buy:preset:(?:(.+):)?([0-9.]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const solAmount = parseFloat(ctx.match[2]);
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  if (!tokenAddress) {
    await ctx.reply('❌ Token address not found. Please send Token CA.', {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Trade', callback_data: 'menu:trade' }]] },
    });
    return;
  }

  await executeBuyFlow(ctx, tokenAddress, solAmount);
});

/**
 * Custom Buy Trigger
 */
bot.callbackQuery(/^buy:custom(?::(.+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);
  if (tokenAddress) {
    setUserTradeState(userId, { targetTokenAddress: tokenAddress });
  }
  await ctx.conversation.enter('customBuyConversation');
});

/**
 * Sell Preset Trigger
 */
bot.callbackQuery(/^sell:preset:(?:(.+):)?([0-9]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const percent = parseInt(ctx.match[2], 10);
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  if (!tokenAddress) {
    await ctx.reply('❌ Token address not found. Please send Token CA.', {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Trade', callback_data: 'menu:trade' }]] },
    });
    return;
  }

  await executeSellFlow(ctx, tokenAddress, percent);
});

/**
 * Custom Sell Trigger
 */
bot.callbackQuery(/^sell:custom(?::(.+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userId = ctx.from.id;
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);
  if (tokenAddress) {
    setUserTradeState(userId, { targetTokenAddress: tokenAddress });
  }
  await ctx.conversation.enter('customSellConversation');
});

/**
 * Refresh Token Dashboard
 */
bot.callbackQuery(/^token:refresh(?::(.+))?$/, async (ctx) => {
  ctx.answerCallbackQuery({ text: '🔄 Refreshed!' }).catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  if (!tokenAddress) {
    await ctx.reply('❌ Token info not found. Please send Token CA.', {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Trade', callback_data: 'menu:trade' }]] },
    });
    return;
  }

  setUserTradeState(userId, { targetTokenAddress: tokenAddress });
  const activeWallet = getActiveWallet(userId);

  const [token, solBalance, tokenBalance] = await Promise.all([
    fetchTokenInfo(tokenAddress, true),
    activeWallet ? getSolBalance(activeWallet.publicKey, true) : Promise.resolve(0),
    activeWallet
      ? getTokenBalance(activeWallet.publicKey, tokenAddress, true)
      : Promise.resolve({ uiAmount: 0, decimals: 0, amount: '0' }),
  ]);

  if (!token) {
    await ctx.reply('❌ Token info refresh failed.');
    return;
  }

  const position = getUserTokenPosition(userId, tokenAddress, activeWallet?.publicKey);
  const messageText = getTokenDashboardMessage(token, activeWallet, solBalance, tokenBalance, lang, position);
  const keyboard = getTokenTradeKeyboard(token.address, token.url, lang);

  try {
    await ctx.editMessageText(messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  } catch {}
});

/**
 * View Active Orders Menu
 */
bot.callbackQuery('menu:orders', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const orders = getUserLimitOrders(userId);

  const message = getOrdersListMessage(orders, lang);
  const keyboard = getOrdersKeyboard(orders, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * View Single Order Details
 */
bot.callbackQuery(/^order:view:([0-9]+)$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const orderId = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  const order = getLimitOrderById(userId, orderId);
  if (!order) {
    await ctx.reply('❌ Order not found.', {
      reply_markup: { inline_keyboard: [[{ text: '📋 All Orders', callback_data: 'menu:orders' }]] },
    });
    return;
  }

  const token = await fetchTokenInfo(order.token_address);
  const currentPrice = token?.priceUsd;

  const message = getOrderDetailMessage(order, currentPrice, lang);
  const keyboard = getOrderDetailKeyboard(order, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Edit Order Price Trigger
 */
bot.callbackQuery(/^order:edit:price:([0-9]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;

  const order = getLimitOrderById(userId, orderId);
  if (!order || order.status !== 'PENDING') {
    await ctx.reply('❌ Order is no longer active.', {
      reply_markup: { inline_keyboard: [[{ text: '📋 All Orders', callback_data: 'menu:orders' }]] },
    });
    return;
  }

  setUserTradeState(userId, { editingOrderId: orderId, targetTokenAddress: order.token_address });
  await ctx.conversation.enter('editOrderPriceConversation');
});

/**
 * Edit Order Amount Trigger
 */
bot.callbackQuery(/^order:edit:amount:([0-9]+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;

  const order = getLimitOrderById(userId, orderId);
  if (!order || order.status !== 'PENDING') {
    await ctx.reply('❌ Order is no longer active.', {
      reply_markup: { inline_keyboard: [[{ text: '📋 All Orders', callback_data: 'menu:orders' }]] },
    });
    return;
  }

  setUserTradeState(userId, { editingOrderId: orderId, targetTokenAddress: order.token_address });
  await ctx.conversation.enter('editOrderAmountConversation');
});

/**
 * Cancel Limit Order
 */
bot.callbackQuery(/^orders:cancel:([0-9]+)$/, async (ctx) => {
  const orderId = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  const success = cancelLimitOrder(userId, orderId);
  if (success) {
    ctx.answerCallbackQuery({ text: `❌ Order #${orderId} cancelled!` }).catch(() => {});
  } else {
    ctx.answerCallbackQuery({ text: `⚠️ Order cancel failed or already executed.` }).catch(() => {});
  }

  const orders = getUserLimitOrders(userId);
  const message = getOrdersListMessage(orders, lang);
  const keyboard = getOrdersKeyboard(orders, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Limit Buy Options Menu
 */
bot.callbackQuery(/^limit:buy:menu(?::(.+))?$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  if (!tokenAddress) {
    await ctx.reply('❌ Token not selected.', {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Trade', callback_data: 'menu:trade' }]] },
    });
    return;
  }

  setUserTradeState(userId, { targetTokenAddress: tokenAddress });
  const token = await fetchTokenInfo(tokenAddress);
  const price = token?.priceUsd || 0;

  const keyboard = getLimitBuyOptionsKeyboard(tokenAddress, price, lang);
  const message =
    `⏱️ *Limit Buy Order (Dip)*\n\n` +
    `🪙 *Token:* $${token?.symbol || 'SOL'}\n` +
    `💵 *Current Price:* \`${formatCurrency(price)}\`\n\n` +
    `_Select a dip percentage preset or enter custom price:_`;

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Limit Buy Preset Dip Trigger
 */
bot.callbackQuery(/^limit:buy:preset:(?:(.+):)?([0-9]+)$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const dipPercent = parseFloat(ctx.match[2]);
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  if (!tokenAddress) {
    await ctx.reply('❌ Token not selected.', {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Trade', callback_data: 'menu:trade' }]] },
    });
    return;
  }

  const token = await fetchTokenInfo(tokenAddress);
  const currentPrice = token?.priceUsd || 0;
  const targetPrice = currentPrice * (1 - dipPercent / 100);

  setUserTradeState(userId, {
    targetTokenAddress: tokenAddress,
    targetPriceUsd: targetPrice,
    targetCondition: 'LTE',
  });

  await ctx.conversation.enter('limitBuyConversation');
});

/**
 * Limit Buy Custom Dip % Trigger
 */
bot.callbackQuery(/^limit:buy:custom_dip(?::(.+))?$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  setUserTradeState(userId, {
    ...(tokenAddress ? { targetTokenAddress: tokenAddress } : {}),
    customMode: 'custom_dip',
  });

  await ctx.conversation.enter('limitBuyConversation');
});

/**
 * Limit Buy Custom Price USD Trigger
 */
bot.callbackQuery(/^limit:buy:custom(?:_price)?(?::(.+))?$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  setUserTradeState(userId, {
    ...(tokenAddress ? { targetTokenAddress: tokenAddress } : {}),
    customMode: 'custom_price',
  });

  await ctx.conversation.enter('limitBuyConversation');
});

/**
 * Limit Sell Options Menu
 */
bot.callbackQuery(/^limit:sell:menu(?::(.+))?$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  if (!tokenAddress) {
    await ctx.reply('❌ Token not selected.', {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Trade', callback_data: 'menu:trade' }]] },
    });
    return;
  }

  setUserTradeState(userId, { targetTokenAddress: tokenAddress });
  const token = await fetchTokenInfo(tokenAddress);
  const price = token?.priceUsd || 0;

  const keyboard = getLimitSellOptionsKeyboard(tokenAddress, price, lang);
  const message =
    `⏱️ *Limit Sell Order (TP / SL)*\n\n` +
    `🪙 *Token:* $${token?.symbol || 'SOL'}\n` +
    `💵 *Current Price:* \`${formatCurrency(price)}\`\n\n` +
    `_Select Take Profit (TP) or Stop Loss (SL) preset:_`;

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Limit Sell Preset Trigger
 */
bot.callbackQuery(/^limit:sell:preset:(?:(.+):)?([0-9]+):(GTE|LTE)$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const percentChange = parseFloat(ctx.match[2]);
  const condition = ctx.match[3] as 'GTE' | 'LTE';
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  if (!tokenAddress) {
    await ctx.reply('❌ Token not selected.', {
      reply_markup: { inline_keyboard: [[{ text: '🎯 Trade', callback_data: 'menu:trade' }]] },
    });
    return;
  }

  const token = await fetchTokenInfo(tokenAddress);
  const currentPrice = token?.priceUsd || 0;
  const targetPrice =
    condition === 'GTE'
      ? currentPrice * (1 + percentChange / 100)
      : currentPrice * (1 - percentChange / 100);

  setUserTradeState(userId, {
    targetTokenAddress: tokenAddress,
    targetPriceUsd: targetPrice,
    targetCondition: condition,
  });

  await ctx.conversation.enter('limitSellConversation');
});

/**
 * Limit Sell Custom % (TP/SL) Trigger
 */
bot.callbackQuery(/^limit:sell:custom_pct(?::(.+))?$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  setUserTradeState(userId, {
    ...(tokenAddress ? { targetTokenAddress: tokenAddress } : {}),
    customMode: 'custom_pct',
  });

  await ctx.conversation.enter('limitSellConversation');
});

/**
 * Limit Sell Custom Price USD Trigger
 */
bot.callbackQuery(/^limit:sell:custom(?:_price)?(?::(.+))?$/, async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const tokenAddress = ctx.match[1] || extractTokenAddressFromContext(ctx);

  setUserTradeState(userId, {
    ...(tokenAddress ? { targetTokenAddress: tokenAddress } : {}),
    customMode: 'custom_price',
  });

  await ctx.conversation.enter('limitSellConversation');
});

/**
 * Settings Menu Handler
 */
bot.callbackQuery('menu:settings', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const settings = getUserSettings(userId);

  const message = getSettingsMessage(settings, lang);
  const keyboard = getSettingsKeyboard(settings, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

/**
 * Slippage Settings Submenu
 */
bot.callbackQuery('settings:slippage_menu', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const settings = getUserSettings(userId);

  try {
    await ctx.editMessageText(
      `⚡ *Slippage Settings*\n\nCurrent Slippage: \`${settings.slippage_bps / 100}%\`\n\nSelect a preset or enter a custom percentage:`,
      {
        parse_mode: 'Markdown',
        reply_markup: getSlippageSettingsKeyboard(settings.slippage_bps, lang),
      }
    );
  } catch {}
});

/**
 * Set Slippage Preset Trigger
 */
bot.callbackQuery(/^settings:set_slippage:([0-9]+)$/, async (ctx) => {
  const bps = parseInt(ctx.match[1], 10);
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  updateUserSettings(userId, bps);
  ctx.answerCallbackQuery({ text: `⚡ Slippage updated to ${bps / 100}%!` }).catch(() => {});

  const settings = getUserSettings(userId);
  const message = getSettingsMessage(settings, lang);
  const keyboard = getSettingsKeyboard(settings, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {}
});

/**
 * Custom Slippage Trigger
 */
bot.callbackQuery('settings:custom_slippage', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('customSlippageConversation');
});

/**
 * Priority Fee Settings Submenu
 */
bot.callbackQuery('settings:priority_menu', async (ctx) => {
  ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const settings = getUserSettings(userId);

  try {
    await ctx.editMessageText(
      `⛽ *Priority Gas Fee Settings*\n\nCurrent Priority Fee: \`${settings.priority_fee_sol} SOL\`\n\nSelect a preset:`,
      {
        parse_mode: 'Markdown',
        reply_markup: getPriorityFeeKeyboard(settings.priority_fee_sol, lang),
      }
    );
  } catch {}
});

/**
 * Set Priority Fee Preset Trigger
 */
bot.callbackQuery(/^settings:set_fee:([0-9.]+)$/, async (ctx) => {
  const fee = parseFloat(ctx.match[1]);
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);

  updateUserSettings(userId, undefined, undefined, fee);
  ctx.answerCallbackQuery({ text: `⛽ Priority Fee updated to ${fee} SOL!` }).catch(() => {});

  const settings = getUserSettings(userId);
  const message = getSettingsMessage(settings, lang);
  const keyboard = getSettingsKeyboard(settings, lang);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch {}
});

/**
 * Share PnL Card Callback Handler
 */
bot.callbackQuery(/^token:pnl:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery({ text: '🎨 Generating PnL Card...' }).catch(() => {});
  const tokenAddress = ctx.match[1];
  const userId = ctx.from.id;
  const activeWallet = getActiveWallet(userId);

  const [token, tokenBalance] = await Promise.all([
    fetchTokenInfo(tokenAddress, true),
    activeWallet
      ? getTokenBalance(activeWallet.publicKey, tokenAddress, true)
      : Promise.resolve({ uiAmount: 0, decimals: 0, amount: '0' }),
  ]);

  if (!token) {
    await ctx.reply('❌ Failed to fetch token data for PnL card.');
    return;
  }

  const position = getUserTokenPosition(userId, tokenAddress, activeWallet?.publicKey);
  const entryPrice = position && position.avgEntryPriceUsd > 0 ? position.avgEntryPriceUsd : token.priceUsd;
  const entryMc = position && position.avgEntryMarketCap > 0 ? position.avgEntryMarketCap : token.marketCap;
  const pnlPercent = entryPrice > 0 ? ((token.priceUsd - entryPrice) / entryPrice) * 100 : 0;
  const holdingTokens = tokenBalance.uiAmount || position?.currentHoldingTokens || 0;
  const profitUsd = (token.priceUsd - entryPrice) * holdingTokens;

  try {
    const pngBuffer = await generatePnLCard({
      tokenSymbol: token.symbol,
      tokenName: token.name,
      pnlPercent,
      entryPriceUsd: entryPrice,
      currentPriceUsd: token.priceUsd,
      entryMarketCapUsd: entryMc,
      currentMarketCapUsd: token.marketCap,
      profitUsd,
      holdingTokens,
      walletAddress: activeWallet?.publicKey,
      botUsername: ctx.me?.username || 'MyanBotAi_bot',
    });

    const isProfit = pnlPercent >= 0;
    const sign = isProfit ? '+' : '';
    const caption =
      `🚀 *${token.name} ($${token.symbol}) PnL Card*\n\n` +
      `📈 *Return:* \`${sign}${pnlPercent.toFixed(2)}%\` (${isProfit ? '🟢 Profit' : '🔴 Loss'})\n` +
      `💵 *Entry:* \`${formatCurrency(entryPrice)}\` (MC: \`${formatCurrency(entryMc)}\`)\n` +
      `🎯 *Current:* \`${formatCurrency(token.priceUsd)}\` (MC: \`${formatCurrency(token.marketCap)}\`)\n` +
      `💰 *Net Gain:* \`${profitUsd >= 0 ? '+' : ''}${formatCurrency(profitUsd)}\`\n\n` +
      `⚡ _Generated by Myan Bot AI Telegram Sniper_`;

    await ctx.replyWithPhoto(new InputFile(pngBuffer, `${token.symbol}_pnl.png`), {
      caption,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎯 Trade Token', callback_data: `token:refresh:${tokenAddress}` },
            { text: '💼 Portfolio', callback_data: 'menu:portfolio' },
          ],
        ],
      },
    });
  } catch (err: any) {
    console.error('PnL Card generation error:', err);
    await ctx.reply(`❌ Failed to generate PnL Card: ${err.message}`);
  }
});

/**
 * Fallback Text Handler: Check if user pasted a Solana Token Address (CA)
 */
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim();
  const userId = ctx.from.id;
  const lang = getUserLanguage(userId);
  const t = getT(lang);

  if (isValidSolanaAddress(text)) {
    setUserTradeState(userId, { targetTokenAddress: text });
    const activeWallet = getActiveWallet(userId);

    const [token, solBalance, tokenBalance] = await Promise.all([
      fetchTokenInfo(text),
      activeWallet ? getSolBalance(activeWallet.publicKey) : Promise.resolve(0),
      activeWallet
        ? getTokenBalance(activeWallet.publicKey, text)
        : Promise.resolve({ uiAmount: 0, decimals: 0, amount: '0' }),
    ]);

    if (!token) {
      await ctx.reply(`❌ *Token not found on Solana Network!*\nPlease verify the contract address and try again.`);
      return;
    }

    const position = getUserTokenPosition(userId, text, activeWallet?.publicKey);
    const messageText = getTokenDashboardMessage(token, activeWallet, solBalance, tokenBalance, lang, position);
    const keyboard = getTokenTradeKeyboard(token.address, token.url, lang);

    await ctx.reply(messageText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  } else {
    await ctx.reply(
      `❓ Please send a valid Solana Token Contract Address (CA) or use /start to open the Main Menu.`,
      {
        reply_markup: {
          inline_keyboard: [[{ text: t.btn_back_main, callback_data: 'menu:main' }]],
        },
      }
    );
  }
});

// Start Background Limit Order Engine
startOrderEngine(bot);

// Start Web Trading Terminal if enabled
if (CONFIG.ENABLE_WEB_UI) {
  startWebServer(CONFIG.PORT);
}

// Catch errors
bot.catch((err) => {
  console.error('[Bot Error]', err);
});

// Launch Bot
console.log('🤖 UPBOT AI is starting...');
bot.start({
  onStart: (botInfo) => {
    console.log(`✅ UPBOT AI started successfully as @${botInfo.username}`);
  },
});
