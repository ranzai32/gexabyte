const { ethers } = require('ethers');
const { provider, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, CHAIN_ID, UNISWAP_V3_SWAP_ROUTER_ADDRESS, UNISWAP_V3_QUOTER_V2_ADDRESS } = require('../config');
const { Pool, Position, TICK_SPACINGS, FeeAmount, TickMath} = require('@uniswap/v3-sdk');
const { Token: UniswapToken, CurrencyAmount, Percent } = require('@uniswap/sdk-core');
const { getPositionDetails, INonfungiblePositionManagerABI } = require('../uniswapPositionUtils');
const { getPoolData } = require('../uniswapPoolUtils');
const { getTokenDetailsByAddressOnBackend } = require('../constants/predefinedTokens');
const IQuoterV2_ABI = require('../abi/IQuoterV2_ABI.json');
const ISwapRouter_ABI = require('../abi/ISwapRouter_ABI.json');
const { approveToken } = require('../erc20Utils');

const backendOperatorWallet = process.env.BACKEND_OPERATOR_PRIVATE_KEY
    ? new ethers.Wallet(process.env.BACKEND_OPERATOR_PRIVATE_KEY, provider)
    : null;

if (!backendOperatorWallet) {
    console.warn("BACKEND_OPERATOR_PRIVATE_KEY is not set. Auto-management transactional features will be disabled.");
} else {
    console.log(`[AutoManage] Operator Wallet Address: ${backendOperatorWallet.address}`);
}

const activeMonitors = {};

function getAmountsForLiquidity(
    poolSqrtRatioX96,  
    poolTickCurrent,
    tickLower,
    tickUpper,
    amountToken0,  
    amountToken1,  
    poolToken0,
    poolToken1,
    numericFee
) {
    const feeAmountEnum = Object.values(FeeAmount).find(f => f === numericFee);
    if (feeAmountEnum === undefined) {
        console.error(`[getAmountsForLiquidity] Invalid numeric fee provided: ${numericFee}. Cannot determine FeeAmount.`);
        return { amount0: 0n, amount1: 0n };
    }
    const sqrtRatioX96String = typeof poolSqrtRatioX96 === 'bigint' ? poolSqrtRatioX96.toString() : poolSqrtRatioX96;
    const liquidityString = '0'; 
    const tempPool = new Pool(
        poolToken0, 
        poolToken1, 
        feeAmountEnum,
        sqrtRatioX96String,  
        liquidityString,     
        poolTickCurrent
    );
    if (tickLower >= tickUpper) {
        console.error(`[getAmountsForLiquidity] Error: tickLower (${tickLower}) must be less than tickUpper (${tickUpper}).`);
        return { amount0: 0n, amount1: 0n };
    }
    if (tickLower < TickMath.MIN_TICK || tickUpper > TickMath.MAX_TICK) {
         console.error(`[getAmountsForLiquidity] Error: Ticks out of bounds. Lower: ${tickLower}, Upper: ${tickUpper}`);
        return { amount0: 0n, amount1: 0n };
    }
    if (tickLower % tempPool.tickSpacing !== 0 || tickUpper % tempPool.tickSpacing !== 0) {
        console.error(`[getAmountsForLiquidity] Error: Ticks not aligned to spacing. Lower: ${tickLower}, Upper: ${tickUpper}, Spacing: ${tempPool.tickSpacing}`);
        return { amount0: 0n, amount1: 0n };
    }
    let positionSdk;
    if (amountToken0 > 0n) {
        positionSdk = Position.fromAmount0({
            pool: tempPool,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0: amountToken0.toString(),
            useFullPrecision: true,
        });
        return { amount0: BigInt(positionSdk.amount0.quotient.toString()), amount1: BigInt(positionSdk.amount1.quotient.toString()) };
    } else if (amountToken1 > 0n) {
        positionSdk = Position.fromAmount1({
            pool: tempPool,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount1: amountToken1.toString(),
            useFullPrecision: true,
        });
        return { amount0: BigInt(positionSdk.amount0.quotient.toString()), amount1: BigInt(positionSdk.amount1.quotient.toString()) };
    }
    return { amount0: 0n, amount1: 0n };
}

function determineRebalanceStrategy(currentTick, tickLowerCurrentPos, tickUpperCurrentPos, amount0Collected, amount1Collected, poolToken0Address, poolToken1Address, sdkToken0Canonical, sdkToken1Canonical) {
    let tokenToSell, tokenToBuy, amountToRebalance;
    const isPoolToken0CanonicalToken0 = poolToken0Address.toLowerCase() === sdkToken0Canonical.address.toLowerCase();

    if (currentTick < tickLowerCurrentPos) {
        console.log(`[AutoManage] Price below old range. Current tick: ${currentTick}, Lower bound: ${tickLowerCurrentPos}. Concentrated in pool's token0.`);
        if (isPoolToken0CanonicalToken0) { 
            tokenToSell = sdkToken0Canonical; tokenToBuy = sdkToken1Canonical; amountToRebalance = amount0Collected; 
        } else { 
            tokenToSell = sdkToken1Canonical; tokenToBuy = sdkToken0Canonical; amountToRebalance = amount0Collected; 
        }
    } else if (currentTick > tickUpperCurrentPos) {
        console.log(`[AutoManage] Price above old range. Current tick: ${currentTick}, Upper bound: ${tickUpperCurrentPos}. Concentrated in pool's token1.`);
        if (poolToken1Address.toLowerCase() === sdkToken1Canonical.address.toLowerCase()) { 
            tokenToSell = sdkToken1Canonical; tokenToBuy = sdkToken0Canonical; amountToRebalance = amount1Collected;
        } else { 
            tokenToSell = sdkToken0Canonical; tokenToBuy = sdkToken1Canonical; amountToRebalance = amount1Collected;
        }
    } else {
        console.log(`[AutoManage] Price within old range or using collected amounts. Determining primary by larger collected amount.`);
        if (amount0Collected >= amount1Collected) {
            tokenToSell = sdkToken0Canonical; tokenToBuy = sdkToken1Canonical; amountToRebalance = amount0Collected;
        } else {
            tokenToSell = sdkToken1Canonical; tokenToBuy = sdkToken0Canonical; amountToRebalance = amount1Collected;
        }
    }
    return { tokenToSell, tokenToBuy, amountToRebalance };
}


async function checkAndRebalance(tokenId, userAddress, token0AddrCanonical, token1AddrCanonical, strategyParamsInput, pgPoolInstance) {
    const oldTokenId = tokenId; 
    let positionManager; 
    try {
        if (!backendOperatorWallet) {
            console.warn(`[AutoManage] Operator wallet not configured. Cannot rebalance tokenId: ${oldTokenId}`);
            return;
        }

        const defaultStrategy = { rangePercentage: 5, checkIntervalMinutes: 5, rebalanceSlippageBips: 50, swapPercentageForRebalance: 50 }; 
        const currentStrategyParams = { ...defaultStrategy, ...(strategyParamsInput || {}) };
        
        positionManager = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, backendOperatorWallet);
        const initialPositionState = await positionManager.positions(oldTokenId); // Сохраняем начальное состояние

        let nftStillExists = true;
        if (initialPositionState.liquidity === 0n) {
            nftStillExists = await positionManager.ownerOf(oldTokenId).then(() => true).catch(() => false);
            if (!nftStillExists) {
                console.log(`[AutoManage] Position ${oldTokenId} has no liquidity and does not exist. Stopping monitor.`);
                await stopMonitoringPosition(oldTokenId, pgPoolInstance);
                return;
            }
        }

        const token0Details = await getTokenDetailsByAddressOnBackend(token0AddrCanonical);
        const token1Details = await getTokenDetailsByAddressOnBackend(token1AddrCanonical);

        if (!token0Details || !token1Details) {
            console.error(`[AutoManage] Could not get token details for position ${oldTokenId}. Halting.`);
            await stopMonitoringPosition(oldTokenId, pgPoolInstance);
            return;
        }

        const sdkToken0Canonical = new UniswapToken(CHAIN_ID, token0AddrCanonical, token0Details.decimals, token0Details.symbol, token0Details.name);
        const sdkToken1Canonical = new UniswapToken(CHAIN_ID, token1AddrCanonical, token1Details.decimals, token1Details.symbol, token1Details.name);
        
        const poolInfoForStrategy = await getPoolData(sdkToken0Canonical, sdkToken1Canonical, Number(initialPositionState.fee)); // Используем fee из initialPositionState
        if (!poolInfoForStrategy) {
            console.error(`[AutoManage] Could not get pool data for position ${oldTokenId}.`);
            return;
        }

        const currentTick = poolInfoForStrategy.tickCurrent;
        const tickLowerCurrentPos = Number(initialPositionState.tickLower);
        const tickUpperCurrentPos = Number(initialPositionState.tickUpper);

        console.log(`[AutoManage] Position ${oldTokenId}: Current Tick: ${currentTick}, Old Range: [${tickLowerCurrentPos}, ${tickUpperCurrentPos}], Liquidity: ${initialPositionState.liquidity.toString()}`);

        let amount0DesiredForMint = 0n;
        let amount1DesiredForMint = 0n;

        if (currentTick < tickLowerCurrentPos || currentTick > tickUpperCurrentPos || initialPositionState.liquidity === 0n) {
            console.log(`[AutoManage] Position ${oldTokenId} is OUT OF RANGE or has ZERO liquidity! Initiating rebalance/creation...`);
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; 

            if (initialPositionState.liquidity > 0n) {
                console.log(`[AutoManage] Step 1: Decreasing 100% liquidity for ${oldTokenId}...`);
                const decreaseParams = { tokenId: oldTokenId, liquidity: initialPositionState.liquidity, amount0Min: 0, amount1Min: 0, deadline };
                try {
                    const decreaseTxGas = await positionManager.decreaseLiquidity.estimateGas(decreaseParams);
                    const decreaseTx = await positionManager.decreaseLiquidity(decreaseParams, {gasLimit: decreaseTxGas + BigInt(20000) });
                    console.log(`[AutoManage] Decrease liquidity transaction sent: ${decreaseTx.hash}. Waiting for confirmation...`);
                    const decreaseReceipt = await decreaseTx.wait(1);
                    if (decreaseReceipt.status !== 1) throw new Error(`Decrease liquidity failed. Hash: ${decreaseTx.hash}`);
                    console.log(`[AutoManage] Liquidity successfully decreased for ${oldTokenId}. Tx: ${decreaseTx.hash}`);
                } catch (error) {
                    console.error(`[AutoManage] Error during decreaseLiquidity for ${oldTokenId}:`, error);
                    await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error decreasing liquidity: ${error.message.substring(0, 200)}`, oldTokenId]);
                    return; 
                }
            }

            console.log(`[AutoManage] Step 2: Collecting fees and tokens for ${oldTokenId} to operator wallet ${backendOperatorWallet.address}...`);
            const MAX_UINT128 = (2n ** 128n) - 1n;
            const collectParams = { tokenId: oldTokenId, recipient: backendOperatorWallet.address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
            let amount0Collected = 0n; 
            let amount1Collected = 0n; 
            
            try {
                // Проверяем, существует ли NFT перед вызовом collect, если он не был сожжен ранее
                const canCollect = await positionManager.ownerOf(oldTokenId).then(() => true).catch(() => false);
                if (canCollect) {
                    const collectTxGas = await positionManager.collect.estimateGas(collectParams);
                    const collectTx = await positionManager.collect(collectParams, {gasLimit: collectTxGas + BigInt(50000) });
                    console.log(`[AutoManage] Collect transaction sent: ${collectTx.hash}. Waiting for confirmation...`);
                    const collectReceipt = await collectTx.wait(1);
                    if (collectReceipt.status !== 1) throw new Error(`Collect failed. Hash: ${collectTx.hash}`);
                    console.log(`[AutoManage] Fees and tokens collected. Tx: ${collectTx.hash}`);

                    const eventInterface = new ethers.Interface(INonfungiblePositionManagerABI);
                    for (const log of collectReceipt.logs) { 
                        try {
                            if (log.address.toLowerCase() === UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS.toLowerCase()) {
                                const parsedLog = eventInterface.parseLog({ topics: [...log.topics], data: log.data });
                                if (parsedLog && parsedLog.name === "Collect" && parsedLog.args.tokenId.toString() === oldTokenId.toString()) {
                                    // Используем initialPositionState.token0/token1 для сопоставления, так как position может измениться
                                    if (initialPositionState.token0.toLowerCase() === sdkToken0Canonical.address.toLowerCase()) { 
                                        amount0Collected += parsedLog.args.amount0; 
                                        amount1Collected += parsedLog.args.amount1;
                                    } else { 
                                        amount1Collected += parsedLog.args.amount0;
                                        amount0Collected += parsedLog.args.amount1;
                                    }
                                }
                            }
                        } catch(e) { /* ignore parsing errors */ }
                    }

                    // Обновляем собранные комиссии в базе данных
                    try {
                        const currentFeesResult = await pgPoolInstance.query(
                            'SELECT cumulative_fees_token0_wei, cumulative_fees_token1_wei FROM auto_managed_positions WHERE token_id = $1 FOR UPDATE',
                            [oldTokenId]
                        );

                        if (currentFeesResult.rows.length > 0) {
                            const currentCumulative0 = BigInt(currentFeesResult.rows[0].cumulative_fees_token0_wei || '0');
                            const currentCumulative1 = BigInt(currentFeesResult.rows[0].cumulative_fees_token1_wei || '0');

                            const newCumulative0 = currentCumulative0 + amount0Collected;
                            const newCumulative1 = currentCumulative1 + amount1Collected;

                            await pgPoolInstance.query(
                                'UPDATE auto_managed_positions SET cumulative_fees_token0_wei = $1, cumulative_fees_token1_wei = $2, status_message = $3, updated_at = NOW() WHERE token_id = $4',
                                [newCumulative0.toString(), newCumulative1.toString(), 'Auto-collected fees updated.', oldTokenId]
                            );
                            console.log(`[AutoManage] Updated cumulative fees for tokenId ${oldTokenId}`);
                        }
                    } catch (dbError) {
                        console.error(`[AutoManage] Error updating collected fees in DB for ${oldTokenId}:`, dbError);
                    }
                } else {
                    console.log(`[AutoManage] NFT ${oldTokenId} does not exist before collect. Skipping collect.`);
                }
            } catch (error) { 
                console.error(`[AutoManage] Error during collect for ${oldTokenId}:`, error);
                console.warn(`[AutoManage] Continuing after collect error, assuming collected amounts are 0 or what was parsed.`);
            }
            console.log(`[AutoManage] Collected amounts (canonical): ${sdkToken0Canonical.symbol}: ${ethers.formatUnits(amount0Collected.toString(), sdkToken0Canonical.decimals)}, ${sdkToken1Canonical.symbol}: ${ethers.formatUnits(amount1Collected.toString(), sdkToken1Canonical.decimals)}`);
            
            // --- НОВЫЙ ШАГ: СЖИГАНИЕ СТАРОЙ NFT ---
            console.log(`[AutoManage] Step 2.5: Checking and attempting to burn old NFT ${oldTokenId}...`);
            try {
                const postDecreaseCollectPositionState = await positionManager.positions(oldTokenId);
                const nftExistsForBurn = await positionManager.ownerOf(oldTokenId).then(() => true).catch(() => false);

                if (nftExistsForBurn && postDecreaseCollectPositionState.liquidity === 0n) {
                    console.log(`[AutoManage] Attempting to burn old NFT ${oldTokenId} as its liquidity is zero.`);
                    const burnTxGas = await positionManager.burn.estimateGas(oldTokenId);
                    const burnTx = await positionManager.burn(oldTokenId, { gasLimit: burnTxGas + BigInt(30000) }); // Увеличил немного газ-лимит
                    console.log(`[AutoManage] Burn transaction for old NFT ${oldTokenId} sent: ${burnTx.hash}. Waiting...`);
                    await burnTx.wait(1);
                    console.log(`[AutoManage] Old NFT ${oldTokenId} burned successfully.`);
                } else if (nftExistsForBurn) {
                    console.warn(`[AutoManage] Old NFT ${oldTokenId} still has liquidity (${postDecreaseCollectPositionState.liquidity.toString()}) or could not be verified as zero. Skipping burn.`);
                } else {
                    console.log(`[AutoManage] Old NFT ${oldTokenId} does not exist. No burn needed.`);
                }
            } catch (burnError) {
                console.warn(`[AutoManage] Failed to burn old NFT ${oldTokenId} (or check its state): ${burnError.message}. Continuing with rebalance.`);
            }
            // --- КОНЕЦ ШАГА СЖИГАНИЯ ---

            const rebalanceDecision = determineRebalanceStrategy(
                currentTick, 
                tickLowerCurrentPos, 
                tickUpperCurrentPos, 
                amount0Collected, 
                amount1Collected, 
                poolInfoForStrategy.token0.address, 
                poolInfoForStrategy.token1.address, 
                sdkToken0Canonical, 
                sdkToken1Canonical
            );

            const { tokenToSell, tokenToBuy, amountToRebalance } = rebalanceDecision;

            console.log(`[AutoManage] Rebalance strategy: Will sell ${tokenToSell.symbol} to buy ${tokenToBuy.symbol}`);
            console.log(`[AutoManage] Amount available for rebalance (amountToRebalance): ${ethers.formatUnits(amountToRebalance.toString(), tokenToSell.decimals)} ${tokenToSell.symbol}`);

            const feeForPoolNumeric = Number(initialPositionState.fee);
            const tickSpacing = TICK_SPACINGS[feeForPoolNumeric] || TICK_SPACINGS[FeeAmount.MEDIUM];
            const rangePercentage = currentStrategyParams.rangePercentage;
            let newTickLower, newTickUpper;
            
            const pUpperFactor = 1 + (rangePercentage / 100);
            const pLowerFactor = 1 - (rangePercentage / 100);
            if (pLowerFactor <= 0) {
                console.warn(`[AutoManage] Price lower factor is ${pLowerFactor}. Defaulting to small tick range.`);
                const defaultTickDelta = tickSpacing * 10; 
                newTickLower = currentTick - defaultTickDelta;
                newTickUpper = currentTick + defaultTickDelta;
            } else {
                const totalTickWidthForPriceRange = Math.log(pUpperFactor / pLowerFactor) / Math.log(1.0001);
                let tickDeltaFromCenter = Math.floor((totalTickWidthForPriceRange / 2) / tickSpacing) * tickSpacing;
                if (tickDeltaFromCenter === 0 && totalTickWidthForPriceRange > 0) tickDeltaFromCenter = tickSpacing; 
                newTickLower = currentTick - tickDeltaFromCenter;
                newTickUpper = currentTick + tickDeltaFromCenter;
            }
            newTickLower = Math.floor(newTickLower / tickSpacing) * tickSpacing;
            newTickUpper = Math.ceil(newTickUpper / tickSpacing) * tickSpacing; 
            newTickLower = Math.max(TickMath.MIN_TICK, newTickLower);
            newTickUpper = Math.min(TickMath.MAX_TICK, newTickUpper);
            if (newTickLower >= newTickUpper) { 
                newTickUpper = newTickLower + tickSpacing;
                if (newTickUpper > TickMath.MAX_TICK) {
                    newTickUpper = TickMath.MAX_TICK;
                    newTickLower = newTickUpper - tickSpacing;
                }
                 if (newTickLower < TickMath.MIN_TICK) newTickLower = TickMath.MIN_TICK;
                 if (newTickLower >= newTickUpper) {
                    console.error(`[AutoManage] CRITICAL: Could not form valid new tick range for ${oldTokenId}.`);
                    await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, is_enabled = FALSE, updated_at = NOW() WHERE token_id = $2', [`Error: Could not form valid new tick range.`, oldTokenId]);
                    return;
                }
            }
            console.log(`[AutoManage] Proposed new range: [${newTickLower}, ${newTickUpper}] for current tick ${currentTick}.`);
            
            let amountToActuallySwap = 0n;
            if (amountToRebalance > 0n) {
                const swapPercentage = currentStrategyParams.swapPercentageForRebalance; 
                const swapRatio = BigInt(Math.floor(swapPercentage * 100)); 
                const denominator = BigInt(100 * 100); 
                amountToActuallySwap = (amountToRebalance * swapRatio) / denominator;
                console.log(`[AutoManage] Forced swap: Attempting to swap ${swapPercentage}% of ${tokenToSell.symbol}. Amount to swap: ${ethers.formatUnits(amountToActuallySwap.toString(), tokenToSell.decimals)}`);
            } else {
                console.log(`[AutoManage] amountToRebalance is zero, no swap will be performed.`);
            }
            
            amount0DesiredForMint = amount0Collected;
            amount1DesiredForMint = amount1Collected;

            if (amountToActuallySwap > 0n && UNISWAP_V3_SWAP_ROUTER_ADDRESS && UNISWAP_V3_QUOTER_V2_ADDRESS) {
                console.log(`[AutoManage] Step 3: Approving ${UNISWAP_V3_SWAP_ROUTER_ADDRESS} to spend ${tokenToSell.symbol}...`);
                const approveSuccess = await approveToken(tokenToSell, amountToActuallySwap, UNISWAP_V3_SWAP_ROUTER_ADDRESS, backendOperatorWallet);
                if (!approveSuccess) { 
                    console.error(`[AutoManage] Failed to approve ${tokenToSell.symbol} for swap.`);
                    await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error approving ${tokenToSell.symbol} for swap.`, oldTokenId]);
                    return; 
                }
                console.log(`[AutoManage] Approval successful.`);

                const quoterContract = new ethers.Contract(UNISWAP_V3_QUOTER_V2_ADDRESS, IQuoterV2_ABI, provider);
                const quoteParams = { tokenIn: tokenToSell.address, tokenOut: tokenToBuy.address, amountIn: amountToActuallySwap, fee: feeForPoolNumeric, sqrtPriceLimitX96: 0 };
                let quotedAmountOut;
                try {
                    const quoteResult = await quoterContract.quoteExactInputSingle.staticCall(quoteParams);
                    quotedAmountOut = quoteResult[0]; 
                } catch (quoteError) { 
                    console.error(`[AutoManage] Error during quoteExactInputSingle for ${oldTokenId}:`, quoteError);
                    await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error during quoting: ${quoteError.message.substring(0,200)}`, oldTokenId]);
                    return; 
                }
                
                console.log(`[AutoManage DEBUG] Raw quotedAmountOut from Quoter (BigInt): ${quotedAmountOut.toString()}`);
                console.log(`[AutoManage DEBUG] Formatted quotedAmountOut for ${tokenToBuy.symbol} (decimals: ${tokenToBuy.decimals}): ${ethers.formatUnits(quotedAmountOut.toString(), tokenToBuy.decimals)}`); 
                
                const BIPS_BASE = 10000n;
                const slippageBipsBigInt = BigInt(currentStrategyParams.rebalanceSlippageBips.toString());
                const numerator = BIPS_BASE - slippageBipsBigInt;
                const minAmountOutFromSwap = (quotedAmountOut * numerator) / BIPS_BASE;

                console.log(`[AutoManage DEBUG] Slippage BIPS: ${slippageBipsBigInt.toString()}`);
                console.log(`[AutoManage DEBUG] Numerator for slippage calc: ${numerator.toString()}`);
                console.log(`[AutoManage DEBUG] Denominator for slippage calc: ${BIPS_BASE.toString()}`);
                console.log(`[AutoManage DEBUG] Raw minAmountOutFromSwap (BigInt) AFTER MANUAL CALC: ${minAmountOutFromSwap.toString()}`);
                
                console.log(`[AutoManage] Quoted: selling ${ethers.formatUnits(amountToActuallySwap.toString(), tokenToSell.decimals)} ${tokenToSell.symbol} to get approx ${ethers.formatUnits(quotedAmountOut.toString(), tokenToBuy.decimals)} ${tokenToBuy.symbol}. Min out: ${ethers.formatUnits(minAmountOutFromSwap.toString(), tokenToBuy.decimals)}`);
                
                console.log(`[AutoManage] Step 4: Executing swap via SwapRouter...`);
                const swapRouterContract = new ethers.Contract(UNISWAP_V3_SWAP_ROUTER_ADDRESS, ISwapRouter_ABI, backendOperatorWallet);
                const swapParams = { 
                    tokenIn: tokenToSell.address, tokenOut: tokenToBuy.address,
                    fee: feeForPoolNumeric, recipient: backendOperatorWallet.address, 
                    deadline: deadline, amountIn: amountToActuallySwap.toString(), 
                    amountOutMinimum: minAmountOutFromSwap.toString(), 
                    sqrtPriceLimitX96: 0,
                };
                try {
                    const swapTxGas = await swapRouterContract.exactInputSingle.estimateGas(swapParams);
                    const swapTx = await swapRouterContract.exactInputSingle(swapParams, {gasLimit: swapTxGas + BigInt(60000) });
                    const swapReceipt = await swapTx.wait(1);
                    if (swapReceipt.status !== 1) throw new Error(`Swap transaction failed. Hash: ${swapTx.hash}`);
                    
                    let actualAmountObtainedFromSwap = 0n;
                    for (const log of swapReceipt.logs) {
                        if (log.address.toLowerCase() === tokenToBuy.address.toLowerCase()) {
                             try {
                                const erc20Interface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
                                const parsedLog = erc20Interface.parseLog({ topics: [...log.topics], data: log.data });
                                if (parsedLog && parsedLog.args.to.toLowerCase() === backendOperatorWallet.address.toLowerCase()) {
                                    actualAmountObtainedFromSwap = parsedLog.args.value;
                                    break; 
                                }
                            } catch(e) {/*ignore logs not matching Transfer event*/}
                        }
                    }
                     if(actualAmountObtainedFromSwap === 0n && minAmountOutFromSwap > 0n && quotedAmountOut > 0n ) { 
                        console.warn(`[AutoManage] Could not parse Transfer event. Assuming minAmountOut was received if it was expected.`);
                        actualAmountObtainedFromSwap = minAmountOutFromSwap; 
                     } else if (actualAmountObtainedFromSwap === 0n && quotedAmountOut === 0n) { 
                        console.log(`[AutoManage] Swap resulted in 0 ${tokenToBuy.symbol} as per quote or parsing.`);
                     }

                    console.log(`[AutoManage] Swap successful. Actual ${tokenToBuy.symbol} obtained: ${ethers.formatUnits(actualAmountObtainedFromSwap.toString(), tokenToBuy.decimals)}`);
                    
                    if (tokenToSell.address.toLowerCase() === sdkToken0Canonical.address.toLowerCase()) {
                        amount0DesiredForMint = amount0Collected - amountToActuallySwap;
                        amount1DesiredForMint = amount1Collected + actualAmountObtainedFromSwap;
                    } else {
                        amount1DesiredForMint = amount1Collected - amountToActuallySwap;
                        amount0DesiredForMint = amount0Collected + actualAmountObtainedFromSwap;
                    }
                } catch (swapError) { 
                    console.error(`[AutoManage] Error during swap for ${oldTokenId}:`, swapError);
                    await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error during swap: ${swapError.message.substring(0,200)}`, oldTokenId]);
                    return; 
                }
            } else if (amountToActuallySwap === 0n) {
                console.log(`[AutoManage] Calculated swap amount is zero or not enough assets to rebalance. No swap needed for tokenId ${oldTokenId}.`);
            } else {
                 console.warn(`[AutoManage] Swap Router/Quoter not configured or other issue. Skipping swap.`);
            }
            
            console.log(`[AutoManage] Amounts for new position: ${sdkToken0Canonical.symbol}: ${ethers.formatUnits(amount0DesiredForMint.toString(), sdkToken0Canonical.decimals)}, ${sdkToken1Canonical.symbol}: ${ethers.formatUnits(amount1DesiredForMint.toString(), sdkToken1Canonical.decimals)}`);
            
            let newNftTokenId = null; // Объявляем newNftTokenId здесь, чтобы он был доступен для финального лога

            console.log(`[AutoManage] Step 5: Minting new liquidity position...`);
            if (amount0DesiredForMint === 0n && amount1DesiredForMint === 0n) {
                console.warn(`[AutoManage] Both desired amounts for minting are zero. Skipping mint for ${oldTokenId}.`);
                await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, is_enabled = FALSE, updated_at = NOW() WHERE token_id = $2', ['Rebalance resulted in zero assets to mint. Auto-manage disabled.', oldTokenId]);
                await stopMonitoringPosition(oldTokenId, pgPoolInstance);
                return;
            }
            try {
                const poolDataForMint = await getPoolData(sdkToken0Canonical, sdkToken1Canonical, feeForPoolNumeric);
                if (!poolDataForMint) throw new Error("Could not get pool data before minting.");
                console.log(`[AutoManage] Current pool tick before mint attempt: ${poolDataForMint.tickCurrent}. New range: [${newTickLower}, ${newTickUpper}]`);

                if (amount0DesiredForMint > 0n) {
                    const approveMint0 = await approveToken(sdkToken0Canonical, amount0DesiredForMint, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, backendOperatorWallet);
                    if (!approveMint0) throw new Error(`Failed to approve ${sdkToken0Canonical.symbol} for minting.`);
                }
                if (amount1DesiredForMint > 0n) {
                    const approveMint1 = await approveToken(sdkToken1Canonical, amount1DesiredForMint, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, backendOperatorWallet);
                    if (!approveMint1) throw new Error(`Failed to approve ${sdkToken1Canonical.symbol} for minting.`);
                }

                const mintParams = { 
                  token0: sdkToken0Canonical.address, token1: sdkToken1Canonical.address,
                  fee: feeForPoolNumeric, tickLower: newTickLower, tickUpper: newTickUpper,
                  amount0Desired: amount0DesiredForMint.toString(), amount1Desired: amount1DesiredForMint.toString(),
                  amount0Min: "0", amount1Min: "0", recipient: userAddress, 
                  deadline: Math.floor(Date.now() / 1000) + 60 * 10,
                };
                console.log("[AutoManage] Mint parameters:", mintParams);
                try {
                    await positionManager.mint.staticCall(mintParams);
                    console.log("[AutoManage] Static call for mint successful.");
                } catch (staticCallError) { 
                    console.error(`[AutoManage] Static call for mint failed:`, staticCallError);
                    throw new Error(`Static call failed: ${staticCallError.reason || staticCallError.message}`);
                }
                
                const mintTxGas = await positionManager.mint.estimateGas(mintParams);
                const mintTx = await positionManager.mint(mintParams, {gasLimit: mintTxGas + BigInt(100000) });
                const mintReceipt = await mintTx.wait(1);
                if (mintReceipt.status !== 1) throw new Error(`Mint transaction failed. Hash: ${mintTx.hash}`);
                
                // newNftTokenId уже объявлен выше
                const eventInterfaceMint = new ethers.Interface(INonfungiblePositionManagerABI);
                for (const log of mintReceipt.logs) {
                    try {
                        if (log.address.toLowerCase() === UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS.toLowerCase()) {
                            const parsedLog = eventInterfaceMint.parseLog({ topics: [...log.topics], data: log.data });
                            if (parsedLog && parsedLog.name === "IncreaseLiquidity") {
                                newNftTokenId = parsedLog.args.tokenId.toString();
                                break; 
                            }
                        }
                    } catch (e) { /* ignore parsing errors */ }
                }
                if (!newNftTokenId) throw new Error("Could not parse new tokenId from mint transaction logs.");
                console.log(`[AutoManage] New liquidity position minted successfully! New NFT Token ID: ${newNftTokenId}`);

                const newStrategyParamsForDB = { 
                    ...currentStrategyParams, 
                    lastTickLower: newTickLower.toString(), 
                    lastTickUpper: newTickUpper.toString() 
                };
                const client = await pgPoolInstance.connect();
                try {
                    await client.query('BEGIN');
                    const oldPosUpdateQuery = 'UPDATE auto_managed_positions SET is_enabled = FALSE, status_message = $1, updated_at = NOW() WHERE token_id = $2';
                    await client.query(oldPosUpdateQuery, [`Rebalanced to new NFT ${newNftTokenId}`, oldTokenId]);
                    
                    // Добавляем начальные значения для новой позиции
                    const newPosInsertQuery = `
                        INSERT INTO auto_managed_positions 
                        (token_id, user_address, token0_address, token1_address, 
                         initial_amount0_wei, initial_amount1_wei,
                         cumulative_fees_token0_wei, cumulative_fees_token1_wei,
                         strategy_parameters, is_enabled, status_message, last_checked_at, created_at, updated_at) 
                        VALUES ($1, $2, $3, $4, $5, $6, '0', '0', $7, TRUE, $8, NOW(), NOW(), NOW())
                        ON CONFLICT (token_id) DO UPDATE SET
                            user_address = EXCLUDED.user_address, 
                            token0_address = EXCLUDED.token0_address,
                            token1_address = EXCLUDED.token1_address, 
                            initial_amount0_wei = EXCLUDED.initial_amount0_wei,
                            initial_amount1_wei = EXCLUDED.initial_amount1_wei,
                            strategy_parameters = EXCLUDED.strategy_parameters, 
                            is_enabled = TRUE,
                            status_message = EXCLUDED.status_message, 
                            last_checked_at = NOW(), 
                            updated_at = NOW();
                    `;
                    await client.query(newPosInsertQuery, [
                        newNftTokenId, 
                        userAddress, 
                        sdkToken0Canonical.address, 
                        sdkToken1Canonical.address,
                        amount0DesiredForMint.toString(),
                        amount1DesiredForMint.toString(),
                        JSON.stringify(newStrategyParamsForDB), 
                        `Active after rebalance from ${oldTokenId}`
                    ]);
                    await client.query('COMMIT');
                    console.log(`[AutoManage] Database updated successfully for new NFT ${newNftTokenId}.`);
                    await stopMonitoringPosition(oldTokenId, pgPoolInstance);
                } catch (dbError) {
                    await client.query('ROLLBACK');
                    console.error(`[AutoManage] Database transaction error: ${dbError.message}. Rolled back.`);
                    await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1 WHERE token_id = $2', [`DB Error after mint: ${dbError.message.substring(0,150)}`, oldTokenId]);
                    throw dbError; 
                } finally {
                    client.release();
                }
                // Сжигание старой NFT теперь происходит раньше, этот блок здесь больше не нужен
            } catch (mintingError) { 
                console.error(`[AutoManage] Error during minting new position for original tokenId ${oldTokenId}:`, mintingError);
                await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Error minting new position: ${mintingError.message.substring(0,200)}`, oldTokenId]);
                return; 
            }
            // newNftTokenId теперь доступен здесь
            console.log(`[AutoManage] Position ${oldTokenId} rebalance process completed. New active position is ${newNftTokenId || 'UNKNOWN'}.`);

        } else { 
            console.log(`[AutoManage] Position ${oldTokenId} is IN RANGE.`);
            await pgPoolInstance.query('UPDATE auto_managed_positions SET last_checked_at = NOW(), status_message = $2 WHERE token_id = $1', [oldTokenId, 'In range']);
        }
    } catch (error) { 
        console.error(`[AutoManage] Outer error processing tokenId ${oldTokenId}:`, error);
        try {
            const manager = positionManager || new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, backendOperatorWallet);
            const nftStillExists = await manager.ownerOf(oldTokenId).then(() => true).catch(() => false);
            if (nftStillExists) { 
                 await pgPoolInstance.query('UPDATE auto_managed_positions SET status_message = $1, updated_at = NOW() WHERE token_id = $2', [`Outer Error: ${error.message.substring(0,250)}`, oldTokenId]);
            } else if (oldTokenId) { 
                 console.warn(`[AutoManage] Old NFT ${oldTokenId} no longer exists after outer error. Updating DB.`);
                 await pgPoolInstance.query('UPDATE auto_managed_positions SET is_enabled = FALSE, status_message = $1, updated_at = NOW() WHERE token_id = $2', [`NFT ${oldTokenId} non-existent after outer error.`, oldTokenId]);
                 await stopMonitoringPosition(oldTokenId, pgPoolInstance);
            }
        } catch (dbError) {
            console.error(`[AutoManage] DB Error updating status for ${oldTokenId} after outer error:`, dbError);
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
    // Implementation from previous context or user's existing code
    if (activeMonitors[tokenId]) { // activeMonitors needs to be defined in the scope
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