const { ethers } = require('ethers'); // ethers уже импортирован в вашем config, но для ясности можно и здесь
const { UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, CHAIN_ID, provider } = require('./config'); // CHAIN_ID и provider из config
const { Token: UniswapToken } = require('@uniswap/sdk-core'); // Переименовываем, чтобы не было конфликта имен
const { Position } = require('@uniswap/v3-sdk');
const { getPoolData } = require('./uniswapPoolUtils');
const { getTokenDetailsByAddressOnBackend } = require('./constants/predefinedTokens'); // Важно, чтобы путь был правильным

// INonfungiblePositionManagerABI должен быть уже доступен в этом файле
// (из вашего предыдущего кода, вы импортировали его или определили)
// Если нет, то:
const INonfungiblePositionManagerABI = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json').abi;
// И используйте INonfungiblePositionManagerABI_fromArtifact ниже

/**
 * Получает детализированную информацию о NFT позиции ликвидности.
 * @param {number|string} tokenId ID токена NFT позиции.
 * @param {ethers.Provider|ethers.Signer} signerOrProvider Провайдер или подписант ethers.
 * @returns {Promise<object|null>} Объект с информацией о позиции или null в случае ошибки.
 */
async function getPositionDetails(tokenId, signerOrProvider) {
    console.log(`\n--- [getPositionDetails] Получение информации о позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI, // Используйте правильную переменную для ABI
        signerOrProvider
    );

    try {
        const positionInfoRaw = await nftPositionManagerContract.positions(tokenId);

        if (!positionInfoRaw || positionInfoRaw.token0 === ethers.ZeroAddress) {
            console.warn(`[getPositionDetails] Позиция ${tokenId} не найдена или недействительна (token0 - нулевой адрес).`);
            return null;
        }

        console.log("  [getPositionDetails] Сырая информация о позиции из контракта:");
        console.log(`    Token0 Addr: ${positionInfoRaw.token0}`);
        console.log(`    Token1 Addr: ${positionInfoRaw.token1}`);
        console.log(`    Fee: ${positionInfoRaw.fee.toString()}`);
        console.log(`    Tick Lower: ${positionInfoRaw.tickLower.toString()}`);
        console.log(`    Tick Upper: ${positionInfoRaw.tickUpper.toString()}`);
        console.log(`    Liquidity: ${positionInfoRaw.liquidity.toString()}`);

        // Получаем детали для токенов, составляющих позицию
        const details0 = getTokenDetailsByAddressOnBackend(positionInfoRaw.token0); // Используем исправленную/текущую
        const details1 = getTokenDetailsByAddressOnBackend(positionInfoRaw.token1);

        if (!details0 || !details1) {
            console.error(`[getPositionDetails] Не удалось получить полные детали для одного из токенов позиции ${tokenId}.`);
            // Возвращаем сырую информацию, если детали токенов не удалось корректно определить
            // или хотя бы адреса, чтобы вызывающий код мог попытаться разобраться.
            return {
                rawPositionInfo: positionInfoRaw,
                sdkToken0: null,
                sdkToken1: null,
                pool: null,
                positionSDK: null,
                error: "Could not determine full token details for SDK objects."
            };
        }
        
        // Создаем объекты Token из Uniswap SDK с корректными данными
        const sdkToken0 = new UniswapToken(CHAIN_ID, positionInfoRaw.token0, details0.decimals, details0.symbol);
        const sdkToken1 = new UniswapToken(CHAIN_ID, positionInfoRaw.token1, details1.decimals, details1.symbol);

        console.log(`  [getPositionDetails] SDK Token0: ${sdkToken0.symbol} (Dec: ${sdkToken0.decimals}, Addr: ${sdkToken0.address})`);
        console.log(`  [getPositionDetails] SDK Token1: ${sdkToken1.symbol} (Dec: ${sdkToken1.decimals}, Addr: ${sdkToken1.address})`);

        const poolFee = Number(positionInfoRaw.fee);
        const poolForPosition = await getPoolData(sdkToken0, sdkToken1, poolFee);

        let positionSDK = null;
        let calculatedAmount0 = 'N/A';
        let calculatedAmount1 = 'N/A';

        if (poolForPosition) {
            console.log(`  [getPositionDetails] Данные пула получены. Current Tick: ${poolForPosition.tickCurrent}`);
            const liquidityString = positionInfoRaw.liquidity.toString();
            if (liquidityString !== "0") {
                 try {
                    positionSDK = new Position({
                        pool: poolForPosition,
                        liquidity: liquidityString,
                        tickLower: Number(positionInfoRaw.tickLower),
                        tickUpper: Number(positionInfoRaw.tickUpper)
                    });
                    calculatedAmount0 = positionSDK.amount0.toSignificant(6);
                    calculatedAmount1 = positionSDK.amount1.toSignificant(6);
                    console.log("  [getPositionDetails] Информация о позиции из SDK (расчетные текущие количества):");
                    console.log(`    Amount0 (${positionSDK.amount0.currency.symbol}): ${calculatedAmount0}`);
                    console.log(`    Amount1 (${positionSDK.amount1.currency.symbol}): ${calculatedAmount1}`);
                 } catch (sdkError) {
                    console.error(`[getPositionDetails] Ошибка при создании объекта Position SDK для tokenId ${tokenId}:`, sdkError.message);
                    // positionSDK останется null
                 }
            } else {
                 console.log("  [getPositionDetails] Ликвидность позиции равна нулю, расчет SDK сумм не производится.");
            }
        } else {
            console.warn(`[getPositionDetails] Не удалось получить данные о пуле для позиции ${tokenId}. Расчет SDK сумм невозможен.`);
        }
        
        // Возвращаем как сырую информацию, так и созданные SDK объекты (если удалось)
        return {
            rawPositionInfo: positionInfoRaw, // Оригинальные данные из контракта
            sdkToken0: sdkToken0,           // UniswapToken объект для token0 позиции
            sdkToken1: sdkToken1,           // UniswapToken объект для token1 позиции
            pool: poolForPosition,          // Uniswap SDK Pool объект
            positionSDK: positionSDK,       // Uniswap SDK Position объект (может быть null)
            // Для удобства можно добавить и отформатированные строки:
            tokensOwed0Formatted: ethers.formatUnits(positionInfoRaw.tokensOwed0, sdkToken0.decimals),
            tokensOwed1Formatted: ethers.formatUnits(positionInfoRaw.tokensOwed1, sdkToken1.decimals),
            calculatedAmount0: calculatedAmount0, // Уже строка из toSignificant
            calculatedAmount1: calculatedAmount1  // Уже строка из toSignificant
        };

    } catch (error) {
        console.error(`  [getPositionDetails] Ошибка при получении информации о позиции ${tokenId}:`, error.reason || error.message || error);
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
       

       
        if (BigInt(amount0Desired_JSBI.toString()) > 0n) { // Сравниваем как BigInt
            await approveToken(currentPool.token0, amount0Desired_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, walletSigner);
        }
        if (BigInt(amount1Desired_JSBI.toString()) > 0n) { // Сравниваем как BigInt
            await approveToken(currentPool.token1, amount1Desired_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, walletSigner);
        }

        const increaseParams = { tokenId: tokenId, amount0Desired: amount0Desired_JSBI.toString(), amount1Desired: amount1Desired_JSBI.toString(), amount0Min: 0, amount1Min: 0, deadline: Math.floor(Date.now() / 1000) + 60 * 10 };
       

        const increaseTx = await nftPositionManagerContract.increaseLiquidity(increaseParams);
       
        const increaseReceipt = await increaseTx.wait(1);
       

        if (increaseReceipt.status === 1) {
           
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
     
    const nftPositionManagerContract = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, walletSigner);
    const ownerAddress = await walletSigner.getAddress();
    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        const currentLiquidity = positionInfo.liquidity;
        if (currentLiquidity === 0n) {  return false; }
        
        const liquidityToRemove = (currentLiquidity * BigInt(Math.floor(percentageToRemove * 100))) / 10000n; 
        if (liquidityToRemove === 0n) {   return false; }
         

        const decreaseLiquidityParams = { tokenId: tokenId, liquidity: liquidityToRemove, amount0Min: 0, amount1Min: 0, deadline: Math.floor(Date.now() / 1000) + 60 * 10 };
        
        const decreaseTx = await nftPositionManagerContract.decreaseLiquidity(decreaseLiquidityParams);
         
        const decreaseReceipt = await decreaseTx.wait(1);
        
        if (decreaseReceipt.status !== 1) { console.error("    Уменьшение ликвидности не удалось."); return false; }
        
        const MAX_UINT128 = (2n ** 128n) - 1n;
        const collectParams = { tokenId: tokenId, recipient: ownerAddress, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
        const finalPositionInfo = await nftPositionManagerContract.positions(tokenId);
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenA; displayToken1 = TokenB; } 
        else if (TokenB.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenB; displayToken1 = TokenA; } 
        else { console.error("    Не удалось сопоставить токены для отображения собранных сумм."); displayToken0 = {symbol: `T0?`, decimals: 18}; displayToken1 = {symbol: `T1?`, decimals: 18};}
        const amountsToCollect = await nftPositionManagerContract.collect.staticCall(collectParams);
       
        if (amountsToCollect.amount0 === 0n && amountsToCollect.amount1 === 0n) { console.log("    Нет токенов или комиссий для сбора."); } 
        else {
            const collectTx = await nftPositionManagerContract.collect(collectParams);
            
            const collectReceipt = await collectTx.wait(1);
            
            if (collectReceipt.status === 1) {  } 
            else { console.error("    Сбор токенов/комиссий не удался."); return false; }
        }
 
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
   
    const nftPositionManagerContract = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, walletSigner);
    const ownerAddress = await walletSigner.getAddress();
    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        const currentLiquidity = positionInfo.liquidity;
        if (currentLiquidity === 0n) {  } 
        else {
           
            const decreaseLiquidityParams = { tokenId: tokenId, liquidity: currentLiquidity, amount0Min: 0, amount1Min: 0, deadline: Math.floor(Date.now() / 1000) + 60 * 10 };
           
            const decreaseTx = await nftPositionManagerContract.decreaseLiquidity(decreaseLiquidityParams);
           
            const decreaseReceipt = await decreaseTx.wait(1);
           
            if (decreaseReceipt.status !== 1) { console.error("    Уменьшение ликвидности не удалось."); return false; }
           
        }
 
        const MAX_UINT128 = (2n ** 128n) - 1n;
        const collectParams = { tokenId: tokenId, recipient: ownerAddress, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
        
        const finalPositionInfo = await nftPositionManagerContract.positions(tokenId);
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenA; displayToken1 = TokenB; } 
        else if (TokenB.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) { displayToken0 = TokenB; displayToken1 = TokenA; } 
        else { console.error("    Не удалось сопоставить токены для отображения собранных сумм."); displayToken0 = {symbol:`T0?`,decimals:18}; displayToken1 = {symbol:`T1?`,decimals:18};}
        const amountsToCollect = await nftPositionManagerContract.collect.staticCall(collectParams);
        
       
        if (amountsToCollect.amount0 === 0n && amountsToCollect.amount1 === 0n) { console.log("    Нет токенов или комиссий для сбора."); } 
        else {
            const collectTx = await nftPositionManagerContract.collect(collectParams);
          
            const collectReceipt = await collectTx.wait(1);
           
            if (collectReceipt.status === 1) {   } 
            else { console.error("    Сбор токенов/комиссий не удался."); return false; }
        }
        const finalLiquidityCheck = await nftPositionManagerContract.positions(tokenId);
        if (finalLiquidityCheck.liquidity === 0n) {
         
            const burnTx = await nftPositionManagerContract.burn(tokenId);
          
            const burnReceipt = await burnTx.wait(1);
        
            if (burnReceipt.status === 1) { } 
            else { console.error("    Сжигание NFT не удалось."); }
        } else {   }
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
    INonfungiblePositionManagerABI 
};