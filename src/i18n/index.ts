export type SupportedLanguage = 'en' | 'zh' | 'ru' | 'ko' | 'es' | 'my';

export interface Translations {
  btn_back_main: string;
  btn_cancel: string;
  btn_refresh: string;
  btn_trade: string;
  btn_wallets: string;
  btn_portfolio: string;
  btn_orders: string;
  btn_settings: string;
  btn_security: string;
  btn_language: string;
  btn_add_wallet: string;
  btn_remove_wallet: string;
  btn_generate_wallet: string;
  btn_export_key: string;
  btn_back_security: string;
  btn_custom_slippage: string;
  btn_buy_custom: string;
  btn_sell_custom: string;
  btn_limit_buy: string;
  btn_limit_sell: string;
  btn_custom_dip_pct: string;
  btn_custom_tpsl_pct: string;
  btn_custom_price: string;
  btn_edit_price: string;
  btn_edit_amount: string;
  btn_cancel_order: string;
  btn_delete_order: string;
  btn_back_orders: string;
  btn_view_solscan: string;
  btn_trade_dashboard: string;
  btn_hide_key: string;
  btn_confirm_export: string;
  btn_try_again: string;
  btn_copy_trading: string;
  btn_add_copy_target: string;
  btn_copy_targets: string;
  btn_copy_history: string;
  btn_back_copy: string;
  btn_pause_target: string;
  btn_resume_target: string;
  btn_delete_target: string;

  wallet_active: string;
  wallet_balance: string;
  none_add_in_wallets: string;

  main_welcome: (name: string, walletText: string, balance: number) => string;
  security_title: (listText: string) => string;
  security_empty: string;
  portfolio_title: (wallet: string, solBal: number, solVal: number, totalVal: number) => string;
  portfolio_empty: string;
  portfolio_trade_btn: (symbol: string) => string;

  settings_title: (slippage: number, priorityFee: number) => string;
  btn_slippage: (val: number) => string;
  btn_priority_fee: (val: number) => string;

  orders_list_title: (activeCount: number, historyCount: number, listText: string) => string;
  order_detail_title: (id: number, type: string, symbol: string, status: string, targetPrice: number, amount: string, cond: string, createdAt: string) => string;

  lang_select_title: string;
  lang_switched: (langName: string) => string;

  prompt_add_wallet: string;
  add_wallet_success: (pubkey: string, balance: number) => string;
  add_wallet_failed: (err: string) => string;

  prompt_trade_input: string;
  prompt_custom_buy: (symbol: string, currentPrice: number, balance: number) => string;
  prompt_custom_sell: (symbol: string, currentPrice: number, tokenBal: number) => string;
  prompt_custom_slippage: (current: number) => string;
  slippage_updated: (val: number) => string;

  prompt_limit_buy_price: (symbol: string, currentPrice: number) => string;
  prompt_custom_dip_pct: (symbol: string, currentPrice: number) => string;
  prompt_custom_tpsl_pct: (symbol: string, currentPrice: number) => string;
  prompt_limit_buy_amount: (symbol: string, targetPrice: number, balance: number) => string;
  prompt_limit_sell_price: (symbol: string, currentPrice: number, isTP: boolean) => string;
  prompt_limit_sell_amount: (symbol: string, targetPrice: number, tokenBal: number, isTP: boolean) => string;
  limit_order_created: (type: string, symbol: string, target: number, amount: string) => string;

  prompt_edit_price: (orderId: number, currentTarget: number) => string;
  prompt_edit_amount: (orderId: number, currentAmount: string) => string;
  order_updated: string;
  order_cancelled: string;
  order_deleted: string;

  copy_menu_title: (activeCount: number, listText: string) => string;
  copy_target_added: (wallet: string, solAmount: number, mirrorSell: boolean) => string;
  prompt_copy_target_wallet: string;
  prompt_copy_buy_sol: (wallet: string) => string;
  prompt_copy_mirror_sell: (wallet: string) => string;

  swap_swapping: (symbol: string, amount: string) => string;
  swap_success: (symbol: string, price: number, spent: string, received: string, signature: string) => string;
  swap_failed: (symbol: string, err: string) => string;

  no_active_wallet_err: string;
  insufficient_sol_err: (need: number, have: number) => string;
  insufficient_token_err: (symbol: string) => string;
  invalid_input_err: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  // 🇺🇸 ENGLISH
  en: {
    btn_back_main: '🔙 Main Menu',
    btn_cancel: '❌ Cancel',
    btn_refresh: '🔄 Refresh',
    btn_trade: '🎯 Trade Token',
    btn_wallets: '💳 Wallets',
    btn_portfolio: '💼 Portfolio',
    btn_orders: '📋 Active Orders',
    btn_settings: '⚙️ Settings',
    btn_security: '🛡️ Security',
    btn_language: '🌐 Language',
    btn_add_wallet: '➕ Add Wallet',
    btn_remove_wallet: '🗑️ Remove Wallet',
    btn_generate_wallet: '✨ Generate New Wallet',
    btn_export_key: '🔑 Backup / Export Key',
    btn_back_security: '🔙 Back to Security',
    btn_custom_slippage: '✏️ Custom Slippage',
    btn_buy_custom: '✏️ Buy X SOL',
    btn_sell_custom: '✏️ Sell X %',
    btn_limit_buy: '🎯 Limit Buy (Dip)',
    btn_limit_sell: '🎯 Limit Sell (TP/SL)',
    btn_custom_dip_pct: '✏️ Custom Dip %',
    btn_custom_tpsl_pct: '✏️ Custom TP/SL %',
    btn_custom_price: '🎯 Custom Price USD',
    btn_edit_price: '✏️ Edit Price',
    btn_edit_amount: '✏️ Edit Amount',
    btn_cancel_order: '🚫 Cancel Order',
    btn_delete_order: '🗑️ Delete from History',
    btn_back_orders: '🔙 Back to Orders',
    btn_view_solscan: '🔍 View on Solscan',
    btn_trade_dashboard: '🎯 Trade Dashboard',
    btn_hide_key: '🔒 Hide & Delete Immediately',
    btn_confirm_export: '⚠️ Yes, Show Private Key',
    btn_try_again: '🔄 Try Again',
    btn_copy_trading: '👥 Copy Trading',
    btn_add_copy_target: '➕ Add Target Wallet',
    btn_copy_targets: '👥 Active Targets',
    btn_copy_history: '📜 Copy History',
    btn_back_copy: '🔙 Back to Copy Trading',
    btn_pause_target: '⏸️ Pause',
    btn_resume_target: '▶️ Resume',
    btn_delete_target: '🗑️ Delete Target',

    wallet_active: 'Active Wallet',
    wallet_balance: 'SOL Balance',
    none_add_in_wallets: 'None (Add in Wallets menu)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *Welcome to UPBOT AI Solana Trading Bot!* ⚡\n\n` +
      `👤 *User:* ${name}\n` +
      `💳 *Active Wallet:* \`${walletText}\`\n` +
      `💰 *SOL Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Fee Direct Swap:* Fastest Jupiter V6 Turbo Routing\n` +
      `👥 *Copy Trading:* 24/7 Sub-Second On-Chain Wallet Mirroring\n` +
      `⏱️ *Limit Orders:* Buy Dip, Take Profit (TP), Stop Loss (SL)\n` +
      `💼 *Portfolio Tracker:* Track held SPL tokens & 1-click sell\n` +
      `🛡️ *Security:* Local AES-256-GCM encryption & Admin Whitelist\n\n` +
      `👇 _Select a menu below or send any Solana Token CA to trade:_`,

    security_title: (listText) =>
      `🔐 *Security & Wallet Management*\n\n` +
      `All private keys and seeds are securely encrypted with AES-256-GCM on your local device.\n\n` +
      `📋 *Connected Wallets:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Add Wallet:* Import Base58 private key or 12/24 words seed phrase\n` +
      `✨ *Generate New Wallet:* Create a brand new Solana keypair\n` +
      `🔑 *Export Key:* Reveal and backup private key\n` +
      `🗑️ *Remove Wallet:* Delete wallet from bot`,
    security_empty: `❌ _No wallets found. Click "Add Wallet" or "Generate New Wallet" to begin._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *Your Token Portfolio / Holdings*\n\n` +
      `💳 *Wallet:* \`${wallet}\`\n` +
      `💰 *SOL Balance:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *Total Value:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *Select a token below to trade or quick sell:*`,
    portfolio_empty: `_No SPL tokens found in this wallet._`,
    portfolio_trade_btn: (symbol) => `🎯 Trade $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Trading Bot Settings*\n\n` +
      `⚡ *Current Slippage:* \`${slippage}%\`\n` +
      `⛽ *Priority Gas Fee:* \`${priorityFee} SOL\` (Turbo Routing)\n\n` +
      `_Click a button below to configure:_`,
    btn_slippage: (val) => `⚡ Slippage: ${val}%`,
    btn_priority_fee: (val) => `⛽ Priority Fee: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *Limit Orders Center*\n\n` +
      `⚡ *Active Pending Orders:* \`${activeCount}\` | 📜 *History:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_Select an order below to view details or cancel:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *Order #${id} Details*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `📌 *Type:* \`${type}\` (${cond})\n` +
      `📊 *Status:* \`${status}\`\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `💰 *Amount:* \`${amount}\`\n` +
      `🕒 *Created:* \`${createdAt}\``,

    lang_select_title: `🌐 *Select Your Language*\n\nCurrent Language: *English 🇺🇸*`,
    lang_switched: (langName) => `✅ Language changed to *${langName}*!`,

    prompt_add_wallet:
      `🔐 *Add Solana Wallet*\n\n` +
      `Please send your Solana *Private Key (Base58 string)* or *12/24 words Seed Phrase*.\n\n` +
      `⚠️ _Note: For security, your message will be deleted automatically immediately._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *Wallet Connected Successfully!* 🎉\n\n` +
      `💳 *Public Address:* \`${pubkey}\`\n` +
      `💰 *SOL Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `This wallet is now set as your active wallet.`,
    add_wallet_failed: (err) =>
      `❌ *Failed to add wallet!*\n\n` +
      `Error: \`${err || 'Invalid Private Key or Seed Phrase'}\`\n\n` +
      `Please double check your credentials and try again.`,

    prompt_trade_input:
      `🎯 *Solana Token Trading*\n\n` +
      `Please send or paste the *Contract Address (Mint Address)* of the token you want to trade:\n\n` +
      `Example: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *Buy $${symbol} with Custom SOL Amount*\n\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n` +
      `💰 *Available SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Enter SOL amount to spend (e.g. 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *Sell $${symbol} by Custom Percentage (%)*\n\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n` +
      `📦 *Token Balance:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Enter percentage to sell (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *Custom Slippage Tolerance*\n\n` +
      `Current Slippage: \`${current}%\`\n\n` +
      `_Enter your desired slippage percentage (e.g. 2.5 or 10):_`,
    slippage_updated: (val) => `✅ Slippage updated to \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *Limit Buy (Dip) - Set Target Price*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter target price in USD or dip % (e.g. 15%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *Set Custom Dip %*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter dip percentage to buy (e.g. 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *Set Custom TP / SL %*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `• *Take Profit (TP):* Positive number (e.g. \`35\` for +35%, \`200\` for 3x)\n` +
      `• *Stop Loss (SL):* Negative number (e.g. \`-15\` for -15%)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *Limit Buy - Set SOL Amount*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `💰 *Available SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Enter SOL amount to spend:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? 'Take Profit (TP)' : 'Stop Loss (SL)'} - Set Target Price*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter target price in USD or % (e.g. +50% or -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? 'Take Profit' : 'Stop Loss'} - Set Percentage*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `📦 *Token Balance:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Enter percentage to sell (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *Limit Order Created Successfully!* 🎯\n\n` +
      `📌 *Type:* \`${type}\`\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${target}\`\n` +
      `💰 *Amount:* \`${amount}\`\n\n` +
      `The bot will automatically monitor and execute this trade 24/7.`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *Edit Target Price for Order #${orderId}*\n\n` +
      `Current Target Price: \`$${currentTarget}\`\n\n` +
      `_Enter new target price in USD or %:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *Edit Amount for Order #${orderId}*\n\n` +
      `Current Amount: \`${currentAmount}\`\n\n` +
      `_Enter new amount:_`,

    order_updated: `✅ Order updated successfully!`,
    order_cancelled: `🚫 Order cancelled successfully.`,
    order_deleted: `🗑️ Order deleted from history.`,

    copy_menu_title: (activeCount, listText) =>
      `👥 *Copy Trading Hub*\n\n` +
      `⚡ *Active Monitored Wallets:* \`${activeCount}\`\n\n` +
      `${listText}\n\n` +
      `_Select a target wallet to manage or click "Add Target Wallet" below:_`,
    copy_target_added: (wallet, solAmount, mirrorSell) =>
      `✅ *Copy Target Added Successfully!* 🎯\n\n` +
      `👤 *Target Wallet:* \`${wallet}\`\n` +
      `💰 *Buy Amount:* \`${solAmount} SOL\` per trade\n` +
      `🔄 *Mirror Sell:* \`${mirrorSell ? 'Enabled (Auto % Sell)' : 'Disabled'}\`\n\n` +
      `The bot is now monitoring this wallet on-chain 24/7.`,
    prompt_copy_target_wallet: `👥 *Add Copy Trading Target Wallet*\n\nPlease send the Solana public address (Wallet Address) of the trader you want to copy:`,
    prompt_copy_buy_sol: (wallet) =>
      `💰 *Set Buy Amount (SOL)*\n\n` +
      `Target: \`${wallet}\`\n\n` +
      `_Enter fixed SOL amount to spend on each copied buy (e.g. 0.1, 0.5, 1.0):_`,
    prompt_copy_mirror_sell: (wallet) =>
      `🔄 *Enable Mirror Selling?*\n\n` +
      `Target: \`${wallet}\`\n\n` +
      `When the target sells X% of their tokens, automatically sell X% of your tokens too?`,

    swap_swapping: (symbol, amount) => `⏳ *Executing Swap for $${symbol}...*\n\nAmount: \`${amount}\`\n_Routing via Jupiter V6 Turbo..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *Swap Executed Successfully!* 🚀\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Price:* \`$${price}\`\n` +
      `💰 *Spent:* \`${spent}\`\n` +
      `📦 *Received:* ~\`${received}\`\n\n` +
      `🔗 [View on Solscan](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *Swap Execution Failed!*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `⚠️ *Error:* \`${err || 'Transaction rejected or timed out'}\``,

    no_active_wallet_err: `❌ No active wallet found. Please configure a wallet in the Wallets menu first.`,
    insufficient_sol_err: (need, have) => `❌ Insufficient SOL balance! Needed: \`${need} SOL\`, Available: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ You do not have any $${symbol} tokens to sell in your active wallet.`,
    invalid_input_err: `❌ Invalid input. Please enter a valid number.`,
  },

  // 🇨🇳 CHINESE (Simplified)
  zh: {
    btn_back_main: '🔙 主菜单',
    btn_cancel: '❌ 取消',
    btn_refresh: '🔄 刷新',
    btn_trade: '🎯 交易代币',
    btn_wallets: '💳 钱包管理',
    btn_portfolio: '💼 持仓资产',
    btn_orders: '📋 限价订单',
    btn_settings: '⚙️ 系统设置',
    btn_security: '🛡️ 安全中心',
    btn_language: '🌐 语言设置',
    btn_add_wallet: '➕ 添加钱包',
    btn_remove_wallet: '🗑️ 移除钱包',
    btn_generate_wallet: '✨ 生成新钱包',
    btn_export_key: '🔑 导出私钥备份',
    btn_back_security: '🔙 返回安全中心',
    btn_custom_slippage: '✏️ 自定义滑点',
    btn_buy_custom: '✏️ 自定义SOL买入',
    btn_sell_custom: '✏️ 自定义%卖出',
    btn_limit_buy: '🎯 限价抄底 (Dip Buy)',
    btn_limit_sell: '🎯 止盈止损 (TP/SL)',
    btn_custom_dip_pct: '✏️ 自定义抄底%',
    btn_custom_tpsl_pct: '✏️ 自定义TP/SL%',
    btn_custom_price: '🎯 自定义目标价',
    btn_edit_price: '✏️ 修改价格',
    btn_edit_amount: '✏️ 修改数量',
    btn_cancel_order: '🚫 取消订单',
    btn_delete_order: '🗑️ 删除历史订单',
    btn_back_orders: '🔙 返回订单列表',
    btn_view_solscan: '🔍 在Solscan上查看',
    btn_trade_dashboard: '🎯 交易面板',
    btn_hide_key: '🔒 立即隐藏并销毁',
    btn_confirm_export: '⚠️ 确认显示私钥',
    btn_try_again: '🔄 重试',
    btn_copy_trading: '👥 跟单交易',
    btn_add_copy_target: '➕ 添加跟单目标',
    btn_copy_targets: '👥 活跃目标',
    btn_copy_history: '📜 跟单历史',
    btn_back_copy: '🔙 返回跟单中心',
    btn_pause_target: '⏸️ 暂停',
    btn_resume_target: '▶️ 恢复',
    btn_delete_target: '🗑️ 删除目标',

    wallet_active: '当前活跃钱包',
    wallet_balance: 'SOL 余额',
    none_add_in_wallets: '暂无 (请在钱包菜单中添加)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *欢迎使用 UPBOT AI Solana 交易机器人!* ⚡\n\n` +
      `👤 *用户:* ${name}\n` +
      `💳 *当前钱包:* \`${walletText}\`\n` +
      `💰 *SOL 余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% 手续费兑换:* Jupiter V6 极速智能路由\n` +
      `👥 *跟单交易:* 24/7 毫秒级链上目标钱包自动跟单\n` +
      `⏱️ *限价订单:* 自动抄底、自动止盈 (TP)、自动止损 (SL)\n` +
      `💼 *资产看板:* 实时追踪代币持仓与一键闪兑卖出\n` +
      `🛡️ *军工级安全:* 本地 AES-256-GCM 高度加密与白名单机制\n\n` +
      `👇 _请从下方选择功能菜单，或直接发送 Solana 代币合约地址 (CA):_`,

    security_title: (listText) =>
      `🔐 *安全与钱包管理*\n\n` +
      `所有私钥和助记词均在本地使用 AES-256-GCM 严格加密存储。\n\n` +
      `📋 *已连接钱包列表:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *添加钱包:* 导入 Base58 私钥或 12/24 位助记词\n` +
      `✨ *生成新钱包:* 快速创建全新 Solana 密钥对\n` +
      `🔑 *导出私钥:* 备份与查看明文私钥\n` +
      `🗑️ *移除钱包:* 从本地删除钱包`,
    security_empty: `❌ _当前未添加任何钱包。点击下方按钮添加或生成。_`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *您的代币资产与持仓看板*\n\n` +
      `💳 *钱包:* \`${wallet}\`\n` +
      `💰 *SOL 余额:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *总持仓价值:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *点击代币立即交易或闪兑卖出:*`,
    portfolio_empty: `_该钱包当前没有持有任何代币。_`,
    portfolio_trade_btn: (symbol) => `🎯 交易 $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *系统参数设置*\n\n` +
      `⚡ *当前滑点:* \`${slippage}%\`\n` +
      `⛽ *优先燃料费:* \`${priorityFee} SOL\` (Turbo 极速加速)\n\n` +
      `_点击下方按钮快捷调整:_`,
    btn_slippage: (val) => `⚡ 滑点: ${val}%`,
    btn_priority_fee: (val) => `⛽ 优先费: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *限价订单管理中心*\n\n` +
      `⚡ *挂单中:* \`${activeCount}\` | 📜 *历史已完成:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_点击订单查看详情或手动撤单:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *订单 #${id} 详情*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `📌 *类型:* \`${type}\` (${cond})\n` +
      `📊 *状态:* \`${status}\`\n` +
      `🎯 *目标价格:* \`$${targetPrice}\`\n` +
      `💰 *数量:* \`${amount}\`\n` +
      `🕒 *创建时间:* \`${createdAt}\``,

    lang_select_title: `🌐 *选择语言*\n\n当前语言: *简体中文 🇨🇳*`,
    lang_switched: (langName) => `✅ 语言已切换为 *${langName}*!`,

    prompt_add_wallet:
      `🔐 *添加 Solana 钱包*\n\n` +
      `请发送您的 Solana *Base58 格式私钥* 或 *12/24 位助记词*。\n\n` +
      `⚠️ _注意: 为保护您的资产安全，您的消息将在接收后被立即自动销毁。_`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *钱包导入成功!* 🎉\n\n` +
      `💳 *公钥地址:* \`${pubkey}\`\n` +
      `💰 *SOL 余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `该钱包已设为当前默认交易钱包。`,
    add_wallet_failed: (err) =>
      `❌ *钱包导入失败!*\n\n` +
      `错误信息: \`${err || '私钥或助记词格式无效'}\`\n\n` +
      `请检查后重试。`,

    prompt_trade_input:
      `🎯 *Solana 代币极速交易*\n\n` +
      `请输入或粘贴您要交易的 Solana 代币合约地址 (CA):\n\n` +
      `示例: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *自定义 SOL 数量买入 $${symbol}*\n\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n` +
      `💰 *可用余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_请输入要花费的 SOL 数量 (例如 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *自定义比例卖出 $${symbol}*\n\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n` +
      `📦 *代币持仓:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_请输入要卖出的百分比 (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *自定义滑点容差*\n\n` +
      `当前滑点: \`${current}%\`\n\n` +
      `_请输入您期望的滑点百分比 (例如 2.5 或 10):_`,
    slippage_updated: (val) => `✅ 滑点已更新为 \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *限价抄底买入 - 设置目标价格*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `_请输入目标价格 (USD) 或跌幅百分比 (例如 15%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *设置抄底跌幅百分比 (Dip %)*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `_请输入期望下跌多少百分比时自动买入 (例如 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *设置止盈 / 止损百分比*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `• *止盈 (Take Profit):* 正数 (如 \`35\` 表示 +35%, \`200\` 表示 3 倍)\n` +
      `• *止损 (Stop Loss):* 负数 (如 \`-15\` 表示 -15%)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *限价抄底 - 设置买入 SOL 数量*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `🎯 *目标价格:* \`$${targetPrice}\`\n` +
      `💰 *可用余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_请输入触发时花费的 SOL 数量:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? '自动止盈 (TP)' : '自动止损 (SL)'} - 设置目标价格*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `_请输入目标价格 (USD) 或百分比 (例如 +50% 或 -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? '止盈' : '止损'} - 设置卖出比例*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `🎯 *目标价格:* \`$${targetPrice}\`\n` +
      `📦 *当前持仓:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_请输入卖出百分比 (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *限价订单创建成功!* 🎯\n\n` +
      `📌 *类型:* \`${type}\`\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `🎯 *目标价:* \`$${target}\`\n` +
      `💰 *数量:* \`${amount}\`\n\n` +
      `Bot 将 24 小时全天候监控市场并在达到目标价时自动极速执行。\n`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *修改订单 #${orderId} 的目标价格*\n\n` +
      `当前目标价: \`$${currentTarget}\`\n\n` +
      `_请输入新的目标价格 (USD) 或 %:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *修改订单 #${orderId} 的交易数量*\n\n` +
      `当前数量: \`${currentAmount}\`\n\n` +
      `_请输入新的数量:_`,

    order_updated: `✅ 订单修改成功!`,
    order_cancelled: `🚫 订单已成功撤销。`,
    order_deleted: `🗑️ 订单已从历史记录中删除。`,

    copy_menu_title: (activeCount, listText) =>
      `👥 *跟单交易中心*\n\n` +
      `⚡ *监控中的目标钱包:* \`${activeCount}\`\n\n` +
      `${listText}\n\n` +
      `_选择目标钱包进行管理或点击下方添加新目标:_`,
    copy_target_added: (wallet, solAmount, mirrorSell) =>
      `✅ *跟单目标添加成功!* 🎯\n\n` +
      `👤 *目标钱包:* \`${wallet}\`\n` +
      `💰 *跟买金额:* \`${solAmount} SOL\` / 笔\n` +
      `🔄 *镜像卖出:* \`${mirrorSell ? '开启' : '关闭'}\`\n\n` +
      `Bot现已开始全天候链上监控。`,
    prompt_copy_target_wallet: `👥 *添加跟单目标钱包*\n\n请输入您想跟单的Solana钱包地址:`,
    prompt_copy_buy_sol: (wallet) =>
      `💰 *设置每次跟买金额 (SOL)*\n\n` +
      `目标: \`${wallet}\`\n\n` +
      `_请输入每次跟买的SOL数量 (例如 0.1, 0.5):_`,
    prompt_copy_mirror_sell: (wallet) =>
      `🔄 *是否开启镜像跟卖?*\n\n` +
      `目标: \`${wallet}\`\n\n` +
      `当目标卖出其X%代币时，自动按相同比例卖出您的代币?`,

    swap_swapping: (symbol, amount) => `⏳ *正在为 $${symbol} 执行兑换...*\n\n数量: \`${amount}\`\n_通过 Jupiter V6 极速路由中..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *交易兑换成功!* 🚀\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *成交价格:* \`$${price}\`\n` +
      `💰 *花费:* \`${spent}\`\n` +
      `📦 *获得:* ~\`${received}\`\n\n` +
      `🔗 [在 Solscan 上查看](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *兑换执行失败!*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `⚠️ *原因:* \`${err || '交易被拒绝或网络超时'}\``,

    no_active_wallet_err: `❌ 未检测到活跃钱包。请先在钱包菜单中配置。\n`,
    insufficient_sol_err: (need, have) => `❌ SOL 余额不足! 需要: \`${need} SOL\`, 当前可用: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ 您的钱包中没有持有可供卖出的 $${symbol} 代币。\n`,
    invalid_input_err: `❌ 输入无效，请输入有效数字。\n`,
  },

  // 🇷🇺 RUSSIAN
  ru: {
    btn_back_main: '🔙 Главное меню',
    btn_cancel: '❌ Отмена',
    btn_refresh: '🔄 Обновить',
    btn_trade: '🎯 Торговать',
    btn_wallets: '💳 Кошельки',
    btn_portfolio: '💼 Портфель',
    btn_orders: '📋 Лимитные ордера',
    btn_settings: '⚙️ Настройки',
    btn_security: '🛡️ Безопасность',
    btn_language: '🌐 Язык',
    btn_add_wallet: '➕ Добавить кошелек',
    btn_remove_wallet: '🗑️ Удалить кошелек',
    btn_generate_wallet: '✨ Создать новый кошелек',
    btn_export_key: '🔑 Экспорт ключа',
    btn_back_security: '🔙 В безопасность',
    btn_custom_slippage: '✏️ Свое проскальзывание',
    btn_buy_custom: '✏️ Купить на X SOL',
    btn_sell_custom: '✏️ Продать X %',
    btn_limit_buy: '🎯 Лимитная покупка',
    btn_limit_sell: '🎯 Тейк-профит / Стоп-лосс',
    btn_custom_dip_pct: '✏️ Свой % просадки',
    btn_custom_tpsl_pct: '✏️ Свой % TP/SL',
    btn_custom_price: '🎯 Своя цена USD',
    btn_edit_price: '✏️ Изменить цену',
    btn_edit_amount: '✏️ Изменить кол-во',
    btn_cancel_order: '🚫 Отменить ордер',
    btn_delete_order: '🗑️ Удалить из истории',
    btn_back_orders: '🔙 К ордерам',
    btn_view_solscan: '🔍 Посмотреть на Solscan',
    btn_trade_dashboard: '🎯 Торговый терминал',
    btn_hide_key: '🔒 Скрыть и удалить',
    btn_confirm_export: '⚠️ Показать приватный ключ',
    btn_try_again: '🔄 Попробовать снова',
    btn_copy_trading: '👥 Копи-трейдинг',
    btn_add_copy_target: '➕ Добавить цель',
    btn_copy_targets: '👥 Активные цели',
    btn_copy_history: '📜 История сделок',
    btn_back_copy: '🔙 Назад в копи-трейдинг',
    btn_pause_target: '⏸️ Пауза',
    btn_resume_target: '▶️ Возобновить',
    btn_delete_target: '🗑️ Удалить цель',

    wallet_active: 'Активный кошелек',
    wallet_balance: 'Баланс SOL',
    none_add_in_wallets: 'Нет (Добавьте в Кошельках)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *Добро пожаловать в UPBOT AI Solana Trading Bot!* ⚡\n\n` +
      `👤 *Пользователь:* ${name}\n` +
      `💳 *Активный кошелек:* \`${walletText}\`\n` +
      `💰 *Баланс SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Комиссий на свопы:* Сверхбыстрый роутинг Jupiter V6 Turbo\n` +
      `👥 *Копи-трейдинг:* Автоматическое следование за сделками кошельков\n` +
      `⏱️ *Лимитные ордера:* Покупка на просадке, TP и SL\n` +
      `💼 *Портфель активов:* Отслеживание токенов и продажа в 1 клик\n` +
      `🛡️ *Безопасность:* Локальное шифрование AES-256-GCM\n\n` +
      `👇 _Выберите пункт меню или отправьте адрес контракта (CA):_`,

    security_title: (listText) =>
      `🔐 *Безопасность и кошельки*\n\n` +
      `Все ключи и сид-фразы зашифрованы с помощью AES-256-GCM локально.\n\n` +
      `📋 *Подключенные кошельки:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Добавить:* Импорт ключа Base58 или фразы 12/24 слов\n` +
      `✨ *Создать:* Генерация нового кошелька Solana\n` +
      `🔑 *Экспорт:* Показать и сохранить приватный ключ\n` +
      `🗑️ *Удалить:* Отключить кошелек`,
    security_empty: `❌ _Кошельков пока нет. Нажмите "Добавить кошелек"._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *Ваш портфель токенов*\n\n` +
      `💳 *Кошелек:* \`${wallet}\`\n` +
      `💰 *Баланс SOL:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *Общая стоимость:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *Выберите токен для торговли или быстрой продажи:*`,
    portfolio_empty: `_В этом кошельке нет токенов._`,
    portfolio_trade_btn: (symbol) => `🎯 Торговать $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Настройки бота*\n\n` +
      `⚡ *Текущее проскальзывание:* \`${slippage}%\`\n` +
      `⛽ *Комиссия приоритета:* \`${priorityFee} SOL\` (Turbo)\n\n` +
      `_Нажмите кнопку для изменения:_`,
    btn_slippage: (val) => `⚡ Проскальзывание: ${val}%`,
    btn_priority_fee: (val) => `⛽ Комиссия: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *Центр лимитных ордеров*\n\n` +
      `⚡ *Активные ордера:* \`${activeCount}\` | 📜 *История:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_Выберите ордер для просмотра или отмены:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *Детали ордера #${id}*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `📌 *Тип:* \`${type}\` (${cond})\n` +
      `📊 *Статус:* \`${status}\`\n` +
      `🎯 *Цена срабатывания:* \`$${targetPrice}\`\n` +
      `💰 *Объем:* \`${amount}\`\n` +
      `🕒 *Создан:* \`${createdAt}\``,

    lang_select_title: `🌐 *Выберите язык*\n\nТекущий язык: *Русский 🇷🇺*`,
    lang_switched: (langName) => `✅ Язык изменен на *${langName}*!`,

    prompt_add_wallet:
      `🔐 *Добавить кошелек Solana*\n\n` +
      `Отправьте ваш *приватный ключ (Base58)* или *сид-фразу (12/24 слов)*.\n\n` +
      `⚠️ _Примечание: В целях безопасности ваше сообщение будет удалено автоматически._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *Кошелек успешно подключен!* 🎉\n\n` +
      `💳 *Адрес:* \`${pubkey}\`\n` +
      `💰 *Баланс SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `Этот кошелек установлен как активный.`,
    add_wallet_failed: (err) =>
      `❌ *Ошибка при добавлении кошелька!*\n\n` +
      `Ошибка: \`${err || 'Неверный приватный ключ или сид-фраза'}\`\n\n` +
      `Проверьте данные и попробуйте снова.`,

    prompt_trade_input:
      `🎯 *Торговля токенами Solana*\n\n` +
      `Введите адрес контракта токена (Mint Address):\n\n` +
      `Пример: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *Купить $${symbol} на произвольную сумму SOL*\n\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n` +
      `💰 *Доступно SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Введите сумму SOL (напр. 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *Продать $${symbol} по проценту*\n\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n` +
      `📦 *Баланс токена:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Введите процент для продажи (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *Настройка проскальзывания*\n\n` +
      `Текущее: \`${current}%\`\n\n` +
      `_Введите желаемый процент (напр. 2.5 или 10):_`,
    slippage_updated: (val) => `✅ Проскальзывание обновлено: \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *Лимитная покупка - Целевая цена*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `_Введите целевую цену в USD или % просадки (напр. 15%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *Установить процент просадки (Dip %)*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `_Введите % падения для покупки (напр. 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *Установить % для TP или SL*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `• *Тейк-профит (TP):* Положительное число (напр. \`35\` для +35%, \`200\` для 3x)\n` +
      `• *Стоп-лосс (SL):* Отрицательное число (напр. \`-15\` для -15%)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *Лимитная покупка - Сумма SOL*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `🎯 *Целевая цена:* \`$${targetPrice}\`\n` +
      `💰 *Доступно SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Введите сумму SOL для покупки:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? 'Тейк-профит (TP)' : 'Стоп-лосс (SL)'} - Целевая цена*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `_Введите цену в USD или % (напр. +50% или -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? 'Тейк-профит' : 'Стоп-лосс'} - Процент продажи*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `🎯 *Целевая цена:* \`$${targetPrice}\`\n` +
      `📦 *Баланс токенов:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Введите процент для продажи (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *Лимитный ордер успешно создан!* 🎯\n\n` +
      `📌 *Тип:* \`${type}\`\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `🎯 *Целевая цена:* \`$${target}\`\n` +
      `💰 *Объем:* \`${amount}\`\n\n` +
      `Бот будет отслеживать рынок и исполнит ордер 24/7.`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *Изменить целевую цену ордера #${orderId}*\n\n` +
      `Текущая цена: \`$${currentTarget}\`\n\n` +
      `_Введите новую цену в USD или %:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *Изменить объем ордера #${orderId}*\n\n` +
      `Текущий объем: \`${currentAmount}\`\n\n` +
      `_Введите новый объем:_`,

    order_updated: `✅ Ордер успешно обновлен!`,
    order_cancelled: `🚫 Ордер успешно отменен.`,
    order_deleted: `🗑️ Ордер удален из истории.`,

    copy_menu_title: (activeCount, listText) =>
      `👥 *Центр копи-трейдинга*\n\n` +
      `⚡ *Отслеживаемых кошельков:* \`${activeCount}\`\n\n` +
      `${listText}\n\n` +
      `_Выберите кошелек для управления или добавьте новый:_`,
    copy_target_added: (wallet, solAmount, mirrorSell) =>
      `✅ *Цель для копирования успешно добавлена!* 🎯\n\n` +
      `👤 *Кошелек:* \`${wallet}\`\n` +
      `💰 *Сумма покупки:* \`${solAmount} SOL\`\n` +
      `🔄 *Зеркальная продажа:* \`${mirrorSell ? 'Включена' : 'Выключена'}\`\n\n` +
      `Бот отслеживает кошелек 24/7.`,
    prompt_copy_target_wallet: `👥 *Добавить кошелек для копирования*\n\nОтправьте публичный адрес Solana (Wallet Address):`,
    prompt_copy_buy_sol: (wallet) =>
      `💰 *Установите сумму покупки (SOL)*\n\n` +
      `Цель: \`${wallet}\`\n\n` +
      `_Введите сумму SOL для каждой покупки (напр. 0.1, 0.5):_`,
    prompt_copy_mirror_sell: (wallet) =>
      `🔄 *Включить зеркальную продажу?*\n\n` +
      `Цель: \`${wallet}\`\n\n` +
      `Продавать ваши токены пропорционально, когда цель продает свои?`,

    swap_swapping: (symbol, amount) => `⏳ *Выполнение обмена для $${symbol}...*\n\nОбъем: \`${amount}\`\n_Роутинг через Jupiter V6 Turbo..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *Обмен успешно выполнен!* 🚀\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Цена:* \`$${price}\`\n` +
      `💰 *Потрачено:* \`${spent}\`\n` +
      `📦 *Получено:* ~\`${received}\`\n\n` +
      `🔗 [Посмотреть на Solscan](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *Ошибка выполнения обмена!*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `⚠️ *Ошибка:* \`${err || 'Транзакция отклонена или истек таймаут'}\``,

    no_active_wallet_err: `❌ Нет активного кошелька. Сначала добавьте его в меню Кошельки.`,
    insufficient_sol_err: (need, have) => `❌ Недостаточно SOL! Нужно: \`${need} SOL\`, доступно: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ У вас нет токенов $${symbol} для продажи в активном кошельке.`,
    invalid_input_err: `❌ Некорректный ввод. Введите правильное число.`,
  },

  // 🇰🇷 KOREAN
  ko: {
    btn_back_main: '🔙 메인 메뉴',
    btn_cancel: '❌ 취소',
    btn_refresh: '🔄 새로고침',
    btn_trade: '🎯 토큰 거래',
    btn_wallets: '💳 지갑 관리',
    btn_portfolio: '💼 보유 자산',
    btn_orders: '📋 지정가 주문',
    btn_settings: '⚙️ 봇 설정',
    btn_security: '🛡️ 보안 센터',
    btn_language: '🌐 언어 설정',
    btn_add_wallet: '➕ 지갑 추가',
    btn_remove_wallet: '🗑️ 지갑 삭제',
    btn_generate_wallet: '✨ 새 지갑 생성',
    btn_export_key: '🔑 개인키 백업',
    btn_back_security: '🔙 보안 메뉴로',
    btn_custom_slippage: '✏️ 슬리피지 직접 입력',
    btn_buy_custom: '✏️ 직접 SOL 매수',
    btn_sell_custom: '✏️ 직접 % 매도',
    btn_limit_buy: '🎯 지정가 저점 매수 (Dip)',
    btn_limit_sell: '🎯 익절/손절 (TP/SL)',
    btn_custom_dip_pct: '✏️ 직접 하락폭 % 설정',
    btn_custom_tpsl_pct: '✏️ 직접 TP/SL % 설정',
    btn_custom_price: '🎯 직접 목표가 USD',
    btn_edit_price: '✏️ 가격 수정',
    btn_edit_amount: '✏️ 수량 수정',
    btn_cancel_order: '🚫 주문 취소',
    btn_delete_order: '🗑️ 내역에서 삭제',
    btn_back_orders: '🔙 주문 목록으로',
    btn_view_solscan: '🔍 Solscan에서 보기',
    btn_trade_dashboard: '🎯 거래 대시보드',
    btn_hide_key: '🔒 즉시 숨기기 및 삭제',
    btn_confirm_export: '⚠️ 개인키 확인하기',
    btn_try_again: '🔄 다시 시도',
    btn_copy_trading: '👥 카피 트레이딩',
    btn_add_copy_target: '➕ 타겟 지갑 추가',
    btn_copy_targets: '👥 활성 타겟',
    btn_copy_history: '📜 카피 기록',
    btn_back_copy: '🔙 카피 메뉴로',
    btn_pause_target: '⏸️ 일시중지',
    btn_resume_target: '▶️ 재개',
    btn_delete_target: '🗑️ 타겟 삭제',

    wallet_active: '현재 활성 지갑',
    wallet_balance: 'SOL 잔액',
    none_add_in_wallets: '없음 (지갑 메뉴에서 추가)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *UPBOT AI Solana 트레이딩 봇에 오신 것을 환영합니다!* ⚡\n\n` +
      `👤 *사용자:* ${name}\n` +
      `💳 *활성 지갑:* \`${walletText}\`\n` +
      `💰 *SOL 잔액:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% 수수료 스왑:* Jupiter V6 초고속 터보 라우팅\n` +
      `👥 *카피 트레이딩:* 24시간 실시간 온체인 타겟 지갑 복사 매매\n` +
      `⏱️ *지정가 주문:* 저점 매수, 익절 (TP), 손절 (SL) 자동 실행\n` +
      `💼 *포트폴리오:* 보유 토큰 실시간 추적 및 원클릭 매도\n` +
      `🛡️ *보안:* 로컬 AES-256-GCM 암호화 및 화이트리스트\n\n` +
      `👇 _메뉴를 선택하거나 솔라나 토큰 CA를 입력하세요:_`,

    security_title: (listText) =>
      `🔐 *보안 및 지갑 관리*\n\n` +
      `모든 개인키와 시드 문구는 로컬에 AES-256-GCM으로 안전하게 암호화 저장됩니다.\n\n` +
      `📋 *연결된 지갑 목록:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *지갑 추가:* Base58 개인키 또는 12/24단어 시드 가져오기\n` +
      `✨ *새 지갑 생성:* 새 솔라나 키페어 생성\n` +
      `🔑 *개인키 내보내기:* 백업 확인\n` +
      `🗑️ *지갑 삭제:* 봇에서 지갑 제거`,
    security_empty: `❌ _등록된 지갑이 없습니다. "지갑 추가"로 시작하세요._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *내 토큰 포트폴리오*\n\n` +
      `💳 *지갑:* \`${wallet}\`\n` +
      `💰 *SOL 잔액:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *총 평가 가치:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *거래하거나 매도할 토큰을 선택하세요:*`,
    portfolio_empty: `_이 지갑에 보유 중인 토큰이 없습니다._`,
    portfolio_trade_btn: (symbol) => `🎯 $${symbol} 거래`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *트레이딩 설정*\n\n` +
      `⚡ *현재 슬리피지:* \`${slippage}%\`\n` +
      `⛽ *우선 가스비:* \`${priorityFee} SOL\` (터보 가속)\n\n` +
      `_설정할 항목을 선택하세요:_`,
    btn_slippage: (val) => `⚡ 슬리피지: ${val}%`,
    btn_priority_fee: (val) => `⛽ 우선 가스비: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *지정가 주문 센터*\n\n` +
      `⚡ *대기 중인 주문:* \`${activeCount}\` | 📜 *체결 내역:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_상세 정보 확인 또는 취소할 주문을 선택하세요:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *주문 #${id} 상세 정보*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `📌 *유형:* \`${type}\` (${cond})\n` +
      `📊 *상태:* \`${status}\`\n` +
      `🎯 *목표 가격:* \`$${targetPrice}\`\n` +
      `💰 *수량:* \`${amount}\`\n` +
      `🕒 *생성 시간:* \`${createdAt}\``,

    lang_select_title: `🌐 *언어 선택*\n\n현재 언어: *한국어 🇰🇷*`,
    lang_switched: (langName) => `✅ 언어가 *${langName}*로 변경되었습니다!`,

    prompt_add_wallet:
      `🔐 *솔라나 지갑 추가*\n\n` +
      `Solana *Base58 개인키* 또는 *12/24단어 시드 문구*를 입력하세요.\n\n` +
      `⚠️ _보안 안내: 입력하신 메시지는 수신 즉시 자동 삭제됩니다._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *지갑이 성공적으로 연결되었습니다!* 🎉\n\n` +
      `💳 *공개 주소:* \`${pubkey}\`\n` +
      `💰 *SOL 잔액:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `이 지갑이 현재 활성 지갑으로 설정되었습니다.`,
    add_wallet_failed: (err) =>
      `❌ *지갑 추가 실패!*\n\n` +
      `오류: \`${err || '잘못된 개인키 또는 시드 문구'}\`\n\n` +
      `확인 후 다시 시도해주세요.`,

    prompt_trade_input:
      `🎯 *솔라나 토큰 트레이딩*\n\n` +
      `거래할 솔라나 토큰의 컨트랙트 주소 (Mint Address)를 입력하세요:\n\n` +
      `예시: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *직접 지정한 SOL 수량으로 $${symbol} 매수*\n\n` +
      `💵 *현재 가격:* \`$${currentPrice}\`\n` +
      `💰 *사용 가능:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_매수할 SOL 금액을 입력하세요 (예: 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *직접 지정한 비율(%)로 $${symbol} 매도*\n\n` +
      `💵 *현재 가격:* \`$${currentPrice}\`\n` +
      `📦 *토큰 보유량:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_매도할 퍼센트를 입력하세요 (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *슬리피지 허용치 설정*\n\n` +
      `현재 슬리피지: \`${current}%\`\n\n` +
      `_원하는 슬리피지 퍼센트를 입력하세요 (예: 2.5 또는 10):_`,
    slippage_updated: (val) => `✅ 슬리피지가 \`${val}%\`로 업데이트되었습니다!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *지정가 저점 매수 - 목표 가격 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재 가격:* \`$${currentPrice}\`\n\n` +
      `_목표 가격(USD) 또는 하락률(예: 15%)을 입력하세요:_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *하락률 % 직접 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재 가격:* \`$${currentPrice}\`\n\n` +
      `_자동 매수할 하락률을 입력하세요 (예: 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *TP / SL % 직접 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재 가격:* \`$${currentPrice}\`\n\n` +
      `• *익절 (Take Profit):* 양수 입력 (+35%는 \`35\`, 3배는 \`200\`)\n` +
      `• *손절 (Stop Loss):* 음수 입력 (-15%는 \`-15\`)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *지정가 매수 - 매수 SOL 수량 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `🎯 *목표 가격:* \`$${targetPrice}\`\n` +
      `💰 *사용 가능:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_매수에 사용할 SOL 금액을 입력하세요:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? '익절 (Take Profit)' : '손절 (Stop Loss)'} - 목표 가격 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재 가격:* \`$${currentPrice}\`\n\n` +
      `_목표 가격(USD) 또는 퍼센트를 입력하세요 (예: +50% 또는 -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? '익절' : '손절'} - 매도 비율 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `🎯 *목표 가격:* \`$${targetPrice}\`\n` +
      `📦 *토큰 보유량:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_매도할 비율(%)을 입력하세요 (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *지정가 주문이 성공적으로 생성되었습니다!* 🎯\n\n` +
      `📌 *유형:* \`${type}\`\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `🎯 *목표가:* \`$${target}\`\n` +
      `💰 *수량:* \`${amount}\`\n\n` +
      `봇이 24시간 실시간 모니터링하여 목표가 도달 시 자동 체결합니다.`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *주문 #${orderId}의 목표 가격 수정*\n\n` +
      `현재 목표가: \`$${currentTarget}\`\n\n` +
      `_새 목표 가격(USD) 또는 %를 입력하세요:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *주문 #${orderId}의 거래 수량 수정*\n\n` +
      `현재 수량: \`${currentAmount}\`\n\n` +
      `_새 수량을 입력하세요:_`,

    order_updated: `✅ 주문이 성공적으로 수정되었습니다!`,
    order_cancelled: `🚫 주문이 성공적으로 취소되었습니다.`,
    order_deleted: `🗑️ 주문이 내역에서 삭제되었습니다.`,

    copy_menu_title: (activeCount, listText) =>
      `👥 *카피 트레이딩 허브*\n\n` +
      `⚡ *모니터링 중인 지갑:* \`${activeCount}\`개\n\n` +
      `${listText}\n\n` +
      `_관리할 지갑을 선택하거나 아래에서 새로 추가하세요:_`,
    copy_target_added: (wallet, solAmount, mirrorSell) =>
      `✅ *카피 타겟이 추가되었습니다!* 🎯\n\n` +
      `👤 *지갑 주소:* \`${wallet}\`\n` +
      `💰 *매수 금액:* \`${solAmount} SOL\`\n` +
      `🔄 *미러 매도:* \`${mirrorSell ? '활성화' : '비활성화'}\`\n\n` +
      `봇이 24시간 실시간 모니터링합니다.`,
    prompt_copy_target_wallet: `👥 *카피할 Solana 지갑 주소 입력*\n\n따라 살 솔라나 지갑 주소를 보내주세요:`,
    prompt_copy_buy_sol: (wallet) =>
      `💰 *매수할 SOL 금액 설정*\n\n` +
      `타겟: \`${wallet}\`\n\n` +
      `_각 매수마다 사용할 SOL 금액을 입력하세요 (예: 0.1, 0.5):_`,
    prompt_copy_mirror_sell: (wallet) =>
      `🔄 *미러 매도 (동일 비율 자동 매도) 활성화?*\n\n` +
      `타겟: \`${wallet}\`\n\n` +
      `타겟 지갑이 매도할 때 보유 토큰을 동일 비율로 자동 매도합니까?`,

    swap_swapping: (symbol, amount) => `⏳ *$${symbol} 스왑 실행 중...*\n\n수량: \`${amount}\`\n_Jupiter V6 터보 라우팅 연결 중..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *스왑 성공!* 🚀\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *체결 가격:* \`$${price}\`\n` +
      `💰 *사용 금액:* \`${spent}\`\n` +
      `📦 *수령 수량:* ~\`${received}\`\n\n` +
      `🔗 [Solscan에서 트랜잭션 보기](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *스왑 실행 실패!*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `⚠️ *오류:* \`${err || '트랜잭션 거부 또는 타임아웃'}\``,

    no_active_wallet_err: `❌ 활성화된 지갑이 없습니다. 먼저 지갑 메뉴에서 설정해주세요.`,
    insufficient_sol_err: (need, have) => `❌ SOL 잔액이 부족합니다! 필요: \`${need} SOL\`, 현재 잔액: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ 활성 지갑에 매도할 $${symbol} 토큰 잔액이 없습니다.`,
    invalid_input_err: `❌ 올바른 숫자를 입력해주세요.`,
  },

  // 🇪🇸 SPANISH
  es: {
    btn_back_main: '🔙 Menú Principal',
    btn_cancel: '❌ Cancelar',
    btn_refresh: '🔄 Actualizar',
    btn_trade: '🎯 Operar Token',
    btn_wallets: '💳 Billeteras',
    btn_portfolio: '💼 Portafolio',
    btn_orders: '📋 Órdenes Límite',
    btn_settings: '⚙️ Ajustes',
    btn_security: '🛡️ Seguridad',
    btn_language: '🌐 Idioma',
    btn_add_wallet: '➕ Añadir Billetera',
    btn_remove_wallet: '🗑️ Eliminar Billetera',
    btn_generate_wallet: '✨ Crear Nueva Billetera',
    btn_export_key: '🔑 Exportar Clave Privada',
    btn_back_security: '🔙 Volver a Seguridad',
    btn_custom_slippage: '✏️ Slippage Personalizado',
    btn_buy_custom: '✏️ Comprar X SOL',
    btn_sell_custom: '✏️ Vender X %',
    btn_limit_buy: '🎯 Compra Límite (Dip)',
    btn_limit_sell: '🎯 Venta Límite (TP/SL)',
    btn_custom_dip_pct: '✏️ % Caída Personalizado',
    btn_custom_tpsl_pct: '✏️ % TP/SL Personalizado',
    btn_custom_price: '🎯 Precio USD Personalizado',
    btn_edit_price: '✏️ Editar Precio',
    btn_edit_amount: '✏️ Editar Cantidad',
    btn_cancel_order: '🚫 Cancelar Orden',
    btn_delete_order: '🗑️ Eliminar del Historial',
    btn_back_orders: '🔙 Volver a Órdenes',
    btn_view_solscan: '🔍 Ver en Solscan',
    btn_trade_dashboard: '🎯 Panel de Trading',
    btn_hide_key: '🔒 Ocultar y Borrar Ahora',
    btn_confirm_export: '⚠️ Sí, Mostrar Clave',
    btn_try_again: '🔄 Reintentar',
    btn_copy_trading: '👥 Copy Trading',
    btn_add_copy_target: '➕ Añadir Billetera Objetivo',
    btn_copy_targets: '👥 Objetivos Activos',
    btn_copy_history: '📜 Historial de Copia',
    btn_back_copy: '🔙 Volver a Copy Trading',
    btn_pause_target: '⏸️ Pausar',
    btn_resume_target: '▶️ Reanudar',
    btn_delete_target: '🗑️ Eliminar Objetivo',

    wallet_active: 'Billetera Activa',
    wallet_balance: 'Saldo SOL',
    none_add_in_wallets: 'Ninguna (Añadir en Billeteras)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *¡Bienvenido a UPBOT AI Solana Trading Bot!* ⚡\n\n` +
      `👤 *Usuario:* ${name}\n` +
      `💳 *Billetera Activa:* \`${walletText}\`\n` +
      `💰 *Saldo SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Comisión en Swaps:* Enrutamiento ultrarrápido Jupiter V6 Turbo\n` +
      `👥 *Copy Trading:* Replicación automática de billeteras 24/7\n` +
      `⏱️ *Órdenes Límite:* Comprar en caída, Take Profit (TP), Stop Loss (SL)\n` +
      `💼 *Rastreador de Portafolio:* Controla tus tokens SPL y venta en 1 clic\n` +
      `🛡️ *Seguridad Máxima:* Cifrado local AES-256-GCM y lista blanca\n\n` +
      `👇 _Selecciona una opción o envía la dirección de contrato (CA) de Solana:_`,

    security_title: (listText) =>
      `🔐 *Seguridad y Gestión de Billeteras*\n\n` +
      `Todas las claves privadas y frases semilla están cifradas con AES-256-GCM en tu dispositivo local.\n\n` +
      `📋 *Billeteras Conectadas:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Añadir Billetera:* Importar clave Base58 o frase de 12/24 palabras\n` +
      `✨ *Crear Billetera:* Generar un nuevo par de claves Solana\n` +
      `🔑 *Exportar Clave:* Respaldo de clave privada\n` +
      `🗑️ *Eliminar Billetera:* Desconectar y borrar`,
    security_empty: `❌ _No se encontraron billeteras. Haz clic en "Añadir Billetera" o "Crear Nueva Billetera"._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *Portafolio de Tokens / Activos*\n\n` +
      `💳 *Billetera:* \`${wallet}\`\n` +
      `💰 *Saldo SOL:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *Valor Total:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *Selecciona un token para operar o vender al instante:*`,
    portfolio_empty: `_No hay tokens SPL en esta billetera._`,
    portfolio_trade_btn: (symbol) => `🎯 Operar $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Ajustes del Bot*\n\n` +
      `⚡ *Slippage Actual:* \`${slippage}%\`\n` +
      `⛽ *Comisión Prioritaria:* \`${priorityFee} SOL\` (Modo Turbo)\n\n` +
      `_Selecciona una opción para configurar:_`,
    btn_slippage: (val) => `⚡ Slippage: ${val}%`,
    btn_priority_fee: (val) => `⛽ Tarifa: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *Centro de Órdenes Límite*\n\n` +
      `⚡ *Órdenes Activas:* \`${activeCount}\` | 📜 *Historial:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_Selecciona una orden para ver detalles o cancelarla:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *Detalles de la Orden #${id}*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `📌 *Tipo:* \`${type}\` (${cond})\n` +
      `📊 *Estado:* \`${status}\`\n` +
      `🎯 *Precio Objetivo:* \`$${targetPrice}\`\n` +
      `💰 *Cantidad:* \`${amount}\`\n` +
      `🕒 *Creada:* \`${createdAt}\``,

    lang_select_title: `🌐 *Seleccionar Idioma*\n\nIdioma actual: *Español 🇪🇸*`,
    lang_switched: (langName) => `✅ ¡Idioma cambiado a *${langName}*!`,

    prompt_add_wallet:
      `🔐 *Añadir Billetera Solana*\n\n` +
      `Envía tu *Clave Privada Base58* o tu *Frase Semilla de 12/24 palabras*.\n\n` +
      `⚠️ _Nota: Por seguridad, tu mensaje será eliminado automáticamente al instante._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *¡Billetera Conectada Exitosamente!* 🎉\n\n` +
      `💳 *Dirección Pública:* \`${pubkey}\`\n` +
      `💰 *Saldo SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `Esta billetera ha sido configurada como activa.`,
    add_wallet_failed: (err) =>
      `❌ *¡Error al conectar la billetera!*\n\n` +
      `Error: \`${err || 'Clave privada o frase semilla no válida'}\`\n\n` +
      `Por favor verifica tus datos e inténtalo de nuevo.`,

    prompt_trade_input:
      `🎯 *Trading de Tokens Solana*\n\n` +
      `Introduce o pega la *Dirección del Contrato (Mint Address)*:\n\n` +
      `Ejemplo: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *Comprar $${symbol} con cantidad personalizada de SOL*\n\n` +
      `💵 *Precio Actual:* \`$${currentPrice}\`\n` +
      `💰 *Saldo Disponible:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Introduce la cantidad de SOL a gastar (ej. 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *Vender $${symbol} con porcentaje personalizado*\n\n` +
      `💵 *Precio Actual:* \`$${currentPrice}\`\n` +
      `📦 *Saldo de Tokens:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Introduce el porcentaje a vender (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *Tolerancia de Slippage Personalizada*\n\n` +
      `Slippage actual: \`${current}%\`\n\n` +
      `_Introduce el porcentaje de slippage deseado (ej. 2.5 o 10):_`,
    slippage_updated: (val) => `✅ ¡Slippage actualizado a \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *Compra Límite (Dip) - Fijar Precio Objetivo*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Precio Actual:* \`$${currentPrice}\`\n\n` +
      `_Introduce el precio objetivo en USD o porcentaje de caída (ej. 15%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *Fijar Porcentaje de Caída (Dip %)*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Precio Actual:* \`$${currentPrice}\`\n\n` +
      `_Introduce el porcentaje de caída para comprar (ej. 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *Fijar Porcentaje para TP o SL*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Precio Actual:* \`$${currentPrice}\`\n\n` +
      `• *Take Profit (TP):* Número positivo (ej. \`35\` para +35%, \`200\` para 3x)\n` +
      `• *Stop Loss (SL):* Número negativo (ej. \`-15\` para -15%)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *Compra Límite - Fijar Cantidad de SOL*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Precio Objetivo:* \`$${targetPrice}\`\n` +
      `💰 *Saldo Disponible:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Introduce la cantidad de SOL a gastar:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? 'Take Profit (TP)' : 'Stop Loss (SL)'} - Fijar Precio Objetivo*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Precio Actual:* \`$${currentPrice}\`\n\n` +
      `_Introduce el precio objetivo en USD o porcentaje (ej. +50% o -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? 'Take Profit' : 'Stop Loss'} - Fijar Porcentaje*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Precio Objetivo:* \`$${targetPrice}\`\n` +
      `📦 *Saldo de Tokens:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Introduce el porcentaje a vender (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *¡Orden Límite Creada con Éxito!* 🎯\n\n` +
      `📌 *Tipo:* \`${type}\`\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Precio Objetivo:* \`$${target}\`\n` +
      `💰 *Cantidad:* \`${amount}\`\n\n` +
      `El bot monitorizará el mercado y ejecutará la orden 24/7.`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *Editar Precio Objetivo de la Orden #${orderId}*\n\n` +
      `Precio objetivo actual: \`$${currentTarget}\`\n\n` +
      `_Introduce el nuevo precio en USD o %:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *Editar Cantidad de la Orden #${orderId}*\n\n` +
      `Cantidad actual: \`${currentAmount}\`\n\n` +
      `_Introduce la nueva cantidad:_`,

    order_updated: `✅ ¡Orden actualizada exitosamente!`,
    order_cancelled: `🚫 Orden cancelada exitosamente.`,
    order_deleted: `🗑️ Orden eliminada del historial.`,

    copy_menu_title: (activeCount, listText) =>
      `👥 *Centro de Copy Trading*\n\n` +
      `⚡ *Billeteras en monitoreo:* \`${activeCount}\`\n\n` +
      `${listText}\n\n` +
      `_Seleccione una billetera o añada una nueva debajo:_`,
    copy_target_added: (wallet, solAmount, mirrorSell) =>
      `✅ *¡Objetivo de copia añadido con éxito!* 🎯\n\n` +
      `👤 *Billetera:* \`${wallet}\`\n` +
      `💰 *Compra fija:* \`${solAmount} SOL\`\n` +
      `🔄 *Venta espejo:* \`${mirrorSell ? 'Activada' : 'Desactivada'}\`\n\n` +
      `El bot está monitoreando en cadena 24/7.`,
    prompt_copy_target_wallet: `👥 *Añadir Billetera Objetivo*\n\nPor favor envíe la dirección de Solana (Wallet) que desea copiar:`,
    prompt_copy_buy_sol: (wallet) =>
      `💰 *Definir Cantidad de Compra (SOL)*\n\n` +
      `Objetivo: \`${wallet}\`\n\n` +
      `_Introduzca la cantidad de SOL por compra (ej. 0.1, 0.5):_`,
    prompt_copy_mirror_sell: (wallet) =>
      `🔄 *¿Habilitar Venta Espejo?*\n\n` +
      `Objetivo: \`${wallet}\`\n\n` +
      `¿Vender automáticamente sus tokens en el mismo porcentaje cuando el objetivo venda?`,

    swap_swapping: (symbol, amount) => `⏳ *Ejecutando Swap para $${symbol}...*\n\nCantidad: \`${amount}\`\n_Enrutando mediante Jupiter V6 Turbo..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *¡Swap Ejecutado con Éxito!* 🚀\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Precio:* \`$${price}\`\n` +
      `💰 *Gastado:* \`${spent}\`\n` +
      `📦 *Recibido:* ~\`${received}\`\n\n` +
      `🔗 [Ver en Solscan](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *¡Fallo en la ejecución del Swap!*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `⚠️ *Error:* \`${err || 'Transacción rechazada o tiempo agotado'}\``,

    no_active_wallet_err: `❌ No hay billetera activa. Configura una en el menú de Billeteras primero.`,
    insufficient_sol_err: (need, have) => `❌ ¡Saldo SOL insuficiente! Necesario: \`${need} SOL\`, Disponible: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ No tienes tokens de $${symbol} en tu billetera activa para vender.`,
    invalid_input_err: `❌ Entrada no válida. Por favor introduce un número válido.`,
  },

  // Burmese (English fallback)
  my: {
    btn_back_main: '🔙 Main Menu',
    btn_cancel: '❌ Cancel',
    btn_refresh: '🔄 Refresh',
    btn_trade: '🎯 Trade Token',
    btn_wallets: '💳 Wallets',
    btn_portfolio: '💼 Portfolio',
    btn_orders: '📋 Active Orders',
    btn_settings: '⚙️ Settings',
    btn_security: '🛡️ Security',
    btn_language: '🌐 Language',
    btn_add_wallet: '➕ Add Wallet',
    btn_remove_wallet: '🗑️ Remove Wallet',
    btn_generate_wallet: '✨ Generate New Wallet',
    btn_export_key: '🔑 Backup / Export Key',
    btn_back_security: '🔙 Back to Security',
    btn_custom_slippage: '✏️ Custom Slippage',
    btn_buy_custom: '✏️ Buy X SOL',
    btn_sell_custom: '✏️ Sell X %',
    btn_limit_buy: '🎯 Limit Buy (Dip)',
    btn_limit_sell: '🎯 Limit Sell (TP/SL)',
    btn_custom_dip_pct: '✏️ Custom Dip %',
    btn_custom_tpsl_pct: '✏️ Custom TP/SL %',
    btn_custom_price: '🎯 Custom Price USD',
    btn_edit_price: '✏️ Edit Price',
    btn_edit_amount: '✏️ Edit Amount',
    btn_cancel_order: '🚫 Cancel Order',
    btn_delete_order: '🗑️ Delete from History',
    btn_back_orders: '🔙 Back to Orders',
    btn_view_solscan: '🔍 View on Solscan',
    btn_trade_dashboard: '🎯 Trade Dashboard',
    btn_hide_key: '🔒 Hide & Delete Immediately',
    btn_confirm_export: '⚠️ Yes, Show Private Key',
    btn_try_again: '🔄 Try Again',
    btn_copy_trading: '👥 Copy Trading',
    btn_add_copy_target: '➕ Add Target Wallet',
    btn_copy_targets: '👥 Active Targets',
    btn_copy_history: '📜 Copy History',
    btn_back_copy: '🔙 Back to Copy Trading',
    btn_pause_target: '⏸️ Pause',
    btn_resume_target: '▶️ Resume',
    btn_delete_target: '🗑️ Delete Target',

    wallet_active: 'Active Wallet',
    wallet_balance: 'SOL Balance',
    none_add_in_wallets: 'None (Add in Wallets menu)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *Welcome to UPBOT AI Solana Trading Bot!* ⚡\n\n` +
      `👤 *User:* ${name}\n` +
      `💳 *Active Wallet:* \`${walletText}\`\n` +
      `💰 *SOL Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Fee Direct Swap:* Ultra-fast Jupiter V6 Turbo routing\n` +
      `👥 *Copy Trading:* Auto mirror trades from target wallets 24/7\n` +
      `⏱️ *Limit Orders:* Dip Buy, Take Profit (TP), Stop Loss (SL)\n` +
      `💼 *Portfolio Tracker:* Live tokens, holdings, & instant sell\n` +
      `🛡️ *Military-Grade Security:* Local AES-256-GCM & Admin Lock\n\n` +
      `👇 _Select an option below or send a Solana Token CA to begin:_`,

    security_title: (listText) =>
      `🔐 *Security & Wallet Management*\n\n` +
      `Your private keys are encrypted locally using AES-256-GCM.\n\n` +
      `📋 *Connected Wallets:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Add Wallet:* Import via Private Key or Seed Phrase\n` +
      `✨ *Generate New Wallet:* Create a new Solana keypair\n` +
      `🔑 *Export Key:* Backup your decrypted private key\n` +
      `🗑️ *Remove Wallet:* Delete wallet from bot storage`,
    security_empty: `❌ _No wallets found. Use "Add Wallet" or "Generate New Wallet" to begin._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *Your Token Portfolio*\n\n` +
      `💳 *Wallet:* \`${wallet}\`\n` +
      `💰 *SOL Balance:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *Total Value:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *Select a token to trade or manage:*`,
    portfolio_empty: `_No tokens found in this wallet._`,
    portfolio_trade_btn: (symbol) => `🎯 Trade $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Bot Settings & Preferences*\n\n` +
      `⚡ *Current Slippage:* \`${slippage}%\`\n` +
      `⛽ *Priority Fee:* \`${priorityFee} SOL\` (Turbo)\n\n` +
      `_Click buttons below to modify trading parameters:_`,
    btn_slippage: (val) => `⚡ Slippage: ${val}%`,
    btn_priority_fee: (val) => `⛽ Priority Fee: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *Limit Orders Center*\n\n` +
      `⚡ *Active Pending Orders:* \`${activeCount}\` | 📜 *History:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_Click an order below to view details or cancel:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *Order #${id} Details*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `📌 *Type:* \`${type}\` (${cond})\n` +
      `📊 *Status:* \`${status}\`\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `💰 *Amount:* \`${amount}\`\n` +
      `🕒 *Created:* \`${createdAt}\``,

    lang_select_title: `🌐 *Select Bot Language*\n\nChoose your preferred interface language:`,
    lang_switched: (langName) => `✅ Language switched to *${langName}*!`,

    prompt_add_wallet:
      `🔐 *Import Solana Wallet*\n\n` +
      `Please send your Solana *Private Key (Base58 string)* or *12/24 words Seed Phrase*.\n\n` +
      `⚠️ _Note: For security, your message will be deleted immediately after processing._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *Wallet Connected Successfully!* 🎉\n\n` +
      `💳 *Public Address:* \`${pubkey}\`\n` +
      `💰 *SOL Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `This wallet has been set as your active trading wallet.`,
    add_wallet_failed: (err) =>
      `❌ *Wallet Connection Failed!*\n\n` +
      `Error: \`${err || 'Invalid Private Key or Seed Phrase'}\`\n\n` +
      `Please ensure you send a valid Base58 private key or 12/24-word seed phrase.`,

    prompt_trade_input:
      `🎯 *Trade Solana Token*\n\n` +
      `Please send the *Contract Address (Mint Address)* of the token you want to trade.\n\n` +
      `Example: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *Buy $${symbol} with Custom SOL*\n\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n` +
      `💰 *Available Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Enter the amount of SOL to spend (e.g. 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *Sell $${symbol} with Custom %*\n\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n` +
      `📦 *Token Balance:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Enter percentage of holdings to sell (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *Set Custom Slippage*\n\n` +
      `Current Slippage: \`${current}%\`\n\n` +
      `_Enter desired slippage percentage (e.g. 2.5 or 10):_`,
    slippage_updated: (val) => `✅ Slippage updated to \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *Limit Buy (Dip) - Set Target Price*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter target price in USD or Dip percentage (e.g. 15% or -20%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *Limit Buy - Set Dip %*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter drop percentage to buy at (e.g. 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *Limit Sell - Set TP / SL %*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `• *Take Profit:* Positive number (e.g. \`35\` for +35%, \`200\` for 3x)\n` +
      `• *Stop Loss:* Negative number (e.g. \`-15\` for -15%)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *Limit Buy - Set SOL Amount*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `💰 *Available SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Enter amount of SOL to buy with once target price is reached:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? 'Take Profit' : 'Stop Loss'} - Set Target Price*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter target price in USD or percentage (e.g. +50% or -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? 'Take Profit' : 'Stop Loss'} - Set Sell Amount*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `📦 *Token Balance:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Enter percentage of holdings to sell (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *Limit Order Created Successfully!* 🎯\n\n` +
      `📌 *Type:* \`${type}\`\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${target}\`\n` +
      `💰 *Amount:* \`${amount}\`\n\n` +
      `The bot is monitoring prices 24/7 and will execute automatically.`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *Edit Target Price for Order #${orderId}*\n\n` +
      `Current Target: \`$${currentTarget}\`\n\n` +
      `_Enter new target price in USD or percentage:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *Edit Amount for Order #${orderId}*\n\n` +
      `Current Amount: \`${currentAmount}\`\n\n` +
      `_Enter new order amount:_`,

    order_updated: `✅ Order updated successfully!`,
    order_cancelled: `🚫 Order cancelled.`,
    order_deleted: `🗑️ Order deleted from history.`,

    copy_menu_title: (activeCount, listText) =>
      `👥 *UPBOT AI Copy Trading Hub*\n\n` +
      `⚡ *Active Target Wallets:* \`${activeCount}\`\n\n` +
      `${listText}\n\n` +
      `_Select a target wallet to manage or click Add Target:_`,
    copy_target_added: (wallet, solAmount, mirrorSell) =>
      `✅ *Copy Target Added Successfully!* 🎯\n\n` +
      `👤 *Target Wallet:* \`${wallet}\`\n` +
      `💰 *Buy Amount Per Trade:* \`${solAmount} SOL\`\n` +
      `🔄 *Mirror Sell:* \`${mirrorSell ? 'Enabled (Auto proportional sell)' : 'Disabled'}\`\n\n` +
      `The bot is now monitoring on-chain activity and copying trades in real time.`,
    prompt_copy_target_wallet: `👥 *Add Copy Trading Target*\n\nSend the *Solana Public Wallet Address* of the trader you wish to copy:`,
    prompt_copy_buy_sol: (wallet) =>
      `💰 *Set SOL Amount Per Copied Trade*\n\n` +
      `Target: \`${wallet}\`\n\n` +
      `_Enter SOL amount to spend on each copied buy (e.g. 0.1, 0.5, 1.0):_`,
    prompt_copy_mirror_sell: (wallet) =>
      `🔄 *Mirror Sell Configuration*\n\n` +
      `Target: \`${wallet}\`\n\n` +
      `When this trader sells, do you want to automatically sell your holdings proportionally?`,

    swap_swapping: (symbol, amount) => `⏳ *Executing swap for $${symbol}...*\n\nAmount: \`${amount}\`\n_Routing via Jupiter V6 Turbo..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *Trade Executed Successfully!* 🚀\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Price:* \`$${price}\`\n` +
      `💰 *Spent:* \`${spent}\`\n` +
      `📦 *Received:* ~\`${received}\`\n\n` +
      `🔗 [View on Solscan](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *Trade Execution Failed!*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `⚠️ *Error:* \`${err || 'Transaction rejected or timed out'}\``,

    no_active_wallet_err: `❌ No active wallet found. Please configure a wallet in the Wallets menu.`,
    insufficient_sol_err: (need, have) => `❌ Insufficient SOL balance! Required: \`${need} SOL\`, Available: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ Insufficient $${symbol} token balance in active wallet.`,
    invalid_input_err: `❌ Invalid input. Please enter a valid number.`,
  },
};

export function getT(lang: SupportedLanguage = 'en'): Translations {
  return translations[lang] || translations.en;
}
