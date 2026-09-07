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
  getUserSettings,
  updateUserSettings,
  getUserLimitOrders,
  createLimitOrder,
  cancelLimitOrder,
  updateLimitOrderDetails,
  recordTrade,
  getUserTokenPosition,
  getUserRecentTrades,
  DecryptedWallet,
} from '../db/index.js';
import {
  getSolBalance,
  getTokenBalance,
  generateNewWallet,
  importWalletFromPrivateKey,
  importWalletAuto,
  getWalletPortfolio,
  isValidSolanaAddress,
} from '../services/wallet.js';
import { fetchTokenInfo, fetchLiveTokenPrices } from '../services/token.js';
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
      const solBalance = activeWallet ? await getSolBalance(activeWallet.publicKey, true) : 0;
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
          balanceSol: await getSolBalance(w.publicKey, true),
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
        mnemonic: newW.mnemonic,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /**
   * Import Wallet
   */
  app.post('/api/wallets/import', async (req, res) => {
    try {
      const { privateKey } = req.body;
      if (!privateKey) {
        return res.status(400).json({ success: false, error: 'Private key is required' });
      }
      const { userId } = getWebActiveWallet();
      const imported = importWalletFromPrivateKey(privateKey);
      addWallet(userId, imported.publicKey, privateKey);
      res.json({ success: true, publicKey: imported.publicKey });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /**
   * Portfolio Holdings
   */
  app.get('/api/portfolio', async (req, res) => {
    try {
      const { activeWallet } = getWebActiveWallet();
      if (!activeWallet) {
        return res.json({ success: true, portfolio: null, holdings: [] });
      }
      const portfolio = await getWalletPortfolio(activeWallet.publicKey);
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
   * Token Details & Live Position
   */
  app.get('/api/token/:address', async (req, res) => {
    try {
      const address = req.params.address.trim();
      if (!isValidSolanaAddress(address)) {
        return res.status(400).json({ success: false, error: 'Invalid Solana address' });
      }

      const { userId, activeWallet } = getWebActiveWallet();

      const [token, tokenBal, solBal] = await Promise.all([
        fetchTokenInfo(address, true),
        activeWallet ? getTokenBalance(activeWallet.publicKey, address, true) : Promise.resolve({ uiAmount: 0, decimals: 0, amount: '0' }),
        activeWallet ? getSolBalance(activeWallet.publicKey, true) : Promise.resolve(0),
      ]);

      if (!token) {
        return res.status(404).json({ success: false, error: 'Token not found on Solana Network' });
      }

      const position = getUserTokenPosition(userId, address, activeWallet?.publicKey);

      res.json({
        success: true,
        token,
        tokenBalance: tokenBal,
        solBalance: solBal,
        position,
      });
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
        const token = await fetchTokenInfo(tokenAddress);
        const outEstimate = (parseInt(quote.outAmount) / 1e6).toFixed(2);
        const boughtTokens = parseFloat(outEstimate) || (parseInt(quote.outAmount) / 10 ** (token?.decimals || 6));

        recordTrade({
          userId,
          walletAddress: activeWallet.publicKey,
          tokenAddress,
          tokenSymbol: token?.symbol || 'TOKEN',
          tradeType: 'BUY',
          amountSol: solAmount,
          tokenAmount: boughtTokens,
          priceUsd: token?.priceUsd || 0,
          marketCapUsd: token?.marketCap || 0,
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
        const token = await fetchTokenInfo(tokenAddress);
        const outSol = (parseInt(quote.outAmount) / LAMPORTS_PER_SOL).toFixed(4);
        const soldTokens = tokenBal.uiAmount * (percent / 100);

        recordTrade({
          userId,
          walletAddress: activeWallet.publicKey,
          tokenAddress,
          tokenSymbol: token?.symbol || 'TOKEN',
          tradeType: 'SELL',
          amountSol: parseFloat(outSol) || 0,
          tokenAmount: soldTokens,
          priceUsd: token?.priceUsd || 0,
          marketCapUsd: token?.marketCap || 0,
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
   * Download PnL Card Image
   */
  app.get('/api/pnl-card/:address', async (req, res) => {
    try {
      const address = req.params.address.trim();
      const { userId, activeWallet } = getWebActiveWallet();

      const [token, tokenBal] = await Promise.all([
        fetchTokenInfo(address, true),
        activeWallet ? getTokenBalance(activeWallet.publicKey, address, true) : Promise.resolve({ uiAmount: 0 }),
      ]);

      if (!token) {
        return res.status(404).send('Token not found');
      }

      const position = getUserTokenPosition(userId, address, activeWallet?.publicKey);
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
        botUsername: 'MyanBotAi_bot',
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

      res.json({
        success: true,
        quote,
        swapTransaction,
      });
    } catch (err: any) {
      console.error('Error building swap tx for extension:', err?.response?.data || err.message);
      res.status(500).json({ success: false, error: err?.response?.data?.message || err.message });
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

      recordTrade({
        userId,
        walletAddress,
        tokenAddress,
        tokenSymbol: tokenSymbol || 'TOKEN',
        tradeType: tradeType || 'BUY',
        amountSol: parseFloat(amountSol) || 0,
        tokenAmount: parseFloat(tokenAmount) || 0,
        priceUsd: parseFloat(priceUsd) || 0,
        marketCapUsd: parseFloat(marketCapUsd) || 0,
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
 * Start the Express web server
 */
export function startWebServer(port = CONFIG.PORT || 3000) {
  const app = createWebServer();
  return app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🌐 MYAN BOT AI Web Trading Terminal is LIVE!`);
    console.log(`👉 Open in your browser: http://localhost:${port}`);
    console.log(`======================================================\n`);
  });
}
