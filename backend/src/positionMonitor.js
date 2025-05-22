const { provider, wallet, TokenA, TokenB } = require('./config'); // wallet нужен для withdrawFullLiquidity
const { getPoolData } = require('./uniswapPoolUtils');
const { getPositionDetails, withdrawFullLiquidity } = require('./uniswapPositionUtils');

let isRebalancing = false; // Флаг для предотвращения одновременных операций ребалансировки

async function monitorPositionAndPool(tokenId, poolTokenA, poolTokenB, poolFeeTier, walletSigner) {
    if (isRebalancing) {
        console.log(`  Процесс ребалансировки уже запущен для ${tokenId}. Пропускаем этот цикл мониторинга.`);
        return;
    }
    console.log(`\n--- Мониторинг позиции ${tokenId} и пула ${poolTokenA.symbol}/${poolTokenB.symbol} (Fee: ${poolFeeTier/10000}%) ---`);
    try {
        const positionDetails = await getPositionDetails(tokenId, walletSigner); // Используем walletSigner (или provider, если только читаем)
        if (!positionDetails) {
            console.log(`Не удалось получить детали для позиции ${tokenId}.`);
            return;
        }
        const { tickLower: positionTickLower, tickUpper: positionTickUpper, liquidity: positionLiquidity } = positionDetails;
        if (positionLiquidity === 0n) {
            console.log(`Позиция ${tokenId} не содержит ликвидности. Мониторинг завершен.`);
            return;
        }
        console.log(`  Диапазон отслеживаемой позиции ${tokenId}: TickLower=${positionTickLower.toString()}, TickUpper=${positionTickUpper.toString()}`);
        const currentPool = await getPoolData(poolTokenA, poolTokenB, poolFeeTier);
        if (!currentPool) {
            console.log("Не удалось получить данные пула.");
            return;
        }
        const currentPoolTick = currentPool.tickCurrent;
        console.log(`  Текущий тик пула: ${currentPoolTick}`);
        let priceOutOfRange = false;
        if (currentPoolTick < Number(positionTickLower)) {
            console.log(`  🔴 СТАТУС: Цена НИЖЕ диапазона позиции! (Pool: ${currentPoolTick} < PositionLower: ${positionTickLower})`);
            priceOutOfRange = true;
        } else if (currentPoolTick > Number(positionTickUpper)) {
            console.log(`  🔴 СТАТУС: Цена ВЫШЕ диапазона позиции! (Pool: ${currentPoolTick} > PositionUpper: ${positionTickUpper})`);
            priceOutOfRange = true;
        } else {
            console.log(`  🟢 СТАТУС: Цена ВНУТРИ диапазона позиции. (PositionLower: ${positionTickLower} <= Pool: ${currentPoolTick} <= PositionUpper: ${positionTickUpper})`);
        }

        if (priceOutOfRange && !isRebalancing) {
            isRebalancing = true; 
            console.log(`!!! АВТОУПРАВЛЕНИЕ: Инициируем изъятие ликвидности для Token ID: ${tokenId} !!!`);
            const withdrawalSuccess = await withdrawFullLiquidity(tokenId, walletSigner); 
            if (withdrawalSuccess) {
                console.log(`  Автоуправление: Ликвидность для ${tokenId} успешно изъята.`);
                console.log("  Автоуправление: Следующие шаги (обмен, повторное внесение) пока не реализованы.");
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
    console.log(`\nЗапускаем мониторинг для Token ID ${tokenId} каждые ${intervalMs / 1000} секунд...`);
    console.log("Нажмите Ctrl+C для остановки.");
    
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