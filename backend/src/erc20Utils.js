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

     

    try {
        const currentAllowance_NativeBigInt = await tokenContract.allowance(ownerAddress, spenderAddress);
         

        if (currentAllowance_NativeBigInt < amountToApprove_NativeBigInt) {
             
            const tx = await tokenContract.approve(spenderAddress, amountToApprove_String);
             
            await tx.wait(1);
             
        } else {
             
        }
        return true;
    } catch (error) {
         
        return false;
    }
}

module.exports = {
    approveToken,
    ERC20_ABI  
};