require('dotenv').config();
const { ethers } = require("ethers");
const { Token, CurrencyAmount, Price } = require('@uniswap/sdk-core');
const { Pool, FeeAmount, Position, NonfungiblePositionManager } = require('@uniswap/v3-sdk'); // Removed unused mintAmountsWithSlippage for now

// ABI Imports
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json').abi;
const IUniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json').abi;
const INonfungiblePositionManagerABI = require('@uniswap/v3-periphery/artifacts/contracts/interfaces/INonfungiblePositionManager.sol/INonfungiblePositionManager.json').abi;
const ERC20_ABI = [ // Minimal ABI for ERC20 approve and allowance
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)" // Added for balance checks
];

// Environment Variables
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS = process.env.UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
const UNISWAP_V3_SWAP_ROUTER_ADDRESS = process.env.UNISWAP_V3_SWAP_ROUTER_ADDRESS; // Currently unused, but kept from your structure
const UNISWAP_V3_FACTORY_ADDRESS = process.env.UNISWAP_V3_FACTORY_ADDRESS;
const UNISWAP_V3_QUOTER_V2_ADDRESS = process.env.UNISWAP_V3_QUOTER_V2_ADDRESS; // Currently unused
const TOKEN0_ADDRESS_ENV = process.env.TOKEN0_ADDRESS; // WETH
const TOKEN1_ADDRESS_ENV = process.env.TOKEN1_ADDRESS; // USDC

// Validate essential environment variables
if (!RPC_URL || !PRIVATE_KEY || !UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS || !UNISWAP_V3_FACTORY_ADDRESS || !TOKEN0_ADDRESS_ENV || !TOKEN1_ADDRESS_ENV) {
    console.error("Ошибка: Одна или несколько обязательных переменных окружения не установлены (RPC_URL, PRIVATE_KEY, NFT_MANAGER, FACTORY, TOKEN0_ADDRESS, TOKEN1_ADDRESS).");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const CHAIN_ID = 11155111; // Sepolia

// Token Constants from .env
const TOKEN0_DECIMALS = 18; // WETH typically
const TOKEN0_SYMBOL = "WETH";
const TOKEN1_DECIMALS = 6;  // USDC typically
const TOKEN1_SYMBOL = "USDC";

// SDK Token Objects
const TokenA = new Token(CHAIN_ID, TOKEN0_ADDRESS_ENV, TOKEN0_DECIMALS, TOKEN0_SYMBOL, "Wrapped Ether (Test)");
const TokenB = new Token(CHAIN_ID, TOKEN1_ADDRESS_ENV, TOKEN1_DECIMALS, TOKEN1_SYMBOL, "USD Coin (Test)");

// --- Helper Functions ---

async function getPoolData(tokenA_input, tokenB_input, feeTier) {
    const factoryContract = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, IUniswapV3FactoryABI, provider);
    console.log(`\nЗапрашиваем адрес пула для ${tokenA_input.symbol}/${tokenB_input.symbol} с комиссией ${feeTier / 10000}%...`);
    
    // Factory expects token addresses in any order, it sorts them internally
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

        // Determine which of our input Token objects corresponds to token0 and token1 of the pool
        // token0 in a Uniswap V3 pool always has an address numerically less than token1
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
            const positionSDK = new Position({
                pool: poolForPosition,
                liquidity: positionInfo.liquidity,
                tickLower: Number(positionInfo.tickLower),
                tickUpper: Number(positionInfo.tickUpper)
            });
            console.log("\n  Информация о позиции из SDK (для проверки):");
            console.log(`    Amount0 (расчетное кол-во ${positionSDK.amount0.currency.symbol}): ${positionSDK.amount0.toSignificant(6)}`);
            console.log(`    Amount1 (расчетное кол-во ${positionSDK.amount1.currency.symbol}): ${positionSDK.amount1.toSignificant(6)}`);
            // Текущая стоимость позиции может быть рассчитана с использованием positionSDK.token0Price, positionSDK.token1Price
        }

        return positionInfo;

    } catch (error) {
        console.error(`  Ошибка при получении информации о позиции ${tokenId}:`, error.reason || error.message || error);
        return null;
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

        const tokenAContract = new ethers.Contract(TokenA.address, ERC20_ABI, provider);
        const tokenBContract = new ethers.Contract(TokenB.address, ERC20_ABI, provider);
        const balanceA_wei = await tokenAContract.balanceOf(wallet.address);
        const balanceB_wei = await tokenBContract.balanceOf(wallet.address);
        console.log(`Баланс ${TokenA.symbol}: ${ethers.formatUnits(balanceA_wei, TokenA.decimals)}`);
        console.log(`Баланс ${TokenB.symbol}: ${ethers.formatUnits(balanceB_wei, TokenB.decimals)}`);

        const selectedFeeTier = FeeAmount.LOW; // 0.05%
        const currentPool = await getPoolData(TokenA, TokenB, selectedFeeTier);

        if (!currentPool) {
            console.log("\nНе удалось получить данные пула. Завершение работы.");
            return;
        }

        console.log("\n--- Подготовка к созданию позиции ликвидности ---");
        const tickSpacing = currentPool.tickSpacing;
        const currentTick = currentPool.tickCurrent;
        const tickRangeWidth = 50 * tickSpacing;
        const tickLower = Math.floor((currentTick - tickRangeWidth) / tickSpacing) * tickSpacing;
        const tickUpper = Math.ceil((currentTick + tickRangeWidth) / tickSpacing) * tickSpacing;

        console.log(`  Текущий Tick пула: ${currentTick}, TickSpacing: ${tickSpacing}`);
        console.log(`  Выбранный диапазон Tick: Lower: ${tickLower}, Upper: ${tickUpper}`);

        const amountTokenA_toProvide_str = "0.000005";
        const amountTokenA_toProvide_wei = ethers.parseUnits(amountTokenA_toProvide_str, TokenA.decimals);
        console.log(`  Планируем внести: ${amountTokenA_toProvide_str} ${TokenA.symbol}`);

        if (balanceA_wei < amountTokenA_toProvide_wei) {
            console.error(`Недостаточно ${TokenA.symbol} на балансе для внесения этой суммы. У вас: ${ethers.formatUnits(balanceA_wei, TokenA.decimals)}, Требуется: ${amountTokenA_toProvide_str}`);
            console.log(`Пожалуйста, пополните баланс ${TokenA.symbol} или уменьшите вносимую сумму.`);
            return;
        }

        let position;
        const amountTokenA_toProvide_wei_string = amountTokenA_toProvide_wei.toString();

        if (TokenA.equals(currentPool.token0)) {
            position = Position.fromAmount0({
                pool: currentPool,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0: amountTokenA_toProvide_wei_string,
                useFullPrecision: true
            });
        } else if (TokenA.equals(currentPool.token1)) {
            position = Position.fromAmount1({
                pool: currentPool,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount1: amountTokenA_toProvide_wei_string,
                useFullPrecision: true
            });
        } else {
            console.error("Критическая ошибка: Входной TokenA не является ни token0, ни token1 для SDK объекта Pool.");
            return;
        }

        console.log(`  Расчетные суммы для позиции (на основе ${amountTokenA_toProvide_str} ${TokenA.symbol}):`);
        console.log(`    Требуется ${position.amount0.currency.symbol}: ${position.amount0.toSignificant(6)} (raw: ${position.amount0.quotient.toString()})`);
        console.log(`    Требуется ${position.amount1.currency.symbol}: ${position.amount1.toSignificant(6)} (raw: ${position.amount1.quotient.toString()})`);

        const { amount0: amount0ToMint_JSBI, amount1: amount1ToMint_JSBI } = position.mintAmounts;

        const amount0Desired_Str = amount0ToMint_JSBI.toString();
        const amount1Desired_Str = amount1ToMint_JSBI.toString();
        const amount0Min_Str = "0";
        const amount1Min_Str = "0";

        // Проверяем баланс USDC ПОСЛЕ расчета, используя правильные переменные JSBI
        let requiredTokenB_JSBI_forBalanceCheck;
        if (TokenB.equals(position.pool.token0)) { // Если TokenB (USDC) это token0 пула
            requiredTokenB_JSBI_forBalanceCheck = amount0ToMint_JSBI;
        } else { // Если TokenB (USDC) это token1 пула
            requiredTokenB_JSBI_forBalanceCheck = amount1ToMint_JSBI;
        }

        if (balanceB_wei < BigInt(requiredTokenB_JSBI_forBalanceCheck.toString())) {
            console.error(`Недостаточно ${TokenB.symbol} для внесения ликвидности. У вас: ${ethers.formatUnits(balanceB_wei, TokenB.decimals)}, Требуется: ${ethers.formatUnits(requiredTokenB_JSBI_forBalanceCheck.toString(), TokenB.decimals)}`);
            return;
        }

        console.log("\n--- Одобрение токенов для NonfungiblePositionManager ---");
        const approvedToken0 = await approveToken(position.pool.token0, amount0ToMint_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, wallet);
        const approvedToken1 = await approveToken(position.pool.token1, amount1ToMint_JSBI, UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS, wallet);

        if (!approvedToken0 || !approvedToken1) {
            console.error("Не удалось одобрить один или оба токена. Минтинг отменен.");
            return;
        }

        console.log("\n--- Шаг 3.3: Минтинг новой позиции ликвидности ---");
        const nftPositionManagerContract = new ethers.Contract(
            UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
            INonfungiblePositionManagerABI,
            wallet
        );

        const mintOptions = {
            token0: currentPool.token0.address,
            token1: currentPool.token1.address,
            fee: currentPool.fee,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            amount0Desired: amount0Desired_Str,
            amount1Desired: amount1Desired_Str,
            amount0Min: amount0Min_Str,
            amount1Min: amount1Min_Str,
            recipient: wallet.address,
            deadline: Math.floor(Date.now() / 1000) + 60 * 20
        };

        console.log("Параметры для mint (с конвертированными суммами):", mintOptions);

        try {
            console.log("Отправка транзакции mint...");
            const mintTx = await nftPositionManagerContract.mint(mintOptions);
            console.log(`  Транзакция mint отправлена: ${mintTx.hash}`);
            const receipt = await mintTx.wait(1);
            console.log("  Транзакция mint подтверждена.");

            const eventInterface = new ethers.Interface(INonfungiblePositionManagerABI);
            let tokenId = null;
            for (const log of receipt.logs) {
                try {
                    const parsedLog = eventInterface.parseLog(log);
                    if (parsedLog && parsedLog.name === "IncreaseLiquidity") {
                        tokenId = parsedLog.args.tokenId;
                        break;
                    }
                } catch (e) { /* Не тот лог или не тот ABI */ }
            }

            if (tokenId !== null) {
                console.log(`\n🎉 Позиция ликвидности успешно создана! Token ID: ${tokenId.toString()}`);
                await getPositionDetails(tokenId, provider);
            } else {
                console.log("\n⚠️ Позиция создана, но не удалось извлечь tokenId из событий. Проверьте транзакцию в блок-эксплорере.");
            }
        } catch (mintError) {
            console.error("Ошибка при минте позиции:", mintError.reason || mintError.message);
            if (mintError.data) {
                try {
                    const errorData = nftPositionManagerContract.interface.parseError(mintError.data);
                    console.error("  Ошибка контракта:", errorData.name, errorData.args);
                } catch (e) {
                    console.error("  Не удалось распарсить данные ошибки контракта:", mintError.data);
                }
            }
        }
    } catch (error) {
        console.error("\nПроизошла глобальная ошибка в main:", error);
    }
}

main();