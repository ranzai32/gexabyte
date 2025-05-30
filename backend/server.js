require('dotenv').config({ path: './.env' });  
const { ethers } = require('ethers');
const { Token: UniswapToken } = require('@uniswap/sdk-core'); 
const { provider, CHAIN_ID, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS } = require('./src/config');
const { getPositionDetails, INonfungiblePositionManagerABI } = require('./src/uniswapPositionUtils');
const { getUncollectedFees } = require('./src/uniswapFeeUtils');
const { getPoolData } = require('./src/uniswapPoolUtils');  
const { getTokenDetailsByAddressOnBackend } = require('./src/constants/predefinedTokens');
const express = require('express');
const cors = require('cors');
const NodeCache = require( "node-cache" );
const positionsCache = new NodeCache( { stdTTL: 120, checkperiod: 150 } );
const { Pool } = require('pg');
const UNISWAP_V3_QUOTER_V2_ADDRESS = process.env.UNISWAP_V3_QUOTER_V2_ADDRESS;
const app = express();
const PORT = 3001;
const IQuoterV2_ABI = require('./src/abi/IQuoterV2_ABI.json'); 

const {
    initializeAutoManagement,
    startMonitoringPosition,  
    stopMonitoringPosition  // Импортируем, если они вызываются из маршрутов
} = require('./src/services/autoManageService.js');

const pgPool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

pgPool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client for DB init', err.stack);
    }
    client.query('SELECT NOW()', (err, result) => {
        release(); 
        if (err) {
            return console.error('Error executing query for DB init', err.stack);
        }
        console.log('Successfully connected to PostgreSQL. Current time:', result.rows[0].now);
        initializeAutoManagement(pgPool); 
    });
});

app.use(cors());  
app.use(express.json());  

const autoManageState = {};
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

        // 1. Получаем данные о позиции и несобранных комиссиях с блокчейна
        const positionDetailsResult = await getPositionDetails(parsedTokenId, provider);

        if (!positionDetailsResult || !positionDetailsResult.rawPositionInfo ||
            positionDetailsResult.rawPositionInfo.token0 === ethers.ZeroAddress) {
            return res.status(404).json({ error: `Position with tokenId ${parsedTokenId} not found or invalid.` });
        }

        console.log(`[API /position-details] Данные позиции получены:`, {
            calculatedAmount0: positionDetailsResult.calculatedAmount0,
            calculatedAmount1: positionDetailsResult.calculatedAmount1,
            token0: positionDetailsResult.rawPositionInfo.token0,
            token1: positionDetailsResult.rawPositionInfo.token1
        });

        const positionInfoRaw = positionDetailsResult.rawPositionInfo;

        // Несобранные комиссии
        const uncollectedFeesRaw = await getUncollectedFees(parsedTokenId, provider);
        let uncollectedFees = { feesAmount0: '0', feesAmount1: '0', feeToken0: null, feeToken1: null };

        if (uncollectedFeesRaw) {
            uncollectedFees = {
                feesAmount0: (uncollectedFeesRaw.feesAmount0 ?? '0').toString(),
                feesAmount1: (uncollectedFeesRaw.feesAmount1 ?? '0').toString(),
                feeToken0: uncollectedFeesRaw.feeToken0,
                feeToken1: uncollectedFeesRaw.feeToken1
            };
        }

        // 2. Получаем данные о PnL из БД
        let pnlDataFromDb = {
            initialAmount0Wei: '0',
            initialAmount1Wei: '0',
            cumulativeFeesToken0Wei: '0',
            cumulativeFeesToken1Wei: '0'
        };

        try {
            const dbResult = await pgPool.query(
                'SELECT initial_amount0_wei, initial_amount1_wei, cumulative_fees_token0_wei, cumulative_fees_token1_wei FROM auto_managed_positions WHERE token_id = $1',
                [parsedTokenId]
            );
            if (dbResult.rows.length > 0) {
                const row = dbResult.rows[0];
                pnlDataFromDb = {
                    initialAmount0Wei: row.initial_amount0_wei || '0',
                    initialAmount1Wei: row.initial_amount1_wei || '0',
                    cumulativeFeesToken0Wei: row.cumulative_fees_token0_wei || '0',
                    cumulativeFeesToken1Wei: row.cumulative_fees_token1_wei || '0'
                };
                console.log(`[API /position-details] Данные PnL из БД:`, pnlDataFromDb);
            } else {
                console.log(`[API /position-details] Данные PnL в БД не найдены для tokenId ${parsedTokenId}`);
            }
        } catch (dbError) {
            console.error(`[API /position-details] DB error fetching PnL data for tokenId ${parsedTokenId}:`, dbError);
        }

        // Рассчитываем PnL в процентах
        let pnlPercentage = {
            token0: 0,
            token1: 0
        };

        try {
            // Конвертируем все значения в BigInt для точных вычислений
            const initialAmount0 = BigInt(pnlDataFromDb.initialAmount0Wei);
            const initialAmount1 = BigInt(pnlDataFromDb.initialAmount1Wei);
            console.log(`[API /position-details] PnL calculation values:`, {
                initialAmount0: initialAmount0.toString(),
                initialAmount1: initialAmount1.toString(),
                calculatedAmount0: positionDetailsResult.calculatedAmount0,
                calculatedAmount1: positionDetailsResult.calculatedAmount1,
                type0: typeof positionDetailsResult.calculatedAmount0,
                type1: typeof positionDetailsResult.calculatedAmount1
            });
            const currentAmount0 = BigInt(positionDetailsResult.calculatedAmount0 || '0');
            const currentAmount1 = BigInt(positionDetailsResult.calculatedAmount1 || '0');
            const collectedFees0 = BigInt(pnlDataFromDb.cumulativeFeesToken0Wei);
            const collectedFees1 = BigInt(pnlDataFromDb.cumulativeFeesToken1Wei);
            const uncollectedFees0 = BigInt(uncollectedFees.feesAmount0);
            const uncollectedFees1 = BigInt(uncollectedFees.feesAmount1);

            // Рассчитываем PnL для каждого токена
            if (initialAmount0 > 0n) {
                const totalCurrent0 = currentAmount0 + collectedFees0 + uncollectedFees0;
                pnlPercentage.token0 = Number((totalCurrent0 - initialAmount0) * 10000n / initialAmount0) / 100;
            }
            if (initialAmount1 > 0n) {
                const totalCurrent1 = currentAmount1 + collectedFees1 + uncollectedFees1;
                pnlPercentage.token1 = Number((totalCurrent1 - initialAmount1) * 10000n / initialAmount1) / 100;
            }
        } catch (calcError) {
            console.error(`[API /position-details] Error calculating PnL percentage for tokenId ${parsedTokenId}:`, calcError);
        }

        // 3. Формируем основной объект positionInfo для ответа
        let positionInfoForResponse = {
            // Основные поля из rawPositionInfo
            nonce: (positionInfoRaw.nonce ?? 0n).toString(),
            operator: positionInfoRaw.operator,
            token0: positionInfoRaw.token0, // Адрес
            token1: positionInfoRaw.token1, // Адрес
            fee: Number(positionInfoRaw.fee ?? 0),
            tickLower: Number(positionInfoRaw.tickLower ?? 0),
            tickUpper: Number(positionInfoRaw.tickUpper ?? 0),
            liquidity: (positionInfoRaw.liquidity ?? 0n).toString(),
            
            // Детали токенов из sdkToken объектов (если они есть в positionDetailsResult)
            token0Details: positionDetailsResult.sdkToken0 ? {
                address: positionDetailsResult.sdkToken0.address,
                symbol: positionDetailsResult.sdkToken0.symbol,
                decimals: positionDetailsResult.sdkToken0.decimals
            } : (uncollectedFees.feeToken0 || null), // Фоллбэк на детали из комиссий
            token1Details: positionDetailsResult.sdkToken1 ? {
                address: positionDetailsResult.sdkToken1.address,
                symbol: positionDetailsResult.sdkToken1.symbol,
                decimals: positionDetailsResult.sdkToken1.decimals
            } : (uncollectedFees.feeToken1 || null), // Фоллбэк на детали из комиссий

            // Текущий тик пула
            currentTick: (positionDetailsResult.pool && typeof positionDetailsResult.pool.tickCurrent === 'number')
                         ? positionDetailsResult.pool.tickCurrent
                         : null,
            
            // Рассчитанные текущие суммы токенов в позиции (если есть в positionDetailsResult)
            // эти поля (calculatedAmount0, calculatedAmount1) должны быть строками из toSignificant()
            calculatedAmount0: positionDetailsResult.calculatedAmount0 || '0',
            calculatedAmount1: positionDetailsResult.calculatedAmount1 || '0',
            poolSqrtPriceX96: (positionDetailsResult.pool && positionDetailsResult.pool.sqrtRatioX96)
                                ? positionDetailsResult.pool.sqrtRatioX96.toString()
                                : null,
            poolLiquidity: (positionDetailsResult.pool && positionDetailsResult.pool.liquidity)
                                ? positionDetailsResult.pool.liquidity.toString()
                                : null,
        };
        
        res.json({
            positionInfo: positionInfoForResponse,
            uncollectedFees: uncollectedFees,
            pnlData: {
                ...pnlDataFromDb,
                pnlPercentage
            }
        });

    } catch (error) {
        console.error(`[API /position-details] Error for tokenId ${parsedTokenId}:`, error.message, error.stack);
        res.status(500).json({ error: "Failed to get position details", details: error.message });
    }
});

app.get('/api/user-positions/:userAddress', async (req, res) => {
    const { userAddress } = req.params;

    if (!ethers.isAddress(userAddress)) {
        return res.status(400).json({ error: 'Invalid user address provided.' });
    }
    if (!UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS) {
        console.error("[API /user-positions] Error: UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS is not defined.");
        return res.status(500).json({ error: 'NFT Position Manager address not configured on server.' });
    }

    console.log(`[API /user-positions] Fetching positions for ${userAddress}`);
    try {
        const positionManagerContract = new ethers.Contract(
            UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            provider
        );

        const balance = await positionManagerContract.balanceOf(userAddress);
        const numPositions = parseInt(balance.toString());
        console.log(`[API /user-positions] User ${userAddress} has ${numPositions} positions.`);

        if (numPositions === 0) {
            return res.json([]);
        }

        const positionsPromises = [];
        for (let i = 0; i < numPositions; i++) {
            positionsPromises.push(
                (async (index) => { // Передаем index для логирования
                    let tokenIdNumber;
                    try {
                        const tokenIdBigInt = await positionManagerContract.tokenOfOwnerByIndex(userAddress, index);
                        tokenIdNumber = parseInt(tokenIdBigInt.toString());

                        let positionDetailsResult;
                        let feesResult;

                        try {
                            [positionDetailsResult, feesResult] = await Promise.all([
                                getPositionDetails(tokenIdNumber, provider),
                                getUncollectedFees(tokenIdNumber, provider)
                            ]);
                        } catch (fetchError) {
                            console.error(`[API /user-positions] Error in Promise.all for tokenId ${tokenIdNumber} (index ${index}):`, fetchError);
                            return null;
                        }

                        if (!positionDetailsResult || !positionDetailsResult.rawPositionInfo ||
                            (positionDetailsResult.rawPositionInfo && positionDetailsResult.rawPositionInfo.token0 === ethers.ZeroAddress)) {
                            console.warn(`[API /user-positions] Invalid or no raw position info for tokenId ${tokenIdNumber} (index ${index}). Skipping.`);
                            return null;
                        }

                        const positionInfoRaw = positionDetailsResult.rawPositionInfo;

                        let enrichedPositionInfo = {
                            tokenId: tokenIdNumber,
                            nonce: (positionInfoRaw.nonce ?? 0n).toString(),
                            operator: positionInfoRaw.operator || ethers.ZeroAddress,
                            token0: positionInfoRaw.token0 || ethers.ZeroAddress,
                            token1: positionInfoRaw.token1 || ethers.ZeroAddress,
                            fee: Number(positionInfoRaw.fee ?? 0),
                            tickLower: Number(positionInfoRaw.tickLower ?? 0),
                            tickUpper: Number(positionInfoRaw.tickUpper ?? 0),
                            liquidity: (positionInfoRaw.liquidity ?? 0n).toString(),
                            feeGrowthInside0LastX128: (positionInfoRaw.feeGrowthInside0LastX128 ?? 0n).toString(),
                            feeGrowthInside1LastX128: (positionInfoRaw.feeGrowthInside1LastX128 ?? 0n).toString(),
                            tokensOwed0: (positionInfoRaw.tokensOwed0 ?? 0n).toString(), // Несобранные комиссии из raw, для справки
                            tokensOwed1: (positionInfoRaw.tokensOwed1 ?? 0n).toString(), // Несобранные комиссии из raw, для справки
                            
                            // Детали токенов из sdkToken объектов (если они есть в positionDetailsResult)
                            token0Details: positionDetailsResult.sdkToken0 ? {
                                address: positionDetailsResult.sdkToken0.address,
                                symbol: positionDetailsResult.sdkToken0.symbol,
                                decimals: positionDetailsResult.sdkToken0.decimals
                            } : (feesResult?.feeToken0 || null),
                            token1Details: positionDetailsResult.sdkToken1 ? {
                                address: positionDetailsResult.sdkToken1.address,
                                symbol: positionDetailsResult.sdkToken1.symbol,
                                decimals: positionDetailsResult.sdkToken1.decimals
                            } : (feesResult?.feeToken1 || null),

                            currentTick: (positionDetailsResult.pool && typeof positionDetailsResult.pool.tickCurrent === 'number')
                                         ? positionDetailsResult.pool.tickCurrent
                                         : null,
                            calculatedAmount0: positionDetailsResult.calculatedAmount0 || '0', // Рассчитанные SDK суммы
                            calculatedAmount1: positionDetailsResult.calculatedAmount1 || '0'  // Рассчитанные SDK суммы
                        };
                        
                        // Если currentTick не был получен через getPositionDetails, пытаемся получить его снова
                        if (enrichedPositionInfo.currentTick === null &&
                            enrichedPositionInfo.token0Details && typeof enrichedPositionInfo.token0Details.decimals === 'number' &&
                            enrichedPositionInfo.token1Details && typeof enrichedPositionInfo.token1Details.decimals === 'number') {
                            try {
                                const t0 = new UniswapToken(CHAIN_ID, enrichedPositionInfo.token0Details.address, enrichedPositionInfo.token0Details.decimals, enrichedPositionInfo.token0Details.symbol);
                                const t1 = new UniswapToken(CHAIN_ID, enrichedPositionInfo.token1Details.address, enrichedPositionInfo.token1Details.decimals, enrichedPositionInfo.token1Details.symbol);
                                const poolData = await getPoolData(t0, t1, enrichedPositionInfo.fee);
                                if (poolData && typeof poolData.tickCurrent === 'number') {
                                    enrichedPositionInfo.currentTick = poolData.tickCurrent;
                                }
                            } catch (e) {
                                console.warn(`[API /user-positions] Could not fetch currentTick in fallback for ${tokenIdNumber}: ${e.message}`);
                            }
                        }


                        let pnlDataFromDb = { initialAmount0Wei: '0', initialAmount1Wei: '0', cumulativeFeesToken0Wei: '0', cumulativeFeesToken1Wei: '0' };
                        try {
                            const dbResult = await pgPool.query(
                                'SELECT initial_amount0_wei, initial_amount1_wei, cumulative_fees_token0_wei, cumulative_fees_token1_wei FROM auto_managed_positions WHERE token_id = $1',
                                [tokenIdNumber]
                            );
                            if (dbResult.rows.length > 0) {
                                const row = dbResult.rows[0];
                                pnlDataFromDb = {
                                    initialAmount0Wei: row.initial_amount0_wei || '0',
                                    initialAmount1Wei: row.initial_amount1_wei || '0',
                                    cumulativeFeesToken0Wei: row.cumulative_fees_token0_wei || '0',
                                    cumulativeFeesToken1Wei: row.cumulative_fees_token1_wei || '0'
                                };
                            }
                        } catch (dbError) {
                            console.error(`[API /user-positions] DB error fetching PnL data for tokenId ${tokenIdNumber} (index ${index}):`, dbError);
                        }

                        let finalFeesObject = { feesAmount0: '0', feesAmount1: '0', feeToken0: null, feeToken1: null };
                        if (feesResult) {
                            finalFeesObject = {
                                feesAmount0: (feesResult.feesAmount0 ?? '0').toString(),
                                feesAmount1: (feesResult.feesAmount1 ?? '0').toString(),
                                feeToken0: feesResult.feeToken0 || enrichedPositionInfo.token0Details,
                                feeToken1: feesResult.feeToken1 || enrichedPositionInfo.token1Details
                            };
                        } else {
                             console.warn(`[API /user-positions] Fee details (feesResult) missing for tokenId ${tokenIdNumber} (index ${index}).`);
                        }
                        
                        return {
                            positionInfo: enrichedPositionInfo,
                            uncollectedFees: finalFeesObject, // Используем uncollectedFees для консистентности с другим эндпоинтом
                            pnlData: pnlDataFromDb,
                            tokenId: tokenIdNumber
                        };

                    } catch (tokenError) {
                        const idForLog = tokenIdNumber !== undefined ? tokenIdNumber : `index ${index}`;
                        console.error(`[API /user-positions] Error processing data for one position (ID/Index: ${idForLog}):`, tokenError.message, tokenError.stack);
                        return null;
                    }
                })(i) // Передаем i в IIFE
            );
        }

        const resolvedPositionsData = await Promise.all(positionsPromises);
        const validPositionsData = resolvedPositionsData.filter(p => p !== null);

        console.log(`[API /user-positions] Returning ${validPositionsData.length} valid positions for ${userAddress}`);
        res.json(validPositionsData);

    } catch (error) {
        console.error("[API /user-positions] Outer Error:", error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch user positions', details: error.message });
    }
});

app.get('/api/auto-manage/status/:tokenId', async (req, res) => {
    const { tokenId } = req.params;
    const parsedTokenId = parseInt(tokenId);

    if (isNaN(parsedTokenId)) {
        return res.status(400).json({ error: "Invalid tokenId" });
    }

    try {
        const result = await pgPool.query(
            'SELECT is_enabled, strategy_parameters, user_address FROM auto_managed_positions WHERE token_id = $1',
            [parsedTokenId]
        );

        if (result.rows.length > 0) {
            res.json({
                tokenId: parsedTokenId,
                isEnabled: result.rows[0].is_enabled,
                strategyParameters: result.rows[0].strategy_parameters,
                owner: result.rows[0].user_address  
            });
        } else {
            res.json({ tokenId: parsedTokenId, isEnabled: false });  
        }
    } catch (error) {
        console.error(`[API /auto-manage/status] Error for tokenId ${parsedTokenId}:`, error);
        res.status(500).json({ error: "Failed to get auto-manage status", details: error.message });
    }
});

app.post('/api/positions/track-manual-mint', async (req, res) => {
    const { 
        tokenId, 
        userAddress, 
        token0Address, 
        token1Address, 
        initialAmount0Wei, 
        initialAmount1Wei,
        fee, // Добавляем fee, tickLower, tickUpper, если они нужны для strategy_parameters
        tickLower,
        tickUpper
    } = req.body;

    if (!tokenId || !userAddress || !token0Address || !token1Address || 
        initialAmount0Wei === undefined || initialAmount1Wei === undefined ||
        fee === undefined || tickLower === undefined || tickUpper === undefined) {
        return res.status(400).json({ error: "Missing required fields for tracking manual mint." });
    }

    const parsedTokenId = parseInt(tokenId);
    if (isNaN(parsedTokenId)) return res.status(400).json({ error: "Invalid tokenId" });

    try {
        // Пример strategy_parameters, вы можете настроить его по-другому
        const strategyParameters = JSON.stringify({
            rangePercentage: 5, // Дефолтное значение или то, что имеет смысл для ручных позиций
            lastTickLower: tickLower.toString(),
            lastTickUpper: tickUpper.toString(),
            // Другие параметры по необходимости
        });

        const upsertQuery = `
            INSERT INTO auto_managed_positions 
                (token_id, user_address, token0_address, token1_address, 
                 initial_amount0_wei, initial_amount1_wei, 
                 cumulative_fees_token0_wei, cumulative_fees_token1_wei,
                 is_enabled, status_message, strategy_parameters, created_at, updated_at, last_checked_at)
            VALUES ($1, $2, $3, $4, $5, $6, '0', '0', FALSE, 'Manually created, PnL tracking enabled.', $7, NOW(), NOW(), NOW())
            ON CONFLICT (token_id) DO UPDATE SET
                user_address = EXCLUDED.user_address,
                token0_address = EXCLUDED.token0_address,
                token1_address = EXCLUDED.token1_address,
                initial_amount0_wei = EXCLUDED.initial_amount0_wei,
                initial_amount1_wei = EXCLUDED.initial_amount1_wei,
                -- Не сбрасываем комиссии при обновлении, если вдруг такая логика понадобится,
                -- но для нового минта обычно они должны быть 0.
                -- cumulative_fees_token0_wei = '0', 
                -- cumulative_fees_token1_wei = '0',
                status_message = 'Manually created (updated), PnL tracking enabled.',
                strategy_parameters = COALESCE(auto_managed_positions.strategy_parameters, EXCLUDED.strategy_parameters), -- Сохраняем существующие параметры стратегии, если есть
                updated_at = NOW();
        `;
        await pgPool.query(upsertQuery, [
            parsedTokenId, userAddress, token0Address, token1Address,
            initialAmount0Wei.toString(), initialAmount1Wei.toString(), strategyParameters
        ]);
        console.log(`[API /track-manual-mint] Tracked initial deposit for manually minted tokenId ${parsedTokenId}`);
        res.status(201).json({ success: true, message: "Position tracked for PnL." });
    } catch (error) {
        console.error(`[API /track-manual-mint] Error tracking position ${parsedTokenId}:`, error);
        res.status(500).json({ error: "Failed to track position", details: error.message });
    }
});

app.post('/api/positions/update-collected-fees', async (req, res) => {
    const { tokenId, collectedAmount0Wei, collectedAmount1Wei } = req.body;

    if (!tokenId || collectedAmount0Wei === undefined || collectedAmount1Wei === undefined) {
        return res.status(400).json({ error: "Missing required fields for updating collected fees." });
    }
    const parsedTokenId = parseInt(tokenId);
    if (isNaN(parsedTokenId)) return res.status(400).json({ error: "Invalid tokenId" });

    try {
        const client = await pgPool.connect();
        try {
            await client.query('BEGIN');

            const currentFeesResult = await client.query(
                'SELECT cumulative_fees_token0_wei, cumulative_fees_token1_wei FROM auto_managed_positions WHERE token_id = $1 FOR UPDATE',
                [parsedTokenId]
            );

            let currentCumulative0 = 0n;
            let currentCumulative1 = 0n;

            if (currentFeesResult.rows.length > 0) {
                currentCumulative0 = BigInt(currentFeesResult.rows[0].cumulative_fees_token0_wei || '0');
                currentCumulative1 = BigInt(currentFeesResult.rows[0].cumulative_fees_token1_wei || '0');
            } else {
                 
                await client.query('ROLLBACK');
                console.warn(`[API /update-collected-fees] Position ${parsedTokenId} not found in DB for fee update.`);
                return res.status(404).json({ error: `Position ${parsedTokenId} not tracked. Cannot update fees.` });
            }

            const newCumulative0 = currentCumulative0 + BigInt(collectedAmount0Wei);
            const newCumulative1 = currentCumulative1 + BigInt(collectedAmount1Wei);

            await client.query(
                'UPDATE auto_managed_positions SET cumulative_fees_token0_wei = $1, cumulative_fees_token1_wei = $2, status_message = $3, updated_at = NOW() WHERE token_id = $4',
                [newCumulative0.toString(), newCumulative1.toString(), 'Manually collected fees updated.', parsedTokenId]
            );

            await client.query('COMMIT');
            console.log(`[API /update-collected-fees] Updated cumulative fees for tokenId ${parsedTokenId}`);
            res.json({ success: true, message: "Collected fees updated." });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[API /update-collected-fees] Error updating fees for position ${parsedTokenId}:`, error);
            res.status(500).json({ error: "Failed to update collected fees", details: error.message });
        } finally {
            client.release();
        }
    } catch (error) { 
        console.error(`[API /update-collected-fees] DB connection error for position ${parsedTokenId}:`, error);
        res.status(500).json({ error: "DB connection error", details: error.message });
    }
});

app.post('/api/positions/update-initial-liquidity', async (req, res) => {
    const { tokenId, newAmount0Wei, newAmount1Wei } = req.body;

    if (!tokenId || newAmount0Wei === undefined || newAmount1Wei === undefined) {
        return res.status(400).json({ error: "Missing required fields for updating initial liquidity." });
    }

    const parsedTokenId = parseInt(tokenId);
    if (isNaN(parsedTokenId)) {
        return res.status(400).json({ error: "Invalid tokenId" });
    }

    try {
        const updateQuery = `
            UPDATE auto_managed_positions
            SET initial_amount0_wei = $2,
                initial_amount1_wei = $3
            WHERE token_id = $1
            RETURNING *;
        `;
        
        const result = await pgPool.query(updateQuery, [parsedTokenId, newAmount0Wei.toString(), newAmount1Wei.toString()]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: `Position with tokenId ${parsedTokenId} not found.` });
        }

        console.log(`[API /update-initial-liquidity] Updated initial liquidity for tokenId ${parsedTokenId}`);
        res.status(200).json({ success: true, message: "Initial liquidity updated." });
    } catch (error) {
        console.error(`[API /update-initial-liquidity] Error updating position ${parsedTokenId}:`, error);
        res.status(500).json({ error: "Failed to update initial liquidity", details: error.message });
    }
});

app.post('/api/auto-manage/toggle', async (req, res) => {
    const { tokenId, enable, userAddress, strategyParameters } = req.body; // strategyParameters от клиента может быть undefined
    const parsedTokenId = parseInt(tokenId);

    if (isNaN(parsedTokenId) || typeof enable !== 'boolean' || !ethers.isAddress(userAddress)) {
        return res.status(400).json({ error: "Invalid request parameters." });
    }

    try {
        const positionManagerContract = new ethers.Contract(
            UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            provider
        );
        const owner = await positionManagerContract.ownerOf(parsedTokenId);
        if (owner.toLowerCase() !== userAddress.toLowerCase()) {
            return res.status(403).json({ error: "User is not the owner of this position." });
        }

        const positionDetails = await getPositionDetails(parsedTokenId, provider);
        if (!positionDetails || positionDetails.token0 === ethers.ZeroAddress) {
             return res.status(404).json({ error: "Position details not found for tokenId." });
        }

        // --- Начало изменений ---
        const defaultStrategyParams = { 
            rangePercentage: 5, 
            rebalanceSlippage: 0.5, // Пример
            checkIntervalMinutes: 5 // Пример
        };

        let finalStrategyParametersToStore = defaultStrategyParams;

        if (strategyParameters && typeof strategyParameters === 'object' && Object.keys(strategyParameters).length > 0) {
            // Если клиент прислал параметры, используем их, возможно, объединяя с дефолтными
            finalStrategyParametersToStore = { ...defaultStrategyParams, ...strategyParameters };
        } else if (enable) {
            // Если включаем и клиент ничего не прислал, проверяем, есть ли что-то в БД
            // Если нет, используем дефолтные. Если есть - оставляем существующие (логика ниже их перезапишет если надо)
            const existingRecord = await pgPool.query(
                'SELECT strategy_parameters FROM auto_managed_positions WHERE token_id = $1',
                [parsedTokenId]
            );
            if (existingRecord.rows.length > 0 && existingRecord.rows[0].strategy_parameters) {
                finalStrategyParametersToStore = existingRecord.rows[0].strategy_parameters;
            }
            // Если выключаем (enable=false), параметры стратегии не так важны, но лучше их сохранить, если они были
        } else if (!enable) {
             const existingRecord = await pgPool.query(
                'SELECT strategy_parameters FROM auto_managed_positions WHERE token_id = $1',
                [parsedTokenId]
            );
            if (existingRecord.rows.length > 0 && existingRecord.rows[0].strategy_parameters) {
                finalStrategyParametersToStore = existingRecord.rows[0].strategy_parameters;
            }
        }
        
        const strategyParamsJsonToStore = JSON.stringify(finalStrategyParametersToStore);
        // --- Конец изменений ---

        const upsertQuery = `
            INSERT INTO auto_managed_positions (token_id, user_address, is_enabled, strategy_parameters, token0_address, token1_address, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (token_id)
            DO UPDATE SET
                is_enabled = EXCLUDED.is_enabled,
                user_address = EXCLUDED.user_address,
                strategy_parameters = EXCLUDED.strategy_parameters,
                token0_address = COALESCE(auto_managed_positions.token0_address, EXCLUDED.token0_address),
                token1_address = COALESCE(auto_managed_positions.token1_address, EXCLUDED.token1_address),
                updated_at = NOW()
            RETURNING is_enabled, strategy_parameters;
        `;
        const result = await pgPool.query(upsertQuery, [
            parsedTokenId,
            userAddress,
            enable,
            strategyParamsJsonToStore,  
            positionDetails.token0,
            positionDetails.token1
        ]);
        
        const updatedDbState = result.rows[0];

        if (enable) {
            console.log(`[API /auto-manage/toggle] Auto-management ENABLED for tokenId ${parsedTokenId} by ${userAddress}. Parameters:`, updatedDbState.strategy_parameters);
            startMonitoringPosition(
                parsedTokenId,
                updatedDbState.strategy_parameters,  
                userAddress,
                positionDetails.token0,
                positionDetails.token1,
                pgPool
            );
        } else {
            console.log(`[API /auto-manage/toggle] Auto-management DISABLED for tokenId ${parsedTokenId} by ${userAddress}.`);
            stopMonitoringPosition(parsedTokenId, pgPool);
        }

        res.json({
            success: true,
            tokenId: parsedTokenId,
            isEnabled: updatedDbState.is_enabled,
            strategyParameters: updatedDbState.strategy_parameters  
        });

    } catch (error) {
        console.error(`[API /auto-manage/toggle] Error for tokenId ${parsedTokenId}:`, error);
        let errMsg = "Failed to toggle auto-management.";
        if (error.message && error.message.includes("owner query for nonexistent token")) {
            errMsg = "Position (NFT) does not exist or already burned.";
            return res.status(404).json({ error: errMsg });
        }
        res.status(500).json({ error: errMsg, details: error.message });
    }
});


// TODO: Добавить эндпоинты для операций, требующих подписи пользователя (они будут готовить параметры)
// Например: POST /api/prepare-mint, POST /api/prepare-collect-fees и т.д.

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Бэкенд сервер запущен на http://localhost:${PORT}`);
});