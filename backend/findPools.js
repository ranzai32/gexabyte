const { ethers } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const { UNISWAP_V3_FACTORY_ADDRESS } = require('./src/config');
const IUniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json').abi;
const RPC_URL = "https://blockchain.googleapis.com/v1/projects/direct-subset-455707-v4/locations/us-central1/endpoints/ethereum-sepolia/rpc?key=AIzaSyDOZL9A0C4PHyPZtIoxSAMvf2bZcVukvic";
// 👇 список токенов
const TOKENS = {
    WETH: {
        address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
        symbol: 'WETH',
    },
    USDC: {
        address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        symbol: 'USDC',
    },
    OKB: {
        address: '0x3F4B6664338F23d2397c953f2AB4Ce8031663f80',
        symbol: 'OKB',
    },
    R2USD: {
        address: '0x20c54C5F742F123Abb49a982BFe0af47edb38756',
        symbol: 'R2USD',
    },
    WBTC: {
        address: '0x340a5B718557801f20AfD6E244C78Fcd1c0B2212',
        symbol: 'WBTC',
    },
    SR2USD: {
        address: '0xBD6b25c4132F09369C354beE0f7be777D7d434fa',
        symbol: 'SR2USD',
    },
    LINK: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'LINK',
    }
};

// стандартные fee-типы Uniswap V3
const FEE_TIERS = [100, 500, 3000, 10000];

async function findAllPools() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, IUniswapV3FactoryABI, provider);

    const symbols = Object.keys(TOKENS);
    const results = [];

    for (let i = 0; i < symbols.length; i++) {
        for (let j = i + 1; j < symbols.length; j++) {
            const tokenA = TOKENS[symbols[i]];
            const tokenB = TOKENS[symbols[j]];

            const poolFees = [];

            for (const fee of FEE_TIERS) {
                try {
                    const pool = await factory.getPool(tokenA.address, tokenB.address, fee);
                    if (pool !== ethers.ZeroAddress) {
                        poolFees.push({ fee, pool });
                    }
                } catch (err) {
                    console.error(`Ошибка при getPool(${tokenA.symbol}, ${tokenB.symbol}, fee=${fee}):`, err.message);
                }
            }

            if (poolFees.length > 0) {
                results.push({
                    pair: `${tokenA.symbol}/${tokenB.symbol}`,
                    fees: poolFees.map(f => `${f.fee} (${f.fee / 10000}%)`),
                    pools: poolFees.map(f => f.pool),
                });
            }
        }
    }

    // Вывод результатов
    console.log('\n✅ Найденные пулы:');
    results.forEach(result => {
        console.log(`\nПара: ${result.pair}`);
        result.fees.forEach((fee, index) => {
            console.log(`  Fee: ${fee}, Pool Address: ${result.pools[index]}`);
        });
    });

    if (results.length === 0) {
        console.log('\n❌ Пулы не найдены ни для одной пары.');
    }
}

findAllPools();
