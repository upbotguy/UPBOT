import {
  initDB,
  createLimitOrder,
  getPendingLimitOrders,
  getUserLimitOrders,
  cancelLimitOrder,
  updateLimitOrderStatus,
  getUserSettings,
} from '../src/db/index.js';

async function testLimitOrders() {
  console.log('=== Testing Limit Order DB & Slippage ===');
  initDB();

  const testUserId = 88888888;
  const settings = getUserSettings(testUserId);
  console.log('Default Slippage BPS:', settings.slippage_bps);
  if (settings.slippage_bps !== 500) {
    throw new Error('Default slippage is not 500 bps (5%)');
  }
  console.log('✅ Default Slippage 5% verified!\n');

  // 1. Create Limit Buy Order
  const buyOrder = createLimitOrder({
    userId: testUserId,
    walletAddress: 'HqhUAzKZJpd1XkmtbeqRXku7EgyjAcFsaiiditTQBe3f',
    tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    tokenSymbol: 'BONK',
    orderType: 'BUY_LIMIT',
    targetPriceUsd: 0.000003,
    condition: 'LTE',
    amountSol: 0.5,
  });
  console.log('Created Buy Order #', buyOrder.id, buyOrder.status);

  // 2. Create Limit Sell Order
  const sellOrder = createLimitOrder({
    userId: testUserId,
    walletAddress: 'HqhUAzKZJpd1XkmtbeqRXku7EgyjAcFsaiiditTQBe3f',
    tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    tokenSymbol: 'BONK',
    orderType: 'SELL_LIMIT',
    targetPriceUsd: 0.00001,
    condition: 'GTE',
    amountPercent: 50,
  });
  console.log('Created Sell Order #', sellOrder.id, sellOrder.status);

  // 3. Get Pending Orders
  const pending = getPendingLimitOrders();
  console.log('Pending Orders Count:', pending.length);
  if (pending.length < 2) throw new Error('Pending orders retrieval failed');

  // 4. Update status of buy order to EXECUTED
  updateLimitOrderStatus(buyOrder.id, 'EXECUTED', '5KtestSig12345');
  const userOrders = getUserLimitOrders(testUserId);
  const updatedBuy = userOrders.find((o) => o.id === buyOrder.id);
  console.log('Updated Buy Order status:', updatedBuy?.status, 'Tx:', updatedBuy?.tx_signature);
  if (updatedBuy?.status !== 'EXECUTED' || updatedBuy?.tx_signature !== '5KtestSig12345') {
    throw new Error('Update order status failed');
  }

  // 5. Cancel sell order
  const cancelled = cancelLimitOrder(testUserId, sellOrder.id);
  console.log('Cancel result:', cancelled);
  const updatedSell = getUserLimitOrders(testUserId).find((o) => o.id === sellOrder.id);
  console.log('Updated Sell Order status:', updatedSell?.status);
  if (updatedSell?.status !== 'CANCELLED') {
    throw new Error('Cancel order failed');
  }

  console.log('🎉 ALL LIMIT ORDER TESTS PASSED SUCCESSFULLY! 🎉');
}

testLimitOrders().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
