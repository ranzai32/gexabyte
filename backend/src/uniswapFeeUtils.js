// uniswapFeeUtils.js
const { ethers } = require('ethers'); // Убрал wallet, TokenA, TokenB из этого импорта, они здесь не нужны для getUncollectedFees
const { UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, CHAIN_ID, provider: globalProvider } = require('./config'); // Добавил CHAIN_ID и provider (если он глобальный)
const { INonfungiblePositionManagerABI } = require('./uniswapPositionUtils');
const { Token: UniswapToken } = require('@uniswap/sdk-core'); // Нужен для возврата информации о токенах
const { getTokenDetailsByAddressOnBackend } = require('./constants/predefinedTokens'); // Предполагаем, что эта функция у вас есть и работает

async function getUncollectedFees(tokenId, signerOrProvider) { // Переименовал для ясности
    console.log(`[getUncollectedFees] Fetching uncollected fees for tokenId: ${tokenId}`);
    try {
        const positionManagerContract = new ethers.Contract(
            UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            signerOrProvider // Может быть как provider (для чтения), так и signer
        );

        // Вызов view-функции positions() для получения информации, включая tokensOwed0 и tokensOwed1
        const positionData = await positionManagerContract.positions(tokenId);

        if (!positionData || positionData.token0 === ethers.ZeroAddress) {
            console.warn(`[getUncollectedFees] Position ${tokenId} not found or invalid (token0 is zero address).`);
            return { // Возвращаем нулевые значения, если позиция не найдена или недействительна
                feesAmount0: '0',
                feesAmount1: '0',
                feeToken0: null,
                feeToken1: null
            };
        }
        
        // Получаем детали токенов, чтобы вернуть их вместе с суммами
        // Это полезно для фронтенда, чтобы знать, какие это токены и их decimals
        const token0Details = await getTokenDetailsByAddressOnBackend(positionData.token0);
        const token1Details = await getTokenDetailsByAddressOnBackend(positionData.token1);

        let feeToken0Data = null;
        let feeToken1Data = null;

        if (token0Details) {
            // Не создаем здесь объект UniswapToken, просто возвращаем данные
            feeToken0Data = { address: positionData.token0, symbol: token0Details.symbol, decimals: token0Details.decimals };
        } else {
            console.warn(`[getUncollectedFees] Could not get details for token0 ${positionData.token0} of position ${tokenId}`);
        }

        if (token1Details) {
            feeToken1Data = { address: positionData.token1, symbol: token1Details.symbol, decimals: token1Details.decimals };
        } else {
            console.warn(`[getUncollectedFees] Could not get details for token1 ${positionData.token1} of position ${tokenId}`);
        }
        
        console.log(`[getUncollectedFees] Fees for ${tokenId}: owed0=${positionData.tokensOwed0.toString()}, owed1=${positionData.tokensOwed1.toString()}`);

        return {
            feesAmount0: positionData.tokensOwed0.toString(),
            feesAmount1: positionData.tokensOwed1.toString(),
            feeToken0: feeToken0Data,
            feeToken1: feeToken1Data
        };

    } catch (error) {
        console.error(`  Error calculating fees for position ${tokenId}:`, error.message);
        // Не логируем здесь детали ошибки контракта, так как positions() - это view-функция
        // и ошибка "Not approved" от нее маловероятна. Скорее, это будет ошибка сети или RPC.
        return null; // Возвращаем null в случае любой другой ошибки
    }
}

// Ваша функция collectFees остается без изменений, так как она предназначена для отправки транзакции
// и должна использовать walletSigner
async function collectFees(tokenId, walletSigner) {
    // ... (ваш существующий код collectFees) ...
    // Убедитесь, что TokenA, TokenB и wallet импортируются правильно, если они здесь нужны
    // const { TokenA, TokenB, wallet } = require('./config'); // Может быть нужно здесь
    // recipient в collectParams должен быть адресом пользователя, а не wallet.address оператора, если вы хотите, чтобы пользователь получил комиссии.
    // Если оператор собирает на себя, то wallet.address.
    // Для автоуправления, сбор должен идти на userAddress. Для ручного сбора на фронте - на userAddress.
    // Убедитесь, что ERC20_ABI импортируется или определен, если он нужен.
    // const { ERC20_ABI: FeeERC20_ABI } = require('./erc20Utils');
    const { TokenA, TokenB } = require('./config'); // Пример, если TokenA, TokenB глобальные

    const nftPositionManagerContract = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, walletSigner);
    const MAX_UINT128 = (2n ** 128n) - 1n;
    // Получатель должен быть адресом владельца NFT (userAddress)
    const recipientAddress = await walletSigner.getAddress(); // или userAddress, если это операция от имени пользователя
    const collectParams = { tokenId: tokenId, recipient: recipientAddress, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
     
    try {
        // staticCall для проверки, что есть что собирать и оценка результатов
        const staticCallResult = await nftPositionManagerContract.collect.staticCall(collectParams, { from: await walletSigner.getAddress() });
        const feesToCollect0 = staticCallResult.amount0;
        const feesToCollect1 = staticCallResult.amount1;
        
        const positionInfoForDisplay = await nftPositionManagerContract.positions(tokenId); // Это view, можно и с provider
        let displayToken0, displayToken1;
        // Логика сопоставления TokenA/TokenB с positionInfoForDisplay.token0/token1 может быть сложной,
        // если TokenA/TokenB не соответствуют токенам конкретной позиции.
        // Лучше использовать детали токенов, полученные из positionInfoForDisplay.token0/token1
        const detailsT0 = await getTokenDetailsByAddressOnBackend(positionInfoForDisplay.token0);
        const detailsT1 = await getTokenDetailsByAddressOnBackend(positionInfoForDisplay.token1);

        if(detailsT0) displayToken0 = { address: positionInfoForDisplay.token0, ...detailsT0}; else displayToken0 = { address: positionInfoForDisplay.token0, symbol: 'T0?', decimals: 18};
        if(detailsT1) displayToken1 = { address: positionInfoForDisplay.token1, ...detailsT1}; else displayToken1 = { address: positionInfoForDisplay.token1, symbol: 'T1?', decimals: 18};

         
        if (feesToCollect0 === 0n && feesToCollect1 === 0n) { 
            console.log(`[collectFees] No fees to collect for tokenId ${tokenId}.`); 
            return { success: true, collected: false, message: "No fees to collect." }; // Успешно, но ничего не собрано
        }
       
        console.log(`[collectFees] Attempting to collect fees for ${tokenId}: ${ethers.formatUnits(feesToCollect0, displayToken0.decimals)} ${displayToken0.symbol}, ${ethers.formatUnits(feesToCollect1, displayToken1.decimals)} ${displayToken1.symbol}`);
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