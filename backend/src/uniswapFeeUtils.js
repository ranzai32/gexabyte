const { ethers } = require('ethers');
const { UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, CHAIN_ID, provider: globalProvider } = require('./config');
const { INonfungiblePositionManagerABI } = require('./uniswapPositionUtils'); // Убедитесь, что INonfungiblePositionManagerABI экспортируется здесь или импортируется правильно
const { getTokenDetailsByAddressOnBackend } = require('./constants/predefinedTokens');

async function getUncollectedFees(tokenId, signerOrProvider) {
    console.log(`[getUncollectedFees] Fetching settled fees (tokensOwed) for tokenId: ${tokenId}`);
    
    const currentProvider = signerOrProvider || globalProvider;

    const positionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        currentProvider
    );

    try {
        const positionData = await positionManagerContract.positions(tokenId);

        if (!positionData || positionData.token0 === ethers.ZeroAddress) {
            console.warn(`[getUncollectedFees] Position ${tokenId} not found or invalid (token0 is zero address).`);
            return {
                feesAmount0: '0', // Это будет tokensOwed0
                feesAmount1: '0', // Это будет tokensOwed1
                feeToken0: null,
                feeToken1: null,
                source: 'position_struct_invalid',
                // Убираем поля, связанные с staticCall, так как мы его больше не делаем для этого запроса
                // tokensOwed0_struct: '0', 
                // tokensOwed1_struct: '0',
                // staticCallError: 'Position not found' 
            };
        }
        
        const tokensOwed0FromStruct = positionData.tokensOwed0;
        const tokensOwed1FromStruct = positionData.tokensOwed1;
        console.log(`[getUncollectedFees] From positions() struct for ${tokenId}: tokensOwed0=${tokensOwed0FromStruct.toString()}, tokensOwed1=${tokensOwed1FromStruct.toString()}`);

        const token0Details = await getTokenDetailsByAddressOnBackend(positionData.token0);
        const token1Details = await getTokenDetailsByAddressOnBackend(positionData.token1);

        const feeToken0Data = token0Details ? { address: positionData.token0, symbol: token0Details.symbol, decimals: token0Details.decimals } : null;
        const feeToken1Data = token1Details ? { address: positionData.token1, symbol: token1Details.symbol, decimals: token1Details.decimals } : null;
        
        // Теперь feesAmount0 и feesAmount1 будут содержать значения из tokensOwed0 и tokensOwed1
        return {
            feesAmount0: tokensOwed0FromStruct.toString(),
            feesAmount1: tokensOwed1FromStruct.toString(),
            feeToken0: feeToken0Data,
            feeToken1: feeToken1Data,
            source: 'position_struct' // Указываем, что данные взяты из структуры positions
            // Убираем поля, связанные с staticCall
            // tokensOwed0_struct: tokensOwed0FromStruct.toString(), 
            // tokensOwed1_struct: tokensOwed1FromStruct.toString(),
            // staticCallError: null 
        };

    } catch (error) {
        console.error(`[getUncollectedFees] Error fetching position data for tokenId ${tokenId}:`, error.message);
        return {
            feesAmount0: '0',
            feesAmount1: '0',
            feeToken0: null,
            feeToken1: null,
            source: 'fetch_error',
            // staticCallError: error.message // Можно убрать, если staticCall не используется
        };
    }
}

// --- Убедитесь, что эта функция collectFees присутствует и корректно определена ---
async function collectFees(tokenId, walletSigner) {
    console.log(`[collectFees] Attempting to collect fees for tokenId: ${tokenId}`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSigner
    );
    const MAX_UINT128 = (2n ** 128n) - 1n;
    const recipientAddress = await walletSigner.getAddress();
    const collectParams = {
        tokenId: tokenId,
        recipient: recipientAddress,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128
    };
     
    try {
        // Перед реальным сбором можно сделать staticCall, чтобы убедиться, что есть что собирать
        // и для логирования, но это не обязательно, если getUncollectedFees уже вызывалась
        const staticCallResult = await nftPositionManagerContract.collect.staticCall(collectParams);
        const feesToCollect0 = staticCallResult.amount0;
        const feesToCollect1 = staticCallResult.amount1;
        
        const positionInfoForDisplay = await nftPositionManagerContract.positions(tokenId);
        const detailsT0 = await getTokenDetailsByAddressOnBackend(positionInfoForDisplay.token0);
        const detailsT1 = await getTokenDetailsByAddressOnBackend(positionInfoForDisplay.token1);

        const displayToken0 = detailsT0 ? { address: positionInfoForDisplay.token0, ...detailsT0} : { address: positionInfoForDisplay.token0, symbol: 'T0?', decimals: 18};
        const displayToken1 = detailsT1 ? { address: positionInfoForDisplay.token1, ...detailsT1} : { address: positionInfoForDisplay.token1, symbol: 'T1?', decimals: 18};
        
        if (feesToCollect0 === 0n && feesToCollect1 === 0n) { 
            console.log(`[collectFees] No fees to collect for tokenId ${tokenId} based on staticCall.`); 
            // Проверим tokensOwed из структуры, если staticCall вернул 0, но в структуре что-то есть
            // Это маловероятно, если staticCall прошел успешно, но для полноты
            if (positionInfoForDisplay.tokensOwed0 === 0n && positionInfoForDisplay.tokensOwed1 === 0n) {
                 return { success: true, collected: false, message: "No fees to collect (struct and staticCall confirmed)." };
            }
            console.log(`[collectFees] Note: staticCall reported 0 fees, but position struct might have tokensOwed0: ${positionInfoForDisplay.tokensOwed0}, tokensOwed1: ${positionInfoForDisplay.tokensOwed1}. Proceeding with collect based on struct if different.`);
        }
       
        console.log(`[collectFees] Fees available for collection (from staticCall): ${ethers.formatUnits(feesToCollect0, displayToken0.decimals)} ${displayToken0.symbol}, ${ethers.formatUnits(feesToCollect1, displayToken1.decimals)} ${displayToken1.symbol}`);
        
        const tx = await nftPositionManagerContract.collect(collectParams);
        console.log(`[collectFees] Collect transaction sent: ${tx.hash} for tokenId ${tokenId}. Waiting for confirmation...`);
       
        const receipt = await tx.wait(1);
         
        if (receipt.status === 1) {
            console.log(`[collectFees] Fees collected successfully for tokenId ${tokenId}. Tx: ${tx.hash}`);
            return { success: true, collected: true, txHash: tx.hash };
        } else { 
            console.error(`[collectFees] Collect transaction reverted for tokenId ${tokenId}. Tx: ${tx.hash}`); 
            return { success: false, collected: false, message: "Collect transaction reverted." }; 
        }
    } catch (error) {
        console.error(`  Error collecting fees for position ${tokenId}:`, error.reason || error.message || error);
        if (error.data) { try { const errorData = nftPositionManagerContract.interface.parseError(error.data); console.error("    Contract error:", errorData.name, errorData.args); } catch (e) { /*ignore*/ } }
        return { success: false, collected: false, message: error.reason || error.message || "Error during fee collection." };
    }
}
 

module.exports = {
    getUncollectedFees,
    collectFees  
};