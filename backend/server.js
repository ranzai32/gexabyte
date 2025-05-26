require('dotenv').config({ path: './.env' }); // Убедитесь, что .env в корне backend
const { ethers } = require('ethers'); 
const express = require('express');
const cors = require('cors');
const NodeCache = require( "node-cache" );
const positionsCache = new NodeCache( { stdTTL: 120, checkperiod: 150 } );
const { getTokenDetailsByAddressOnBackend } = require('./src/constants/predefinedTokens');
const { Pool } = require('pg');

// Импортируем необходимые части из вашей существующей конфигурации и утилит
// Пути должны быть относительны server.js
const { provider, TokenA, TokenB, CHAIN_ID, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS } = require('./src/config'); 
const { getPositionDetails, INonfungiblePositionManagerABI } = require('./src/uniswapPositionUtils'); // Импортируем ABI
const { getPoolData } = require('./src/uniswapPoolUtils'); //
const { getUncollectedFees } = require('./src/uniswapFeeUtils'); //
const { Token: UniswapToken } = require('@uniswap/sdk-core'); // Переименовываем, чтобы не конфликтовать с Token из config
const UNISWAP_V3_QUOTER_V2_ADDRESS = process.env.UNISWAP_V3_QUOTER_V2_ADDRESS;
const app = express();
const PORT = 3001;
const IQuoterV2_ABI = require('./src/abi/IQuoterV2_ABI.json'); 

const {
    initializeAutoManagement,
    startMonitoringPosition, // Импортируем, если они вызываются из маршрутов
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
        const positionInfoRaw = await getPositionDetails(parsedTokenId, provider); //

        if (!positionInfoRaw || positionInfoRaw.token0 === '0x0000000000000000000000000000000000000000') {
            return res.status(404).json({ error: `Position with tokenId ${parsedTokenId} not found or invalid.` });
        }
        
        // Первоначальное формирование positionInfo с преобразованием BigInt в строки
        let positionInfo = { // Используем let, так как будем добавлять currentTick
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
            // currentTick будет добавлен ниже
        };

        const feesRaw = await getUncollectedFees(parsedTokenId, provider); //
        let fees = null;
        if (feesRaw) {
            fees = {
                feesAmount0: feesRaw.feesAmount0.toString(),
                feesAmount1: feesRaw.feesAmount1.toString(),
                feeToken0: feesRaw.feeToken0 ? { address: feesRaw.feeToken0.address, symbol: feesRaw.feeToken0.symbol, decimals: feesRaw.feeToken0.decimals } : null,
                feeToken1: feesRaw.feeToken1 ? { address: feesRaw.feeToken1.address, symbol: feesRaw.feeToken1.symbol, decimals: feesRaw.feeToken1.decimals } : null,
            }
        }

         
        if (positionInfoRaw.token0 && positionInfoRaw.token0 !== ethers.ZeroAddress && positionInfoRaw.token1 && positionInfoRaw.token1 !== ethers.ZeroAddress) {
             
            const tokenDetails0 = await getTokenDetailsByAddressOnBackend(positionInfoRaw.token0); // Предполагается, что эта функция определена и работает
            const tokenDetails1 = await getTokenDetailsByAddressOnBackend(positionInfoRaw.token1); // Предполагается, что эта функция определена и работает

            if (tokenDetails0 && tokenDetails1) { // Убедимся, что детали токенов получены
                const t0 = new UniswapToken(CHAIN_ID, positionInfoRaw.token0, tokenDetails0.decimals, tokenDetails0.symbol);
                const t1 = new UniswapToken(CHAIN_ID, positionInfoRaw.token1, tokenDetails1.decimals, tokenDetails1.symbol);
                
                try {
                    const poolData = await getPoolData(t0, t1, Number(positionInfoRaw.fee)); //
                    if (poolData) {
                        positionInfo.currentTick = poolData.tickCurrent; 
                    } else {
                        positionInfo.currentTick = null;
                        console.warn(`[API /position-details] Pool data not found for position ${parsedTokenId}`);
                    }
                } catch (poolError) {
                    positionInfo.currentTick = null;
                    console.error(`[API /position-details] Error fetching pool data for position ${parsedTokenId}:`, poolError);
                }
            } else {
                positionInfo.currentTick = null;
                console.warn(`[API /position-details] Could not get token details for position ${parsedTokenId} to fetch pool data.`);
            }
        } else {
            positionInfo.currentTick = null;  
        }

        res.json({ positionInfo, fees });  

    } catch (error) {
        console.error(`[API /position-details] Error for tokenId ${parsedTokenId}:`, error.message, error.stack); // Добавлен error.stack
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
                (async () => {
                    try {
                        const tokenIdBigInt = await positionManagerContract.tokenOfOwnerByIndex(userAddress, i);
                        const tokenIdNumber = parseInt(tokenIdBigInt.toString());
                        
                        const [positionInfoRaw, feesRaw] = await Promise.all([
                            getPositionDetails(tokenIdNumber, provider),
                            getUncollectedFees(tokenIdNumber, provider)
                        ]);

                        if (!positionInfoRaw || positionInfoRaw.token0 === '0x0000000000000000000000000000000000000000') {
                            console.warn(`[API /user-positions] Could not fetch details for tokenId ${tokenIdNumber}`);
                            return null;
                        }
                        
                        let enrichedPositionInfo = {
                            tokenId: tokenIdNumber,
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
                            tokensOwed1: positionInfoRaw.tokensOwed1.toString(),
                            currentTick: null  
                        };
 
                        if (enrichedPositionInfo.token0 && enrichedPositionInfo.token0 !== ethers.ZeroAddress && 
                            enrichedPositionInfo.token1 && enrichedPositionInfo.token1 !== ethers.ZeroAddress) {
                            
                            const tokenDetails0 = await getTokenDetailsByAddressOnBackend(enrichedPositionInfo.token0);
                            const tokenDetails1 = await getTokenDetailsByAddressOnBackend(enrichedPositionInfo.token1);

                            if (tokenDetails0 && tokenDetails1) {
                                const t0 = new UniswapToken(CHAIN_ID, enrichedPositionInfo.token0, tokenDetails0.decimals, tokenDetails0.symbol);
                                const t1 = new UniswapToken(CHAIN_ID, enrichedPositionInfo.token1, tokenDetails1.decimals, tokenDetails1.symbol);
                                
                                try {
                                    const poolData = await getPoolData(t0, t1, enrichedPositionInfo.fee); // Используем fee из enrichedPositionInfo
                                    if (poolData) {
                                        enrichedPositionInfo.currentTick = poolData.tickCurrent;
                                    } else {
                                        console.warn(`[API /user-positions] Pool data not found for position ${tokenIdNumber}`);
                                    }
                                } catch (poolError) {
                                    console.error(`[API /user-positions] Error fetching pool data for position ${tokenIdNumber}:`, poolError);
                                }
                            } else {
                                console.warn(`[API /user-positions] Could not get token details for position ${tokenIdNumber} to fetch pool data.`);
                            }
                        }

                        let fees = null;
                        if (feesRaw) {
                            fees = {
                                feesAmount0: feesRaw.feesAmount0.toString(),
                                feesAmount1: feesRaw.feesAmount1.toString(),
                                feeToken0: feesRaw.feeToken0 ? { address: feesRaw.feeToken0.address, symbol: feesRaw.feeToken0.symbol, decimals: feesRaw.feeToken0.decimals } : null,
                                feeToken1: feesRaw.feeToken1 ? { address: feesRaw.feeToken1.address, symbol: feesRaw.feeToken1.symbol, decimals: feesRaw.feeToken1.decimals } : null,
                            }
                        }
                        return { positionInfo: enrichedPositionInfo, fees, tokenId: tokenIdNumber };
                    } catch (tokenError) {
                        console.error(`[API /user-positions] Error fetching data for one position:`, tokenError);
                        return null;
                    }
                })()
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