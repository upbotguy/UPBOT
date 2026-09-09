import express from 'express';
import cors from 'cors';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CONFIG } from '../config.js';
import {
  getDefaultUserId,
  getUserWallets,
  getActiveWallet,
  setActiveWallet,
  addWallet,
  getWalletByPublicKey,
  removeWallet,
  getUserSettings,
  updateUserSettings,
  getUserLimitOrders,
  createLimitOrder,
  cancelLimitOrder,
  updateLimitOrderDetails,
  recordTrade,
  getUserTokenPosition,
  getUserRecentTrades,
  getUserCopyTargets,
  addCopyTarget,
  toggleCopyTargetStatus,
  deleteCopyTarget,
  getUserCopyTrades,
  getSniperRule,
  updateSniperRule,
  getUserDcaOrders,
  createDcaOrder,
  toggleDcaOrderStatus,
  deleteDcaOrder,
  getUserTrailingOrders,
  createTrailingOrder,
  deleteTrailingOrder,
  DecryptedWallet,
} from '../db/index.js';
import { executeSnipeForToken, checkTokenLaunchSafety } from '../services/sniperEngine.js';
import {
  connection,
  getSolBalance,
  getTokenBalance,
  generateNewWallet,
  importWalletFromPrivateKey,
  importWalletAuto,
  getWalletPortfolio,
  isValidSolanaAddress,
} from '../services/wallet.js';
import { fetchTokenInfo, fetchLiveTokenPrices, searchTokens, getSolPriceUsd, fetchTokenOHLCV } from '../services/token.js';
import { getJupiterQuote, executeJupiterSwap } from '../services/swap.js';
import { generatePnLCard } from '../services/pnlCard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get active wallet and user for Web UI
 */
export function getWebActiveWallet(): { userId: number; activeWallet: DecryptedWallet | null } {
  const userId = getDefaultUserId();
  let activeWallet = getActiveWallet(userId);
  if (!activeWallet) {
    const wallets = getUserWallets(userId);
    if (wallets.length > 0) {
      activeWallet = wallets[0];
      setActiveWallet(userId, activeWallet.publicKey);
    }
  }
  return { userId, activeWallet };
}

export function createWebServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Static files for Web UI
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));

  // --- API Endpoints ---

  /**
   * Status & Active Wallet
   */
  app.get('/api/status', async (req, res) => {
    try {
      const { userId, activeWallet } = getWebActiveWallet();
      const solBalance = activeWallet ? await getSolBalance(activeWallet.publicKey, false) : 0;
      const settings = getUserSettings(userId);

      const walletPayload = activeWallet
        ? {
            publicKey: activeWallet.publicKey,
            balanceSol: solBalance,
            balance: solBalance,
          }
        : null;

      res.json({
        success: true,
        userId,
        activeWallet: walletPayload,
        wallet: walletPayload,
        solBalance,
        settings,
        botUsername: CONFIG.BOT_USERNAME,
        rpcUrl: CONFIG.SOLANA_RPC_URL,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Wallets List
   */
  app.get('/api/wallets', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const wallets = getUserWallets(userId);
      const walletsWithBal = await Promise.all(
        wallets.map(async (w) => ({
          publicKey: w.publicKey,
          isActive: w.isActive,
          balanceSol: await getSolBalance(w.publicKey, false),
        }))
      );
      res.json({ success: true, wallets: walletsWithBal });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Select Active Wallet
   */
  app.post('/api/wallets/select', async (req, res) => {
    try {
      const { publicKey } = req.body;
      const { userId } = getWebActiveWallet();
      const success = setActiveWallet(userId, publicKey);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Create New Wallet
   */
  app.post('/api/wallets/create', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const newW = generateNewWallet();
      const pubkey = newW.keypair.publicKey.toBase58();
      addWallet(userId, pubkey, newW.privateKeyBase58, newW.mnemonic);
      res.json({
        success: true,
        publicKey: pubkey,
        privateKey: newW.privateKeyBase58,
        mnemonic: newW.mnemonic,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Import Wallet (Supports Private Key Base58/Hex/JSON OR 12-24 Words Seed Phrase)
   */
  app.post('/api/wallets/import', async (req, res) => {
    try {
      const input = (req.body.privateKey || req.body.mnemonic || req.body.key || req.body.input || '')?.trim();
      if (!input) {
        return res.status(400).json({ success: false, error: 'Please enter a Private Key or 12-24 words Seed Phrase' });
      }
      const { userId } = getWebActiveWallet();
      const imported = importWalletAuto(input);
      addWallet(userId, imported.publicKey, imported.privateKeyBase58, imported.mnemonic);
      res.json({
        success: true,
        publicKey: imported.publicKey,
        mnemonic: imported.mnemonic,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Invalid Private Key or Seed Phrase' });
    }
  });

  /**
   * Export / Reveal Wallet Keys
   */
  app.post('/api/wallets/export', async (req, res) => {
    try {
      const { publicKey } = req.body;
      if (!publicKey) {
        return res.status(400).json({ success: false, error: 'Public key is required' });
      }
      const { userId } = getWebActiveWallet();
      const wallet = getWalletByPublicKey(userId, publicKey);
      if (!wallet) {
        return res.status(404).json({ success: false, error: 'Wallet not found' });
      }
      res.json({
        success: true,
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Remove / Delete Wallet
   */
  app.delete('/api/wallets/:publicKey', async (req, res) => {
    try {
      const publicKey = req.params.publicKey?.trim();
      if (!publicKey) {
        return res.status(400).json({ success: false, error: 'Public key is required' });
      }
      const { userId } = getWebActiveWallet();
      const wallets = getUserWallets(userId);
      if (wallets.length <= 1) {
        return res.status(400).json({ success: false, error: 'Cannot delete your only wallet. Please import or create another wallet first.' });
      }
      const success = removeWallet(userId, publicKey);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Portfolio Holdings
   */
  app.get('/api/portfolio', async (req, res) => {
    try {
      const queryAddress = (req.query.walletAddress as string)?.trim();
      const { activeWallet } = getWebActiveWallet();
      
      const targetPubkey = queryAddress && isValidSolanaAddress(queryAddress)
        ? queryAddress
        : activeWallet?.publicKey;

      if (!targetPubkey) {
        return res.json({ success: true, portfolio: null, holdings: [] });
      }

      const portfolio = await getWalletPortfolio(targetPubkey);
      const holdings = portfolio.tokens.map((t) => ({
        mint: t.mint,
        symbol: t.symbol,
        name: t.name,
        amount: t.uiAmount,
        uiAmount: t.uiAmount,
        priceUsd: t.priceUsd,
        valueUsd: t.valueUsd,
      }));
      res.json({
        success: true,
        portfolio,
        holdings,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Search Tokens by Name, Symbol, or Address
   */
  app.get('/api/tokens/search', async (req, res) => {
    try {
      const q = ((req.query.q as string) || '').trim();
      if (!q) {
        return res.json({ success: true, tokens: [] });
      }

      // If valid Solana address, directly try fetching info
      if (isValidSolanaAddress(q)) {
        const info = await fetchTokenInfo(q, true);
        if (info) {
          return res.json({
            success: true,
            tokens: [{
              address: info.address,
              name: info.name,
              symbol: info.symbol,
              priceUsd: info.priceUsd,
              marketCap: info.marketCap,
              liquidityUsd: info.liquidityUsd,
              volume24h: info.volume24h,
              image: ''
            }]
          });
        }
      }

      const tokens = await searchTokens(q);
      res.json({ success: true, tokens });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Token Details & Live Position
   */
  app.get('/api/token/:address', async (req, res) => {
    try {
      const address = req.params.address.trim();
      if (!isValidSolanaAddress(address)) {
        return res.status(400).json({ success: false, error: 'Invalid Solana address' });
      }

      const queryAddress = (req.query.walletAddress as string)?.trim();
      const { userId, activeWallet } = getWebActiveWallet();
      
      const targetPubkey = queryAddress && isValidSolanaAddress(queryAddress)
        ? queryAddress
        : activeWallet?.publicKey;

      const [token, tokenBal, solBal, solPriceUsd] = await Promise.all([
        fetchTokenInfo(address, true),
        targetPubkey ? getTokenBalance(targetPubkey, address, false) : Promise.resolve({ uiAmount: 0, decimals: 0, amount: '0' }),
        targetPubkey ? getSolBalance(targetPubkey, false) : Promise.resolve(0),
        getSolPriceUsd(),
      ]);

      if (!token) {
        return res.status(404).json({ success: false, error: 'Token not found on Solana Network' });
      }

      const position = getUserTokenPosition(userId, address, targetPubkey, solPriceUsd);

      res.json({
        success: true,
        token,
        tokenBalance: tokenBal,
        solBalance: solBal,
        solPriceUsd,
        position,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Token OHLCV Candlestick Feed for TradingView Lightweight Charts
   */
  app.get('/api/token/:address/candles', async (req, res) => {
    try {
      const address = req.params.address.trim();
      if (!isValidSolanaAddress(address)) {
        return res.status(400).json({ success: false, error: 'Invalid Solana address' });
      }
      const timeframe = ((req.query.timeframe as string) || (req.query.tf as string) || '15m').trim();
      const candles = await fetchTokenOHLCV(address, timeframe);
      res.json({ success: true, candles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Batch Live Token Prices (for Watchlist)
   */
  app.post('/api/token/live-prices', async (req, res) => {
    try {
      const { addresses } = req.body;
      if (!Array.isArray(addresses) || addresses.length === 0) {
        return res.json({ success: true, prices: {} });
      }
      const pricesMap = await fetchLiveTokenPrices(addresses);
      const prices: Record<string, { priceUsd: number }> = {};
      pricesMap.forEach((val, key) => {
        prices[key] = { priceUsd: val };
      });
      res.json({ success: true, prices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Instant Buy Swap
   */
  app.post('/api/trade/buy', async (req, res) => {
    try {
      const { tokenAddress, solAmount, amountSol, slippageBps = 500, priorityFeeSol = 0.001 } = req.body;
      const rawSol = solAmount !== undefined ? solAmount : amountSol;
      const sol = parseFloat(rawSol);
      const parsedSlippage = parseInt(String(slippageBps), 10) || 500;
      const parsedPriority = parseFloat(String(priorityFeeSol)) || 0.001;

      const { userId, activeWallet } = getWebActiveWallet();

      if (!activeWallet) {
        return res.status(400).json({ success: false, error: 'No active wallet found' });
      }

      if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
        return res.status(400).json({ success: false, error: 'Invalid token address' });
      }

      if (isNaN(sol) || sol <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid SOL buy amount' });
      }

      const solBal = await getSolBalance(activeWallet.publicKey, true);
      if (solBal < sol) {
        return res.status(400).json({ success: false, error: `Insufficient SOL balance (${solBal.toFixed(4)} SOL available)` });
      }

      if (tokenAddress.toLowerCase() === CONFIG.WSOL_MINT.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Cannot swap SOL for SOL. Please select a token from the Watchlist (e.g. BONK, WIF, JUP) or enter a Token CA to trade.',
        });
      }

      const lamports = Math.floor(sol * LAMPORTS_PER_SOL);
      const quote = await getJupiterQuote(CONFIG.WSOL_MINT, tokenAddress, lamports, parsedSlippage);

      if (!quote) {
        return res.status(400).json({ success: false, error: 'Jupiter Quote unavailable (insufficient pool liquidity or high price impact)' });
      }

      const imported = importWalletAuto(activeWallet.privateKey);
      const priorityFeeLamports = Math.floor(parsedPriority * LAMPORTS_PER_SOL);

      const swapResult = await executeJupiterSwap(imported.keypair, quote, {
        priorityFeeLamports,
        slippageBps: parsedSlippage,
      });

      if (swapResult.success && swapResult.signature) {
        const [token, solPriceUsd] = await Promise.all([
          fetchTokenInfo(tokenAddress),
          getSolPriceUsd(),
        ]);
        const decimals = token?.decimals ?? 6;
        const rawBought = parseInt(quote.outAmount) / 10 ** decimals;
        const boughtTokens = rawBought > 0 ? rawBought : (parseFloat(quote.outAmount) / 1e6);
        const outEstimate = boughtTokens.toLocaleString();

        // Calculate true executed price from SOL spent
        const executedPriceUsd = boughtTokens > 0 ? (solAmount * solPriceUsd) / boughtTokens : (token?.priceUsd || 0);
        const executedMc = token?.priceUsd && token.priceUsd > 0
          ? (executedPriceUsd / token.priceUsd) * (token.marketCap || 0)
          : (token?.marketCap || 0);

        recordTrade({
          userId,
          walletAddress: activeWallet.publicKey,
          tokenAddress,
          tokenSymbol: token?.symbol || 'TOKEN',
          tradeType: 'BUY',
          amountSol: solAmount,
          tokenAmount: boughtTokens,
          priceUsd: executedPriceUsd,
          marketCapUsd: executedMc,
          txSignature: swapResult.signature,
        });

        res.json({
          success: true,
          signature: swapResult.signature,
          outEstimate,
          tokenSymbol: token?.symbol || 'TOKEN',
        });
      } else {
        res.status(400).json({ success: false, error: swapResult.error || 'Transaction failed' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Instant Sell Swap
   */
  app.post('/api/trade/sell', async (req, res) => {
    try {
      const { tokenAddress, percent = 100, slippageBps = 500, priorityFeeSol = 0.001 } = req.body;
      const parsedSlippage = parseInt(String(slippageBps), 10) || 500;
      const parsedPriority = parseFloat(String(priorityFeeSol)) || 0.001;
      const parsedPercent = Math.min(100, Math.max(1, parseFloat(String(percent)) || 100));

      const { userId, activeWallet } = getWebActiveWallet();

      if (!activeWallet) {
        return res.status(400).json({ success: false, error: 'No active wallet found' });
      }

      if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
        return res.status(400).json({ success: false, error: 'Invalid token address' });
      }

      const tokenBal = await getTokenBalance(activeWallet.publicKey, tokenAddress, true);
      if (tokenBal.uiAmount <= 0) {
        return res.status(400).json({ success: false, error: 'No token balance in wallet' });
      }

      const rawAmountToSell = (BigInt(tokenBal.amount) * BigInt(Math.floor(parsedPercent))) / 100n;
      if (rawAmountToSell <= 0n) {
        return res.status(400).json({ success: false, error: 'Amount to sell is zero' });
      }

      const quote = await getJupiterQuote(tokenAddress, CONFIG.WSOL_MINT, rawAmountToSell.toString(), parsedSlippage);

      if (!quote) {
        return res.status(400).json({ success: false, error: 'Jupiter Quote unavailable (insufficient pool liquidity or high price impact)' });
      }

      const imported = importWalletAuto(activeWallet.privateKey);
      const priorityFeeLamports = Math.floor(parsedPriority * LAMPORTS_PER_SOL);

      const swapResult = await executeJupiterSwap(imported.keypair, quote, {
        priorityFeeLamports,
        slippageBps: parsedSlippage,
      });

      if (swapResult.success && swapResult.signature) {
        const [token, solPriceUsd] = await Promise.all([
          fetchTokenInfo(tokenAddress),
          getSolPriceUsd(),
        ]);
        const outSol = (parseInt(quote.outAmount) / LAMPORTS_PER_SOL).toFixed(4);
        const outSolNum = parseFloat(outSol) || (parseInt(quote.outAmount) / LAMPORTS_PER_SOL);
        const soldTokens = tokenBal.uiAmount * (parsedPercent / 100);

        // Real execution price on sell
        const executedPriceUsd = soldTokens > 0 ? (outSolNum * solPriceUsd) / soldTokens : (token?.priceUsd || 0);
        const executedMc = token?.priceUsd && token.priceUsd > 0
          ? (executedPriceUsd / token.priceUsd) * (token.marketCap || 0)
          : (token?.marketCap || 0);

        recordTrade({
          userId,
          walletAddress: activeWallet.publicKey,
          tokenAddress,
          tokenSymbol: token?.symbol || 'TOKEN',
          tradeType: 'SELL',
          amountSol: outSolNum,
          tokenAmount: soldTokens,
          priceUsd: executedPriceUsd,
          marketCapUsd: executedMc,
          txSignature: swapResult.signature,
        });

        res.json({
          success: true,
          signature: swapResult.signature,
          outSol,
          tokenSymbol: token?.symbol || 'TOKEN',
        });
      } else {
        res.status(400).json({ success: false, error: swapResult.error || 'Transaction failed' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Limit Orders List
   */
  app.get('/api/orders', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const orders = getUserLimitOrders(userId);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Create Limit Order
   */
  app.post('/api/orders/create', async (req, res) => {
    try {
      const {
        tokenAddress,
        tokenSymbol,
        orderType,
        targetPriceUsd,
        condition,
        amountSol,
        amountPercent,
        slippageBps,
      } = req.body;

      const { userId, activeWallet } = getWebActiveWallet();

      if (!activeWallet) {
        return res.status(400).json({ success: false, error: 'No active wallet found' });
      }

      const order = createLimitOrder({
        userId,
        walletAddress: activeWallet.publicKey,
        tokenAddress,
        tokenSymbol: tokenSymbol || 'TOKEN',
        orderType,
        targetPriceUsd,
        condition,
        amountSol: amountSol || null,
        amountPercent: amountPercent || null,
        slippageBps: slippageBps ? parseInt(slippageBps, 10) : 500,
      });

      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Cancel Limit Order
   */
  app.post('/api/orders/cancel/:id', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { userId } = getWebActiveWallet();
      const success = cancelLimitOrder(userId, orderId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Update Limit Order (Drag-and-drop on chart or edit)
   */
  app.post('/api/orders/update/:id', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { targetPriceUsd, condition, amountSol, amountPercent } = req.body;
      const { userId } = getWebActiveWallet();

      const success = updateLimitOrderDetails(userId, orderId, {
        targetPriceUsd: targetPriceUsd !== undefined ? parseFloat(targetPriceUsd) : undefined,
        condition,
        amountSol: amountSol !== undefined ? parseFloat(amountSol) : undefined,
        amountPercent: amountPercent !== undefined ? parseFloat(amountPercent) : undefined,
      });

      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Recent Trade History
   */
  app.get('/api/trades', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const trades = getUserRecentTrades(userId, 30);
      res.json({ success: true, trades });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Copy Trading Targets List
   */
  app.get('/api/copy/targets', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const targets = getUserCopyTargets(userId);
      res.json({ success: true, targets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Add Copy Trading Target
   */
  app.post('/api/copy/targets', async (req, res) => {
    try {
      const {
        targetWallet,
        label,
        buyAmountSol = 0.1,
        mirrorSell = 1,
        maxSlippageBps = 500,
        buyMode = 'FIXED',
        buyPercent = 10,
        maxSolCap = 1.0,
        followerWallet,
      } = req.body;
      const { userId, activeWallet } = getWebActiveWallet();

      if (!targetWallet || !isValidSolanaAddress(targetWallet)) {
        return res.status(400).json({ success: false, error: 'Invalid Solana wallet address' });
      }

      const sol = parseFloat(buyAmountSol) || 0.1;
      const pct = parseFloat(buyPercent) || 10;
      const cap = maxSolCap !== null && maxSolCap !== undefined && maxSolCap !== '' ? parseFloat(maxSolCap) : null;
      const mode = buyMode === 'PERCENT' ? 'PERCENT' : 'FIXED';
      const selectedFollower = followerWallet || activeWallet?.publicKey || null;

      const target = addCopyTarget(
        userId,
        targetWallet,
        label,
        sol,
        mirrorSell ? 1 : 0,
        parseInt(maxSlippageBps, 10) || 500,
        mode,
        pct,
        cap,
        selectedFollower
      );

      res.json({ success: true, target });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Toggle Copy Target Active/Pause
   */
  app.post('/api/copy/targets/:id/toggle', async (req, res) => {
    try {
      const targetId = parseInt(req.params.id, 10);
      const { userId } = getWebActiveWallet();
      const success = toggleCopyTargetStatus(userId, targetId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Delete Copy Target
   */
  app.delete('/api/copy/targets/:id', async (req, res) => {
    try {
      const targetId = parseInt(req.params.id, 10);
      const { userId } = getWebActiveWallet();
      const success = deleteCopyTarget(userId, targetId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Copy Trading History
   */
  app.get('/api/copy/history', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const history = getUserCopyTrades(userId, 30);
      res.json({ success: true, history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Download PnL Card Image
   */
  app.get('/api/pnl-card/:address', async (req, res) => {
    try {
      const address = req.params.address.trim();
      const { userId, activeWallet } = getWebActiveWallet();

      const [token, tokenBal, solPriceUsd] = await Promise.all([
        fetchTokenInfo(address, true),
        activeWallet ? getTokenBalance(activeWallet.publicKey, address, true) : Promise.resolve({ uiAmount: 0 }),
        getSolPriceUsd(),
      ]);

      if (!token) {
        return res.status(404).send('Token not found');
      }

      const position = getUserTokenPosition(userId, address, activeWallet?.publicKey, solPriceUsd);
      const entryPrice = position && position.avgEntryPriceUsd > 0 ? position.avgEntryPriceUsd : token.priceUsd;
      const entryMc = position && position.avgEntryMarketCap > 0 ? position.avgEntryMarketCap : token.marketCap;
      const pnlPercent = entryPrice > 0 ? ((token.priceUsd - entryPrice) / entryPrice) * 100 : 0;
      const holdingTokens = tokenBal.uiAmount || position?.currentHoldingTokens || 0;
      const profitUsd = (token.priceUsd - entryPrice) * holdingTokens;

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
        botUsername: CONFIG.BOT_USERNAME || 'sol_quickbot',
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="${token.symbol}_pnl.png"`);
      res.send(pngBuffer);
    } catch (err: any) {
      res.status(500).send(`Error generating PnL Card: ${err.message}`);
    }
  });

  /**
   * User Settings
   */
  app.get('/api/settings', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const settings = getUserSettings(userId);
      res.json({ success: true, settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { slippageBps, priorityFeeSol } = req.body;
      const { userId } = getWebActiveWallet();
      updateUserSettings(userId, slippageBps, undefined, priorityFeeSol);
      const updated = getUserSettings(userId);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * DCA (Dollar-Cost Averaging) Endpoints
   */
  app.get('/api/dca', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const orders = getUserDcaOrders(userId);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/dca', async (req, res) => {
    try {
      const { tokenAddress, tokenSymbol, amountSol, intervalHours, totalCycles } = req.body;
      if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
        return res.status(400).json({ success: false, error: 'Invalid token address' });
      }
      const sol = parseFloat(amountSol);
      const interval = parseFloat(intervalHours);
      const cycles = parseInt(totalCycles, 10);

      if (isNaN(sol) || sol <= 0) return res.status(400).json({ success: false, error: 'Invalid amount SOL' });
      if (isNaN(interval) || interval <= 0) return res.status(400).json({ success: false, error: 'Invalid interval hours' });
      if (isNaN(cycles) || cycles <= 0) return res.status(400).json({ success: false, error: 'Invalid total cycles' });

      const { userId } = getWebActiveWallet();
      const order = createDcaOrder(userId, tokenAddress, tokenSymbol || 'TOKEN', sol, interval, cycles);
      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/dca/:id/toggle', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { userId } = getWebActiveWallet();
      const success = toggleDcaOrderStatus(userId, orderId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/dca/:id', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { userId } = getWebActiveWallet();
      const success = deleteDcaOrder(userId, orderId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Trailing Stop-Loss Endpoints
   */
  app.get('/api/trailing', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const orders = getUserTrailingOrders(userId);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/trailing', async (req, res) => {
    try {
      const { tokenAddress, tokenSymbol, initialPriceUsd, trailingPct, amountPercent } = req.body;
      if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
        return res.status(400).json({ success: false, error: 'Invalid token address' });
      }
      const price = parseFloat(initialPriceUsd);
      const trail = parseFloat(trailingPct);
      const pct = parseFloat(amountPercent) || 100;

      if (isNaN(price) || price <= 0) return res.status(400).json({ success: false, error: 'Invalid initial price' });
      if (isNaN(trail) || trail <= 0 || trail >= 100) return res.status(400).json({ success: false, error: 'Trailing % must be between 1 and 99' });

      const { userId } = getWebActiveWallet();
      const order = createTrailingOrder(userId, tokenAddress, tokenSymbol || 'TOKEN', price, trail, pct);
      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/trailing/:id', async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { userId } = getWebActiveWallet();
      const success = deleteTrailingOrder(userId, orderId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Token Launch Sniper Endpoints
   */
  app.get('/api/sniper', async (req, res) => {
    try {
      const { userId } = getWebActiveWallet();
      const rule = getSniperRule(userId);
      res.json({ success: true, rule });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sniper', async (req, res) => {
    try {
      const {
        isActive,
        buyAmountSol,
        minLiquidityUsd,
        maxLiquidityUsd,
        takeProfitPct,
        stopLossPct,
        rugFilter,
      } = req.body;

      const { userId } = getWebActiveWallet();
      const updated = updateSniperRule(userId, {
        isActive: isActive !== undefined ? !!isActive : undefined,
        buyAmountSol: buyAmountSol !== undefined ? parseFloat(buyAmountSol) : undefined,
        minLiquidityUsd: minLiquidityUsd !== undefined ? parseFloat(minLiquidityUsd) : undefined,
        maxLiquidityUsd: maxLiquidityUsd !== undefined ? parseFloat(maxLiquidityUsd) : undefined,
        takeProfitPct: takeProfitPct !== undefined ? parseFloat(takeProfitPct) : undefined,
        stopLossPct: stopLossPct !== undefined ? parseFloat(stopLossPct) : undefined,
        rugFilter: rugFilter !== undefined ? !!rugFilter : undefined,
      });

      res.json({ success: true, rule: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sniper/manual-snipe', async (req, res) => {
    try {
      const { tokenAddress } = req.body;
      if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
        return res.status(400).json({ success: false, error: 'Invalid token address' });
      }

      const result = await executeSnipeForToken(tokenAddress);
      res.json({ success: result.success, executedCount: result.executedCount, errors: result.errors });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Extension Wallet Balance
   */
  app.get('/api/wallet/extension-balance', async (req, res) => {
    try {
      const publicKey = (req.query.publicKey as string)?.trim();
      const tokenAddress = (req.query.tokenAddress as string)?.trim();

      if (!publicKey || !isValidSolanaAddress(publicKey)) {
        return res.status(400).json({ success: false, error: 'Invalid Solana public key' });
      }

      const solBalance = await getSolBalance(publicKey);
      let tokenBalance = { amount: '0', decimals: 6, uiAmount: 0 };
      if (tokenAddress && isValidSolanaAddress(tokenAddress)) {
        tokenBalance = await getTokenBalance(publicKey, tokenAddress, true);
      }

      res.json({
        success: true,
        solBalance,
        tokenBalance,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Build Jupiter Swap Transaction for Browser Extension (Phantom / Solflare)
   */
  app.post('/api/trade/build-swap-tx', async (req, res) => {
    try {
      const {
        userPublicKey,
        tokenAddress,
        tradeType,
        amountSol,
        percent,
        slippageBps = 500,
        priorityFeeSol = 0.001,
      } = req.body;

      if (!userPublicKey || !isValidSolanaAddress(userPublicKey)) {
        return res.status(400).json({ success: false, error: 'Invalid or missing user public key' });
      }

      if (!tokenAddress || !isValidSolanaAddress(tokenAddress)) {
        return res.status(400).json({ success: false, error: 'Invalid token address' });
      }

      let inputMint = CONFIG.WSOL_MINT;
      let outputMint = tokenAddress;
      let amountLamports = '0';

      if (tradeType === 'BUY') {
        const solAmount = parseFloat(amountSol);
        if (!solAmount || solAmount <= 0) {
          return res.status(400).json({ success: false, error: 'Invalid SOL buy amount' });
        }
        inputMint = CONFIG.WSOL_MINT;
        outputMint = tokenAddress;
        amountLamports = Math.floor(solAmount * LAMPORTS_PER_SOL).toString();
      } else if (tradeType === 'SELL') {
        const tokenBal = await getTokenBalance(userPublicKey, tokenAddress, true);
        if (tokenBal.uiAmount <= 0) {
          return res.status(400).json({ success: false, error: 'No token balance in connected wallet' });
        }
        const sellPct = Math.min(100, Math.max(1, parseFloat(percent) || 100));
        const rawAmountToSell = (BigInt(tokenBal.amount) * BigInt(Math.floor(sellPct))) / 100n;
        if (rawAmountToSell <= 0n) {
          return res.status(400).json({ success: false, error: 'Amount to sell is zero' });
        }
        inputMint = tokenAddress;
        outputMint = CONFIG.WSOL_MINT;
        amountLamports = rawAmountToSell.toString();
      } else {
        return res.status(400).json({ success: false, error: 'Invalid tradeType. Must be BUY or SELL.' });
      }

      if (inputMint.toLowerCase() === outputMint.toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Cannot swap SOL for SOL. Please select a token from the Watchlist (e.g. BONK, WIF, JUP) or enter a Token CA to trade.',
        });
      }

      const quote = await getJupiterQuote(inputMint, outputMint, amountLamports, slippageBps);
      if (!quote) {
        return res.status(400).json({ success: false, error: 'Jupiter Quote unavailable (insufficient pool liquidity or high price impact)' });
      }

      const priorityFeeLamports = Math.floor(priorityFeeSol * LAMPORTS_PER_SOL);
      const prioritizationFeeConfig = priorityFeeLamports > 0 ? priorityFeeLamports : {
        priorityLevelWithMaxLamports: {
          maxLamports: 10000000,
          priorityLevel: 'veryHigh',
        },
      };

      const swapReqBody = {
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: prioritizationFeeConfig,
      };

      const swapRes = await axios.post(CONFIG.JUPITER_SWAP_API, swapReqBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      const { swapTransaction } = swapRes.data;
      if (!swapTransaction) {
        return res.status(400).json({ success: false, error: 'Failed to build transaction from Jupiter' });
      }

      const solPriceUsd = await getSolPriceUsd();

      res.json({
        success: true,
        quote,
        swapTransaction,
        solPriceUsd,
      });
    } catch (err: any) {
      console.error('Error building swap tx for extension:', err?.response?.data || err.message);
      res.status(500).json({ success: false, error: err?.response?.data?.message || err.message });
    }
  });

  /**
   * Broadcast Raw Signed Transaction from Extension Wallet
   */
  app.post('/api/trade/send-raw-tx', async (req, res) => {
    try {
      const { rawTransactionBase64 } = req.body;
      if (!rawTransactionBase64) {
        return res.status(400).json({ success: false, error: 'Missing raw transaction data' });
      }

      const rawBuffer = Buffer.from(rawTransactionBase64, 'base64');
      const signature = await connection.sendRawTransaction(rawBuffer, {
        skipPreflight: true,
        maxRetries: 3,
      });

      res.json({
        success: true,
        signature,
      });
    } catch (err: any) {
      console.error('Error broadcasting raw transaction:', err);
      res.status(500).json({ success: false, error: err?.message || 'Transaction broadcast failed' });
    }
  });

  /**
   * Record Extension Trade to DB for PnL & History
   */
  app.post('/api/trade/record-external-trade', async (req, res) => {
    try {
      const {
        walletAddress,
        tokenAddress,
        tokenSymbol,
        tradeType,
        amountSol,
        tokenAmount,
        priceUsd,
        marketCapUsd,
        txSignature,
      } = req.body;

      const { userId } = getWebActiveWallet();
      const parsedSol = parseFloat(amountSol) || 0;
      let parsedTokens = parseFloat(tokenAmount) || 0;
      let parsedPrice = parseFloat(priceUsd) || 0;
      let parsedMc = parseFloat(marketCapUsd) || 0;

      const solPriceUsd = await getSolPriceUsd();

      // Ensure exact execution price calculation if SOL and tokens are present
      if (parsedSol > 0 && parsedTokens > 0) {
        parsedPrice = (parsedSol * solPriceUsd) / parsedTokens;
      }

      recordTrade({
        userId,
        walletAddress,
        tokenAddress,
        tokenSymbol: tokenSymbol || 'TOKEN',
        tradeType: tradeType || 'BUY',
        amountSol: parsedSol,
        tokenAmount: parsedTokens,
        priceUsd: parsedPrice,
        marketCapUsd: parsedMc,
        txSignature: txSignature || '',
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Fallback to index.html for SPA
  app.use((req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

/**
 * Start the Express web server with auto-fallback if port is occupied
 */
export function startWebServer(initialPort = CONFIG.PORT || 3000) {
  const app = createWebServer();

  function tryListen(portToTry: number): any {
    const server = app.listen(portToTry, () => {
      console.log(`\n======================================================`);
      console.log(`UPBOT AI Web Trading Terminal is LIVE!`);
      console.log(`Open in your browser: http://localhost:${portToTry}`);
      console.log(`======================================================\n`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Port Conflict] Port ${portToTry} is already in use by another application.`);
        const nextPort = portToTry + 1;
        console.log(`[Auto-Switch] Automatically attempting to start on port ${nextPort}...`);
        tryListen(nextPort);
      } else {
        console.error('[Web Server Error]', err);
      }
    });

    return server;
  }

  return tryListen(initialPort);
}
