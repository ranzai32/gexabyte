const { ethers } = require('ethers');
// Предполагается, что эти файлы находятся в тех же относительных путях, что и в autoManageService.js
// Переходим из src/scripts/ -> в src/ -> и затем в корень backend/
const { provider, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS } = require('../config');
// Переходим из src/scripts/ -> в src/
const { INonfungiblePositionManagerABI } = require('../uniswapPositionUtils');
const { getTokenDetailsByAddressOnBackend } = require('../constants/predefinedTokens');

/**
 * Проверяет накопленные комиссии для указанной NFT-позиции Uniswap V3.
 * @param {string | number} tokenId ID токена NFT-позиции.
 */
async function checkAccumulatedFees(tokenId) {
    if (!tokenId) {
        console.error("Ошибка: Не указан ID токена (tokenId).");
        console.log("Пример использования: node scripts/checkFees.js 123456");
        return;
    }

    console.log(`🔍 Проверка накопленных комиссий для NFT-позиции #${tokenId}...`);

    try {
        // Инициализируем контракт менеджера позиций
        const positionManager = new ethers.Contract(
            UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            provider // Используем provider, так как это read-only операция
        );

        // --- Шаг 1: Получаем основную информацию о позиции, включая адреса токенов ---
        const positionInfo = await positionManager.positions(tokenId);
        if (positionInfo.liquidity === 0n && positionInfo.fee.toString() === '0') {
            const owner = await positionManager.ownerOf(tokenId).catch(() => null);
            if (!owner) {
                 console.warn(`⚠️ Позиция #${tokenId} не найдена или была сожжена.`);
                 return;
            }
        }
        
        const token0Address = positionInfo.token0;
        const token1Address = positionInfo.token1;

        console.log(`   - Адрес токена 0: ${token0Address}`);
        console.log(`   - Адрес токена 1: ${token1Address}`);

        // --- Шаг 2: Безопасно запрашиваем размер комиссий через staticCall ---
        // staticCall симулирует выполнение транзакции и возвращает результат, не отправляя ее в блокчейн.
        // Это стандартный способ для read-only запросов к функциям, которые изменяют состояние.
        const MAX_UINT128 = (2n ** 128n) - 1n;

        const feeAmounts = await positionManager.collect.staticCall({
            tokenId: tokenId,
            recipient: ethers.ZeroAddress, // Адрес получателя не важен для staticCall
            amount0Max: MAX_UINT128,      // Запрашиваем максимально возможное количество
            amount1Max: MAX_UINT128       // Запрашиваем максимально возможное количество
        });

        const amount0Fees = feeAmounts.amount0;
        const amount1Fees = feeAmounts.amount1;
        
        // --- Шаг 3: Форматируем и выводим результат ---
        const token0Details = await getTokenDetailsByAddressOnBackend(token0Address);
        const token1Details = await getTokenDetailsByAddressOnBackend(token1Address);

        if (!token0Details || !token1Details) {
            console.error("Не удалось получить информацию (символ, десятичные) для одного из токенов.");
            // Выводим сырые данные, если детали токена не найдены
            console.log(`\n✅ Результат (сырые данные):`);
            console.log(`   - Комиссии в токене 0: ${amount0Fees.toString()} (wei)`);
            console.log(`   - Комиссии в токене 1: ${amount1Fees.toString()} (wei)`);
            return;
        }

        const formattedAmount0 = ethers.formatUnits(amount0Fees, token0Details.decimals);
        const formattedAmount1 = ethers.formatUnits(amount1Fees, token1Details.decimals);
        
        console.log(`\n✅ Результат:`);
        console.log(`   - Накопленные комиссии в ${token0Details.symbol}: ${formattedAmount0}`);
        console.log(`   - Накопленные комиссии в ${token1Details.symbol}: ${formattedAmount1}`);
        console.log(`\n   (Сырые значения: ${amount0Fees.toString()} для ${token0Details.symbol}, ${amount1Fees.toString()} для ${token1Details.symbol})`);

    } catch (error) {
        if (error.message.includes('Invalid token ID')) {
             console.error(`\n❌ Ошибка: Указанный ID токена #${tokenId} недействителен или не существует.`);
        } else {
             console.error(`\n❌ Произошла ошибка при проверке комиссий для #${tokenId}:`, error);
        }
    }
}

// Получаем tokenId из аргументов командной строки
const tokenIdFromArgs = process.argv[2];
checkAccumulatedFees(tokenIdFromArgs);