import Database from 'better-sqlite3';
import { CONFIG } from '../config.js';
import { encryptText, decryptText } from '../services/crypto.js';

export type SupportedLanguage = 'en' | 'zh' | 'ru' | 'ko' | 'es' | 'my';

export interface DBUser {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  active_token?: string | null;
  language?: SupportedLanguage;
  created_at: string;
}

export interface DBWallet {
  id: number;
  user_id: number;
  public_key: string;
  encrypted_private_key: string;
  encrypted_mnemonic: string | null;
  is_active: number;
  created_at: string;
}

export interface DecryptedWallet {
  id: number;
  userId: number;
  publicKey: string;
  privateKey: string;
  mnemonic: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DBSettings {
  user_id: number;
  slippage_bps: number; // 500 = 5%
  auto_buy_sol: number;
  priority_fee_sol: number;
}

export interface DBLimitOrder {
  id: number;
  user_id: number;
  wallet_address: string;
  token_address: string;
  token_symbol: string;
  order_type: 'BUY_LIMIT' | 'SELL_LIMIT';
  target_price_usd: number;
  condition: 'LTE' | 'GTE';
  amount_sol: number | null;
  amount_percent: number | null;
  status: 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'CANCELLED' | 'FAILED';
  error_message: string | null;
  tx_signature: string | null;
  created_at: string;
  executed_at: string | null;
}

export interface NewLimitOrder {
  userId: number;
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  orderType: 'BUY_LIMIT' | 'SELL_LIMIT';
  targetPriceUsd: number;
  condition: 'LTE' | 'GTE';
  amountSol?: number | null;
  amountPercent?: number | null;
}

const db = new Database(CONFIG.DATABASE_PATH);
db.pragma('journal_mode = WAL');

// Initialize database tables
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      username TEXT,
      first_name TEXT,
      active_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      encrypted_mnemonic TEXT,
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
      UNIQUE(user_id, public_key)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      slippage_bps INTEGER DEFAULT 500,
      auto_buy_sol REAL DEFAULT 0,
      priority_fee_sol REAL DEFAULT 0.001,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS limit_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      token_address TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      order_type TEXT NOT NULL,
      target_price_usd REAL NOT NULL,
      condition TEXT NOT NULL,
      amount_sol REAL,
      amount_percent REAL,
      status TEXT DEFAULT 'PENDING',
      error_message TEXT,
      tx_signature TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      executed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      token_address TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      trade_type TEXT NOT NULL,
      amount_sol REAL NOT NULL,
      token_amount REAL NOT NULL,
      price_usd REAL NOT NULL,
      market_cap_usd REAL DEFAULT 0,
      tx_signature TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE
    );
  `);

  // Ensure active_token and language columns exist if table was created earlier
  try {
    db.prepare('ALTER TABLE users ADD COLUMN active_token TEXT').run();
  } catch {}
  try {
    db.prepare("ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en'").run();
  } catch {}

  // Update any existing default 100 bps slippage to 500 bps (5%)
  try {
    db.prepare('UPDATE user_settings SET slippage_bps = 500 WHERE slippage_bps = 100').run();
  } catch {}
}

// User Operations
export function getOrCreateUser(telegramId: number, username?: string, firstName?: string): DBUser {
  const findStmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
  let user = findStmt.get(telegramId) as DBUser | undefined;

  if (!user) {
    const insertStmt = db.prepare(`
      INSERT INTO users (telegram_id, username, first_name, language)
      VALUES (?, ?, ?, 'en')
    `);
    insertStmt.run(telegramId, username || null, firstName || null);
    
    // Create default settings (500 bps = 5%)
    const settingsStmt = db.prepare(`
      INSERT OR IGNORE INTO user_settings (user_id, slippage_bps) VALUES (?, 500)
    `);
    settingsStmt.run(telegramId);

    user = findStmt.get(telegramId) as DBUser;
  }
  return user;
}

export function getUserLanguage(userId: number): SupportedLanguage {
  try {
    const user = getOrCreateUser(userId);
    const validLangs: SupportedLanguage[] = ['en', 'zh', 'ru', 'ko', 'es', 'my'];
    if (user.language && validLangs.includes(user.language as SupportedLanguage)) {
      return user.language as SupportedLanguage;
    }
    return 'en';
  } catch {
    return 'en';
  }
}

export function setUserLanguage(userId: number, lang: SupportedLanguage): void {
  try {
    getOrCreateUser(userId);
    db.prepare('UPDATE users SET language = ? WHERE telegram_id = ?').run(lang, userId);
  } catch (e) {
    console.error('Error setting user language:', e);
  }
}

export function setUserActiveTokenDB(userId: number, tokenAddress: string) {
  try {
    getOrCreateUser(userId);
    db.prepare('UPDATE users SET active_token = ? WHERE telegram_id = ?').run(tokenAddress, userId);
  } catch (e) {
    console.error('Error setting active token in DB:', e);
  }
}

export function getUserActiveTokenDB(userId: number): string | null {
  try {
    const row = db.prepare('SELECT active_token FROM users WHERE telegram_id = ?').get(userId) as { active_token: string | null } | undefined;
    return row?.active_token || null;
  } catch {
    return null;
  }
}

// Wallet Operations
export function addWallet(
  userId: number,
  publicKey: string,
  privateKey: string,
  mnemonic?: string | null
): DecryptedWallet {
  const encPriv = encryptText(privateKey);
  const encMnemonic = mnemonic ? encryptText(mnemonic) : null;

  // Check if this is the first wallet for the user
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM wallets WHERE user_id = ?');
  const { count } = countStmt.get(userId) as { count: number };
  const isActive = count === 0 ? 1 : 0;

  const insertStmt = db.prepare(`
    INSERT INTO wallets (user_id, public_key, encrypted_private_key, encrypted_mnemonic, is_active)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, public_key) DO UPDATE SET
      encrypted_private_key = excluded.encrypted_private_key,
      encrypted_mnemonic = excluded.encrypted_mnemonic
  `);

  insertStmt.run(userId, publicKey, encPriv, encMnemonic, isActive);

  return {
    id: 0,
    userId,
    publicKey,
    privateKey,
    mnemonic: mnemonic || null,
    isActive: isActive === 1,
    createdAt: new Date().toISOString(),
  };
}

export function getUserWallets(userId: number): DecryptedWallet[] {
  const stmt = db.prepare('SELECT * FROM wallets WHERE user_id = ? ORDER BY id ASC');
  const rows = stmt.all(userId) as DBWallet[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    publicKey: row.public_key,
    privateKey: decryptText(row.encrypted_private_key),
    mnemonic: row.encrypted_mnemonic ? decryptText(row.encrypted_mnemonic) : null,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  }));
}

export function getWalletByPublicKey(userId: number, publicKey: string): DecryptedWallet | null {
  const stmt = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND public_key = ? LIMIT 1');
  const row = stmt.get(userId, publicKey) as DBWallet | undefined;
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    publicKey: row.public_key,
    privateKey: decryptText(row.encrypted_private_key),
    mnemonic: row.encrypted_mnemonic ? decryptText(row.encrypted_mnemonic) : null,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

export function getActiveWallet(userId: number): DecryptedWallet | null {
  const stmt = db.prepare('SELECT * FROM wallets WHERE user_id = ? AND is_active = 1 LIMIT 1');
  const row = stmt.get(userId) as DBWallet | undefined;
  if (!row) {
    // If no active wallet, fallback to first wallet
    const firstStmt = db.prepare('SELECT * FROM wallets WHERE user_id = ? ORDER BY id ASC LIMIT 1');
    const firstRow = firstStmt.get(userId) as DBWallet | undefined;
    if (!firstRow) return null;
    setActiveWallet(userId, firstRow.public_key);
    return {
      id: firstRow.id,
      userId: firstRow.user_id,
      publicKey: firstRow.public_key,
      privateKey: decryptText(firstRow.encrypted_private_key),
      mnemonic: firstRow.encrypted_mnemonic ? decryptText(firstRow.encrypted_mnemonic) : null,
      isActive: true,
      createdAt: firstRow.created_at,
    };
  }

  return {
    id: row.id,
    userId: row.user_id,
    publicKey: row.public_key,
    privateKey: decryptText(row.encrypted_private_key),
    mnemonic: row.encrypted_mnemonic ? decryptText(row.encrypted_mnemonic) : null,
    isActive: true,
    createdAt: row.created_at,
  };
}

export function setActiveWallet(userId: number, publicKey: string): boolean {
  const deactStmt = db.prepare('UPDATE wallets SET is_active = 0 WHERE user_id = ?');
  const actStmt = db.prepare('UPDATE wallets SET is_active = 1 WHERE user_id = ? AND public_key = ?');
  
  db.transaction(() => {
    deactStmt.run(userId);
    actStmt.run(userId, publicKey);
  })();

  return true;
}

export function removeWallet(userId: number, publicKey: string): boolean {
  const checkActive = db.prepare('SELECT is_active FROM wallets WHERE user_id = ? AND public_key = ?').get(userId, publicKey) as { is_active: number } | undefined;
  
  const deleteStmt = db.prepare('DELETE FROM wallets WHERE user_id = ? AND public_key = ?');
  const result = deleteStmt.run(userId, publicKey);

  // If deleted wallet was active, make the first remaining wallet active
  if (checkActive && checkActive.is_active === 1) {
    const nextWallet = db.prepare('SELECT public_key FROM wallets WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(userId) as { public_key: string } | undefined;
    if (nextWallet) {
      db.prepare('UPDATE wallets SET is_active = 1 WHERE user_id = ? AND public_key = ?').run(userId, nextWallet.public_key);
    }
  }

  return result.changes > 0;
}

// Settings Operations
export function getUserSettings(userId: number): DBSettings {
  getOrCreateUser(userId);
  const stmt = db.prepare('SELECT * FROM user_settings WHERE user_id = ?');
  let settings = stmt.get(userId) as DBSettings | undefined;
  if (!settings) {
    db.prepare('INSERT OR IGNORE INTO user_settings (user_id, slippage_bps) VALUES (?, 500)').run(userId);
    settings = stmt.get(userId) as DBSettings;
  }
  return settings;
}

export function updateUserSettings(userId: number, slippageBps?: number, autoBuySol?: number, priorityFeeSol?: number) {
  const current = getUserSettings(userId);
  const newSlippage = slippageBps !== undefined ? slippageBps : current.slippage_bps;
  const newAutoBuy = autoBuySol !== undefined ? autoBuySol : current.auto_buy_sol;
  const newPriorityFee = priorityFeeSol !== undefined ? priorityFeeSol : current.priority_fee_sol;

  db.prepare(`
    UPDATE user_settings
    SET slippage_bps = ?, auto_buy_sol = ?, priority_fee_sol = ?
    WHERE user_id = ?
  `).run(newSlippage, newAutoBuy, newPriorityFee, userId);
}

// Limit Order Operations
export function createLimitOrder(order: NewLimitOrder): DBLimitOrder {
  getOrCreateUser(order.userId);
  const insertStmt = db.prepare(`
    INSERT INTO limit_orders (
      user_id, wallet_address, token_address, token_symbol,
      order_type, target_price_usd, condition,
      amount_sol, amount_percent, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `);

  const result = insertStmt.run(
    order.userId,
    order.walletAddress,
    order.tokenAddress,
    order.tokenSymbol,
    order.orderType,
    order.targetPriceUsd,
    order.condition,
    order.amountSol ?? null,
    order.amountPercent ?? null
  );

  const newId = Number(result.lastInsertRowid);
  const getStmt = db.prepare('SELECT * FROM limit_orders WHERE id = ?');
  return getStmt.get(newId) as DBLimitOrder;
}

export function getPendingLimitOrders(): DBLimitOrder[] {
  const stmt = db.prepare(`
    SELECT * FROM limit_orders 
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
  `);
  return stmt.all() as DBLimitOrder[];
}

export function getUserLimitOrders(userId: number, status?: string): DBLimitOrder[] {
  if (status) {
    const stmt = db.prepare(`
      SELECT * FROM limit_orders
      WHERE user_id = ? AND status = ?
      ORDER BY id DESC
    `);
    return stmt.all(userId, status) as DBLimitOrder[];
  } else {
    const stmt = db.prepare(`
      SELECT * FROM limit_orders
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 20
    `);
    return stmt.all(userId) as DBLimitOrder[];
  }
}

export function getLimitOrderById(userId: number, orderId: number): DBLimitOrder | null {
  const stmt = db.prepare('SELECT * FROM limit_orders WHERE id = ? AND user_id = ?');
  const order = stmt.get(orderId, userId) as DBLimitOrder | undefined;
  return order || null;
}

export function updateLimitOrderDetails(
  userId: number,
  orderId: number,
  fields: { targetPriceUsd?: number; condition?: 'LTE' | 'GTE'; amountSol?: number; amountPercent?: number }
): boolean {
  const existing = getLimitOrderById(userId, orderId);
  if (!existing || existing.status !== 'PENDING') return false;

  const targetPrice = fields.targetPriceUsd !== undefined ? fields.targetPriceUsd : existing.target_price_usd;
  const condition = fields.condition !== undefined ? fields.condition : existing.condition;
  const amountSol = fields.amountSol !== undefined ? fields.amountSol : existing.amount_sol;
  const amountPercent = fields.amountPercent !== undefined ? fields.amountPercent : existing.amount_percent;

  const stmt = db.prepare(`
    UPDATE limit_orders
    SET target_price_usd = ?, condition = ?, amount_sol = ?, amount_percent = ?
    WHERE id = ? AND user_id = ? AND status = 'PENDING'
  `);

  const result = stmt.run(targetPrice, condition, amountSol, amountPercent, orderId, userId);
  return result.changes > 0;
}

export function deleteLimitOrder(userId: number, orderId: number): boolean {
  const stmt = db.prepare('DELETE FROM limit_orders WHERE id = ? AND user_id = ?');
  const result = stmt.run(orderId, userId);
  return result.changes > 0;
}

export function cancelLimitOrder(userId: number, orderId: number): boolean {
  const stmt = db.prepare(`
    UPDATE limit_orders
    SET status = 'CANCELLED'
    WHERE id = ? AND user_id = ? AND status = 'PENDING'
  `);
  const result = stmt.run(orderId, userId);
  return result.changes > 0;
}

/**
 * Atomically claim a pending order for execution.
 * Returns true if this process successfully claimed the order, false if already claimed/executed/cancelled.
 */
export function claimLimitOrderForExecution(orderId: number): boolean {
  const stmt = db.prepare(`
    UPDATE limit_orders
    SET status = 'EXECUTING'
    WHERE id = ? AND status = 'PENDING'
  `);
  const result = stmt.run(orderId);
  return result.changes > 0;
}

export function updateLimitOrderStatus(
  orderId: number,
  status: 'PENDING' | 'EXECUTING' | 'EXECUTED' | 'CANCELLED' | 'FAILED',
  txSignature?: string,
  errorMessage?: string
): void {
  const now = status === 'EXECUTED' || status === 'FAILED' ? new Date().toISOString() : null;
  db.prepare(`
    UPDATE limit_orders
    SET status = ?, tx_signature = ?, error_message = ?, executed_at = ?
    WHERE id = ?
  `).run(status, txSignature || null, errorMessage || null, now, orderId);
}

export interface DBTrade {
  id: number;
  user_id: number;
  wallet_address: string;
  token_address: string;
  token_symbol: string;
  trade_type: 'BUY' | 'SELL';
  amount_sol: number;
  token_amount: number;
  price_usd: number;
  market_cap_usd: number;
  tx_signature: string | null;
  created_at: string;
}

export interface UserTokenPosition {
  tokenAddress: string;
  tokenSymbol: string;
  totalBoughtTokens: number;
  totalSoldTokens: number;
  currentHoldingTokens: number;
  totalSpentUsd: number;
  totalSpentSol: number;
  totalSoldUsd: number;
  totalSoldSol: number;
  avgEntryPriceUsd: number;
  avgEntryMarketCap: number;
}

/**
 * Record a completed trade for PnL & position tracking
 */
export function recordTrade(trade: {
  userId: number;
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  tradeType: 'BUY' | 'SELL';
  amountSol: number;
  tokenAmount: number;
  priceUsd: number;
  marketCapUsd?: number;
  txSignature?: string;
}): void {
  const stmt = db.prepare(`
    INSERT INTO trades (user_id, wallet_address, token_address, token_symbol, trade_type, amount_sol, token_amount, price_usd, market_cap_usd, tx_signature)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    trade.userId,
    trade.walletAddress,
    trade.tokenAddress,
    trade.tokenSymbol,
    trade.tradeType,
    trade.amountSol,
    trade.tokenAmount,
    trade.priceUsd,
    trade.marketCapUsd || 0,
    trade.txSignature || null
  );
}

/**
 * Get aggregated position & average entry for a user and token
 */
export function getUserTokenPosition(userId: number, tokenAddress: string, walletAddress?: string): UserTokenPosition | null {
  let query = `SELECT * FROM trades WHERE user_id = ? AND token_address = ?`;
  const params: any[] = [userId, tokenAddress];
  if (walletAddress) {
    query += ` AND wallet_address = ?`;
    params.push(walletAddress);
  }
  query += ` ORDER BY id ASC`;

  const stmt = db.prepare(query);
  const rows = stmt.all(...params) as DBTrade[];
  if (rows.length === 0) return null;

  let totalBoughtTokens = 0;
  let totalSoldTokens = 0;
  let totalSpentUsd = 0;
  let totalSpentSol = 0;
  let totalSoldUsd = 0;
  let totalSoldSol = 0;
  let weightedMarketCapSum = 0;

  for (const row of rows) {
    if (row.trade_type === 'BUY') {
      totalBoughtTokens += row.token_amount;
      totalSpentUsd += row.token_amount * row.price_usd;
      totalSpentSol += row.amount_sol;
      weightedMarketCapSum += (row.market_cap_usd || 0) * row.token_amount;
    } else if (row.trade_type === 'SELL') {
      totalSoldTokens += row.token_amount;
      totalSoldUsd += row.token_amount * row.price_usd;
      totalSoldSol += row.amount_sol;
    }
  }

  const currentHoldingTokens = Math.max(0, totalBoughtTokens - totalSoldTokens);
  const avgEntryPriceUsd = totalBoughtTokens > 0 ? totalSpentUsd / totalBoughtTokens : 0;
  const avgEntryMarketCap = totalBoughtTokens > 0 ? weightedMarketCapSum / totalBoughtTokens : 0;

  return {
    tokenAddress,
    tokenSymbol: rows[0].token_symbol,
    totalBoughtTokens,
    totalSoldTokens,
    currentHoldingTokens,
    totalSpentUsd,
    totalSpentSol,
    totalSoldUsd,
    totalSoldSol,
    avgEntryPriceUsd,
    avgEntryMarketCap,
  };
}

/**
 * Get or initialize default user for Web UI (prioritizes Telegram user with active wallet)
 */
export function getDefaultUserId(): number {
  // 1. Check if any active wallet exists and return its owner Telegram user_id
  const activeWalletUser = db.prepare('SELECT user_id FROM wallets WHERE is_active = 1 ORDER BY id DESC LIMIT 1').get() as { user_id: number } | undefined;
  if (activeWalletUser) return activeWalletUser.user_id;

  // 2. Check if any wallet exists at all
  const anyWalletUser = db.prepare('SELECT user_id FROM wallets ORDER BY id DESC LIMIT 1').get() as { user_id: number } | undefined;
  if (anyWalletUser) return anyWalletUser.user_id;

  // 3. Check for real Telegram users in users table
  const realUser = db.prepare('SELECT telegram_id FROM users WHERE telegram_id != 1 ORDER BY created_at DESC LIMIT 1').get() as { telegram_id: number } | undefined;
  if (realUser) return realUser.telegram_id;

  const anyUser = db.prepare('SELECT telegram_id FROM users ORDER BY created_at ASC LIMIT 1').get() as { telegram_id: number } | undefined;
  if (anyUser) return anyUser.telegram_id;

  getOrCreateUser(1, 'LocalUser', 'Trader');
  return 1;
}

/**
 * Get recent trade history for a user
 */
export function getUserRecentTrades(userId: number, limit = 30): DBTrade[] {
  const stmt = db.prepare(`
    SELECT * FROM trades
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit) as DBTrade[];
}
