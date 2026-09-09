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

    let pair = solanaPairs.length > 0 ? solanaPairs[0] : response.data.pairs[0];

    // For Native/Wrapped SOL, find pair against USDC or USDT with highest liquidity
    if (trimmed.toLowerCase() === 'so11111111111111111111111111111111111111112') {
      const solUsdcPair = solanaPairs.find(
        (p: any) =>
          (p.baseToken?.address?.toLowerCase() === trimmed.toLowerCase() &&
            ['usdc', 'usdt'].includes((p.quoteToken?.symbol || '').toLowerCase())) ||
          (p.quoteToken?.address?.toLowerCase() === trimmed.toLowerCase() &&
            ['usdc', 'usdt'].includes((p.baseToken?.symbol || '').toLowerCase()))
      );
      if (solUsdcPair) {
        pair = solUsdcPair;
      }
    }

    const isBaseToken = pair.baseToken?.address?.toLowerCase() === trimmed.toLowerCase();
    const tokenMeta = isBaseToken ? pair.baseToken : pair.quoteToken;

    let priceUsd = parseFloat(pair.priceUsd || '0');
    if (!isBaseToken && parseFloat(pair.priceNative || '0') > 0) {
      priceUsd = parseFloat(pair.priceUsd || '1') / parseFloat(pair.priceNative || '1');
    }

    const tokenInfo: TokenInfo = {
      address: trimmed,
      name: tokenMeta.name || (trimmed.toLowerCase() === 'so11111111111111111111111111111111111111112' ? 'Solana' : 'Unknown'),
      symbol: tokenMeta.symbol || (trimmed.toLowerCase() === 'so11111111111111111111111111111111111111112' ? 'SOL' : 'UNKNOWN'),
      priceUsd,
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
 * Fetch high-speed real-time token prices using Jupiter Price API (v2 / v6) with DexScreener fallback.
 * Returns a Map of tokenAddress -> priceUsd.
 */
export async function fetchLiveTokenPrices(tokenAddresses: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>();
  if (tokenAddresses.length === 0) return priceMap;

  const uniqueAddrs = Array.from(new Set(tokenAddresses.map((a) => a.trim())));

  // 1. Try Jupiter Price API v2 (ultra-fast sub-second real-time routing price)
  try {
    const ids = uniqueAddrs.join(',');
    const jupRes = await axios.get(`https://api.jup.ag/price/v2?ids=${ids}`, { timeout: 3000 });
    if (jupRes.data && jupRes.data.data) {
      for (const addr of uniqueAddrs) {
        const item = jupRes.data.data[addr];
        if (item && item.price) {
          const p = parseFloat(item.price);
          if (!isNaN(p) && p > 0) {
            priceMap.set(addr, p);
          }
        }
      }
    }
  } catch (jupErr: any) {
    // Fallback: Try Jupiter v6 price API
    try {
      const ids = uniqueAddrs.join(',');
      const jupV6Res = await axios.get(`https://price.jup.ag/v6/price?ids=${ids}`, { timeout: 3000 });
      if (jupV6Res.data && jupV6Res.data.data) {
        for (const addr of uniqueAddrs) {
          const item = jupV6Res.data.data[addr];
          if (item && item.price) {
            const p = typeof item.price === 'number' ? item.price : parseFloat(item.price);
            if (!isNaN(p) && p > 0) {
              priceMap.set(addr, p);
            }
          }
        }
      }
    } catch {}
  }

  // 2. For any tokens not found on Jupiter (e.g. brand new pump tokens), query DexScreener
  const missingAddrs = uniqueAddrs.filter((a) => !priceMap.has(a));
  if (missingAddrs.length > 0) {
    await Promise.all(
      missingAddrs.map(async (addr) => {
        try {
          const info = await fetchTokenInfo(addr, true);
          if (info && info.priceUsd > 0) {
            priceMap.set(addr, info.priceUsd);
          }
        } catch {}
      })
    );
  }

  return priceMap;
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

/**
 * Search tokens via DexScreener API with Solana filter
 */
export async function searchTokens(query: string): Promise<any[]> {
  const cleanQ = query.trim().replace(/^[$#]/, '');
  if (!cleanQ) return [];

  try {
    const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(cleanQ)}`;
    const res = await axios.get(url, { timeout: 4000 });
    const pairs = (res.data?.pairs || []).filter((p: any) => p.chainId === 'solana');
    const seen = new Set<string>();
    const tokens: any[] = [];

    for (const p of pairs) {
      const addr = p.baseToken?.address;
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        tokens.push({
          address: addr,
          name: p.baseToken.name || 'Unknown',
          symbol: p.baseToken.symbol || 'TOKEN',
          priceUsd: parseFloat(p.priceUsd || '0'),
          marketCap: p.marketCap || p.fdv || 0,
          liquidityUsd: p.liquidity?.usd || 0,
          volume24h: p.volume?.h24 || 0,
          image: p.info?.imageUrl || ''
        });
      }
      if (tokens.length >= 8) break;
    }

    return tokens;
  } catch (err: any) {
    console.warn('Search tokens error:', err.message);
    return [];
  }
}

/**
 * Fetch live SOL price in USD (with fallback)
 */
export async function getSolPriceUsd(): Promise<number> {
  try {
    const solInfo = await fetchTokenInfo('So11111111111111111111111111111111111111112');
    if (solInfo && solInfo.priceUsd > 0) {
      return solInfo.priceUsd;
    }
  } catch {}
  return 102.75;
}
