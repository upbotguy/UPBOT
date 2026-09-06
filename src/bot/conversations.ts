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
import { fetchTokenInfo, formatCurrency } from '../services/token.js';
import {
  getTokenDashboardMessage,
  getOrderDetailMessage,
  getOrdersListMessage,
  getSettingsMessage,
} from './messages.js';
import {
  getTokenTradeKeyboard,
  getOrderDetailKeyboard,
  getOrdersKeyboard,
  getSettingsKeyboard,
} from './keyboards.js';
import { executeJupiterSwap, getJupiterQuote } from '../services/swap.js';
import { CONFIG } from '../config.js';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export interface SessionData {
  targetTokenAddress: string;
  targetPriceUsd?: number;
  targetCondition?: 'LTE' | 'GTE';
  presetDipPercent?: number;
  presetGainPercent?: number;
  editingOrderId?: number;
}

export interface UserTradeState {
  targetTokenAddress: string;
  targetPriceUsd?: number;
  targetCondition?: 'LTE' | 'GTE';
  editingOrderId?: number;
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

  // 3. Check SQLite DB
  if (userId) {
    const dbCA = getUserActiveTokenDB(userId);
    if (dbCA && isValidSolanaAddress(dbCA)) {
      setUserTradeState(userId, { targetTokenAddress: dbCA });
      return dbCA;
    }
  }

  // 4. Check message text / callbackQuery message text for Solana Base58 address
  const text = ctx.callbackQuery?.message?.text || ctx.msg?.text || '';
  if (text) {
    const matches = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
    if (matches) {
      for (const candidate of matches) {
        if (isValidSolanaAddress(candidate)) {
          if (userId) {
            setUserTradeState(userId, { targetTokenAddress: candidate });
          }
          return candidate;
        }
      }
    }
  }

  return null;
}

export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor<Context & SessionFlavor<SessionData>>;
export type MyConversation = Conversation<MyContext, MyContext>;

/**
 * Robust input waiter that cleanly handles text messages, Cancel buttons, and callback queries
 */
async function waitForInputOrCancel(
  conversation: MyConversation,
  ctx: MyContext
): Promise<{ text?: string; isCancelled: boolean }> {
  const update = await conversation.wait();

  // If user clicked any inline button (e.g. ❌ Cancel or Menu)
  if (update.callbackQuery) {
    update.answerCallbackQuery({ text: '❌ Cancelled' }).catch(() => {});
    return { isCancelled: true };
  }

  // If user sent a text message
  if (update.message?.text) {
    const text = update.message.text.trim();
    if (text === '/cancel' || text.toLowerCase() === 'cancel' || text === '❌ Cancel') {
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

  const promptMsg = await ctx.reply(
    `🔐 *Solana Wallet ချိတ်ဆက်ခြင်း (Add Wallet)*\n\n` +
      `သင်၏ Solana *Private Key (Base58 string)* သို့မဟုတ် *12/24 words Seed Phrase* ကို ပို့ပေးပါခင်ဗျာ။\n\n` +
      `⚠️ _မှတ်ချက်: လုံခြုံရေးအရ သင်ပို့လိုက်သော message ကို Bot မှ ချက်ချင်း အလိုအလျောက် ဖျက်ပေးပါမည်။_`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', 'menu:security'),
    }
  );

  const inputRes = await waitForInputOrCancel(conversation, ctx);
  if (inputRes.isCancelled || !inputRes.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const input = inputRes.text;

  // Try to delete sensitive message immediately
  try {
    await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
  } catch (err) {
    // ignore
  }

  try {
    const imported = importWalletAuto(input);
    const pubkey = imported.publicKey;
    // Store in DB
    addWallet(userId, pubkey, input, imported.mnemonic);

    const balance = await getSolBalance(pubkey);

    await ctx.reply(
      `✅ *Wallet ချိတ်ဆက်မှု အောင်မြင်ပါသည်!* 🎉\n\n` +
        `💳 *Public Address:* \`${pubkey}\`\n` +
        `💰 *SOL Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
        `အဆိုပါ Wallet ကို Active Wallet အဖြစ် သတ်မှတ်ပြီးပါပြီ။`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('🎯 Start Trading', 'menu:trade')
          .row()
          .text('🔐 Security Menu', 'menu:security'),
      }
    );
  } catch (error: any) {
    await ctx.reply(
      `❌ *Wallet ချိတ်ဆက်မှု မအောင်မြင်ပါ!*\n\n` +
        `Error: \`${error.message || 'Invalid Private Key or Seed Phrase'}\`\n\n` +
        `မှန်ကန်သော Base58 Private key သို့မဟုတ် 12/24 words seed phrase ဖြစ်ကြောင်း ပြန်လည်စစ်ဆေးပေးပါ။`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔄 Try Again', 'wallet:add').text('🔙 Security', 'menu:security'),
      }
    );
  }
}

/**
 * Conversation: Prompt for Solana Token Contract Address
 */
export async function tradeInputConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const promptMsg = await ctx.reply(
    `🎯 *Solana Token Trading*\n\n` +
      `သင် အရောင်းအဝယ် ပြုလုပ်လိုသော Solana Token ၏ *Contract Address (Mint Address)* ကို ပို့ပေးပါခင်ဗျာ။\n\n` +
      `ဥပမာ: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', 'menu:main'),
    }
  );

  const inputRes = await waitForInputOrCancel(conversation, ctx);
  if (inputRes.isCancelled || !inputRes.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const ca = inputRes.text;

  if (!isValidSolanaAddress(ca)) {
    await ctx.reply(`❌ *မမှန်ကန်သော Solana Address ဖြစ်နေပါသည်!*\nကျေးဇူးပြု၍ မှန်ကန်သော CA ပို့ပေးပါ။`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('🔄 Try Again', 'menu:trade').text('🔙 Main Menu', 'menu:main'),
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
    await ctx.reply(`❌ *Token အချက်အလက် ရှာမတွေ့ပါ!*\nContract Address ကို ပြန်လည်စစ်ဆေးပေးပါ။`, {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('🔄 Try Again', 'menu:trade'),
    });
    return;
  }

  setUserTradeState(userId, { targetTokenAddress: ca });

  const messageText = getTokenDashboardMessage(token, activeWallet, solBalance, tokenBalance);
  const keyboard = getTokenTradeKeyboard(token.address, token.url);

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

  if (!ca) {
    const askMsg = await ctx.reply(
      `🎯 *Token Contract Address (CA) ထည့်သွင်းပါ*\n\n` +
        `ဝယ်ယူလိုသော Solana Token ၏ *Contract Address (CA)* ကို ပို့ပေးပါခင်ဗျာ:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Main Menu', 'menu:main'),
      }
    );
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
      await ctx.reply('❌ မမှန်ကန်သော Token CA ဖြစ်ပါသည်။', {
        reply_markup: new InlineKeyboard().text('🎯 Trade', 'menu:trade'),
      });
      return;
    }
  }

  const promptMsg = await ctx.reply(
    `🟢 *Custom Buy Token*\n\n` +
      `🪙 *Token:* \`${ca}\`\n\n` +
      `ဝယ်ယူလိုသော *SOL ပမာဏ* ကို ရိုက်ထည့်ပေးပါခင်ဗျာ။\n\n` +
      `ဥပမာ: \`0.05\` သို့မဟုတ် \`1.5\``,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', `token:refresh:${ca}`),
    }
  );

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
    await ctx.reply('❌ မမှန်ကန်သော ပမာဏဖြစ်ပါသည်။ နံပါတ် အမှန်ကိုသာ ထည့်ပေးပါ။', {
      reply_markup: new InlineKeyboard().text('🔄 Try Again', `buy:custom:${ca}`),
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

  if (!ca) {
    const askMsg = await ctx.reply(
      `🎯 *Token Contract Address (CA) ထည့်သွင်းပါ*\n\n` +
        `ရောင်းချလိုသော Solana Token ၏ *Contract Address (CA)* ကို ပို့ပေးပါခင်ဗျာ:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Main Menu', 'menu:main'),
      }
    );
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
      await ctx.reply('❌ မမှန်ကန်သော Token CA ဖြစ်ပါသည်။', {
        reply_markup: new InlineKeyboard().text('🎯 Trade', 'menu:trade'),
      });
      return;
    }
  }

  const promptMsg = await ctx.reply(
    `🔴 *Custom Sell Token*\n\n` +
      `🪙 *Token:* \`${ca}\`\n\n` +
      `ရောင်းချလိုသော *ရာခိုင်နှုန်း (%)* ကို ရိုက်ထည့်ပေးပါ (1 မှ 100 အထိ)။\n\n` +
      `ဥပမာ: \`35\` သို့မဟုတ် \`80\``,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', `token:refresh:${ca}`),
    }
  );

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
    await ctx.reply('❌ မမှန်ကန်သော ရာခိုင်နှုန်းဖြစ်ပါသည်။ 1 မှ 100 ကြားသာ ထည့်ပေးပါ။', {
      reply_markup: new InlineKeyboard().text('🔄 Try Again', `sell:custom:${ca}`),
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

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply(
      '⚠️ *Active Wallet မရှိသေးပါ!*\nကျေးဇူးပြု၍ Security တွင် Wallet အရင်ထည့်သွင်းပေးပါ။',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('➕ Add Wallet', 'wallet:add'),
      }
    );
    return;
  }

  const solBalance = await getSolBalance(activeWallet.publicKey);
  if (solBalance < solAmount) {
    await ctx.reply(
      `❌ *လက်ကျန် SOL မလုံလောက်ပါ!*\n\n` +
        `💳 *Your Balance:* \`${solBalance.toFixed(4)} SOL\`\n` +
        `🛒 *Need:* \`${solAmount} SOL\` + Gas Fee\n\n` +
        `ကျေးဇူးပြု၍ \`${activeWallet.publicKey}\` သို့ SOL ဖြည့်သွင်းပါ။`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔄 Refresh Balance', `token:refresh:${tokenAddress}`),
      }
    );
    return;
  }

  const settings = getUserSettings(userId);
  const slippageBps = settings.slippage_bps || 500;
  const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

  const statusMsg = await ctx.reply(
    `⚡ *Jupiter Quote ရယူနေပါသည်...*\n` +
      `🛒 *Buying with:* \`${solAmount} SOL\`\n` +
      `🪙 *Token:* \`${tokenAddress}\`\n` +
      `⚡ *Slippage:* \`${slippageBps / 100}%\``,
    { parse_mode: 'Markdown' }
  );

  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  const quote = await getJupiterQuote(CONFIG.WSOL_MINT, tokenAddress, lamports, slippageBps);

  if (!quote) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ *Jupiter Quote မရရှိပါ!*\nLiquidity မလုံလောက်ခြင်း သို့မဟုတ် Token Pair မရှိခြင်း ဖြစ်နိုင်ပါသည်။`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Token Dashboard', `token:refresh:${tokenAddress}`),
      }
    );
    return;
  }

  const outEstimate = (parseInt(quote.outAmount) / 1e6).toFixed(2);

  await ctx.api.editMessageText(
    ctx.chat!.id,
    statusMsg.message_id,
    `🚀 *Transaction အား Solana Network သို့ Turbo ဖြင့် ပို့ဆောင်နေပါသည်...*\n\n` +
      `💰 *Pay:* \`${solAmount} SOL\`\n` +
      `📦 *Est. Receive:* ~\`${outEstimate}\` tokens\n` +
      `⚡ *Price Impact:* \`${quote.priceImpactPct}%\`\n` +
      `⛽ *Priority Mode:* \`Turbo (Very High)\``,
    { parse_mode: 'Markdown' }
  );

  try {
    const imported = importWalletAuto(activeWallet.privateKey);
    const swapResult = await executeJupiterSwap(imported.keypair, quote, {
      priorityFeeLamports,
      slippageBps,
    });

    if (swapResult.success && swapResult.signature) {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `✅ *ဝယ်ယူမှု အောင်မြင်ပါသည်!* 🎉\n\n` +
          `💰 *Amount:* \`${solAmount} SOL\`\n` +
          `🔗 *Solscan:* [View Transaction](https://solscan.io/tx/${swapResult.signature})`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .url('🔍 Solscan', `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🔄 Refresh Token', `token:refresh:${tokenAddress}`),
        }
      );
    } else {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `❌ *Transaction Failed:* \`${swapResult.error || 'Unknown error'}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('🔙 Token Dashboard', `token:refresh:${tokenAddress}`),
        }
      );
    }
  } catch (err: any) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ *Swap Error:* \`${err.message}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Token Dashboard', `token:refresh:${tokenAddress}`),
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

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply(
      '⚠️ *Active Wallet မရှိသေးပါ!*\nကျေးဇူးပြု၍ Security တွင် Wallet အရင်ထည့်သွင်းပေးပါ။',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('➕ Add Wallet', 'wallet:add'),
      }
    );
    return;
  }

  const tokenBal = await getTokenBalance(activeWallet.publicKey, tokenAddress);
  if (tokenBal.uiAmount <= 0) {
    await ctx.reply(
      `❌ *ရောင်းချရန် Token Balance မရှိပါ!*\n\n` +
        `Holding: \`0\` Token\n` +
        `Wallet: \`${formatAddress(activeWallet.publicKey)}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Token Dashboard', `token:refresh:${tokenAddress}`),
      }
    );
    return;
  }

  const rawAmountToSell = BigInt(tokenBal.amount) * BigInt(Math.floor(percent)) / BigInt(100);
  if (rawAmountToSell <= 0n) {
    await ctx.reply('❌ ရောင်းချမည့် ပမာဏ နည်းလွန်းနေပါသည်။');
    return;
  }

  const settings = getUserSettings(userId);
  const slippageBps = settings.slippage_bps || 500;
  const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

  const statusMsg = await ctx.reply(
    `⚡ *Jupiter Quote ရယူနေပါသည်...*\n` +
      `🔴 *Selling:* \`${percent}%\` (~${(tokenBal.uiAmount * (percent / 100)).toFixed(2)} tokens)\n` +
      `⚡ *Slippage:* \`${slippageBps / 100}%\``,
    { parse_mode: 'Markdown' }
  );

  const quote = await getJupiterQuote(tokenAddress, CONFIG.WSOL_MINT, rawAmountToSell.toString(), slippageBps);

  if (!quote) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ *Jupiter Quote မရရှိပါ!*\nLiquidity မလုံလောက်ခြင်း ဖြစ်နိုင်ပါသည်။`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Token Dashboard', `token:refresh:${tokenAddress}`),
      }
    );
    return;
  }

  const outSol = (parseInt(quote.outAmount) / LAMPORTS_PER_SOL).toFixed(4);

  await ctx.api.editMessageText(
    ctx.chat!.id,
    statusMsg.message_id,
    `🚀 *Transaction အား Solana Network သို့ Turbo ဖြင့် ပို့ဆောင်နေပါသည်...*\n\n` +
      `📦 *Selling:* \`${percent}%\`\n` +
      `💰 *Est. Receive:* ~\`${outSol} SOL\`\n` +
      `⚡ *Price Impact:* \`${quote.priceImpactPct}%\`\n` +
      `⛽ *Priority Mode:* \`Turbo (Very High)\``,
    { parse_mode: 'Markdown' }
  );

  try {
    const imported = importWalletAuto(activeWallet.privateKey);
    const swapResult = await executeJupiterSwap(imported.keypair, quote, {
      priorityFeeLamports,
      slippageBps,
    });

    if (swapResult.success && swapResult.signature) {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `✅ *ရောင်းချမှု အောင်မြင်ပါသည်!* 🎉\n\n` +
          `💰 *Received:* ~\`${outSol} SOL\`\n` +
          `🔗 *Solscan:* [View Transaction](https://solscan.io/tx/${swapResult.signature})`,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard()
            .url('🔍 Solscan', `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🔄 Refresh Token', `token:refresh:${tokenAddress}`),
        }
      );
    } else {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        statusMsg.message_id,
        `❌ *Transaction Failed:* \`${swapResult.error || 'Unknown error'}\``,
        {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().text('🔙 Token Dashboard', `token:refresh:${tokenAddress}`),
        }
      );
    }
  } catch (err: any) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      statusMsg.message_id,
      `❌ *Swap Error:* \`${err.message}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Token Dashboard', `token:refresh:${tokenAddress}`),
      }
    );
  }
}

/**
 * Conversation: Limit Buy Order Setup
 */
export async function limitBuyConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  let ca = extractTokenAddressFromContext(ctx);

  if (!userId) return;

  if (!ca) {
    const askMsg = await ctx.reply(
      `🎯 *Token Contract Address (CA) ထည့်သွင်းပါ*\n\n` +
        `Limit Buy တင်လိုသော Solana Token ၏ *Contract Address (CA)* ကို ပို့ပေးပါခင်ဗျာ:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Main Menu', 'menu:main'),
      }
    );
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
      await ctx.reply('❌ မမှန်ကန်သော Token CA ဖြစ်ပါသည်။', {
        reply_markup: new InlineKeyboard().text('🎯 Trade', 'menu:trade'),
      });
      return;
    }
  }

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply('⚠️ Limit Order မတင်မီ Security တွင် Wallet ချိတ်ဆက်ပေးပါ။', {
      reply_markup: new InlineKeyboard().text('➕ Add Wallet', 'wallet:add'),
    });
    return;
  }

  const token = await fetchTokenInfo(ca);
  const currentPrice = token?.priceUsd || 0;
  const state = getUserTradeState(userId);
  let targetPriceUsd = state?.targetPriceUsd || (ctx as any).session?.targetPriceUsd;

  // If custom target price not already calculated from preset, ask user
  if (!targetPriceUsd) {
    const pricePrompt = await ctx.reply(
      `⏱️ *Limit Buy Order သတ်မှတ်ခြင်း*\n\n` +
        `🪙 *Token:* $${token?.symbol || 'SOL'}\n` +
        `💵 *Current Price:* \`${formatCurrency(currentPrice)}\`\n\n` +
        `ဝယ်ယူလိုသော *Target Price (USD)* သို့မဟုတ် *Dip %* (ဥပမာ: \`0.000003\` သို့မဟုတ် \`-15%\`) ကို ရိုက်ထည့်ပေးပါ:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('❌ Cancel', `token:refresh:${ca}`),
      }
    );

    const priceRes = await waitForInputOrCancel(conversation, ctx);
    if (priceRes.isCancelled || !priceRes.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, pricePrompt.message_id);
      } catch {}
      return;
    }
    const priceText = priceRes.text;

    if (priceText.endsWith('%') || priceText.startsWith('-')) {
      const dipPct = Math.abs(parseFloat(priceText.replace('%', '').replace('-', '')));
      if (isNaN(dipPct) || dipPct <= 0 || dipPct >= 100) {
        await ctx.reply('❌ မမှန်ကန်သော Dip % ဖြစ်ပါသည်။');
        return;
      }
      targetPriceUsd = currentPrice * (1 - dipPct / 100);
    } else {
      targetPriceUsd = parseFloat(priceText);
      if (isNaN(targetPriceUsd) || targetPriceUsd <= 0) {
        await ctx.reply('❌ မမှန်ကန်သော စျေးနှုန်းဖြစ်ပါသည်။');
        return;
      }
    }
  }

  // Ask for SOL amount
  const amountPrompt = await ctx.reply(
    `💰 *ဝယ်ယူမည့် SOL ပမာဏ ထည့်ပါ*\n\n` +
      `Target Price: \`${formatCurrency(targetPriceUsd)}\` သို့ ကျဆင်းချိန်တွင် ဝယ်ယူမည့် *SOL ပမာဏ* ကို ရိုက်ထည့်ပေးပါ:\n\n` +
      `ဥပမာ: \`0.1\` သို့မဟုတ် \`0.5\``,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', `token:refresh:${ca}`),
    }
  );

  const amountRes = await waitForInputOrCancel(conversation, ctx);
  if (amountRes.isCancelled || !amountRes.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, amountPrompt.message_id);
    } catch {}
    return;
  }
  const solAmount = parseFloat(amountRes.text);

  if (isNaN(solAmount) || solAmount <= 0) {
    await ctx.reply('❌ မမှန်ကန်သော SOL ပမာဏဖြစ်ပါသည်။');
    return;
  }

  // Create Order in DB
  const order = createLimitOrder({
    userId,
    walletAddress: activeWallet.publicKey,
    tokenAddress: ca,
    tokenSymbol: token?.symbol || 'UNKNOWN',
    orderType: 'BUY_LIMIT',
    targetPriceUsd,
    condition: 'LTE',
    amountSol: solAmount,
  });

  await ctx.reply(
    `✅ *Limit Buy Order #${order.id} တင်ပြီးပါပြီ!* 🎯\n\n` +
      `🪙 *Token:* *$${order.token_symbol}*\n` +
      `💵 *Target Price:* \`${formatCurrency(order.target_price_usd)}\` (≤ Target တွင် ဝယ်မည်)\n` +
      `💰 *Buy Amount:* \`${solAmount} SOL\`\n` +
      `💳 *Wallet:* \`${formatAddress(activeWallet.publicKey)}\`\n` +
      `⚡ *Slippage:* \`5%\`\n\n` +
      `_စျေးနှုန်း Target သို့ ရောက်ရှိပါက Bot မှ အလိုအလျောက် ဝယ်ယူပြီး Notification ပို့ပေးပါမည်။_`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📋 View Orders', 'menu:orders')
        .row()
        .text('🎯 Trade Dashboard', `token:refresh:${ca}`),
    }
  );
}

/**
 * Conversation: Limit Sell Order Setup (Take Profit / Stop Loss)
 */
export async function limitSellConversation(conversation: MyConversation, ctx: MyContext) {
  const userId = ctx.from?.id;
  let ca = extractTokenAddressFromContext(ctx);

  if (!userId) return;

  if (!ca) {
    const askMsg = await ctx.reply(
      `🎯 *Token Contract Address (CA) ထည့်သွင်းပါ*\n\n` +
        `Limit Sell တင်လိုသော Solana Token ၏ *Contract Address (CA)* ကို ပို့ပေးပါခင်ဗျာ:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('🔙 Main Menu', 'menu:main'),
      }
    );
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
      await ctx.reply('❌ မမှန်ကန်သော Token CA ဖြစ်ပါသည်။', {
        reply_markup: new InlineKeyboard().text('🎯 Trade', 'menu:trade'),
      });
      return;
    }
  }

  const activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    await ctx.reply('⚠️ Limit Order မတင်မီ Security တွင် Wallet ချိတ်ဆက်ပေးပါ။', {
      reply_markup: new InlineKeyboard().text('➕ Add Wallet', 'wallet:add'),
    });
    return;
  }

  const token = await fetchTokenInfo(ca);
  const currentPrice = token?.priceUsd || 0;
  const state = getUserTradeState(userId);
  let targetPriceUsd = state?.targetPriceUsd || (ctx as any).session?.targetPriceUsd;
  let condition: 'LTE' | 'GTE' = state?.targetCondition || (ctx as any).session?.targetCondition || 'GTE';

  // If custom target price not already calculated, ask user
  if (!targetPriceUsd) {
    const pricePrompt = await ctx.reply(
      `⏱️ *Limit Sell (TP/SL) Order သတ်မှတ်ခြင်း*\n\n` +
        `🪙 *Token:* $${token?.symbol || 'SOL'}\n` +
        `💵 *Current Price:* \`${formatCurrency(currentPrice)}\`\n\n` +
        `ရောင်းချလိုသော *Target Price (USD)* သို့မဟုတ် *Gain % (+50%) / Stop Loss (-20%)* ကို ရိုက်ထည့်ပေးပါ:`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().text('❌ Cancel', `token:refresh:${ca}`),
      }
    );

    const priceRes = await waitForInputOrCancel(conversation, ctx);
    if (priceRes.isCancelled || !priceRes.text) {
      try {
        await ctx.api.deleteMessage(ctx.chat!.id, pricePrompt.message_id);
      } catch {}
      return;
    }
    const priceText = priceRes.text;

    if (priceText.endsWith('%') || priceText.startsWith('+') || priceText.startsWith('-')) {
      const rawPct = parseFloat(priceText.replace('%', '').replace('+', ''));
      if (isNaN(rawPct)) {
        await ctx.reply('❌ မမှန်ကန်သော % ဖြစ်ပါသည်။');
        return;
      }
      targetPriceUsd = currentPrice * (1 + rawPct / 100);
      condition = rawPct >= 0 ? 'GTE' : 'LTE';
    } else {
      targetPriceUsd = parseFloat(priceText);
      if (isNaN(targetPriceUsd) || targetPriceUsd <= 0) {
        await ctx.reply('❌ မမှန်ကန်သော စျေးနှုန်းဖြစ်ပါသည်။');
        return;
      }
      condition = targetPriceUsd >= currentPrice ? 'GTE' : 'LTE';
    }
  }

  // Ask for Sell %
  const amountPrompt = await ctx.reply(
    `📦 *ရောင်းချမည့် ပမာဏ ရာခိုင်နှုန်း (%)\n\n` +
      `Target Price: \`${formatCurrency(targetPriceUsd)}\` သို့ ရောက်ရှိချိန်တွင် ရောင်းမည့် *ရာခိုင်နှုန်း (%)* ကို ရိုက်ထည့်ပေးပါ (1 မှ 100 အထိ):\n\n` +
      `ဥပမာ: \`50\` သို့မဟုတ် \`100\``,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', `token:refresh:${ca}`),
    }
  );

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
    await ctx.reply('❌ မမှန်ကန်သော ရာခိုင်နှုန်းဖြစ်ပါသည်။ 1 မှ 100 ကြား ထည့်ပေးပါ။');
    return;
  }

  // Create Order in DB
  const order = createLimitOrder({
    userId,
    walletAddress: activeWallet.publicKey,
    tokenAddress: ca,
    tokenSymbol: token?.symbol || 'UNKNOWN',
    orderType: 'SELL_LIMIT',
    targetPriceUsd,
    condition,
    amountPercent: percent,
  });

  const orderTypeLabel = condition === 'GTE' ? 'Take Profit (TP)' : 'Stop Loss (SL)';

  await ctx.reply(
    `✅ *Limit Sell Order #${order.id} [${orderTypeLabel}] တင်ပြီးပါပြီ!* 🎯\n\n` +
      `🪙 *Token:* *$${order.token_symbol}*\n` +
      `💵 *Target Price:* \`${formatCurrency(order.target_price_usd)}\` (${condition === 'GTE' ? '≥ Target' : '≤ Target'} တွင် ရောင်းမည်)\n` +
      `📦 *Sell Amount:* \`${percent}%\`\n` +
      `💳 *Wallet:* \`${formatAddress(activeWallet.publicKey)}\`\n` +
      `⚡ *Slippage:* \`5%\`\n\n` +
      `_စျေးနှုန်း Target သို့ ရောက်ရှိပါက Bot မှ အလိုအလျောက် ရောင်းချပြီး Notification ပို့ပေးပါမည်။_`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('📋 View Orders', 'menu:orders')
        .row()
        .text('🎯 Trade Dashboard', `token:refresh:${ca}`),
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

  const state = getUserTradeState(userId);
  const orderId = state?.editingOrderId;

  if (!orderId) {
    await ctx.reply('❌ ပြင်ဆင်မည့် Order ကို ရှာမတွေ့ပါ။', {
      reply_markup: new InlineKeyboard().text('📋 All Orders', 'menu:orders'),
    });
    return;
  }

  const order = getLimitOrderById(userId, orderId);
  if (!order || order.status !== 'PENDING') {
    await ctx.reply('❌ ဤ Order သည် ပယ်ဖျက်ပြီး သို့မဟုတ် အလုပ်လုပ်ပြီးဖြစ်ပါသည်။', {
      reply_markup: new InlineKeyboard().text('📋 All Orders', 'menu:orders'),
    });
    return;
  }

  const token = await fetchTokenInfo(order.token_address);
  const currentPrice = token?.priceUsd || order.target_price_usd;

  const promptMsg = await ctx.reply(
    `✏️ *Edit Target Price - Order #${order.id}*\n\n` +
      `🪙 *Token:* $${order.token_symbol}\n` +
      `📊 *Current Price:* \`${formatCurrency(currentPrice)}\`\n` +
      `🎯 *Current Target:* \`${formatCurrency(order.target_price_usd)}\` (${order.condition})\n\n` +
      `ပြောင်းလဲလိုသော *Target Price (USD)* သို့မဟုတ် *% (Dip/Gain)* ကို ရိုက်ထည့်ပေးပါ:\n\n` +
      `ဥပမာ:\n` +
      `• တိုက်ရိုက် USD: \`0.005\`\n` +
      `• Dip / Gain %: \`-10%\` သို့မဟုတ် \`+25%\``,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard()
        .text('❌ Cancel', `order:view:${order.id}`)
        .row()
        .text('📋 All Orders', 'menu:orders'),
    }
  );

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
    const rawPct = parseFloat(priceText.replace('%', ''));
    if (isNaN(rawPct)) {
      await ctx.reply('❌ မမှန်ကန်သော ရာခိုင်နှုန်းဖြစ်ပါသည်။');
      return;
    }
    targetPriceUsd = currentPrice * (1 + rawPct / 100);
    if (order.order_type === 'BUY_LIMIT') {
      condition = 'LTE';
    } else {
      condition = rawPct >= 0 ? 'GTE' : 'LTE';
    }
  } else {
    targetPriceUsd = parseFloat(priceText);
    if (isNaN(targetPriceUsd) || targetPriceUsd <= 0) {
      await ctx.reply('❌ မမှန်ကန်သော စျေးနှုန်းဖြစ်ပါသည်။');
      return;
    }
    if (order.order_type === 'BUY_LIMIT') {
      condition = targetPriceUsd <= currentPrice ? 'LTE' : 'LTE';
    } else {
      condition = targetPriceUsd >= currentPrice ? 'GTE' : 'LTE';
    }
  }

  const success = updateLimitOrderDetails(userId, order.id, {
    targetPriceUsd,
    condition,
  });

  if (!success) {
    await ctx.reply('❌ Order ပြင်ဆင်ခြင်း မအောင်မြင်ပါ။ (Order မရှိတော့ပါ သို့မဟုတ် Status ပြောင်းသွားပါသည်)');
    return;
  }

  const updatedOrder = getLimitOrderById(userId, order.id);
  if (!updatedOrder) return;

  await ctx.reply(
    `✅ *Order #${order.id} ၏ Target Price ကို ပြင်ဆင်ပြီးပါပြီ!* 🎯\n\n` +
      getOrderDetailMessage(updatedOrder, currentPrice),
    {
      parse_mode: 'Markdown',
      reply_markup: getOrderDetailKeyboard(updatedOrder),
    }
  );
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

  const state = getUserTradeState(userId);
  const orderId = state?.editingOrderId;

  if (!orderId) {
    await ctx.reply('❌ ပြင်ဆင်မည့် Order ကို ရှာမတွေ့ပါ။', {
      reply_markup: new InlineKeyboard().text('📋 All Orders', 'menu:orders'),
    });
    return;
  }

  const order = getLimitOrderById(userId, orderId);
  if (!order || order.status !== 'PENDING') {
    await ctx.reply('❌ ဤ Order သည် ပယ်ဖျက်ပြီး သို့မဟုတ် အလုပ်လုပ်ပြီးဖြစ်ပါသည်။', {
      reply_markup: new InlineKeyboard().text('📋 All Orders', 'menu:orders'),
    });
    return;
  }

  const token = await fetchTokenInfo(order.token_address);
  const currentPrice = token?.priceUsd || order.target_price_usd;

  let promptText = '';
  if (order.order_type === 'BUY_LIMIT') {
    promptText =
      `✏️ *Edit Buy Amount - Order #${order.id}*\n\n` +
      `🪙 *Token:* $${order.token_symbol}\n` +
      `💵 *Current Amount:* \`${order.amount_sol} SOL\`\n\n` +
      `ဝယ်ယူမည့် *SOL ပမာဏ အသစ်* ကို ရိုက်ထည့်ပေးပါ:\n` +
      `ဥပမာ: \`0.5\` သို့မဟုတ် \`1.5\``;
  } else {
    promptText =
      `✏️ *Edit Sell Amount - Order #${order.id}*\n\n` +
      `🪙 *Token:* $${order.token_symbol}\n` +
      `📦 *Current Amount:* \`${order.amount_percent}%\`\n\n` +
      `ရောင်းချမည့် *ရာခိုင်နှုန်း (%) အသစ်* ကို ရိုက်ထည့်ပေးပါ (1 မှ 100 အထိ):\n` +
      `ဥပမာ: \`50\` သို့မဟုတ် \`100\``;
  }

  const promptMsg = await ctx.reply(promptText, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .text('❌ Cancel', `order:view:${order.id}`)
      .row()
      .text('📋 All Orders', 'menu:orders'),
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
      await ctx.reply('❌ မမှန်ကန်သော SOL ပမာဏဖြစ်ပါသည်။');
      return;
    }
    updateLimitOrderDetails(userId, order.id, { amountSol: sol });
  } else {
    const pct = parseFloat(res.text.trim().replace('%', ''));
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      await ctx.reply('❌ မမှန်ကန်သော ရာခိုင်နှုန်းဖြစ်ပါသည်။ 1 မှ 100 ကြား ထည့်ပေးပါ။');
      return;
    }
    updateLimitOrderDetails(userId, order.id, { amountPercent: pct });
  }

  const updatedOrder = getLimitOrderById(userId, order.id);
  if (!updatedOrder) return;

  await ctx.reply(
    `✅ *Order #${order.id} ၏ ပမာဏကို ပြင်ဆင်ပြီးပါပြီ!* 📦\n\n` +
      getOrderDetailMessage(updatedOrder, currentPrice),
    {
      parse_mode: 'Markdown',
      reply_markup: getOrderDetailKeyboard(updatedOrder),
    }
  );
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
  const isEn = userLang === 'en';

  const promptMsg = await ctx.reply(
    `⚡ *${isEn ? 'Custom Slippage Percentage' : 'စိတ်ကြိုက် Slippage ရာခိုင်နှုန်း (%)'}*\n\n` +
      `${isEn ? 'Enter your desired slippage percentage (e.g. 2.5, 7, 15):' : 'အသုံးပြုလိုသော Slippage ရာခိုင်နှုန်းကို ရိုက်ထည့်ပေးပါ (ဥပမာ: 2.5, 7, 15):'}\n\n` +
      `_Min: 0.1%, Max: 50%_`,
    {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('❌ Cancel', 'menu:settings'),
    }
  );

  const res = await waitForInputOrCancel(conversation, ctx);
  if (res.isCancelled || !res.text) {
    try {
      await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id);
    } catch {}
    return;
  }

  const slip = parseFloat(res.text.trim().replace('%', ''));
  if (isNaN(slip) || slip <= 0 || slip > 50) {
    await ctx.reply(
      isEn
        ? '❌ Invalid slippage. Must be between 0.1% and 50%.'
        : '❌ မမှန်ကန်သော Slippage ဖြစ်ပါသည်။ 0.1% မှ 50% ကြား ထည့်ပေးပါ။'
    );
    return;
  }

  const bps = Math.round(slip * 100);
  updateUserSettings(userId, bps);
  const settings = getUserSettings(userId);

  await ctx.reply(
    `✅ *${isEn ? `Slippage set to ${slip}%!` : `Slippage ကို ${slip}% သို့ ပြောင်းလဲပြီးပါပြီ!`}* ⚡\n\n` +
      getSettingsMessage(settings, userLang),
    {
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(settings, userLang),
    }
  );
}


