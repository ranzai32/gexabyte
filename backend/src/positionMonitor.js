const { provider, wallet, TokenA, TokenB } = require('./config');  
const { getPoolData } = require('./uniswapPoolUtils');
const { getPositionDetails, withdrawFullLiquidity } = require('./uniswapPositionUtils');

let isRebalancing = false;  

async function monitorPositionAndPool(tokenId, poolTokenA, poolTokenB, poolFeeTier, walletSigner) {
    if (isRebalancing) {
         
        return;
    }
     
    try {
        const positionDetails = await getPositionDetails(tokenId, walletSigner);  
        if (!positionDetails) {
             
            return;
        }
        const { tickLower: positionTickLower, tickUpper: positionTickUpper, liquidity: positionLiquidity } = positionDetails;
        if (positionLiquidity === 0n) {
             
            return;
        }
         
        const currentPool = await getPoolData(poolTokenA, poolTokenB, poolFeeTier);
        if (!currentPool) {
            
            return;
        }
        const currentPoolTick = currentPool.tickCurrent;
         
        let priceOutOfRange = false;
        if (currentPoolTick < Number(positionTickLower)) {
             
            priceOutOfRange = true;
        } else if (currentPoolTick > Number(positionTickUpper)) {
             
            priceOutOfRange = true;
        } else {
            
        }

        if (priceOutOfRange && !isRebalancing) {
            isRebalancing = true; 
            console.log(`!!! АВТОУПРАВЛЕНИЕ: Инициируем изъятие ликвидности для Token ID: ${tokenId} !!!`);
            const withdrawalSuccess = await withdrawFullLiquidity(tokenId, walletSigner); 
            if (withdrawalSuccess) {
                 
                // Для полноценного цикла: isRebalancing = false; после всех шагов.
                // Так как позиция сожжена, дальнейший мониторинг этого tokenId не имеет смысла без создания новой.
            } else {
                console.error(`  Автоуправление: Ошибка при изъятии ликвидности для ${tokenId}.`);
                isRebalancing = false; 
            }
        }
    } catch (error) {
        console.error("  Ошибка во время мониторинга:", error.message);
        isRebalancing = false; 
    }
}

function startMonitoring(tokenId, poolTokenA, poolTokenB, poolFeeTier, walletSigner, intervalMs) {
     
    
    monitorPositionAndPool(tokenId, poolTokenA, poolTokenB, poolFeeTier, walletSigner); // Первая проверка сразу
    
    const intervalId = setInterval(async () => {
        await monitorPositionAndPool(tokenId, poolTokenA, poolTokenB, poolFeeTier, walletSigner);
    }, intervalMs);
    return intervalId; // Возвращаем ID для возможной остановки
}


module.exports = {
    startMonitoring,
    // monitorPositionAndPool // Если хотите вызывать ее напрямую из app.js
};