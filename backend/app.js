require('dotenv').config();
const { ethers } = require("ethers");
const { Token, CurrencyAmount, Price } = require('@uniswap/sdk-core');
const { Pool, FeeAmount, Position, NonfungiblePositionManager } = require('@uniswap/v3-sdk'); 
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json').abi;
const IUniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json').abi;
const INonfungiblePositionManagerABI = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json').abi;
const ERC20_ABI = [  
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"  
];

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS = process.env.UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
const UNISWAP_V3_SWAP_ROUTER_ADDRESS = process.env.UNISWAP_V3_SWAP_ROUTER_ADDRESS; 
const UNISWAP_V3_FACTORY_ADDRESS = process.env.UNISWAP_V3_FACTORY_ADDRESS;
const UNISWAP_V3_QUOTER_V2_ADDRESS = process.env.UNISWAP_V3_QUOTER_V2_ADDRESS;  
const TOKEN0_ADDRESS_ENV = process.env.TOKEN0_ADDRESS; // WETH
const TOKEN1_ADDRESS_ENV = process.env.TOKEN1_ADDRESS; // USDC

if (!RPC_URL || !PRIVATE_KEY || !UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS || !UNISWAP_V3_FACTORY_ADDRESS || !TOKEN0_ADDRESS_ENV || !TOKEN1_ADDRESS_ENV) {
    console.error("Ошибка: Одна или несколько обязательных переменных окружения не установлены (RPC_URL, PRIVATE_KEY, NFT_MANAGER, FACTORY, TOKEN0_ADDRESS, TOKEN1_ADDRESS).");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const CHAIN_ID = 11155111;  
const TOKEN0_DECIMALS = 18; 
const TOKEN0_SYMBOL = "WETH";
const TOKEN1_DECIMALS = 6;  
const TOKEN1_SYMBOL = "USDC";

const TokenA = new Token(CHAIN_ID, TOKEN0_ADDRESS_ENV, TOKEN0_DECIMALS, TOKEN0_SYMBOL, "Wrapped Ether (Test)");
const TokenB = new Token(CHAIN_ID, TOKEN1_ADDRESS_ENV, TOKEN1_DECIMALS, TOKEN1_SYMBOL, "USD Coin (Test)");
async function getPoolData(tokenA_input, tokenB_input, feeTier) {
    const factoryContract = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, IUniswapV3FactoryABI, provider);
    console.log(`\nЗапрашиваем адрес пула для ${tokenA_input.symbol}/${tokenB_input.symbol} с комиссией ${feeTier / 10000}%...`);
    const poolAddress = await factoryContract.getPool(tokenA_input.address, tokenB_input.address, feeTier);

    if (poolAddress === ethers.ZeroAddress) {
        console.error("Пул для данной пары токенов и уровня комиссии не найден.");
        return null;
    }
    console.log(`Адрес пула: ${poolAddress}`);
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, provider);

    try {
        const [slot0, liquidity, contractToken0Address, contractToken1Address, contractFee] = await Promise.all([
            poolContract.slot0(),
            poolContract.liquidity(),
            poolContract.token0(),
            poolContract.token1(),
            poolContract.fee()
        ]);

        console.log("Данные из контракта пула:");
        console.log("  slot0 (sqrtPriceX96, tick):", slot0[0].toString(), slot0[1].toString());
        console.log("  liquidity:", liquidity.toString());
        console.log("  fee from pool:", contractFee.toString());
        let poolSdkToken0, poolSdkToken1;
        if (tokenA_input.address.toLowerCase() === contractToken0Address.toLowerCase()) {
            poolSdkToken0 = tokenA_input;
            poolSdkToken1 = tokenB_input;
        } else if (tokenB_input.address.toLowerCase() === contractToken0Address.toLowerCase()) {
            poolSdkToken0 = tokenB_input;
            poolSdkToken1 = tokenA_input;
        } else {
            console.error("Критическая ошибка: Адреса входных токенов не совпадают с адресами токенов из пула.");
            return null;
        }
        
        // Final check for safety
        if (poolSdkToken1.address.toLowerCase() !== contractToken1Address.toLowerCase()){
            console.error("Критическая ошибка: poolSdkToken1 не соответствует token1 из пула после определения.");
            return null;
        }

        const pool = new Pool(
            poolSdkToken0,
            poolSdkToken1,
            feeTier,
            slot0[0].toString(), // sqrtPriceX96
            liquidity.toString(),
            Number(slot0[1])    // tick
        );
        console.log("\nОбъект Pool (SDK) создан:");
        console.log(`  Цена ${pool.token0.symbol} за ${pool.token1.symbol}: ${pool.token0Price.toSignificant(6)}`);
        console.log(`  Цена ${pool.token1.symbol} за ${pool.token0.symbol}: ${pool.token1Price.toSignificant(6)}`);
        console.log(`  Текущий Tick пула: ${pool.tickCurrent}`);
        return pool;

    } catch (error) {
        console.error("Ошибка при получении данных из контракта пула:", error);
        return null;
    }
}

async function approveToken(token, amountToApprove_JSBI, spenderAddress, walletSigner) {
    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, walletSigner);
    const ownerAddress = await walletSigner.getAddress();
    
    // Конвертируем JSBI в строку для ethers.js
    const amountToApprove_String = amountToApprove_JSBI.toString();
    // Конвертируем строку в нативный BigInt для сравнений и математики, если нужно
    const amountToApprove_NativeBigInt = BigInt(amountToApprove_String);

    console.log(`\nПроверка и одобрение для токена ${token.symbol} (${token.address})`);
    console.log(`  Владелец: ${ownerAddress}`);
    console.log(`  Спендер: ${spenderAddress}`);
    // Используем строку для formatUnits
    console.log(`  Сумма к одобрению: ${ethers.formatUnits(amountToApprove_String, token.decimals)} ${token.symbol}`);

    try {
        const currentAllowance_NativeBigInt = await tokenContract.allowance(ownerAddress, spenderAddress); // allowance уже возвращает нативный BigInt
        console.log(`  Текущее одобрение: ${ethers.formatUnits(currentAllowance_NativeBigInt, token.decimals)} ${token.symbol}`);

        // Сравниваем нативные BigInt
        if (currentAllowance_NativeBigInt < amountToApprove_NativeBigInt) {
            console.log("  Текущее одобрение меньше необходимого. Отправка транзакции approve...");
            // tokenContract.approve ожидает BigNumberish, строка подойдет
            const tx = await tokenContract.approve(spenderAddress, amountToApprove_String);
            console.log(`  Транзакция approve отправлена: ${tx.hash}`);
            await tx.wait(1);
            console.log("  Транзакция approve подтверждена.");
        } else {
            console.log("  Достаточное количество токенов уже одобрено.");
        }
        return true;
    } catch (error) {
        console.error(`  Ошибка при одобрении токена ${token.symbol}:`, error.reason || error.message || error);
        return false;
    }
}

async function getPositionDetails(tokenId, walletSignerOrProvider) {
    console.log(`\n--- Получение информации о позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSignerOrProvider 
    );

    try {
        const positionInfo = await nftPositionManagerContract.positions(tokenId);

        console.log("  Информация о позиции:");
        console.log(`    Token0: ${positionInfo.token0}`);
        console.log(`    Token1: ${positionInfo.token1}`);
        console.log(`    Fee: ${positionInfo.fee.toString()}`);
        console.log(`    Tick Lower: ${positionInfo.tickLower.toString()}`);
        console.log(`    Tick Upper: ${positionInfo.tickUpper.toString()}`);
        console.log(`    Liquidity: ${positionInfo.liquidity.toString()}`);
        console.log(`    FeeGrowthInside0LastX128: ${positionInfo.feeGrowthInside0LastX128.toString()}`);
        console.log(`    FeeGrowthInside1LastX128: ${positionInfo.feeGrowthInside1LastX128.toString()}`);
        console.log(`    Tokens Owed0 (несобранные комиссии для токена0): ${ethers.formatUnits(positionInfo.tokensOwed0, TokenA.equals(positionInfo.token0) ? TokenA.decimals : TokenB.decimals)}`); // Предполагаем, что TokenA или TokenB соответствует token0
        console.log(`    Tokens Owed1 (несобранные комиссии для токена1): ${ethers.formatUnits(positionInfo.tokensOwed1, TokenB.equals(positionInfo.token1) ? TokenB.decimals : TokenA.decimals)}`); // Предполагаем, что TokenB или TokenA соответствует token1

        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === positionInfo.token0.toLowerCase()) {
            displayToken0 = TokenA;
            displayToken1 = TokenB;
        } else {
            displayToken0 = TokenB;
            displayToken1 = TokenA;
        }
        console.log(`    Расшифрованные Tokens Owed0 (${displayToken0.symbol}): ${ethers.formatUnits(positionInfo.tokensOwed0, displayToken0.decimals)}`);
        console.log(`    Расшифрованные Tokens Owed1 (${displayToken1.symbol}): ${ethers.formatUnits(positionInfo.tokensOwed1, displayToken1.decimals)}`);

        const poolFee = Number(positionInfo.fee);
        const poolForPosition = await getPoolData(displayToken0, displayToken1, poolFee);

        if (poolForPosition) {
 
            const liquidityString = positionInfo.liquidity.toString();

            const positionSDK = new Position({
                pool: poolForPosition,
                liquidity: liquidityString,  
                tickLower: Number(positionInfo.tickLower), 
                tickUpper: Number(positionInfo.tickUpper)
            });
            console.log("\n  Информация о позиции из SDK (для проверки):");
            console.log(`    Amount0 (расчетное кол-во ${positionSDK.amount0.currency.symbol}): ${positionSDK.amount0.toSignificant(6)}`);
            console.log(`    Amount1 (расчетное кол-во ${positionSDK.amount1.currency.symbol}): ${positionSDK.amount1.toSignificant(6)}`);
        }

        return positionInfo;

    } catch (error) {
        console.error(`  Ошибка при получении информации о позиции ${tokenId}:`, error.reason || error.message || error);
        return null;
    }
}

async function getUncollectedFees(tokenId, walletSignerOrProvider) {
    console.log(`\n--- Расчет несобранных комиссий для позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSignerOrProvider 
    );

    // Для amount0Max и amount1Max используем максимальное значение для uint128
    // Это (2^128 - 1). В JavaScript BigInt это (2n ** 128n) - 1n;
    const MAX_UINT128 = (2n ** 128n) - 1n;

    const collectParams = {
        tokenId: tokenId,
        recipient: wallet.address,
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128
    };

    try {
        console.log("  Симуляция вызова 'collect' для получения комиссий...");
        const result = await nftPositionManagerContract.collect.staticCall(collectParams);
        
        const feesAmount0 = result.amount0; // Это BigInt
        const feesAmount1 = result.amount1; // Это BigInt

        // Нам нужно знать, какой из токенов (TokenA или TokenB) соответствует amount0 и amount1
        // для этой позиции. Мы можем получить это из getPositionDetails или запросить снова.
        // Для простоты, предположим, что мы знаем порядок из предыдущего вызова getPositionDetails
        // или можем получить его снова.
        // Быстрый способ: запросить позицию снова (менее оптимально, но проще для примера)
        const positionInfoForFees = await nftPositionManagerContract.positions(tokenId);
        let feeToken0, feeToken1;

        if (TokenA.address.toLowerCase() === positionInfoForFees.token0.toLowerCase()) {
            feeToken0 = TokenA;
            feeToken1 = TokenB;
        } else if (TokenB.address.toLowerCase() === positionInfoForFees.token0.toLowerCase()) {
            feeToken0 = TokenB;
            feeToken1 = TokenA;
        } else {
            console.error("  Не удалось сопоставить токены для отображения комиссий.");
            return { feesAmount0, feesAmount1 }; // Возвращаем сырые значения
        }

        console.log(`  Накопленные несобранные комиссии:`);
        console.log(`    ${feeToken0.symbol}: ${ethers.formatUnits(feesAmount0, feeToken0.decimals)}`);
        console.log(`    ${feeToken1.symbol}: ${ethers.formatUnits(feesAmount1, feeToken1.decimals)}`);

        return { feesAmount0, feesAmount1, feeToken0, feeToken1 };

    } catch (error) {
        console.error(`  Ошибка при расчете комиссий для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) {
            try {
                const errorData = nftPositionManagerContract.interface.parseError(error.data);
                console.error("    Ошибка контракта:", errorData.name, errorData.args);
            } catch (e) {
                // console.error("    Не удалось распарсить данные ошибки контракта:", error.data);
            }
        }
        return null;
    }
}

async function collectFees(tokenId, walletSigner) {
    console.log(`\n--- Сбор накопленных комиссий для позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSigner // Нужен walletSigner для отправки транзакции
    );

    // Указываем, что хотим собрать все доступные комиссии
    const MAX_UINT128 = (2n ** 128n) - 1n;

    const collectParams = {
        tokenId: tokenId,
        recipient: await walletSigner.getAddress(), // Комиссии будут отправлены на наш кошелек
        amount0Max: MAX_UINT128,
        amount1Max: MAX_UINT128
    };

    console.log("  Параметры для сбора комиссий (collect):", {
        tokenId: collectParams.tokenId.toString(),
        recipient: collectParams.recipient,
        amount0Max: collectParams.amount0Max.toString(),
        amount1Max: collectParams.amount1Max.toString()
    });

    try {
        // Сначала посмотрим, сколько комиссий доступно (как в getUncollectedFees)
        const staticCallResult = await nftPositionManagerContract.collect.staticCall(collectParams, { from: await walletSigner.getAddress() });
        const feesToCollect0 = staticCallResult.amount0;
        const feesToCollect1 = staticCallResult.amount1;

        // Получим информацию о токенах для отображения
        const positionInfoForDisplay = await nftPositionManagerContract.positions(tokenId);
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === positionInfoForDisplay.token0.toLowerCase()) {
            displayToken0 = TokenA;
            displayToken1 = TokenB;
        } else if (TokenB.address.toLowerCase() === positionInfoForDisplay.token0.toLowerCase()) {
            displayToken0 = TokenB;
            displayToken1 = TokenA;
        } else {
            console.error("  Не удалось сопоставить токены для отображения комиссий.");
            return false;
        }

        console.log(`  Доступно для сбора:`);
        console.log(`    ${displayToken0.symbol}: ${ethers.formatUnits(feesToCollect0, displayToken0.decimals)}`);
        console.log(`    ${displayToken1.symbol}: ${ethers.formatUnits(feesToCollect1, displayToken1.decimals)}`);

        if (feesToCollect0 === 0n && feesToCollect1 === 0n) {
            console.log("  Нет комиссий для сбора.");
            return false;
        }

        console.log("  Отправка транзакции collect для сбора комиссий...");
        const tx = await nftPositionManagerContract.collect(collectParams);
        console.log(`    Транзакция collect отправлена: ${tx.hash}`);
        const receipt = await tx.wait(1);
        console.log("    Транзакция collect подтверждена. Статус:", receipt.status);

        if (receipt.status === 1) {
            console.log("  Комиссии успешно собраны!");

            // Проверим балансы токенов ПОСЛЕ сбора (опционально)
            const token0Contract = new ethers.Contract(displayToken0.address, ERC20_ABI, walletSigner);
            const token1Contract = new ethers.Contract(displayToken1.address, ERC20_ABI, walletSigner);
            
            const balance0After = await token0Contract.balanceOf(walletSigner.address);
            const balance1After = await token1Contract.balanceOf(walletSigner.address);
            console.log(`  Новый баланс ${displayToken0.symbol}: ${ethers.formatUnits(balance0After, displayToken0.decimals)}`);
            console.log(`  Новый баланс ${displayToken1.symbol}: ${ethers.formatUnits(balance1After, displayToken1.decimals)}`);
            return true;
        } else {
            console.error("  Транзакция collect была отменена (reverted).");
            return false;
        }

    } catch (error) {
        console.error(`  Ошибка при сборе комиссий для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) {
            try {
                const errorData = nftPositionManagerContract.interface.parseError(error.data);
                console.error("    Ошибка контракта:", errorData.name, errorData.args);
            } catch (e) {
                // console.error("    Не удалось распарсить данные ошибки контракта:", error.data);
            }
        }
        return false;
    }
}

async function withdrawFullLiquidity(tokenId, walletSigner) {
    console.log(`\n--- Полное изъятие ликвидности и сбор комиссий для позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSigner // Нужен walletSigner для отправки транзакций
    );

    const ownerAddress = await walletSigner.getAddress();

    try {
        // 1. Получаем текущую ликвидность позиции
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        const currentLiquidity = positionInfo.liquidity;

        if (currentLiquidity === 0n) {
            console.log("  Ликвидность этой позиции уже равна нулю.");
            // Можно сразу перейти к сбору остаточных комиссий, если они есть, и затем к burn
        } else {
            console.log(`  Текущая ликвидность позиции: ${currentLiquidity.toString()}`);
            console.log("  Уменьшаем ликвидность до нуля (decreaseLiquidity)...");

            const decreaseLiquidityParams = {
                tokenId: tokenId,
                liquidity: currentLiquidity, // Уменьшаем на всю текущую ликвидность
                amount0Min: 0, // Для простоты и тестовой сети, не устанавливаем minimum
                amount1Min: 0, // В реальных условиях здесь должны быть значения для защиты от проскальзывания
                deadline: Math.floor(Date.now() / 1000) + 60 * 10 // 10 минут
            };
            console.log("    Параметры для decreaseLiquidity:", {
                tokenId: decreaseLiquidityParams.tokenId.toString(),
                liquidity: decreaseLiquidityParams.liquidity.toString(),
                amount0Min: decreaseLiquidityParams.amount0Min.toString(),
                amount1Min: decreaseLiquidityParams.amount1Min.toString(),
                deadline: decreaseLiquidityParams.deadline
            });

            const decreaseTx = await nftPositionManagerContract.decreaseLiquidity(decreaseLiquidityParams);
            console.log(`    Транзакция decreaseLiquidity отправлена: ${decreaseTx.hash}`);
            const decreaseReceipt = await decreaseTx.wait(1);
            console.log("    Транзакция decreaseLiquidity подтверждена. Статус:", decreaseReceipt.status);

            if (decreaseReceipt.status !== 1) {
                console.error("    Уменьшение ликвидности не удалось (транзакция отменена).");
                return false;
            }
            console.log("    Ликвидность успешно уменьшена.");
        }

        // 2. Сбор высвобожденных токенов и всех накопленных комиссий
        console.log("\n  Собираем токены и комиссии (collect)...");
        const MAX_UINT128 = (2n ** 128n) - 1n;
        const collectParams = {
            tokenId: tokenId,
            recipient: ownerAddress,
            amount0Max: MAX_UINT128, // Собираем все доступное
            amount1Max: MAX_UINT128  // Собираем все доступное
        };

        console.log("    Параметры для collect:", {
            tokenId: collectParams.tokenId.toString(),
            recipient: collectParams.recipient,
            amount0Max: collectParams.amount0Max.toString(),
            amount1Max: collectParams.amount1Max.toString()
        });
        
        // Узнаем, какие токены есть в позиции для корректного отображения
        const finalPositionInfo = await nftPositionManagerContract.positions(tokenId); // Обновленная инфо
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) {
            displayToken0 = TokenA; displayToken1 = TokenB;
        } else if (TokenB.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) {
            displayToken0 = TokenB; displayToken1 = TokenA;
        } else {
            console.error("    Не удалось сопоставить токены для отображения собранных сумм.");
            // Попытаемся собрать без точного знания символов
            displayToken0 = {symbol: `Token0(${finalPositionInfo.token0.slice(0,6)})`, decimals: 18}; // Placeholder
            displayToken1 = {symbol: `Token1(${finalPositionInfo.token1.slice(0,6)})`, decimals: 18}; // Placeholder
        }

        // Посмотрим, сколько будет собрано (через staticCall)
        const amountsToCollect = await nftPositionManagerContract.collect.staticCall(collectParams);
        console.log(`    Будет собрано ${displayToken0.symbol}: ${ethers.formatUnits(amountsToCollect.amount0, displayToken0.decimals)}`);
        console.log(`    Будет собрано ${displayToken1.symbol}: ${ethers.formatUnits(amountsToCollect.amount1, displayToken1.decimals)}`);


        if (amountsToCollect.amount0 === 0n && amountsToCollect.amount1 === 0n) {
            console.log("    Нет токенов или комиссий для сбора (суммы нулевые по staticCall).");
        } else {
            const collectTx = await nftPositionManagerContract.collect(collectParams);
            console.log(`    Транзакция collect отправлена: ${collectTx.hash}`);
            const collectReceipt = await collectTx.wait(1);
            console.log("    Транзакция collect подтверждена. Статус:", collectReceipt.status);
            if (collectReceipt.status === 1) {
                console.log("    Токены и комиссии успешно собраны!");
            } else {
                console.error("    Сбор токенов/комиссий не удался (транзакция collect отменена).");
                return false;
            }
        }
        
        // 3. (Опционально) Сжигание NFT, если ликвидность равна нулю
        // Перед сжиганием убедимся, что ликвидность действительно 0
        const finalLiquidityCheck = await nftPositionManagerContract.positions(tokenId);
        if (finalLiquidityCheck.liquidity === 0n) {
            console.log("\n  Ликвидность позиции равна нулю. Сжигаем NFT (burn)...");
            const burnTx = await nftPositionManagerContract.burn(tokenId);
            console.log(`    Транзакция burn отправлена: ${burnTx.hash}`);
            const burnReceipt = await burnTx.wait(1);
            console.log("    Транзакция burn подтверждена. Статус:", burnReceipt.status);
            if (burnReceipt.status === 1) {
                console.log(`    NFT с Token ID ${tokenId} успешно сожжен.`);
            } else {
                console.error("    Сжигание NFT не удалось (транзакция burn отменена).");
            }
        } else {
            console.log(`\n  Ликвидность позиции (${finalLiquidityCheck.liquidity.toString()}) еще не равна нулю. NFT не будет сожжен.`);
        }

        return true;

    } catch (error) {
        console.error(`  Ошибка при изъятии ликвидности для позиции ${tokenId}:`, error.reason || error.message || error);
        // Дополнительная информация об ошибке, если есть
        if (error.data) {
            try {
                const errorData = nftPositionManagerContract.interface.parseError(error.data);
                console.error("    Ошибка контракта:", errorData.name, errorData.args);
            } catch (e) { /* Ошибку не удалось распарсить */ }
        }
        return false;
    }
}

async function increaseLiquidityForPosition(tokenId, additionalAmountTokenA_str, walletSigner) {
    console.log(`\n--- Увеличение ликвидности для позиции NFT с Token ID: ${tokenId} ---`);
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSigner
    );
    const ownerAddress = await walletSigner.getAddress();

    try {
        // 1. Получаем информацию о существующей позиции
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        if (!positionInfo || positionInfo.liquidity === 0n && additionalAmountTokenA_str === "0") { // Проверяем, существует ли позиция и не пытаемся ли добавить 0 в пустую
             // Если ликвидность 0, но мы хотим добавить новую, это нормально.
             // Но если позиция сожжена или недействительна, positions() может вернуть нули или ошибку.
            if (positionInfo.token0 === ethers.ZeroAddress) {
                console.error(`  Позиция с Token ID ${tokenId} не найдена или недействительна.`);
                return false;
            }
        }

        console.log(`  Добавляем ликвидность к существующему диапазону: TickLower ${positionInfo.tickLower.toString()}, TickUpper ${positionInfo.tickUpper.toString()}`);

        // Определяем, какой из наших глобальных токенов (TokenA или TokenB) соответствует token0 и token1 позиции
        let posToken0, posToken1;
        if (TokenA.address.toLowerCase() === positionInfo.token0.toLowerCase()) {
            posToken0 = TokenA; posToken1 = TokenB;
        } else if (TokenB.address.toLowerCase() === positionInfo.token0.toLowerCase()) {
            posToken0 = TokenB; posToken1 = TokenA;
        } else {
            console.error("  Не удалось сопоставить токены позиции с глобальными TokenA/TokenB.");
            return false;
        }
        
        // 2. Получаем текущее состояние пула
        const poolFee = Number(positionInfo.fee);
        const currentPool = await getPoolData(posToken0, posToken1, poolFee);
        if (!currentPool) {
            console.error("  Не удалось получить данные о пуле для этой позиции.");
            return false;
        }

        // 3. Определяем, какой токен мы добавляем (TokenA по умолчанию WETH) и его количество
        // additionalAmountTokenA_str - это строка, например "0.001"
        const tokenBeingAdded = TokenA; // Предполагаем, что additionalAmountTokenA_str относится к TokenA (WETH)
        const additionalAmountToken_wei = ethers.parseUnits(additionalAmountTokenA_str, tokenBeingAdded.decimals);
        
        console.log(`  Планируем добавить примерно: ${additionalAmountTokenA_str} ${tokenBeingAdded.symbol}`);

        // Проверка баланса добавляемого токена
        const tokenBeingAddedContract = new ethers.Contract(tokenBeingAdded.address, ERC20_ABI, provider);
        const balanceTokenBeingAdded = await tokenBeingAddedContract.balanceOf(ownerAddress);
        if (balanceTokenBeingAdded < additionalAmountToken_wei) {
            console.error(`  Недостаточно ${tokenBeingAdded.symbol} на балансе. У вас: ${ethers.formatUnits(balanceTokenBeingAdded, tokenBeingAdded.decimals)}, требуется: ${additionalAmountTokenA_str}`);
            return false;
        }

        // 4. Рассчитываем amounts для добавления с помощью "виртуальной" позиции
        // Эта "виртуальная" позиция использует тики СУЩЕСТВУЮЩЕЙ позиции
        let virtualPositionToAdd;
        if (tokenBeingAdded.equals(currentPool.token0)) {
            virtualPositionToAdd = Position.fromAmount0({
                pool: currentPool,
                tickLower: Number(positionInfo.tickLower),
                tickUpper: Number(positionInfo.tickUpper),
                amount0: additionalAmountToken_wei.toString(), // Передаем строку
                useFullPrecision: true
            });
        } else if (tokenBeingAdded.equals(currentPool.token1)) {
            virtualPositionToAdd = Position.fromAmount1({
                pool: currentPool,
                tickLower: Number(positionInfo.tickLower),
                tickUpper: Number(positionInfo.tickUpper),
                amount1: additionalAmountToken_wei.toString(), // Передаем строку
                useFullPrecision: true
            });
        } else {
            console.error("  Критическая ошибка: Добавляемый токен не является ни token0, ни token1 пула.");
            return false;
        }

        const { amount0: amount0Desired_JSBI, amount1: amount1Desired_JSBI } = virtualPositionToAdd.mintAmounts; // Используем mintAmounts для желаемых количеств

        console.log(`  Рассчитанные суммы для ДОБАВЛЕНИЯ в позицию:`);
        console.log(`    ${currentPool.token0.symbol} (amount0Desired): ${ethers.formatUnits(amount0Desired_JSBI.toString(), currentPool.token0.decimals)}`);
        console.log(`    ${currentPool.token1.symbol} (amount1Desired): ${ethers.formatUnits(amount1Desired_JSBI.toString(), currentPool.token1.decimals)}`);

        // 5. Одобрение токенов
        console.log("\n  Одобрение добавляемых токенов для NonfungiblePositionManager...");
        if (amount0Desired_JSBI > 0n) {
            await approveToken(currentPool.token0, amount0Desired_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, walletSigner);
        }
        if (amount1Desired_JSBI > 0n) {
            await approveToken(currentPool.token1, amount1Desired_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, walletSigner);
        }

        // 6. Вызов increaseLiquidity
        const increaseParams = {
            tokenId: tokenId,
            amount0Desired: amount0Desired_JSBI.toString(), // Передаем строки
            amount1Desired: amount1Desired_JSBI.toString(), // Передаем строки
            amount0Min: 0, // Для простоты
            amount1Min: 0, // Для простоты
            deadline: Math.floor(Date.now() / 1000) + 60 * 10 // 10 минут
        };

        console.log("\n  Параметры для increaseLiquidity:", {
            tokenId: increaseParams.tokenId.toString(),
            amount0Desired: increaseParams.amount0Desired,
            amount1Desired: increaseParams.amount1Desired,
            amount0Min: increaseParams.amount0Min.toString(),
            amount1Min: increaseParams.amount1Min.toString(),
            deadline: increaseParams.deadline
        });
        console.log("  Отправка транзакции increaseLiquidity...");

        const increaseTx = await nftPositionManagerContract.increaseLiquidity(increaseParams);
        console.log(`    Транзакция increaseLiquidity отправлена: ${increaseTx.hash}`);
        const increaseReceipt = await increaseTx.wait(1);
        console.log("    Транзакция increaseLiquidity подтверждена. Статус:", increaseReceipt.status);

        if (increaseReceipt.status === 1) {
            console.log("    Ликвидность успешно добавлена в позицию!");
            // Можно снова вызвать getPositionDetails, чтобы увидеть обновленную ликвидность
            await getPositionDetails(tokenId, walletSigner); // Посмотреть обновленное состояние
        } else {
            console.error("    Добавление ликвидности не удалось (транзакция отменена).");
            return false;
        }
        return true;

    } catch (error) {
        console.error(`  Ошибка при увеличении ликвидности для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) {
            try {
                const errorData = nftPositionManagerContract.interface.parseError(error.data);
                console.error("    Ошибка контракта:", errorData.name, errorData.args);
            } catch (e) { /* Ошибку не удалось распарсить */ }
        }
        return false;
    }
}

async function decreaseLiquidityPartially(tokenId, percentageToRemove, walletSigner) {
    // percentageToRemove - это число от 0 до 100
    if (percentageToRemove <= 0 || percentageToRemove > 100) {
        console.error("  Процент для снятия должен быть больше 0 и не больше 100.");
        return false;
    }
    console.log(`\n--- Частичное изъятие (${percentageToRemove}%) ликвидности для позиции NFT с Token ID: ${tokenId} ---`);
    
    const nftPositionManagerContract = new ethers.Contract(
        UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        INonfungiblePositionManagerABI,
        walletSigner
    );
    const ownerAddress = await walletSigner.getAddress();

    try {
        // 1. Получаем текущую ликвидность позиции
        const positionInfo = await nftPositionManagerContract.positions(tokenId);
        const currentLiquidity = positionInfo.liquidity;

        if (currentLiquidity === 0n) {
            console.log("  Ликвидность этой позиции уже равна нулю. Нечего уменьшать.");
            return false;
        }
        console.log(`  Текущая ликвидность позиции: ${currentLiquidity.toString()}`);

        // 2. Рассчитываем количество ликвидности для изъятия
        // Используем BigInt для расчетов с процентами, чтобы избежать ошибок округления с плавающей точкой
        const liquidityToRemove = (currentLiquidity * BigInt(Math.floor(percentageToRemove * 100))) / 10000n; // Умножаем на 100 для точности до 2 знаков процента

        if (liquidityToRemove === 0n) {
            console.log("  Рассчитанное количество ликвидности для снятия слишком мало (0). Увеличьте процент или размер позиции.");
            return false;
        }
        console.log(`  Планируется изъять ${percentageToRemove}% ликвидности: ${liquidityToRemove.toString()}`);
        if (liquidityToRemove > currentLiquidity) {
            console.warn("  Расчетная ликвидность для снятия больше текущей. Будет снята вся ликвидность.");
            // liquidityToRemove = currentLiquidity; // Можно скорректировать, но decreaseLiquidity сам справится
        }


        console.log("  Уменьшаем ликвидность (decreaseLiquidity)...");
        const decreaseLiquidityParams = {
            tokenId: tokenId,
            liquidity: liquidityToRemove,
            amount0Min: 0, // Для простоты
            amount1Min: 0, // Для простоты
            deadline: Math.floor(Date.now() / 1000) + 60 * 10 // 10 минут
        };
        console.log("    Параметры для decreaseLiquidity:", {
            tokenId: decreaseLiquidityParams.tokenId.toString(),
            liquidity: decreaseLiquidityParams.liquidity.toString(),
            amount0Min: decreaseLiquidityParams.amount0Min.toString(),
            amount1Min: decreaseLiquidityParams.amount1Min.toString(),
            deadline: decreaseLiquidityParams.deadline
        });

        const decreaseTx = await nftPositionManagerContract.decreaseLiquidity(decreaseLiquidityParams);
        console.log(`    Транзакция decreaseLiquidity отправлена: ${decreaseTx.hash}`);
        const decreaseReceipt = await decreaseTx.wait(1);
        console.log("    Транзакция decreaseLiquidity подтверждена. Статус:", decreaseReceipt.status);

        if (decreaseReceipt.status !== 1) {
            console.error("    Уменьшение ликвидности не удалось (транзакция отменена).");
            return false;
        }
        console.log("    Ликвидность успешно частично уменьшена.");

         
        console.log("\n  Собираем токены и комиссии (collect)...");
        const MAX_UINT128 = (2n ** 128n) - 1n;
        const collectParams = {
            tokenId: tokenId,
            recipient: ownerAddress,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128
        };
        
        const finalPositionInfo = await nftPositionManagerContract.positions(tokenId);
        let displayToken0, displayToken1;
        if (TokenA.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) {
            displayToken0 = TokenA; displayToken1 = TokenB;
        } else if (TokenB.address.toLowerCase() === finalPositionInfo.token0.toLowerCase()) {
            displayToken0 = TokenB; displayToken1 = TokenA;
        } else {
            console.error("    Не удалось сопоставить токены для отображения собранных сумм.");
            displayToken0 = {symbol: `Token0(${finalPositionInfo.token0.slice(0,6)})`, decimals: 18};
            displayToken1 = {symbol: `Token1(${finalPositionInfo.token1.slice(0,6)})`, decimals: 18};
        }

        const amountsToCollect = await nftPositionManagerContract.collect.staticCall(collectParams);
        console.log(`    Будет собрано ${displayToken0.symbol}: ${ethers.formatUnits(amountsToCollect.amount0, displayToken0.decimals)}`);
        console.log(`    Будет собрано ${displayToken1.symbol}: ${ethers.formatUnits(amountsToCollect.amount1, displayToken1.decimals)}`);

        if (amountsToCollect.amount0 === 0n && amountsToCollect.amount1 === 0n) {
            console.log("    Нет токенов или комиссий для сбора (суммы нулевые по staticCall). Позиция обновлена.");
        } else {
            const collectTx = await nftPositionManagerContract.collect(collectParams);
            console.log(`    Транзакция collect отправлена: ${collectTx.hash}`);
            const collectReceipt = await collectTx.wait(1);
            console.log("    Транзакция collect подтверждена. Статус:", collectReceipt.status);
            if (collectReceipt.status === 1) {
                console.log("    Частично высвобожденные токены и комиссии успешно собраны!");
            } else {
                console.error("    Сбор токенов/комиссий не удался (транзакция collect отменена).");
                return false;
            }
        }
        
        // NFT НЕ сжигается, так как это частичное изъятие
        console.log(`\n  Частичное изъятие ликвидности для Token ID ${tokenId} завершено.`);
        // Можно снова вызвать getPositionDetails, чтобы увидеть оставшуюся ликвидность
        await getPositionDetails(tokenId, walletSigner); 
        return true;

    } catch (error) {
        console.error(`  Ошибка при частичном изъятии ликвидности для позиции ${tokenId}:`, error.reason || error.message || error);
        if (error.data) {
            try {
                const errorData = nftPositionManagerContract.interface.parseError(error.data);
                console.error("    Ошибка контракта:", errorData.name, errorData.args);
            } catch (e) { /* Ошибку не удалось распарсить */ }
        }
        return false;
    }
}

async function main() {
    console.log("Подключение к Sepolia через:", RPC_URL);
    console.log("Адрес кошелька:", wallet.address);

    try {
        const blockNumber = await provider.getBlockNumber();
        console.log("Текущий номер блока в Sepolia:", blockNumber);

        const ethBalance = await provider.getBalance(wallet.address);
        console.log("Баланс кошелька (ETH Sepolia):", ethers.formatEther(ethBalance), "ETH");


        const knownTokenId = 198164;
        const percentageToWithdraw = 50


        const initialPositionDetails = await getPositionDetails(knownTokenId, provider);
    if (initialPositionDetails && initialPositionDetails.liquidity > 0n) { // Убедимся, что есть ликвидность
        await getUncollectedFees(knownTokenId, provider); // Посмотрим комиссии до

        // Теперь попытаемся частично изъять ликвидность
        console.log(`\nПопытка изъять ${percentageToWithdraw}% ликвидности из позиции ${knownTokenId}...`);
        await decreaseLiquidityPartially(knownTokenId, percentageToWithdraw, wallet);
        } else if (initialPositionDetails && initialPositionDetails.liquidity === 0n) {
            console.log(`Ликвидность для позиции ${knownTokenId} уже равна нулю.`);
        }
        else {
            console.log(`Не удалось получить информацию для позиции ${knownTokenId} перед частичным изъятием.`);
        }

        // const tokenAContract = new ethers.Contract(TokenA.address, ERC20_ABI, provider);
        // const tokenBContract = new ethers.Contract(TokenB.address, ERC20_ABI, provider);
        // const balanceA_wei = await tokenAContract.balanceOf(wallet.address);
        // const balanceB_wei = await tokenBContract.balanceOf(wallet.address);
        // console.log(`Баланс ${TokenA.symbol}: ${ethers.formatUnits(balanceA_wei, TokenA.decimals)}`);
        // console.log(`Баланс ${TokenB.symbol}: ${ethers.formatUnits(balanceB_wei, TokenB.decimals)}`);

        // const selectedFeeTier = FeeAmount.LOW; // 0.05%
        // const currentPool = await getPoolData(TokenA, TokenB, selectedFeeTier);

        // if (!currentPool) {
        //     console.log("\nНе удалось получить данные пула. Завершение работы.");
        //     return;
        // }

        // console.log("\n--- Подготовка к созданию позиции ликвидности ---");
        // const tickSpacing = currentPool.tickSpacing;
        // const currentTick = currentPool.tickCurrent;
        // const tickRangeWidth = 50 * tickSpacing;
        // const tickLower = Math.floor((currentTick - tickRangeWidth) / tickSpacing) * tickSpacing;
        // const tickUpper = Math.ceil((currentTick + tickRangeWidth) / tickSpacing) * tickSpacing;

        // console.log(`  Текущий Tick пула: ${currentTick}, TickSpacing: ${tickSpacing}`);
        // console.log(`  Выбранный диапазон Tick: Lower: ${tickLower}, Upper: ${tickUpper}`);

        // const amountTokenA_toProvide_str = "0.000005";
        // const amountTokenA_toProvide_wei = ethers.parseUnits(amountTokenA_toProvide_str, TokenA.decimals);
        // console.log(`  Планируем внести: ${amountTokenA_toProvide_str} ${TokenA.symbol}`);

        // if (balanceA_wei < amountTokenA_toProvide_wei) {
        //     console.error(`Недостаточно ${TokenA.symbol} на балансе для внесения этой суммы. У вас: ${ethers.formatUnits(balanceA_wei, TokenA.decimals)}, Требуется: ${amountTokenA_toProvide_str}`);
        //     console.log(`Пожалуйста, пополните баланс ${TokenA.symbol} или уменьшите вносимую сумму.`);
        //     return;
        // }

        // let position;
        // const amountTokenA_toProvide_wei_string = amountTokenA_toProvide_wei.toString();

        // if (TokenA.equals(currentPool.token0)) {
        //     position = Position.fromAmount0({
        //         pool: currentPool,
        //         tickLower: tickLower,
        //         tickUpper: tickUpper,
        //         amount0: amountTokenA_toProvide_wei_string,
        //         useFullPrecision: true
        //     });
        // } else if (TokenA.equals(currentPool.token1)) {
        //     position = Position.fromAmount1({
        //         pool: currentPool,
        //         tickLower: tickLower,
        //         tickUpper: tickUpper,
        //         amount1: amountTokenA_toProvide_wei_string,
        //         useFullPrecision: true
        //     });
        // } else {
        //     console.error("Критическая ошибка: Входной TokenA не является ни token0, ни token1 для SDK объекта Pool.");
        //     return;
        // }

        // console.log(`  Расчетные суммы для позиции (на основе ${amountTokenA_toProvide_str} ${TokenA.symbol}):`);
        // console.log(`    Требуется ${position.amount0.currency.symbol}: ${position.amount0.toSignificant(6)} (raw: ${position.amount0.quotient.toString()})`);
        // console.log(`    Требуется ${position.amount1.currency.symbol}: ${position.amount1.toSignificant(6)} (raw: ${position.amount1.quotient.toString()})`);

        // const { amount0: amount0ToMint_JSBI, amount1: amount1ToMint_JSBI } = position.mintAmounts;

        // const amount0Desired_Str = amount0ToMint_JSBI.toString();
        // const amount1Desired_Str = amount1ToMint_JSBI.toString();
        // const amount0Min_Str = "0";
        // const amount1Min_Str = "0";

        // // Проверяем баланс USDC ПОСЛЕ расчета, используя правильные переменные JSBI
        // let requiredTokenB_JSBI_forBalanceCheck;
        // if (TokenB.equals(position.pool.token0)) { // Если TokenB (USDC) это token0 пула
        //     requiredTokenB_JSBI_forBalanceCheck = amount0ToMint_JSBI;
        // } else { // Если TokenB (USDC) это token1 пула
        //     requiredTokenB_JSBI_forBalanceCheck = amount1ToMint_JSBI;
        // }

        // if (balanceB_wei < BigInt(requiredTokenB_JSBI_forBalanceCheck.toString())) {
        //     console.error(`Недостаточно ${TokenB.symbol} для внесения ликвидности. У вас: ${ethers.formatUnits(balanceB_wei, TokenB.decimals)}, Требуется: ${ethers.formatUnits(requiredTokenB_JSBI_forBalanceCheck.toString(), TokenB.decimals)}`);
        //     return;
        // }

        // console.log("\n--- Одобрение токенов для NonfungiblePositionManager ---");
        // const approvedToken0 = await approveToken(position.pool.token0, amount0ToMint_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, wallet);
        // const approvedToken1 = await approveToken(position.pool.token1, amount1ToMint_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, wallet);

        // if (!approvedToken0 || !approvedToken1) {
        //     console.error("Не удалось одобрить один или оба токена. Минтинг отменен.");
        //     return;
        // }

        // console.log("\n--- Шаг 3.3: Минтинг новой позиции ликвидности ---");
        // const nftPositionManagerContract = new ethers.Contract(
        //     UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
        //     INonfungiblePositionManagerABI,
        //     wallet
        // );

        // const mintOptions = {
        //     token0: currentPool.token0.address,
        //     token1: currentPool.token1.address,
        //     fee: currentPool.fee,
        //     tickLower: position.tickLower,
        //     tickUpper: position.tickUpper,
        //     amount0Desired: amount0Desired_Str,
        //     amount1Desired: amount1Desired_Str,
        //     amount0Min: amount0Min_Str,
        //     amount1Min: amount1Min_Str,
        //     recipient: wallet.address,
        //     deadline: Math.floor(Date.now() / 1000) + 60 * 20
        // };

        // console.log("Параметры для mint (с конвертированными суммами):", mintOptions);

        // try {
        //     console.log("Отправка транзакции mint...");
        //     const mintTx = await nftPositionManagerContract.mint(mintOptions);
        //     console.log(`  Транзакция mint отправлена: ${mintTx.hash}`);
        //     const receipt = await mintTx.wait(1);
        //     console.log("  Транзакция mint подтверждена.");

        //     const eventInterface = new ethers.Interface(INonfungiblePositionManagerABI);
        //     let tokenId = null;
        //     for (const log of receipt.logs) {
        //         try {
        //             const parsedLog = eventInterface.parseLog(log);
        //             if (parsedLog && parsedLog.name === "IncreaseLiquidity") {
        //                 tokenId = parsedLog.args.tokenId;
        //                 break;
        //             }
        //         } catch (e) { /* Не тот лог или не тот ABI */ }
        //     }

        //     if (tokenId !== null) {
        //         console.log(`\n🎉 Позиция ликвидности успешно создана! Token ID: ${tokenId.toString()}`);
        //         const positionDetails = await getPositionDetails(tokenId, provider);  
        //         if (positionDetails) {
                     
        //             await getUncollectedFees(tokenId, provider);  
        //         }
        //     } else {
        //         console.log("\n⚠️ Позиция создана, но не удалось извлечь tokenId из событий. Проверьте транзакцию в блок-эксплорере.");
        //     }
        // } catch (mintError) {
        //     console.error("Ошибка при минте позиции:", mintError.reason || mintError.message);
        //     if (mintError.data) {
        //         try {
        //             const errorData = nftPositionManagerContract.interface.parseError(mintError.data);
        //             console.error("  Ошибка контракта:", errorData.name, errorData.args);
        //         } catch (e) {
        //             console.error("  Не удалось распарсить данные ошибки контракта:", mintError.data);
        //         }
        //     }
        // }
    } catch (error) {
        console.error("\nПроизошла глобальная ошибка в main:", error);
    }
}

main();