import { Bot, InlineKeyboard } from 'grammy';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getPendingLimitOrders,
  claimLimitOrderForExecution,
  updateLimitOrderStatus,
  getWalletByPublicKey,
  getUserSettings,
  getUserLanguage,
  DBLimitOrder,
  recordTrade,
} from '../db/index.js';
import { fetchLiveTokenPrices, formatCurrency } from './token.js';
import { importWalletAuto, getTokenBalance, getSolBalance, formatAddress } from './wallet.js';
import { getJupiterQuote, executeJupiterSwap } from './swap.js';
import { CONFIG } from '../config.js';
import { MyContext } from './../bot/conversations.js';
import { getT } from '../i18n/index.js';

let isEngineRunning = false;
let isProcessing = false;
let pollingInterval: NodeJS.Timeout | null = null;
const inFlightOrderIds = new Set<number>();

/**
 * Start the background Limit Order Engine
 */
export function startOrderEngine(bot: Bot<MyContext>, intervalMs = CONFIG.ORDER_POLL_INTERVAL_MS || 300) {
  if (isEngineRunning) return;
  isEngineRunning = true;
  console.log(`⚡ Limit Order Engine started (Polling every ${(intervalMs / 1000).toFixed(2)}s / ${intervalMs}ms)...`);

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
  inFlightOrderIds.clear();
  console.log('🛑 Limit Order Engine stopped.');
}

/**
 * Process all pending limit orders
 */
async function processPendingOrders(bot: Bot<MyContext>) {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const pendingOrders = getPendingLimitOrders();
    if (pendingOrders.length === 0) return;

    // Filter out orders currently in flight
    const actionableOrders = pendingOrders.filter((o) => !inFlightOrderIds.has(o.id));
    if (actionableOrders.length === 0) return;

    // Group by token address to batch live price requests
    const tokenAddresses = Array.from(new Set(actionableOrders.map((o) => o.token_address)));
    const tokenPriceMap = await fetchLiveTokenPrices(tokenAddresses);

    for (const order of actionableOrders) {
      if (inFlightOrderIds.has(order.id)) continue;
      const currentPrice = tokenPriceMap.get(order.token_address);
      if (!currentPrice || currentPrice <= 0) continue;

      let isTriggered = false;

      if (order.order_type === 'BUY_LIMIT') {
        if (order.condition === 'LTE' && currentPrice <= order.target_price_usd) {
          isTriggered = true;
        }
      } else if (order.order_type === 'SELL_LIMIT') {
        if (order.condition === 'GTE' && currentPrice >= order.target_price_usd) {
          isTriggered = true;
        } else if (order.condition === 'LTE' && currentPrice <= order.target_price_usd) {
          isTriggered = true;
        }
      }

      if (isTriggered) {
        // Atomic DB claim to prevent any race condition or duplicate firing
        const claimed = claimLimitOrderForExecution(order.id);
        if (!claimed) {
          continue;
        }

        inFlightOrderIds.add(order.id);
        console.log(`🎯 Order #${order.id} CLAIMED & TRIGGERED! (${order.order_type} for ${order.token_symbol} at Live $${currentPrice} vs Target $${order.target_price_usd})`);

        // Execute asynchronously and clean up in-flight set when done
        executeTriggeredOrder(bot, order, currentPrice).finally(() => {
          inFlightOrderIds.delete(order.id);
        });
      }
    }
  } finally {
    isProcessing = false;
  }
}

/**
 * Execute a triggered limit order
 */
async function executeTriggeredOrder(bot: Bot<MyContext>, order: DBLimitOrder, triggerPrice: number) {
  const lang = getUserLanguage(order.user_id);
  const t = getT(lang);

  const wallet = getWalletByPublicKey(order.user_id, order.wallet_address);
  if (!wallet) {
    updateLimitOrderStatus(order.id, 'FAILED', undefined, 'Wallet not found or removed');
    await notifyUser(
      bot,
      order.user_id,
      `❌ *Limit Order #${order.id} Failed!*\n\nWallet \`${formatAddress(order.wallet_address)}\` not found.`
    );
    return;
  }

  const settings = getUserSettings(order.user_id);
  const slippageBps = settings.slippage_bps || 500;
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
            `⚠️ ${t.insufficient_sol_err(solAmount, solBalance)}`
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
          `❌ *Limit Buy Order #${order.id} Failed!*\n\nJupiter Swap Quote unavailable (insufficient liquidity).`
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

        // Record trade for PnL & entry tracking
        recordTrade({
          userId: order.user_id,
          walletAddress: wallet.publicKey,
          tokenAddress: order.token_address,
          tokenSymbol: order.token_symbol,
          tradeType: 'BUY',
          amountSol: solAmount,
          tokenAmount: parseFloat(outEstimate) || (parseInt(quote.outAmount) / 1e6),
          priceUsd: triggerPrice,
          txSignature: swapResult.signature,
        });

        await notifyUser(
          bot,
          order.user_id,
          `🎉 *Limit Buy Order #${order.id} Executed!* 🚀\n\n` +
            `🪙 *Token:* *$${order.token_symbol}*\n` +
            `💵 *Execution Price:* \`${formatCurrency(triggerPrice)}\` (Target: \`${formatCurrency(order.target_price_usd)}\`)\n` +
            `💰 *Spent:* \`${solAmount} SOL\`\n` +
            `📦 *Est. Received:* ~\`${outEstimate}\` tokens\n` +
            `💳 *Wallet:* \`${formatAddress(wallet.publicKey)}\`\n\n` +
            `🔗 *Solscan:* [View Transaction](https://solscan.io/tx/${swapResult.signature})`,
          new InlineKeyboard()
            .url(t.btn_view_solscan, `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🖼️ Share PnL Card', `token:pnl:${order.token_address}`)
            .text(t.btn_trade_dashboard, `token:refresh:${order.token_address}`)
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
            `⚠️ ${t.insufficient_token_err(order.token_symbol)}`
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
          `❌ *Limit Sell Order #${order.id} Failed!*\n\nJupiter Swap Quote unavailable.`
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
        const soldAmountTokens = tokenBal.uiAmount * (percent / 100);

        // Record trade for PnL & entry tracking
        recordTrade({
          userId: order.user_id,
          walletAddress: wallet.publicKey,
          tokenAddress: order.token_address,
          tokenSymbol: order.token_symbol,
          tradeType: 'SELL',
          amountSol: parseFloat(outSol) || 0,
          tokenAmount: soldAmountTokens,
          priceUsd: triggerPrice,
          txSignature: swapResult.signature,
        });

        await notifyUser(
          bot,
          order.user_id,
          `🎉 *Limit Sell Order #${order.id} Executed!* 🚀\n\n` +
            `🪙 *Token:* *$${order.token_symbol}*\n` +
            `💵 *Execution Price:* \`${formatCurrency(triggerPrice)}\`\n` +
            `📦 *Sold:* \`${percent}%\` (~${soldAmountTokens.toFixed(2)} tokens)\n` +
            `💰 *Received:* ~\`${outSol} SOL\`\n` +
            `💳 *Wallet:* \`${formatAddress(wallet.publicKey)}\`\n\n` +
            `🔗 *Solscan:* [View Transaction](https://solscan.io/tx/${swapResult.signature})`,
          new InlineKeyboard()
            .url(t.btn_view_solscan, `https://solscan.io/tx/${swapResult.signature}`)
            .row()
            .text('🖼️ Share PnL Card', `token:pnl:${order.token_address}`)
            .text(t.btn_trade_dashboard, `token:refresh:${order.token_address}`)
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
