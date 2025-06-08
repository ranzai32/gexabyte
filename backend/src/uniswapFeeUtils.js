const { ethers } = require('ethers');
const { UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, provider: globalProvider, wallet } = require('./config');
const { INonfungiblePositionManagerABI } = require('./uniswapPositionUtils');  
const { getTokenDetailsByAddressOnBackend } = require('./constants/predefinedTokens');

async function getUncollectedFees(tokenId, provider) {
    console.log(`[getUncollectedFees] Fetching uncollected fees via collect.staticCall for tokenId: ${tokenId}`);
    
    const currentProvider = provider || globalProvider;

    const positionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        currentProvider
    );

    try {
        // Сначала получаем информацию о токенах в позиции
        const positionData = await positionManagerContract.positions(tokenId);

        if (!positionData || positionData.token0 === ethers.ZeroAddress) {
            console.warn(`[getUncollectedFees] Position ${tokenId} not found or invalid (token0 is zero address).`);
            return { feesAmount0: '0', feesAmount1: '0', feeToken0: null, feeToken1: null };
        }

        const token0Details = getTokenDetailsByAddressOnBackend(positionData.token0);
        const token1Details = getTokenDetailsByAddressOnBackend(positionData.token1);

        if (!token0Details || !token1Details) {
            throw new Error("Could not get details for one of the tokens in the position.");
        }

        // Для staticCall нам нужен адрес получателя, но так как транзакция не отправляется,
        // можно использовать любой адрес. Используем адрес нашего бэкенд-кошелька для консистентности.
        const recipientAddress = wallet.address;
        const MAX_UINT128 = (2n ** 128n) - 1n;

        const collectParams = {
            tokenId: tokenId,
            recipient: recipientAddress,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128
        };

        // Симулируем вызов collect, чтобы получить точные текущие комиссии
        const collectResult = await positionManagerContract.collect.staticCall(
            collectParams,
            // Для staticCall от имени владельца, нужно передать from, но для расчета комиссий это не обязательно,
            // так как комиссия не зависит от того, кто ее запрашивает.
            // Если возникнет ошибка прав, нужно будет передать { from: ownerAddress }
        );
        
        const feesAmount0 = collectResult.amount0;
        const feesAmount1 = collectResult.amount1;
        
        console.log(`[getUncollectedFees] Uncollected fees from staticCall for ${tokenId}: amount0=${feesAmount0.toString()}, amount1=${feesAmount1.toString()}`);

        return {
            feesAmount0: feesAmount0.toString(),
            feesAmount1: feesAmount1.toString(),
            feeToken0: {
                address: positionData.token0,
                symbol: token0Details.symbol,
                decimals: token0Details.decimals
            },
            feeToken1: {
                address: positionData.token1,
                symbol: token1Details.symbol,
                decimals: token1Details.decimals
            },
            source: 'collect_static_call'
        };

    } catch (error) {
        console.error(`[getUncollectedFees] Error fetching fees via staticCall for tokenId ${tokenId}:`, error.message);
        // Если возникает ошибка 'Not approved', это означает, что у адреса, от имени которого делается вызов,
        // нет прав на эту позицию. Для staticCall это менее вероятно, но возможно на некоторых нодах.
        if (error.reason === 'Not approved' || (error.data && error.data.includes('Not approved'))) {
             console.warn(`[getUncollectedFees] The configured wallet may not be approved for tokenId ${tokenId}. The 'Not approved' error was caught.`);
        }
        return { feesAmount0: '0', feesAmount1: '0', feeToken0: null, feeToken1: null, error: error.message };
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