import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
  DATABASE_PATH: process.env.DATABASE_PATH || './upbot.db',
  ADMIN_USER_IDS: (process.env.ADMIN_USER_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => parseInt(id, 10))
    .filter((n) => !isNaN(n)),
  ADMIN_USERNAMES: (process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean),
  WSOL_MINT: 'So11111111111111111111111111111111111111112',
  JUPITER_QUOTE_API: 'https://api.jup.ag/swap/v1/quote',
  JUPITER_SWAP_API: 'https://api.jup.ag/swap/v1/swap',
  ORDER_POLL_INTERVAL_MS: parseInt(process.env.ORDER_POLL_INTERVAL_MS || '300', 10),
  PORT: parseInt(process.env.PORT || '3000', 10),
  ENABLE_WEB_UI: process.env.ENABLE_WEB_UI !== 'false',
  BOT_USERNAME: (process.env.BOT_USERNAME || '').replace(/^@/, '').trim(),
};
