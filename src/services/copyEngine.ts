import { Bot, InlineKeyboard } from 'grammy';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getAllActiveCopyTargets,
  getActiveWallet,
  getWalletByPublicKey,
  getUserSettings,
  getUserLanguage,
  recordTrade,
  recordCopyTrade,
  DBCopyTarget,
} from '../db/index.js';
import { CONFIG } from '../config.js';
import { importWalletAuto, getTokenBalance, getSolBalance, formatAddress } from './wallet.js';
import { fetchTokenInfo, formatCurrency } from './token.js';
import { getJupiterQuote, executeJupiterSwap } from './swap.js';
import { MyContext } from '../bot/conversations.js';
import { getT } from '../i18n/index.js';

let isCopyEngineRunning = false;
let pollingTimer: NodeJS.Timeout | null = null;
const processedSignatures = new Set<string>();
const inFlightTargetTrades = new Set<string>(); // target_wallet:token:trade_type

// Keep set size manageable in RAM (max 5,000 signatures)
function addProcessedSignature(sig: string) {
  if (processedSignatures.size > 5000) {
    const it = processedSignatures.values();
    for (let i = 0; i < 1000; i++) {
      const val = it.next().value;
      if (val) processedSignatures.delete(val);
    }
  }
  processedSignatures.add(sig);
}

const connection = new Connection(CONFIG.SOLANA_RPC_URL, {
  commitment: 'confirmed',
  wsEndpoint: CONFIG.SOLANA_RPC_URL.startsWith('http')
    ? CONFIG.SOLANA_RPC_URL.replace('http', 'ws')
    : undefined,
});

/**
 * Start the Copy-Trading Engine
 */
export function startCopyEngine(bot: Bot<MyContext>, pollIntervalMs = 800) {
  if (isCopyEngineRunning) return;
  isCopyEngineRunning = true;
  console.log(`⚡ Copy-Trading Engine started (Monitoring active target wallets every ${pollIntervalMs}ms)...`);

  pollingTimer = setInterval(async () => {
    try {
      await pollActiveTargets(bot);
    } catch (err) {
      console.error('Error in Copy-Trading Engine loop:', err);
    }
  }, pollIntervalMs);
}

/**
 * Stop the Copy-Trading Engine
 */
export function stopCopyEngine() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  isCopyEngineRunning = false;
  processedSignatures.clear();
  inFlightTargetTrades.clear();
  console.log('🛑 Copy-Trading Engine stopped.');
}

/**
 * Poll all active copy targets for new transactions
 */
async function pollActiveTargets(bot: Bot<MyContext>) {
  const activeTargets = getAllActiveCopyTargets();
  if (activeTargets.length === 0) return;

  // Group by target wallet to avoid duplicate RPC calls if multiple users follow same wallet
  const targetMap = new Map<string, DBCopyTarget[]>();
  for (const target of activeTargets) {
    const list = targetMap.get(target.target_wallet) || [];
    list.push(target);
    targetMap.set(target.target_wallet, list);
  }

  for (const [targetWallet, targets] of targetMap.entries()) {
    try {
      const pubkey = new PublicKey(targetWallet);
      const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 3 });

      for (const sigInfo of signatures) {
        const sig = sigInfo.signature;
        if (processedSignatures.has(sig)) continue;
        addProcessedSignature(sig);

        // If transaction had an error on-chain, skip copying
        if (sigInfo.err) continue;

        // Process this target transaction
        await processTargetTransaction(bot, targetWallet, sig, targets);
      }
    } catch {
      // Ignore individual target RPC errors
    }
  }
}

/**
 * Parse target transaction and execute mirrored trade for each follower
 */
async function processTargetTransaction(
  bot: Bot<MyContext>,
  targetWallet: string,
  signature: string,
  targets: DBCopyTarget[]
) {
  try {
    const parsedTx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!parsedTx || !parsedTx.meta) return;

    const preTokenBalances = parsedTx.meta.preTokenBalances || [];
    const postTokenBalances = parsedTx.meta.postTokenBalances || [];

    // Calculate target SOL spent
    let targetSpentSol = 0;
    try {
      const keys = (parsedTx.transaction.message as any).accountKeys || [];
      const targetIdx = keys.findIndex((k: any) => {
        const pub = typeof k === 'string' ? k : k.pubkey?.toBase58?.() || String(k);
        return pub === targetWallet;
      });
      if (targetIdx >= 0 && parsedTx.meta.preBalances && parsedTx.meta.postBalances) {
        const preLamports = parsedTx.meta.preBalances[targetIdx] || 0;
        const postLamports = parsedTx.meta.postBalances[targetIdx] || 0;
        if (preLamports > postLamports) {
          targetSpentSol = (preLamports - postLamports) / LAMPORTS_PER_SOL;
        }
      }
    } catch {}

    // Analyze token balance delta for the target wallet
    for (const post of postTokenBalances) {
      if (post.owner !== targetWallet) continue;
      const mint = post.mint;
      if (mint.toLowerCase() === CONFIG.WSOL_MINT.toLowerCase()) continue;

      const pre = preTokenBalances.find((p) => p.owner === targetWallet && p.mint === mint);
      const preAmount = pre ? parseFloat(pre.uiTokenAmount.uiAmountString || '0') : 0;
      const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
      const delta = postAmount - preAmount;

      if (delta > 0.000001) {
        // Target BOUGHT tokens!
        const tradeKey = `${targetWallet}:${mint}:BUY`;
        if (inFlightTargetTrades.has(tradeKey)) continue;
        inFlightTargetTrades.add(tradeKey);

        for (const target of targets) {
          await executeCopyBuy(bot, target, mint, signature, delta, targetSpentSol).catch((e) =>
            console.error(`Error copying buy for user ${target.user_id}:`, e)
          );
        }

        setTimeout(() => inFlightTargetTrades.delete(tradeKey), 10000);
      } else if (delta < -0.000001) {
        // Target SOLD tokens!
        const percentSold = preAmount > 0 ? Math.min(100, Math.max(1, (Math.abs(delta) / preAmount) * 100)) : 100;
        const tradeKey = `${targetWallet}:${mint}:SELL`;
        if (inFlightTargetTrades.has(tradeKey)) continue;
        inFlightTargetTrades.add(tradeKey);

        for (const target of targets) {
          if (target.mirror_sell === 1) {
            await executeCopySell(bot, target, mint, signature, percentSold).catch((e) =>
              console.error(`Error copying sell for user ${target.user_id}:`, e)
            );
          }
        }

        setTimeout(() => inFlightTargetTrades.delete(tradeKey), 10000);
      }
    }
  } catch (err) {
    console.error(`Failed to parse target tx ${signature}:`, err);
  }
}

/**
 * Execute Mirrored Buy for follower
 */
async function executeCopyBuy(
  bot: Bot<MyContext>,
  target: DBCopyTarget,
  tokenAddress: string,
  targetTx: string,
  targetAmount: number,
  targetSpentSol = 0
) {
  const userId = target.user_id;
  const lang = getUserLanguage(userId);
  const t = getT(lang);

  let activeWallet = target.follower_wallet ? getWalletByPublicKey(userId, target.follower_wallet) : null;
  if (!activeWallet) {
    activeWallet = getActiveWallet(userId);
  }

  if (!activeWallet) {
    recordCopyTrade({
      userId,
      targetWallet: target.target_wallet,
      tokenAddress,
      tokenSymbol: 'TOKEN',
      tradeType: 'BUY',
      targetTx,
      status: 'SKIPPED',
      errorMessage: 'No active follower wallet found',
    });
    return;
  }

  // Prevent self-copying loop if target is the follower wallet itself
  if (target.target_wallet.trim().toLowerCase() === activeWallet.publicKey.trim().toLowerCase()) {
    console.log(`[Copy Engine] Skipping buy: target wallet (${target.target_wallet}) is identical to follower wallet (${activeWallet.publicKey})`);
    return;
  }

  let solAmount = target.buy_amount_sol || 0.1;
  if (target.buy_mode === 'PERCENT' && targetSpentSol > 0) {
    const pct = target.buy_percent || 10;
    solAmount = (targetSpentSol * pct) / 100;
    if (target.max_sol_cap && target.max_sol_cap > 0) {
      solAmount = Math.min(solAmount, target.max_sol_cap);
    }
    solAmount = Math.max(0.005, parseFloat(solAmount.toFixed(4)));
  }

  const solBalance = await getSolBalance(activeWallet.publicKey, true);

  if (solBalance < solAmount) {
    recordCopyTrade({
      userId,
      targetWallet: target.target_wallet,
      tokenAddress,
      tokenSymbol: 'TOKEN',
      tradeType: 'BUY',
      amountSol: solAmount,
      targetTx,
      status: 'FAILED',
      errorMessage: `Insufficient SOL balance (${solBalance.toFixed(4)} SOL available)`,
    });

    await notifyUser(
      bot,
      userId,
      `⚠️ *Copy Buy Skipped: Insufficient SOL*\n\n` +
        `👤 *Target:* \`${target.label || formatAddress(target.target_wallet)}\`\n` +
        `🪙 *Token:* \`${formatAddress(tokenAddress)}\`\n` +
        `💰 *Required:* \`${solAmount} SOL\` (You have \`${solBalance.toFixed(4)} SOL\`)`
    );
    return;
  }

  const token = await fetchTokenInfo(tokenAddress);
  const tokenSymbol = token?.symbol || 'TOKEN';
  const slippageBps = target.max_slippage_bps || 500;
  const settings = getUserSettings(userId);
  const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  const quote = await getJupiterQuote(CONFIG.WSOL_MINT, tokenAddress, lamports, slippageBps);

  if (!quote) {
    recordCopyTrade({
      userId,
      targetWallet: target.target_wallet,
      tokenAddress,
      tokenSymbol,
      tradeType: 'BUY',
      amountSol: solAmount,
      targetTx,
      status: 'FAILED',
      errorMessage: 'Jupiter quote unavailable (insufficient pool liquidity)',
    });
    return;
  }

  const imported = importWalletAuto(activeWallet.privateKey);
  const swapResult = await executeJupiterSwap(imported.keypair, quote, {
    priorityFeeLamports,
    slippageBps,
  });

  if (swapResult.success && swapResult.signature) {
    const outEstimate = (parseInt(quote.outAmount) / 10 ** (token?.decimals || 6)).toFixed(2);
    const boughtTokens = parseFloat(outEstimate) || 0;

    recordTrade({
      userId,
      walletAddress: activeWallet.publicKey,
      tokenAddress,
      tokenSymbol,
      tradeType: 'BUY',
      amountSol: solAmount,
      tokenAmount: boughtTokens,
      priceUsd: token?.priceUsd || 0,
      marketCapUsd: token?.marketCap || 0,
      txSignature: swapResult.signature,
    });

    recordCopyTrade({
      userId,
      targetWallet: target.target_wallet,
      tokenAddress,
      tokenSymbol,
      tradeType: 'BUY',
      amountSol: solAmount,
      tokenAmount: boughtTokens,
      targetTx,
      ourTx: swapResult.signature,
      status: 'EXECUTED',
    });

    const targetLabel = target.label ? `${target.label} (\`${formatAddress(target.target_wallet)}\`)` : `\`${formatAddress(target.target_wallet)}\``;

    await notifyUser(
      bot,
      userId,
      `🎯 *Copy Buy Executed!* 🚀\n\n` +
        `👤 *Copied From:* ${targetLabel}\n` +
        `🪙 *Token:* *$${tokenSymbol}*\n` +
        `💰 *Spent:* \`${solAmount} SOL\`\n` +
        `📦 *Est. Received:* ~\`${outEstimate}\` tokens\n` +
        `💵 *Price:* \`${formatCurrency(token?.priceUsd || 0)}\`\n` +
        `💳 *Your Wallet:* \`${formatAddress(activeWallet.publicKey)}\`\n\n` +
        `🔗 *Your Tx:* [View on Solscan](https://solscan.io/tx/${swapResult.signature})\n` +
        `🔗 *Target Tx:* [View on Solscan](https://solscan.io/tx/${targetTx})`,
      new InlineKeyboard()
        .url('🔍 Your Solscan', `https://solscan.io/tx/${swapResult.signature}`)
        .url('🎯 Target Solscan', `https://solscan.io/tx/${targetTx}`)
        .row()
        .text('🖼️ Share PnL Card', `token:pnl:${tokenAddress}`)
        .text('🎯 Trade Dashboard', `token:refresh:${tokenAddress}`)
    );
  } else {
    recordCopyTrade({
      userId,
      targetWallet: target.target_wallet,
      tokenAddress,
      tokenSymbol,
      tradeType: 'BUY',
      amountSol: solAmount,
      targetTx,
      status: 'FAILED',
      errorMessage: swapResult.error || 'Swap execution failed',
    });
  }
}

/**
 * Execute Mirrored Sell for follower
 */
async function executeCopySell(
  bot: Bot<MyContext>,
  target: DBCopyTarget,
  tokenAddress: string,
  targetTx: string,
  percentToSell: number
) {
  const userId = target.user_id;
  let activeWallet = target.follower_wallet ? getWalletByPublicKey(userId, target.follower_wallet) : null;
  if (!activeWallet) {
    activeWallet = getActiveWallet(userId);
  }
  if (!activeWallet) return;

  // Prevent self-selling if target is follower wallet itself
  if (target.target_wallet.trim().toLowerCase() === activeWallet.publicKey.trim().toLowerCase()) {
    return;
  }

  const tokenBal = await getTokenBalance(activeWallet.publicKey, tokenAddress, true);
  if (tokenBal.uiAmount <= 0) {
    // User doesn't hold this token, skip silently
    return;
  }

  const percent = Math.min(100, Math.max(1, Math.round(percentToSell)));
  const rawAmountToSell = (BigInt(tokenBal.amount) * BigInt(percent)) / 100n;
  if (rawAmountToSell <= 0n) return;

  const slippageBps = target.max_slippage_bps || 500;
  const settings = getUserSettings(userId);
  const priorityFeeLamports = Math.floor((settings.priority_fee_sol || 0.001) * LAMPORTS_PER_SOL);

  const quote = await getJupiterQuote(tokenAddress, CONFIG.WSOL_MINT, rawAmountToSell.toString(), slippageBps);
  if (!quote) return;

  const imported = importWalletAuto(activeWallet.privateKey);
  const swapResult = await executeJupiterSwap(imported.keypair, quote, {
    priorityFeeLamports,
    slippageBps,
  });

  const token = await fetchTokenInfo(tokenAddress);
  const tokenSymbol = token?.symbol || 'TOKEN';

  if (swapResult.success && swapResult.signature) {
    const outSol = (parseInt(quote.outAmount) / LAMPORTS_PER_SOL).toFixed(4);
    const soldTokens = tokenBal.uiAmount * (percent / 100);

    recordTrade({
      userId,
      walletAddress: activeWallet.publicKey,
      tokenAddress,
      tokenSymbol,
      tradeType: 'SELL',
      amountSol: parseFloat(outSol) || 0,
      tokenAmount: soldTokens,
      priceUsd: token?.priceUsd || 0,
      marketCapUsd: token?.marketCap || 0,
      txSignature: swapResult.signature,
    });

    recordCopyTrade({
      userId,
      targetWallet: target.target_wallet,
      tokenAddress,
      tokenSymbol,
      tradeType: 'SELL',
      amountSol: parseFloat(outSol) || 0,
      tokenAmount: soldTokens,
      targetTx,
      ourTx: swapResult.signature,
      status: 'EXECUTED',
    });

    const targetLabel = target.label ? `${target.label} (\`${formatAddress(target.target_wallet)}\`)` : `\`${formatAddress(target.target_wallet)}\``;

    await notifyUser(
      bot,
      userId,
      `🎯 *Mirror Sell Executed!* 🚀\n\n` +
        `👤 *Followed Target:* ${targetLabel}\n` +
        `🪙 *Token:* *$${tokenSymbol}*\n` +
        `📦 *Sold:* \`${percent}%\` (~${soldTokens.toFixed(2)} tokens)\n` +
        `💰 *Received:* ~\`${outSol} SOL\`\n` +
        `💵 *Price:* \`${formatCurrency(token?.priceUsd || 0)}\`\n` +
        `💳 *Your Wallet:* \`${formatAddress(activeWallet.publicKey)}\`\n\n` +
        `🔗 *Your Tx:* [View on Solscan](https://solscan.io/tx/${swapResult.signature})\n` +
        `🔗 *Target Tx:* [View on Solscan](https://solscan.io/tx/${targetTx})`,
      new InlineKeyboard()
        .url('🔍 Your Solscan', `https://solscan.io/tx/${swapResult.signature}`)
        .url('🎯 Target Solscan', `https://solscan.io/tx/${targetTx}`)
        .row()
        .text('🖼️ Share PnL Card', `token:pnl:${tokenAddress}`)
        .text('🎯 Trade Dashboard', `token:refresh:${tokenAddress}`)
    );
  }
}

/**
 * Send notification to Telegram user
 */
async function notifyUser(bot: Bot<MyContext>, userId: number, text: string, keyboard?: InlineKeyboard) {
  try {
    await bot.api.sendMessage(userId, text, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error(`Failed to send Copy-Trading notification to user ${userId}:`, err);
  }
}
