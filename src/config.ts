import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN || '8696106370:AAFp5JRE6xxKPGTL7ecM4V3hbnB_3fI-nQM',
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '9f8a3c2e1b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
  DATABASE_PATH: process.env.DATABASE_PATH || './quickbot.db',
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
