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
 * Get Swap Quote from Jupiter
 */
export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountLamports: number | string,
  slippageBps = 500
): Promise<JupiterQuoteResponse | null> {
  try {
    const url = `${CONFIG.JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountLamports}&slippageBps=${slippageBps}`;
    const response = await axios.get(url, { timeout: 10000 });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Jupiter quote:', error?.response?.data || error.message);
    return null;
  }
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

    // 2. Request serialized transaction from Jupiter Swap API
    const swapReqBody = {
      quoteResponse,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: prioritizationFeeConfig,
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

    // 5. Active Rebroadcast Loop (Every 400ms) to hit moving leader schedule without delay
    let isTerminated = false;
    const rebroadcastTimer = setInterval(async () => {
      if (isTerminated) return;
      try {
        await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: true,
          maxRetries: 0,
        });
      } catch {
        // ignore duplicate / inflight errors
      }
    }, 400);

    // 6. Fast Signature Status Polling Loop (Every 300ms)
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

      await new Promise((r) => setTimeout(r, 300));
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
