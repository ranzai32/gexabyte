require('dotenv').config();
const { ethers } = require("ethers");
const { Token } = require('@uniswap/sdk-core');
const { FeeAmount } = require('@uniswap/v3-sdk');
// ABI для ISwapRouter (должен подходить для SwapRouter02)
const ISwapRouterABI = [{"inputs":[{"internalType":"address","name":"_factoryV2","type":"address"},{"internalType":"address","name":"factoryV3","type":"address"},{"internalType":"address","name":"_positionManager","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveMax","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveMaxMinusOne","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveZeroThenMax","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveZeroThenMaxMinusOne","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"data","type":"bytes"}],"name":"callPositionManager","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"paths","type":"bytes[]"},{"internalType":"uint128[]","name":"amounts","type":"uint128[]"},{"internalType":"uint24","name":"maximumTickDivergence","type":"uint24"},{"internalType":"uint32","name":"secondsAgo","type":"uint32"}],"name":"checkOracleSlippage","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"uint24","name":"maximumTickDivergence","type":"uint24"},{"internalType":"uint32","name":"secondsAgo","type":"uint32"}],"name":"checkOracleSlippage","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"}],"internalType":"struct IV3SwapRouter.ExactInputParams","name":"params","type":"tuple"}],"name":"exactInput","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IV3SwapRouter.ExactInputSingleParams","name":"params","type":"tuple"}],"name":"exactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"}],"internalType":"struct IV3SwapRouter.ExactOutputParams","name":"params","type":"tuple"}],"name":"exactOutput","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IV3SwapRouter.ExactOutputSingleParams","name":"params","type":"tuple"}],"name":"exactOutputSingle","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"factoryV2","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getApprovalType","outputs":[{"internalType":"enum IApproveAndCall.ApprovalType","name":"","type":"uint8"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"}],"internalType":"struct IApproveAndCall.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"internalType":"struct IApproveAndCall.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"previousBlockhash","type":"bytes32"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"positionManager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"pull","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"sweepTokenWithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"sweepTokenWithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"unwrapWETH9WithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"unwrapWETH9WithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"name":"wrapETH","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

// --- Загрузка переменных окружения ---
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const SWAP_ROUTER_ADDRESS = "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E"; 

const USDC_ADDRESS = process.env.TOKEN1_ADDRESS;
const WETH_ADDRESS = process.env.TOKEN0_ADDRESS;

// Проверка наличия переменных
if (!RPC_URL || !PRIVATE_KEY || !SWAP_ROUTER_ADDRESS || !USDC_ADDRESS || !WETH_ADDRESS) {
    console.error("Ошибка: Не установлены все необходимые переменные окружения или адреса контрактов.");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const CHAIN_ID = 11155111; // Sepolia

// Объекты Token SDK
const UsdcToken = new Token(CHAIN_ID, USDC_ADDRESS, 6, "USDC", "USD Coin");
const WethToken = new Token(CHAIN_ID, WETH_ADDRESS, 18, "WETH", "Wrapped Ether");

async function swapUsdcForWethWithSwapRouter02() {
    console.log(`Подключен кошелек: ${wallet.address}`);
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
    const wethContract = new ethers.Contract(WETH_ADDRESS, ERC20_ABI, wallet); // Используем wallet для последующего запроса баланса

    let usdcBalance, ethBalance, wethBalanceInitial;
    try {
        usdcBalance = await usdcContract.balanceOf(wallet.address);
        ethBalance = await provider.getBalance(wallet.address);
        wethBalanceInitial = await wethContract.balanceOf(wallet.address);
        console.log(`Баланс ETH: ${ethers.formatEther(ethBalance)} ETH`);
        console.log(`Баланс USDC: ${ethers.formatUnits(usdcBalance, UsdcToken.decimals)}`);
        console.log(`Начальный баланс WETH: ${ethers.formatUnits(wethBalanceInitial, WethToken.decimals)}`);
    } catch (e) {
        console.error("Ошибка при получении балансов:", e.message);
        return;
    }
    
    if (usdcBalance === 0n) {
        console.log("Недостаточно USDC для обмена (баланс 0).");
        return;
    }

    // --- Параметры обмена ---
    const amountToSwapStr = "1"; // Сколько USDC обменять
    const amountIn = ethers.parseUnits(amountToSwapStr, UsdcToken.decimals);

    if (usdcBalance < amountIn) {
        console.log(`Недостаточно USDC для обмена ${amountToSwapStr}. У вас: ${ethers.formatUnits(usdcBalance, UsdcToken.decimals)}`);
        return;
    }

    // Используем feeTier = 500 (0.05%), так как вы подтвердили, что пул с этой комиссией существует и имеет ликвидность
    const feeTier = FeeAmount.LOW; 
    console.log(`Выбран feeTier: ${feeTier}`);

    // 1. Одобрение (Approve) USDC для SwapRouter02
    console.log(`\nОдобряем ${amountToSwapStr} USDC для контракта SwapRouter (${SWAP_ROUTER_ADDRESS})...`);
    try {
        const currentAllowance = await usdcContract.allowance(wallet.address, SWAP_ROUTER_ADDRESS);
        console.log(`  Текущее одобрение: ${ethers.formatUnits(currentAllowance, UsdcToken.decimals)} USDC`);
        if (currentAllowance < amountIn) {
            const approveTx = await usdcContract.approve(SWAP_ROUTER_ADDRESS, amountIn);
            console.log(`  Транзакция approve отправлена: ${approveTx.hash}`);
            await approveTx.wait(1);
            console.log("  USDC успешно одобрены.");
        } else {
            console.log("  USDC уже одобрены в достаточном количестве.");
        }
    } catch (approveError) {
        console.error("  Ошибка при одобрении USDC:", approveError.reason || approveError.message);
        return;
    }

    // 2. Выполнение обмена (Swap)
    console.log(`\nВыполняем обмен ${amountToSwapStr} USDC на WETH...`);
    const swapRouterContract = new ethers.Contract(SWAP_ROUTER_ADDRESS, ISwapRouterABI, wallet);

    // Устанавливаем минимальное количество WETH (0 для максимального проскальзывания в тесте)
    const amountOutMinimum = 0n;
    console.log(`  Минимально приемлемое количество WETH: ${ethers.formatUnits(amountOutMinimum, WethToken.decimals)} (установлено в 0)`);

    const paramsForSwap = {
        tokenIn: UsdcToken.address,
        tokenOut: WethToken.address,
        fee: feeTier,
        recipient: wallet.address,
        deadline: Math.floor(Date.now() / 1000) + (60 * 10), // 10 минут
        amountIn: amountIn,
        amountOutMinimum: amountOutMinimum,
        sqrtPriceLimitX96: 0,
    };
    console.log("  Параметры для exactInputSingle:", paramsForSwap);

    try {
        // Попытка оценить газ перед отправкой транзакции
        console.log("  Попытка оценить газ для exactInputSingle...");
        let estimatedGas;
        try {
            estimatedGas = await swapRouterContract.exactInputSingle.estimateGas(paramsForSwap, {from: wallet.address});
            console.log(`  Примерный необходимый газ: ${estimatedGas.toString()}`);
        } catch (estimateError) {
            console.error("  Ошибка при оценке газа (estimateGas):", estimateError.reason || estimateError.message);
            console.error("    estimateError code:", estimateError.code);
            console.error("    estimateError data:", estimateError.data);
            // Если estimateGas не удается, транзакция, скорее всего, тоже не удастся.
            // Можно попробовать отправить с большим лимитом газа или прервать выполнение.
            console.log("  Пробуем отправить транзакцию с фиксированным лимитом газа, так как оценка не удалась.");
            estimatedGas = 500000n; // Запасной лимит газа
        }


        console.log("  Отправка транзакции exactInputSingle...");
        const swapTx = await swapRouterContract.exactInputSingle(paramsForSwap, {
             gasLimit: estimatedGas // Используем оцененный или запасной газ
        });
        console.log(`  Транзакция обмена отправлена: ${swapTx.hash}`);
        const receipt = await swapTx.wait(1);
        console.log("  Обмен успешно выполнен! Статус транзакции:", receipt.status);

        if (receipt.status === 1) {
            const wethBalanceAfter = await wethContract.balanceOf(wallet.address);
            const usdcBalanceAfter = await usdcContract.balanceOf(wallet.address);
            console.log(`\nИтоговый баланс WETH: ${ethers.formatUnits(wethBalanceAfter, WethToken.decimals)}`);
            console.log(`Итоговый баланс USDC: ${ethers.formatUnits(usdcBalanceAfter, UsdcToken.decimals)}`);
        } else {
            console.error("  Транзакция обмена была отменена (status 0). Проверьте Etherscan по хешу.");
        }

    } catch (swapError) {
        console.error("  Ошибка при выполнении обмена (swapError):", swapError.reason || swapError.message);
        if (swapError.data && swapError.data !== "0x") {
            try {
                const errorData = swapRouterContract.interface.parseError(swapError.data);
                console.error("    Ошибка контракта (из swapError):", errorData.name, errorData.args);
            } catch (e) {
                 console.error("    Не удалось распарсить данные ошибки контракта (из swapError.data):", swapError.data);
            }
        }
        if (swapError.transactionHash) {
             console.error("    Хеш транзакции, вызвавшей ошибку:", swapError.transactionHash);
        }
         console.error("    Полная ошибка обмена (swapError):", swapError);
    }
}

swapUsdcForWethWithSwapRouter02().catch(error => {
    console.error("Произошла непредвиденная глобальная ошибка:", error);
    process.exit(1);
}).finally(() => {
    console.log("--- Выполнение скрипта обмена завершено ---");
});