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



if (!RPC_URL || !PRIVATE_KEY || !UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS || !UNISWAP_V3_FACTORY_ADDRESS ) {
     
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const CHAIN_ID = 11155111;  


 

module.exports = {
    ethers,  
    provider,
    wallet,
    CHAIN_ID,
    UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS,
    UNISWAP_V3_SWAP_ROUTER_ADDRESS,
    UNISWAP_V3_FACTORY_ADDRESS,
    UNISWAP_V3_QUOTER_V2_ADDRESS,
};