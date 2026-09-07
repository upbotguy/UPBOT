import { Resvg } from '@resvg/resvg-js';
import { formatCurrency } from './token.js';

export interface PnLCardData {
  tokenSymbol: string;
  tokenName: string;
  pnlPercent: number;
  entryPriceUsd: number;
  currentPriceUsd: number;
  entryMarketCapUsd: number;
  currentMarketCapUsd: number;
  spentSol?: number;
  profitSol?: number;
  profitUsd?: number;
  holdingTokens?: number;
  currentValueUsd?: number;
  walletAddress?: string;
  botUsername?: string;
}

/**
 * Generate a high-DPI 1200x675 PNG buffer for a PnL Card
 */
export async function generatePnLCard(data: PnLCardData): Promise<Buffer> {
  const isProfit = data.pnlPercent >= 0;
  const primaryColor = isProfit ? '#00FFA3' : '#FF3B30';
  const secondaryColor = isProfit ? '#14F195' : '#FF453A';
  const sign = isProfit ? '+' : '';
  const pnlPercentStr = `${sign}${data.pnlPercent.toFixed(2)}%`;
  
  const multiplier = data.entryPriceUsd > 0 ? (data.currentPriceUsd / data.entryPriceUsd).toFixed(2) : '1.00';
  const multiplierStr = `${multiplier}x`;

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const entryPriceFormatted = formatCurrency(data.entryPriceUsd);
  const currentPriceFormatted = formatCurrency(data.currentPriceUsd);
  const entryMcFormatted = formatCurrency(data.entryMarketCapUsd);
  const currentMcFormatted = formatCurrency(data.currentMarketCapUsd);
  const profitUsdFormatted = data.profitUsd !== undefined ? `${data.profitUsd >= 0 ? '+' : ''}${formatCurrency(data.profitUsd)}` : 'N/A';
  const profitSolFormatted = data.profitSol !== undefined ? `${data.profitSol >= 0 ? '+' : ''}${data.profitSol.toFixed(3)} SOL` : '';

  const svg = `
  <svg width="1200" height="675" viewBox="0 0 1200 675" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradients -->
      <linearGradient id="bg-grad" x1="0" y1="0" x2="1200" y2="675" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#080C14"/>
        <stop offset="50%" stop-color="#0B1220"/>
        <stop offset="100%" stop-color="#05080E"/>
      </linearGradient>

      <!-- Glow radial filters -->
      <radialGradient id="solana-glow" cx="0.9" cy="0.1" r="0.8">
        <stop offset="0%" stop-color="#9945FF" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#9945FF" stop-opacity="0"/>
      </radialGradient>

      <radialGradient id="pnl-glow" cx="0.2" cy="0.8" r="0.8">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
      </radialGradient>

      <!-- PnL Badge Gradient -->
      <linearGradient id="pnl-badge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.08"/>
      </linearGradient>

      <!-- Glass Card Gradient -->
      <linearGradient id="card-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1E293B" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#0F172A" stop-opacity="0.8"/>
      </linearGradient>
    </defs>

    <!-- Background Base -->
    <rect width="1200" height="675" fill="url(#bg-grad)"/>
    <rect width="1200" height="675" fill="url(#solana-glow)"/>
    <rect width="1200" height="675" fill="url(#pnl-glow)"/>

    <!-- Subtle Cyber Grid -->
    <g opacity="0.06" stroke="#FFFFFF" stroke-width="1">
      <line x1="0" y1="135" x2="1200" y2="135"/>
      <line x1="0" y1="270" x2="1200" y2="270"/>
      <line x1="0" y1="405" x2="1200" y2="405"/>
      <line x1="0" y1="540" x2="1200" y2="540"/>
      <line x1="240" y1="0" x2="240" y2="675"/>
      <line x1="480" y1="0" x2="480" y2="675"/>
      <line x1="720" y1="0" x2="720" y2="675"/>
      <line x1="960" y1="0" x2="960" y2="675"/>
    </g>

    <!-- Outer Border -->
    <rect x="24" y="24" width="1152" height="627" rx="28" stroke="#334155" stroke-width="2" fill="none" opacity="0.6"/>

    <!-- Top Header -->
    <g id="header">
      <rect x="60" y="55" width="46" height="46" rx="14" fill="#14F195" fill-opacity="0.15" stroke="#14F195" stroke-width="1.5"/>
      <text x="83" y="85" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="#14F195" text-anchor="middle">⚡</text>

      <text x="120" y="76" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="22" fill="#FFFFFF" letter-spacing="1">MYAN BOT AI</text>
      <text x="120" y="96" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="13" fill="#94A3B8" letter-spacing="2">SOLANA HIGH-SPEED TRADING</text>

      <!-- Date Badge -->
      <rect x="990" y="55" width="150" height="42" rx="21" fill="#1E293B" fill-opacity="0.7" stroke="#334155" stroke-width="1"/>
      <text x="1065" y="81" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="14" fill="#94A3B8" text-anchor="middle">📅 ${dateStr}</text>
    </g>

    <!-- Token Title Section -->
    <g id="token-info">
      <text x="60" y="175" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="44" fill="#FFFFFF">$${data.tokenSymbol}</text>
      <text x="60" y="205" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="18" fill="#64748B">${data.tokenName.slice(0, 30)}</text>
    </g>

    <!-- Giant PnL Display Badge -->
    <g id="pnl-hero">
      <rect x="60" y="235" width="520" height="150" rx="24" fill="url(#pnl-badge)" stroke="${primaryColor}" stroke-width="2.5"/>
      
      <text x="90" y="275" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="${primaryColor}" letter-spacing="2">TOTAL RETURN (PNL)</text>
      
      <!-- PnL Number -->
      <text x="90" y="355" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="68" fill="${primaryColor}" letter-spacing="-1">
        ${pnlPercentStr}
      </text>

      <!-- Multiplier Pill -->
      <rect x="440" y="260" width="110" height="44" rx="22" fill="${primaryColor}" fill-opacity="0.2" stroke="${primaryColor}" stroke-width="1.5"/>
      <text x="495" y="289" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20" fill="${primaryColor}" text-anchor="middle">🚀 ${multiplierStr}</text>
    </g>

    <!-- Stat Cards Grid (Right Side) -->
    
    <!-- Card 1: Entry & Current Price -->
    <g id="card-price">
      <rect x="610" y="235" width="255" height="150" rx="20" fill="url(#card-grad)" stroke="#334155" stroke-width="1.5"/>
      <text x="635" y="272" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13" fill="#64748B" letter-spacing="1">ENTRY PRICE</text>
      <text x="635" y="302" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20" fill="#E2E8F0">${entryPriceFormatted}</text>

      <line x1="635" y1="322" x2="840" y2="322" stroke="#334155" stroke-width="1"/>

      <text x="635" y="345" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13" fill="#94A3B8" letter-spacing="1">CURRENT PRICE</text>
      <text x="635" y="372" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="${primaryColor}">${currentPriceFormatted}</text>
    </g>

    <!-- Card 2: Entry & Current Market Cap -->
    <g id="card-mcap">
      <rect x="885" y="235" width="255" height="150" rx="20" fill="url(#card-grad)" stroke="#334155" stroke-width="1.5"/>
      <text x="910" y="272" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13" fill="#64748B" letter-spacing="1">ENTRY MCAP</text>
      <text x="910" y="302" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="20" fill="#E2E8F0">${entryMcFormatted}</text>

      <line x1="910" y1="322" x2="1115" y2="322" stroke="#334155" stroke-width="1"/>

      <text x="910" y="345" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="13" fill="#94A3B8" letter-spacing="1">CURRENT MCAP</text>
      <text x="910" y="372" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" fill="${primaryColor}">${currentMcFormatted}</text>
    </g>

    <!-- Bottom Stat Row: Profit Summary -->
    <g id="bottom-stats">
      <!-- Total Profit Card -->
      <rect x="60" y="415" width="520" height="135" rx="20" fill="url(#card-grad)" stroke="#334155" stroke-width="1.5"/>
      <text x="90" y="455" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#94A3B8" letter-spacing="1">NET PROFIT / VALUE GAIN</text>
      <text x="90" y="505" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="36" fill="${primaryColor}">${profitUsdFormatted}</text>
      <text x="90" y="532" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" fill="#64748B">${profitSolFormatted}</text>

      <!-- Fast Trading Info Card -->
      <rect x="610" y="415" width="530" height="135" rx="20" fill="url(#card-grad)" stroke="#334155" stroke-width="1.5"/>
      <text x="640" y="455" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="14" fill="#94A3B8" letter-spacing="1">EXECUTION ENGINE</text>
      
      <text x="640" y="490" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="18" fill="#FFFFFF">⚡ Jupiter Sub-Second Swaps</text>
      <text x="640" y="520" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="14" fill="#14F195">🔒 0% Platform Fees • 300ms Limit Order Engine</text>
    </g>

    <!-- Footer Branding -->
    <g id="footer">
      <line x1="60" y1="580" x2="1140" y2="580" stroke="#1E293B" stroke-width="1.5"/>
      <text x="60" y="618" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="15" fill="#64748B">🚀 Generated by Myan Bot AI Telegram Sniper</text>
      <text x="1140" y="618" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="15" fill="#9945FF" text-anchor="end">@${data.botUsername || 'MyanBotAi_bot'}</text>
    </g>
  </svg>
  `;

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: 1200,
    },
    font: {
      loadSystemFonts: true,
    },
  });

  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}
