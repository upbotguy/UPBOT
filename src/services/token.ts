import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { connection } from './wallet.js';

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  priceUsd: number;
  priceNative: number;
  marketCap: number;
  fdv: number;
  liquidityUsd: number;
  volume24h: number;
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  txns24h: {
    buys: number;
    sells: number;
  };
  dexId: string;
  pairAddress: string;
  url: string;
  decimals?: number;
}

interface CachedToken {
  data: TokenInfo;
  timestamp: number;
}

const tokenCache = new Map<string, CachedToken>();
const TOKEN_CACHE_TTL_MS = 3000; // 3 seconds fast cache

/**
 * Fetch detailed token information from DexScreener API with in-memory cache
 */
export async function fetchTokenInfo(tokenAddress: string, forceRefresh = false): Promise<TokenInfo | null> {
  const trimmed = tokenAddress.trim();
  const cached = tokenCache.get(trimmed);

  if (!forceRefresh && cached && Date.now() - cached.timestamp < TOKEN_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${trimmed}`;
    const response = await axios.get(url, { timeout: 5000 });

    if (!response.data || !response.data.pairs || response.data.pairs.length === 0) {
      // Fallback: Check on-chain if token exists
      return await fetchOnChainTokenInfo(trimmed);
    }

    // Filter Solana pairs and pick highest liquidity pair
    const solanaPairs = response.data.pairs
      .filter((p: any) => p.chainId === 'solana')
      .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    const pair = solanaPairs.length > 0 ? solanaPairs[0] : response.data.pairs[0];

    const isBaseToken = pair.baseToken?.address?.toLowerCase() === trimmed.toLowerCase();
    const tokenMeta = isBaseToken ? pair.baseToken : pair.quoteToken;

    const tokenInfo: TokenInfo = {
      address: trimmed,
      name: tokenMeta.name || 'Unknown',
      symbol: tokenMeta.symbol || 'UNKNOWN',
      priceUsd: parseFloat(pair.priceUsd || '0'),
      priceNative: parseFloat(pair.priceNative || '0'),
      marketCap: pair.marketCap || pair.fdv || 0,
      fdv: pair.fdv || 0,
      liquidityUsd: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      priceChange: {
        m5: pair.priceChange?.m5 || 0,
        h1: pair.priceChange?.h1 || 0,
        h6: pair.priceChange?.h6 || 0,
        h24: pair.priceChange?.h24 || 0,
      },
      txns24h: {
        buys: pair.txns?.h24?.buys || 0,
        sells: pair.txns?.h24?.sells || 0,
      },
      dexId: pair.dexId || 'Solana DEX',
      pairAddress: pair.pairAddress || '',
      url: pair.url || `https://dexscreener.com/solana/${trimmed}`,
    };

    tokenCache.set(trimmed, { data: tokenInfo, timestamp: Date.now() });
    return tokenInfo;
  } catch (error) {
    if (cached) return cached.data; // Return stale cache if error occurs
    console.error(`Error fetching DexScreener token info for ${tokenAddress}:`, error);
    return await fetchOnChainTokenInfo(tokenAddress);
  }
}

/**
 * On-chain fallback if not listed yet on DexScreener
 */
async function fetchOnChainTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
  try {
    const pubkey = new PublicKey(tokenAddress);
    const accountInfo = await connection.getParsedAccountInfo(pubkey);

    if (!accountInfo.value) return null;

    const data = accountInfo.value.data as any;
    const decimals = data?.parsed?.info?.decimals ?? 9;

    return {
      address: tokenAddress,
      name: 'Solana Token',
      symbol: tokenAddress.slice(0, 4).toUpperCase(),
      priceUsd: 0,
      priceNative: 0,
      marketCap: 0,
      fdv: 0,
      liquidityUsd: 0,
      volume24h: 0,
      priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 },
      txns24h: { buys: 0, sells: 0 },
      dexId: 'Raydium/Solana',
      pairAddress: '',
      url: `https://dexscreener.com/solana/${tokenAddress}`,
      decimals,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to format large numbers (e.g. $1.2M, $45.6K)
 */
export function formatCurrency(num: number): string {
  if (!num || isNaN(num)) return '$0.00';
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  if (num < 0.00001) return `$${num.toExponential(4)}`;
  if (num < 0.01) return `$${num.toFixed(6)}`;
  return `$${num.toFixed(4)}`;
}

/**
 * Helper to format percentage change with emoji
 */
export function formatChange(val: number): string {
  if (val > 0) return `🟢 +${val.toFixed(2)}%`;
  if (val < 0) return `🔴 ${val.toFixed(2)}%`;
  return `⚪ 0.00%`;
}
