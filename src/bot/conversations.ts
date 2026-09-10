import { Conversation, ConversationFlavor } from '@grammyjs/conversations';
import { Context, SessionFlavor, InlineKeyboard } from 'grammy';
import {
  addWallet,
  getActiveWallet,
  getOrCreateUser,
  createLimitOrder,
  setUserActiveTokenDB,
  getUserActiveTokenDB,
  getUserSettings,
  updateUserSettings,
  getUserLanguage,
  getLimitOrderById,
  updateLimitOrderDetails,
  cancelLimitOrder,
  deleteLimitOrder,
  getUserLimitOrders,
  recordTrade,
  getUserTokenPosition,
  addCopyTarget,
  getUserCopyTargets,
} from '../db/index.js';
import {
  importWalletAuto,
  getSolBalance,
  getTokenBalance,
  isValidSolanaAddress,
  importWalletFromPrivateKey,
  importWalletFromMnemonic,
  formatAddress,
} from '../services/wallet.js';
import { fetchTokenInfo, formatCurrency, getSolPriceUsd } from '../services/token.js';
import {
  getTokenDashboardMessage,
  getOrderDetailMessage,
  getOrdersListMessage,
  getSettingsMessage,
  getCopyMenuMessage,
} from './messages.js';
import {
  getTokenTradeKeyboard,
  getOrderDetailKeyboard,
  getOrdersKeyboard,
  getSettingsKeyboard,
  getCopyMenuKeyboard,
  getCopyMirrorChoiceKeyboard,
} from './keyboards.js';
import { executeJupiterSwap, getJupiterQuote } from '../services/swap.js';
import { CONFIG } from '../config.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getT } from '../i18n/index.js';

export interface SessionData {
  targetTokenAddress: string;
  targetPriceUsd?: number;
  targetCondition?: 'LTE' | 'GTE';
  presetDipPercent?: number;
  presetGainPercent?: number;
  editingOrderId?: number;
  customMode?: 'custom_dip' | 'custom_pct' | 'custom_price';
}

export interface UserTradeState {
  targetTokenAddress: string;
  targetPriceUsd?: number;
  targetCondition?: 'LTE' | 'GTE';
  editingOrderId?: number;
  customMode?: 'custom_dip' | 'custom_pct' | 'custom_price';
}

export const userTradeStateMap = new Map<number, UserTradeState>();

export function setUserTradeState(userId: number, state: Partial<UserTradeState>) {
  const current = userTradeStateMap.get(userId) || { targetTokenAddress: '' };
  const updated = { ...current, ...state };
  userTradeStateMap.set(userId, updated);
  if (updated.targetTokenAddress && isValidSolanaAddress(updated.targetTokenAddress)) {
    setUserActiveTokenDB(userId, updated.targetTokenAddress);
  }
}

export function getUserTradeState(userId: number): UserTradeState | undefined {
  const current = userTradeStateMap.get(userId);
  if (current && current.targetTokenAddress && isValidSolanaAddress(current.targetTokenAddress)) {
    return current;
  }
  const dbCA = getUserActiveTokenDB(userId);
  if (dbCA && isValidSolanaAddress(dbCA)) {
    const restored: UserTradeState = { ...(current || {}), targetTokenAddress: dbCA };
    userTradeStateMap.set(userId, restored);
    return restored;
  }
  return current;
}

export function extractTokenAddressFromContext(ctx: Context): string | null {
  const userId = ctx.from?.id;

  // 1. Check in-memory trade state
  if (userId) {
    const memoryState = getUserTradeState(userId);
    if (memoryState?.targetTokenAddress && isValidSolanaAddress(memoryState.targetTokenAddress)) {
      return memoryState.targetTokenAddress;
    }
  }

  // 2. Check session if available
  const sessionCA = (ctx as any)?.session?.targetTokenAddress;
  if (sessionCA && isValidSolanaAddress(sessionCA)) {
    if (userId) setUserTradeState(userId, { targetTokenAddress: sessionCA });
    return sessionCA;
  }

  // 3. Check callback data
  const callbackData = ctx.callbackQuery?.data;
  if (callbackData) {
    const parts = callbackData.split(':');
    const lastPart = parts[parts.length - 1];
    if (isValidSolanaAddress(lastPart)) {
      if (userId) setUserTradeState(userId, { targetTokenAddress: lastPart });
      return lastPart;
    }
  }

  // 4. Check persistent database
  if (userId) {
    const dbToken = getUserActiveTokenDB(userId);
    if (dbToken && isValidSolanaAddress(dbToken)) {
      setUserTradeState(userId, { targetTokenAddress: dbToken });
      return dbToken;
    }
  }

  return null;
}

export type MyContext = ConversationFlavor<Context & SessionFlavor<SessionData>>;
export type MyConversation = Conversation<MyContext, MyContext>;

async function waitForInputOrCancel(
  conversation: MyConversation,
  ctx: MyContext
): Promise<{ text?: string; isCancelled: boolean }> {
  const update = await conversation.wait();

  // If user clicked any cancel/back callback
  if (update.callbackQuery) {
    const data = update.callbackQuery.data || '';
    if (data.startsWith('copy:preset_sol:')) {
      await update.answerCallbackQuery().catch(() => {});
      const val = data.replace('copy:preset_sol:', '');
      return { text: val, isCancelled: false };
    }
    if (data === 'copy:skip_label') {
      await update.answerCallbackQuery().catch(() => {});
      return { text: 'skip', isCancelled: false };
    }
    if (data === 'copy:mirror:yes') {
      await update.answerCallbackQuery().catch(() => {});
      return { text: 'yes', isCancelled: false };
    }
    if (data === 'copy:mirror:no') {
      await update.answerCallbackQuery().catch(() => {});
      return { text: 'no', isCancelled: false };
    }
    if (
      data.startsWith('menu:') ||
      data.startsWith('token:') ||
      data.startsWith('wallet:') ||
      data.startsWith('orders:') ||
      data.startsWith('order:') ||
      data.startsWith('copy:cancel') ||
      data === 'cancel'
    ) {
      await update.answerCallbackQuery().catch(() => {});
      return { isCancelled: true };
    }
  }

  // If user sent a text message
  if (update.message?.text) {
    const text = update.message.text.trim();
    if (text === '/cancel' || text.toLowerCase() === 'cancel' || text.includes('Cancel')) {
      return { isCancelled: true };
    }
    return { text, isCancelled: false };
  }

  return { isCancelled: true };
}

/**
 * Conversation: Add Wallet via Private Key or Seed Phrase
 */
export async function addWalletConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const lang = getUserLanguage(userId);
  const t = getT(lang);

  const promptMsg = await ctx.reply(t.prompt_add_wallet, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:security'),
  });

  const inputRes = await waitForInputOrCancel(conversation, ctx);
  if (inputRes.isCancelled || !inputRes.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const input = inputRes.text;

  // Delete sensitive message immediately
  try {
    await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
  } catch {}

  try {
    const imported = importWalletAuto(input);
    const pubkey = imported.publicKey;
    // Store in DB
    addWallet(userId, pubkey, input, imported.mnemonic);

    const balance = await getSolBalance(pubkey);

    await ctx.reply(t.add_wallet_success(pubkey, balance), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text(t.btn_trade, 'menu:trade')
        .row()
        .text(t.btn_security, 'menu:security'),
    });
  } catch (error: any) {
    await ctx.reply(t.add_wallet_failed(error.message), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_try_again, 'wallet:add').text(t.btn_back_security, 'menu:security'),
    });
  }
}

/**
 * Conversation: Prompt for Solana Token Contract Address
 */
export async function tradeInputConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const lang = getUserLanguage(userId);
  const t = getT(lang);

  const promptMsg = await ctx.reply(t.prompt_trade_input, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:main'),
  });

  const inputRes = await waitForInputOrCancel(conversation, ctx);
  if (inputRes.isCancelled || !inputRes.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const ca = inputRes.text;

  if (!isValidSolanaAddress(ca)) {
    await ctx.reply(`❌ *Invalid Solana Contract Address (CA)!*`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_try_again, 'menu:trade').text(t.btn_back_main, 'menu:main'),
    });
    return;
  }

  const activeWallet = getActiveWallet(userId);
  const [token, solBalance, tokenBalance] = await Promise.all([
    fetchTokenInfo(ca),
    activeWallet ? getSolBalance(activeWallet.publicKey) : Promise.resolve(0),
    activeWallet
      ? getTokenBalance(activeWallet.publicKey, ca)
      : Promise.resolve({ uiAmount: 0, decimals: 0, amount: '0' }),
  ]);

  if (!token) {
    await ctx.reply(`❌ *Token not found on Solana Network!*\nPlease verify the contract address and try again.`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_try_again, 'menu:trade'),
    });
    return;
  }

  setUserTradeState(userId, { targetTokenAddress: ca });

  const position = getUserTokenPosition(userId, ca, activeWallet?.publicKey);
  const messageText = getTokenDashboardMessage(token, activeWallet, solBalance, tokenBalance, lang, position);
  const keyboard = getTokenTradeKeyboard(token.address, token.url, lang);

  await ctx.reply(messageText, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
    link_preview_options: { is_disabled: true },
  });
}

/**
 * Conversation: Custom Buy Amount (SOL)
 */
export async function customBuyConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  let ca = extractTokenAddressFromContext(ctx);

  if (!userId) return;
  const lang = getUserLanguage(userId);
  const t = getT(lang);

  if (!ca) {
    const askMsg = await ctx.reply(t.prompt_trade_input, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:main'),
    });
    const resp = await waitForInputOrCancel(conversation, ctx);
    if (resp.isCancelled || !resp.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, askMsg.message_id);
      } catch {}
      return;
    }
    const inputCA = resp.text;
    if (isValidSolanaAddress(inputCA)) {
      ca = inputCA;
      setUserTradeState(userId, { targetTokenAddress: ca });
    } else {
      await ctx.reply(`❌ Invalid Token Address`, {
        reply_markup: new InlineKeyboard().text(t.btn_trade, 'menu:trade'),
      });
      return;
    }
  }

  const activeWallet = getActiveWallet(userId);
  const solBalance = activeWallet ? await getSolBalance(activeWallet.publicKey) : 0;
  const token = await fetchTokenInfo(ca);
  const symbol = token?.symbol || 'SOL';
  const price = token?.priceUsd || 0;

  const promptMsg = await ctx.reply(t.prompt_custom_buy(symbol, price, solBalance), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, `token:refresh:${ca}`),
  });

  const response = await waitForInputOrCancel(conversation, ctx);
  if (response.isCancelled || !response.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const amountStr = response.text;
  const solAmount = parseFloat(amountStr);

  if (isNaN(solAmount) || solAmount <= 0) {
    await ctx.reply(t.invalid_input_err, {
      reply_markup: new InlineKeyboard().text(t.btn_try_again, `buy:custom:${ca}`),
    });
    return;
  }

  // Trigger buy processing
  await executeBuyFlow(ctx, ca, solAmount);
}

/**
 * Conversation: Custom Sell Amount (Percentage 1-100%)
 */
export async function customSellConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  let ca = extractTokenAddressFromContext(ctx);

  if (!userId) return;
  const lang = getUserLanguage(userId);
  const t = getT(lang);

  if (!ca) {
    const askMsg = await ctx.reply(t.prompt_trade_input, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:main'),
    });
    const resp = await waitForInputOrCancel(conversation, ctx);
    if (resp.isCancelled || !resp.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, askMsg.message_id);
      } catch {}
      return;
    }
    const inputCA = resp.text;
    if (isValidSolanaAddress(inputCA)) {
      ca = inputCA;
      setUserTradeState(userId, { targetTokenAddress: ca });
    } else {
      await ctx.reply(`❌ Invalid Token Address`, {
        reply_markup: new InlineKeyboard().text(t.btn_trade, 'menu:trade'),
      });
      return;
    }
  }

  const activeWallet = getActiveWallet(userId);
  const tokenBal = activeWallet ? await getTokenBalance(activeWallet.publicKey, ca) : { uiAmount: 0 };
  const token = await fetchTokenInfo(ca);
  const symbol = token?.symbol || 'TOKEN';
  const price = token?.priceUsd || 0;

  const promptMsg = await ctx.reply(t.prompt_custom_sell(symbol, price, tokenBal.uiAmount), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, `token:refresh:${ca}`),
  });

  const response = await waitForInputOrCancel(conversation, ctx);
  if (response.isCancelled || !response.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const percentStr = response.text.replace('%', '');
  const percent = parseFloat(percentStr);

  if (isNaN(percent) || percent <= 0 || percent > 100) {
    await ctx.reply(t.invalid_input_err, {
      reply_markup: new InlineKeyboard().text(t.btn_try_again, `sell:custom:${ca}`),
    });
    return;
  }

  // Trigger sell processing
  await executeSellFlow(ctx, ca, percent);
}

/**
 * Execute Buy Swap Flow
 */
export async function executeBuyFlow(ctx: Context, tokenAddress: string, solAmount: number) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const lang = getUserLanguage(userId);
  const t = getT(lang);

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply(t.no_active_wallet_err, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_add_wallet, 'wallet:add'),
    });
    return;
  }

  const solBalance = await getSolBalance(activeWallet.publicKey);
  const SAFETY_BUFFER_SOL = 0.008; // Gas + Priority Fee + Token ATA Rent Reserve
  if (solBalance < solAmount + SAFETY_BUFFER_SOL) {
    const maxAffordable = Math.max(0, parseFloat((solBalance - SAFETY_BUFFER_SOL).toFixed(4)));
    await ctx.reply(
      `*Insufficient SOL for Network Fees!*\n\n` +
      `Your balance: *${solBalance.toFixed(4)} SOL*\n` +
      `Requested Buy: *${solAmount} SOL*\n` +
      `Required Gas/Rent Buffer: *${SAFETY_BUFFER_SOL} SOL*\n\n` +
      `Recommended Max Buy: *${maxAffordable} SOL*`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text(t.btn_refresh, `token:refresh:${tokenAddress}`),
      }
    );
    return;
  }

  const settings = getUserSettings(userId);
  const slippageBps = settings.slippage_bps || 500;
  const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

  const token = await fetchTokenInfo(tokenAddress);
  const symbol = token?.symbol || 'SOL';

  const statusMsg = await ctx.reply(t.swap_swapping(symbol, `${solAmount} SOL`), {
    parse_mode: 'Markdown',
  });

  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  const quote = await getJupiterQuote(CONFIG.WSOL_MINT, tokenAddress, lamports, slippageBps);

  if (!quote) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ *Jupiter Swap Quote Unavailable!*\nNo route or insufficient liquidity found.`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
      }
    );
    return;
  }

  const outEstimate = (parseInt(quote.outAmount) / 1e6).toFixed(2);

  try {
    const imported = importWalletAuto(activeWallet.privateKey);
    const swapResult = await executeJupiterSwap(imported.keypair, quote, {
      priorityFeeLamports,
      slippageBps,
    });

    if (swapResult.success && swapResult.signature) {
      const decimals = token?.decimals || 6;
      const boughtAmountTokens = parseInt(quote.outAmount) / 10 ** decimals;
      const solPriceUsd = await getSolPriceUsd();
      const executedPriceUsd = boughtAmountTokens > 0 ? (solAmount * solPriceUsd) / boughtAmountTokens : (token?.priceUsd || 0);
      const executedMc = token?.priceUsd && token.priceUsd > 0
        ? (executedPriceUsd / token.priceUsd) * (token.marketCap || 0)
        : (token?.marketCap || 0);

      recordTrade({
        userId,
        walletAddress: activeWallet.publicKey,
        tokenAddress,
        tokenSymbol: symbol,
        tradeType: 'BUY',
        amountSol: solAmount,
        tokenAmount: boughtAmountTokens,
        priceUsd: executedPriceUsd,
        marketCapUsd: executedMc,
        txSignature: swapResult.signature,
      });

      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        t.swap_success(symbol, token?.priceUsd || 0, `${solAmount} SOL`, outEstimate, swapResult.signature),
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .url(t.btn_view_solscan, `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🖼️ Share PnL Card', `token:pnl:${tokenAddress}`)
            .text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
        }
      );
    } else {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        t.swap_failed(symbol, swapResult.error || 'Transaction failed'),
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
        }
      );
    }
  } catch (err: any) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      t.swap_failed(symbol, err.message),
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
      }
    );
  }
}

/**
 * Execute Sell Swap Flow
 */
export async function executeSellFlow(ctx: Context, tokenAddress: string, percent: number) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const lang = getUserLanguage(userId);
  const t = getT(lang);

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply(t.no_active_wallet_err, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_add_wallet, 'wallet:add'),
    });
    return;
  }

  const token = await fetchTokenInfo(tokenAddress);
  const symbol = token?.symbol || 'TOKEN';

  const tokenBal = await getTokenBalance(activeWallet.publicKey, tokenAddress);
  if (tokenBal.uiAmount <= 0) {
    await ctx.reply(t.insufficient_token_err(symbol), {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
    });
    return;
  }

  const rawAmountToSell = (BigInt(tokenBal.amount) * BigInt(Math.floor(percent))) / BigInt(100);
  if (rawAmountToSell <= 0n) {
    await ctx.reply('❌ Sell amount too small to execute.');
    return;
  }

  const settings = getUserSettings(userId);
  const slippageBps = settings.slippage_bps || 500;
  const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

  const statusMsg = await ctx.reply(t.swap_swapping(symbol, `${percent}% (~${(tokenBal.uiAmount * (percent / 100)).toFixed(2)} tokens)`), {
    parse_mode: 'Markdown',
  });

  const quote = await getJupiterQuote(tokenAddress, CONFIG.WSOL_MINT, rawAmountToSell.toString(), slippageBps);

  if (!quote) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ *Jupiter Quote Unavailable!*\nInsufficient liquidity.`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
      }
    );
    return;
  }

  const outSol = (parseInt(quote.outAmount) / LAMPORTS_PER_SOL).toFixed(4);

  try {
    const imported = importWalletAuto(activeWallet.privateKey);
    const swapResult = await executeJupiterSwap(imported.keypair, quote, {
      priorityFeeLamports,
      slippageBps,
    });

    if (swapResult.success && swapResult.signature) {
      const soldAmountTokens = tokenBal.uiAmount * (percent / 100);
      const outSolNum = parseFloat(outSol) || 0;
      const solPriceUsd = await getSolPriceUsd();
      const executedPriceUsd = soldAmountTokens > 0 ? (outSolNum * solPriceUsd) / soldAmountTokens : (token?.priceUsd || 0);
      const executedMc = token?.priceUsd && token.priceUsd > 0
        ? (executedPriceUsd / token.priceUsd) * (token.marketCap || 0)
        : (token?.marketCap || 0);

      recordTrade({
        userId,
        walletAddress: activeWallet.publicKey,
        tokenAddress,
        tokenSymbol: symbol,
        tradeType: 'SELL',
        amountSol: outSolNum,
        tokenAmount: soldAmountTokens,
        priceUsd: executedPriceUsd,
        marketCapUsd: executedMc,
        txSignature: swapResult.signature,
      });

      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        t.swap_success(symbol, token?.priceUsd || 0, `${percent}%`, `${outSol} SOL`, swapResult.signature),
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .url(t.btn_view_solscan, `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🖼️ Share PnL Card', `token:pnl:${tokenAddress}`)
            .text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
        }
      );
    } else {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        t.swap_failed(symbol, swapResult.error || 'Transaction failed'),
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
        }
      );
    }
  } catch (err: any) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      t.swap_failed(symbol, err.message),
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text(t.btn_trade_dashboard, `token:refresh:${tokenAddress}`),
      }
    );
  }
}

/**
 * Conversation: Limit Buy Order Setup (Supports Custom Dip % and Custom USD Price)
 */
export async function limitBuyConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  let ca = extractTokenAddressFromContext(ctx);

  if (!userId) return;
  const lang = getUserLanguage(userId);
  const t = getT(lang);

  if (!ca) {
    const askMsg = await ctx.reply(t.prompt_trade_input, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:main'),
    });
    const resp = await waitForInputOrCancel(conversation, ctx);
    if (resp.isCancelled || !resp.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, askMsg.message_id);
      } catch {}
      return;
    }
    const inputCA = resp.text;
    if (isValidSolanaAddress(inputCA)) {
      ca = inputCA;
      setUserTradeState(userId, { targetTokenAddress: ca });
    } else {
      await ctx.reply('❌ Invalid Solana CA.', {
        reply_markup: new InlineKeyboard().text(t.btn_trade, 'menu:trade'),
      });
      return;
    }
  }

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply(t.no_active_wallet_err, {
      reply_markup: new InlineKeyboard().text(t.btn_add_wallet, 'wallet:add'),
    });
    return;
  }

  const token = await fetchTokenInfo(ca);
  const symbol = token?.symbol || 'SOL';
  const currentPrice = token?.priceUsd || 0;
  const state = getUserTradeState(userId);
  let targetPriceUsd = state?.targetPriceUsd || (ctx as any).session?.targetPriceUsd;

  if (!targetPriceUsd) {
    const promptText =
      state?.customMode === 'custom_dip'
        ? t.prompt_custom_dip_pct(symbol, currentPrice)
        : t.prompt_limit_buy_price(symbol, currentPrice);

    const pricePrompt = await ctx.reply(promptText, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_cancel, `token:refresh:${ca}`),
    });

    const priceRes = await waitForInputOrCancel(conversation, ctx);
    if (priceRes.isCancelled || !priceRes.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, pricePrompt.message_id);
      } catch {}
      return;
    }
    const priceText = priceRes.text.trim();

    // If input is e.g. "15", "15%", "-15%" when in custom_dip mode or when it has % or -
    if (state?.customMode === 'custom_dip' || priceText.endsWith('%') || priceText.startsWith('-')) {
      const dipPct = Math.abs(parseFloat(priceText.replace('%', '').replace('-', '')));
      if (isNaN(dipPct) || dipPct <= 0 || dipPct >= 100) {
        await ctx.reply(t.invalid_input_err);
        return;
      }
      targetPriceUsd = currentPrice * (1 - dipPct / 100);
    } else {
      targetPriceUsd = parseFloat(priceText);
      if (isNaN(targetPriceUsd) || targetPriceUsd <= 0) {
        await ctx.reply(t.invalid_input_err);
        return;
      }
    }
  }

  const solBal = await getSolBalance(activeWallet.publicKey);
  const amountPrompt = await ctx.reply(t.prompt_limit_buy_amount(symbol, targetPriceUsd, solBal), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, `token:refresh:${ca}`),
  });

  const amountRes = await waitForInputOrCancel(conversation, ctx);
  if (amountRes.isCancelled || !amountRes.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, amountPrompt.message_id);
    } catch {}
    return;
  }
  const solAmount = parseFloat(amountRes.text);

  if (isNaN(solAmount) || solAmount <= 0) {
    await ctx.reply(t.invalid_input_err);
    return;
  }

  // Create Order in DB
  const order = createLimitOrder({
    userId,
    walletAddress: activeWallet.publicKey,
    tokenAddress: ca,
    tokenSymbol: symbol,
    orderType: 'BUY_LIMIT',
    targetPriceUsd,
    condition: 'LTE',
    amountSol: solAmount,
  });

  await ctx.reply(t.limit_order_created('BUY LIMIT (Dip)', symbol, targetPriceUsd, `${solAmount} SOL`), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text(t.btn_orders, 'menu:orders')
      .row()
      .text(t.btn_trade_dashboard, `token:refresh:${ca}`),
  });
}

/**
 * Conversation: Limit Sell Order Setup (Supports Custom TP/SL % and Custom USD Price)
 */
export async function limitSellConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  let ca = extractTokenAddressFromContext(ctx);

  if (!userId) return;
  const lang = getUserLanguage(userId);
  const t = getT(lang);

  if (!ca) {
    const askMsg = await ctx.reply(t.prompt_trade_input, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:main'),
    });
    const resp = await waitForInputOrCancel(conversation, ctx);
    if (resp.isCancelled || !resp.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, askMsg.message_id);
      } catch {}
      return;
    }
    const inputCA = resp.text;
    if (isValidSolanaAddress(inputCA)) {
      ca = inputCA;
      setUserTradeState(userId, { targetTokenAddress: ca });
    } else {
      await ctx.reply('❌ Invalid Token CA.', {
        reply_markup: new InlineKeyboard().text(t.btn_trade, 'menu:trade'),
      });
      return;
    }
  }

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply(t.no_active_wallet_err, {
      reply_markup: new InlineKeyboard().text(t.btn_add_wallet, 'wallet:add'),
    });
    return;
  }

  const token = await fetchTokenInfo(ca);
  const symbol = token?.symbol || 'TOKEN';
  const currentPrice = token?.priceUsd || 0;
  const state = getUserTradeState(userId);
  let targetPriceUsd = state?.targetPriceUsd || (ctx as any).session?.targetPriceUsd;
  let condition: 'LTE' | 'GTE' = state?.targetCondition || (ctx as any).session?.targetCondition || 'GTE';

  if (!targetPriceUsd) {
    const promptText =
      state?.customMode === 'custom_pct'
        ? t.prompt_custom_tpsl_pct(symbol, currentPrice)
        : t.prompt_limit_sell_price(symbol, currentPrice, true);

    const pricePrompt = await ctx.reply(promptText, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text(t.btn_cancel, `token:refresh:${ca}`),
    });

    const priceRes = await waitForInputOrCancel(conversation, ctx);
    if (priceRes.isCancelled || !priceRes.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, pricePrompt.message_id);
      } catch {}
      return;
    }
    const priceText = priceRes.text.trim();

    if (
      state?.customMode === 'custom_pct' ||
      priceText.endsWith('%') ||
      priceText.startsWith('+') ||
      priceText.startsWith('-')
    ) {
      const rawPct = parseFloat(priceText.replace('%', '').replace('+', ''));
      if (isNaN(rawPct) || rawPct === 0) {
        await ctx.reply(t.invalid_input_err);
        return;
      }
      targetPriceUsd = currentPrice * (1 + rawPct / 100);
      condition = rawPct > 0 ? 'GTE' : 'LTE';
    } else {
      targetPriceUsd = parseFloat(priceText);
      if (isNaN(targetPriceUsd) || targetPriceUsd <= 0) {
        await ctx.reply(t.invalid_input_err);
        return;
      }
      condition = targetPriceUsd >= currentPrice ? 'GTE' : 'LTE';
    }
  }

  const tokenBal = await getTokenBalance(activeWallet.publicKey, ca);
  const isTP = condition === 'GTE';
  const amountPrompt = await ctx.reply(t.prompt_limit_sell_amount(symbol, targetPriceUsd, tokenBal.uiAmount, isTP), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, `token:refresh:${ca}`),
  });

  const amountRes = await waitForInputOrCancel(conversation, ctx);
  if (amountRes.isCancelled || !amountRes.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, amountPrompt.message_id);
    } catch {}
    return;
  }
  const percentStr = amountRes.text.replace('%', '');
  const percent = parseFloat(percentStr);

  if (isNaN(percent) || percent <= 0 || percent > 100) {
    await ctx.reply(t.invalid_input_err);
    return;
  }

  // Create Order in DB
  const order = createLimitOrder({
    userId,
    walletAddress: activeWallet.publicKey,
    tokenAddress: ca,
    tokenSymbol: symbol,
    orderType: 'SELL_LIMIT',
    targetPriceUsd,
    condition,
    amountPercent: percent,
  });

  await ctx.reply(
    t.limit_order_created(isTP ? 'TAKE PROFIT (TP)' : 'STOP LOSS (SL)', symbol, targetPriceUsd, `${percent}%`),
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text(t.btn_orders, 'menu:orders')
        .row()
        .text(t.btn_trade_dashboard, `token:refresh:${ca}`),
    }
  );
}

/**
 * Conversation: Edit Order Target Price
 */
export async function editOrderPriceConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const lang = getUserLanguage(userId);
  const t = getT(lang);

  const state = getUserTradeState(userId);
  const orderId = state?.editingOrderId;

  if (!orderId) {
    await ctx.reply('❌ Order not found.', {
      reply_markup: new InlineKeyboard().text(t.btn_orders, 'menu:orders'),
    });
    return;
  }

  const order = getLimitOrderById(userId, orderId);
  if (!order || order.status !== 'PENDING') {
    await ctx.reply('❌ Order is no longer pending or has been removed.', {
      reply_markup: new InlineKeyboard().text(t.btn_orders, 'menu:orders'),
    });
    return;
  }

  const token = await fetchTokenInfo(order.token_address);
  const currentPrice = token?.priceUsd || order.target_price_usd;

  const promptMsg = await ctx.reply(t.prompt_edit_price(order.id, order.target_price_usd), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text(t.btn_cancel, `order:view:${order.id}`)
      .row()
      .text(t.btn_back_orders, 'menu:orders'),
  });

  const res = await waitForInputOrCancel(conversation, ctx);
  if (res.isCancelled || !res.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const priceText = res.text.trim();
  let targetPriceUsd: number;
  let condition: 'LTE' | 'GTE';

  if (priceText.endsWith('%') || priceText.startsWith('+') || priceText.startsWith('-')) {
    const rawPct = parseFloat(priceText.replace('%', '').replace('+', ''));
    if (isNaN(rawPct) || rawPct === 0) {
      await ctx.reply(t.invalid_input_err);
      return;
    }
    targetPriceUsd = currentPrice * (1 + rawPct / 100);
    condition = order.order_type === 'BUY_LIMIT' ? 'LTE' : (rawPct > 0 ? 'GTE' : 'LTE');
  } else {
    targetPriceUsd = parseFloat(priceText);
    if (isNaN(targetPriceUsd) || targetPriceUsd <= 0) {
      await ctx.reply(t.invalid_input_err);
      return;
    }
    condition = order.order_type === 'BUY_LIMIT' ? 'LTE' : (targetPriceUsd >= currentPrice ? 'GTE' : 'LTE');
  }

  updateLimitOrderDetails(userId, order.id, { targetPriceUsd, condition });
  const updatedOrder = getLimitOrderById(userId, order.id);
  if (!updatedOrder) return;

  await ctx.reply(t.order_updated, {
    parse_mode: 'Markdown',
    reply_markup: getOrderDetailKeyboard(updatedOrder, lang),
  });
}

/**
 * Conversation: Edit Order Amount
 */
export async function editOrderAmountConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const lang = getUserLanguage(userId);
  const t = getT(lang);

  const state = getUserTradeState(userId);
  const orderId = state?.editingOrderId;

  if (!orderId) {
    await ctx.reply('❌ Order not found.', {
      reply_markup: new InlineKeyboard().text(t.btn_orders, 'menu:orders'),
    });
    return;
  }

  const order = getLimitOrderById(userId, orderId);
  if (!order || order.status !== 'PENDING') {
    await ctx.reply('❌ Order is no longer pending or has been removed.', {
      reply_markup: new InlineKeyboard().text(t.btn_orders, 'menu:orders'),
    });
    return;
  }

  const currentAmt = order.order_type === 'BUY_LIMIT' ? `${order.amount_sol} SOL` : `${order.amount_percent}%`;
  const promptMsg = await ctx.reply(t.prompt_edit_amount(order.id, currentAmt), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text(t.btn_cancel, `order:view:${order.id}`)
      .row()
      .text(t.btn_back_orders, 'menu:orders'),
  });

  const res = await waitForInputOrCancel(conversation, ctx);
  if (res.isCancelled || !res.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  if (order.order_type === 'BUY_LIMIT') {
    const sol = parseFloat(res.text.trim());
    if (isNaN(sol) || sol <= 0) {
      await ctx.reply(t.invalid_input_err);
      return;
    }
    updateLimitOrderDetails(userId, order.id, { amountSol: sol });
  } else {
    const pct = parseFloat(res.text.trim().replace('%', ''));
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      await ctx.reply(t.invalid_input_err);
      return;
    }
    updateLimitOrderDetails(userId, order.id, { amountPercent: pct });
  }

  const updatedOrder = getLimitOrderById(userId, order.id);
  if (!updatedOrder) return;

  await ctx.reply(t.order_updated, {
    parse_mode: 'Markdown',
    reply_markup: getOrderDetailKeyboard(updatedOrder, lang),
  });
}

/**
 * Conversation: Custom Slippage Input
 */
export async function customSlippageConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userLang = getUserLanguage(userId);
  const t = getT(userLang);
  const settings = getUserSettings(userId);

  const promptMsg = await ctx.reply(t.prompt_custom_slippage(settings.slippage_bps / 100), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:settings'),
  });

  const res = await waitForInputOrCancel(conversation, ctx);
  if (res.isCancelled || !res.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const slip = parseFloat(res.text.trim().replace('%', ''));
  if (isNaN(slip) || slip <= 0 || slip > 50) {
    await ctx.reply(t.invalid_input_err);
    return;
  }

  const bps = Math.round(slip * 100);
  updateUserSettings(userId, bps);
  const updatedSettings = getUserSettings(userId);

  await ctx.reply(
    `${t.slippage_updated(slip)}\n\n` + getSettingsMessage(updatedSettings, userLang),
    {
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(updatedSettings, userLang),
    }
  );
}

/**
 * Add Copy Trading Target Wallet Conversation
 */
export async function addCopyTargetConversation(
  conversation: MyConversation,
  ctx: MyContext
): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userLang = getUserLanguage(userId);
  const t = getT(userLang);

  // Step 1: Target Wallet Address
  const promptMsg1 = await ctx.reply(t.prompt_copy_target_wallet, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text(t.btn_cancel, 'menu:copy'),
  });

  const res1 = await waitForInputOrCancel(conversation, ctx);
  if (res1.isCancelled || !res1.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg1.message_id);
    } catch {}
    return;
  }

  const targetWallet = res1.text.trim();
  if (!isValidSolanaAddress(targetWallet)) {
    await ctx.reply('❌ Invalid Solana Wallet Address. Please enter a valid base58 Solana address.', {
      reply_markup: new InlineKeyboard().text(t.btn_try_again, 'copy:add').text(t.btn_cancel, 'menu:copy'),
    });
    return;
  }

  // Step 2: Label / Nickname
  const labelPromptText =
    `🏷️ *Enter a Label / Nickname for this Wallet:*\n\n` +
    `Address: \`${formatAddress(targetWallet, 6)}\`\n\n` +
    `_Type a name (e.g. "Solana Whale #1", "Alpha Degen") or click Skip:_`;

  const promptLabelMsg = await ctx.reply(labelPromptText, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard().text('⏩ Skip', 'copy:skip_label').row().text(t.btn_cancel, 'menu:copy'),
  });

  const resLabel = await waitForInputOrCancel(conversation, ctx);
  let label: string | null = null;
  if (!resLabel.isCancelled && resLabel.text && resLabel.text.toLowerCase() !== 'skip') {
    label = resLabel.text.trim();
  }

  // Step 3: SOL Buy Amount
  const promptMsg2 = await ctx.reply(t.prompt_copy_buy_sol(targetWallet), {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('0.1 SOL', 'copy:preset_sol:0.1')
      .text('0.5 SOL', 'copy:preset_sol:0.5')
      .text('1.0 SOL', 'copy:preset_sol:1.0')
      .row()
      .text(t.btn_cancel, 'menu:copy'),
  });

  const res2 = await waitForInputOrCancel(conversation, ctx);
  if (res2.isCancelled || !res2.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg2.message_id);
    } catch {}
    return;
  }

  const solAmount = parseFloat(res2.text.trim());
  if (isNaN(solAmount) || solAmount <= 0) {
    await ctx.reply(t.invalid_input_err);
    return;
  }

  // Step 4: Mirror Sell preference
  const promptMsg3 = await ctx.reply(t.prompt_copy_mirror_sell(targetWallet), {
    parse_mode: 'Markdown',
    reply_markup: getCopyMirrorChoiceKeyboard(userLang),
  });

  let mirrorSell = 1;
  const res3 = await waitForInputOrCancel(conversation, ctx);
  if (!res3.isCancelled && res3.text) {
    const txt = res3.text.toLowerCase();
    if (txt.includes('no') || txt === '0' || txt === 'off' || txt === 'false') {
      mirrorSell = 0;
    }
  }

  // Save to DB (bind to current active wallet)
  const currentActiveWallet = getActiveWallet(userId);
  addCopyTarget(
    userId,
    targetWallet,
    label,
    solAmount,
    mirrorSell,
    500,
    'FIXED',
    10,
    1.0,
    currentActiveWallet?.publicKey || null
  );

  const allTargets = getUserCopyTargets(userId);
  await ctx.reply(
    `${t.copy_target_added(targetWallet, solAmount, mirrorSell === 1)}\n\n` +
      getCopyMenuMessage(allTargets, userLang),
    {
      parse_mode: 'Markdown',
      reply_markup: getCopyMenuKeyboard(allTargets, userLang),
    }
  );
}

