const { ethers, provider, wallet, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, TokenA, TokenB } = require('./config');
const { Position } = require('@uniswap/v3-sdk');
const { getPoolData, IUniswapV3PoolABI } = require('./uniswapPoolUtils'); // IUniswapV3PoolABI нам не нужен здесь напрямую
const { approveToken } = require('./erc20Utils');
const INonfungiblePositionManagerABI = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json').abi;

async function getPositionDetails(tokenId, walletSignerOrProvider) {
    // ... (код вашей функции getPositionDetails, убедитесь, что она использует импортированные TokenA, TokenB, getPoolData)
    // ... (вместо глобальных TokenA, TokenB, она должна получать их как параметры или из config)
    console.log(`\n--- Получение информации о позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSignerOrProvider 
    );

    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);

        console.log("  Информация о позиции:");
        console.log(`    Token0: ${positionInfo.token0}`);
        console.log(`    Token1: ${positionInfo.token1}`);
        console.log(`    Fee: ${positionInfo.fee.toString()}`);
        console.log(`    Tick Lower: ${positionInfo.tickLower.toString()}`);
        console.log(`    Tick Upper: ${positionInfo.tickUpper.toString()}`);
        console.log(`    Liquidity: ${positionInfo.liquidity.toString()}`);
        console.log(`    FeeGrowthInside0LastX128: ${positionInfo.feeGrowthInside0LastX128.toString()}`);
        console.log(`    FeeGrowthInside1LastX128: ${positionInfo.feeGrowthInside1LastX128.toString()}`);
        
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === positionInfo.token0.toLowerCase()) {
            displayToken0 = TokenA;
            displayToken1 = TokenB;
        } else if (TokenB.address.toLowerCase() === positionInfo.token0.toLowerCase()) { 
            displayToken0 = TokenB;
            displayToken1 = TokenA;
        } else {
            console.error("Не удалось сопоставить токены из позиции с TokenA/TokenB");
            // Создаем временные объекты Token, если глобальные не подошли
            // Этого не должно происходить, если TokenA/TokenB правильно настроены
             displayToken0 = new Token(CHAIN_ID, positionInfo.token0, 18, "TMP0"); // Предполагаем 18 decimals
             displayToken1 = new Token(CHAIN_ID, positionInfo.token1, 6, "TMP1");  // Предполагаем 6 decimals
        }

        console.log(`    Расшифрованные Tokens Owed0 (${displayToken0.symbol}): ${ethers.formatUnits(positionInfo.tokensOwed0.toString(), displayToken0.decimals)}`);
        console.log(`    Расшифрованные Tokens Owed1 (${displayToken1.symbol}): ${ethers.formatUnits(positionInfo.tokensOwed1.toString(), displayToken1.decimals)}`);

        const poolFee = Number(positionInfo.fee);
        const poolForPosition = await getPoolData(displayToken0, displayToken1, poolFee);

        if (poolForPosition) {
            const liquidityString = positionInfo.liquidity.toString();
            const positionSDK = new Position({
                pool: poolForPosition,
                liquidity: liquidityString, 
                tickLower: Number(positionInfo.tickLower),
                tickUpper: Number(positionInfo.tickUpper)
            });
            console.log("\n  Информация о позиции из SDK (для проверки):");
            console.log(`    Amount0 (расчетное кол-во ${positionSDK.amount0.currency.symbol}): ${positionSDK.amount0.toSignificant(6)}`);
            console.log(`    Amount1 (расчетное кол-во ${positionSDK.amount1.currency.symbol}): ${positionSDK.amount1.toSignificant(6)}`);
        }
        return positionInfo;
    } catch (error) {
        console.error(`  Ошибка при получении информации о позиции ${tokenId}:`, error.reason || error.message || error);
        return null;
    }
}

async function increaseLiquidityForPosition(tokenId, additionalAmountTokenA_str, walletSigner) {
    // ... (код вашей функции increaseLiquidityForPosition)
    // Убедитесь, что она использует импорты:
    // ethers, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, TokenA, TokenB, provider из config.js
    // getPoolData из uniswapPoolUtils.js
    // approveToken из erc20Utils.js
    // Position из @uniswap/v3-sdk
    // INonfungiblePositionManagerABI (можно импортировать здесь или из config, если вынести ABI туда)
    console.log(`\n--- Увеличение ликвидности для позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSigner
    );
    const ownerAddress = await walletSigner.getAddress();

    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        if (!positionInfo || (positionInfo.liquidity === 0n && additionalAmountTokenA_str === "0")) {
            if (positionInfo.token0 === ethers.ZeroAddress) {
                console.error(`  Позиция с Token ID ${tokenId} не найдена или недействительна.`);
                return false;
            }
        }
        console.log(`  Добавляем ликвидность к существующему диапазону: TickLower ${positionInfo.tickLower.toString()}, TickUpper ${positionInfo.tickUpper.toString()}`);

        let posToken0, posToken1;
        if (TokenA.address.toLowerCase() === positionInfo.token0.toLowerCase()) {
            posToken0 = TokenA; posToken1 = TokenB;
        } else if (TokenB.address.toLowerCase() === positionInfo.token0.toLowerCase()) {
            posToken0 = TokenB; posToken1 = TokenA;
        } else {
            console.error("  Не удалось сопоставить токены позиции с глобальными TokenA/TokenB.");
            return false;
        }
        
        const poolFee = Number(positionInfo.fee);
        const currentPool = await getPoolData(posToken0, posToken1, poolFee);
        if (!currentPool) {
            console.error("  Не удалось получить данные о пуле для этой позиции.");
            return false;
        }

        const tokenBeingAdded = TokenA; 
        const additionalAmountToken_wei = ethers.parseUnits(additionalAmountTokenA_str, tokenBeingAdded.decimals);
        console.log(`  Планируем добавить примерно: ${additionalAmountTokenA_str} ${tokenBeingAdded.symbol}`);

        const { ERC20_ABI: ApproveERC20_ABI } = require('./erc20Utils');  
        const tokenBeingAddedContract = new ethers.Contract(tokenBeingAdded.address, ApproveERC20_ABI, provider);
        const balanceTokenBeingAdded = await tokenBeingAddedContract.balanceOf(ownerAddress);
        if (balanceTokenBeingAdded < additionalAmountToken_wei) {
            console.error(`  Недостаточно ${tokenBeingAdded.symbol} на балансе. У вас: ${ethers.formatUnits(balanceTokenBeingAdded, tokenBeingAdded.decimals)}, требуется: ${additionalAmountTokenA_str}`);
            return false;
        }

        let virtualPositionToAdd;
        if (tokenBeingAdded.equals(currentPool.token0)) {
            virtualPositionToAdd = Position.fromAmount0({ pool: currentPool, tickLower: Number(positionInfo.tickLower), tickUpper: Number(positionInfo.tickUpper), amount0: additionalAmountToken_wei.toString(), useFullPrecision: true });
        } else if (tokenBeingAdded.equals(currentPool.token1)) {
            virtualPositionToAdd = Position.fromAmount1({ pool: currentPool, tickLower: Number(positionInfo.tickLower), tickUpper: Number(positionInfo.tickUpper), amount1: additionalAmountToken_wei.toString(), useFullPrecision: true });
        } else {
            console.error("  Критическая ошибка: Добавляемый токен не является ни token0, ни token1 пула.");
            return false;
        }

        const { amount0: amount0Desired_JSBI, amount1: amount1Desired_JSBI } = virtualPositionToAdd.mintAmounts;
        console.log(`  Рассчитанные суммы для ДОБАВЛЕНИЯ в позицию:`);
        console.log(`    ${currentPool.token0.symbol} (amount0Desired): ${ethers.formatUnits(amount0Desired_JSBI.toString(), currentPool.token0.decimals)}`);
        console.log(`    ${currentPool.token1.symbol} (amount1Desired): ${ethers.formatUnits(amount1Desired_JSBI.toString(), currentPool.token1.decimals)}`);

        console.log("\n  Одобрение добавляемых токенов для NonfungiblePositionManager...");
        if (BigInt(amount0Desired_JSBI.toString()) > 0n) { // Сравниваем как BigInt
            await approveToken(currentPool.token0, amount0Desired_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, walletSigner);
        }
        if (BigInt(amount1Desired_JSBI.toString()) > 0n) { // Сравниваем как BigInt
            await approveToken(currentPool.token1, amount1Desired_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, walletSigner);
        }

        const increaseParams = { tokenId: tokenId, amount0Desired: amount0Desired_JSBI.toString(), amount1Desired: amount1Desired_JSBI.toString(), amount0Min: 0, amount1Min: 0, deadline: Math.floor(Date.now() / 1000) + 60 * 10 };
        console.log("\n  Параметры для increaseLiquidity:", { tokenId: increaseParams.tokenId.toString(), amount0Desired: increaseParams.amount0Desired, amount1Desired: increaseParams.amount1Desired, amount0Min: increaseParams.amount0Min.toString(), amount1Min: increaseParams.amount1Min.toString(), deadline: increaseParams.deadline });
        console.log("  Отправка транзакции increaseLiquidity...");

        const increaseTx = await nftPositionManagerContract.increaseLiquidity(increaseParams);
        console.log(`    Транзакция increaseLiquidity отправлена: ${increaseTx.hash}`);
        const increaseReceipt = await increaseTx.wait(1);
        console.log("    Транзакция increaseLiquidity подтверждена. Статус:", increaseReceipt.status);

        if (increaseReceipt.status === 1) {
            console.log("    Ликвидность успешно добавлена в позицию!");
            await getPositionDetails(tokenId, walletSigner);
        } else {
            console.error("    Добавление ликвидности не удалось (транзакция отменена).");
            return false;
        }
        return true;
    } catch (error) {
        console.error(`  Ошибка при увеличении ликвидности для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) { try { const errorData = nftPositionManagerContract.interface.parseError(error.data); console.error("    Ошибка контракта:", errorData.name, errorData.args); } catch (e) { /* ignore */ } }
        return false;
    }
}

async function decreaseLiquidityPartially(tokenId, percentageToRemove, walletSigner) {
    // ... (код вашей функции decreaseLiquidityPartially) ...
    if (percentageToRemove <= 0 || percentageToRemove > 100) { console.error("  Процент для снятия должен быть больше 0 и не больше 100."); return false; }
    console.log(`\n--- Частичное изъятие (${percentageToRemove}%) ликвидности для позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, walletSigner);
    const ownerAddress = await walletSigner.getAddress();
    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        const currentLiquidity = positionInfo.liquidity;
        if (currentLiquidity === 0n) { console.log("  Ликвидность этой позиции уже равна нулю. Нечего уменьшать."); return false; }
        console.log(`  Текущая ликвидность позиции: ${currentLiquidity.toString()}`);
        const liquidityToRemove = (currentLiquidity * BigInt(Math.floor(percentageToRemove * 100))) / 10000n; 
        if (liquidityToRemove === 0n) { console.log("  Рассчитанное количество ликвидности для снятия слишком мало (0)."); return false; }
        console.log(`  Планируется изъять ${percentageToRemove}% ликвидности: ${liquidityToRemove.toString()}`);

        const decreaseLiquidityParams = { tokenId: tokenId, liquidity: liquidityToRemove, amount0Min: 0, amount1Min: 0, deadline: Math.floor(Date.now() / 1000) + 60 * 10 };
        console.log("  Уменьшаем ликвидность (decreaseLiquidity)...");
        console.log("    Параметры для decreaseLiquidity:", { tokenId: decreaseLiquidityParams.tokenId.toString(), liquidity: decreaseLiquidityParams.liquidity.toString(), amount0Min: decreaseLiquidityParams.amount0Min.toString(), amount1Min: decreaseLiquidityParams.amount1Min.toString(), deadline: decreaseLiquidityParams.deadline });
        const decreaseTx = await nftPositionManagerContract.decreaseLiquidity(decreaseLiquidityParams);
        console.log(`    Транзакция decreaseLiquidity отправлена: ${decreaseTx.hash}`);
        const decreaseReceipt = await decreaseTx.wait(1);
        console.log("    Транзакция decreaseLiquidity подтверждена. Статус:", decreaseReceipt.status);
        if (decreaseReceipt.status !== 1) { console.error("    Уменьшение ликвидности не удалось."); return false; }
        console.log("    Ликвидность успешно частично уменьшена.");
        
        console.log("\n  Собираем токены и комиссии (collect)...");
        const MAX_UINT128 = (2n ** 128n) - 1n;
        const collectParams = { tokenId: tokenId, recipient: ownerAddress, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
        const finalPositionInfo = await nftPositionManagerContract.positions(tokenId);
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenA; displayToken1 = TokenB; } 
        else if (TokenB.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenB; displayToken1 = TokenA; } 
        else { console.error("    Не удалось сопоставить токены для отображения собранных сумм."); displayToken0 = {symbol: `T0?`, decimals: 18}; displayToken1 = {symbol: `T1?`, decimals: 18};}
        const amountsToCollect = await nftPositionManagerContract.collect.staticCall(collectParams);
        console.log(`    Будет собрано ${displayToken0.symbol}: ${ethers.formatUnits(amountsToCollect.amount0, displayToken0.decimals)}`);
        console.log(`    Будет собрано ${displayToken1.symbol}: ${ethers.formatUnits(amountsToCollect.amount1, displayToken1.decimals)}`);
        if (amountsToCollect.amount0 === 0n && amountsToCollect.amount1 === 0n) { console.log("    Нет токенов или комиссий для сбора."); } 
        else {
            const collectTx = await nftPositionManagerContract.collect(collectParams);
            console.log(`    Транзакция collect отправлена: ${collectTx.hash}`);
            const collectReceipt = await collectTx.wait(1);
            console.log("    Транзакция collect подтверждена. Статус:", collectReceipt.status);
            if (collectReceipt.status === 1) { console.log("    Частично высвобожденные токены и комиссии успешно собраны!"); } 
            else { console.error("    Сбор токенов/комиссий не удался."); return false; }
        }
        console.log(`\n  Частичное изъятие ликвидности для Token ID ${tokenId} завершено.`);
        await getPositionDetails(tokenId, walletSigner); 
        return true;
    } catch (error) {
        console.error(`  Ошибка при частичном изъятии ликвидности для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) { try { const errorData = nftPositionManagerContract.interface.parseError(error.data); console.error("    Ошибка контракта:", errorData.name, errorData.args); } catch (e) { /*ignore*/ } }
        return false;
    }
}

async function withdrawFullLiquidity(tokenId, walletSigner) {
    // ... (код вашей функции withdrawFullLiquidity) ...
    // Убедитесь, что она также использует импортированные зависимости правильно
    console.log(`\n--- Полное изъятие ликвидности и сбор комиссий для позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, walletSigner);
    const ownerAddress = await walletSigner.getAddress();
    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        const currentLiquidity = positionInfo.liquidity;
        if (currentLiquidity === 0n) { console.log("  Ликвидность этой позиции уже равна нулю.");} 
        else {
            console.log(`  Текущая ликвидность позиции: ${currentLiquidity.toString()}`);
            console.log("  Уменьшаем ликвидность до нуля (decreaseLiquidity)...");
            const decreaseLiquidityParams = { tokenId: tokenId, liquidity: currentLiquidity, amount0Min: 0, amount1Min: 0, deadline: Math.floor(Date.now() / 1000) + 60 * 10 };
            console.log("    Параметры для decreaseLiquidity:", { tokenId: decreaseLiquidityParams.tokenId.toString(), liquidity: decreaseLiquidityParams.liquidity.toString(), amount0Min: decreaseLiquidityParams.amount0Min.toString(), amount1Min: decreaseLiquidityParams.amount1Min.toString(), deadline: decreaseLiquidityParams.deadline });
            const decreaseTx = await nftPositionManagerContract.decreaseLiquidity(decreaseLiquidityParams);
            console.log(`    Транзакция decreaseLiquidity отправлена: ${decreaseTx.hash}`);
            const decreaseReceipt = await decreaseTx.wait(1);
            console.log("    Транзакция decreaseLiquidity подтверждена. Статус:", decreaseReceipt.status);
            if (decreaseReceipt.status !== 1) { console.error("    Уменьшение ликвидности не удалось."); return false; }
            console.log("    Ликвидность успешно уменьшена.");
        }
        console.log("\n  Собираем токены и комиссии (collect)...");
        const MAX_UINT128 = (2n ** 128n) - 1n;
        const collectParams = { tokenId: tokenId, recipient: ownerAddress, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
        console.log("    Параметры для collect:", { tokenId: collectParams.tokenId.toString(), recipient: collectParams.recipient, amount0Max: collectParams.amount0Max.toString(), amount1Max: collectParams.amount1Max.toString() });
        const finalPositionInfo = await nftPositionManagerContract.positions(tokenId);
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenA; displayToken1 = TokenB; } 
        else if (TokenB.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenB; displayToken1 = TokenA; } 
        else { console.error("    Не удалось сопоставить токены для отображения собранных сумм."); displayToken0 = {symbol:`T0?`,decimals:18}; displayToken1 = {symbol:`T1?`,decimals:18};}
        const amountsToCollect = await nftPositionManagerContract.collect.staticCall(collectParams);
        console.log(`    Будет собрано ${displayToken0.symbol}: ${ethers.formatUnits(amountsToCollect.amount0, displayToken0.decimals)}`);
        console.log(`    Будет собрано ${displayToken1.symbol}: ${ethers.formatUnits(amountsToCollect.amount1, displayToken1.decimals)}`);
        if (amountsToCollect.amount0 === 0n && amountsToCollect.amount1 === 0n) { console.log("    Нет токенов или комиссий для сбора."); } 
        else {
            const collectTx = await nftPositionManagerContract.collect(collectParams);
            console.log(`    Транзакция collect отправлена: ${collectTx.hash}`);
            const collectReceipt = await collectTx.wait(1);
            console.log("    Транзакция collect подтверждена. Статус:", collectReceipt.status);
            if (collectReceipt.status === 1) { console.log("    Токены и комиссии успешно собраны!"); } 
            else { console.error("    Сбор токенов/комиссий не удался."); return false; }
        }
        const finalLiquidityCheck = await nftPositionManagerContract.positions(tokenId);
        if (finalLiquidityCheck.liquidity === 0n) {
            console.log("\n  Ликвидность позиции равна нулю. Сжигаем NFT (burn)...");
            const burnTx = await nftPositionManagerContract.burn(tokenId);
            console.log(`    Транзакция burn отправлена: ${burnTx.hash}`);
            const burnReceipt = await burnTx.wait(1);
            console.log("    Транзакция burn подтверждена. Статус:", burnReceipt.status);
            if (burnReceipt.status === 1) { console.log(`    NFT с Token ID ${tokenId} успешно сожжен.`); } 
            else { console.error("    Сжигание NFT не удалось."); }
        } else { console.log(`\n  Ликвидность позиции (${finalLiquidityCheck.liquidity.toString()}) еще не равна нулю. NFT не будет сожжен.`); }
        return true;
    } catch (error) {
        console.error(`  Ошибка при изъятии ликвидности для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) { try { const errorData = nftPositionManagerContract.interface.parseError(error.data); console.error("    Ошибка контракта:", errorData.name, errorData.args); } catch (e) { /*ignore*/ } }
        return false;
    }
}


module.exports = {
    getPositionDetails,
    increaseLiquidityForPosition,
    decreaseLiquidityPartially,
    withdrawFullLiquidity,
    // Экспортируем ABI, если он нужен только здесь
    INonfungiblePositionManagerABI 
};