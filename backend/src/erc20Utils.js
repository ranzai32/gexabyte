const { ethers } = require("ethers");  

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

async function approveToken(tokenSDKObject, amountToApprove_JSBI, spenderAddress, walletSigner) {
    const tokenContract = new ethers.Contract(tokenSDKObject.address, ERC20_ABI, walletSigner);
    const ownerAddress = await walletSigner.getAddress();
    
    const amountToApprove_String = amountToApprove_JSBI.toString();
    const amountToApprove_NativeBigInt = BigInt(amountToApprove_String);

    console.log(`\nПроверка и одобрение для токена ${tokenSDKObject.symbol} (${tokenSDKObject.address})`);
    console.log(`  Владелец: ${ownerAddress}`);
    console.log(`  Спендер: ${spenderAddress}`);
    console.log(`  Сумма к одобрению: ${ethers.formatUnits(amountToApprove_String, tokenSDKObject.decimals)} ${tokenSDKObject.symbol}`);

    try {
        const currentAllowance_NativeBigInt = await tokenContract.allowance(ownerAddress, spenderAddress);
        console.log(`  Текущее одобрение: ${ethers.formatUnits(currentAllowance_NativeBigInt, tokenSDKObject.decimals)} ${tokenSDKObject.symbol}`);

        if (currentAllowance_NativeBigInt < amountToApprove_NativeBigInt) {
            console.log("  Текущее одобрение меньше необходимого. Отправка транзакции approve...");
            const tx = await tokenContract.approve(spenderAddress, amountToApprove_String);
            console.log(`  Транзакция approve отправлена: ${tx.hash}`);
            await tx.wait(1);
            console.log("  Транзакция approve подтверждена.");
        } else {
            console.log("  Достаточное количество токенов уже одобрено.");
        }
        return true;
    } catch (error) {
        console.error(`  Ошибка при одобрении токена ${tokenSDKObject.symbol}:`, error.reason || error.message || error);
        return false;
    }
}

module.exports = {
    approveToken,
    ERC20_ABI  
};