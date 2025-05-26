const { ethers } = require('ethers');
const { provider, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, CHAIN_ID, UNISWAP_V3_SWAP_ROUTER_ADDRESS } = require('../config');
const { Pool, TICK_SPACINGS, FeeAmount } = require('@uniswap/v3-sdk');
const { Token: UniswapToken } = require('@uniswap/sdk-core');
const { getPositionDetails, INonfungiblePositionManagerABI } = require('../uniswapPositionUtils');
const { getPoolData } = require('../uniswapPoolUtils');
const { getTokenDetailsByAddressOnBackend } = require('../constants/predefinedTokens');

const backendOperatorWallet = process.env.BACKEND_OPERATOR_PRIVATE_KEY
    ? new ethers.Wallet(process.env.BACKEND_OPERATOR_PRIVATE_KEY, provider)
    : null;

if (!backendOperatorWallet) {
    console.warn("BACKEND_OPERATOR_PRIVATE_KEY is not set. Auto-management transactional features will be disabled.");
} else {
    console.log(`[AutoManage] Operator Wallet Address: ${backendOperatorWallet.address}`);
}

const activeMonitors = {};

async function checkAndRebalance(tokenId, userAddress, token0Addr, token1Addr, strategyParamsInput, pgPoolInstance) {
    console.log(`[AutoManage] Checking position ${tokenId} for user ${userAddress} with params:`, strategyParamsInput);
    if (!backendOperatorWallet) {
        console.warn(`[AutoManage] Operator wallet not configured. Cannot rebalance tokenId: ${tokenId}`);
        return;
    }

    const defaultStrategy = { rangePercentage: 5, checkIntervalMinutes: 5, rebalanceSlippage: 0.5 };
    const currentStrategyParams = { ...defaultStrategy, ...(strategyParamsInput || {}) };

    try {
        // Подключаем NonfungiblePositionManager с подписью от операционного кошелька
        const positionManagerContract = new ethers.Contract(
            UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            backendOperatorWallet // Используем кошелек оператора для отправки транзакций
        );
        
        const position = await positionManagerContract.positions(tokenId); // Чтение можно и через provider, но для единообразия

        if (position.liquidity === 0n) {
            console.log(`[AutoManage] Position ${tokenId} has no liquidity. Stopping monitor.`);
            await stopMonitoringPosition(tokenId, pgPoolInstance);
            return;
        }

        const token0Details = await getTokenDetailsByAddressOnBackend(token0Addr);
        const token1Details = await getTokenDetailsByAddressOnBackend(token1Addr);

        if (!token0Details || !token1Details) {
            console.error(`[AutoManage] Could not get token details for position ${tokenId}. Halting.`);
            await stopMonitoringPosition(tokenId, pgPoolInstance);
            return;
        }

        const currentSdkToken0 = new UniswapToken(CHAIN_ID, token0Addr, token0Details.decimals, token0Details.symbol);
        const currentSdkToken1 = new UniswapToken(CHAIN_ID, token1Addr, token1Details.decimals, token1Details.symbol);
        
        const poolInfo = await getPoolData(currentSdkToken0, currentSdkToken1, Number(position.fee));

        if (!poolInfo) {
            console.error(`[AutoManage] Could not get pool data for position ${tokenId}.`);
            return;
        }

        const currentTick = poolInfo.tickCurrent;
        const tickLower = Number(position.tickLower);
        const tickUpper = Number(position.tickUpper);

        console.log(`[AutoManage] Position ${tokenId}: Current Tick: ${currentTick}, Range: [${tickLower}, ${tickUpper}]`);

        if (currentTick < tickLower || currentTick > tickUpper) {
            console.log(`[AutoManage] Position ${tokenId} is OUT OF RANGE! Initiating rebalance...`);
            
            const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 минут дедлайн

            // --- Шаг 1: Изъятие 100% ликвидности ---
            console.log(`[AutoManage] Step 1: Decreasing 100% liquidity for ${tokenId}...`);
            const decreaseParams = {
                tokenId: tokenId,
                liquidity: position.liquidity, // Вся текущая ликвидность
                amount0Min: 0, // Для изъятия 100% можно ставить 0, но лучше рассчитать со slippage, если часть ликвидности
                amount1Min: 0,
                deadline: deadline
            };
            
            try {
                const decreaseTx = await positionManagerContract.decreaseLiquidity(decreaseParams);
                console.log(`[AutoManage] Decrease liquidity transaction sent: ${decreaseTx.hash}. Waiting for confirmation...`);
                const decreaseReceipt = await decreaseTx.wait();
                if (decreaseReceipt.status !== 1) {
                    throw new Error(`Decrease liquidity transaction failed (reverted). Hash: ${decreaseTx.hash}`);
                }
                console.log(`[AutoManage] Liquidity successfully decreased for ${tokenId}. Tx: ${decreaseTx.hash}`);
            } catch (error) {
                console.error(`[AutoManage] Error during decreaseLiquidity for ${tokenId}:`, error);
                await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error decreasing liquidity: ${error.message.substring(0, 200)}`, tokenId]);
                return; // Прерываем ребалансировку, если не удалось изъять ликвидность
            }

            // --- Шаг 2: Сбор комиссий (и токенов после изъятия) ---
            console.log(`[AutoManage] Step 2: Collecting fees and tokens for ${tokenId}...`);
            const MAX_UINT128 = (2n ** 128n) - 1n;
            const collectParams = {
                tokenId: tokenId,
                recipient: userAddress, // ВАЖНО: комиссии и токены отправляются на адрес пользователя
                amount0Max: MAX_UINT128,
                amount1Max: MAX_UINT128
            };

            try {
                const collectTx = await positionManagerContract.collect(collectParams);
                console.log(`[AutoManage] Collect transaction sent: ${collectTx.hash}. Waiting for confirmation...`);
                const collectReceipt = await collectTx.wait();
                 if (collectReceipt.status !== 1) {
                    throw new Error(`Collect transaction failed (reverted). Hash: ${collectTx.hash}`);
                }
                console.log(`[AutoManage] Fees and tokens collected successfully for ${tokenId} to user ${userAddress}. Tx: ${collectTx.hash}`);
            } catch (error) {
                console.error(`[AutoManage] Error during collect for ${tokenId}:`, error);
                // Даже если сбор не удался, позиция уже без ликвидности.
                // Пользователь сможет попробовать собрать позже вручную.
                // Продолжаем к следующим шагам, но логируем ошибку.
                await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error collecting fees (liquidity removed): ${error.message.substring(0, 200)}`, tokenId]);
            }
            
            // После успешного изъятия и сбора, ликвидность NFT должна быть 0.
            // Теперь можно приступать к обмену и созданию новой позиции.

            console.log(`[AutoManage] Step 3: Swapping tokens for rebalancing (simulated for now)...`);
            // TODO: Реализовать логику определения, какой токен был получен и в каком количестве.
            // TODO: Реализовать логику расчета сумм для обмена.
            // TODO: Реализовать сам обмен через SwapRouter (потребуются approve от пользователя на SwapRouter).

            const feeAmountEnumKey = Object.keys(FeeAmount).find(key => FeeAmount[key] === Number(position.fee));
            let tickSpacing;
            if (feeAmountEnumKey && TICK_SPACINGS[FeeAmount[feeAmountEnumKey]]) {
                 tickSpacing = TICK_SPACINGS[FeeAmount[feeAmountEnumKey]];
            } else {
                console.warn(`[AutoManage] Unknown fee tier ${Number(position.fee)} for position ${tokenId}. Using default tick spacing for MEDIUM.`);
                tickSpacing = TICK_SPACINGS[FeeAmount.MEDIUM]; 
            }
            
            const rangePercent = currentStrategyParams.rangePercentage; 
            const newRangeDelta = Math.floor((Math.abs(currentTick) * (rangePercent / 100)) / tickSpacing) * tickSpacing;
            // Убедимся, что новый диапазон не выходит за пределы допустимых тиков (хотя SDK должен это обрабатывать)
            const MIN_TICK = -887272;
            const MAX_TICK = 887272;
            let newTickLower = Math.max(MIN_TICK, currentTick - newRangeDelta);
            let newTickUpper = Math.min(MAX_TICK, currentTick + newRangeDelta);
            
            // Выравнивание по tickSpacing еще раз, на всякий случай, если currentTick - newRangeDelta не кратно.
            newTickLower = Math.floor(newTickLower / tickSpacing) * tickSpacing;
            newTickUpper = Math.ceil(newTickUpper / tickSpacing) * tickSpacing;
            
            // Гарантируем, что tickLower < tickUpper
            if (newTickLower >= newTickUpper) {
                newTickLower = newTickUpper - tickSpacing; // Минимально возможный валидный диапазон
                if (newTickLower < MIN_TICK) newTickLower = MIN_TICK; // Дополнительная проверка
                if (newTickUpper > MAX_TICK) newTickUpper = MAX_TICK; // Дополнительная проверка
                if (newTickLower >= newTickUpper && newTickUpper - tickSpacing >= MIN_TICK) { // Если все еще проблемы
                     newTickLower = newTickUpper - tickSpacing;
                } else if (newTickLower >= newTickUpper) { // крайний случай
                    console.error(`[AutoManage] Could not form a valid new tick range for ${tokenId}. Lower: ${newTickLower}, Upper: ${newTickUpper}, Spacing: ${tickSpacing}`);
                    // Возможно, остановить мониторинг для этой позиции
                    await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, is_enabled = FALSE, updated_at = NOW() WHERE token_id = $2', [`Error: Could not form valid new tick range. Auto-manage disabled.`, tokenId]);
                    await stopMonitoringPosition(tokenId, pgPoolInstance); // Останавливаем интервал
                    return;
                }
            }


            console.log(`[AutoManage] Step 4: New proposed range for ${tokenId}: [${newTickLower}, ${newTickUpper}] around current tick ${currentTick}.`);
            
            console.log(`[AutoManage] Step 5: Minting new liquidity for ${tokenId} in new range (simulated for now)...`);
            // TODO: Реализовать расчет amount0Desired, amount1Desired для нового диапазона
            // TODO: Реализовать вызов mint (потребуются approve от пользователя на NonfungiblePositionManager для новых токенов).

            await pgPoolInstance.query(
                'UPDATE auto_managed_positions SET strategy_parameters = jsonb_set(strategy_parameters::jsonb, \'{lastTickLower}\', $1::text::jsonb) || jsonb_set(strategy_parameters::jsonb, \'{lastTickUpper}\', $2::text::jsonb), status_message = $3, updated_at = NOW() WHERE token_id = $4',
                [newTickLower.toString(), newTickUpper.toString(), 'Rebalanced (liquidity removed, new range proposed - further steps simulated)', tokenId]
            );

        } else {
            console.log(`[AutoManage] Position ${tokenId} is IN RANGE.`);
        }
         await pgPoolInstance.query('UPDATE auto_managed_positions SET last_checked_at = NOW() WHERE token_id = $1', [tokenId]);

    } catch (error) {
        console.error(`[AutoManage] Error processing tokenId ${tokenId}:`, error);
         try {
            await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error: ${error.message.substring(0,250)}`, tokenId]);
        } catch (dbError) {
            console.error(`[AutoManage] DB Error updating status for tokenId ${tokenId}:`, dbError);
        }
    }
}

// В startMonitoringPosition параметр называется strategyParameters
function startMonitoringPosition(tokenId, strategyParameters, userAddress, token0Addr, token1Addr, pgPoolInstance) {
    if (!backendOperatorWallet) {
        console.warn(`[AutoManage] Operator wallet not configured. Cannot start monitoring for tokenId: ${tokenId}`);
        return;
    }
    if (activeMonitors[tokenId]) {
        console.log(`[AutoManage] Monitor already active for tokenId ${tokenId}`);
        return;
    }

    const defaultStrategy = { rangePercentage: 5, checkIntervalMinutes: 5, rebalanceSlippage: 0.5 };
    // Здесь используем имя параметра функции - strategyParameters
    const currentStrategyParams = { ...defaultStrategy, ...(strategyParameters || {}) };

    console.log(`[AutoManage] Starting monitor for tokenId ${tokenId} with params:`, currentStrategyParams);
    
    checkAndRebalance(tokenId, userAddress, token0Addr, token1Addr, currentStrategyParams, pgPoolInstance); 
    activeMonitors[tokenId] = setInterval(() => {
        checkAndRebalance(tokenId, userAddress, token0Addr, token1Addr, currentStrategyParams, pgPoolInstance);
    }, currentStrategyParams.checkIntervalMinutes * 60 * 1000);
}

async function stopMonitoringPosition(tokenId, pgPoolInstance) {
    if (activeMonitors[tokenId]) {
        clearInterval(activeMonitors[tokenId]);
        delete activeMonitors[tokenId];
        console.log(`[AutoManage] Stopped monitor for tokenId ${tokenId}`);
        try {
             await pgPoolInstance.query('UPDATE auto_managed_positions SET is_enabled = FALSE, status_message = $1, updated_at = NOW() WHERE token_id = $2', ['Monitoring stopped by system/user.', tokenId]);
        } catch (dbError) {
            console.error(`[AutoManage] DB Error updating status on stop for tokenId ${tokenId}:`, dbError);
        }
    }
}

async function initializeAutoManagement(pgPoolInstance) {
    if (!backendOperatorWallet) {
        console.warn("[AutoManage Init] Operator wallet not configured. Auto-management features will be limited or disabled.");
        return;
    }
    try {
        const result = await pgPoolInstance.query(
            'SELECT token_id, user_address, strategy_parameters, token0_address, token1_address FROM auto_managed_positions WHERE is_enabled = TRUE'
        );
        console.log(`[AutoManage Init] Found ${result.rows.length} positions to auto-manage.`);
        for (const row of result.rows) {
            const defaultStrategy = { rangePercentage: 5, checkIntervalMinutes: 5, rebalanceSlippage: 0.5 };
            // Здесь row.strategy_parameters - это то, что пришло из БД
            const currentStrategyParamsForRow = { ...defaultStrategy, ...(row.strategy_parameters || {}) };

            if (!row.token0_address || !row.token1_address) {
                console.warn(`[AutoManage Init] Missing token addresses for tokenId ${row.token_id}. Attempting to refetch.`);
                try {
                    const posDetails = await getPositionDetails(row.token_id, provider);
                    if (posDetails && posDetails.token0 !== ethers.ZeroAddress) {
                        await pgPoolInstance.query(
                            'UPDATE auto_managed_positions SET token0_address = $1, token1_address = $2 WHERE token_id = $3',
                            [posDetails.token0, posDetails.token1, row.token_id]
                        );
                        startMonitoringPosition(row.token_id, currentStrategyParamsForRow, row.user_address, posDetails.token0, posDetails.token1, pgPoolInstance);
                    } else {
                         console.error(`[AutoManage Init] Still could not get token addresses for tokenId ${row.token_id} after refetch.`);
                    }
                } catch (e) {
                     console.error(`[AutoManage Init] Error fetching position details for tokenId ${row.token_id} during init:`, e);
                }
            } else {
                startMonitoringPosition(row.token_id, currentStrategyParamsForRow, row.user_address, row.token0_address, row.token1_address, pgPoolInstance);
            }
        }
    } catch (error) {
        console.error("[AutoManage Init] Error initializing auto-management:", error);
    }
}

module.exports = {
    checkAndRebalance,  
    startMonitoringPosition,
    stopMonitoringPosition,
    initializeAutoManagement
};