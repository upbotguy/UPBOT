import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { CONFIG } from '../config.js';
import {
  getAllActiveSniperRules,
  recordTrade,
  getActiveWallet,
  createLimitOrder,
  getUserSettings,
} from '../db/index.js';
import { connection, getSolBalance, importWalletFromPrivateKey } from './wallet.js';
import { getJupiterQuote, executeJupiterSwap } from './swap.js';
import { fetchTokenInfo } from './token.js';

let isSniperRunning = false;

/**
 * Start the Token Launch Sniper Engine
 */
export function startSniperEngine(): void {
  if (isSniperRunning) return;
  isSniperRunning = true;
  console.log('[Sniper Engine] Token Launch Sniper activated and ready for new pools...');
}

/**
 * Stop the Sniper Engine
 */
export function stopSniperEngine(): void {
  isSniperRunning = false;
  console.log('[Sniper Engine] Token Launch Sniper paused.');
}

/**
 * Check if token passes security safety checks (Mint & Freeze Authority)
 */
export async function checkTokenLaunchSafety(tokenMintAddress: string): Promise<{
  isSafe: boolean;
  mintRevoked: boolean;
  freezeRevoked: boolean;
  error?: string;
}> {
  try {
    const mintPubkey = new PublicKey(tokenMintAddress);
    const mintInfo = await getMint(connection, mintPubkey);

    const mintRevoked = mintInfo.mintAuthority === null;
    const freezeRevoked = mintInfo.freezeAuthority === null;
    const isSafe = mintRevoked && freezeRevoked;

    return {
      isSafe,
      mintRevoked,
      freezeRevoked,
    };
  } catch (err: any) {
    return {
      isSafe: false,
      mintRevoked: false,
      freezeRevoked: false,
      error: err.message,
    };
  }
}

/**
 * Trigger an instant snipe execution for a detected new token mint
 */
export async function executeSnipeForToken(
  tokenMintAddress: string,
  initialLiquidityUsd = 2000
): Promise<{ success: boolean; executedCount: number; errors: string[] }> {
  if (!isSniperRunning) {
    return { success: false, executedCount: 0, errors: ['Sniper Engine is currently paused'] };
  }

  const rules = getAllActiveSniperRules();
  if (rules.length === 0) {
    return { success: true, executedCount: 0, errors: [] };
  }

  console.log(`[Sniper Engine] New launch detected: ${tokenMintAddress}. Checking rules against ${rules.length} active users...`);

  // 1. Run safety checks if rug filter is enabled
  const safety = await checkTokenLaunchSafety(tokenMintAddress);
  const tokenInfo = await fetchTokenInfo(tokenMintAddress);
  const tokenSymbol = tokenInfo?.symbol || 'NEW_TOKEN';
  const entryPriceUsd = tokenInfo?.priceUsd || 0.0001;

  let executedCount = 0;
  const errors: string[] = [];

  for (const rule of rules) {
    try {
      if (rule.rug_filter === 1 && !safety.isSafe) {
        console.warn(`[Sniper Engine] User #${rule.user_id} skipped: Token failed rug safety filter (Mint/Freeze active).`);
        continue;
      }

      if (initialLiquidityUsd < rule.min_liquidity_usd || initialLiquidityUsd > rule.max_liquidity_usd) {
        console.warn(`[Sniper Engine] User #${rule.user_id} skipped: Liquidity $${initialLiquidityUsd} outside configured range [$${rule.min_liquidity_usd}-$${rule.max_liquidity_usd}].`);
        continue;
      }

      const wallet = getActiveWallet(rule.user_id);
      if (!wallet || !wallet.privateKey) {
        continue;
      }

      const solBal = await getSolBalance(wallet.publicKey, true);
      if (solBal < rule.buy_amount_sol + 0.005) {
        console.warn(`[Sniper Engine] User #${rule.user_id} insufficient SOL balance (${solBal.toFixed(4)} SOL).`);
        continue;
      }

      const settings = getUserSettings(rule.user_id);
      const priorityFeeSol = Math.max(0.005, settings.priority_fee_sol || 0.002); // Turbo priority for snipes
      const priorityFeeLamports = Math.floor(priorityFeeSol * LAMPORTS_PER_SOL);
      const slippageBps = 1500; // 15% slippage on snipes

      console.log(`[Sniper Engine] Firing SNIPE for User #${rule.user_id} (${rule.buy_amount_sol} SOL into $${tokenSymbol})...`);

      const { keypair } = importWalletFromPrivateKey(wallet.privateKey);
      const lamports = Math.floor(rule.buy_amount_sol * LAMPORTS_PER_SOL);
      const quote = await getJupiterQuote(CONFIG.WSOL_MINT, tokenMintAddress, lamports, slippageBps);

      if (!quote) {
        errors.push(`User #${rule.user_id}: No Jupiter quote available for snipe`);
        continue;
      }

      const swapResult = await executeJupiterSwap(keypair, quote, {
        priorityFeeLamports,
        slippageBps,
      });

      if (swapResult.success && swapResult.signature) {
        console.log(`[Sniper Engine] Snipe success! TX: ${swapResult.signature}`);
        executedCount++;

        const tokenAmount = quote.outAmount ? (parseInt(quote.outAmount, 10) / Math.pow(10, tokenInfo?.decimals || 6)) : 0;

        recordTrade({
          userId: rule.user_id,
          walletAddress: wallet.publicKey,
          tokenAddress: tokenMintAddress,
          tokenSymbol,
          tradeType: 'BUY',
          amountSol: rule.buy_amount_sol,
          tokenAmount,
          priceUsd: entryPriceUsd,
          marketCapUsd: tokenInfo?.marketCap || 0,
          txSignature: swapResult.signature,
        });

        // Auto place Take Profit order
        if (rule.take_profit_pct > 0 && entryPriceUsd > 0) {
          const tpPrice = entryPriceUsd * (1 + rule.take_profit_pct / 100);
          createLimitOrder({
            userId: rule.user_id,
            walletAddress: wallet.publicKey,
            tokenAddress: tokenMintAddress,
            tokenSymbol,
            orderType: 'SELL_LIMIT',
            targetPriceUsd: tpPrice,
            condition: 'GTE',
            amountPercent: 100,
          });
          console.log(`[Sniper Engine] Auto TP Limit Order created at +${rule.take_profit_pct}% ($${tpPrice.toFixed(6)})`);
        }

        // Auto place Stop Loss order
        if (rule.stop_loss_pct > 0 && entryPriceUsd > 0) {
          const slPrice = entryPriceUsd * (1 - rule.stop_loss_pct / 100);
          createLimitOrder({
            userId: rule.user_id,
            walletAddress: wallet.publicKey,
            tokenAddress: tokenMintAddress,
            tokenSymbol,
            orderType: 'SELL_LIMIT',
            targetPriceUsd: slPrice,
            condition: 'LTE',
            amountPercent: 100,
          });
          console.log(`[Sniper Engine] Auto SL Limit Order created at -${rule.stop_loss_pct}% ($${slPrice.toFixed(6)})`);
        }
      } else {
        errors.push(`User #${rule.user_id}: ${swapResult.error}`);
      }
    } catch (err: any) {
      errors.push(`User #${rule.user_id}: ${err.message}`);
    }
  }

  return {
    success: executedCount > 0,
    executedCount,
    errors,
  };
}
