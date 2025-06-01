const { ethers } = require('ethers');
const { UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, CHAIN_ID, provider: globalProvider } = require('./config');
const { INonfungiblePositionManagerABI } = require('./uniswapPositionUtils'); // Убедитесь, что INonfungiblePositionManagerABI экспортируется здесь или импортируется правильно
const { getTokenDetailsByAddressOnBackend } = require('./constants/predefinedTokens');

async function getUncollectedFees(tokenId, signerOrProvider) {
    console.log(`[getUncollectedFees] Fetching uncollected fees for tokenId: ${tokenId} using enhanced method.`);
    try {
        const positionManagerContract = new ethers.Contract(
            UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            signerOrProvider
        );

        const positionData = await positionManagerContract.positions(tokenId);

        if (!positionData || positionData.token0 === ethers.ZeroAddress) {
            console.warn(`[getUncollectedFees] Position ${tokenId} not found or invalid (token0 is zero address).`);
            return {
                feesAmount0: '0',
                feesAmount1: '0',
                tokensOwed0_struct: '0',
                tokensOwed1_struct: '0',
                feeToken0: null,
                feeToken1: null,
                source: 'position_struct_invalid',
                staticCallError: null
            };
        }
        
        const tokensOwed0FromStruct = positionData.tokensOwed0;
        const tokensOwed1FromStruct = positionData.tokensOwed1;
        console.log(`[getUncollectedFees] From positions() struct for ${tokenId}: owed0=${tokensOwed0FromStruct.toString()}, owed1=${tokensOwed1FromStruct.toString()}`);

        const MAX_UINT128 = (2n ** 128n) - 1n;
        // Для staticCall получатель может быть любым, если контракт не требует иного.
        // Если signerOrProvider - это signer, его адрес будет использован по умолчанию для from, 
        // а recipient здесь - куда гипотетически пойдут средства.
        const recipientForStaticCall = (typeof signerOrProvider.getAddress === 'function') 
                                       ? await signerOrProvider.getAddress() 
                                       : ethers.ZeroAddress;

        const collectParams = {
            tokenId: tokenId,
            recipient: recipientForStaticCall, 
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128
        };
        
        let feesFromStaticCall0 = 0n;
        let feesFromStaticCall1 = 0n;
        let staticCallErrorMsg = null;

        try {
            console.log(`[getUncollectedFees] Performing collect.staticCall for tokenId ${tokenId}...`);
            const staticCallResult = await positionManagerContract.collect.staticCall(collectParams);
            feesFromStaticCall0 = staticCallResult.amount0;
            feesFromStaticCall1 = staticCallResult.amount1;
            console.log(`[getUncollectedFees] From collect.staticCall for ${tokenId}: fees0=${feesFromStaticCall0.toString()}, fees1=${feesFromStaticCall1.toString()}`);
        } catch (e) {
            staticCallErrorMsg = e.message;
            console.warn(`[getUncollectedFees] Error during collect.staticCall for ${tokenId}: ${e.message}. Using 0 for these fees.`);
        }

        const token0Details = await getTokenDetailsByAddressOnBackend(positionData.token0);
        const token1Details = await getTokenDetailsByAddressOnBackend(positionData.token1);

        const feeToken0Data = token0Details ? { address: positionData.token0, symbol: token0Details.symbol, decimals: token0Details.decimals } : null;
        const feeToken1Data = token1Details ? { address: positionData.token1, symbol: token1Details.symbol, decimals: token1Details.decimals } : null;
        
        return {
            feesAmount0: feesFromStaticCall0.toString(),
            feesAmount1: feesFromStaticCall1.toString(),
            tokensOwed0_struct: tokensOwed0FromStruct.toString(),
            tokensOwed1_struct: tokensOwed1FromStruct.toString(),
            feeToken0: feeToken0Data,
            feeToken1: feeToken1Data,
            source: 'static_call',
            staticCallError: staticCallErrorMsg
        };

    } catch (error) {
        console.error(`[getUncollectedFees] Outer error for position ${tokenId}:`, error.message);
        return {
            feesAmount0: '0',
            feesAmount1: '0',
            tokensOwed0_struct: '0',
            tokensOwed1_struct: '0',
            feeToken0: null,
            feeToken1: null,
            source: 'outer_error',
            staticCallError: error.message
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
        const staticCallResult = await nftPositionManagerContract.collect.staticCall(collectParams); // from не нужен для signers в ethers v6
        const feesToCollect0 = staticCallResult.amount0;
        const feesToCollect1 = staticCallResult.amount1;
        
        const positionInfoForDisplay = await nftPositionManagerContract.positions(tokenId);
        const detailsT0 = await getTokenDetailsByAddressOnBackend(positionInfoForDisplay.token0);
        const detailsT1 = await getTokenDetailsByAddressOnBackend(positionInfoForDisplay.token1);

        const displayToken0 = detailsT0 ? { address: positionInfoForDisplay.token0, ...detailsT0} : { address: positionInfoForDisplay.token0, symbol: 'T0?', decimals: 18};
        const displayToken1 = detailsT1 ? { address: positionInfoForDisplay.token1, ...detailsT1} : { address: positionInfoForDisplay.token1, symbol: 'T1?', decimals: 18};
        
        if (feesToCollect0 === 0n && feesToCollect1 === 0n) { 
            console.log(`[collectFees] No fees to collect for tokenId ${tokenId}.`); 
            return { success: true, collected: false, message: "No fees to collect." };
        }
       
        console.log(`[collectFees] Fees available for collection: ${ethers.formatUnits(feesToCollect0, displayToken0.decimals)} ${displayToken0.symbol}, ${ethers.formatUnits(feesToCollect1, displayToken1.decimals)} ${displayToken1.symbol}`);
        const tx = await nftPositionManagerContract.collect(collectParams);
        console.log(`[collectFees] Collect transaction sent: ${tx.hash} for tokenId ${tokenId}. Waiting for confirmation...`);
       
        const receipt = await tx.wait(1);
         
        if (receipt.status === 1) {
            console.log(`[collectFees] Fees collected successfully for tokenId ${tokenId}. Tx: ${tx.hash}`);
            // Здесь можно добавить обновление данных в БД, если это необходимо
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