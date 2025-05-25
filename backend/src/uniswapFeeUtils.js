const { ethers, wallet, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, TokenA, TokenB } = require('./config');
const { INonfungiblePositionManagerABI } = require('./uniswapPositionUtils');  

async function getUncollectedFees(tokenId, walletSignerOrProvider) {
    // ... (код вашей функции getUncollectedFees) ...
    // Убедитесь, что она использует импортированные TokenA, TokenB
     
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSignerOrProvider
    );
    const MAX_UINT128 = (2n ** 128n) - 1n;
    const collectParams = { tokenId: tokenId, recipient: wallet.address, amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };

    try {
         
        const result = await nftPositionManagerContract.collect.staticCall(collectParams);
        const feesAmount0 = result.amount0; 
        const feesAmount1 = result.amount1;
        const positionInfoForFees = await nftPositionManagerContract.positions(tokenId);
        let feeToken0, feeToken1;
        if (TokenA.address.toLowerCase() === positionInfoForFees.token0.toLowerCase()) { feeToken0 = TokenA; feeToken1 = TokenB; } 
        else if (TokenB.address.toLowerCase() === positionInfoForFees.token0.toLowerCase()) { feeToken0 = TokenB; feeToken1 = TokenA; } 
        else { console.error("  Не удалось сопоставить токены для отображения комиссий."); return { feesAmount0, feesAmount1 }; }
         
         
        return { feesAmount0, feesAmount1, feeToken0, feeToken1 };
    } catch (error) {
        console.error(`  Ошибка при расчете комиссий для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) { try { const errorData = nftPositionManagerContract.interface.parseError(error.data); console.error("    Ошибка контракта:", errorData.name, errorData.args); } catch (e) { /*ignore*/ } }
        return null;
    }
}

async function collectFees(tokenId, walletSigner) {
    // ... (код вашей функции collectFees) ...
     
    const nftPositionManagerContract = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, walletSigner);
    const MAX_UINT128 = (2n ** 128n) - 1n;
    const collectParams = { tokenId: tokenId, recipient: await walletSigner.getAddress(), amount0Max: MAX_UINT128, amount1Max: MAX_UINT128 };
     
    try {
        const staticCallResult = await nftPositionManagerContract.collect.staticCall(collectParams, { from: await walletSigner.getAddress() });
        const feesToCollect0 = staticCallResult.amount0;
        const feesToCollect1 = staticCallResult.amount1;
        const positionInfoForDisplay = await nftPositionManagerContract.positions(tokenId);
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === positionInfoForDisplay.token0.toLowerCase()) { displayToken0 = TokenA; displayToken1 = TokenB; } 
        else if (TokenB.address.toLowerCase() === positionInfoForDisplay.token0.toLowerCase()) { displayToken0 = TokenB; displayToken1 = TokenA; } 
        else { console.error("  Не удалось сопоставить токены для отображения комиссий."); return false; }
         
        if (feesToCollect0 === 0n && feesToCollect1 === 0n) { console.log("  Нет комиссий для сбора."); return false; }
       
        const tx = await nftPositionManagerContract.collect(collectParams);
       
        const receipt = await tx.wait(1);
         
        if (receipt.status === 1) {
             
            const { ERC20_ABI: FeeERC20_ABI } = require('./erc20Utils');
            const token0Contract = new ethers.Contract(displayToken0.address, FeeERC20_ABI, walletSigner);
            const token1Contract = new ethers.Contract(displayToken1.address, FeeERC20_ABI, walletSigner);
            const balance0After = await token0Contract.balanceOf(walletSigner.address);
            const balance1After = await token1Contract.balanceOf(walletSigner.address);
           
            return true;
        } else { console.error("  Транзакция collect была отменена (reverted)."); return false; }
    } catch (error) {
        console.error(`  Ошибка при сборе комиссий для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) { try { const errorData = nftPositionManagerContract.interface.parseError(error.data); console.error("    Ошибка контракта:", errorData.name, errorData.args); } catch (e) { /*ignore*/ } }
        return false;
    }
}

module.exports = {
    getUncollectedFees,
    collectFees
};