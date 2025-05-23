// backend/server.js
require('dotenv').config({ path: './.env' }); // Убедитесь, что .env в корне backend
const { ethers } = require('ethers'); 
const express = require('express');
const cors = require('cors');

// Импортируем необходимые части из вашей существующей конфигурации и утилит
// Пути должны быть относительны server.js
const { provider, TokenA, TokenB, CHAIN_ID } = require('./src/config'); //
const { getPoolData } = require('./src/uniswapPoolUtils'); //
const { getPositionDetails } = require('./src/uniswapPositionUtils'); //
const { getUncollectedFees } = require('./src/uniswapFeeUtils'); //
const { Token: UniswapToken } = require('@uniswap/sdk-core'); // Переименовываем, чтобы не конфликтовать с Token из config
const UNISWAP_V3_QUOTER_V2_ADDRESS = process.env.UNISWAP_V3_QUOTER_V2_ADDRESS;
const app = express();
const PORT = 3001;
const IQuoterV2_ABI = require('./src/abi/IQuoterV2_ABI.json');  

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

app.get('/api/quote', async (req, res) => {
    const {
        tokenFromAddress,
        tokenToAddress,
        amountFrom, // Ожидается сумма в наименьших единицах (wei-подобная) как строка
        feeTier,    // Например, "500", "3000", "10000"
        // Десятичные и символы можно не передавать, если адреса уникальны и известны
        // или если вы их будете получать из другого источника (например, предзагруженный список токенов на бэкенде)
    } = req.query;

    // const pool = await getPoolData(tFrom, tTo, parsedFeeTier); 
    // if (!pool) {
    //     console.warn(`[API /quote] Pool not found for <span class="math-inline">\{tFrom\.symbol\}/</span>{tTo.symbol} with fee ${parsedFeeTier}`);
    //     return res.status(404).json({ error: `Pool not found for <span class="math-inline">\{tFrom\.symbol\}/</span>{tTo.symbol} with fee ${parsedFeeTier / 10000}%` });
    // }

    if (!tokenFromAddress || !tokenToAddress || !amountFrom || !feeTier) {
        return res.status(400).json({ error: 'Missing required query parameters: tokenFromAddress, tokenToAddress, amountFrom, feeTier for quote.' });
    }

    if (!UNISWAP_V3_QUOTER_V2_ADDRESS) {
        console.error("[API /quote] Error: UNISWAP_V3_QUOTER_V2_ADDRESS is not defined in .env or config.");
        return res.status(500).json({ error: 'Quoter address not configured on server.' });
    }

    try {
        const parsedAmountFrom = ethers.getBigInt(amountFrom);
        const parsedFeeTier = parseInt(feeTier);

        if (isNaN(parsedFeeTier)) {
            return res.status(400).json({ error: "Invalid feeTier for quote." });
        }
        if (parsedAmountFrom <= 0n) {
            return res.status(400).json({ error: "Amount to swap must be positive." });
        }

        console.log(`[API /quote] Request: amount ${amountFrom} of ${tokenFromAddress} for ${tokenToAddress}, Fee: ${parsedFeeTier}`);

        const quoterContract = new ethers.Contract(
            UNISWAP_V3_QUOTER_V2_ADDRESS,
            IQuoterV2_ABI,
            provider // Quoter использует provider для чтения данных
        );

        const params = {
            tokenIn: tokenFromAddress,
            tokenOut: tokenToAddress,
            amountIn: parsedAmountFrom,
            fee: parsedFeeTier,
            sqrtPriceLimitX96: 0 // 0 означает отсутствие ограничения цены
        };

        // Вызов функции контракта QuoterV2
        // quoteExactInputSingle возвращает кортеж, нам нужен первый элемент amountOut
        const quoteResult = await quoterContract.quoteExactInputSingle.staticCall(params);
        const amountOut = quoteResult[0]; // Первый элемент это amountOut

        console.log(`[API /quote] Quoted amountOut: ${amountOut.toString()}`);

        res.json({
            amountTo: amountOut.toString(), // Возвращаем в наименьших единицах
            // Можно также вернуть другие данные из quoteResult, если они нужны фронтенду:
            // sqrtPriceX96After: quoteResult.sqrtPriceX96After.toString(),
            // initializedTicksCrossed: quoteResult.initializedTicksCrossed.toString(),
            // gasEstimate: quoteResult.gasEstimate.toString()
        });

    } catch (error) {
        console.error("[API /quote] Error:", error.message);
        // Попытка распарсить ошибку контракта, если она есть
        let contractErrorReason = "Failed to get quote.";
        if (error.data) {
             try {
                // Это стандартный способ получения revert reason из ошибки ethers.js
                const reason = provider.interface.parseError(error.data);
                if (reason) contractErrorReason = `<span class="math-inline">\{reason\.name\}\(</span>{reason.args.join(', ')})`;
             } catch (e) {
                // Иногда ошибка может быть просто строкой
                if (typeof error.data === 'string' && error.data.startsWith('0x')) {
                    // Попытка декодировать как строку ошибки Solidity
                    const hex = error.data.startsWith('0x') ? error.data : `0x${error.data}`;
                    if (hex.length > 138) { // 0x + Error(string) selector + offset + length + string
                        try {
                            contractErrorReason = ethers.toUtf8String("0x" + hex.substring(138));
                        } catch (decodeError) { /* ignore */ }
                    }
                }
             }
        } else if (error.reason) {
            contractErrorReason = error.reason;
        }

        res.status(500).json({ error: contractErrorReason, details: error.message });
    }
});

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