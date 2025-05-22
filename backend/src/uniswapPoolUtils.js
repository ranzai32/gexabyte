const { ethers, provider, UNISWAP_V3_FACTORY_ADDRESS } = require('./config');
const { Pool } = require('@uniswap/v3-sdk');
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json').abi;
const IUniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json').abi;

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
        
        if (poolSdkToken1.address.toLowerCase() !== contractToken1Address.toLowerCase()){
            console.error("Критическая ошибка: poolSdkToken1 не соответствует token1 из пула после определения.");
            return null;
        }

        const pool = new Pool(
            poolSdkToken0,
            poolSdkToken1,
            feeTier,
            slot0[0].toString(), 
            liquidity.toString(),
            Number(slot0[1])    
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

module.exports = {
    getPoolData,
    IUniswapV3PoolABI, 
    IUniswapV3FactoryABI
};