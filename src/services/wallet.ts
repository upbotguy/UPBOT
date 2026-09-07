import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { CONFIG } from '../config.js';
import { fetchTokenInfo, fetchLiveTokenPrices, TokenInfo } from './token.js';

export const connection = new Connection(CONFIG.SOLANA_RPC_URL, 'confirmed');

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
export function importWalletFromPrivateKey(privateKeyStr: string): { keypair: Keypair; publicKey: string } {
  const trimmed = privateKeyStr.trim();
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
  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
  };
}

/**
 * Import a Solana Keypair from 12 or 24 words mnemonic phrase
 */
export function importWalletFromMnemonic(mnemonic: string): { keypair: Keypair; publicKey: string; mnemonic: string } {
  const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!bip39.validateMnemonic(normalized)) {
    throw new Error('Invalid seed phrase / mnemonic');
  }

  const seed = bip39.mnemonicToSeedSync(normalized, '');
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
  const keypair = Keypair.fromSeed(derivedSeed);

  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    mnemonic: normalized,
  };
}

/**
 * Auto-detect input type (Private Key or Mnemonic) and return Keypair
 */
export function importWalletAuto(input: string): { keypair: Keypair; publicKey: string; mnemonic: string | null } {
  const trimmed = input.trim();
  const words = trimmed.split(/\s+/);

  if (words.length >= 12 && words.length <= 24) {
    const res = importWalletFromMnemonic(trimmed);
    return {
      keypair: res.keypair,
      publicKey: res.publicKey,
      mnemonic: res.mnemonic,
    };
  } else {
    const res = importWalletFromPrivateKey(trimmed);
    return {
      keypair: res.keypair,
      publicKey: res.publicKey,
      mnemonic: null,
    };
  }
}

const solBalanceCache = new Map<string, { balance: number; timestamp: number }>();
const tokenBalanceCache = new Map<string, { data: { uiAmount: number; decimals: number; amount: string }; timestamp: number }>();
const BALANCE_CACHE_TTL_MS = 2000; // 2s fast balance cache

/**
 * Fetch SOL Balance for a public key
 */
export async function getSolBalance(publicKeyStr: string, forceRefresh = false): Promise<number> {
  const cached = solBalanceCache.get(publicKeyStr);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL_MS) {
    return cached.balance;
  }

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
  }
}

/**
 * Fetch SPL Token balance for a given wallet and token mint
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

  try {
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(tokenMintAddress);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPubkey, {
      mint: mintPubkey,
    });

    if (tokenAccounts.value.length === 0) {
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
  }
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

/**
 * Fetch complete token holdings / portfolio for a wallet address
 */
export async function getWalletPortfolio(walletAddress: string): Promise<WalletPortfolio> {
  const pubkey = new PublicKey(walletAddress);
  const [solBalance, solTokenInfo] = await Promise.all([
    getSolBalance(walletAddress, true),
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

    return {
      solBalance,
      solPriceUsd,
      solValueUsd,
      tokens,
      totalValueUsd,
      walletAddress,
    };
  } catch (error) {
    console.error('Error fetching wallet portfolio:', error);
    return {
      solBalance,
      solPriceUsd,
      solValueUsd,
      tokens: [],
      totalValueUsd: solValueUsd,
      walletAddress,
    };
  }
}

