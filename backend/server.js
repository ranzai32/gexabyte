// backend/server.js
require('dotenv').config({ path: './.env' }); // Убедитесь, что .env в корне backend

const express = require('express');
const cors = require('cors');

// Импортируем необходимые части из вашей существующей конфигурации и утилит
// Пути должны быть относительны server.js
const { provider, TokenA, TokenB, CHAIN_ID } = require('./src/config'); //
const { getPoolData } = require('./src/uniswapPoolUtils'); //
const { getPositionDetails } = require('./src/uniswapPositionUtils'); //
const { getUncollectedFees } = require('./src/uniswapFeeUtils'); //
const { Token: UniswapToken } = require('@uniswap/sdk-core'); // Переименовываем, чтобы не конфликтовать с Token из config

const app = express();
const PORT = process.env.BACKEND_PORT || 3001; // Вы можете задать порт в .env или использовать 3001 по умолчанию

app.use(cors()); // Включаем CORS для всех маршрутов
app.use(express.json()); // Middleware для парсинга JSON в теле запроса

// Простой маршрут для проверки, что сервер работает
app.get('/', (req, res) => {
    res.send('Бэкенд сервер для Uniswap Interface работает!');
});

// --- Маршруты API ---

/**
 * Эндпоинт для получения данных о пуле.
 * Query параметры:
 * - tokenA_address: адрес первого токена
 * - tokenB_address: адрес второго токена
 * - feeTier: уровень комиссии пула (например, 500, 3000, 10000)
 * - tokenA_decimals: десятичные первого токена (опционально, по умолчанию 18)
 * - tokenB_decimals: десятичные второго токена (опционально, по умолчанию 6)
 * - tokenA_symbol: символ первого токена (опционально, по умолчанию TKA)
 * - tokenB_symbol: символ второго токена (опционально, по умолчанию TKB)
 */
app.get('/api/pool-data', async (req, res) => {
    const {
        tokenA_address,
        tokenB_address,
        feeTier,
        tokenA_decimals = 18, // Значения по умолчанию
        tokenB_decimals = 6,
        tokenA_symbol = 'TKA',
        tokenB_symbol = 'TKB'
    } = req.query;

    if (!tokenA_address || !tokenB_address || !feeTier) {
        return res.status(400).json({ error: "Missing required query parameters: tokenA_address, tokenB_address, feeTier" });
    }

    try {
        const parsedFeeTier = parseInt(feeTier);
        if (isNaN(parsedFeeTier)) {
            return res.status(400).json({ error: "Invalid feeTier" });
        }

        // Создаем объекты Token из SDK на основе полученных параметров
        // CHAIN_ID импортирован из вашего config.js
        const tA = new UniswapToken(CHAIN_ID, tokenA_address, parseInt(tokenA_decimals), tokenA_symbol);
        const tB = new UniswapToken(CHAIN_ID, tokenB_address, parseInt(tokenB_decimals), tokenB_symbol);

        console.log(`[API /pool-data] Запрос для <span class="math-inline">\{tA\.symbol\}/</span>{tB.symbol}, Fee: ${parsedFeeTier}`);

        const poolData = await getPoolData(tA, tB, parsedFeeTier);

        if (!poolData) {
            return res.status(404).json({ error: "Pool not found for the given parameters." });
        }

        res.json({
            token0: { address: poolData.token0.address, symbol: poolData.token0.symbol, decimals: poolData.token0.decimals },
            token1: { address: poolData.token1.address, symbol: poolData.token1.symbol, decimals: poolData.token1.decimals },
            token0Price: poolData.token0Price.toSignificant(6),
            token1Price: poolData.token1Price.toSignificant(6),
            tickCurrent: poolData.tickCurrent,
            fee: poolData.fee,
            sqrtPriceX96: poolData.sqrtRatioX96.toString(),
            liquidity: poolData.liquidity.toString()
        });
    } catch (error) {
        console.error("[API /pool-data] Error:", error.message);
        res.status(500).json({ error: "Failed to get pool data", details: error.message });
    }
});

/**
 * Эндпоинт для получения деталей NFT позиции и несобранных комиссий.
 * Path параметр:
 * - tokenId: ID NFT позиции
 */
app.get('/api/position-details/:tokenId', async (req, res) => {
    const { tokenId } = req.params;
    const parsedTokenId = parseInt(tokenId);

    if (isNaN(parsedTokenId)) {
        return res.status(400).json({ error: "Invalid tokenId parameter" });
    }

    try {
        console.log(`[API /position-details] Запрос для tokenId: ${parsedTokenId}`);
        // Для чтения данных используется provider из config.js
        const positionInfoRaw = await getPositionDetails(parsedTokenId, provider);

        if (!positionInfoRaw || positionInfoRaw.token0 === '0x0000000000000000000000000000000000000000') {
            return res.status(404).json({ error: `Position with tokenId ${parsedTokenId} not found or invalid.` });
        }
         
        // Преобразуем BigInt в строки для JSON-сериализации там, где это необходимо
        const positionInfo = {
             nonce: positionInfoRaw.nonce.toString(),
             operator: positionInfoRaw.operator,
             token0: positionInfoRaw.token0,
             token1: positionInfoRaw.token1,
             fee: Number(positionInfoRaw.fee),
             tickLower: Number(positionInfoRaw.tickLower),
             tickUpper: Number(positionInfoRaw.tickUpper),
             liquidity: positionInfoRaw.liquidity.toString(),
             feeGrowthInside0LastX128: positionInfoRaw.feeGrowthInside0LastX128.toString(),
             feeGrowthInside1LastX128: positionInfoRaw.feeGrowthInside1LastX128.toString(),
             tokensOwed0: positionInfoRaw.tokensOwed0.toString(),
             tokensOwed1: positionInfoRaw.tokensOwed1.toString()
        };

        const feesRaw = await getUncollectedFees(parsedTokenId, provider);
        let fees = null;
        if (feesRaw) {
            fees = {
                feesAmount0: feesRaw.feesAmount0.toString(),
                feesAmount1: feesRaw.feesAmount1.toString(),
                feeToken0: feesRaw.feeToken0 ? { address: feesRaw.feeToken0.address, symbol: feesRaw.feeToken0.symbol, decimals: feesRaw.feeToken0.decimals } : null,
                feeToken1: feesRaw.feeToken1 ? { address: feesRaw.feeToken1.address, symbol: feesRaw.feeToken1.symbol, decimals: feesRaw.feeToken1.decimals } : null,
            }
        }

        res.json({ positionInfo, fees });
    } catch (error) {
        console.error(`[API /position-details] Error for tokenId ${parsedTokenId}:`, error.message);
        res.status(500).json({ error: "Failed to get position details", details: error.message });
    }
});


// TODO: Добавить эндпоинты для операций, требующих подписи пользователя (они будут готовить параметры)
// Например: POST /api/prepare-mint, POST /api/prepare-collect-fees и т.д.

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Бэкенд сервер запущен на http://localhost:${PORT}`);
});