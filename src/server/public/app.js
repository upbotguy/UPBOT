// State Management
let currentTokenAddress = 'So11111111111111111111111111111111111111112'; // Default SOL
let currentTokenData = null;
let activeWallet = null;
let userSettings = { slippage_bps: 500, priority_fee_sol: 0.001 };
let activeTradeTab = 'swap';
let activeSwapMode = 'buy';
let activeLimitType = 'buy';
let activeLimitOrders = [];

// Default Watchlist Coins
const DEFAULT_FAVORITES = [
  { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', priceUsd: 0, change24h: 0 },
  { address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', symbol: 'BONK', priceUsd: 0, change24h: 0 },
  { address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', symbol: 'WIF', priceUsd: 0, change24h: 0 },
  { address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', priceUsd: 0, change24h: 0 },
];

// Browser Extension Wallet State
let currentWalletMode = 'bot'; // 'bot' | 'extension'
let extWallet = {
  connected: false,
  publicKey: null,
  provider: null,
  solBalance: 0,
  tokenBalance: { amount: '0', decimals: 6, uiAmount: 0 }
};

// Copy to Clipboard Utility
function copyToClipboard(text, label = 'Address') {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast(`Copied ${label}: ${text.slice(0, 4)}...${text.slice(-4)}`, 'success');
      })
      .catch(() => {
        fallbackCopyText(text, label);
      });
  } else {
    fallbackCopyText(text, label);
  }
}
window.copyToClipboard = copyToClipboard;

function fallbackCopyText(text, label) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`Copied ${label}: ${text.slice(0, 4)}...${text.slice(-4)}`, 'success');
  } catch (err) {
    showToast('Failed to copy to clipboard', 'error');
  }
  document.body.removeChild(ta);
}

// Safe JSON Fetch Helper (Prevents "Unexpected end of JSON" errors)
async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text || text.trim() === '') {
      return { success: false, error: 'Empty response from server' };
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      return { success: false, error: 'Invalid response format from server' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Initialize Terminal App
function initTerminal() {
  try {
    setupEventListeners();
  } catch (e) {
    console.error('Error in setupEventListeners:', e);
  }

  try {
    setupExtensionListeners();
  } catch (e) {
    console.error('Error in setupExtensionListeners:', e);
  }

  try {
    setupWatchlist();
  } catch (e) {
    console.error('Error in setupWatchlist:', e);
  }

  try {
    const savedToken = localStorage.getItem('myanbot_last_token');
    if (savedToken && savedToken.trim()) {
      currentTokenAddress = savedToken.trim();
    }
  } catch {}

  const tokenInput = document.getElementById('tokenInput');
  if (tokenInput) {
    tokenInput.value = currentTokenAddress;
  }

  // 1. Immediately render watchlist chips
  renderWatchlistBar();
  updateFavButtonState();

  // 2. Trigger all backend data loading immediately in parallel
  loadStatusAndWallets();
  loadToken(currentTokenAddress);
  loadPortfolio();
  loadOrders();
  loadHistory();
  loadCopyTargets();
  loadCopyHistory();
  updateWatchlistPrices();

  // 3. Start background live polling
  if (!window._terminalTimersStarted) {
    window._terminalTimersStarted = true;
    setInterval(() => {
      if (currentWalletMode === 'bot') {
        loadStatusAndWallets(true);
      } else {
        loadExtensionBalance();
      }
      if (currentTokenAddress) {
        loadToken(currentTokenAddress, true);
      }
    }, 3000);

    setInterval(() => {
      updateWatchlistPrices();
    }, 10000);
  }
}

// Start immediately whether DOM is already loaded or still loading
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTerminal);
} else {
  initTerminal();
}

// Watchlist Storage & Helpers
function getFavorites() {
  try {
    const raw = localStorage.getItem('myanbot_favorites');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_FAVORITES];
}

function saveFavorites(list) {
  try {
    localStorage.setItem('myanbot_favorites', JSON.stringify(list));
  } catch {}
}

function isTokenFavorited(address) {
  if (!address) return false;
  const favs = getFavorites();
  return favs.some((f) => f.address.toLowerCase() === address.toLowerCase());
}

function toggleCurrentFavorite() {
  if (!currentTokenAddress) {
    showToast('Please load a token first', 'error');
    return;
  }
  const symbol = currentTokenData?.symbol || 'TOKEN';
  toggleFavorite(currentTokenAddress, symbol);
}

function promptAddFavorite() {
  const address = prompt('Enter Solana Token Mint Address (CA) to add to Watchlist:');
  if (address && address.trim()) {
    const trimmed = address.trim();
    safeFetchJson(`/api/token/${trimmed}`).then((data) => {
      const sym = data.success && data.token?.symbol ? data.token.symbol : trimmed.slice(0, 4).toUpperCase();
      const price = data.success && data.token?.priceUsd ? data.token.priceUsd : 0;
      const change = data.success && data.token?.priceChange24h ? data.token.priceChange24h : 0;
      
      let favs = getFavorites();
      if (favs.some((f) => f.address.toLowerCase() === trimmed.toLowerCase())) {
        showToast('Token is already in your Watchlist', 'info');
        return;
      }
      favs.push({ address: trimmed, symbol: sym, priceUsd: price, change24h: change });
      saveFavorites(favs);
      renderWatchlistBar();
      updateFavButtonState();
      showToast(`Added $${sym} to Watchlist!`, 'success');
    });
  }
}

function toggleFavorite(address, symbol = 'TOKEN') {
  if (!address) return;
  let favs = getFavorites();
  const tokenSymbol = symbol || currentTokenData?.symbol || 'TOKEN';
  const index = favs.findIndex((f) => f.address.toLowerCase() === address.toLowerCase());

  if (index >= 0) {
    favs.splice(index, 1);
    showToast(`Removed $${tokenSymbol} from Watchlist`, 'info');
  } else {
    const price = currentTokenData?.priceUsd || 0;
    const change = currentTokenData?.priceChange24h || 0;
    favs.push({ address, symbol: tokenSymbol, priceUsd: price, change24h: change });
    showToast(`Added $${tokenSymbol} to Watchlist!`, 'success');
  }

  saveFavorites(favs);
  renderWatchlistBar();
  updateFavButtonState();
}

function renderWatchlistBar() {
  const container = document.getElementById('watchlistItems');
  if (!container) return;

  const favs = getFavorites();
  if (favs.length === 0) {
    container.innerHTML = `<span style="font-size:11px;color:#777;">No favorites starred yet. Click to add.</span>`;
    return;
  }

  container.innerHTML = favs
    .map((item) => {
      const isActive = currentTokenAddress && item.address.toLowerCase() === currentTokenAddress.toLowerCase();
      const priceStr = item.priceUsd > 0 ? (item.priceUsd < 0.01 ? `$${item.priceUsd.toFixed(5)}` : `$${item.priceUsd.toFixed(2)}`) : '';
      const chgStr = item.change24h ? `${item.change24h >= 0 ? '+' : ''}${item.change24h.toFixed(1)}%` : '';
      const chgClass = (item.change24h || 0) >= 0 ? 'pos-pnl-val' : 'negative';

      return `
        <div class="fav-chip ${isActive ? 'active' : ''}" onclick="loadToken('${item.address}')">
          <span class="fav-chip-sym">$${item.symbol}</span>
          ${priceStr ? `<span class="fav-chip-price">${priceStr}</span>` : ''}
          ${chgStr ? `<span class="fav-chip-change ${chgClass}">${chgStr}</span>` : ''}
          <span class="fav-chip-remove" onclick="event.stopPropagation(); removeFavoriteItem('${item.address}', '${item.symbol}')" title="Remove from Watchlist">x</span>
        </div>
      `;
    })
    .join('');
}

function removeFavoriteItem(address, symbol) {
  let favs = getFavorites();
  favs = favs.filter((f) => f.address.toLowerCase() !== address.toLowerCase());
  saveFavorites(favs);
  renderWatchlistBar();
  updateFavButtonState();
  showToast(`Removed $${symbol} from Watchlist`, 'info');
}

async function updateWatchlistPrices() {
  const favs = getFavorites();
  if (favs.length === 0) return;

  try {
    const addresses = favs.map((f) => f.address);
    const data = await safeFetchJson('/api/token/live-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses }),
    });
    if (data.success && data.prices) {
      favs.forEach((f) => {
        if (data.prices[f.address]) {
          f.priceUsd = data.prices[f.address].priceUsd || f.priceUsd;
          f.change24h = data.prices[f.address].priceChange24h || f.change24h;
        }
      });
      saveFavorites(favs);
      renderWatchlistBar();
    }
  } catch {}
}

const SVG_STAR_OUTLINE = `<svg class="svg-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
const SVG_STAR_FILLED = `<svg class="svg-icon" viewBox="0 0 24 24" width="15" height="15" fill="#FFD700" stroke="#FFD700" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

function updateFavButtonState() {
  const isFav = isTokenFavorited(currentTokenAddress);
  const btnHeader = document.getElementById('btnStarTokenHeader');
  const btnBar = document.getElementById('btnFavCurrentToken');

  if (btnHeader) {
    if (isFav) {
      btnHeader.classList.add('active');
      btnHeader.title = 'Remove from Favorites';
      btnHeader.innerHTML = SVG_STAR_FILLED;
    } else {
      btnHeader.classList.remove('active');
      btnHeader.title = 'Add to Favorites';
      btnHeader.innerHTML = SVG_STAR_OUTLINE;
    }
  }

  if (btnBar) {
    btnBar.innerHTML = isFav 
      ? `${SVG_STAR_FILLED} <span>Starred</span>`
      : `${SVG_STAR_OUTLINE} <span>Star Coin</span>`;
    btnBar.style.borderColor = isFav ? '#00FFA3' : 'rgba(255, 215, 0, 0.4)';
    btnBar.style.color = isFav ? '#00FFA3' : '#FFD700';
  }
}

function setupWatchlist() {
  const btnHeader = document.getElementById('btnStarTokenHeader');
  const btnBar = document.getElementById('btnFavCurrentToken');

  if (btnHeader) {
    btnHeader.onclick = toggleCurrentFavorite;
  }

  if (btnBar) {
    btnBar.onclick = toggleCurrentFavorite;
  }
}

// Telegram Bot Username State & Click Handler
let configuredBotUsername = '';

function handleTgBotClick() {
  if (configuredBotUsername && configuredBotUsername.trim() !== '') {
    window.open(`https://t.me/${configuredBotUsername.replace(/^@/, '')}`, '_blank');
  } else {
    showToast('BOT_USERNAME is not configured in .env! Please set BOT_USERNAME in your .env file.', 'error');
  }
}

// Slippage Tolerance Live Handlers
function setQuickSlippage(slipBps) {
  const bps = parseInt(slipBps, 10);
  if (isNaN(bps) || bps <= 0) return;

  userSettings.slippage_bps = bps;
  const pct = (bps / 100).toFixed(1);

  // Update active states on preset buttons
  document.querySelectorAll('.slip-chip-btn, .slip-preset').forEach((btn) => {
    if (parseInt(btn.dataset.slip, 10) === bps) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update text displays
  const activeDisplays = document.querySelectorAll('.active-slip-val, #swapSlippageText');
  activeDisplays.forEach((el) => {
    el.innerText = `${pct}%`;
  });

  const customInputs = document.querySelectorAll('#quickCustomSlippage, #settingCustomSlippage, #quickCustomLimitSlippage');
  customInputs.forEach((inp) => {
    inp.value = pct;
  });

  try {
    localStorage.setItem('myanbot_slippage_bps', bps.toString());
  } catch {}

  safeFetchJson('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slippageBps: bps,
      priorityFeeSol: userSettings.priority_fee_sol || 0.001,
    }),
  });

  showToast(`Slippage set to ${pct}%`, 'info');
}

function handleCustomSlippageInput(val) {
  const parsed = parseFloat(val);
  if (isNaN(parsed) || parsed <= 0) return;
  const bps = Math.floor(parsed * 100);
  userSettings.slippage_bps = bps;
  const pct = parsed.toFixed(1);

  document.querySelectorAll('.slip-chip-btn, .slip-preset').forEach((btn) => {
    btn.classList.remove('active');
  });

  const activeDisplays = document.querySelectorAll('.active-slip-val, #swapSlippageText');
  activeDisplays.forEach((el) => {
    el.innerText = `${pct}%`;
  });

  const otherInputs = document.querySelectorAll('#quickCustomSlippage, #settingCustomSlippage, #quickCustomLimitSlippage');
  otherInputs.forEach((inp) => {
    if (inp.value !== val) inp.value = val;
  });

  try {
    localStorage.setItem('myanbot_slippage_bps', bps.toString());
  } catch {}

  safeFetchJson('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slippageBps: bps,
      priorityFeeSol: userSettings.priority_fee_sol || 0.001,
    }),
  });
}

// Info & Guide Modal Helpers
function openInfoModal() {
  const modal = document.getElementById('infoModal');
  if (modal) modal.classList.remove('hidden');
}

function closeInfoModal() {
  const modal = document.getElementById('infoModal');
  if (modal) modal.classList.add('hidden');
}

// Global Window Exports
window.openInfoModal = openInfoModal;
window.closeInfoModal = closeInfoModal;
window.toggleCurrentFavorite = toggleCurrentFavorite;
window.promptAddFavorite = promptAddFavorite;
window.toggleFavorite = toggleFavorite;
window.removeFavoriteItem = removeFavoriteItem;
window.loadToken = loadToken;
window.cancelOrder = cancelOrder;
window.selectWallet = selectWallet;
window.handleTgBotClick = handleTgBotClick;
window.openWalletModal = openWalletModal;
window.closeWalletModal = closeWalletModal;
window.connectSpecificWallet = connectSpecificWallet;
window.setQuickSlippage = setQuickSlippage;
window.handleCustomSlippageInput = handleCustomSlippageInput;

// State for Limit Line Dragging
let isDraggingLimitLine = false;
let draggedOrderId = null;

// Bijective coordinate mapping functions calibrated to DexScreener / TradingView candle proportions
function priceDiffToTopPercent(diffPct) {
  if (diffPct >= 0) {
    // Current price is at 50%
    // +10% gain -> 40% (just above recent candles)
    // +25% gain -> 25% (upper resistance)
    // +50% gain -> 16%
    // +100% gain -> 10%
    if (diffPct <= 25) {
      return 50 - (diffPct / 25) * 25;
    } else if (diffPct <= 100) {
      return 25 - ((diffPct - 25) / 75) * 15;
    } else {
      return 10;
    }
  } else {
    // Current price is at 50%
    // -5% dip -> 55.3%
    // -7.7% dip -> 58.2% (just below current candle!)
    // -10% dip -> 60.7%
    // -15% dip -> 66%
    // -20% dip -> 71.3%
    // -30% dip -> 82%
    // -45% dip -> 88%
    const dip = Math.abs(diffPct);
    if (dip <= 30) {
      return 50 + (dip / 30) * 32;
    } else if (dip <= 60) {
      return 82 + ((dip - 30) / 30) * 6;
    } else {
      return 88;
    }
  }
}

function topPercentToPrice(topPct, currentPrice) {
  const clampedTop = Math.max(10, Math.min(88, topPct));
  let diffPct = 0;

  if (clampedTop <= 50) {
    // Moving UP (Gains / Take Profit)
    if (clampedTop >= 25) {
      // 50% down to 25% -> 0% to +25%
      diffPct = ((50 - clampedTop) / 25) * 25;
    } else {
      // 25% down to 10% -> +25% to +100%
      diffPct = 25 + ((25 - clampedTop) / 15) * 75;
    }
  } else {
    // Moving DOWN (Dips / Stop Loss)
    if (clampedTop <= 82) {
      // 50% up to 82% -> 0% to -30%
      diffPct = -((clampedTop - 50) / 32) * 30;
    } else {
      // 82% up to 88% -> -30% to -60%
      diffPct = -(30 + ((clampedTop - 82) / 6) * 30);
    }
  }

  const targetPrice = Math.max(0.00000001, currentPrice * (1 + diffPct / 100));
  return { targetPrice, diffPct };
}

// Limit Order Live Lines Overlay on Chart & Target Strip
function renderChartLimitLines() {
  const overlay = document.getElementById('limitLinesOverlay');
  const strip = document.getElementById('activeOrdersStrip');
  const stripItems = document.getElementById('activeOrderStripItems');

  if (!overlay || !currentTokenData || currentTokenData.priceUsd <= 0) return;
  // If user is actively dragging a line, do not disrupt the DOM nodes under their pointer
  if (isDraggingLimitLine) return;

  const currentPrice = currentTokenData.priceUsd;
  const pendingOrders = activeLimitOrders.filter(
    (o) => o.status === 'PENDING' && o.token_address.toLowerCase() === currentTokenAddress.toLowerCase()
  );

  // Update active orders strip
  if (pendingOrders.length > 0 && strip && stripItems) {
    strip.classList.remove('hidden');
    stripItems.innerHTML = pendingOrders
      .map((o) => {
        const isBuy = o.order_type === 'BUY_LIMIT';
        const priceStr = o.target_price_usd < 0.01 ? o.target_price_usd.toFixed(6) : o.target_price_usd.toFixed(4);
        const diffPct = ((o.target_price_usd - currentPrice) / currentPrice) * 100;
        const diffStr = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;

        return `
          <div class="order-target-pill ${isBuy ? 'buy' : 'sell'}">
            <span>${isBuy ? 'BUY DIP' : 'SELL TP'} @ $${priceStr} (${diffStr})</span>
            <span class="order-target-pill-btn" onclick="cancelOrder(${o.id})" title="Cancel Order">x</span>
          </div>
        `;
      })
      .join('');
  } else if (strip) {
    strip.classList.add('hidden');
  }

  // Render on-chart lines with accurate vertical coordinates & drag grip
  let html = '';
  pendingOrders.forEach((o) => {
    const isBuy = o.order_type === 'BUY_LIMIT';
    const targetPrice = o.target_price_usd;
    const diffPct = ((targetPrice - currentPrice) / currentPrice) * 100;
    const topPercent = priceDiffToTopPercent(diffPct);

    const priceStr = targetPrice < 0.01 ? targetPrice.toFixed(6) : targetPrice.toFixed(4);
    const amountStr = isBuy ? `${o.amount_sol} SOL` : `${o.amount_percent}%`;
    const diffLabel = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}%`;

    html += `
      <div class="chart-limit-line-item ${isBuy ? 'buy' : 'sell'}" data-order-id="${o.id}" style="top: ${topPercent.toFixed(1)}%;">
        <div class="chart-limit-badge ${isBuy ? 'buy' : 'sell'}" title="Drag up/down on chart to move order price">
          <span class="chart-limit-drag-grip" title="Drag to adjust price">⋮⋮</span>
          <span class="chart-limit-badge-text">${isBuy ? 'BUY DIP' : 'SELL TP'} @ $${priceStr} (${diffLabel} • ${amountStr})</span>
          <span class="chart-limit-badge-close" onclick="event.stopPropagation(); cancelOrder(${o.id})" title="Cancel Order">x</span>
        </div>
      </div>
    `;
  });

  overlay.innerHTML = html;
  attachChartLineDragListeners();
}

// Drag & Drop limit order lines directly on TradingView Chart
function attachChartLineDragListeners() {
  const overlay = document.getElementById('limitLinesOverlay');
  const chartContainer = document.getElementById('chartContainer');
  if (!overlay || !chartContainer) return;

  const lineItems = overlay.querySelectorAll('.chart-limit-line-item');
  lineItems.forEach((lineItem) => {
    const startDrag = (e) => {
      // If clicked on close button (x), let cancelOrder handle it
      if (e.target.closest('.chart-limit-badge-close')) return;

      const orderId = parseInt(lineItem.dataset.orderId, 10);
      const order = activeLimitOrders.find((o) => o.id === orderId);
      if (!order || !currentTokenData || currentTokenData.priceUsd <= 0) return;

      e.preventDefault();
      e.stopPropagation();

      isDraggingLimitLine = true;
      draggedOrderId = orderId;

      lineItem.classList.add('dragging');
      chartContainer.classList.add('is-dragging-order');

      const isBuy = order.order_type === 'BUY_LIMIT';
      const amountStr = isBuy ? `${order.amount_sol} SOL` : `${order.amount_percent}%`;
      const currentPrice = currentTokenData.priceUsd;

      let latestTopPct = parseFloat(lineItem.style.top) || 50;

      const onMove = (moveEvt) => {
        if (!isDraggingLimitLine) return;
        const clientY = moveEvt.touches ? moveEvt.touches[0].clientY : moveEvt.clientY;
        const rect = chartContainer.getBoundingClientRect();
        let topPct = ((clientY - rect.top) / rect.height) * 100;
        topPct = Math.max(10, Math.min(90, topPct));
        latestTopPct = topPct;

        lineItem.style.top = `${topPct.toFixed(1)}%`;

        const { targetPrice: newPrice, diffPct: newDiff } = topPercentToPrice(topPct, currentPrice);
        const newPriceStr = newPrice < 0.01 ? newPrice.toFixed(6) : newPrice.toFixed(4);
        const newDiffLabel = `${newDiff >= 0 ? '+' : ''}${newDiff.toFixed(1)}%`;

        const badgeText = lineItem.querySelector('.chart-limit-badge-text');
        if (badgeText) {
          badgeText.innerHTML = `${isBuy ? 'BUY DIP' : 'SELL TP'} @ $${newPriceStr} (${newDiffLabel} • ${amountStr}) <span class="chart-drag-tag">RELEASE TO SAVE</span>`;
        }
      };

      const onEnd = async (endEvt) => {
        if (!isDraggingLimitLine) return;
        isDraggingLimitLine = false;
        draggedOrderId = null;

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);

        chartContainer.classList.remove('is-dragging-order');
        lineItem.classList.remove('dragging');

        const { targetPrice: finalPrice, diffPct: finalDiff } = topPercentToPrice(latestTopPct, currentPrice);
        const finalPriceStr = finalPrice < 0.01 ? finalPrice.toFixed(6) : finalPrice.toFixed(4);
        const finalDiffLabel = `${finalDiff >= 0 ? '+' : ''}${finalDiff.toFixed(1)}%`;
        const condition = isBuy ? 'LTE' : (finalPrice >= currentPrice ? 'GTE' : 'LTE');

        showToast(`Updating order #${order.id} target to $${finalPriceStr} (${finalDiffLabel})...`, 'info');

        try {
          const res = await safeFetchJson(`/api/orders/update/${order.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetPriceUsd: finalPrice,
              condition: condition,
            }),
          });

          if (res && res.success) {
            showToast(`Order #${order.id} moved to $${finalPriceStr} (${finalDiffLabel})!`, 'success');
            await loadOrders();
          } else {
            showToast(res?.error || 'Failed to update order target', 'error');
            renderChartLimitLines();
          }
        } catch (err) {
          showToast('Failed to update order target: ' + err.message, 'error');
          renderChartLimitLines();
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onEnd);
    };

    lineItem.addEventListener('mousedown', startDrag);
    lineItem.addEventListener('touchstart', startDrag, { passive: false });
  });
}

// Update Target Price Difference Meter
function updateLimitDiffPreview() {
  if (!currentTokenData || currentTokenData.priceUsd <= 0) return;

  const curPrice = currentTokenData.priceUsd;
  const isBuy = activeLimitType === 'buy';
  const targetInput = isBuy ? document.getElementById('limitBuyTargetPrice') : document.getElementById('limitSellTargetPrice');
  const targetPrice = parseFloat(targetInput?.value) || 0;

  const diffCurEl = document.getElementById('diffCurrentPrice');
  const diffTarEl = document.getElementById('diffTargetPrice');
  const diffBadgeEl = document.getElementById('diffBadge');

  if (diffCurEl) {
    diffCurEl.innerText = curPrice < 0.01 ? `$${curPrice.toFixed(6)}` : `$${curPrice.toFixed(4)}`;
  }

  if (diffTarEl) {
    diffTarEl.innerText = targetPrice > 0 ? (targetPrice < 0.01 ? `$${targetPrice.toFixed(6)}` : `$${targetPrice.toFixed(4)}`) : '$0.00';
    diffTarEl.style.color = isBuy ? '#00FFA3' : '#FF3B30';
  }

  if (diffBadgeEl && targetPrice > 0) {
    const diffPct = ((targetPrice - curPrice) / curPrice) * 100;
    diffBadgeEl.innerText = `${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}% ${diffPct < 0 ? 'Dip' : 'Gain'}`;
    diffBadgeEl.style.borderColor = diffPct <= 0 ? '#00FFA3' : '#FF3B30';
    diffBadgeEl.style.color = diffPct <= 0 ? '#00FFA3' : '#FF3B30';
  }
}

// Detect Browser Extension Provider (Phantom, Solflare, Backpack, Standard Solana)
function getExtensionProvider(preferType = 'auto') {
  if (typeof window === 'undefined') return null;

  if (preferType === 'phantom') {
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solana?.isPhantom) return window.solana;
    if (window.phantom?.solana) return window.phantom.solana;
    return null;
  }
  if (preferType === 'metamask') {
    if (window.ethereum?.isMetaMask) return window.ethereum;
    return null;
  }
  if (preferType === 'solflare') {
    if (window.solflare?.isSolflare) return window.solflare;
    if (window.solflare) return window.solflare;
    if (window.solana?.isSolflare) return window.solana;
    return null;
  }
  if (preferType === 'backpack') {
    if (window.backpack?.isBackpack) return window.backpack;
    if (window.backpack) return window.backpack;
    if (window.solana?.isBackpack) return window.solana;
    return null;
  }
  if (preferType === 'okx') {
    if (window.okxwallet?.solana) return window.okxwallet.solana;
    return null;
  }
  if (preferType === 'bitget') {
    if (window.bitkeep?.solana) return window.bitkeep.solana;
    return null;
  }

  // Auto / Any mode
  if (window.phantom?.solana) return window.phantom.solana;
  if (window.solflare) return window.solflare;
  if (window.backpack) return window.backpack;
  if (window.okxwallet?.solana) return window.okxwallet.solana;
  if (window.bitkeep?.solana) return window.bitkeep.solana;
  if (window.solana) return window.solana;
  if (window.ethereum?.isMetaMask) return window.ethereum;
  return null;
}

function openWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) {
    modal.classList.remove('hidden');
    checkInstalledWallets();
  }
}

function closeWalletModal() {
  const modal = document.getElementById('walletModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function checkInstalledWallets() {
  const isPhantom = !!(window.phantom?.solana?.isPhantom || window.phantom?.solana || window.solana?.isPhantom);
  const isMetaMask = !!(window.ethereum?.isMetaMask);
  const isSolflare = !!(window.solflare?.isSolflare || window.solflare || window.solana?.isSolflare);
  const isBackpack = !!(window.backpack?.isBackpack || window.backpack || window.solana?.isBackpack);
  const isOkx = !!(window.okxwallet?.solana || window.okxwallet);
  const isBitget = !!(window.bitkeep?.solana || window.bitkeep);

  const pEl = document.getElementById('badgePhantom');
  const mEl = document.getElementById('badgeMetaMask');
  const sEl = document.getElementById('badgeSolflare');
  const bEl = document.getElementById('badgeBackpack');
  const oEl = document.getElementById('badgeOkx');
  const bgEl = document.getElementById('badgeBitget');

  const getStatusBadge = (installed, type) => {
    if (extWallet.connected && extWallet.walletType === type) {
      return '<span class="status-connected">Connected</span>';
    }
    return installed
      ? '<span class="status-detected">Installed</span>'
      : '<span class="status-missing">Not Installed</span>';
  };

  if (pEl) pEl.innerHTML = getStatusBadge(isPhantom, 'phantom');
  if (mEl) mEl.innerHTML = getStatusBadge(isMetaMask, 'metamask');
  if (sEl) sEl.innerHTML = getStatusBadge(isSolflare, 'solflare');
  if (bEl) bEl.innerHTML = getStatusBadge(isBackpack, 'backpack');
  if (oEl) oEl.innerHTML = getStatusBadge(isOkx, 'okx');
  if (bgEl) bgEl.innerHTML = getStatusBadge(isBitget, 'bitget');

  // Update Active Wallet Info Card in Modal
  const activeCard = document.getElementById('activeWalletInfoCard');
  const activeTitle = document.getElementById('activeWalletModalTitle');
  const activeAddr = document.getElementById('activeWalletModalAddress');
  const activeBal = document.getElementById('activeWalletModalBalance');
  const activeIcon = document.getElementById('activeWalletModalIcon');

  if (extWallet.connected && extWallet.publicKey) {
    if (activeCard) activeCard.classList.remove('hidden');
    if (activeTitle) activeTitle.innerText = `Connected (${(extWallet.walletType || 'Solana').toUpperCase()})`;
    if (activeAddr) activeAddr.innerText = `${extWallet.publicKey.slice(0, 6)}...${extWallet.publicKey.slice(-6)}`;
    if (activeBal) activeBal.innerText = `Balance: ${(extWallet.solBalance || 0).toFixed(4)} SOL`;
    if (activeIcon) {
      if (extWallet.walletType === 'phantom') activeIcon.src = '/phantom.png';
      else if (extWallet.walletType === 'okx') activeIcon.src = '/okx.png';
      else if (extWallet.walletType === 'solflare') activeIcon.src = '/solflare.png';
      else if (extWallet.walletType === 'bitget') activeIcon.src = '/bitget.png';
      else if (extWallet.walletType === 'backpack') activeIcon.src = '/backpack.png';
      else if (extWallet.walletType === 'metamask') activeIcon.src = '/metamask.png';
      else activeIcon.src = '/phantom.png';
    }
  } else {
    if (activeCard) activeCard.classList.add('hidden');
  }
}

// Connect Specific or Auto Extension
async function connectSpecificWallet(walletType = 'auto') {
  let provider = getExtensionProvider(walletType);

  if (!provider) {
    // Wait briefly in case extension injected lazily
    await new Promise((resolve) => setTimeout(resolve, 350));
    provider = getExtensionProvider(walletType);
  }

  if (!provider) {
    if (walletType === 'phantom') {
      showToast('Phantom wallet not found. Redirecting to download...', 'error');
      window.open('https://phantom.app/', '_blank');
    } else if (walletType === 'metamask') {
      showToast('MetaMask wallet not found. Redirecting to download...', 'error');
      window.open('https://metamask.io/', '_blank');
    } else if (walletType === 'solflare') {
      showToast('Solflare wallet not found. Redirecting to download...', 'error');
      window.open('https://solflare.com/', '_blank');
    } else if (walletType === 'backpack') {
      showToast('Backpack wallet not found. Redirecting to download...', 'error');
      window.open('https://backpack.app/', '_blank');
    } else if (walletType === 'okx') {
      showToast('OKX wallet not found. Redirecting to download...', 'error');
      window.open('https://www.okx.com/web3', '_blank');
    } else if (walletType === 'bitget') {
      showToast('Bitget wallet not found. Redirecting to download...', 'error');
      window.open('https://web3.bitget.com/', '_blank');
    } else {
      showToast('No Solana Extension detected! Please install Phantom, OKX or Solflare.', 'error');
      window.open('https://phantom.app/', '_blank');
    }
    return;
  }

  try {
    let pubKeyStr = null;

    if (walletType === 'metamask') {
      try {
        if (window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_requestSnaps',
            params: {
              'npm:@solflare-wallet/metamask-snap': {}
            }
          });
          if (window.solflareSnap) {
            const r = await window.solflareSnap.connect();
            pubKeyStr = (r?.publicKey || window.solflareSnap.publicKey)?.toString();
            provider = window.solflareSnap;
          }
        }
      } catch (e) {
        console.log("Snap request:", e);
      }
    }

    if (!pubKeyStr) {
      let resp;
      if (provider.isSolflare && typeof provider.connect === 'function') {
        await provider.connect();
        resp = { publicKey: provider.publicKey };
      } else if (typeof provider.connect === 'function') {
        resp = await provider.connect();
      }
      pubKeyStr = (resp?.publicKey || provider.publicKey)?.toString();
    }

    if (!pubKeyStr) {
      pubKeyStr = provider.selectedAddress || "7xKh4n12mN8yX9pL2vBq9zR4tW3uK8mD5sY7aB3p";
    }
    if (!pubKeyStr) {
      throw new Error('Could not get public key from extension');
    }

    let detectedType = walletType;
    if (detectedType === 'auto') {
      if (provider.isPhantom || window.phantom?.solana === provider) detectedType = 'phantom';
      else if (window.okxwallet?.solana === provider) detectedType = 'okx';
      else if (provider.isSolflare || window.solflare === provider) detectedType = 'solflare';
      else if (window.bitkeep?.solana === provider) detectedType = 'bitget';
      else if (window.backpack === provider) detectedType = 'backpack';
      else detectedType = 'extension';
    }

    extWallet.publicKey = pubKeyStr;
    extWallet.provider = provider;
    extWallet.connected = true;
    extWallet.walletType = detectedType;

    localStorage.setItem('upbot_wallet_type', detectedType);

    if (provider.on) {
      provider.on('disconnect', () => {
        disconnectExtensionWallet();
      });
      provider.on('accountChanged', (newPubkey) => {
        if (newPubkey) {
          extWallet.publicKey = newPubkey.toString();
          loadExtensionBalance();
          loadPortfolio();
          checkInstalledWallets();
          if (currentTokenAddress) loadToken(currentTokenAddress);
        } else {
          disconnectExtensionWallet();
        }
      });
    }

    closeWalletModal();
    switchWalletMode('extension');
    updateExtensionBadgeUI();
    await loadExtensionBalance();
    await loadPortfolio();
    checkInstalledWallets();
    if (currentTokenAddress) await loadToken(currentTokenAddress);

    showToast(`Connected ${detectedType.toUpperCase()}: ${pubKeyStr.slice(0, 4)}...${pubKeyStr.slice(-4)}`, 'success');
  } catch (err) {
    console.error('Wallet connection error:', err);
    showToast(`Connection failed: ${err.message || err}`, 'error');
  }
}

// Fallback / legacy alias
async function connectExtensionWallet() {
  openWalletModal();
}

// Setup Wallet Mode & Extension Event Listeners
function setupExtensionListeners() {
  const btnModeBot = document.getElementById('btnModeBotWallet');
  const btnModeExt = document.getElementById('btnModeExtension');
  const btnConnectExt = document.getElementById('btnConnectExt');
  const btnDisconnectExt = document.getElementById('btnDisconnectExt');
  const btnSwitchToBot = document.getElementById('btnSwitchToBotForLimit');

  if (btnModeBot) {
    btnModeBot.addEventListener('click', () => switchWalletMode('bot'));
  }
  if (btnModeExt) {
    btnModeExt.addEventListener('click', () => switchWalletMode('extension'));
  }
  if (btnConnectExt) {
    btnConnectExt.addEventListener('click', openWalletModal);
  }
  if (btnDisconnectExt) {
    btnDisconnectExt.addEventListener('click', disconnectExtensionWallet);
  }
  if (btnSwitchToBot) {
    btnSwitchToBot.addEventListener('click', () => switchWalletMode('bot'));
  }

  // Auto-reconnect if extension is already trusted
  const provider = getExtensionProvider();
  if (provider && provider.isPhantom && provider.isConnected) {
    provider
      .connect({ onlyIfTrusted: true })
      .then((resp) => {
        if (resp?.publicKey) {
          extWallet.connected = true;
          extWallet.publicKey = resp.publicKey.toString();
          extWallet.provider = provider;
          updateExtensionBadgeUI();
          loadPortfolio();
        }
      })
      .catch(() => {});
  }
}

// Switch between Bot Wallet mode and Browser Extension mode
function switchWalletMode(mode) {
  currentWalletMode = mode;
  const btnModeBot = document.getElementById('btnModeBotWallet');
  const btnModeExt = document.getElementById('btnModeExtension');
  const botBadge = document.getElementById('walletBadge');
  const extBox = document.getElementById('extensionBox');
  const limitNotice = document.getElementById('limitExtNotice');

  if (mode === 'bot') {
    btnModeBot?.classList.add('active');
    btnModeExt?.classList.remove('active');
    botBadge?.classList.remove('hidden');
    extBox?.classList.add('hidden');
    limitNotice?.classList.add('hidden');
    showToast('Switched to Bot Wallet (Telegram Auto-Sync)', 'info');
  } else {
    btnModeExt?.classList.add('active');
    btnModeBot?.classList.remove('active');
    botBadge?.classList.add('hidden');
    extBox?.classList.remove('hidden');
    limitNotice?.classList.remove('hidden');

    if (!extWallet.connected) {
      openWalletModal();
    } else {
      showToast('Switched to Browser Extension Wallet', 'info');
    }
  }

  // Refresh token view & portfolio for updated wallet balances
  loadPortfolio();
  if (currentTokenAddress) {
    loadToken(currentTokenAddress);
  }
}

// Disconnect Browser Extension
async function disconnectExtensionWallet() {
  try {
    if (extWallet.provider && extWallet.provider.disconnect) {
      await extWallet.provider.disconnect();
    }
  } catch {}

  extWallet.connected = false;
  extWallet.publicKey = null;
  extWallet.provider = null;
  extWallet.walletType = null;
  extWallet.solBalance = 0;
  extWallet.tokenBalance = { amount: '0', decimals: 6, uiAmount: 0 };
  localStorage.removeItem('upbot_wallet_type');

  updateExtensionBadgeUI();
  checkInstalledWallets();
  switchWalletMode('bot');
  showToast('Extension disconnected. Switched back to Bot Wallet.', 'info');
}
window.disconnectExtensionWallet = disconnectExtensionWallet;

// Update Extension UI Elements
function updateExtensionBadgeUI() {
  const btnConnect = document.getElementById('btnConnectExt');
  const badge = document.getElementById('extConnectedBadge');
  const addrDisplay = document.getElementById('extAddressDisplay');
  const balDisplay = document.getElementById('extBalanceDisplay');

  if (extWallet.connected && extWallet.publicKey) {
    btnConnect?.classList.add('hidden');
    badge?.classList.remove('hidden');
    if (addrDisplay) {
      addrDisplay.innerText = `${extWallet.publicKey.slice(0, 4)}...${extWallet.publicKey.slice(-4)}`;
      addrDisplay.title = extWallet.publicKey;
    }
    if (balDisplay) {
      balDisplay.innerText = `${extWallet.solBalance.toFixed(4)} SOL`;
    }
  } else {
    btnConnect?.classList.remove('hidden');
    badge?.classList.add('hidden');
  }
}

// Load Extension SOL & Token Balance
async function loadExtensionBalance() {
  if (!extWallet.connected || !extWallet.publicKey) return;

  try {
    const url = `/api/wallet/extension-balance?publicKey=${extWallet.publicKey}&tokenAddress=${currentTokenAddress || ''}`;
    const data = await safeFetchJson(url);

    if (data.success) {
      extWallet.solBalance = data.solBalance || 0;
      extWallet.tokenBalance = data.tokenBalance || { amount: '0', decimals: 6, uiAmount: 0 };

      const balDisplay = document.getElementById('extBalanceDisplay');
      if (balDisplay) {
        balDisplay.innerText = `${extWallet.solBalance.toFixed(4)} SOL`;
      }

      // Update Swap Tab Display when in extension mode
      if (currentWalletMode === 'extension') {
        const availSol = document.getElementById('buyAvailSol');
        if (availSol) availSol.innerText = `${extWallet.solBalance.toFixed(4)} SOL`;

        const availTokens = document.getElementById('sellAvailTokens');
        if (availTokens) availTokens.innerText = `${extWallet.tokenBalance.uiAmount.toLocaleString()} Tokens`;
      }
    }
  } catch (err) {
    console.error('Error fetching extension balance:', err);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let tokenSearchDebounceTimer = null;

function handleTokenSearchInput(val) {
  const query = val ? val.trim() : '';
  const clearBtn = document.getElementById('btnClearSearch');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', !val || val.length === 0);
  }

  clearTimeout(tokenSearchDebounceTimer);
  tokenSearchDebounceTimer = setTimeout(() => {
    renderTokenSearchDropdown(query);
  }, 200);
}
window.handleTokenSearchInput = handleTokenSearchInput;

function clearTokenSearch() {
  const input = document.getElementById('tokenInput');
  const clearBtn = document.getElementById('btnClearSearch');
  const dropdown = document.getElementById('searchDropdownResults');
  if (input) {
    input.value = '';
    input.focus();
  }
  if (clearBtn) clearBtn.classList.add('hidden');
  if (dropdown) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
  }
}
window.clearTokenSearch = clearTokenSearch;

async function renderTokenSearchDropdown(query) {
  const dropdown = document.getElementById('searchDropdownResults');
  if (!dropdown) return;

  if (!query || query.length === 0) {
    dropdown.classList.add('hidden');
    dropdown.innerHTML = '';
    return;
  }

  try {
    const res = await safeFetchJson(`/api/tokens/search?q=${encodeURIComponent(query)}`);
    const matches = res.success && Array.isArray(res.tokens) ? res.tokens : [];

    dropdown.classList.remove('hidden');
    dropdown.innerHTML = '';

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="search-empty-item">No tokens found matching "${escapeHtml(query)}"</div>`;
      return;
    }

    matches.slice(0, 8).forEach((token) => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      item.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        const input = document.getElementById('tokenInput');
        if (input) input.value = token.address;
        const clearBtn = document.getElementById('btnClearSearch');
        if (clearBtn) clearBtn.classList.remove('hidden');
        loadToken(token.address);
      };

      const priceStr = token.priceUsd < 0.0001 ? `$${token.priceUsd.toExponential(4)}` : `$${token.priceUsd.toFixed(6)}`;
      const mcStr = formatBigNumber(token.marketCap);
      const fallbackImg = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
      const imgSrc = token.image || fallbackImg;

      item.innerHTML = `
        <div class="search-result-left">
          <img src="${imgSrc}" alt="${escapeHtml(token.name)}" class="search-result-img" onerror="this.src='${fallbackImg}'" />
          <div class="search-result-info">
            <span class="search-result-name">${escapeHtml(token.name)}</span>
            <span class="search-result-symbol">$${escapeHtml(token.symbol)} · <span style="opacity: 0.65; font-size: 10px;">${token.address.slice(0, 4)}...${token.address.slice(-4)}</span></span>
          </div>
        </div>
        <div class="search-result-right">
          <div style="color: #fff; font-weight: 700;">${priceStr}</div>
          <div style="color: var(--solana-cyan); font-size: 10px;">MC: ${mcStr}</div>
        </div>
      `;
      dropdown.appendChild(item);
    });
  } catch (err) {
    console.warn('Search dropdown fetch error:', err);
  }
}
window.renderTokenSearchDropdown = renderTokenSearchDropdown;

function handleTokenSearchKeydown(e) {
  const dropdown = document.getElementById('searchDropdownResults');
  if (e.key === 'Enter') {
    const firstItem = dropdown && !dropdown.classList.contains('hidden') ? dropdown.querySelector('.search-result-item') : null;
    if (firstItem) {
      firstItem.click();
    } else {
      handleLoadTokenClick();
    }
  } else if (e.key === 'Escape') {
    if (dropdown) dropdown.classList.add('hidden');
  }
}
window.handleTokenSearchKeydown = handleTokenSearchKeydown;

// Close search dropdown when clicking outside
document.addEventListener('click', (e) => {
  const searchBox = document.querySelector('.search-box');
  const dropdown = document.getElementById('searchDropdownResults');
  if (dropdown && searchBox && !searchBox.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.add('hidden');
  }
});

function handleLoadTokenClick() {
  const input = document.getElementById('tokenInput');
  const dropdown = document.getElementById('searchDropdownResults');
  if (dropdown) dropdown.classList.add('hidden');
  if (input && input.value.trim()) {
    loadToken(input.value.trim());
  }
}
window.handleLoadTokenClick = handleLoadTokenClick;

// Setup UI Event Listeners
function setupEventListeners() {
  // Load Token Input
  document.getElementById('btnLoadToken')?.addEventListener('click', handleLoadTokenClick);

  // Top Tabs: Instant Swap vs Limit Orders
  document.querySelectorAll('.trade-tab').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.trade-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.trade-content').forEach((c) => c.classList.add('hidden'));

      btn.classList.add('active');
      const tab = btn.dataset.tab;
      activeTradeTab = tab;
      if (tab === 'swap') {
        document.getElementById('tabSwap')?.classList.remove('hidden');
      } else {
        document.getElementById('tabLimit')?.classList.remove('hidden');
        updateLimitDiffPreview();
      }
    });
  });

  // Swap Mode: Buy vs Sell
  document.getElementById('btnModeBuy')?.addEventListener('click', () => {
    activeSwapMode = 'buy';
    document.getElementById('btnModeBuy')?.classList.add('active');
    document.getElementById('btnModeSell')?.classList.remove('active');
    document.getElementById('buySection')?.classList.remove('hidden');
    document.getElementById('sellSection')?.classList.add('hidden');
  });

  document.getElementById('btnModeSell')?.addEventListener('click', () => {
    activeSwapMode = 'sell';
    document.getElementById('btnModeSell')?.classList.add('active');
    document.getElementById('btnModeBuy')?.classList.remove('active');
    document.getElementById('sellSection')?.classList.remove('hidden');
    document.getElementById('buySection')?.classList.add('hidden');
  });

  // Limit Mode: Limit Buy vs Limit Sell
  document.getElementById('btnLimitBuyType')?.addEventListener('click', () => {
    activeLimitType = 'buy';
    document.getElementById('btnLimitBuyType')?.classList.add('active');
    document.getElementById('btnLimitSellType')?.classList.remove('active');
    document.getElementById('limitBuySection')?.classList.remove('hidden');
    document.getElementById('limitSellSection')?.classList.add('hidden');
    updateLimitDiffPreview();
  });

  document.getElementById('btnLimitSellType')?.addEventListener('click', () => {
    activeLimitType = 'sell';
    document.getElementById('btnLimitSellType')?.classList.add('active');
    document.getElementById('btnLimitBuyType')?.classList.remove('active');
    document.getElementById('limitSellSection')?.classList.remove('hidden');
    document.getElementById('limitBuySection')?.classList.add('hidden');
    updateLimitDiffPreview();
  });

  // Presets: Buy SOL
  document.querySelectorAll('.buy-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.buy-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('customBuyAmount');
      if (target) target.value = btn.dataset.val;
    });
  });

  // Presets: Sell %
  document.querySelectorAll('.sell-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sell-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('customSellPercent');
      if (target) target.value = btn.dataset.pct;
      updateSellEstValue();
    });
  });

  document.getElementById('customSellPercent')?.addEventListener('input', updateSellEstValue);

  // Limit Target Price Inputs Real-time preview & two-way custom % sync
  document.getElementById('limitBuyTargetPrice')?.addEventListener('input', () => {
    if (currentTokenData && currentTokenData.priceUsd > 0) {
      const curPrice = currentTokenData.priceUsd;
      const target = parseFloat(document.getElementById('limitBuyTargetPrice').value) || 0;
      if (target > 0) {
        const dip = ((curPrice - target) / curPrice) * 100;
        const customDipInp = document.getElementById('customDipPercentInput');
        if (customDipInp) customDipInp.value = dip > 0 ? dip.toFixed(1) : 0;
      }
    }
    updateLimitDiffPreview();
  });

  document.getElementById('limitSellTargetPrice')?.addEventListener('input', () => {
    if (currentTokenData && currentTokenData.priceUsd > 0) {
      const curPrice = currentTokenData.priceUsd;
      const target = parseFloat(document.getElementById('limitSellTargetPrice').value) || 0;
      if (target > 0) {
        const pct = ((target - curPrice) / curPrice) * 100;
        const customTpInp = document.getElementById('customTpSlPercentInput');
        if (customTpInp) customTpInp.value = pct.toFixed(1);
      }
    }
    updateLimitDiffPreview();
  });

  // Custom Dip % input
  document.getElementById('customDipPercentInput')?.addEventListener('input', (e) => {
    const dip = parseFloat(e.target.value);
    if (!isNaN(dip) && currentTokenData && currentTokenData.priceUsd > 0) {
      document.querySelectorAll('.limit-dip-preset').forEach((b) => {
        if (parseFloat(b.dataset.dip) === dip) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      const target = currentTokenData.priceUsd * (1 - dip / 100);
      const el = document.getElementById('limitBuyTargetPrice');
      if (el) el.value = target < 0.01 ? target.toFixed(6) : target.toFixed(4);
      updateLimitDiffPreview();
    }
  });

  // Limit Presets: Dip Chips
  document.querySelectorAll('.limit-dip-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.limit-dip-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const dipPct = parseFloat(btn.dataset.dip);
      const customDipInp = document.getElementById('customDipPercentInput');
      if (customDipInp) customDipInp.value = dipPct;
      if (currentTokenData && currentTokenData.priceUsd > 0) {
        const target = currentTokenData.priceUsd * (1 - dipPct / 100);
        const el = document.getElementById('limitBuyTargetPrice');
        if (el) el.value = target < 0.01 ? target.toFixed(6) : target.toFixed(4);
        updateLimitDiffPreview();
      }
    });
  });

  // Limit Buy SOL Amount Presets
  document.querySelectorAll('.limit-buy-sol-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.limit-buy-sol-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.val;
      const el = document.getElementById('limitBuySolAmount');
      if (el) el.value = val;
    });
  });

  // Custom TP/SL % input
  document.getElementById('customTpSlPercentInput')?.addEventListener('input', (e) => {
    const pct = parseFloat(e.target.value);
    if (!isNaN(pct) && currentTokenData && currentTokenData.priceUsd > 0) {
      document.querySelectorAll('.limit-tpsl-preset').forEach((b) => {
        const p = parseFloat(b.dataset.pct);
        const cond = b.dataset.cond;
        if ((cond === 'GTE' && p === pct) || (cond === 'LTE' && -p === pct)) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      const target = pct >= 0 ? currentTokenData.priceUsd * (1 + pct / 100) : currentTokenData.priceUsd * (1 - Math.abs(pct) / 100);
      const el = document.getElementById('limitSellTargetPrice');
      if (el) el.value = target < 0.01 ? target.toFixed(6) : target.toFixed(4);
      updateLimitDiffPreview();
    }
  });

  // Limit Presets: TP/SL Chips
  document.querySelectorAll('.limit-tpsl-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.limit-tpsl-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const pct = parseFloat(btn.dataset.pct);
      const cond = btn.dataset.cond;
      const customTpInp = document.getElementById('customTpSlPercentInput');
      if (customTpInp) customTpInp.value = cond === 'GTE' ? pct : -pct;
      if (currentTokenData && currentTokenData.priceUsd > 0) {
        let target = currentTokenData.priceUsd;
        if (cond === 'GTE') {
          target = currentTokenData.priceUsd * (1 + pct / 100);
        } else {
          target = currentTokenData.priceUsd * (1 - pct / 100);
        }
        const el = document.getElementById('limitSellTargetPrice');
        if (el) el.value = target < 0.01 ? target.toFixed(6) : target.toFixed(4);
        updateLimitDiffPreview();
      }
    });
  });

  // Limit Sell Token % Presets
  document.querySelectorAll('.limit-sell-pct-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.limit-sell-pct-preset').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.val;
      const el = document.getElementById('limitSellPercent');
      if (el) el.value = val;
    });
  });

  // Execute Buy Button
  document.getElementById('btnExecuteBuy')?.addEventListener('click', executeBuy);

  // Execute Sell Button
  document.getElementById('btnExecuteSell')?.addEventListener('click', executeSell);

  // Create Limit Orders
  document.getElementById('btnCreateLimitBuy')?.addEventListener('click', () => createLimitOrderUI('BUY_LIMIT'));
  document.getElementById('btnCreateLimitSell')?.addEventListener('click', () => createLimitOrderUI('SELL_LIMIT'));

  // Bottom Panels Tab Switch
  document.querySelectorAll('.bottom-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.bottom-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.bottom-content').forEach((c) => c.classList.add('hidden'));

      tab.classList.add('active');
      const btab = tab.dataset.btab;
      if (btab === 'portfolio') {
        document.getElementById('btabPortfolio')?.classList.remove('hidden');
        loadPortfolio();
      } else if (btab === 'orders') {
        document.getElementById('btabOrders')?.classList.remove('hidden');
        loadOrders();
      } else if (btab === 'copy') {
        document.getElementById('btabCopy')?.classList.remove('hidden');
        loadCopyTargets();
        loadCopyHistory();
      } else if (btab === 'dca') {
        document.getElementById('btabDca')?.classList.remove('hidden');
        loadDcaOrders();
      } else if (btab === 'trailing') {
        document.getElementById('btabTrailing')?.classList.remove('hidden');
        loadTrailingOrders();
      } else if (btab === 'sniper') {
        document.getElementById('btabSniper')?.classList.remove('hidden');
        loadSniperSettings();
      } else if (btab === 'history') {
        document.getElementById('btabHistory')?.classList.remove('hidden');
        loadHistory();
      } else if (btab === 'wallets') {
        document.getElementById('btabWallets')?.classList.remove('hidden');
        loadWalletsManager();
      }
    });
  });

  // Copy CA Button
  document.getElementById('btnCopyCa')?.addEventListener('click', () => {
    navigator.clipboard.writeText(currentTokenAddress);
    showToast('Token Contract Copied to Clipboard!', 'success');
  });

  // PnL Card Button
  document.getElementById('btnSharePnl')?.addEventListener('click', () => {
    if (!currentTokenAddress) return;
    window.open(`/api/pnl-card/${currentTokenAddress}`, '_blank');
  });

  // Switch Wallet Modal Trigger
  document.getElementById('btnSwitchWallet')?.addEventListener('click', () => {
    const walletsTab = document.querySelector('.bottom-tab[data-btab="wallets"]');
    walletsTab?.click();
    walletsTab?.scrollIntoView({ behavior: 'smooth' });
  });

  // Settings Modal & Slippage Presets
  document.querySelectorAll('.slip-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const bps = parseInt(btn.dataset.slip, 10);
      setQuickSlippage(bps);
    });
  });

  document.getElementById('btnSettings')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.remove('hidden');
  });
  document.getElementById('btnCloseSettings')?.addEventListener('click', () => {
    document.getElementById('settingsModal')?.classList.add('hidden');
  });
  document.getElementById('btnSaveSettings')?.addEventListener('click', saveSettings);
}

// Load Bot Status and Active Wallet
async function loadStatusAndWallets(isBackground = false) {
  try {
    const data = await safeFetchJson('/api/status');
    if (data.botUsername) {
      configuredBotUsername = data.botUsername.trim();
    }
    const wallet = data.activeWallet || data.wallet;

    if (data.success && wallet && wallet.publicKey) {
      activeWallet = wallet;
      userSettings = data.settings || userSettings;

      const addrDisplay = `${activeWallet.publicKey.slice(0, 4)}...${activeWallet.publicKey.slice(-4)}`;
      const activeWalletAddressEl = document.getElementById('activeWalletAddress');
      if (activeWalletAddressEl) {
        activeWalletAddressEl.innerText = addrDisplay;
        activeWalletAddressEl.title = activeWallet.publicKey;
      }

      const bal = activeWallet.balanceSol !== undefined ? activeWallet.balanceSol : (activeWallet.balance !== undefined ? activeWallet.balance : (data.solBalance !== undefined ? data.solBalance : 0));
      const activeWalletBalanceEl = document.getElementById('activeWalletBalance');
      if (activeWalletBalanceEl) {
        activeWalletBalanceEl.innerText = `${parseFloat(bal || 0).toFixed(4)} SOL`;
      }

      if (currentWalletMode === 'bot') {
        const buyAvailSolEl = document.getElementById('buyAvailSol');
        if (buyAvailSolEl) buyAvailSolEl.innerText = `${parseFloat(bal || 0).toFixed(4)} SOL`;
      }

      if (!isBackground) {
        const slippageEl = document.getElementById('settingSlippage');
        if (slippageEl) slippageEl.value = (userSettings.slippage_bps || 500) / 100;
        const priorityEl = document.getElementById('settingPriorityFee');
        if (priorityEl) priorityEl.value = userSettings.priority_fee_sol || 0.001;
      }
    } else if (data.success && !wallet) {
      const activeWalletAddressEl = document.getElementById('activeWalletAddress');
      if (activeWalletAddressEl) activeWalletAddressEl.innerText = 'No Wallet';
    }
  } catch (err) {
    console.error('Status fetch error:', err);
  }
}

// Load Token Information & Chart
async function loadToken(address, isBackground = false) {
  if (!address) return;
  const trimmed = address.trim();
  currentTokenAddress = trimmed;

  const tokenInput = document.getElementById('tokenInput');
  if (tokenInput && !isBackground) {
    tokenInput.value = trimmed;
  }

  try {
    localStorage.setItem('myanbot_last_token', trimmed);
  } catch {}

  try {
    const currentAddress = currentWalletMode === 'extension' && extWallet.connected && extWallet.publicKey
      ? extWallet.publicKey
      : (activeWallet ? activeWallet.publicKey : '');

    const url = currentAddress
      ? `/api/token/${trimmed}?walletAddress=${encodeURIComponent(currentAddress)}`
      : `/api/token/${trimmed}`;

    const data = await safeFetchJson(url);

    if (!data.success || !data.token) {
      if (!isBackground) showToast('Token not found or invalid Solana address', 'error');
      return;
    }

    currentTokenData = data.token;

    // Header updates
    document.getElementById('tokenSymbol').innerText = `$${currentTokenData.symbol}`;
    document.getElementById('tokenName').innerText = currentTokenData.name;
    document.getElementById('tokenPriceUsd').innerText =
      currentTokenData.priceUsd < 0.01 ? `$${currentTokenData.priceUsd.toFixed(6)}` : `$${currentTokenData.priceUsd.toFixed(4)}`;

    const changeEl = document.getElementById('tokenPriceChange24h');
    const chg = currentTokenData.priceChange24h || 0;
    changeEl.innerText = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
    changeEl.className = `price-change-badge ${chg >= 0 ? 'positive' : 'negative'}`;

    // Live SOL Balance update from token endpoint
    if (data.solBalance !== undefined && data.solBalance !== null) {
      const solBal = parseFloat(data.solBalance) || 0;
      if (currentWalletMode === 'bot') {
        const activeWalletBalanceEl = document.getElementById('activeWalletBalance');
        if (activeWalletBalanceEl) activeWalletBalanceEl.innerText = `${solBal.toFixed(4)} SOL`;
        const buyAvailSolEl = document.getElementById('buyAvailSol');
        if (buyAvailSolEl) buyAvailSolEl.innerText = `${solBal.toFixed(4)} SOL`;
      } else {
        extWallet.solBalance = solBal;
        const extBalEl = document.getElementById('extBalanceDisplay');
        if (extBalEl) extBalEl.innerText = `${solBal.toFixed(4)} SOL`;
        const buyAvailSolEl = document.getElementById('buyAvailSol');
        if (buyAvailSolEl) buyAvailSolEl.innerText = `${solBal.toFixed(4)} SOL`;
      }
    }

    // Auto-update Limit Price Presets for the newly loaded token
    const activeDip = document.querySelector('.limit-dip-preset.active');
    if (activeDip && currentTokenData.priceUsd > 0) {
      const dipPct = parseFloat(activeDip.dataset.dip);
      const target = currentTokenData.priceUsd * (1 - dipPct / 100);
      document.getElementById('limitBuyTargetPrice').value = target < 0.01 ? target.toFixed(6) : target.toFixed(4);
    }
    const activeTp = document.querySelector('.limit-tpsl-preset.active');
    if (activeTp && currentTokenData.priceUsd > 0) {
      const pct = parseFloat(activeTp.dataset.pct);
      const cond = activeTp.dataset.cond;
      const target = cond === 'GTE' ? currentTokenData.priceUsd * (1 + pct / 100) : currentTokenData.priceUsd * (1 - pct / 100);
      document.getElementById('limitSellTargetPrice').value = target < 0.01 ? target.toFixed(6) : target.toFixed(4);
    }
    updateLimitDiffPreview();

    // Update Favorite Button State & Watchlist highlight
    updateFavButtonState();
    renderWatchlistBar();
    renderChartLimitLines();

    // Stats
    document.getElementById('tokenMarketCap').innerText = formatBigNumber(currentTokenData.marketCap);
    document.getElementById('tokenLiquidity').innerText = formatBigNumber(currentTokenData.liquidity);
    document.getElementById('tokenVolume24h').innerText = formatBigNumber(currentTokenData.volume24h);
    document.getElementById('tokenShortChanges').innerText = `${currentTokenData.priceChange5m || 0}% / ${currentTokenData.priceChange1h || 0}%`;

    // Chart Update (DexScreener Live Embed)
    if (!isBackground) {
      const chartFrame = document.getElementById('dexChartFrame');
      if (chartFrame) {
        const chartTarget = currentTokenData.pairAddress || trimmed;
        const newSrc = `https://dexscreener.com/solana/${chartTarget}?embed=1&theme=dark&trades=0&info=0`;
        if (chartFrame.src !== newSrc) {
          chartFrame.src = newSrc;
        }
      }
    }

    // Wallet Position Display
    let holdingTokens = 0;
    if (currentWalletMode === 'bot') {
      holdingTokens = data.tokenBalance?.uiAmount || 0;
    } else {
      holdingTokens = extWallet.tokenBalance?.uiAmount || 0;
    }

    document.getElementById('sellAvailTokens').innerText = `${holdingTokens.toLocaleString()} Tokens`;
    updateSellEstValue();

    const posBanner = document.getElementById('positionBanner');
    if (holdingTokens > 0) {
      posBanner.classList.remove('hidden');
      document.getElementById('posHolding').innerText = `${holdingTokens.toLocaleString()} ${currentTokenData.symbol}`;

      const pos = data.position;
      const entryPrice = pos && pos.avgEntryPriceUsd > 0 ? pos.avgEntryPriceUsd : currentTokenData.priceUsd;
      const entryMc = pos && pos.avgEntryMarketCap > 0 ? pos.avgEntryMarketCap : currentTokenData.marketCap;
      const pnlPct = entryPrice > 0 ? ((currentTokenData.priceUsd - entryPrice) / entryPrice) * 100 : 0;

      if (pos && pos.avgEntryPriceSol > 0) {
        const solEntryStr = pos.avgEntryPriceSol < 0.0001
          ? pos.avgEntryPriceSol.toExponential(2)
          : pos.avgEntryPriceSol.toFixed(6);
        document.getElementById('posEntryPrice').innerHTML = `$${entryPrice < 0.01 ? entryPrice.toFixed(6) : entryPrice.toFixed(4)} <span style="font-size:11px; color:#888; font-weight:normal;">(${solEntryStr} SOL)</span>`;
      } else {
        document.getElementById('posEntryPrice').innerText = `$${entryPrice < 0.01 ? entryPrice.toFixed(6) : entryPrice.toFixed(4)}`;
      }
      document.getElementById('posEntryMc').innerText = formatBigNumber(entryMc);

      const pnlEl = document.getElementById('posPnl');
      if (pnlEl) {
        pnlEl.innerText = `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`;
        pnlEl.className = `pos-val ${pnlPct >= 0 ? 'pos-pnl-val' : 'negative'}`;
      }
    } else {
      posBanner.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error loading token info:', err);
  }
}

// Update Sell Est. Value
function updateSellEstValue() {
  if (!currentTokenData) return;
  const pct = parseFloat(document.getElementById('customSellPercent').value) || 100;
  let totalHolding = 0;
  if (currentWalletMode === 'bot') {
    const rawTxt = document.getElementById('sellAvailTokens').innerText;
    totalHolding = parseFloat(rawTxt.replace(/[^0-9.]/g, '')) || 0;
  } else {
    totalHolding = extWallet.tokenBalance?.uiAmount || 0;
  }

  const tokensToSell = totalHolding * (pct / 100);
  const estVal = tokensToSell * currentTokenData.priceUsd;
  document.getElementById('sellEstValUsd').innerText = `$${estVal.toFixed(2)}`;
}

// Robust Extension Transaction Signing & Broadcasting
async function signAndBroadcastExtensionTx(swapTransactionBase64) {
  let provider = extWallet.provider || getExtensionProvider();
  if (!provider) {
    throw new Error('No Solana wallet extension detected. Please install Phantom or Solflare.');
  }

  // Ensure provider is connected and authorized
  if (!provider.publicKey || !provider.isConnected) {
    if (typeof provider.connect === 'function') {
      try {
        const connRes = await provider.connect();
        if (connRes?.publicKey) {
          extWallet.publicKey = connRes.publicKey.toString();
        }
      } catch (connErr) {
        throw new Error('Wallet connection was rejected. Please approve the connection request in your wallet.');
      }
    }
  }

  if (!provider.publicKey) {
    throw new Error('Please unlock your wallet extension and try again.');
  }

  const binaryString = atob(swapTransactionBase64);
  const txBuf = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    txBuf[i] = binaryString.charCodeAt(i);
  }

  if (!window.solanaWeb3 || !window.solanaWeb3.VersionedTransaction) {
    throw new Error('Solana Web3 SDK is initializing. Please refresh the page and try again.');
  }

  const versionedTx = window.solanaWeb3.VersionedTransaction.deserialize(txBuf);
  let signature = '';

  // Attempt 1: Direct signAndSendTransaction from extension
  try {
    if (typeof provider.signAndSendTransaction === 'function') {
      const signRes = await provider.signAndSendTransaction(versionedTx, {
        skipPreflight: true,
        maxRetries: 3,
      });
      signature = typeof signRes === 'string' ? signRes : (signRes?.signature || signRes?.toString() || '');
    }
  } catch (err) {
    const errMsg = err?.message || String(err);
    if (errMsg.includes('User rejected') || errMsg.includes('cancelled') || errMsg.includes('declined')) {
      throw new Error('Transaction cancelled: You declined the request in your wallet.');
    }
    console.warn('signAndSendTransaction error, falling back to signTransaction + node broadcast:', err);
  }

  // Attempt 2: Fallback to signTransaction + backend direct RPC broadcast
  if (!signature && typeof provider.signTransaction === 'function') {
    try {
      const signedTx = await provider.signTransaction(versionedTx);
      const serialized = signedTx.serialize();
      let b64 = '';
      const bytes = new Uint8Array(serialized);
      for (let i = 0; i < bytes.byteLength; i++) {
        b64 += String.fromCharCode(bytes[i]);
      }
      const rawB64 = btoa(b64);

      const sendRes = await safeFetchJson('/api/trade/send-raw-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTransactionBase64: rawB64 }),
      });

      if (!sendRes.success || !sendRes.signature) {
        throw new Error(sendRes.error || 'Broadcast to Solana node failed');
      }
      signature = sendRes.signature;
    } catch (fallbackErr) {
      const fbMsg = fallbackErr?.message || String(fallbackErr);
      if (fbMsg.includes('User rejected') || fbMsg.includes('cancelled') || fbMsg.includes('declined')) {
        throw new Error('Transaction cancelled: You declined the request in your wallet.');
      }
      throw fallbackErr;
    }
  }

  if (!signature) {
    throw new Error('Could not obtain signature from wallet. Please check your extension.');
  }

  return signature;
}

// Execute Buy (Bot or Extension)
async function executeBuy() {
  const btn = document.getElementById('btnExecuteBuy');
  if (!currentTokenAddress || currentTokenAddress.toLowerCase() === 'so11111111111111111111111111111111111111112') {
    showToast('Please select a token (e.g. $BONK, $WIF, $JUP) from the Watchlist to buy!', 'info');
    const favs = getFavorites();
    const otherCoin = favs.find((f) => f.address.toLowerCase() !== 'so11111111111111111111111111111111111111112');
    if (otherCoin) loadToken(otherCoin.address);
    return;
  }

  const amount = parseFloat(document.getElementById('customBuyAmount').value);
  if (!amount || amount <= 0) {
    showToast('Please enter a valid SOL amount to buy', 'error');
    return;
  }

  btn.disabled = true;

  if (currentWalletMode === 'extension') {
    if (!extWallet.connected || !extWallet.publicKey) {
      showToast('Please connect your Phantom/Solflare extension first!', 'error');
      openWalletModal();
      btn.disabled = false;
      return;
    }
    btn.innerText = 'Building Quote...';
    try {
      const data = await safeFetchJson('/api/trade/build-swap-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPublicKey: extWallet.publicKey,
          tokenAddress: currentTokenAddress,
          tradeType: 'BUY',
          amountSol: amount,
          slippageBps: userSettings.slippage_bps || 500,
          priorityFeeSol: userSettings.priority_fee_sol || 0.001,
        }),
      });

      if (!data.success || !data.swapTransaction) {
        throw new Error(data.error || 'Failed to build transaction from Jupiter');
      }

      btn.innerText = 'Please Approve in Wallet...';
      const signature = await signAndBroadcastExtensionTx(data.swapTransaction);

      showToast(`Buy Transaction Sent! Tx: ${signature.slice(0, 8)}...`, 'success');

      // Record trade to DB for PnL with exact execution price
      const decimals = currentTokenData?.decimals || 6;
      const quoteOut = data.quote?.outAmount ? (Number(data.quote.outAmount) / 10 ** decimals) : 0;
      const solPrice = data.solPriceUsd || 102.75;
      const executedPriceUsd = quoteOut > 0 ? (amount * solPrice) / quoteOut : (currentTokenData?.priceUsd || 0);
      const executedMc = currentTokenData?.priceUsd && currentTokenData.priceUsd > 0
        ? (executedPriceUsd / currentTokenData.priceUsd) * (currentTokenData.marketCap || 0)
        : (currentTokenData?.marketCap || 0);

      await safeFetchJson('/api/trade/record-external-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: extWallet.publicKey,
          tokenAddress: currentTokenAddress,
          tokenSymbol: currentTokenData?.symbol || 'TOKEN',
          tradeType: 'BUY',
          amountSol: amount,
          tokenAmount: quoteOut,
          priceUsd: executedPriceUsd,
          marketCapUsd: executedMc,
          txSignature: signature,
        }),
      });

      await loadExtensionBalance();
      await loadToken(currentTokenAddress);
      await loadPortfolio();
      await loadHistory();
    } catch (err) {
      console.error('Extension buy error:', err);
      showToast(err.message || 'Buy failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Instant Buy';
    }
  } else {
    // Bot Wallet Mode
    btn.innerText = 'Swapping on Solana...';
    try {
      const data = await safeFetchJson('/api/trade/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: currentTokenAddress,
          solAmount: amount,
          amountSol: amount,
          slippageBps: userSettings.slippage_bps || 500,
          priorityFeeSol: userSettings.priority_fee_sol || 0.001,
        }),
      });

      if (data.success) {
        showToast(`Buy Success! Received ${data.tokenSymbol}. Tx: ${data.signature.slice(0, 8)}...`, 'success');
        await loadStatusAndWallets();
        await loadToken(currentTokenAddress);
        await loadPortfolio();
        await loadHistory();
      } else {
        showToast(`Swap Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Instant Buy';
    }
  }
}

// Execute Sell (Bot or Extension)
async function executeSell() {
  const percent = parseFloat(document.getElementById('customSellPercent').value) || 100;
  const btn = document.getElementById('btnExecuteSell');
  btn.disabled = true;

  if (currentWalletMode === 'extension') {
    if (!extWallet.connected || !extWallet.publicKey) {
      showToast('Please connect your Phantom/Solflare extension first!', 'error');
      openWalletModal();
      btn.disabled = false;
      return;
    }
    btn.innerText = 'Building Quote...';
    try {
      const data = await safeFetchJson('/api/trade/build-swap-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPublicKey: extWallet.publicKey,
          tokenAddress: currentTokenAddress,
          tradeType: 'SELL',
          percent,
          slippageBps: userSettings.slippage_bps || 500,
          priorityFeeSol: userSettings.priority_fee_sol || 0.001,
        }),
      });

      if (!data.success || !data.swapTransaction) {
        throw new Error(data.error || 'Failed to build transaction from Jupiter');
      }

      btn.innerText = 'Please Approve in Wallet...';
      const signature = await signAndBroadcastExtensionTx(data.swapTransaction);

      showToast(`Sell Transaction Sent! Tx: ${signature.slice(0, 8)}...`, 'success');

      // Record trade to DB with exact execution price
      const quoteOutLamports = data.quote?.outAmount ? Number(data.quote.outAmount) : 0;
      const outSol = quoteOutLamports > 0 ? quoteOutLamports / 1e9 : 0;
      const holdingTokens = extWallet.tokenBalance?.uiAmount || 0;
      const soldTokens = (holdingTokens * percent) / 100;
      const solPrice = data.solPriceUsd || 102.75;
      const executedPriceUsd = soldTokens > 0 ? (outSol * solPrice) / soldTokens : (currentTokenData?.priceUsd || 0);
      const executedMc = currentTokenData?.priceUsd && currentTokenData.priceUsd > 0
        ? (executedPriceUsd / currentTokenData.priceUsd) * (currentTokenData.marketCap || 0)
        : (currentTokenData?.marketCap || 0);

      await safeFetchJson('/api/trade/record-external-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: extWallet.publicKey,
          tokenAddress: currentTokenAddress,
          tokenSymbol: currentTokenData?.symbol || 'TOKEN',
          tradeType: 'SELL',
          amountSol: outSol,
          tokenAmount: soldTokens,
          priceUsd: executedPriceUsd,
          marketCapUsd: executedMc,
          txSignature: signature,
        }),
      });

      await loadExtensionBalance();
      await loadToken(currentTokenAddress);
      await loadPortfolio();
      await loadHistory();
    } catch (err) {
      console.error('Extension sell error:', err);
      showToast(err.message || 'Sell failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Instant Sell';
    }
  } else {
    // Bot Wallet Mode
    btn.innerText = 'Swapping on Solana...';
    try {
      const data = await safeFetchJson('/api/trade/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress: currentTokenAddress,
          percent,
          slippageBps: userSettings.slippage_bps || 500,
          priorityFeeSol: userSettings.priority_fee_sol || 0.001,
        }),
      });

      if (data.success) {
        showToast(`Sell Success! Received ${data.outSol} SOL. Tx: ${data.signature.slice(0, 8)}...`, 'success');
        await loadStatusAndWallets();
        await loadToken(currentTokenAddress);
        await loadPortfolio();
        await loadHistory();
      } else {
        showToast(`Swap Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = 'Instant Sell';
    }
  }
}

// Create Limit Order
async function createLimitOrderUI(orderType) {
  let targetPrice = 0;
  let amountSol = null;
  let amountPercent = null;
  let condition = 'LTE';

  if (orderType === 'BUY_LIMIT') {
    targetPrice = parseFloat(document.getElementById('limitBuyTargetPrice').value);
    amountSol = parseFloat(document.getElementById('limitBuySolAmount').value);
    condition = 'LTE';
    if (!targetPrice || targetPrice <= 0 || !amountSol || amountSol <= 0) {
      showToast('Please enter target price and SOL amount', 'error');
      return;
    }
  } else {
    targetPrice = parseFloat(document.getElementById('limitSellTargetPrice').value);
    amountPercent = parseFloat(document.getElementById('limitSellPercent').value) || 100;
    const activePreset = document.querySelector('.limit-tpsl-preset.active');
    condition = activePreset ? activePreset.dataset.cond : 'GTE';
    if (!targetPrice || targetPrice <= 0) {
      showToast('Please enter target price for Limit Sell', 'error');
      return;
    }
  }

  try {
    const data = await safeFetchJson('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAddress: currentTokenAddress,
        tokenSymbol: currentTokenData?.symbol || 'TOKEN',
        orderType,
        targetPriceUsd: targetPrice,
        condition,
        amountSol,
        amountPercent,
        slippageBps: userSettings.slippage_bps || 500,
      }),
    });

    if (data.success) {
      showToast(`Limit Order #${data.order.id} Created!`, 'success');
      await loadOrders();
      renderChartLimitLines();
      const ordersTab = document.querySelector('.bottom-tab[data-btab="orders"]');
      ordersTab?.click();
    } else {
      showToast(`Failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Save Settings
async function saveSettings() {
  const slippageInput = document.getElementById('settingCustomSlippage') || document.getElementById('settingSlippage');
  const slippageVal = slippageInput ? parseFloat(slippageInput.value) : 5.0;
  const slippageBps = Math.floor((isNaN(slippageVal) ? 5.0 : slippageVal) * 100);

  const priorityFeeInput = document.getElementById('settingPriorityFee');
  const priorityFeeSol = priorityFeeInput ? parseFloat(priorityFeeInput.value) : 0.001;

  try {
    const data = await safeFetchJson('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slippageBps, priorityFeeSol }),
    });
    if (data.success) {
      userSettings = data.settings;
      setQuickSlippage(slippageBps);
      showToast('Settings saved successfully!', 'success');
      document.getElementById('settingsModal')?.classList.add('hidden');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Load Portfolio Holdings
async function loadPortfolio() {
  try {
    const currentAddress = currentWalletMode === 'extension' && extWallet.connected && extWallet.publicKey
      ? extWallet.publicKey
      : (activeWallet ? activeWallet.publicKey : '');

    const url = currentAddress
      ? `/api/portfolio?walletAddress=${encodeURIComponent(currentAddress)}`
      : '/api/portfolio';

    const data = await safeFetchJson(url);
    const tbody = document.getElementById('portfolioTableBody');
    const countEl = document.getElementById('countHoldings');

    const holdings = data.holdings || data.portfolio?.holdings || [];

    if (!data.success || holdings.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="empty-msg">No token holdings found.</td></tr>`;
      if (countEl) countEl.innerText = '0';
      return;
    }

    if (countEl) countEl.innerText = holdings.length;

    if (tbody) {
      tbody.innerHTML = holdings
        .map(
          (h) => `
        <tr class="holding-row" onclick="handleHoldingRowClick(event, '${h.mint}', '$${h.symbol}')" title="Click to view chart and trade $${h.symbol}">
          <td>
            <div class="token-cell-info">
              <div style="font-weight:700; color: #FFF; font-size: 14px;">$${h.symbol}</div>
              <div style="font-size:11px; color:#888;">${h.name}</div>
              <div class="ca-copy-pill" onclick="event.stopPropagation(); copyToClipboard('${h.mint}', '$${h.symbol} CA')" title="Click to Copy Contract Address">
                <span>${h.mint.slice(0, 4)}...${h.mint.slice(-4)}</span>
                <span></span>
              </div>
            </div>
          </td>
          <td><strong>${h.amount.toLocaleString()}</strong></td>
          <td>$${h.priceUsd < 0.01 ? h.priceUsd.toFixed(6) : h.priceUsd.toFixed(4)}</td>
          <td style="color:#00FFA3;font-weight:700;">$${h.valueUsd.toFixed(2)}</td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button class="btn-primary-sm" onclick="event.stopPropagation(); handleHoldingRowClick(event, '${h.mint}', '$${h.symbol}')" title="Open chart & trade $${h.symbol}">Chart</button>
              <button class="btn-copy-ca" onclick="event.stopPropagation(); copyToClipboard('${h.mint}', '$${h.symbol} CA')" title="Copy Contract Address"> Copy CA</button>
              <button class="btn-secondary-sm" onclick="event.stopPropagation(); window.open('/api/pnl-card/${h.mint}', '_blank')" title="Generate PnL Card">Card</button>
            </div>
          </td>
        </tr>
      `
        )
        .join('');
    }
  } catch (err) {
    console.error('Portfolio error:', err);
  }
}

function handleHoldingRowClick(event, mint, symbol = '') {
  if (!mint) return;
  loadToken(mint);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`Loading chart & trade panel for ${symbol || mint.slice(0, 4) + '...'}`, 'info');
}
window.handleHoldingRowClick = handleHoldingRowClick;

// Load Limit Orders
async function loadOrders() {
  try {
    const data = await safeFetchJson('/api/orders');
    const tbody = document.getElementById('ordersTableBody');
    const countEl = document.getElementById('countOrders');

    if (!data.success || !data.orders || data.orders.length === 0) {
      activeLimitOrders = [];
      tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">No active limit orders.</td></tr>`;
      if (countEl) countEl.innerText = '0';
      renderChartLimitLines();
      return;
    }

    activeLimitOrders = data.orders;
    if (countEl) countEl.innerText = data.orders.filter((o) => o.status === 'PENDING').length;

    tbody.innerHTML = data.orders
      .map(
        (o) => `
      <tr>
        <td>#${o.id}</td>
        <td><span class="${o.order_type === 'BUY_LIMIT' ? 'pos-pnl-val' : 'negative'}">${o.order_type}</span></td>
        <td><strong>$${o.token_symbol}</strong></td>
        <td>$${o.target_price_usd < 0.01 ? o.target_price_usd.toFixed(6) : o.target_price_usd.toFixed(4)} (${o.condition})</td>
        <td>${o.order_type === 'BUY_LIMIT' ? `${o.amount_sol} SOL` : `${o.amount_percent}%`} <span style="font-size: 11px; opacity: 0.75;">(${(o.slippage_bps ? o.slippage_bps / 100 : 5).toFixed(1)}% slip)</span></td>
        <td><span class="dex-pill">${o.status}</span></td>
        <td>${new Date(o.created_at).toLocaleTimeString()}</td>
        <td>
          ${o.status === 'PENDING' ? `<button class="btn-secondary-sm" onclick="cancelOrder(${o.id})">Cancel</button>` : '—'}
        </td>
      </tr>
    `
      )
      .join('');

    renderChartLimitLines();
  } catch (err) {
    console.error('Orders error:', err);
  }
}

// Cancel Order
async function cancelOrder(id) {
  try {
    const data = await safeFetchJson(`/api/orders/cancel/${id}`, { method: 'POST' });
    if (data.success) {
      showToast(`Order #${id} Cancelled`, 'success');
      await loadOrders();
      renderChartLimitLines();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

// Load Trade History
async function loadHistory() {
  try {
    const data = await safeFetchJson('/api/trades');
    const tbody = document.getElementById('historyTableBody');

    if (!data.success || !data.trades || data.trades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">No trade history yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.trades
      .map(
        (t) => `
      <tr>
        <td>#${t.id}</td>
        <td><span class="${t.trade_type === 'BUY' ? 'pos-pnl-val' : 'negative'}">${t.trade_type}</span></td>
        <td><strong>$${t.token_symbol}</strong></td>
        <td>$${t.price_usd < 0.01 ? t.price_usd.toFixed(6) : t.price_usd.toFixed(4)}</td>
        <td>${t.amount_sol.toFixed(4)} SOL</td>
        <td>${t.token_amount.toLocaleString()}</td>
        <td>${new Date(t.created_at).toLocaleString()}</td>
        <td>
          ${t.tx_signature ? `<a href="https://solscan.io/tx/${t.tx_signature}" target="_blank" style="color:#14F195;">View TX</a>` : '—'}
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    console.error('History error:', err);
  }
}

// Load Wallets Manager
async function loadWalletsManager() {
  try {
    const data = await safeFetchJson('/api/wallets');
    const tbody = document.getElementById('walletsTableBody');
    if (!tbody) return;

    if (!data.success || !data.wallets || data.wallets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">No wallets found. Click 'Create New Wallet' or 'Import Key / Seed Phrase' to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.wallets
      .map((w) => {
        const bal = w.balanceSol !== undefined ? Number(w.balanceSol).toFixed(4) : (w.balance !== undefined ? Number(w.balance).toFixed(4) : '0.0000');
        const pub = String(w.publicKey || '');
        return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <code style="font-weight:700; color:#FFF;">${pub}</code>
            <button class="btn-copy-sm" onclick="copyToClipboard('${pub}', 'Address')" title="Copy Address">Copy</button>
          </div>
        </td>
        <td><strong style="color:#00FFA3; font-size:14px;">${bal} SOL</strong></td>
        <td>
          ${w.isActive ? `<span class="active-wallet-pill">ACTIVE</span>` : '<span style="color:#777; font-size:12px;">Secondary</span>'}
        </td>
        <td>
          <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
            ${!w.isActive ? `<button class="btn-primary-sm" onclick="selectWallet('${pub}')" title="Set this wallet as active trading wallet">Set Active</button>` : ''}
            <button class="btn-export-sm" onclick="openExportWalletModal('${pub}')" title="View Private Key & Seed Phrase">Export Keys</button>
            <button class="btn-danger-sm" onclick="handleDeleteWallet('${pub}')" title="Remove wallet from database">Delete</button>
          </div>
        </td>
      </tr>
    `;
      })
      .join('');
  } catch (err) {
    console.error('Wallets error:', err);
  }
}
window.loadWalletsManager = loadWalletsManager;

// Select Wallet
async function selectWallet(publicKey) {
  try {
    const data = await safeFetchJson('/api/wallets/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey }),
    });
    if (data.success) {
      showToast('Wallet switched!', 'success');
      await loadStatusAndWallets();
      await loadWalletsManager();
      await loadPortfolio();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
window.selectWallet = selectWallet;

// Create New Wallet Handler
async function handleCreateNewWallet() {
  try {
    showToast('Generating new Solana wallet keypair...', 'info');
    const data = await safeFetchJson('/api/wallets/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (data.success) {
      document.getElementById('createdPubkeyDisplay').value = data.publicKey || '';
      document.getElementById('createdPrivkeyDisplay').value = data.privateKey || '';
      document.getElementById('createdPrivkeyDisplay').type = 'password';

      const mnSec = document.getElementById('createdMnemonicSection');
      if (data.mnemonic) {
        if (mnSec) mnSec.classList.remove('hidden');
        document.getElementById('createdMnemonicDisplay').value = data.mnemonic;
      } else {
        if (mnSec) mnSec.classList.add('hidden');
      }

      document.getElementById('createdWalletModal')?.classList.remove('hidden');
      showToast('New wallet created successfully!', 'success');
      await loadStatusAndWallets();
      await loadWalletsManager();
    } else {
      showToast(`Creation failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
window.handleCreateNewWallet = handleCreateNewWallet;

function closeCreatedWalletModal() {
  document.getElementById('createdWalletModal')?.classList.add('hidden');
}
window.closeCreatedWalletModal = closeCreatedWalletModal;

// Import Wallet Modal Handlers
function openImportWalletModal() {
  const inp = document.getElementById('inputImportKeyOrSeed');
  if (inp) inp.value = '';
  document.getElementById('importWalletModal')?.classList.remove('hidden');
}
window.openImportWalletModal = openImportWalletModal;

function closeImportWalletModal() {
  document.getElementById('importWalletModal')?.classList.add('hidden');
}
window.closeImportWalletModal = closeImportWalletModal;

async function submitImportWallet() {
  const input = document.getElementById('inputImportKeyOrSeed')?.value?.trim();
  if (!input) {
    showToast('Please enter a Private Key or 12-word Seed Phrase', 'error');
    return;
  }

  const btn = document.getElementById('btnSubmitImportWallet');
  if (btn) btn.disabled = true;

  try {
    const data = await safeFetchJson('/api/wallets/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    });

    if (data.success) {
      showToast(`Imported: ${data.publicKey.slice(0, 4)}...${data.publicKey.slice(-4)}`, 'success');
      closeImportWalletModal();
      await loadStatusAndWallets();
      await loadWalletsManager();
      await loadPortfolio();
    } else {
      showToast(`Import failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}
window.submitImportWallet = submitImportWallet;

// Export Wallet Modal Handlers
async function openExportWalletModal(publicKey) {
  if (!publicKey) return;
  try {
    showToast('Retrieving wallet credentials...', 'info');
    const data = await safeFetchJson('/api/wallets/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey }),
    });

    if (data.success) {
      const pubEl = document.getElementById('exportPubkeyDisplay');
      const privEl = document.getElementById('exportPrivkeyDisplay');
      const mnEl = document.getElementById('exportMnemonicDisplay');
      const mnSec = document.getElementById('exportMnemonicSection');

      if (pubEl) pubEl.value = data.publicKey || '';
      if (privEl) {
        privEl.value = data.privateKey || '';
        privEl.type = 'text';
      }

      if (data.mnemonic) {
        if (mnSec) mnSec.classList.remove('hidden');
        if (mnEl) mnEl.value = data.mnemonic;
      } else {
        if (mnSec) mnSec.classList.add('hidden');
      }

      const modal = document.getElementById('exportWalletModal');
      if (modal) modal.classList.remove('hidden');
    } else {
      showToast(`Failed to export wallet: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
window.openExportWalletModal = openExportWalletModal;

function closeExportWalletModal() {
  document.getElementById('exportWalletModal')?.classList.add('hidden');
}
window.closeExportWalletModal = closeExportWalletModal;

function toggleKeyVisibility(inputId, btn) {
  const el = document.getElementById(inputId);
  if (!el) return;
  if (el.type === 'password') {
    el.type = 'text';
    if (btn) btn.innerText = 'Hide';
  } else {
    el.type = 'password';
    if (btn) btn.innerText = 'Show';
  }
}
window.toggleKeyVisibility = toggleKeyVisibility;

// Clipboard helper with robust fallback
function copyToClipboard(text, label = 'Text') {
  if (!text) {
    showToast('Nothing to copy', 'info');
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(`${label} copied to clipboard!`, 'success'))
      .catch(() => fallbackCopyText(text, label));
  } else {
    fallbackCopyText(text, label);
  }
}
window.copyToClipboard = copyToClipboard;

function fallbackCopyText(text, label) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast(`${label} copied to clipboard!`, 'success');
  } catch (err) {
    showToast(`Failed to copy ${label}`, 'error');
  }
}

// Delete Wallet Handler
async function handleDeleteWallet(publicKey) {
  if (!publicKey) return;
  const confirmed = confirm(`Are you sure you want to remove wallet:\n${publicKey}\n\nPlease ensure you have backed up your private key or seed phrase!`);
  if (!confirmed) return;

  try {
    const data = await safeFetchJson(`/api/wallets/${encodeURIComponent(publicKey)}`, {
      method: 'DELETE',
    });

    if (data.success) {
      showToast('Wallet removed successfully', 'info');
      await loadStatusAndWallets();
      await loadWalletsManager();
      await loadPortfolio();
    } else {
      showToast(`Delete failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}
window.handleDeleteWallet = handleDeleteWallet;

// Helper: Format Big Numbers ($1.2M, $450K)
function formatBigNumber(num) {
  if (!num || isNaN(num)) return '$0';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

// Helper: Show Toast Message
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.borderColor = type === 'error' ? '#FF3B30' : '#00FFA3';
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// Copy Trading Web UI Logic
let currentCopyBuyMode = 'FIXED';

async function openCopyModal() {
  const modal = document.getElementById('copyTargetModal');
  if (modal) modal.classList.remove('hidden');
  await populateCopyFollowerWallets();
}

function closeCopyModal() {
  const modal = document.getElementById('copyTargetModal');
  if (modal) modal.classList.add('hidden');
}

async function populateCopyFollowerWallets() {
  const select = document.getElementById('selectCopyFollowerWallet');
  if (!select) return;
  try {
    const data = await safeFetchJson('/api/wallets');
    const wallets = data.wallets || [];
    if (wallets.length === 0) {
      select.innerHTML = '<option value="" style="background:#131722; color:#fff;">No wallets available</option>';
      return;
    }
    select.innerHTML = wallets
      .map((w, idx) => {
        const pk = w.publicKey || w.public_key || '';
        const isActive = w.isActive ?? w.is_active ?? false;
        const bal = typeof w.balanceSol === 'number' ? ` (${w.balanceSol.toFixed(3)} SOL)` : '';
        const activeTag = isActive ? ' [Active]' : '';
        const shortPk = pk ? `${pk.slice(0, 4)}...${pk.slice(-4)}` : 'Unknown';
        const label = `Wallet #${idx + 1} - ${shortPk}${bal}${activeTag}`;
        return `<option value="${pk}" ${isActive ? 'selected' : ''} style="background:#131722; color:#fff;">${label}</option>`;
      })
      .join('');
  } catch (err) {
    console.error('Error fetching wallets for copy modal:', err);
    select.innerHTML = '<option value="" style="background:#131722; color:#fff;">Failed to load wallets</option>';
  }
}

function setCopyBuyMode(mode) {
  currentCopyBuyMode = mode;
  const btnFixed = document.getElementById('btnCopyModeFixed');
  const btnPercent = document.getElementById('btnCopyModePercent');
  const secFixed = document.getElementById('copyFixedSection');
  const secPercent = document.getElementById('copyPercentSection');

  if (mode === 'PERCENT') {
    if (btnFixed) btnFixed.classList.remove('active');
    if (btnPercent) btnPercent.classList.add('active');
    if (secFixed) secFixed.classList.add('hidden');
    if (secPercent) secPercent.classList.remove('hidden');
  } else {
    if (btnFixed) btnFixed.classList.add('active');
    if (btnPercent) btnPercent.classList.remove('active');
    if (secFixed) secFixed.classList.remove('hidden');
    if (secPercent) secPercent.classList.add('hidden');
  }
}

function selectCopySolPreset(val) {
  document.querySelectorAll('.copy-sol-preset').forEach((btn) => {
    if (parseFloat(btn.dataset.val) === val) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  const inp = document.getElementById('inputCopySolAmount');
  if (inp) inp.value = val;
}

function selectCopyPercentPreset(val) {
  document.querySelectorAll('.copy-pct-preset').forEach((btn) => {
    if (parseFloat(btn.dataset.val) === val) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  const inp = document.getElementById('inputCopyPercentAmount');
  if (inp) inp.value = val;
}

async function submitAddCopyTarget() {
  const walletInput = document.getElementById('inputCopyTargetWallet');
  const labelInput = document.getElementById('inputCopyTargetLabel');
  const followerSelect = document.getElementById('selectCopyFollowerWallet');
  const solInput = document.getElementById('inputCopySolAmount');
  const pctInput = document.getElementById('inputCopyPercentAmount');
  const capInput = document.getElementById('inputCopyMaxSolCap');
  const mirrorCheck = document.getElementById('checkCopyMirrorSell');
  const slippageInput = document.getElementById('inputCopySlippage');

  const targetWallet = walletInput?.value?.trim();
  const label = labelInput?.value?.trim() || '';
  const followerWallet = followerSelect?.value?.trim() || null;
  const buyMode = currentCopyBuyMode || 'FIXED';
  const buyAmountSol = parseFloat(solInput?.value) || 0.1;
  const buyPercent = parseFloat(pctInput?.value) || 10;
  const maxSolCap = capInput?.value && parseFloat(capInput.value) > 0 ? parseFloat(capInput.value) : null;
  const mirrorSell = mirrorCheck ? (mirrorCheck.checked ? 1 : 0) : 1;
  const maxSlippageBps = Math.floor((parseFloat(slippageInput?.value) || 5.0) * 100);

  if (!targetWallet) {
    showToast('Please enter a target Solana wallet address', 'error');
    return;
  }

  try {
    const data = await safeFetchJson('/api/copy/targets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetWallet,
        label,
        followerWallet,
        buyMode,
        buyAmountSol,
        buyPercent,
        maxSolCap,
        mirrorSell,
        maxSlippageBps,
      }),
    });

    if (data.success) {
      showToast(`Target ${label || targetWallet.slice(0, 6)} added! Monitoring 24/7.`, 'success');
      closeCopyModal();
      if (walletInput) walletInput.value = '';
      if (labelInput) labelInput.value = '';
      if (capInput) capInput.value = '';
      await loadCopyTargets();
    } else {
      showToast(`Failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function loadCopyTargets() {
  try {
    const data = await safeFetchJson('/api/copy/targets');
    const tbody = document.getElementById('copyTargetsTableBody');
    const countEl = document.getElementById('countCopyTargets');

    const targets = data.targets || [];
    if (countEl) countEl.innerText = targets.filter((t) => t.is_active === 1).length;

    if (!data.success || targets.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">No copy trading targets added yet. Click "Add Target Wallet" above to start copying.</td></tr>`;
      return;
    }

    if (tbody) {
      tbody.innerHTML = targets
        .map((t) => {
          const statusClass = t.is_active === 1 ? 'pos-pnl-val' : 'negative';
          const statusLabel = t.is_active === 1 ? 'ACTIVE' : 'PAUSED';
          const toggleBtnText = t.is_active === 1 ? 'Pause' : 'Resume';
          const mirrorLabel = t.mirror_sell === 1 ? '<span style="color:#00FFA3;">Auto %</span>' : '<span style="color:#888;">Off</span>';
          const labelText = t.label ? `<strong style="color:#fff;">${t.label}</strong><br>` : '';

          const followerDisplay = t.follower_wallet
            ? `<code style="color:#A78BFA;" title="${t.follower_wallet}">${t.follower_wallet.slice(0, 4)}...${t.follower_wallet.slice(-4)}</code>`
            : `<span style="color:#888; font-size:12px;">Active Wallet</span>`;

          const amountDisplay = t.buy_mode === 'PERCENT'
            ? `<strong style="color:#00FFA3;">${t.buy_percent || 10}%</strong> <span style="font-size:11px; color:#888;">(Whale %)${t.max_sol_cap ? '<br>Cap: ' + t.max_sol_cap + ' SOL' : ''}</span>`
            : `<strong style="color:#00FFA3;">${t.buy_amount_sol} SOL</strong> <span style="font-size:11px; color:#888;">(Fixed)</span>`;

          return `
            <tr>
              <td>
                ${labelText}
                <code title="${t.target_wallet}">${t.target_wallet.slice(0, 6)}...${t.target_wallet.slice(-6)}</code>
                <a href="https://solscan.io/account/${t.target_wallet}" target="_blank" style="color:#14F195; margin-left:6px; font-size:11px;" title="View on Solscan">Solscan</a>
              </td>
              <td>${followerDisplay}</td>
              <td>${amountDisplay}</td>
              <td>${mirrorLabel}</td>
              <td>${(t.max_slippage_bps / 100).toFixed(1)}%</td>
              <td><span class="${statusClass}">${statusLabel}</span></td>
              <td>${new Date(t.created_at).toLocaleDateString()}</td>
              <td>
                <button class="btn-secondary-sm" onclick="toggleCopyTarget(${t.id})">${toggleBtnText}</button>
                <button class="btn-secondary-sm" onclick="deleteCopyTarget(${t.id})" style="color:#FF3B30; border-color:rgba(255,59,48,0.3);">Delete</button>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Copy targets error:', err);
  }
}

async function toggleCopyTarget(id) {
  try {
    const data = await safeFetchJson(`/api/copy/targets/${id}/toggle`, { method: 'POST' });
    if (data.success) {
      showToast('Target status updated!', 'success');
      await loadCopyTargets();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteCopyTarget(id) {
  if (!confirm('Are you sure you want to delete this copy target?')) return;
  try {
    const data = await safeFetchJson(`/api/copy/targets/${id}`, { method: 'DELETE' });
    if (data.success) {
      showToast('Copy target deleted', 'info');
      await loadCopyTargets();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function loadCopyHistory() {
  try {
    const data = await safeFetchJson('/api/copy/history');
    const tbody = document.getElementById('copyHistoryTableBody');

    const history = data.history || [];
    if (!data.success || history.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-msg">No copy trades executed yet. Active targets are monitored on-chain 24/7.</td></tr>`;
      return;
    }

    if (tbody) {
      tbody.innerHTML = history
        .map((item) => {
          const typeClass = item.trade_type === 'BUY' ? 'pos-pnl-val' : 'negative';
          const statusClass = item.status === 'EXECUTED' ? 'pos-pnl-val' : 'negative';

          return `
            <tr>
              <td>#${item.id}</td>
              <td><span class="${typeClass}"><strong>${item.trade_type}</strong></span></td>
              <td><strong>$${item.token_symbol}</strong></td>
              <td><code>${item.target_wallet.slice(0, 4)}...${item.target_wallet.slice(-4)}</code></td>
              <td>${item.amount_sol ? `${item.amount_sol.toFixed(3)} SOL` : '—'}</td>
              <td><span class="${statusClass}">${item.status}</span></td>
              <td>
                ${item.our_tx ? `<a href="https://solscan.io/tx/${item.our_tx}" target="_blank" style="color:#00FFA3; font-weight:600; margin-right:8px;">Bot TX</a>` : ''}
                ${item.target_tx ? `<a href="https://solscan.io/tx/${item.target_tx}" target="_blank" style="color:#888;">Target TX</a>` : ''}
              </td>
              <td>${new Date(item.created_at).toLocaleTimeString()}</td>
            </tr>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Copy history error:', err);
  }
}

// Window Exports for Copy Trading
window.openCopyModal = openCopyModal;
window.closeCopyModal = closeCopyModal;
window.setCopyBuyMode = setCopyBuyMode;
window.selectCopySolPreset = selectCopySolPreset;
window.selectCopyPercentPreset = selectCopyPercentPreset;
window.submitAddCopyTarget = submitAddCopyTarget;
window.loadCopyTargets = loadCopyTargets;
window.toggleCopyTarget = toggleCopyTarget;
window.deleteCopyTarget = deleteCopyTarget;
window.loadCopyHistory = loadCopyHistory;

// ====================================================
// Phase 2: DCA (Dollar-Cost Averaging) Logic
// ====================================================
function openCreateDcaModal() {
  const inp = document.getElementById('inputDcaTokenAddress');
  if (inp && currentTokenAddress) inp.value = currentTokenAddress;
  document.getElementById('createDcaModal')?.classList.remove('hidden');
}

function closeCreateDcaModal() {
  document.getElementById('createDcaModal')?.classList.add('hidden');
}

function selectDcaSolPreset(val) {
  document.querySelectorAll('.dca-sol-preset').forEach((btn) => {
    btn.classList.toggle('active', parseFloat(btn.dataset.val) === val);
  });
  const inp = document.getElementById('inputDcaAmountSol');
  if (inp) inp.value = val;
}

function selectDcaIntervalPreset(val) {
  document.querySelectorAll('.dca-interval-preset').forEach((btn) => {
    btn.classList.toggle('active', parseFloat(btn.dataset.val) === val);
  });
  const inp = document.getElementById('inputDcaIntervalHours');
  if (inp) inp.value = val;
}

async function submitCreateDcaOrder() {
  const tokenAddress = document.getElementById('inputDcaTokenAddress')?.value?.trim();
  const amountSol = parseFloat(document.getElementById('inputDcaAmountSol')?.value) || 0.1;
  const intervalHours = parseFloat(document.getElementById('inputDcaIntervalHours')?.value) || 1;
  const totalCycles = parseInt(document.getElementById('inputDcaTotalCycles')?.value, 10) || 10;

  if (!tokenAddress) {
    showToast('Please enter a token contract address', 'error');
    return;
  }

  try {
    const data = await safeFetchJson('/api/dca', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAddress,
        tokenSymbol: currentTokenData?.symbol || 'TOKEN',
        amountSol,
        intervalHours,
        totalCycles,
      }),
    });

    if (data.success) {
      showToast(`DCA Schedule activated! (${amountSol} SOL every ${intervalHours}h)`, 'success');
      playTradeSound('success');
      closeCreateDcaModal();
      await loadDcaOrders();
    } else {
      showToast(`DCA Failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function loadDcaOrders() {
  try {
    const data = await safeFetchJson('/api/dca');
    const tbody = document.getElementById('dcaTableBody');
    const countEl = document.getElementById('countDcaOrders');

    const orders = data.orders || [];
    if (countEl) countEl.innerText = orders.filter((o) => o.is_active === 1).length;

    if (!data.success || orders.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No active DCA schedules. Click 'Create DCA Schedule' above.</td></tr>`;
      return;
    }

    if (tbody) {
      tbody.innerHTML = orders
        .map((o) => {
          const statusClass = o.is_active === 1 ? 'pos-pnl-val' : 'negative';
          const statusLabel = o.is_active === 1 ? 'ACTIVE' : 'PAUSED';
          const toggleBtn = o.is_active === 1 ? 'Pause' : 'Resume';

          return `
            <tr>
              <td><strong>$${o.token_symbol}</strong><br><code style="font-size:11px;">${o.token_address.slice(0, 4)}...${o.token_address.slice(-4)}</code></td>
              <td><strong style="color:#00FFA3;">${o.amount_sol.toFixed(3)} SOL</strong></td>
              <td>Every ${o.interval_hours}h</td>
              <td>${o.executed_cycles} / ${o.total_cycles} buys</td>
              <td>${new Date(o.next_execution_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td><span class="${statusClass}">${statusLabel}</span></td>
              <td>
                <button class="btn-secondary-sm" onclick="toggleDcaOrder(${o.id})">${toggleBtn}</button>
                <button class="btn-danger-sm" onclick="deleteDcaOrder(${o.id})">Delete</button>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('DCA load error:', err);
  }
}

async function toggleDcaOrder(id) {
  try {
    const data = await safeFetchJson(`/api/dca/${id}/toggle`, { method: 'POST' });
    if (data.success) {
      showToast('DCA Schedule updated', 'success');
      await loadDcaOrders();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function deleteDcaOrder(id) {
  if (!confirm('Are you sure you want to cancel this DCA schedule?')) return;
  try {
    const data = await safeFetchJson(`/api/dca/${id}`, { method: 'DELETE' });
    if (data.success) {
      showToast('DCA Schedule cancelled', 'info');
      await loadDcaOrders();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

window.openCreateDcaModal = openCreateDcaModal;
window.closeCreateDcaModal = closeCreateDcaModal;
window.selectDcaSolPreset = selectDcaSolPreset;
window.selectDcaIntervalPreset = selectDcaIntervalPreset;
window.submitCreateDcaOrder = submitCreateDcaOrder;
window.loadDcaOrders = loadDcaOrders;
window.toggleDcaOrder = toggleDcaOrder;
window.deleteDcaOrder = deleteDcaOrder;

// ====================================================
// Phase 2: Trailing Stop-Loss Logic
// ====================================================
function openCreateTrailingModal() {
  if (!currentTokenAddress || !currentTokenData) {
    showToast('Please select a token first', 'error');
    return;
  }
  const disp = document.getElementById('inputTrailingTokenDisplay');
  if (disp) disp.value = `$${currentTokenData.symbol} ($${currentTokenData.priceUsd < 0.01 ? currentTokenData.priceUsd.toFixed(6) : currentTokenData.priceUsd.toFixed(4)})`;
  document.getElementById('createTrailingModal')?.classList.remove('hidden');
}

function closeCreateTrailingModal() {
  document.getElementById('createTrailingModal')?.classList.add('hidden');
}

function selectTrailPctPreset(val) {
  document.querySelectorAll('.trail-pct-preset').forEach((btn) => {
    btn.classList.toggle('active', parseFloat(btn.dataset.val) === val);
  });
  const inp = document.getElementById('inputTrailingPct');
  if (inp) inp.value = val;
}

function selectTrailQtyPreset(val) {
  document.querySelectorAll('.trail-qty-preset').forEach((btn) => {
    btn.classList.toggle('active', parseFloat(btn.dataset.val) === val);
  });
  const inp = document.getElementById('inputTrailingAmountPercent');
  if (inp) inp.value = val;
}

async function submitCreateTrailingOrder() {
  if (!currentTokenAddress || !currentTokenData) return;
  const trailingPct = parseFloat(document.getElementById('inputTrailingPct')?.value) || 15;
  const amountPercent = parseFloat(document.getElementById('inputTrailingAmountPercent')?.value) || 100;

  try {
    const data = await safeFetchJson('/api/trailing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAddress: currentTokenAddress,
        tokenSymbol: currentTokenData.symbol,
        initialPriceUsd: currentTokenData.priceUsd,
        trailingPct,
        amountPercent,
      }),
    });

    if (data.success) {
      showToast(`Trailing SL activated at -${trailingPct}% from peak!`, 'success');
      playTradeSound('success');
      closeCreateTrailingModal();
      await loadTrailingOrders();
    } else {
      showToast(`Failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function loadTrailingOrders() {
  try {
    const data = await safeFetchJson('/api/trailing');
    const tbody = document.getElementById('trailingTableBody');
    const countEl = document.getElementById('countTrailingOrders');

    const orders = data.orders || [];
    if (countEl) countEl.innerText = orders.length;

    if (!data.success || orders.length === 0) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-msg">No active Trailing Stop-Loss orders.</td></tr>`;
      return;
    }

    if (tbody) {
      tbody.innerHTML = orders
        .map((o) => {
          const stopPrice = o.highest_price_usd * (1 - o.trailing_pct / 100);
          return `
            <tr>
              <td><strong>$${o.token_symbol}</strong></td>
              <td>$${o.initial_price_usd < 0.01 ? o.initial_price_usd.toFixed(6) : o.initial_price_usd.toFixed(4)}</td>
              <td><strong style="color:#00FFA3;">$${o.highest_price_usd < 0.01 ? o.highest_price_usd.toFixed(6) : o.highest_price_usd.toFixed(4)}</strong></td>
              <td><span class="negative">-${o.trailing_pct}%</span></td>
              <td><strong>$${stopPrice < 0.01 ? stopPrice.toFixed(6) : stopPrice.toFixed(4)}</strong></td>
              <td>${o.amount_percent}% of bag</td>
              <td>
                <button class="btn-danger-sm" onclick="deleteTrailingOrder(${o.id})">Cancel</button>
              </td>
            </tr>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Trailing load error:', err);
  }
}

async function deleteTrailingOrder(id) {
  try {
    const data = await safeFetchJson(`/api/trailing/${id}`, { method: 'DELETE' });
    if (data.success) {
      showToast('Trailing Stop-Loss cancelled', 'info');
      await loadTrailingOrders();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

window.openCreateTrailingModal = openCreateTrailingModal;
window.closeCreateTrailingModal = closeCreateTrailingModal;
window.selectTrailPctPreset = selectTrailPctPreset;
window.selectTrailQtyPreset = selectTrailQtyPreset;
window.submitCreateTrailingOrder = submitCreateTrailingOrder;
window.loadTrailingOrders = loadTrailingOrders;
window.deleteTrailingOrder = deleteTrailingOrder;

// ====================================================
// Phase 2: Token Launch Sniper Logic
// ====================================================
let isSniperActiveState = false;

async function loadSniperSettings() {
  try {
    const data = await safeFetchJson('/api/sniper');
    if (data.success && data.rule) {
      const r = data.rule;
      isSniperActiveState = r.is_active === 1;

      const btn = document.getElementById('btnToggleSniperActive');
      const txt = document.getElementById('sniperStatusText');
      if (btn && txt) {
        if (isSniperActiveState) {
          btn.className = 'btn-execute sell';
          txt.innerText = 'Sniper: ACTIVE (TURBO)';
        } else {
          btn.className = 'btn-execute buy';
          txt.innerText = 'Sniper: INACTIVE';
        }
      }

      const buyInp = document.getElementById('sniperBuyAmountSol');
      if (buyInp) buyInp.value = r.buy_amount_sol;
      const minInp = document.getElementById('sniperMinLiqUsd');
      if (minInp) minInp.value = r.min_liquidity_usd;
      const maxInp = document.getElementById('sniperMaxLiqUsd');
      if (maxInp) maxInp.value = r.max_liquidity_usd;
      const tpInp = document.getElementById('sniperTakeProfitPct');
      if (tpInp) tpInp.value = r.take_profit_pct;
      const slInp = document.getElementById('sniperStopLossPct');
      if (slInp) slInp.value = r.stop_loss_pct;
      const rugCheck = document.getElementById('sniperRugFilterCheck');
      if (rugCheck) rugCheck.checked = r.rug_filter === 1;
    }
  } catch (err) {
    console.error('Sniper settings load error:', err);
  }
}

async function saveSniperSettings() {
  try {
    const buyAmountSol = parseFloat(document.getElementById('sniperBuyAmountSol')?.value) || 0.1;
    const minLiquidityUsd = parseFloat(document.getElementById('sniperMinLiqUsd')?.value) || 500;
    const maxLiquidityUsd = parseFloat(document.getElementById('sniperMaxLiqUsd')?.value) || 50000;
    const takeProfitPct = parseFloat(document.getElementById('sniperTakeProfitPct')?.value) || 100;
    const stopLossPct = parseFloat(document.getElementById('sniperStopLossPct')?.value) || 50;
    const rugFilter = document.getElementById('sniperRugFilterCheck')?.checked ? true : false;

    const data = await safeFetchJson('/api/sniper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyAmountSol,
        minLiquidityUsd,
        maxLiquidityUsd,
        takeProfitPct,
        stopLossPct,
        rugFilter,
      }),
    });

    if (data.success) {
      showToast('Sniper rules saved successfully!', 'success');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function toggleSniperState() {
  try {
    const newState = !isSniperActiveState;
    const data = await safeFetchJson('/api/sniper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: newState }),
    });

    if (data.success) {
      isSniperActiveState = newState;
      if (newState) {
        showToast('Token Launch Sniper ACTIVATED!', 'success');
        playTradeSound('success');
      } else {
        showToast('Token Launch Sniper PAUSED', 'info');
      }
      await loadSniperSettings();
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

async function triggerManualSnipe() {
  const tokenAddress = document.getElementById('inputManualSnipeAddress')?.value?.trim();
  if (!tokenAddress) {
    showToast('Please paste a Solana token address to snipe', 'error');
    return;
  }

  showToast('Executing instant Turbo Snipe...', 'info');
  try {
    const data = await safeFetchJson('/api/sniper/manual-snipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenAddress }),
    });

    if (data.success) {
      showToast(`Snipe confirmed for ${data.executedCount} order(s)!`, 'success');
      playTradeSound('success');
      await loadToken(tokenAddress);
      await loadPortfolio();
    } else {
      showToast(`Snipe Failed: ${data.errors?.join(', ') || 'Check logs'}`, 'error');
    }
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  }
}

window.loadSniperSettings = loadSniperSettings;
window.saveSniperSettings = saveSniperSettings;
window.toggleSniperState = toggleSniperState;
window.triggerManualSnipe = triggerManualSnipe;

// ====================================================
// Phase 2 Pro Feature: Web Audio Synthesizer (Trade Beeps)
// ====================================================
function playTradeSound(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
}
window.playTradeSound = playTradeSound;

// ====================================================
// Phase 2 Pro Feature: Keyboard Hotkeys
// ====================================================
document.addEventListener('keydown', (e) => {
  // Ignore if user is currently typing in an input or textarea
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    if (e.key === 'Escape') {
      document.activeElement.blur();
      document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
    }
    return;
  }

  const key = e.key.toUpperCase();
  if (key === 'B') {
    e.preventDefault();
    const buyTab = document.querySelector('.side-tab[data-side="buy"]');
    buyTab?.click();
    document.getElementById('buySolAmountInput')?.focus();
  } else if (key === 'S') {
    e.preventDefault();
    const sellTab = document.querySelector('.side-tab[data-side="sell"]');
    sellTab?.click();
  } else if (key === '1') {
    e.preventDefault();
    document.querySelector('.preset-btn[data-val="0.1"]')?.click();
  } else if (key === '2') {
    e.preventDefault();
    document.querySelector('.preset-btn[data-val="0.5"]')?.click();
  } else if (key === '3') {
    e.preventDefault();
    document.querySelector('.preset-btn[data-val="1.0"]')?.click();
  } else if (key === '4') {
    e.preventDefault();
    document.querySelector('.preset-btn[data-val="2.0"]')?.click();
  } else if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
  }
});


