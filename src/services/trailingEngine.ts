import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CONFIG } from '../config.js';
import {
  getAllActiveTrailingOrders,
  updateTrailingHighWatermark,
  completeTrailingOrder,
  recordTrade,
  getActiveWallet,
  getUserSettings,
} from '../db/index.js';
import { getTokenBalance, importWalletFromPrivateKey } from './wallet.js';
import { getJupiterQuote, executeJupiterSwap } from './swap.js';
import { fetchLiveTokenPrices, fetchTokenInfo } from './token.js';

let trailingIntervalHandle: NodeJS.Timeout | null = null;
let isCheckingTrailing = false;

/**
 * Start the background Trailing Stop-Loss & TP Engine
 */
export function startTrailingEngine(intervalMs = 8000): void {
  if (trailingIntervalHandle) return;

  console.log('[Trailing Engine] Started background Trailing Stop-Loss loop...');

  trailingIntervalHandle = setInterval(() => {
    checkAndExecuteTrailingOrders();
  }, intervalMs);
}

/**
 * Stop the background Trailing loop
 */
export function stopTrailingEngine(): void {
  if (trailingIntervalHandle) {
    clearInterval(trailingIntervalHandle);
    trailingIntervalHandle = null;
    console.log('[Trailing Engine] Stopped background Trailing loop.');
  }
}

/**
 * Check all active trailing orders and evaluate against live prices
 */
async function checkAndExecuteTrailingOrders(): Promise<void> {
  if (isCheckingTrailing) return;
  isCheckingTrailing = true;

  try {
    const orders = getAllActiveTrailingOrders();
    if (orders.length === 0) return;

    const tokenAddresses = Array.from(new Set(orders.map((o) => o.token_address)));
    const pricesMap = await fetchLiveTokenPrices(tokenAddresses);

    for (const order of orders) {
      try {
        const currentPrice = pricesMap.get(order.token_address);
        if (!currentPrice || currentPrice <= 0) continue;

        // 1. If price reached a new High Watermark, update it
        if (currentPrice > order.highest_price_usd) {
          updateTrailingHighWatermark(order.id, currentPrice);
          order.highest_price_usd = currentPrice;
        }

        // 2. Calculate dynamic trailing stop price
        const trailingDropRatio = order.trailing_pct / 100;
        const stopPrice = order.highest_price_usd * (1 - trailingDropRatio);

        // 3. Trigger sell if current price dropped below the dynamic stop price
        if (currentPrice <= stopPrice) {
          console.log(
            `[Trailing Engine] Trailing SL triggered for #${order.id} ($${order.token_symbol})! Peak: $${order.highest_price_usd}, Stop: $${stopPrice.toFixed(6)}, Current: $${currentPrice.toFixed(6)}`
          );

          const wallet = getActiveWallet(order.user_id);
          if (!wallet || !wallet.privateKey) {
            console.warn(`[Trailing Engine] No wallet found for User #${order.user_id}. Completing order.`);
            completeTrailingOrder(order.id);
            continue;
          }

          const tokenBal = await getTokenBalance(wallet.publicKey, order.token_address, true);
          if (!tokenBal || tokenBal.uiAmount <= 0) {
            console.warn(`[Trailing Engine] 0 token balance for User #${order.user_id}. Completing order.`);
            completeTrailingOrder(order.id);
            continue;
          }

          const pct = Math.min(100, Math.max(1, order.amount_percent || 100));
          const sellTokensUi = (tokenBal.uiAmount * pct) / 100;
          const sellTokensRaw = BigInt(Math.floor((Number(tokenBal.amount) * pct) / 100)).toString();

          const settings = getUserSettings(order.user_id);
          const slippageBps = settings.slippage_bps || 500;
          const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

          const { keypair } = importWalletFromPrivateKey(wallet.privateKey);
          const quote = await getJupiterQuote(order.token_address, CONFIG.WSOL_MINT, sellTokensRaw, slippageBps);

          if (!quote) {
            console.warn(`[Trailing Engine] No Jupiter quote to sell token ${order.token_address}.`);
            continue;
          }

          const swapResult = await executeJupiterSwap(keypair, quote, {
            priorityFeeLamports,
            slippageBps,
          });

          if (swapResult.success && swapResult.signature) {
            console.log(`[Trailing Engine] Trailing SL trade executed! TX: ${swapResult.signature}`);

            const receivedSol = quote.outAmount ? (parseInt(quote.outAmount, 10) / LAMPORTS_PER_SOL) : 0;
            const tokenInfo = await fetchTokenInfo(order.token_address);

            recordTrade({
              userId: order.user_id,
              walletAddress: wallet.publicKey,
              tokenAddress: order.token_address,
              tokenSymbol: order.token_symbol,
              tradeType: 'SELL',
              amountSol: receivedSol,
              tokenAmount: sellTokensUi,
              priceUsd: currentPrice,
              marketCapUsd: tokenInfo?.marketCap || 0,
              txSignature: swapResult.signature,
            });

            completeTrailingOrder(order.id);
          } else {
            console.error(`[Trailing Engine] Swap failed for Trailing Order #${order.id}:`, swapResult.error);
          }
        }
      } catch (err: any) {
        console.error(`[Trailing Engine] Error processing order #${order.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[Trailing Engine] Global check error:', err.message);
  } finally {
    isCheckingTrailing = false;
  }
}
