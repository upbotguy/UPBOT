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
import { connection, importWalletAuto, getTokenBalance, getSolBalance, formatAddress } from './wallet.js';
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

/**
 * Start the Copy-Trading Engine
 */
export function startCopyEngine(bot: Bot<MyContext>, pollIntervalMs = 2500) {
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

    // 1. Anti-Spam Security: Target wallet MUST be a signer/initiator of the transaction
    const accountKeys = (parsedTx.transaction.message as any).accountKeys || [];
    const isTargetSigner = accountKeys.some((k: any, idx: number) => {
      const pub = typeof k === 'string' ? k : k.pubkey?.toBase58?.() || String(k);
      const isSigner = typeof k === 'object' ? (k.signer === true || k.isSigner === true) : idx === 0;
      return pub === targetWallet && isSigner;
    });

    // If target wallet is NOT a signer, this is an unsolicited inbound transfer/spam airdrop from an external wallet. SKIP!
    if (!isTargetSigner) {
      return;
    }

    const preTokenBalances = parsedTx.meta.preTokenBalances || [];
    const postTokenBalances = parsedTx.meta.postTokenBalances || [];

    // 2. Calculate target SOL/WSOL actually spent on DEX
    let targetSpentSol = 0;
    try {
      const targetIdx = accountKeys.findIndex((k: any) => {
        const pub = typeof k === 'string' ? k : k.pubkey?.toBase58?.() || String(k);
        return pub === targetWallet;
      });
      if (targetIdx >= 0 && parsedTx.meta.preBalances && parsedTx.meta.postBalances) {
        const preLamports = parsedTx.meta.preBalances[targetIdx] || 0;
        const postLamports = parsedTx.meta.postBalances[targetIdx] || 0;
        if (preLamports > postLamports) {
          const diff = (preLamports - postLamports) / LAMPORTS_PER_SOL;
          if (diff > 0.0005) { // Above standard tx fee
            targetSpentSol = diff;
          }
        }
      }
    } catch {}

    // Check WSOL decrease if swap was executed using wrapped SOL
    try {
      const preWsol = preTokenBalances.find(p => p.owner === targetWallet && p.mint.toLowerCase() === CONFIG.WSOL_MINT.toLowerCase());
      const postWsol = postTokenBalances.find(p => p.owner === targetWallet && p.mint.toLowerCase() === CONFIG.WSOL_MINT.toLowerCase());
      if (preWsol && postWsol) {
        const wsolDelta = parseFloat(preWsol.uiTokenAmount.uiAmountString || '0') - parseFloat(postWsol.uiTokenAmount.uiAmountString || '0');
        if (wsolDelta > 0.0005) {
          targetSpentSol = Math.max(targetSpentSol, wsolDelta);
        }
      }
    } catch {}

    // 3. Verify that this is a genuine DEX interaction
    const DEX_PROGRAM_IDS = new Set([
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium V4
      'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C', // Raydium CPMM
      'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
      '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P', // Pump.fun
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter V6
      'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB', // Jupiter V4
      'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca
      'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // Meteora DLMM
      'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB', // Meteora Pools
      'MoonCVVNZFSYkqNXP6bxHLPL6QQJiMagDL3qcqUQTrG', // Moonshot
    ]);

    const isDexTx = accountKeys.some((k: any) => {
      const pub = typeof k === 'string' ? k : k.pubkey?.toBase58?.() || String(k);
      return DEX_PROGRAM_IDS.has(pub);
    }) || (parsedTx.meta.logMessages || []).some(log => 
      log.toLowerCase().includes('instruction: swap') ||
      log.toLowerCase().includes('instruction: buy') ||
      log.toLowerCase().includes('program 6EF8r') ||
      log.toLowerCase().includes('program 675k')
    );

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
        // Target received tokens. Must be a genuine DEX Buy with spent SOL!
        if (!isDexTx && targetSpentSol <= 0.001) {
          // Unsolicited token transfer or non-DEX airdrop without SOL expenditure -> SKIP!
          continue;
        }

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

  // Strict sizing calculation: Handle PERCENT mode without fallbacks
  if (target.buy_mode === 'PERCENT') {
    if (targetSpentSol <= 0.0005) {
      console.log(`[Copy Engine] Skipping copy buy: Target spent negligible SOL (${targetSpentSol} SOL)`);
      return;
    }
    const pct = target.buy_percent || 10;
    solAmount = (targetSpentSol * pct) / 100;
    if (target.max_sol_cap && target.max_sol_cap > 0) {
      solAmount = Math.min(solAmount, target.max_sol_cap);
    }
    solAmount = Math.max(0.001, parseFloat(solAmount.toFixed(4)));
  } else {
    // FIXED mode: Enforce max_sol_cap if set
    if (target.max_sol_cap && target.max_sol_cap > 0) {
      solAmount = Math.min(solAmount, target.max_sol_cap);
    }
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
