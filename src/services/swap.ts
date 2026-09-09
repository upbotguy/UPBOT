import axios from 'axios';
import { Keypair, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CONFIG } from '../config.js';
import { connection } from './wallet.js';

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

export interface SwapOptions {
  priorityFeeLamports?: number | 'auto';
  slippageBps?: number;
  maxTimeoutMs?: number;
}

/**
 * Get Swap Quote from Jupiter (Multi-tier routing with fallback)
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number | string,
  slippageBps: number | string = 500
): Promise<JupiterQuoteResponse | null> {
  if (!inputMint || !outputMint || inputMint.toLowerCase() === outputMint.toLowerCase()) {
    return null;
  }

  const cleanInput = inputMint.trim();
  const cleanOutput = outputMint.trim();
  const cleanAmount = String(amountLamports).trim();
  const parsedSlippage = parseInt(String(slippageBps), 10) || 500;

  if (!cleanAmount || cleanAmount === 'NaN' || cleanAmount === '0' || cleanAmount === 'undefined') {
    return null;
  }

  const primaryUrls = [
    `https://api.jup.ag/swap/v1/quote?inputMint=${cleanInput}&outputMint=${cleanOutput}&amount=${cleanAmount}&slippageBps=${parsedSlippage}`,
    `https://lite-api.jup.ag/swap/v1/quote?inputMint=${cleanInput}&outputMint=${cleanOutput}&amount=${cleanAmount}&slippageBps=${parsedSlippage}`,
  ];

  try {
    const res = await Promise.any(
      primaryUrls.map((url) =>
        axios.get(url, { timeout: 4000 }).then((r) => {
          if (r.data && (r.data.outAmount || r.data.routePlan)) {
            return r.data;
          }
          throw new Error('Invalid quote response');
        })
      )
    );
    if (res) return res;
  } catch {
    // Fallback with higher slippage if initial race failed
    const fallbackUrls = [
      `https://api.jup.ag/swap/v1/quote?inputMint=${cleanInput}&outputMint=${cleanOutput}&amount=${cleanAmount}&slippageBps=${Math.max(parsedSlippage, 1500)}`,
      `https://lite-api.jup.ag/swap/v1/quote?inputMint=${cleanInput}&outputMint=${cleanOutput}&amount=${cleanAmount}&slippageBps=${Math.max(parsedSlippage, 2500)}`,
    ];
    for (const url of fallbackUrls) {
      try {
        const response = await axios.get(url, { timeout: 4000 });
        if (response.data && (response.data.outAmount || response.data.routePlan)) {
          return response.data;
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Execute Swap via Jupiter with Turbo Rebroadcast & Fast Confirmation
 */
export async function executeJupiterSwap(
  keypair: Keypair,
  quoteResponse: JupiterQuoteResponse,
  options?: SwapOptions
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const priorityFee = options?.priorityFeeLamports ?? 'auto';
    const timeoutMs = options?.maxTimeoutMs ?? 30000;

    // 1. Build prioritizationFeeLamports object for Jupiter v1 Swap API
    let prioritizationFeeConfig: any = {
      priorityLevelWithMaxLamports: {
        maxLamports: 10000000, // max 0.01 SOL safety limit
        priorityLevel: 'veryHigh', // Turbo priority for instant block inclusion
      },
    };

    if (typeof priorityFee === 'number' && priorityFee > 0) {
      prioritizationFeeConfig = priorityFee;
    }

    // 2. Request serialized transaction from Jupiter Swap API with Dynamic Slippage
    const maxSlippageBps = Math.max(options?.slippageBps || 500, 1500);
    const swapReqBody = {
      quoteResponse,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: prioritizationFeeConfig,
      dynamicSlippage: { maxBps: maxSlippageBps },
    };

    const swapRes = await axios.post(CONFIG.JUPITER_SWAP_API, swapReqBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    const { swapTransaction } = swapRes.data;
    if (!swapTransaction) {
      return { success: false, error: 'Failed to retrieve swap transaction from Jupiter' };
    }

    // 3. Deserialize & sign transaction
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([keypair]);

    const rawTransaction = transaction.serialize();

    // 4. Turbo Fast Broadcast: Send initial raw transaction
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 0,
    });

    // 5. Throttled Rebroadcast Loop (Every 2500ms, max 3 attempts) to prevent RPC flooding
    let isTerminated = false;
    let rebroadcastCount = 0;
    const maxRebroadcasts = 3;
    const rebroadcastTimer = setInterval(async () => {
      if (isTerminated || rebroadcastCount >= maxRebroadcasts) return;
      rebroadcastCount++;
      try {
        await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: true,
          maxRetries: 0,
        });
      } catch {
        // ignore duplicate / inflight errors
      }
    }, 2500);

    // 6. Signature Status Polling Loop (Every 1800ms)
    const startTime = Date.now();
    let confirmed = false;
    let finalError: string | undefined;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const statusRes = await connection.getSignatureStatus(signature, {
          searchTransactionHistory: false,
        });
        const status = statusRes?.value;

        if (status) {
          if (status.err) {
            finalError = `Transaction reverted: ${JSON.stringify(status.err)}`;
            break;
          }
          if (
            status.confirmationStatus === 'confirmed' ||
            status.confirmationStatus === 'finalized'
          ) {
            confirmed = true;
            break;
          }
        }
      } catch {
        // ignore transient rpc check errors
      }

      await new Promise((r) => setTimeout(r, 1800));
    }

    isTerminated = true;
    clearInterval(rebroadcastTimer);

    if (confirmed) {
      return { success: true, signature };
    }

    if (finalError) {
      return { success: false, signature, error: finalError };
    }

    // If timeout, do one final search in history before failing
    const finalCheck = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    if (
      finalCheck?.value?.confirmationStatus === 'confirmed' ||
      finalCheck?.value?.confirmationStatus === 'finalized'
    ) {
      return { success: true, signature };
    }

    return {
      success: false,
      signature,
      error: 'Transaction confirmation timeout. Network may be heavily congested or slippage exceeded.',
    };
  } catch (error: any) {
    console.error('Swap execution error:', error);
    return {
      success: false,
      error: error?.response?.data?.message || error?.message || 'Transaction failed',
    };
  }
}
