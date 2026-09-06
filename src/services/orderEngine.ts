import { Bot, InlineKeyboard } from 'grammy';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getPendingLimitOrders,
  updateLimitOrderStatus,
  getWalletByPublicKey,
  getUserSettings,
  DBLimitOrder,
} from '../db/index.js';
import { fetchTokenInfo, formatCurrency } from './token.js';
import { importWalletAuto, getTokenBalance, getSolBalance, formatAddress } from './wallet.js';
import { getJupiterQuote, executeJupiterSwap } from './swap.js';
import { CONFIG } from '../config.js';
import { MyContext } from './../bot/conversations.js';

let isEngineRunning = false;
let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Start the background Limit Order Engine
 */
export function startOrderEngine(bot: Bot<MyContext>, intervalMs = CONFIG.ORDER_POLL_INTERVAL_MS || 2000) {
  if (isEngineRunning) return;
  isEngineRunning = true;
  console.log(`⚡ Limit Order Engine started (Polling every ${(intervalMs / 1000).toFixed(1)}s)...`);

  pollingInterval = setInterval(async () => {
    try {
      await processPendingOrders(bot);
    } catch (err) {
      console.error('Error in Limit Order Engine tick:', err);
    }
  }, intervalMs);
}

/**
 * Stop the background Limit Order Engine
 */
export function stopOrderEngine() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isEngineRunning = false;
  console.log('🛑 Limit Order Engine stopped.');
}

/**
 * Process all pending limit orders
 */
async function processPendingOrders(bot: Bot<MyContext>) {
  const pendingOrders = getPendingLimitOrders();
  if (pendingOrders.length === 0) return;

  // Group by token address to minimize API calls
  const tokenAddresses = Array.from(new Set(pendingOrders.map((o) => o.token_address)));
  const tokenPriceMap = new Map<string, number>();

  for (const ca of tokenAddresses) {
    try {
      const info = await fetchTokenInfo(ca);
      if (info && info.priceUsd > 0) {
        tokenPriceMap.set(ca, info.priceUsd);
      }
    } catch (e) {
      console.error(`Failed to fetch price for token ${ca}:`, e);
    }
  }

  for (const order of pendingOrders) {
    const currentPrice = tokenPriceMap.get(order.token_address);
    if (!currentPrice) continue;

    let isTriggered = false;

    if (order.order_type === 'BUY_LIMIT') {
      // Buy Limit triggers when current price falls to or below target price
      if (order.condition === 'LTE' && currentPrice <= order.target_price_usd) {
        isTriggered = true;
      }
    } else if (order.order_type === 'SELL_LIMIT') {
      // Take Profit (GTE) or Stop Loss (LTE)
      if (order.condition === 'GTE' && currentPrice >= order.target_price_usd) {
        isTriggered = true;
      } else if (order.condition === 'LTE' && currentPrice <= order.target_price_usd) {
        isTriggered = true;
      }
    }

    if (isTriggered) {
      console.log(`🎯 Order #${order.id} TRIGGERED! (${order.order_type} for ${order.token_symbol} at $${currentPrice})`);
      await executeTriggeredOrder(bot, order, currentPrice);
    }
  }
}

/**
 * Execute a triggered limit order
 */
async function executeTriggeredOrder(bot: Bot<MyContext>, order: DBLimitOrder, triggerPrice: number) {
  // Mark status as EXECUTING to prevent double-firing
  updateLimitOrderStatus(order.id, 'EXECUTING');

  const wallet = getWalletByPublicKey(order.user_id, order.wallet_address);
  if (!wallet) {
    updateLimitOrderStatus(order.id, 'FAILED', undefined, 'Wallet not found or removed');
    await notifyUser(
      bot,
      order.user_id,
      `❌ *Limit Order #${order.id} Failed!*\n\nWallet \`${formatAddress(order.wallet_address)}\` ရှာမတွေ့တော့ပါ။`
    );
    return;
  }

  const settings = getUserSettings(order.user_id);
  const slippageBps = settings.slippage_bps || 500; // default 5%
  const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

  try {
    const imported = importWalletAuto(wallet.privateKey);

    if (order.order_type === 'BUY_LIMIT') {
      const solAmount = order.amount_sol || 0.1;
      const solBalance = await getSolBalance(wallet.publicKey);

      if (solBalance < solAmount) {
        updateLimitOrderStatus(order.id, 'FAILED', undefined, `Insufficient SOL balance (${solBalance.toFixed(4)} SOL)`);
        await notifyUser(
          bot,
          order.user_id,
          `❌ *Limit Buy Order #${order.id} Failed!*\n\n` +
            `🪙 *Token:* \`${order.token_symbol}\`\n` +
            `💵 *Trigger Price:* \`${formatCurrency(triggerPrice)}\`\n` +
            `⚠️ *အကြောင်းအရင်း:* လက်ကျန် SOL မလုံလောက်ပါ (လိုအပ်: \`${solAmount} SOL\`, လက်ကျန်: \`${solBalance.toFixed(4)} SOL\`)`
        );
        return;
      }

      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      const quote = await getJupiterQuote(CONFIG.WSOL_MINT, order.token_address, lamports, slippageBps);

      if (!quote) {
        updateLimitOrderStatus(order.id, 'FAILED', undefined, 'Jupiter quote unavailable / No liquidity');
        await notifyUser(
          bot,
          order.user_id,
          `❌ *Limit Buy Order #${order.id} Failed!*\n\nJupiter Swap Quote ရယူ၍ မရရှိပါ (Liquidity မလုံလောက်ပါ)။`
        );
        return;
      }

      const swapResult = await executeJupiterSwap(imported.keypair, quote, {
        priorityFeeLamports,
        slippageBps,
      });

      if (swapResult.success && swapResult.signature) {
        updateLimitOrderStatus(order.id, 'EXECUTED', swapResult.signature);
        const outEstimate = (parseInt(quote.outAmount) / 1e6).toFixed(2);

        await notifyUser(
          bot,
          order.user_id,
          `🎉 *Limit Buy Order Executed အောင်မြင်ပါသည်!* 🚀\n\n` +
            `🪙 *Token:* *$${order.token_symbol}*\n` +
            `💵 *Execution Price:* \`${formatCurrency(triggerPrice)}\` (Target: \`${formatCurrency(order.target_price_usd)}\`)\n` +
            `💰 *Spent:* \`${solAmount} SOL\`\n` +
            `📦 *Est. Received:* ~\`${outEstimate}\` tokens\n` +
            `💳 *Wallet:* \`${formatAddress(wallet.publicKey)}\`\n\n` +
            `🔗 *Solscan:* [View Transaction](https://solscan.io/tx/${swapResult.signature})`,
          new InlineKeyboard()
            .url('🔍 View on Solscan', `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🎯 Trade Dashboard', `token:refresh:${order.token_address}`)
        );
      } else {
        updateLimitOrderStatus(order.id, 'FAILED', undefined, swapResult.error);
        await notifyUser(
          bot,
          order.user_id,
          `❌ *Limit Buy Order #${order.id} Execution Failed!*\n\n` +
            `Error: \`${swapResult.error || 'Transaction failed'}\``
        );
      }
    } else if (order.order_type === 'SELL_LIMIT') {
      const percent = order.amount_percent || 100;
      const tokenBal = await getTokenBalance(wallet.publicKey, order.token_address);

      if (tokenBal.uiAmount <= 0) {
        updateLimitOrderStatus(order.id, 'FAILED', undefined, 'No token balance in wallet');
        await notifyUser(
          bot,
          order.user_id,
          `❌ *Limit Sell Order #${order.id} Failed!*\n\n` +
            `🪙 *Token:* \`${order.token_symbol}\`\n` +
            `⚠️ *အကြောင်းအရင်း:* ရောင်းချရန် Token Balance မရှိတော့ပါ။`
        );
        return;
      }

      const rawAmountToSell = (BigInt(tokenBal.amount) * BigInt(Math.floor(percent))) / 100n;
      if (rawAmountToSell <= 0n) {
        updateLimitOrderStatus(order.id, 'FAILED', undefined, 'Amount to sell is zero');
        return;
      }

      const quote = await getJupiterQuote(order.token_address, CONFIG.WSOL_MINT, rawAmountToSell.toString(), slippageBps);

      if (!quote) {
        updateLimitOrderStatus(order.id, 'FAILED', undefined, 'Jupiter quote unavailable');
        await notifyUser(
          bot,
          order.user_id,
          `❌ *Limit Sell Order #${order.id} Failed!*\n\nJupiter Swap Quote ရယူ၍ မရရှိပါ။`
        );
        return;
      }

      const swapResult = await executeJupiterSwap(imported.keypair, quote, {
        priorityFeeLamports,
        slippageBps,
      });

      if (swapResult.success && swapResult.signature) {
        updateLimitOrderStatus(order.id, 'EXECUTED', swapResult.signature);
        const outSol = (parseInt(quote.outAmount) / LAMPORTS_PER_SOL).toFixed(4);

        await notifyUser(
          bot,
          order.user_id,
          `🎉 *Limit Sell Order Executed အောင်မြင်ပါသည်!* 🚀\n\n` +
            `🪙 *Token:* *$${order.token_symbol}*\n` +
            `💵 *Execution Price:* \`${formatCurrency(triggerPrice)}\`\n` +
            `📦 *Sold:* \`${percent}%\` (~${(tokenBal.uiAmount * (percent / 100)).toFixed(2)} tokens)\n` +
            `💰 *Received:* ~\`${outSol} SOL\`\n` +
            `💳 *Wallet:* \`${formatAddress(wallet.publicKey)}\`\n\n` +
            `🔗 *Solscan:* [View Transaction](https://solscan.io/tx/${swapResult.signature})`,
          new InlineKeyboard()
            .url('🔍 View on Solscan', `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🎯 Trade Dashboard', `token:refresh:${order.token_address}`)
        );
      } else {
        updateLimitOrderStatus(order.id, 'FAILED', undefined, swapResult.error);
        await notifyUser(
          bot,
          order.user_id,
          `❌ *Limit Sell Order #${order.id} Execution Failed!*\n\n` +
            `Error: \`${swapResult.error || 'Transaction failed'}\``
        );
      }
    }
  } catch (err: any) {
    console.error(`Order execution exception #${order.id}:`, err);
    updateLimitOrderStatus(order.id, 'FAILED', undefined, err.message);
    await notifyUser(
      bot,
      order.user_id,
      `❌ *Limit Order #${order.id} Exception:*\n\`${err.message}\``
    );
  }
}

/**
 * Send notification message to user
 */
async function notifyUser(bot: Bot<MyContext>, userId: number, text: string, keyboard?: InlineKeyboard) {
  try {
    await bot.api.sendMessage(userId, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error(`Failed to send Telegram notification to user ${userId}:`, err);
  }
}
