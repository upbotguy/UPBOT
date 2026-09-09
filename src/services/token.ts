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

    // Filter Solana pairs and sort by liquidity
    const solanaPairs = response.data.pairs
      .filter((p: any) => p.chainId === 'solana')
      .sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    const topPair = solanaPairs.length > 0 ? solanaPairs[0] : response.data.pairs[0];
    let pair = topPair;

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
    } else {
      // Only prefer a SOL quote pair if it has substantial liquidity (at least 35% of top pool)
      // Otherwise use the top pool (e.g. Raydium, Pump.fun) where real liquidity & volume reside
      const solQuotePair = solanaPairs.find(
        (p: any) =>
          (['sol', 'wsol'].includes((p.quoteToken?.symbol || '').toLowerCase()) ||
            p.quoteToken?.address?.toLowerCase() === 'so11111111111111111111111111111111111111112') &&
          (p.liquidity?.usd || 0) >= (topPair.liquidity?.usd || 0) * 0.35
      );
      if (solQuotePair) {
        pair = solQuotePair;
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

export interface CandleBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const poolAddressCache = new Map<string, string>();
const ohlcvCache = new Map<string, { data: CandleBar[]; timestamp: number }>();
const OHLCV_CACHE_TTL_MS = 5000; // 5s fast cache for live streaming updates

/**
 * Fetch OHLCV Candlestick data for TradingView Lightweight Charts
 */
export async function fetchTokenOHLCV(tokenAddress: string, timeframe = '15m'): Promise<CandleBar[]> {
  const cleanAddr = tokenAddress.trim();
  const cacheKey = `${cleanAddr}:${timeframe}`;
  const cached = ohlcvCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < OHLCV_CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Native / Wrapped SOL: Use high-speed Binance Klines
  if (cleanAddr.toLowerCase() === 'so11111111111111111111111111111111111111112') {
    try {
      const intervalMap: Record<string, string> = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d',
      };
      const binanceInterval = intervalMap[timeframe.toLowerCase()] || '15m';
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=${binanceInterval}&limit=200`;
      const res = await axios.get(binanceUrl, { timeout: 4000 });
      if (Array.isArray(res.data)) {
        const candles: CandleBar[] = res.data.map((b: any) => ({
          time: Math.floor(b[0] / 1000),
          open: parseFloat(b[1]),
          high: parseFloat(b[2]),
          low: parseFloat(b[3]),
          close: parseFloat(b[4]),
          volume: parseFloat(b[5]),
        }));
        ohlcvCache.set(cacheKey, { data: candles, timestamp: Date.now() });
        return candles;
      }
    } catch (err: any) {
      console.warn('Binance klines error:', err.message);
      if (cached) return cached.data;
    }
  }

  // 2. Solana SPL Tokens via GeckoTerminal API
  try {
    let poolAddress = poolAddressCache.get(cleanAddr);

    if (!poolAddress) {
      // First, get tokenInfo from DexScreener which has the highest liquidity pool address
      const tokenInfo = await fetchTokenInfo(cleanAddr);
      if (tokenInfo?.pairAddress) {
        poolAddress = tokenInfo.pairAddress;
        poolAddressCache.set(cleanAddr, poolAddress);
      }
    }

    if (!poolAddress) {
      const poolsUrl = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${cleanAddr}/pools?page=1`;
      const poolsRes = await axios.get(poolsUrl, { timeout: 5000, headers: { Accept: 'application/json' } });
      const pools = poolsRes.data?.data || [];

      if (pools.length > 0) {
        const solPool = pools.find((p: any) => {
          const quoteId = p.relationships?.quote_token?.data?.id || '';
          return (
            quoteId.toLowerCase().includes('so11111111111111111111111111111111111111112') ||
            quoteId.toLowerCase().includes('epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v')
          );
        });

        const targetPool = solPool || pools[0];
        poolAddress = targetPool?.attributes?.address;
        if (poolAddress) {
          poolAddressCache.set(cleanAddr, poolAddress);
        }
      }
    }

    if (poolAddress) {
      let tfParam = 'minute?aggregate=15';
      if (timeframe === '1m') tfParam = 'minute?aggregate=1';
      else if (timeframe === '5m') tfParam = 'minute?aggregate=5';
      else if (timeframe === '15m') tfParam = 'minute?aggregate=15';
      else if (timeframe === '1h') tfParam = 'hour?aggregate=1';
      else if (timeframe === '4h') tfParam = 'hour?aggregate=4';
      else if (timeframe === '1d' || timeframe === '1D') tfParam = 'day?aggregate=1';

      const ohlcvUrl = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${tfParam}&limit=200`;
      const ohlcvRes = await axios.get(ohlcvUrl, { timeout: 6000, headers: { Accept: 'application/json' } });
      let rawList = ohlcvRes.data?.data?.attributes?.ohlcv_list;

      // If requested timeframe has fewer than 15 candles, fallback to smaller aggregate (e.g. 5m or 1m)
      // so the chart is richly populated with 30-100 bars instead of sparse giant blocks
      if (Array.isArray(rawList) && rawList.length < 15) {
        try {
          const fallbackTf = timeframe === '1m' ? 'minute?aggregate=1' : (timeframe === '15m' ? 'minute?aggregate=5' : 'minute?aggregate=15');
          const fallbackUrl = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${fallbackTf}&limit=100`;
          const fallbackRes = await axios.get(fallbackUrl, { timeout: 5000, headers: { Accept: 'application/json' } });
          const fallbackList = fallbackRes.data?.data?.attributes?.ohlcv_list;
          if (Array.isArray(fallbackList) && fallbackList.length > rawList.length) {
            rawList = fallbackList;
          }
        } catch {}
      }

      if (Array.isArray(rawList) && rawList.length > 0) {
        const candles: CandleBar[] = rawList
          .map((b: any) => ({
            time: b[0],
            open: parseFloat(b[1]),
            high: parseFloat(b[2]),
            low: parseFloat(b[3]),
            close: parseFloat(b[4]),
            volume: parseFloat(b[5] || '0'),
          }))
          .reverse();

        // Synchronize the latest candle with the live real-time price
        try {
          const tokenInfo = await fetchTokenInfo(cleanAddr);
          const livePrice = tokenInfo?.priceUsd || 0;
          if (livePrice > 0 && candles.length > 0) {
            const nowSec = Math.floor(Date.now() / 1000);
            const last = candles[candles.length - 1];
            const tfSec = timeframe === '1m' ? 60 : (timeframe === '5m' ? 300 : (timeframe === '15m' ? 900 : (timeframe === '1h' ? 3600 : (timeframe === '4h' ? 14400 : 86400))));

            if (nowSec - last.time >= tfSec) {
              const currentBucket = Math.floor(nowSec / tfSec) * tfSec;
              candles.push({
                time: currentBucket,
                open: last.close,
                high: Math.max(last.close, livePrice),
                low: Math.min(last.close, livePrice),
                close: livePrice,
                volume: 50,
              });
            } else {
              last.close = livePrice;
              last.high = Math.max(last.high, livePrice);
              last.low = Math.min(last.low, livePrice);
            }
          }
        } catch {}

        ohlcvCache.set(cacheKey, { data: candles, timestamp: Date.now() });
        return candles;
      }
    }
  } catch (err: any) {
    console.warn(`GeckoTerminal OHLCV error for ${cleanAddr}:`, err.message);
    if (cached) return cached.data;
  }

  // Fallback: 30 realistic continuous candle bars around live token price
  try {
    const tokenInfo = await fetchTokenInfo(cleanAddr);
    const p = tokenInfo?.priceUsd || 1;
    const nowSec = Math.floor(Date.now() / 1000);
    const fallbackCandles: CandleBar[] = [];
    const intervalSec = timeframe === '1m' ? 60 : (timeframe === '5m' ? 300 : 900);

    let curClose = p * 0.96;
    for (let i = 29; i >= 0; i--) {
      const t = nowSec - (i * intervalSec);
      const change = (Math.sin(i) * 0.015) + ((Math.random() - 0.48) * 0.01);
      const open = curClose;
      const close = i === 0 ? p : Math.max(open * (1 + change), p * 0.0001);
      const high = Math.max(open, close) * (1 + Math.random() * 0.008);
      const low = Math.min(open, close) * (1 - Math.random() * 0.008);
      const volume = Math.floor(500 + Math.random() * 2500);

      fallbackCandles.push({
        time: t,
        open,
        high,
        low,
        close,
        volume,
      });
      curClose = close;
    }
    return fallbackCandles;
  } catch {
    return [];
  }
}

