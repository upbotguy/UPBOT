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

  swap_swapping: (symbol: string, amount: string) => string;
  swap_success: (symbol: string, price: number, spent: string, received: string, signature: string) => string;
  swap_failed: (symbol: string, err: string) => string;

  no_active_wallet_err: string;
  insufficient_sol_err: (need: number, have: number) => string;
  insufficient_token_err: (symbol: string) => string;
  invalid_input_err: string;
}

export const translations: Record<SupportedLanguage, Translations> = {
  // 🇺🇸 ENGLISH (Default)
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
      `➕ *Add Wallet:* Import Base58 Private Key or Seed Phrase\n` +
      `✨ *Generate New Wallet:* Create a brand new Solana Keypair\n` +
      `🔑 *Export Key:* Backup your private key\n` +
      `🗑️ *Remove Wallet:* Delete disconnected wallet`,
    security_empty: `❌ _No wallets found. Click "Add Wallet" or "Generate New Wallet" to add one._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *Token Portfolio / Holdings*\n\n` +
      `💳 *Wallet:* \`${wallet}\`\n` +
      `💰 *SOL Balance:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *Total Value:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *Select a token below to Trade or Sell instantly:*`,
    portfolio_empty: `_No SPL tokens found in this wallet._`,
    portfolio_trade_btn: (symbol) => `🎯 Trade $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Bot Settings*\n\n` +
      `⚡ *Current Slippage:* \`${slippage}%\`\n` +
      `⛽ *Priority Fee:* \`${priorityFee} SOL\` (Turbo)\n\n` +
      `_Select an option below to configure:_`,
    btn_slippage: (val) => `⚡ Slippage: ${val}%`,
    btn_priority_fee: (val) => `⛽ Priority Fee: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *Limit Orders Center*\n\n` +
      `⚡ *Active Orders:* \`${activeCount}\` | 📜 *History:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_Select an order below to inspect or cancel:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *Order #${id} Details*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `📌 *Type:* \`${type}\` (${cond})\n` +
      `📊 *Status:* \`${status}\`\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `💰 *Amount:* \`${amount}\`\n` +
      `🕒 *Created:* \`${createdAt}\``,

    lang_select_title: `🌐 *Select Language*\n\nCurrent Language: *English 🇺🇸*`,
    lang_switched: (langName) => `✅ Language switched to *${langName}*!`,

    prompt_add_wallet:
      `🔐 *Add Solana Wallet*\n\n` +
      `Please send your Solana *Base58 Private Key* or *12/24 words Seed Phrase*.\n\n` +
      `⚠️ _Note: For security, your message will be automatically deleted immediately._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *Wallet Connected Successfully!* 🎉\n\n` +
      `💳 *Public Address:* \`${pubkey}\`\n` +
      `💰 *SOL Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `This wallet has been set as your active wallet.`,
    add_wallet_failed: (err) =>
      `❌ *Failed to Connect Wallet!*\n\n` +
      `Error: \`${err || 'Invalid Private Key or Seed Phrase'}\`\n\n` +
      `Please verify that your key/phrase is valid and try again.`,

    prompt_trade_input:
      `🎯 *Solana Token Trading*\n\n` +
      `Please enter or paste the Solana Token *Contract Address (Mint Address)*:\n\n` +
      `Example: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *Buy $${symbol} with Custom SOL Amount*\n\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n` +
      `💰 *Available Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Enter the amount of SOL you want to spend (e.g. 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *Sell $${symbol} with Custom Percentage*\n\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n` +
      `📦 *Token Balance:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Enter percentage of tokens to sell (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *Custom Slippage Tolerance*\n\n` +
      `Current Slippage: \`${current}%\`\n\n` +
      `_Enter desired slippage in percent (e.g. 2.5 or 10):_`,
    slippage_updated: (val) => `✅ Slippage updated to \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *Limit Buy (Dip Buy) - Set Target Price*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter target price in USD (e.g. 0.00045) or Dip % (e.g. 15% or -20%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *Limit Buy - Set Custom Dip Percentage*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter the Dip percentage you want to buy at (e.g. 7, 12.5, 25, 40):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *Limit Sell - Set Custom TP / SL Percentage*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter percentage target:_ \n` +
      `• *Take Profit:* Positive number (e.g. \`35\` for +35%, \`200\` for 3x)\n` +
      `• *Stop Loss:* Negative number (e.g. \`-15\` for -15% loss limit)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *Limit Buy - Set SOL Amount*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `💰 *Available Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Enter the amount of SOL to spend when triggered:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? 'Take Profit (TP)' : 'Stop Loss (SL)'} - Set Target Price*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *Current Price:* \`$${currentPrice}\`\n\n` +
      `_Enter target price in USD or percentage (e.g. +50% or -20%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? 'Take Profit' : 'Stop Loss'} - Set Percentage*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *Target Price:* \`$${targetPrice}\`\n` +
      `📦 *Token Holdings:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Enter percentage of holdings to sell (1 - 100):_`,

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

  // 🇨🇳 CHINESE (简体中文)
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
    btn_buy_custom: '✏️ 买入指定 SOL',
    btn_sell_custom: '✏️ 卖出指定 %',
    btn_limit_buy: '🎯 抄底限价买入',
    btn_limit_sell: '🎯 限价止盈/止损',
    btn_custom_dip_pct: '✏️ 自定义抄底 %',
    btn_custom_tpsl_pct: '✏️ 自定义止盈/止损 %',
    btn_custom_price: '🎯 自定义目标价格 (USD)',
    btn_edit_price: '✏️ 修改触发价',
    btn_edit_amount: '✏️ 修改交易量',
    btn_cancel_order: '🚫 取消订单',
    btn_delete_order: '🗑️ 删除历史订单',
    btn_back_orders: '🔙 返回订单列表',
    btn_view_solscan: '🔍 在 Solscan 上查看',
    btn_trade_dashboard: '🎯 交易面板',
    btn_hide_key: '🔒 立即隐藏并删除',
    btn_confirm_export: '⚠️ 确认显示私钥',
    btn_try_again: '🔄 重试',

    wallet_active: '当前钱包',
    wallet_balance: 'SOL 余额',
    none_add_in_wallets: '无 (请在钱包菜单中添加)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *欢迎使用 UPBOT AI Solana 智能交易机器人!* ⚡\n\n` +
      `👤 *用户:* ${name}\n` +
      `💳 *当前钱包:* \`${walletText}\`\n` +
      `💰 *SOL 余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% 手续费即时闪兑:* Jupiter V6 Turbo 极速路由\n` +
      `⏱️ *智能限价单:* 自动抄底、止盈 (TP)、止损 (SL)\n` +
      `💼 *持仓追踪:* 实时监控持仓代币与一键清仓\n` +
      `🛡️ *企业级安全:* 本地 AES-256-GCM 高度加密与管理员白名单\n\n` +
      `👇 _请选择下方菜单或直接发送 Solana 代币合约地址 (CA):_`,

    security_title: (listText) =>
      `🔐 *安全与钱包管理*\n\n` +
      `所有私钥和助记词均在本地通过 AES-256-GCM 严格加密存储。\n\n` +
      `📋 *已连接的钱包:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *添加钱包:* 导入 Base58 私钥或 12/24 助记词\n` +
      `✨ *生成新钱包:* 快速创建全新的 Solana 密钥对\n` +
      `🔑 *导出私钥:* 备份私钥\n` +
      `🗑️ *移除钱包:* 删除已连接钱包`,
    security_empty: `❌ _未找到钱包。请点击“添加钱包”或“生成新钱包”。_`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *持仓资产总览 (Portfolio)*\n\n` +
      `💳 *钱包:* \`${wallet}\`\n` +
      `💰 *SOL 余额:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *资产总值:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *选择下方代币进行交易或快速卖出:*`,
    portfolio_empty: `_该钱包中暂无任何 SPL 代币。_`,
    portfolio_trade_btn: (symbol) => `🎯 交易 $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *机器人设置*\n\n` +
      `⚡ *当前滑点:* \`${slippage}%\`\n` +
      `⛽ *优先手续费:* \`${priorityFee} SOL\` (极速模式)\n\n` +
      `_点击下方选项进行配置:_`,
    btn_slippage: (val) => `⚡ 滑点: ${val}%`,
    btn_priority_fee: (val) => `⛽ 优先费: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *限价订单中心*\n\n` +
      `⚡ *活跃订单:* \`${activeCount}\` | 📜 *历史记录:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_选择订单以查看详情或取消:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *订单 #${id} 详情*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `📌 *类型:* \`${type}\` (${cond})\n` +
      `📊 *状态:* \`${status}\`\n` +
      `🎯 *目标触发价:* \`$${targetPrice}\`\n` +
      `💰 *数量:* \`${amount}\`\n` +
      `🕒 *创建时间:* \`${createdAt}\``,

    lang_select_title: `🌐 *选择语言*\n\n当前语言: *简体中文 🇨🇳*`,
    lang_switched: (langName) => `✅ 语言已切换为 *${langName}*!`,

    prompt_add_wallet:
      `🔐 *添加 Solana 钱包*\n\n` +
      `请输入您的 Solana *Base58 私钥* 或 *12/24 助记词*。\n\n` +
      `⚠️ _提示: 为了保障安全，机器人将在读取后立即自动删除您的消息。_`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *钱包导入成功!* 🎉\n\n` +
      `💳 *公钥地址:* \`${pubkey}\`\n` +
      `💰 *SOL 余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `已自动设置为当前激活钱包。`,
    add_wallet_failed: (err) =>
      `❌ *钱包导入失败!*\n\n` +
      `错误信息: \`${err || '无效的私钥或助记词'}\`\n\n` +
      `请检查后重试。`,

    prompt_trade_input:
      `🎯 *Solana 代币交易*\n\n` +
      `请输入或粘贴 Solana 代币 *合约地址 (Mint Address)*:\n\n` +
      `示例: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *自定义买入 $${symbol}*\n\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n` +
      `💰 *可用余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_请输入要花费的 SOL 金额 (例如 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *自定义卖出 $${symbol}*\n\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n` +
      `📦 *代币持仓:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_请输入卖出百分比 (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *自定义滑点容忍度*\n\n` +
      `当前滑点: \`${current}%\`\n\n` +
      `_请输入期望的滑点百分比 (例如 2.5 或 10):_`,
    slippage_updated: (val) => `✅ 滑点已更新为 \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *限价买入 (抄底) - 设置目标价*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `_请输入触发买入的美元价格或抄底比例 (例如 15%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *设置抄底跌幅比例 (Dip %)*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `_请输入期望在跌幅多少时买入 (例如 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *设置止盈/止损百分比*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `• *止盈 (TP):* 正数 (例如 \`35\` 代表 +35%, \`200\` 代表 3倍)\n` +
      `• *止损 (SL):* 负数 (例如 \`-15\` 代表 -15%)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *限价买入 - 设置 SOL 金额*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `🎯 *目标触发价:* \`$${targetPrice}\`\n` +
      `💰 *可用余额:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_请输入触发时花费的 SOL 数量:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? '限价止盈 (TP)' : '限价止损 (SL)'} - 设置目标价*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *当前价格:* \`$${currentPrice}\`\n\n` +
      `_请输入目标美元价格或比例 (例如 +50% 或 -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? '止盈' : '止损'} - 设置卖出比例*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `🎯 *目标价格:* \`$${targetPrice}\`\n` +
      `📦 *代币持仓:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_请输入卖出持仓比例 (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *限价单创建成功!* 🎯\n\n` +
      `📌 *类型:* \`${type}\`\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `🎯 *目标触发价:* \`$${target}\`\n` +
      `💰 *交易量:* \`${amount}\`\n\n` +
      `机器人将 24/7 全天候监控并在达到条件时自动执行。`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *修改订单 #${orderId} 目标价*\n\n` +
      `当前目标价: \`$${currentTarget}\`\n\n` +
      `_请输入新的目标美元价格或百分比:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *修改订单 #${orderId} 数量*\n\n` +
      `当前数量: \`${currentAmount}\`\n\n` +
      `_请输入新的数量:_`,

    order_updated: `✅ 订单已成功更新!`,
    order_cancelled: `🚫 订单已成功取消。`,
    order_deleted: `🗑️ 订单已从历史记录中删除。`,

    swap_swapping: (symbol, amount) => `⏳ *正在执行 $${symbol} 闪兑...*\n\n数量: \`${amount}\`\n_正在通过 Jupiter V6 极速路由..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *交易执行成功!* 🚀\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `💵 *价格:* \`$${price}\`\n` +
      `💰 *支出:* \`${spent}\`\n` +
      `📦 *获得:* ~\`${received}\`\n\n` +
      `🔗 [在 Solscan 上查看](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *交易执行失败!*\n\n` +
      `🪙 *代币:* *$${symbol}*\n` +
      `⚠️ *原因:* \`${err || '交易超时或被链上拒绝'}\``,

    no_active_wallet_err: `❌ 未找到激活钱包。请先在钱包菜单中配置。`,
    insufficient_sol_err: (need, have) => `❌ SOL 余额不足! 所需: \`${need} SOL\`, 当前可用: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ 激活钱包中没有 $${symbol} 代币可供卖出。`,
    invalid_input_err: `❌ 输入无效，请输入有效数字。`,
  },

  // 🇷🇺 RUSSIAN (Русский)
  ru: {
    btn_back_main: '🔙 Главное меню',
    btn_cancel: '❌ Отмена',
    btn_refresh: '🔄 Обновить',
    btn_trade: '🎯 Торговать токеном',
    btn_wallets: '💳 Кошельки',
    btn_portfolio: '💼 Портфель',
    btn_orders: '📋 Активные ордера',
    btn_settings: '⚙️ Настройки',
    btn_security: '🛡️ Безопасность',
    btn_language: '🌐 Язык',
    btn_add_wallet: '➕ Добавить кошелек',
    btn_remove_wallet: '🗑️ Удалить кошелек',
    btn_generate_wallet: '✨ Создать новый кошелек',
    btn_export_key: '🔑 Экспорт приватного ключа',
    btn_back_security: '🔙 Назад к безопасности',
    btn_custom_slippage: '✏️ Свое проскальзывание',
    btn_buy_custom: '✏️ Купить на X SOL',
    btn_sell_custom: '✏️ Продать X %',
    btn_limit_buy: '🎯 Лимитная покупка (Dip)',
    btn_limit_sell: '🎯 Лимитная продажа (TP/SL)',
    btn_custom_dip_pct: '✏️ Свой % просадки',
    btn_custom_tpsl_pct: '✏️ Свой % TP/SL',
    btn_custom_price: '🎯 Своя цена (USD)',
    btn_edit_price: '✏️ Изменить цену',
    btn_edit_amount: '✏️ Изменить объем',
    btn_cancel_order: '🚫 Отменить ордер',
    btn_delete_order: '🗑️ Удалить из истории',
    btn_back_orders: '🔙 Назад к ордерам',
    btn_view_solscan: '🔍 Посмотреть на Solscan',
    btn_trade_dashboard: '🎯 Торговая панель',
    btn_hide_key: '🔒 Скрыть и удалить сейчас',
    btn_confirm_export: '⚠️ Да, показать ключ',
    btn_try_again: '🔄 Попробовать снова',

    wallet_active: 'Активный кошелек',
    wallet_balance: 'Баланс SOL',
    none_add_in_wallets: 'Отсутствует (добавьте в меню Кошельки)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *Добро пожаловать в UPBOT AI Solana Trading Bot!* ⚡\n\n` +
      `👤 *Пользователь:* ${name}\n` +
      `💳 *Активный кошелек:* \`${walletText}\`\n` +
      `💰 *Баланс SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Комиссия Свопа:* Быстрая маршрутизация Jupiter V6 Turbo\n` +
      `⏱️ *Лимитные ордера:* Покупка на просадке, Тейк-Профит (TP), Стоп-Лосс (SL)\n` +
      `💼 *Трекер портфеля:* Отслеживание SPL-токенов и мгновенная продажа\n` +
      `🛡️ *Безопасность:* Локальное шифрование AES-256-GCM и белый список\n\n` +
      `👇 _Выберите пункт меню или отправьте адрес контракта Solana (CA):_`,

    security_title: (listText) =>
      `🔐 *Безопасность и управление кошельками*\n\n` +
      `Все приватные ключи и сид-фразы надежно зашифрованы алгоритмом AES-256-GCM на вашем устройстве.\n\n` +
      `📋 *Подключенные кошельки:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Добавить кошелек:* Импорт Base58 ключа или 12/24 слов сид-фразы\n` +
      `✨ *Создать кошелек:* Генерация новой пары ключей Solana\n` +
      `🔑 *Экспорт ключа:* Резервная копия ключа\n` +
      `🗑️ *Удалить кошелек:* Отключение ненужного кошелька`,
    security_empty: `❌ _Кошельки не найдены. Нажмите «Добавить кошелек» или «Создать новый кошелек»._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *Портфель токенов / Активы*\n\n` +
      `💳 *Кошелек:* \`${wallet}\`\n` +
      `💰 *Баланс SOL:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *Общая стоимость:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *Выберите токен для торговли или быстрой продажи:*`,
    portfolio_empty: `_В этом кошельке нет SPL-токенов._`,
    portfolio_trade_btn: (symbol) => `🎯 Торговать $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Настройки бота*\n\n` +
      `⚡ *Текущее проскальзывание:* \`${slippage}%\`\n` +
      `⛽ *Приоритетная комиссия:* \`${priorityFee} SOL\` (Турбо)\n\n` +
      `_Выберите параметр для настройки:_`,
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
      `🎯 *Целевая цена:* \`$${targetPrice}\`\n` +
      `💰 *Объем:* \`${amount}\`\n` +
      `🕒 *Создан:* \`${createdAt}\``,

    lang_select_title: `🌐 *Выберите язык*\n\nТекущий язык: *Русский 🇷🇺*`,
    lang_switched: (langName) => `✅ Язык изменен на *${langName}*!`,

    prompt_add_wallet:
      `🔐 *Добавление кошелька Solana*\n\n` +
      `Отправьте ваш приватный ключ *Base58* или сид-фразу из *12/24 слов*.\n\n` +
      `⚠️ _Примечание: В целях безопасности сообщение будет немедленно удалено ботом._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *Кошелек успешно подключен!* 🎉\n\n` +
      `💳 *Публичный адрес:* \`${pubkey}\`\n` +
      `💰 *Баланс SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `Этот кошелек установлен как активный.`,
    add_wallet_failed: (err) =>
      `❌ *Не удалось подключить кошелек!*\n\n` +
      `Ошибка: \`${err || 'Неверный приватный ключ или сид-фраза'}\`\n\n` +
      `Пожалуйста, проверьте данные и попробуйте снова.`,

    prompt_trade_input:
      `🎯 *Торговля токенами Solana*\n\n` +
      `Отправьте или вставьте *адрес контракта (Mint Address)* токена:\n\n` +
      `Пример: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *Покупка $${symbol} на указанную сумму SOL*\n\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n` +
      `💰 *Доступный баланс:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Введите сумму в SOL для покупки (например 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *Продажа $${symbol} на указанный процент*\n\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n` +
      `📦 *Баланс токенов:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_Введите процент токенов для продажи (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *Настройка проскальзывания*\n\n` +
      `Текущее значение: \`${current}%\`\n\n` +
      `_Введите процент допустимого проскальзывания (например 2.5 или 10):_`,
    slippage_updated: (val) => `✅ Проскальзывание обновлено до \`${val}%\`!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *Лимитная покупка (Dip) - Целевая цена*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `_Введите целевую цену в USD или % просадки (например 15%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *Установка % просадки для покупки (Dip %)*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `_Введите процент просадки (например 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *Установка % для TP или SL*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `• *Тейк-профит (TP):* Положительное число (напр. \`35\` для +35%, \`200\` для 3x)\n` +
      `• *Стоп-лосс (SL):* Отрицательное число (напр. \`-15\` для -15%)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *Лимитная покупка - Сумма SOL*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `🎯 *Целевая цена:* \`$${targetPrice}\`\n` +
      `💰 *Доступный баланс:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_Введите сумму SOL для покупки при срабатывании:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? 'Тейк-Профит (TP)' : 'Стоп-Лосс (SL)'} - Целевая цена*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Текущая цена:* \`$${currentPrice}\`\n\n` +
      `_Введите целевую цену в USD или % (напр. +50% или -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? 'Тейк-Профит' : 'Стоп-Лосс'} - Процент продажи*\n\n` +
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
      `Бот будет непрерывно отслеживать рынок и исполнит сделку автоматически.`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *Изменить цену ордера #${orderId}*\n\n` +
      `Текущая целевая цена: \`$${currentTarget}\`\n\n` +
      `_Введите новую цену в USD или %:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *Изменить объем ордера #${orderId}*\n\n` +
      `Текущий объем: \`${currentAmount}\`\n\n` +
      `_Введите новый объем:_`,

    order_updated: `✅ Ордер успешно обновлен!`,
    order_cancelled: `🚫 Ордер успешно отменен.`,
    order_deleted: `🗑️ Ордер удален из истории.`,

    swap_swapping: (symbol, amount) => `⏳ *Исполнение сделки $${symbol}...*\n\nОбъем: \`${amount}\`\n_Маршрутизация через Jupiter V6 Turbo..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *Сделка успешно выполнена!* 🚀\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `💵 *Цена:* \`$${price}\`\n` +
      `💰 *Потрачено:* \`${spent}\`\n` +
      `📦 *Получено:* ~\`${received}\`\n\n` +
      `🔗 [Посмотреть на Solscan](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *Ошибка исполнения сделки!*\n\n` +
      `🪙 *Токен:* *$${symbol}*\n` +
      `⚠️ *Причина:* \`${err || 'Транзакция отклонена или истек таймаут'}\``,

    no_active_wallet_err: `❌ Активный кошелек не найден. Добавьте кошелек в меню.`,
    insufficient_sol_err: (need, have) => `❌ Недостаточно SOL! Требуется: \`${need} SOL\`, Доступно: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ В активном кошельке нет токенов $${symbol} для продажи.`,
    invalid_input_err: `❌ Неверный ввод. Пожалуйста, введите корректное число.`,
  },

  // 🇰🇷 KOREAN (한국어)
  ko: {
    btn_back_main: '🔙 메인 메뉴',
    btn_cancel: '❌ 취소',
    btn_refresh: '🔄 새로고침',
    btn_trade: '🎯 토큰 거래',
    btn_wallets: '💳 지갑 관리',
    btn_portfolio: '💼 보유 자산',
    btn_orders: '📋 지정가 주문',
    btn_settings: '⚙️ 환경 설정',
    btn_security: '🛡️ 보안 센터',
    btn_language: '🌐 언어 설정',
    btn_add_wallet: '➕ 지갑 추가',
    btn_remove_wallet: '🗑️ 지갑 삭제',
    btn_generate_wallet: '✨ 새 지갑 생성',
    btn_export_key: '🔑 개인키 백업/내보내기',
    btn_back_security: '🔙 보안 메뉴로 돌아가기',
    btn_custom_slippage: '✏️ 슬리피지 직접 입력',
    btn_buy_custom: '✏️ 지정 SOL 매수',
    btn_sell_custom: '✏️ 지정 % 매도',
    btn_limit_buy: '🎯 지정가 매수 (저점 매수)',
    btn_limit_sell: '🎯 지정가 매도 (익절/손절)',
    btn_custom_dip_pct: '✏️ 저점 매수 % 직접 입력',
    btn_custom_tpsl_pct: '✏️ 익절/손절 % 직접 입력',
    btn_custom_price: '🎯 목표 가격(USD) 직접 입력',
    btn_edit_price: '✏️ 목표가 수정',
    btn_edit_amount: '✏️ 수량 수정',
    btn_cancel_order: '🚫 주문 취소',
    btn_delete_order: '🗑️ 내역에서 삭제',
    btn_back_orders: '🔙 주문 목록으로 돌아가기',
    btn_view_solscan: '🔍 Solscan에서 확인',
    btn_trade_dashboard: '🎯 거래 대시보드',
    btn_hide_key: '🔒 즉시 숨기기 및 삭제',
    btn_confirm_export: '⚠️ 개인키 확인',
    btn_try_again: '🔄 다시 시도',

    wallet_active: '활성 지갑',
    wallet_balance: 'SOL 잔액',
    none_add_in_wallets: '없음 (지갑 메뉴에서 추가)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *UPBOT AI Solana 자동 거래 봇에 오신 것을 환영합니다!* ⚡\n\n` +
      `👤 *사용자:* ${name}\n` +
      `💳 *활성 지갑:* \`${walletText}\`\n` +
      `💰 *SOL 잔액:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% 수수료 즉시 스왑:* Jupiter V6 Turbo 초고속 라우팅\n` +
      `⏱️ *스마트 지정가 주문:* 저점 매수, 익절 (TP), 손절 (SL) 자동 실행\n` +
      `💼 *포트폴리오 추적:* 보유 SPL 토큰 실시간 확인 및 원클릭 매도\n` +
      `🛡️ *군사급 보안:* 로컬 AES-256-GCM 암호화 및 관리자 화이트리스트\n\n` +
      `👇 _아래 메뉴를 선택하거나 Solana 토큰 계약 주소(CA)를 입력하세요:_`,

    security_title: (listText) =>
      `🔐 *보안 및 지갑 관리*\n\n` +
      `모든 개인키와 시드 구문은 로컬 디바이스에서 AES-256-GCM으로 안전하게 암호화됩니다.\n\n` +
      `📋 *연결된 지갑 목록:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *지갑 추가:* Base58 개인키 또는 12/24단어 시드 구문 가져오기\n` +
      `✨ *새 지갑 생성:* 새로운 Solana 키페어 즉시 생성\n` +
      `🔑 *개인키 내보내기:* 백업용 개인키 확인\n` +
      `🗑️ *지갑 삭제:* 연결 해제 및 삭제`,
    security_empty: `❌ _등록된 지갑이 없습니다. "지갑 추가" 또는 "새 지갑 생성"을 선택하세요._`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *보유 토큰 포트폴리오 (Portfolio)*\n\n` +
      `💳 *지갑:* \`${wallet}\`\n` +
      `💰 *SOL 잔액:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *총 자산 가치:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *거래하거나 즉시 매도할 토큰을 선택하세요:*`,
    portfolio_empty: `_해당 지갑에 보유 중인 SPL 토큰이 없습니다._`,
    portfolio_trade_btn: (symbol) => `🎯 $${symbol} 거래`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *봇 환경 설정*\n\n` +
      `⚡ *현재 슬리피지:* \`${slippage}%\`\n` +
      `⛽ *우선순위 수수료:* \`${priorityFee} SOL\` (터보 모드)\n\n` +
      `_설정할 옵션을 아래에서 선택하세요:_`,
    btn_slippage: (val) => `⚡ 슬리피지: ${val}%`,
    btn_priority_fee: (val) => `⛽ 우선 수수료: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *지정가 주문 센터*\n\n` +
      `⚡ *활성 주문:* \`${activeCount}\` | 📜 *주문 내역:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_상세 정보를 확인하거나 취소할 주문을 선택하세요:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *주문 #${id} 상세 정보*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `📌 *유형:* \`${type}\` (${cond})\n` +
      `📊 *상태:* \`${status}\`\n` +
      `🎯 *목표 가격:* \`$${targetPrice}\`\n` +
      `💰 *수량:* \`${amount}\`\n` +
      `🕒 *생성 일시:* \`${createdAt}\``,

    lang_select_title: `🌐 *언어 선택*\n\n현재 언어: *한국어 🇰🇷*`,
    lang_switched: (langName) => `✅ 언어가 *${langName}*(으)로 변경되었습니다!`,

    prompt_add_wallet:
      `🔐 *Solana 지갑 추가*\n\n` +
      `Solana *Base58 개인키* 또는 *12/24단어 시드 구문*을 입력하세요.\n\n` +
      `⚠️ _참고: 보안을 위해 입력하신 메시지는 봇이 확인 후 즉시 자동 삭제됩니다._`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *지갑 연결 성공!* 🎉\n\n` +
      `💳 *공개 주소:* \`${pubkey}\`\n` +
      `💰 *SOL 잔액:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `해당 지갑이 기본 활성 지갑으로 설정되었습니다.`,
    add_wallet_failed: (err) =>
      `❌ *지갑 연결 실패!*\n\n` +
      `오류: \`${err || '유효하지 않은 개인키 또는 시드 구문입니다.'}\`\n\n` +
      `정보를 다시 확인한 후 시도해 주세요.`,

    prompt_trade_input:
      `🎯 *Solana 토큰 거래*\n\n` +
      `거래할 Solana 토큰의 *계약 주소 (Mint CA)*를 입력하세요:\n\n` +
      `예시: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *$${symbol} 수량 직접 입력 매수*\n\n` +
      `💵 *현재가:* \`$${currentPrice}\`\n` +
      `💰 *사용 가능 잔액:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_매수에 사용할 SOL 수량을 입력하세요 (예: 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *$${symbol} 비율 직접 입력 매도*\n\n` +
      `💵 *현재가:* \`$${currentPrice}\`\n` +
      `📦 *보유 토큰:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_매도할 비율(%)을 입력하세요 (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *사용자 정의 슬리피지 설정*\n\n` +
      `현재 슬리피지: \`${current}%\`\n\n` +
      `_원하는 슬리피지 비율을 입력하세요 (예: 2.5 또는 10):_`,
    slippage_updated: (val) => `✅ 슬리피지가 \`${val}%\`로 업데이트되었습니다!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *지정가 매수 (저점 매수) - 목표가 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재가:* \`$${currentPrice}\`\n\n` +
      `_목표 가격(USD) 또는 하락률(%)을 입력하세요 (예: 15%):_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *저점 매수 하락률(Dip %) 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재가:* \`$${currentPrice}\`\n\n` +
      `_매수를 원하는 하락률(%)을 입력하세요 (예: 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *익절/손절(TP/SL) 목표 비율 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재가:* \`$${currentPrice}\`\n\n` +
      `• *익절 (TP):* 양수 입력 (예: +35%의 경우 \`35\`, 3배의 경우 \`200\`)\n` +
      `• *손절 (SL):* 음수 입력 (예: -15%의 경우 \`-15\`)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *지정가 매수 - SOL 수량 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `🎯 *목표가:* \`$${targetPrice}\`\n` +
      `💰 *사용 가능 잔액:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_조건 달성 시 매수에 사용할 SOL 수량을 입력하세요:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? '익절 (Take Profit)' : '손절 (Stop Loss)'} - 목표가 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *현재가:* \`$${currentPrice}\`\n\n` +
      `_목표 가격(USD) 또는 비율(%)을 입력하세요 (예: +50% 또는 -15%):_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? '익절' : '손절'} - 매도 비율 설정*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `🎯 *목표가:* \`$${targetPrice}\`\n` +
      `📦 *보유 토큰:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_매도할 보유 비율(%)을 입력하세요 (1 - 100):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *지정가 주문이 등록되었습니다!* 🎯\n\n` +
      `📌 *유형:* \`${type}\`\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `🎯 *목표가:* \`$${target}\`\n` +
      `💰 *수량:* \`${amount}\`\n\n` +
      `봇이 24시간 시장을 감시하여 목표 도달 시 자동 실행합니다.`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *주문 #${orderId} 목표가 수정*\n\n` +
      `현재 목표가: \`$${currentTarget}\`\n\n` +
      `_새로운 목표 가격(USD) 또는 %를 입력하세요:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *주문 #${orderId} 수량 수정*\n\n` +
      `현재 수량: \`${currentAmount}\`\n\n` +
      `_새로운 수량을 입력하세요:_`,

    order_updated: `✅ 주문이 성공적으로 수정되었습니다!`,
    order_cancelled: `🚫 주문이 취소되었습니다.`,
    order_deleted: `🗑️ 내역에서 삭제되었습니다.`,

    swap_swapping: (symbol, amount) => `⏳ *$${symbol} 스왑 실행 중...*\n\n수량: \`${amount}\`\n_Jupiter V6 Turbo 라우팅 중..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *스왑 거래 성공!* 🚀\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `💵 *체결가:* \`$${price}\`\n` +
      `💰 *지출:* \`${spent}\`\n` +
      `📦 *획득:* ~\`${received}\`\n\n` +
      `🔗 [Solscan에서 확인하기](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *스왑 거래 실패!*\n\n` +
      `🪙 *토큰:* *$${symbol}*\n` +
      `⚠️ *원인:* \`${err || '트랜잭션 거부 또는 시간 초과'}\``,

    no_active_wallet_err: `❌ 활성 지갑이 없습니다. 지갑 메뉴에서 먼저 등록하세요.`,
    insufficient_sol_err: (need, have) => `❌ SOL 잔액 부족! 필요: \`${need} SOL\`, 보유: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ 활성 지갑에 매도할 $${symbol} 토큰이 없습니다.`,
    invalid_input_err: `❌ 올바른 숫자를 입력해 주세요.`,
  },

  // 🇪🇸 SPANISH (Español)
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
    btn_custom_dip_pct: '✏️ % de Caída Personalizado',
    btn_custom_tpsl_pct: '✏️ % TP/SL Personalizado',
    btn_custom_price: '🎯 Precio Objetivo (USD)',
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

  // 🇲🇲 BURMESE (မြန်မာစာ)
  my: {
    btn_back_main: '🔙 ပင်မစာမျက်နှာ',
    btn_cancel: '❌ မလုပ်တော့ပါ',
    btn_refresh: '🔄 Refresh ပြန်လုပ်မည်',
    btn_trade: '🎯 Token အရောင်းအဝယ်',
    btn_wallets: '💳 Wallets စီမံမည်',
    btn_portfolio: '💼 ပိုင်ဆိုင်မှုများ (Portfolio)',
    btn_orders: '📋 Limit Orders များ',
    btn_settings: '⚙️ ချိန်ညှိချက်များ (Settings)',
    btn_security: '🛡️ လုံခြုံရေး (Security)',
    btn_language: '🌐 ဘာသာစကား',
    btn_add_wallet: '➕ Wallet အသစ်ချိတ်မည်',
    btn_remove_wallet: '🗑️ Wallet ဖျက်မည်',
    btn_generate_wallet: '✨ Wallet အသစ်ထုတ်မည်',
    btn_export_key: '🔑 Private Key ထုတ်ယူမည်',
    btn_back_security: '🔙 လုံခြုံရေး မီနူးသို့',
    btn_custom_slippage: '✏️ Slippage စိတ်ကြိုက်ပြင်မည်',
    btn_buy_custom: '✏️ စိတ်ကြိုက် SOL ဖြင့်ဝယ်မည်',
    btn_sell_custom: '✏️ စိတ်ကြိုက် % ဖြင့်ရောင်းမည်',
    btn_limit_buy: '🎯 Dip Buy (အောက်စျေးဝယ်)',
    btn_limit_sell: '🎯 TP / SL (အမြတ်/အရှုံးထိန်းရောင်း)',
    btn_custom_dip_pct: '✏️ စိတ်ကြိုက် Dip % သတ်မှတ်မည်',
    btn_custom_tpsl_pct: '✏️ စိတ်ကြိုက် TP/SL % သတ်မှတ်မည်',
    btn_custom_price: '🎯 စိတ်ကြိုက် ပစ်မှတ်စျေး (USD)',
    btn_edit_price: '✏️ စျေးနှုန်းပြင်မည်',
    btn_edit_amount: '✏️ ပမာဏပြင်မည်',
    btn_cancel_order: '🚫 အော်ဒါဖျက်သိမ်းမည်',
    btn_delete_order: '🗑️ မှတ်တမ်းမှ ဖျက်မည်',
    btn_back_orders: '🔙 အော်ဒါစာရင်းသို့',
    btn_view_solscan: '🔍 Solscan တွင် ကြည့်မည်',
    btn_trade_dashboard: '🎯 အရောင်းအဝယ် စာမျက်နှာ',
    btn_hide_key: '🔒 ချက်ချင်းဖျက်သိမ်း ဖျောက်မည်',
    btn_confirm_export: '⚠️ ဟုတ်ကဲ့၊ Private Key ပြပေးပါ',
    btn_try_again: '🔄 ပြန်လည်ကြိုးစားမည်',

    wallet_active: 'အသုံးပြုနေသော Wallet',
    wallet_balance: 'SOL လက်ကျန်ငွေ',
    none_add_in_wallets: 'မရှိသေးပါ (Wallets တွင် ထည့်ပါ)',

    main_welcome: (name, walletText, balance) =>
      `⚡ *UPBOT AI Solana Trading Bot မှ ကြိုဆိုပါသည်!* ⚡\n\n` +
      `👤 *အသုံးပြုသူ:* ${name}\n` +
      `💳 *Active Wallet:* \`${walletText}\`\n` +
      `💰 *လက်ကျန်ငွေ:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 *0% Fee Direct Swap:* Jupiter V6 Turbo ဖြင့် အမြန်ဆုံး ဝယ်/ရောင်း\n` +
      `⏱️ *Limit Orders:* Dip Buy, Take Profit (TP), Stop Loss (SL) အလိုအလျောက် ရောင်း/ဝယ်\n` +
      `💼 *Portfolio Tracker:* ပိုင်ဆိုင်သော Token စာရင်းနှင့် ချက်ချင်းရောင်းချမှု\n` +
      `🛡️ *စစ်တပ်အဆင့် လုံခြုံရေး:* Local AES-256-GCM နှင့် Admin Lock\n\n` +
      `👇 _အောက်ပါ Menu မှ ရွေးချယ်ပါ သို့မဟုတ် Solana Token CA ပို့ပေးပါ:_`,

    security_title: (listText) =>
      `🔐 *လုံခြုံရေးနှင့် Wallet စီမံခန့်ခွဲမှု*\n\n` +
      `User ၏ Private Key များကို AES-256-GCM ဖြင့် အလုံခြုံဆုံး Encrypt လုပ်ပြီး Local တွင် သိမ်းဆည်းထားပါသည်။\n\n` +
      `📋 *ချိတ်ဆက်ထားသော Wallets များ:*\n` +
      `${listText}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `➕ *Add Wallet:* Private Key သို့မဟုတ် Seed Phrase ထည့်သွင်းခြင်း\n` +
      `✨ *Generate New Wallet:* Solana Wallet အသစ်တစ်ခု အလိုအလျောက် ပြုလုပ်ခြင်း\n` +
      `🔑 *Export Key:* Private key ကို Backup ထုတ်ယူခြင်း\n` +
      `🗑️ *Remove Wallet:* မလိုတော့သော Wallet ဖျက်ထုတ်ခြင်း`,
    security_empty: `❌ _လက်ရှိ Wallet မရှိသေးပါ။ "Add Wallet" သို့မဟုတ် "Generate New Wallet" ဖြင့် ထည့်သွင်းပါ။_`,

    portfolio_title: (wallet, solBal, solVal, totalVal) =>
      `💼 *သင်၏ Token ပိုင်ဆိုင်မှုများ (Portfolio)*\n\n` +
      `💳 *Wallet:* \`${wallet}\`\n` +
      `💰 *SOL လက်ကျန်ငွေ:* \`${solBal.toFixed(4)} SOL\` (~$${solVal.toFixed(2)})\n` +
      `📊 *စုစုပေါင်း တန်ဖိုး:* \`$${totalVal.toFixed(2)} USD\`\n\n` +
      `👇 *အရောင်းအဝယ် ပြုလုပ်လိုသော Token ကို ရွေးချယ်ပါ:*`,
    portfolio_empty: `_ဤ Wallet ထဲတွင် မည်သည့် Token မျှ မရှိသေးပါ။_`,
    portfolio_trade_btn: (symbol) => `🎯 Trade $${symbol}`,

    settings_title: (slippage, priorityFee) =>
      `⚙️ *Bot ချိန်ညှိချက်များ (Settings)*\n\n` +
      `⚡ *လက်ရှိ Slippage:* \`${slippage}%\`\n` +
      `⛽ *Priority Fee:* \`${priorityFee} SOL\` (Turbo)\n\n` +
      `_အောက်ပါ ခလုတ်များမှတစ်ဆင့် ပြင်ဆင်နိုင်ပါသည်:_`,
    btn_slippage: (val) => `⚡ Slippage: ${val}%`,
    btn_priority_fee: (val) => `⛽ Priority Fee: ${val} SOL`,

    orders_list_title: (activeCount, historyCount, listText) =>
      `📋 *Limit Orders စီမံခန့်ခွဲရေး စင်တာ*\n\n` +
      `⚡ *လက်ရှိစောင့်ဆိုင်းနေသော အော်ဒါများ:* \`${activeCount}\` | 📜 *ပြီးစီးမှုမှတ်တမ်း:* \`${historyCount}\`\n\n` +
      `${listText}\n\n` +
      `_အသေးစိတ်ကြည့်ရှုလိုသော သို့မဟုတ် ဖျက်သိမ်းလိုသော အော်ဒါကို ရွေးချယ်ပါ:_`,

    order_detail_title: (id, type, symbol, status, targetPrice, amount, cond, createdAt) =>
      `📋 *Order #${id} အသေးစိတ်*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `📌 *အမျိုးအစား:* \`${type}\` (${cond})\n` +
      `📊 *အခြေအနေ:* \`${status}\`\n` +
      `🎯 *ပစ်မှတ်စျေး:* \`$${targetPrice}\`\n` +
      `💰 *ပမာဏ:* \`${amount}\`\n` +
      `🕒 *ဖန်တီးချိန်:* \`${createdAt}\``,

    lang_select_title: `🌐 *ဘာသာစကား ရွေးချယ်ပါ*\n\nလက်ရှိ ဘာသာစကား: *မြန်မာ 🇲🇲*`,
    lang_switched: (langName) => `✅ ဘာသာစကားကို *${langName}* သို့ ပြောင်းလဲပြီးပါပြီ!`,

    prompt_add_wallet:
      `🔐 *Solana Wallet ချိတ်ဆက်ခြင်း (Add Wallet)*\n\n` +
      `သင်၏ Solana *Private Key (Base58 string)* သို့မဟုတ် *12/24 words Seed Phrase* ကို ပို့ပေးပါခင်ဗျာ။\n\n` +
      `⚠️ _မှတ်ချက်: လုံခြုံရေးအရ သင်ပို့လိုက်သော message ကို Bot မှ ချက်ချင်း အလိုအလျောက် ဖျက်ပေးပါမည်။_`,
    add_wallet_success: (pubkey, balance) =>
      `✅ *Wallet ချိတ်ဆက်မှု အောင်မြင်ပါသည်!* 🎉\n\n` +
      `💳 *Public Address:* \`${pubkey}\`\n` +
      `💰 *SOL Balance:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `အဆိုပါ Wallet ကို Active Wallet အဖြစ် သတ်မှတ်ပြီးပါပြီ။`,
    add_wallet_failed: (err) =>
      `❌ *Wallet ချိတ်ဆက်မှု မအောင်မြင်ပါ!*\n\n` +
      `Error: \`${err || 'Invalid Private Key or Seed Phrase'}\`\n\n` +
      `မှန်ကန်သော Base58 Private key သို့မဟုတ် 12/24 words seed phrase ဖြစ်ကြောင်း ပြန်လည်စစ်ဆေးပေးပါ။`,

    prompt_trade_input:
      `🎯 *Solana Token Trading*\n\n` +
      `သင် အရောင်းအဝယ် ပြုလုပ်လိုသော Solana Token ၏ *Contract Address (Mint Address)* ကို ပို့ပေးပါခင်ဗျာ။\n\n` +
      `ဥပမာ: \`DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263\` (Bonk)`,

    prompt_custom_buy: (symbol, currentPrice, balance) =>
      `🛒 *$${symbol} ကို စိတ်ကြိုက် SOL ပမာဏဖြင့် ဝယ်ယူခြင်း*\n\n` +
      `💵 *လက်ရှိပေါက်စျေး:* \`$${currentPrice}\`\n` +
      `💰 *ဝယ်ယူနိုင်သော လက်ကျန်ငွေ:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_ဝယ်ယူလိုသော SOL ပမာဏကို ထည့်သွင်းပေးပါ (ဥပမာ 0.25):_`,

    prompt_custom_sell: (symbol, currentPrice, tokenBal) =>
      `💰 *$${symbol} ကို စိတ်ကြိုက် ရာခိုင်နှုန်း (%) ဖြင့် ရောင်းချခြင်း*\n\n` +
      `💵 *လက်ရှိပေါက်စျေး:* \`$${currentPrice}\`\n` +
      `📦 *Token လက်ကျန်:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_ရောင်းချလိုသော ရာခိုင်နှုန်းကို ထည့်သွင်းပေးပါ (1 - 100):_`,

    prompt_custom_slippage: (current) =>
      `⚙️ *Custom Slippage သတ်မှတ်ခြင်း*\n\n` +
      `လက်ရှိ Slippage: \`${current}%\`\n\n` +
      `_သတ်မှတ်လိုသော Slippage ရာခိုင်နှုန်းကို ရိုက်ထည့်ပေးပါ (ဥပမာ 2.5 သို့မဟုတ် 10):_`,
    slippage_updated: (val) => `✅ Slippage ကို \`${val}%\` သို့ ပြောင်းလဲသတ်မှတ်ပြီးပါပြီ!`,

    prompt_limit_buy_price: (symbol, currentPrice) =>
      `🎯 *Limit Buy (အောက်စျေးကျမှဝယ်ရန်) - ပစ်မှတ်စျေး သတ်မှတ်ခြင်း*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *လက်ရှိစျေး:* \`$${currentPrice}\`\n\n` +
      `_ပစ်မှတ်စျေး (USD) သို့မဟုတ် Dip % (ဥပမာ 15% သို့မဟုတ် -20%) ကို ရိုက်ထည့်ပါ:_`,

    prompt_custom_dip_pct: (symbol, currentPrice) =>
      `📉 *Limit Buy - စိတ်ကြိုက် Dip % သတ်မှတ်ခြင်း*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *လက်ရှိစျေး:* \`$${currentPrice}\`\n\n` +
      `_စျေးကျဆင်းချိန်တွင် ဝယ်ယူလိုသော Dip ရာခိုင်နှုန်းကို ရိုက်ထည့်ပါ (ဥပမာ 7, 12.5, 30):_`,

    prompt_custom_tpsl_pct: (symbol, currentPrice) =>
      `🎯 *Limit Sell - စိတ်ကြိုက် TP / SL % သတ်မှတ်ခြင်း*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *လက်ရှိစျေး:* \`$${currentPrice}\`\n\n` +
      `• *အမြတ်ယူရန် (Take Profit):* အပေါင်းဂဏန်း (ဥပမာ +35% အတွက် \`35\`၊ 3 ဆ အတွက် \`200\`)\n` +
      `• *အရှုံးထိန်းရန် (Stop Loss):* အနှုတ်ဂဏန်း (ဥပမာ -15% အတွက် \`-15\`)`,

    prompt_limit_buy_amount: (symbol, targetPrice, balance) =>
      `🎯 *Limit Buy - ဝယ်မည့် SOL ပမာဏ သတ်မှတ်ခြင်း*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *ပစ်မှတ်စျေး:* \`$${targetPrice}\`\n` +
      `💰 *လက်ကျန် SOL:* \`${balance.toFixed(4)} SOL\`\n\n` +
      `_အဆိုပါစျေးရောက်ပါက ဝယ်ယူမည့် SOL ပမာဏကို ရိုက်ထည့်ပါ:_`,

    prompt_limit_sell_price: (symbol, currentPrice, isTP) =>
      `🎯 *${isTP ? 'အမြတ်ထုတ်ရောင်းချခြင်း (Take Profit)' : 'အရှုံးသက်သာစေရန် ရောင်းချခြင်း (Stop Loss)'} - ပစ်မှတ်စျေး သတ်မှတ်ခြင်း*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *လက်ရှိစျေး:* \`$${currentPrice}\`\n\n` +
      `_ပစ်မှတ်စျေး (USD) သို့မဟုတ် % (ဥပမာ +50% သို့မဟုတ် -15%) ကို ရိုက်ထည့်ပါ:_`,

    prompt_limit_sell_amount: (symbol, targetPrice, tokenBal, isTP) =>
      `🎯 *${isTP ? 'Take Profit' : 'Stop Loss'} - ရောင်းမည့် ရာခိုင်နှုန်း သတ်မှတ်ခြင်း*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *ပစ်မှတ်စျေး:* \`$${targetPrice}\`\n` +
      `📦 *ပိုင်ဆိုင်သော Token:* \`${tokenBal.toLocaleString()}\`\n\n` +
      `_ရောင်းချလိုသော ရာခိုင်နှုန်း (%) ကို ရိုက်ထည့်ပါ (1 မှ 100 အထိ):_`,

    limit_order_created: (type, symbol, target, amount) =>
      `✅ *Limit Order အသစ် တင်ပြီးပါပြီ!* 🎯\n\n` +
      `📌 *အမျိုးအစား:* \`${type}\`\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `🎯 *ပစ်မှတ်စျေး:* \`$${target}\`\n` +
      `💰 *ပမာဏ:* \`${amount}\`\n\n` +
      `Bot မှ စျေးကွက်ကို ၂၄ နာရီ စောင့်ကြည့်ပြီး သတ်မှတ်စျေးရောက်သည်နှင့် အလိုအလျောက် အရောင်းအဝယ် ပြုလုပ်ပေးပါမည်။`,

    prompt_edit_price: (orderId, currentTarget) =>
      `✏️ *Order #${orderId} ၏ ပစ်မှတ်စျေးနှုန်း ပြင်ဆင်ခြင်း*\n\n` +
      `လက်ရှိသတ်မှတ်ထားသောစျေး: \`$${currentTarget}\`\n\n` +
      `_ပြောင်းလဲလိုသော ပစ်မှတ်စျေးနှုန်း (USD) သို့မဟုတ် % ကို ရိုက်ထည့်ပါ:_`,

    prompt_edit_amount: (orderId, currentAmount) =>
      `✏️ *Order #${orderId} ၏ အရောင်းအဝယ်ပမာဏ ပြင်ဆင်ခြင်း*\n\n` +
      `လက်ရှိပမာဏ: \`${currentAmount}\`\n\n` +
      `_ပြောင်းလဲလိုသော ပမာဏအသစ်ကို ရိုက်ထည့်ပါ:_`,

    order_updated: `✅ အော်ဒါပြင်ဆင်မှု အောင်မြင်ပါသည်!`,
    order_cancelled: `🚫 အော်ဒါကို ဖျက်သိမ်းပြီးပါပြီ။`,
    order_deleted: `🗑️ အော်ဒါမှတ်တမ်းမှ ဖျက်ထုတ်ပြီးပါပြီ။`,

    swap_swapping: (symbol, amount) => `⏳ *$${symbol} ကို အရောင်းအဝယ် စတင်ပြုလုပ်နေပါသည်...*\n\nပမာဏ: \`${amount}\`\n_Jupiter V6 Turbo Routing ဖြင့် ချိတ်ဆက်နေပါသည်..._`,
    swap_success: (symbol, price, spent, received, sig) =>
      `🎉 *အရောင်းအဝယ် အောင်မြင်ပါသည်!* 🚀\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `💵 *ပေါက်စျေး:* \`$${price}\`\n` +
      `💰 *သုံးစွဲမှု:* \`${spent}\`\n` +
      `📦 *ရရှိမှု:* ~\`${received}\`\n\n` +
      `🔗 [Solscan တွင် အသေးစိတ်ကြည့်ရှုရန်](https://solscan.io/tx/${sig})`,
    swap_failed: (symbol, err) =>
      `❌ *အရောင်းအဝယ် မအောင်မြင်ပါ!*\n\n` +
      `🪙 *Token:* *$${symbol}*\n` +
      `⚠️ *Error:* \`${err || 'Transaction rejected or timed out'}\``,

    no_active_wallet_err: `❌ Active Wallet ရှာမတွေ့ပါ။ ကျေးဇူးပြု၍ Wallets Menu တွင် အရင်ဆုံး ထည့်သွင်းပေးပါ။`,
    insufficient_sol_err: (need, have) => `❌ SOL လက်ကျန်ငွေ မလုံလောက်ပါ! လိုအပ်ချက်: \`${need} SOL\`, လက်ကျန်: \`${have.toFixed(4)} SOL\``,
    insufficient_token_err: (symbol) => `❌ Active Wallet ထဲတွင် ရောင်းချရန် $${symbol} Token လက်ကျန် မရှိပါ။`,
    invalid_input_err: `❌ မှန်ကန်သော ဂဏန်းပမာဏကိုသာ ရိုက်ထည့်ပေးပါ။`,
  },
};

export function getT(lang: SupportedLanguage = 'en'): Translations {
  return translations[lang] || translations.en;
}
