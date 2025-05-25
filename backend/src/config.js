const path = require('path');
const envFilePath = path.resolve(__dirname, '../.env');
const configResult = require('dotenv').config({
    path: envFilePath,
});
const { ethers } = require("ethers");
const { Token } = require('@uniswap/sdk-core');

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS = process.env.UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
const UNISWAP_V3_SWAP_ROUTER_ADDRESS = process.env.UNISWAP_V3_SWAP_ROUTER_ADDRESS;
const UNISWAP_V3_FACTORY_ADDRESS = process.env.UNISWAP_V3_FACTORY_ADDRESS;
const UNISWAP_V3_QUOTER_V2_ADDRESS = process.env.UNISWAP_V3_QUOTER_V2_ADDRESS;  
const TOKEN0_ADDRESS_ENV = process.env.TOKEN0_ADDRESS;
const TOKEN1_ADDRESS_ENV = process.env.TOKEN1_ADDRESS;


if (!RPC_URL || !PRIVATE_KEY || !UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS || !UNISWAP_V3_FACTORY_ADDRESS || !TOKEN0_ADDRESS_ENV || !TOKEN1_ADDRESS_ENV) {
     
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

module.exports = {
    ethers,  
    provider,
    wallet,
    CHAIN_ID,
    UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
    UNISWAP_V3_SWAP_ROUTER_ADDRESS,
    UNISWAP_V3_FACTORY_ADDRESS,
    UNISWAP_V3_QUOTER_V2_ADDRESS,
    TokenA,  
    TokenB,  
    TOKEN0_ADDRESS: TOKEN0_ADDRESS_ENV,
    TOKEN1_ADDRESS: TOKEN1_ADDRESS_ENV
};