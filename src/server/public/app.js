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
      showToast(`⭐ Added $${sym} to Watchlist!`, 'success');
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
    showToast(`⭐ Added $${tokenSymbol} to Watchlist!`, 'success');
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
    container.innerHTML = `<span style="font-size:11px;color:#777;">No favorites starred yet. Click ⭐ to add.</span>`;
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
          <span class="fav-chip-remove" onclick="event.stopPropagation(); removeFavoriteItem('${item.address}', '${item.symbol}')" title="Remove from Watchlist">✕</span>
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

function updateFavButtonState() {
  const isFav = isTokenFavorited(currentTokenAddress);
  const btnHeader = document.getElementById('btnStarTokenHeader');
  const btnBar = document.getElementById('btnFavCurrentToken');

  if (btnHeader) {
    if (isFav) {
      btnHeader.classList.add('active');
      btnHeader.title = 'Remove from Favorites';
    } else {
      btnHeader.classList.remove('active');
      btnHeader.title = 'Add to Favorites';
    }
  }

  if (btnBar) {
    btnBar.innerText = isFav ? '⭐ Starred' : '⭐ Star Coin';
    btnBar.style.borderColor = isFav ? '#00FFA3' : 'rgba(255, 215, 0, 0.3)';
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
    showToast('⚠️ BOT_USERNAME is not configured in .env! Please set BOT_USERNAME in your .env file.', 'error');
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

  const customInputs = document.querySelectorAll('#quickCustomSlippage, #settingCustomSlippage');
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

  showToast(`⚡ Slippage set to ${pct}%`, 'info');
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

  const otherInputs = document.querySelectorAll('#quickCustomSlippage, #settingCustomSlippage');
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

// Global Window Exports
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

// Bijective coordinate mapping functions between Chart Top % (10% to 90%) and Price Difference % (-50% to +200%)
function priceDiffToTopPercent(diffPct) {
  if (diffPct >= 0) {
    // 0% -> 60%, +200% -> 10%
    return Math.max(10, Math.min(60, 60 - (diffPct / 200) * 50));
  } else {
    // 0% -> 60%, -50% -> 90%
    const dip = Math.abs(diffPct);
    return Math.max(60, Math.min(90, 60 + (dip / 50) * 30));
  }
}

function topPercentToPrice(topPct, currentPrice) {
  const clampedTop = Math.max(10, Math.min(90, topPct));
  let diffPct = 0;
  if (clampedTop <= 60) {
    diffPct = ((60 - clampedTop) / 50) * 200; // 0% to +200%
  } else {
    diffPct = -((clampedTop - 60) / 30) * 50; // 0% to -50%
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
            <span>${isBuy ? '🎯 BUY DIP' : '🎯 SELL TP'} @ $${priceStr} (${diffStr})</span>
            <span class="order-target-pill-btn" onclick="cancelOrder(${o.id})" title="Cancel Order">✕</span>
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
          <span class="chart-limit-badge-text">${isBuy ? '🟢 BUY DIP' : '🔴 SELL TP'} @ $${priceStr} (${diffLabel} • ${amountStr})</span>
          <span class="chart-limit-badge-close" onclick="event.stopPropagation(); cancelOrder(${o.id})" title="Cancel Order">✕</span>
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
      // If clicked on close button (✕), let cancelOrder handle it
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
          badgeText.innerHTML = `${isBuy ? '🟢 BUY DIP' : '🔴 SELL TP'} @ $${newPriceStr} (${newDiffLabel} • ${amountStr}) <span class="chart-drag-tag">✨ RELEASE TO SAVE</span>`;
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
            showToast(`🎯 Order #${order.id} moved to $${finalPriceStr} (${finalDiffLabel})!`, 'success');
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

  // Auto / Any mode
  if (window.phantom?.solana) return window.phantom.solana;
  if (window.solflare) return window.solflare;
  if (window.backpack) return window.backpack;
  if (window.solana) return window.solana;
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
  const isPhantom = !!(window.phantom?.solana || window.solana?.isPhantom);
  const isSolflare = !!(window.solflare || window.solana?.isSolflare);
  const isBackpack = !!(window.backpack || window.solana?.isBackpack);

  const pEl = document.getElementById('badgePhantom');
  const sEl = document.getElementById('badgeSolflare');
  const bEl = document.getElementById('badgeBackpack');

  if (pEl) pEl.innerHTML = isPhantom ? '<span class="status-detected">✓ Detected</span>' : '<span class="status-missing">Not installed</span>';
  if (sEl) sEl.innerHTML = isSolflare ? '<span class="status-detected">✓ Detected</span>' : '<span class="status-missing">Not installed</span>';
  if (bEl) bEl.innerHTML = isBackpack ? '<span class="status-detected">✓ Detected</span>' : '<span class="status-missing">Not installed</span>';
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
      showToast('❌ Phantom wallet not found. Redirecting to download...', 'error');
      window.open('https://phantom.app/', '_blank');
    } else if (walletType === 'solflare') {
      showToast('❌ Solflare wallet not found. Redirecting to download...', 'error');
      window.open('https://solflare.com/', '_blank');
    } else if (walletType === 'backpack') {
      showToast('❌ Backpack wallet not found. Redirecting to download...', 'error');
      window.open('https://backpack.app/', '_blank');
    } else {
      showToast('❌ No Solana Extension detected! Please install Phantom or Solflare.', 'error');
      window.open('https://phantom.app/', '_blank');
    }
    return;
  }

  try {
    let resp;
    if (provider.isSolflare && typeof provider.connect === 'function') {
      await provider.connect();
      resp = { publicKey: provider.publicKey };
    } else if (typeof provider.connect === 'function') {
      resp = await provider.connect();
    }

    const pubKeyStr = (resp?.publicKey || provider.publicKey)?.toString();
    if (!pubKeyStr) {
      throw new Error('Could not get public key from extension');
    }

    extWallet.publicKey = pubKeyStr;
    extWallet.provider = provider;
    extWallet.connected = true;

    if (provider.on) {
      provider.on('disconnect', () => {
        disconnectExtensionWallet();
      });
      provider.on('accountChanged', (newPubkey) => {
        if (newPubkey) {
          extWallet.publicKey = newPubkey.toString();
          loadExtensionBalance();
        } else {
          disconnectExtensionWallet();
        }
      });
    }

    closeWalletModal();
    updateExtensionBadgeUI();
    await loadExtensionBalance();
    if (currentTokenAddress) await loadToken(currentTokenAddress);

    showToast(`👻 Connected: ${pubKeyStr.slice(0, 4)}...${pubKeyStr.slice(-4)}`, 'success');
  } catch (err) {
    console.error('Wallet connection error:', err);
    showToast(`❌ Connection failed: ${err.message || err}`, 'error');
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
    showToast('🤖 Switched to Bot Wallet (Telegram Auto-Sync)', 'info');
  } else {
    btnModeExt?.classList.add('active');
    btnModeBot?.classList.remove('active');
    botBadge?.classList.add('hidden');
    extBox?.classList.remove('hidden');
    limitNotice?.classList.remove('hidden');

    if (!extWallet.connected) {
      openWalletModal();
    } else {
      showToast('👻 Switched to Browser Extension Wallet', 'info');
    }
  }

  // Refresh token view for updated wallet balances
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
  extWallet.solBalance = 0;
  extWallet.tokenBalance = { amount: '0', decimals: 6, uiAmount: 0 };

  updateExtensionBadgeUI();
  showToast('Extension disconnected', 'info');
}

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

function handleLoadTokenClick() {
  const input = document.getElementById('tokenInput');
  if (input && input.value.trim()) {
    loadToken(input.value.trim());
  }
}
window.handleLoadTokenClick = handleLoadTokenClick;

// Setup UI Event Listeners
function setupEventListeners() {
  // Load Token Input
  document.getElementById('btnLoadToken')?.addEventListener('click', handleLoadTokenClick);

  document.getElementById('tokenInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleLoadTokenClick();
    }
  });

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
    const data = await safeFetchJson(`/api/token/${trimmed}`);

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
      if (currentWalletMode === 'bot') {
        const activeWalletBalanceEl = document.getElementById('activeWalletBalance');
        if (activeWalletBalanceEl) activeWalletBalanceEl.innerText = `${parseFloat(data.solBalance).toFixed(4)} SOL`;
        const buyAvailSolEl = document.getElementById('buyAvailSol');
        if (buyAvailSolEl) buyAvailSolEl.innerText = `${parseFloat(data.solBalance).toFixed(4)} SOL`;
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

      document.getElementById('posEntryPrice').innerText = `$${entryPrice < 0.01 ? entryPrice.toFixed(6) : entryPrice.toFixed(4)}`;
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

// Execute Buy (Bot or Extension)
async function executeBuy() {
  const btn = document.getElementById('btnExecuteBuy');
  if (!currentTokenAddress || currentTokenAddress.toLowerCase() === 'so11111111111111111111111111111111111111112') {
    showToast('⚠️ Please select a token (e.g. $BONK, $WIF, $JUP) from the Watchlist to buy!', 'info');
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
      showToast('❌ Please connect your Phantom/Solflare extension first!', 'error');
      btn.disabled = false;
      return;
    }
    btn.innerText = '⏳ Building Quote...';
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

      btn.innerText = '✍️ Please Approve in Wallet...';
      const txBuf = Uint8Array.from(atob(data.swapTransaction), (c) => c.charCodeAt(0));
      let signature = '';

      if (window.solanaWeb3 && window.solanaWeb3.VersionedTransaction) {
        const versionedTx = window.solanaWeb3.VersionedTransaction.deserialize(txBuf);
        const signRes = await extWallet.provider.signAndSendTransaction(versionedTx);
        signature = signRes.signature || signRes;
      } else {
        const signRes = await extWallet.provider.signAndSendTransaction(txBuf);
        signature = signRes.signature || signRes;
      }

      showToast(`🚀 Buy Transaction Sent! Tx: ${signature.slice(0, 8)}...`, 'success');

      // Record trade to DB for PnL
      await safeFetchJson('/api/trade/record-external-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: extWallet.publicKey,
          tokenAddress: currentTokenAddress,
          tokenSymbol: currentTokenData?.symbol || 'TOKEN',
          tradeType: 'BUY',
          amountSol: amount,
          tokenAmount: 0,
          priceUsd: currentTokenData?.priceUsd || 0,
          marketCapUsd: currentTokenData?.marketCap || 0,
          txSignature: signature,
        }),
      });

      await loadExtensionBalance();
      await loadToken(currentTokenAddress);
      await loadHistory();
    } catch (err) {
      console.error('Extension buy error:', err);
      showToast(`❌ Buy Failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '🟢 Instant Buy';
    }
  } else {
    // Bot Wallet Mode
    btn.innerText = '⏳ Swapping on Solana...';
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
        showToast(`🚀 Buy Success! Received ${data.tokenSymbol}. Tx: ${data.signature.slice(0, 8)}...`, 'success');
        await loadStatusAndWallets();
        await loadToken(currentTokenAddress);
        await loadPortfolio();
        await loadHistory();
      } else {
        showToast(`❌ Swap Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '🟢 Instant Buy';
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
      showToast('❌ Please connect your Phantom/Solflare extension first!', 'error');
      btn.disabled = false;
      return;
    }
    btn.innerText = '⏳ Building Quote...';
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

      btn.innerText = '✍️ Please Approve in Wallet...';
      const txBuf = Uint8Array.from(atob(data.swapTransaction), (c) => c.charCodeAt(0));
      let signature = '';

      if (window.solanaWeb3 && window.solanaWeb3.VersionedTransaction) {
        const versionedTx = window.solanaWeb3.VersionedTransaction.deserialize(txBuf);
        const signRes = await extWallet.provider.signAndSendTransaction(versionedTx);
        signature = signRes.signature || signRes;
      } else {
        const signRes = await extWallet.provider.signAndSendTransaction(txBuf);
        signature = signRes.signature || signRes;
      }

      showToast(`🔥 Sell Transaction Sent! Tx: ${signature.slice(0, 8)}...`, 'success');

      // Record trade to DB
      await safeFetchJson('/api/trade/record-external-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: extWallet.publicKey,
          tokenAddress: currentTokenAddress,
          tokenSymbol: currentTokenData?.symbol || 'TOKEN',
          tradeType: 'SELL',
          amountSol: 0,
          tokenAmount: 0,
          priceUsd: currentTokenData?.priceUsd || 0,
          marketCapUsd: currentTokenData?.marketCap || 0,
          txSignature: signature,
        }),
      });

      await loadExtensionBalance();
      await loadToken(currentTokenAddress);
      await loadHistory();
    } catch (err) {
      console.error('Extension sell error:', err);
      showToast(`❌ Sell Failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '🔴 Instant Sell';
    }
  } else {
    // Bot Wallet Mode
    btn.innerText = '⏳ Swapping on Solana...';
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
        showToast(`🔥 Sell Success! Received ${data.outSol} SOL. Tx: ${data.signature.slice(0, 8)}...`, 'success');
        await loadStatusAndWallets();
        await loadToken(currentTokenAddress);
        await loadPortfolio();
        await loadHistory();
      } else {
        showToast(`❌ Swap Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerText = '🔴 Instant Sell';
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
      }),
    });

    if (data.success) {
      showToast(`🎯 Limit Order #${data.order.id} Created!`, 'success');
      await loadOrders();
      renderChartLimitLines();
      const ordersTab = document.querySelector('.bottom-tab[data-btab="orders"]');
      ordersTab?.click();
    } else {
      showToast(`❌ Failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast(`❌ Error: ${err.message}`, 'error');
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
    const data = await safeFetchJson('/api/portfolio');
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
        <tr>
          <td>
            <div style="font-weight:700;">$${h.symbol}</div>
            <div style="font-size:10px;color:#888;">${h.name}</div>
          </td>
          <td><strong>${h.amount.toLocaleString()}</strong></td>
          <td>$${h.priceUsd < 0.01 ? h.priceUsd.toFixed(6) : h.priceUsd.toFixed(4)}</td>
          <td style="color:#00FFA3;font-weight:700;">$${h.valueUsd.toFixed(2)}</td>
          <td>
            <button class="btn-primary-sm" onclick="loadToken('${h.mint}')">Trade</button>
            <button class="btn-secondary-sm" onclick="window.open('/api/pnl-card/${h.mint}', '_blank')">Card</button>
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
        <td>${o.order_type === 'BUY_LIMIT' ? `${o.amount_sol} SOL` : `${o.amount_percent}%`}</td>
        <td><span class="dex-pill">${o.status}</span></td>
        <td>${new Date(o.created_at).toLocaleTimeString()}</td>
        <td>
          ${o.status === 'PENDING' ? `<button class="btn-secondary-sm" onclick="cancelOrder(${o.id})">❌ Cancel</button>` : '—'}
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

    if (!data.success || !data.wallets || data.wallets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">No wallets found.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.wallets
      .map(
        (w) => `
      <tr>
        <td><code>${w.publicKey}</code></td>
        <td><strong style="color:#00FFA3;">${w.balanceSol.toFixed(4)} SOL</strong></td>
        <td>${w.isActive ? '⭐ <strong style="color:#00FFA3;">ACTIVE</strong>' : 'Inactive'}</td>
        <td>
          ${!w.isActive ? `<button class="btn-primary-sm" onclick="selectWallet('${w.publicKey}')">Set Active</button>` : '—'}
        </td>
      </tr>
    `
      )
      .join('');
  } catch (err) {
    console.error('Wallets error:', err);
  }
}

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
