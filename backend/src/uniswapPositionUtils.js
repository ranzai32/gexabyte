const { ethers, provider, wallet, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, TokenA, TokenB } = require('./config');
const { Position } = require('@uniswap/v3-sdk');
const { getPoolData, IUniswapV3PoolABI } = require('./uniswapPoolUtils'); // IUniswapV3PoolABI нам не нужен здесь напрямую
const { approveToken } = require('./erc20Utils');
const INonfungiblePositionManagerABI = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json').abi;

async function getPositionDetails(tokenId, walletSignerOrProvider) {
    // ... (код вашей функции getPositionDetails, убедитесь, что она использует импортированные TokenA, TokenB, getPoolData)
    // ... (вместо глобальных TokenA, TokenB, она должна получать их как параметры или из config)
    
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSignerOrProvider 
    );

    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
 
        
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