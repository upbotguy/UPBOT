import axios from 'axios';

async function test() {
  const quote = await axios.get('https://api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263&amount=10000000&slippageBps=500');
  console.log('Quote status:', quote.status);
  const swapRes = await axios.post('https://api.jup.ag/swap/v1/swap', {
    quoteResponse: quote.data,
    userPublicKey: 'HXuaNcBQ47Wry7Qi7ibtBqwUn6nWW8ZueCaFZYrgjNF',
    wrapAndUnwrapSol: true,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: {
      priorityLevelWithMaxLamports: {
        maxLamports: 10000000,
        priorityLevel: 'veryHigh',
      },
    },
  });
  console.log('Turbo Swap API success! Tx len:', swapRes.data.swapTransaction.length);
}

test().catch((e) => console.error(e?.response?.data || e.message));
