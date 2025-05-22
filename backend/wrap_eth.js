require('dotenv').config();
const { ethers } = require("ethers");

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const WETH_ADDRESS = process.env.TOKEN0_ADDRESS; // Адрес WETH из вашего .env (0xfff9976782d46cc05630d1f6ebab18b2324d6b14)

// Проверка наличия переменных
if (!RPC_URL || !PRIVATE_KEY || !WETH_ADDRESS) {
    console.error("Ошибка: Не установлены RPC_URL, PRIVATE_KEY или WETH_ADDRESS в .env файле.");
    process.exit(1);
}

// ABI для контракта WETH (минимальный, только для deposit, withdraw и balanceOf)
const IWETH_ABI = [
    "function deposit() external payable",
    "function withdraw(uint256 wad) external",
    "function balanceOf(address owner) external view returns (uint256)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function wrapEth() {
    console.log(`Подключен кошелек: ${wallet.address}`);
    const wethContract = new ethers.Contract(WETH_ADDRESS, IWETH_ABI, wallet);

    // --- Проверка балансов ---
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`Текущий баланс ETH: ${ethers.formatEther(ethBalance)} ETH`);

    const wethBalanceInitial = await wethContract.balanceOf(wallet.address);
    console.log(`Начальный баланс WETH: ${ethers.formatUnits(wethBalanceInitial, 18)} WETH`); // WETH имеет 18 знаков

    // --- Сколько ETH обернуть ---
    const amountToWrapStr = "0.01"; // Например, оборачиваем 0.01 ETH
    const amountToWrapWei = ethers.parseEther(amountToWrapStr);

    if (ethBalance < amountToWrapWei) {
        console.error(`Недостаточно ETH для обертывания. Требуется: ${amountToWrapStr} ETH, у вас: ${ethers.formatEther(ethBalance)} ETH.`);
        return;
    }

    console.log(`\nОборачиваем ${amountToWrapStr} ETH в WETH...`);

    try {
        // Для вызова deposit() нужно отправить ETH вместе с транзакцией
        const tx = await wethContract.deposit({ value: amountToWrapWei });
        console.log(`  Транзакция deposit отправлена: ${tx.hash}`);
        
        const receipt = await tx.wait(1); // Ждем 1 подтверждение
        console.log("  Обертывание ETH в WETH успешно выполнено! Статус транзакции:", receipt.status);

        const wethBalanceAfter = await wethContract.balanceOf(wallet.address);
        const ethBalanceAfter = await provider.getBalance(wallet.address);

        console.log(`\nИтоговый баланс WETH: ${ethers.formatUnits(wethBalanceAfter, 18)} WETH`);
        console.log(`Итоговый баланс ETH: ${ethers.formatEther(ethBalanceAfter)} ETH`);

    } catch (error) {
        console.error("  Ошибка при обертывании ETH:", error.reason || error.message || error);
        if (error.data) {
            // Попытка распарсить ошибку контракта, если есть
            try {
                const errorData = wethContract.interface.parseError(error.data);
                console.error("  Ошибка контракта:", errorData.name, errorData.args);
            } catch (e) {
                // console.error("  Не удалось распарсить данные ошибки контракта:", error.data);
            }
        }
         console.error("  Полная ошибка:", error);
    }
}

wrapEth().catch(error => {
    console.error("Произошла непредвиденная глобальная ошибка:", error);
});