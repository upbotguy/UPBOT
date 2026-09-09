import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { CONFIG } from '../config.js';
import { fetchTokenInfo, fetchLiveTokenPrices, TokenInfo } from './token.js';

// Leaky-bucket / Sliding-window Rate Limiter for Solana RPC requests
// Strictly limits outbound calls to 7 req/sec (Helius free tier limit is 10 req/sec)
class RpcRateLimiter {
  private queue: Array<() => void> = [];
  private timestamps: number[] = [];
  private readonly maxRequestsPerSecond = 7;
  private isProcessing = false;

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await fn();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      // Keep only timestamps within the last 1000ms window
      this.timestamps = this.timestamps.filter((t) => now - t < 1000);

      if (this.timestamps.length >= this.maxRequestsPerSecond) {
        const oldest = this.timestamps[0];
        const waitTime = Math.max(1050 - (now - oldest), 50);
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      const next = this.queue.shift();
      if (next) {
        this.timestamps.push(Date.now());
        next();
        // 70ms minimum gap to prevent network bursts
        await new Promise((r) => setTimeout(r, 70));
      }
    }

    this.isProcessing = false;
  }
}

export const rpcLimiter = new RpcRateLimiter();

// Custom rate-limited fetch for @solana/web3.js Connection
const rateLimitedRpcFetch = async (url: any, options: any) => {
  return rpcLimiter.schedule(async () => {
    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      try {
        const res = await fetch(url, options);
        if (res.status === 429) {
          const backoff = 600 * attempts + Math.floor(Math.random() * 200);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        return res;
      } catch (err) {
        if (attempts >= 3) throw err;
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    return fetch(url, options);
  });
};

export const connection = new Connection(CONFIG.SOLANA_RPC_URL, {
  commitment: 'confirmed',
  fetch: rateLimitedRpcFetch,
  confirmTransactionInitialTimeout: 35000,
});

/**
 * Generate a brand new Solana Keypair
 */
export function generateNewWallet(): { keypair: Keypair; mnemonic: string; privateKeyBase58: string } {
  const mnemonic = bip39.generateMnemonic();
  const seed = bip39.mnemonicToSeedSync(mnemonic, '');
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedSeed);
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  return {
    keypair,
    mnemonic,
    privateKeyBase58,
  };
}

/**
 * Import a Solana Keypair from Base58 (sol_88), Hex (sol_128), or JSON array private key string
 */
export function importWalletFromPrivateKey(privateKeyStr: string): { keypair: Keypair; publicKey: string; privateKeyBase58: string } {
  let trimmed = privateKeyStr.trim().replace(/^["']|["']$/g, '');
  let secretKey: Uint8Array;

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const arr = JSON.parse(trimmed);
      secretKey = Uint8Array.from(arr);
    } catch {
      throw new Error('Invalid JSON array format for private key');
    }
  } else if (/^[0-9a-fA-F]{64}$/.test(trimmed) || /^[0-9a-fA-F]{128}$/.test(trimmed)) {
    // Hex encoded private key (sol_128)
    secretKey = Uint8Array.from(Buffer.from(trimmed, 'hex'));
  } else {
    // Standard Base58 encoded private key (sol_88)
    try {
      secretKey = bs58.decode(trimmed);
    } catch {
      throw new Error('Invalid Solana private key (Base58 decoding failed)');
    }
  }

  if (secretKey.length !== 64 && secretKey.length !== 32) {
    throw new Error('Invalid Solana private key length (must be 32 or 64 bytes)');
  }
  const keypair = secretKey.length === 64 ? Keypair.fromSecretKey(secretKey) : Keypair.fromSeed(secretKey);
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    privateKeyBase58,
  };
}

/**
 * Import a Solana Keypair from 12 or 24 words mnemonic phrase
 */
export function importWalletFromMnemonic(mnemonic: string): { keypair: Keypair; publicKey: string; mnemonic: string; privateKeyBase58: string } {
  const normalized = mnemonic.trim().toLowerCase().replace(/[\r\n,]+/g, ' ').replace(/\s+/g, ' ');
  if (!bip39.validateMnemonic(normalized)) {
    throw new Error('Invalid seed phrase / mnemonic (words or checksum incorrect)');
  }

  const seed = bip39.mnemonicToSeedSync(normalized, '');
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedSeed);
  const privateKeyBase58 = bs58.encode(keypair.secretKey);

  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    mnemonic: normalized,
    privateKeyBase58,
  };
}

/**
 * Auto-detect input type (Private Key or Mnemonic) and return Keypair
 */
export function importWalletAuto(input: string): { keypair: Keypair; publicKey: string; mnemonic: string | null; privateKeyBase58: string } {
  const cleaned = input.trim().replace(/^["']|["']$/g, '');
  const words = cleaned.replace(/[\r\n,]+/g, ' ').replace(/\s+/g, ' ').split(' ');

  if (words.length >= 12 && words.length <= 24) {
    const res = importWalletFromMnemonic(cleaned);
    return {
      keypair: res.keypair,
      publicKey: res.publicKey,
      mnemonic: res.mnemonic,
      privateKeyBase58: res.privateKeyBase58,
    };
  } else {
    const res = importWalletFromPrivateKey(cleaned);
    return {
      keypair: res.keypair,
      publicKey: res.publicKey,
      mnemonic: null,
      privateKeyBase58: res.privateKeyBase58,
    };
  }
}

const solBalanceCache = new Map<string, { balance: number; timestamp: number }>();
const tokenBalanceCache = new Map<string, { data: { uiAmount: number; decimals: number; amount: string }; timestamp: number }>();
const inFlightSolBalance = new Map<string, Promise<number>>();
const inFlightTokenBalance = new Map<string, Promise<{ uiAmount: number; decimals: number; amount: string }>>();
const BALANCE_CACHE_TTL_MS = 8000; // 8s cache to safely avoid RPC 429

/**
 * Fetch SOL Balance for a public key with caching and in-flight deduplication
 */
export async function getSolBalance(publicKeyStr: string, forceRefresh = false): Promise<number> {
  const cached = solBalanceCache.get(publicKeyStr);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL_MS) {
    return cached.balance;
  }

  // Deduplicate simultaneous requests for same public key
  if (!forceRefresh && inFlightSolBalance.has(publicKeyStr)) {
    return inFlightSolBalance.get(publicKeyStr)!;
  }

  const fetchPromise = (async () => {
    try {
      const pubkey = new PublicKey(publicKeyStr);
      const balanceLamports = await connection.getBalance(pubkey);
      const bal = balanceLamports / LAMPORTS_PER_SOL;
      solBalanceCache.set(publicKeyStr, { balance: bal, timestamp: Date.now() });
      return bal;
    } catch (error) {
      if (cached) return cached.balance;
      console.error(`Error fetching SOL balance for ${publicKeyStr}:`, error);
      return 0;
    } finally {
      inFlightSolBalance.delete(publicKeyStr);
    }
  })();

  inFlightSolBalance.set(publicKeyStr, fetchPromise);
  return fetchPromise;
}

/**
 * Fetch SPL Token balance for a given wallet and token mint with caching and in-flight deduplication
 */
export async function getTokenBalance(
  walletAddress: string,
  tokenMintAddress: string,
  forceRefresh = false
): Promise<{ uiAmount: number; decimals: number; amount: string }> {
  const cacheKey = `${walletAddress}:${tokenMintAddress}`;
  const cached = tokenBalanceCache.get(cacheKey);

  if (!forceRefresh && cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL_MS) {
    return cached.data;
  }

  if (!forceRefresh && inFlightTokenBalance.has(cacheKey)) {
    return inFlightTokenBalance.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const walletPubkey = new PublicKey(walletAddress);
      const mintPubkey = new PublicKey(tokenMintAddress);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
        mint: mintPubkey,
      });

      if (tokenAccounts.value.length === 0) {
        // Check Token-2022 Program if standard query returns empty
        try {
          const token2022Accounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
            mint: mintPubkey,
            programId: TOKEN_2022_PROGRAM_ID,
          });
          if (token2022Accounts.value.length > 0) {
            const accountInfo = token2022Accounts.value[0].account.data.parsed.info.tokenAmount;
            const res = {
              uiAmount: accountInfo.uiAmount || 0,
              decimals: accountInfo.decimals || 0,
              amount: accountInfo.amount || '0',
            };
            tokenBalanceCache.set(cacheKey, { data: res, timestamp: Date.now() });
            return res;
          }
        } catch {}

        const zero = { uiAmount: 0, decimals: 0, amount: '0' };
        tokenBalanceCache.set(cacheKey, { data: zero, timestamp: Date.now() });
        return zero;
      }

      const accountInfo = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
      const res = {
        uiAmount: accountInfo.uiAmount || 0,
        decimals: accountInfo.decimals || 0,
        amount: accountInfo.amount || '0',
      };
      tokenBalanceCache.set(cacheKey, { data: res, timestamp: Date.now() });
      return res;
    } catch (error) {
      if (cached) return cached.data;
      console.error(`Error fetching token balance:`, error);
      return { uiAmount: 0, decimals: 0, amount: '0' };
    } finally {
      inFlightTokenBalance.delete(cacheKey);
    }
  })();

  inFlightTokenBalance.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Shorten public address for UI display (e.g. 7xKh...3aBp)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Validate Solana Public Key
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address.trim());
    return true;
  } catch {
    return false;
  }
}

export interface PortfolioItem {
  mint: string;
  symbol: string;
  name: string;
  uiAmount: number;
  priceUsd: number;
  valueUsd: number;
}

export interface WalletPortfolio {
  solBalance: number;
  solPriceUsd: number;
  solValueUsd: number;
  tokens: PortfolioItem[];
  totalValueUsd: number;
  walletAddress?: string;
}

const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

const portfolioCache = new Map<string, { data: WalletPortfolio; timestamp: number }>();
const inFlightPortfolio = new Map<string, Promise<WalletPortfolio>>();

/**
 * Fetch complete token holdings / portfolio for a wallet address with caching and in-flight deduplication
 */
export async function getWalletPortfolio(walletAddress: string, forceRefresh = false): Promise<WalletPortfolio> {
  const cached = portfolioCache.get(walletAddress);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL_MS) {
    return cached.data;
  }

  if (!forceRefresh && inFlightPortfolio.has(walletAddress)) {
    return inFlightPortfolio.get(walletAddress)!;
  }

  const fetchPromise = (async () => {
    const pubkey = new PublicKey(walletAddress);
    const [solBalance, solTokenInfo] = await Promise.all([
      getSolBalance(walletAddress, forceRefresh),
      fetchTokenInfo('So11111111111111111111111111111111111111112'),
    ]);

    const solPriceUsd = solTokenInfo?.priceUsd || 0;
    const solValueUsd = solBalance * solPriceUsd;

  try {
    // Query both legacy SPL Token Program and modern Token-2022 Program in parallel
    const [standardRes, token2022Res] = await Promise.allSettled([
      connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: TOKEN_PROGRAM_ID,
      }),
      connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: TOKEN_2022_PROGRAM_ID,
      }),
    ]);

    const allAccounts: any[] = [];
    if (standardRes.status === 'fulfilled' && standardRes.value?.value) {
      allAccounts.push(...standardRes.value.value);
    }
    if (token2022Res.status === 'fulfilled' && token2022Res.value?.value) {
      allAccounts.push(...token2022Res.value.value);
    }

    const nonZeroAccounts = allAccounts.filter((a) => {
      const amount = a.account.data.parsed?.info?.tokenAmount?.uiAmount;
      return amount && amount > 0;
    });

    if (nonZeroAccounts.length === 0) {
      return {
        solBalance,
        solPriceUsd,
        solValueUsd,
        tokens: [],
        totalValueUsd: solValueUsd,
        walletAddress,
      };
    }

    // Batch query live prices for all held tokens via Jupiter / DexScreener
    const mintList = nonZeroAccounts.map((a) => a.account.data.parsed.info.mint as string);
    const livePrices = await fetchLiveTokenPrices(mintList);

    const tokenPromises = nonZeroAccounts.map(async (acc) => {
      const parsedInfo = acc.account.data.parsed.info;
      const mint = parsedInfo.mint as string;
      const uiAmount = (parsedInfo.tokenAmount.uiAmount as number) || 0;
      
      let tokenInfo: TokenInfo | null = null;
      try {
        tokenInfo = await fetchTokenInfo(mint);
      } catch {}

      const symbol = tokenInfo?.symbol && tokenInfo.symbol !== 'UNKNOWN' ? tokenInfo.symbol : mint.slice(0, 4).toUpperCase();
      const name = tokenInfo?.name && tokenInfo.name !== 'Unknown' ? tokenInfo.name : symbol;
      const priceUsd = livePrices.get(mint) || tokenInfo?.priceUsd || 0;
      const valueUsd = uiAmount * priceUsd;

      return {
        mint,
        symbol,
        name,
        uiAmount,
        priceUsd,
        valueUsd,
      };
    });

    const tokens = await Promise.all(tokenPromises);
    tokens.sort((a, b) => b.valueUsd - a.valueUsd);

    const totalTokenValueUsd = tokens.reduce((sum, t) => sum + t.valueUsd, 0);
    const totalValueUsd = solValueUsd + totalTokenValueUsd;

    const result: WalletPortfolio = {
      solBalance,
      solPriceUsd,
      solValueUsd,
      tokens,
      totalValueUsd,
      walletAddress,
    };
    portfolioCache.set(walletAddress, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('Error fetching wallet portfolio:', error);
    const fallback: WalletPortfolio = {
      solBalance,
      solPriceUsd,
      solValueUsd,
      tokens: [],
      totalValueUsd: solValueUsd,
      walletAddress,
    };
    if (cached) return cached.data;
    return fallback;
  } finally {
    inFlightPortfolio.delete(walletAddress);
  }
  })();

  inFlightPortfolio.set(walletAddress, fetchPromise);
  return fetchPromise;
}

