const { ethers, provider, wallet, TokenA, TokenB, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS } = require('./src/config');
const { FeeAmount, Position } = require('@uniswap/v3-sdk'); // Position нужен для минтинга
const { getPoolData } = require('./src/uniswapPoolUtils');
const { approveToken } = require('./src/erc20Utils');
const { getPositionDetails, increaseLiquidityForPosition, decreaseLiquidityPartially, withdrawFullLiquidity, INonfungiblePositionManagerABI } = require('./src/uniswapPositionUtils');
const { getUncollectedFees, collectFees } = require('./src/uniswapFeeUtils');
const { startMonitoring } = require('./src/positionMonitor');
const ACTION = process.env.ACTION || "MONITOR";
const TOKEN_ID_TO_MANAGE = parseInt(process.env.TOKEN_ID_TO_MANAGE) || 198164;

// Основная логика приложения
async function main() {
     

    try {
        const blockNumber = await provider.getBlockNumber();
         

        const ethBalance = await provider.getBalance(wallet.address);
         

        const { ERC20_ABI: MainERC20_ABI } = require('./src/erc20Utils');
        const tokenAContract = new ethers.Contract(TokenA.address, MainERC20_ABI, provider);
        const tokenBContract = new ethers.Contract(TokenB.address, MainERC20_ABI, provider);
        const balanceA_wei = await tokenAContract.balanceOf(wallet.address);
        const balanceB_wei = await tokenBContract.balanceOf(wallet.address);
         

        // --- Выберите действие ---
 
         
         
          // ID для управления (если не MINT)
        
         
        if (ACTION !== "MINT") {
            
             
        }


        if (ACTION === "MINT") {
            // --- Логика создания новой позиции (минтинг) ---
             
            const selectedFeeTierMint = FeeAmount.LOW; // 0.05%
            const currentPoolMint = await getPoolData(TokenA, TokenB, selectedFeeTierMint);

            if (!currentPoolMint) {
                 
                return;
            }

            const tickSpacingMint = currentPoolMint.tickSpacing;
            const currentTickMint = currentPoolMint.tickCurrent;
            const tickRangeWidthMint = 50 * tickSpacingMint; // Ширина диапазона
            const tickLowerMint = Math.floor((currentTickMint - tickRangeWidthMint) / tickSpacingMint) * tickSpacingMint;
            const tickUpperMint = Math.ceil((currentTickMint + tickRangeWidthMint) / tickSpacingMint) * tickSpacingMint;

             

            const amountTokenAToProvideMint_str = "0.00005"; // Сумма WETH
            const amountTokenAToProvideMint_wei = ethers.parseUnits(amountTokenAToProvideMint_str, TokenA.decimals);

            if (balanceA_wei < amountTokenAToProvideMint_wei) {
                 console.error(`Недостаточно ${TokenA.symbol} для минтинга.`); return;
            }

            let positionToMint;
            const amountTokenAWeiString = amountTokenAToProvideMint_wei.toString();
            if (TokenA.equals(currentPoolMint.token0)) {
                positionToMint = Position.fromAmount0({ pool: currentPoolMint, tickLower: tickLowerMint, tickUpper: tickUpperMint, amount0: amountTokenAWeiString, useFullPrecision: true });
            } else {
                positionToMint = Position.fromAmount1({ pool: currentPoolMint, tickLower: tickLowerMint, tickUpper: tickUpperMint, amount1: amountTokenAWeiString, useFullPrecision: true });
            }
            
            const { amount0: amount0ToMint_JSBI, amount1: amount1ToMint_JSBI } = positionToMint.mintAmounts;

            // Проверка баланса второго токена
            let requiredTokenB_JSBI_forMint;
            if (TokenB.equals(currentPoolMint.token0)) { requiredTokenB_JSBI_forMint = amount0ToMint_JSBI; } 
            else { requiredTokenB_JSBI_forMint = amount1ToMint_JSBI; }
            if (balanceB_wei < BigInt(requiredTokenB_JSBI_forMint.toString())) {
                console.error(`Недостаточно ${TokenB.symbol} для минтинга.`); return;
            }

            await approveToken(currentPoolMint.token0, amount0ToMint_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, wallet);
            await approveToken(currentPoolMint.token1, amount1ToMint_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, wallet);

            const nftPositionManagerContract = new ethers.Contract(UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, INonfungiblePositionManagerABI, wallet);
            const mintOptions = {
                token0: currentPoolMint.token0.address, token1: currentPoolMint.token1.address, fee: currentPoolMint.fee,
                tickLower: tickLowerMint, tickUpper: tickUpperMint,
                amount0Desired: amount0ToMint_JSBI.toString(), amount1Desired: amount1ToMint_JSBI.toString(),
                amount0Min: "0", amount1Min: "0", recipient: wallet.address,
                deadline: Math.floor(Date.now() / 1000) + 60 * 20
            };
             
            try {
                const mintTx = await nftPositionManagerContract.mint(mintOptions);
                 
                const receipt = await mintTx.wait(1);
                 
                const eventInterface = new ethers.Interface(INonfungiblePositionManagerABI);
                let newMintedTokenId = null;
                for (const log of receipt.logs) {
                    try { const parsedLog = eventInterface.parseLog(log); if (parsedLog && parsedLog.name === "IncreaseLiquidity") { newMintedTokenId = parsedLog.args.tokenId; break; }
                    } catch (e) { /*ignore*/ }
                }
                if (newMintedTokenId !== null) {
                     
                    await getPositionDetails(newMintedTokenId, provider);
                    await getUncollectedFees(newMintedTokenId, provider);
                } else {  }
            } catch (mintError) { console.error("Ошибка при минте новой позиции:", mintError.reason || mintError.message); }

        } else if (ACTION === "GET_INFO") {
            await getPositionDetails(TOKEN_ID_TO_MANAGE, provider);
            await getUncollectedFees(TOKEN_ID_TO_MANAGE, provider);
        } else if (ACTION === "COLLECT_FEES") {
            await collectFees(TOKEN_ID_TO_MANAGE, wallet);
        } else if (ACTION === "INCREASE") {
            const amountWethToADD = process.env.INCREASE_WETH_AMOUNT || "0.0001";
            await increaseLiquidityForPosition(TOKEN_ID_TO_MANAGE, amountWethToADD, wallet);
        } else if (ACTION === "DECREASE") {
            const percentageToWithdraw = parseInt(process.env.DECREASE_PERCENTAGE) || 50;
            await decreaseLiquidityPartially(TOKEN_ID_TO_MANAGE, percentageToWithdraw, wallet);
        } else if (ACTION === "WITHDRAW") {
            await withdrawFullLiquidity(TOKEN_ID_TO_MANAGE, wallet);
        } else if (ACTION === "MONITOR") {
             
            const monitoredPoolFeeTier = FeeAmount.LOW; // Предполагаем, что позиция в этом пуле
            const monitoringIntervalMs = parseInt(process.env.MONITOR_INTERVAL_MS) || 30000;
            startMonitoring(TOKEN_ID_TO_MANAGE, TokenA, TokenB, monitoredPoolFeeTier, wallet, monitoringIntervalMs);
            // Для остановки мониторинга через некоторое время (пример):
            // setTimeout(() => clearInterval(intervalId), 300000); // Остановить через 5 минут
            // Поскольку startMonitoring теперь не возвращает intervalId напрямую в main,
            // логика остановки должна быть внутри startMonitoring или через другой механизм.
            // Для простого CLI скрипта, Ctrl+C будет основным способом остановки.
             
            // Удерживаем процесс активным (для setInterval)
            // await new Promise(resolve => setTimeout(resolve, 3600000)); // держим час, например
        } else {
             
        }

    } catch (error) {
        console.error("\nПроизошла глобальная ошибка в main:", error);
         process.exit(1);
    }
    
    // Если не мониторинг, то можно завершить процесс
    if (ACTION !== "MONITOR") {
         
    }
}

main().catch(mainError => {
    console.error("Критическая ошибка при вызове main:", mainError);
    process.exit(1);
});