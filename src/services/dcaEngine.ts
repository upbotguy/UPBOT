import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CONFIG } from '../config.js';
import { getAllDueDcaOrders, recordDcaExecution, recordTrade, getActiveWallet, getUserSettings } from '../db/index.js';
import { getSolBalance, importWalletFromPrivateKey } from './wallet.js';
import { getJupiterQuote, executeJupiterSwap } from './swap.js';
import { fetchTokenInfo } from './token.js';

let dcaIntervalHandle: NodeJS.Timeout | null = null;
let isCheckingDca = false;

/**
 * Start the background DCA recurring execution engine
 */
export function startDcaEngine(intervalMs = 30000): void {
  if (dcaIntervalHandle) return;

  console.log('[DCA Engine] Started background DCA execution loop...');

  // Run initial check immediately
  checkAndExecuteDcaOrders();

  dcaIntervalHandle = setInterval(() => {
    checkAndExecuteDcaOrders();
  }, intervalMs);
}

/**
 * Stop the background DCA loop
 */
export function stopDcaEngine(): void {
  if (dcaIntervalHandle) {
    clearInterval(dcaIntervalHandle);
    dcaIntervalHandle = null;
    console.log('[DCA Engine] Stopped background DCA loop.');
  }
}

/**
 * Check all due DCA orders and execute them via Jupiter
 */
async function checkAndExecuteDcaOrders(): Promise<void> {
  if (isCheckingDca) return;
  isCheckingDca = true;

  try {
    const dueOrders = getAllDueDcaOrders();
    if (dueOrders.length === 0) return;

    for (const order of dueOrders) {
      try {
        const wallet = getActiveWallet(order.user_id);
        if (!wallet || !wallet.privateKey) {
          console.warn(`[DCA Engine] User #${order.user_id} has no active wallet. Skipping DCA #${order.id}`);
          continue;
        }

        const balance = await getSolBalance(wallet.publicKey, true);
        if (balance < order.amount_sol + 0.003) {
          console.warn(`[DCA Engine] Insufficient SOL balance (${balance.toFixed(4)} SOL) for DCA #${order.id} (${order.amount_sol} SOL).`);
          continue;
        }

        const settings = getUserSettings(order.user_id);
        const slippageBps = settings.slippage_bps || 500;
        const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

        console.log(`[DCA Engine] Executing DCA #${order.id}: Buying ${order.amount_sol} SOL of $${order.token_symbol}...`);

        const { keypair } = importWalletFromPrivateKey(wallet.privateKey);
        const lamports = Math.floor(order.amount_sol * LAMPORTS_PER_SOL);
        const quote = await getJupiterQuote(CONFIG.WSOL_MINT, order.token_address, lamports, slippageBps);

        if (!quote) {
          console.warn(`[DCA Engine] No Jupiter quote for token ${order.token_address}. Skipping cycle.`);
          continue;
        }

        const swapResult = await executeJupiterSwap(keypair, quote, {
          priorityFeeLamports,
          slippageBps,
        });

        if (swapResult.success && swapResult.signature) {
          console.log(`[DCA Engine] DCA #${order.id} executed successfully! TX: ${swapResult.signature}`);

          // Fetch price for trade record
          const tokenInfo = await fetchTokenInfo(order.token_address);
          const priceUsd = tokenInfo?.priceUsd || 0;
          const tokenAmount = quote.outAmount ? (parseInt(quote.outAmount, 10) / Math.pow(10, tokenInfo?.decimals || 6)) : 0;

          recordTrade({
            userId: order.user_id,
            walletAddress: wallet.publicKey,
            tokenAddress: order.token_address,
            tokenSymbol: order.token_symbol,
            tradeType: 'BUY',
            amountSol: order.amount_sol,
            tokenAmount,
            priceUsd,
            marketCapUsd: tokenInfo?.marketCap || 0,
            txSignature: swapResult.signature,
          });

          recordDcaExecution(order.id, order.interval_hours);
        } else {
          console.error(`[DCA Engine] Swap failed for DCA #${order.id}:`, swapResult.error);
        }
      } catch (err: any) {
        console.error(`[DCA Engine] Error executing DCA #${order.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[DCA Engine] Global check error:', err.message);
  } finally {
    isCheckingDca = false;
  }
}
