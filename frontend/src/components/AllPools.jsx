// frontend/src/components/AllPools.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AllPools.css';

 
const PREDEFINED_TOKENS = {
        WETH: {
            address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',  
            symbol: 'WETH',
            decimals: 18,
            logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1696501628'
        },
        USDC: {
            address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',  
            symbol: 'USDC',
            decimals: 6,
            logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png?1696506694'
        },
        OKB: {
            address: '0x3F4B6664338F23d2397c953f2AB4Ce8031663f80',
            symbol: 'OKB',
            decimals: 18, 
            logoURI: 'https://assets.coingecko.com/coins/images/4463/small/okb_token.png?1696504795'
        },
        R2USD: {
            address: '0x20c54C5F742F123Abb49a982BFe0af47edb38756',
            symbol: 'R2USD',
            decimals: 6,  
            logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661' // Добавьте URL логотипа
        },
        WBTC: {
            address: '0x340a5B718557801f20AfD6E244C78Fcd1c0B2212',
            symbol: 'WBTC',
            decimals: 8,  // WBTC обычно имеет 8 десятичных
            logoURI: 'https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png?1696507857' // Обновленный URL
        },
        SR2USD: {
            address: '0xBD6b25c4132F09369C354beE0f7be777D7d434fa',
            symbol: 'SR2USD',
            decimals: 6, // !! ЗАМЕНИТЕ НА ПРАВИЛЬНЫЕ ДЕСЯТИЧНЫЕ ДЛЯ SEPOLIA !!
            logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661' // Добавьте URL логотипа
        },
        LINK: {
            address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
            symbol: 'LINK',
            decimals: 18,
            logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1696502009'
        }
    };
const SUPPORTED_POOLS_CONFIG = [
     
    { token0Key: 'WETH', token1Key: 'USDC', feeTier: 100 },
    { token0Key: 'WETH', token1Key: 'USDC', feeTier: 500 },
    { token0Key: 'WETH', token1Key: 'USDC', feeTier: 3000 },
    { token0Key: 'WETH', token1Key: 'USDC', feeTier: 10000 },

     
    { token0Key: 'WETH', token1Key: 'OKB', feeTier: 500 },
    { token0Key: 'WETH', token1Key: 'OKB', feeTier: 3000 },
    { token0Key: 'WETH', token1Key: 'OKB', feeTier: 10000 },

     
    { token0Key: 'WETH', token1Key: 'LINK', feeTier: 100 },
    { token0Key: 'WETH', token1Key: 'LINK', feeTier: 500 },
    { token0Key: 'WETH', token1Key: 'LINK', feeTier: 3000 },
    { token0Key: 'WETH', token1Key: 'LINK', feeTier: 10000 },
    
     
    { token0Key: 'USDC', token1Key: 'LINK', feeTier: 3000 },
];


const PoolRowContent = ({ token0, token1, feeTier, provider }) => {
    const navigate = useNavigate();
    const [poolData, setPoolData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPoolData = useCallback(async () => {
        if (!token0 || !token1 || !feeTier) {
            setIsLoading(false);
            setPoolData(null);
            return;
        }
        if (!poolData && isLoading === false) { // Показываем индикатор загрузки только при первой загрузке
             // или если poolData был сброшен из-за ошибки
            setIsLoading(true);
        } else if (!poolData && isLoading === true) {
            // Уже грузится, ничего не делаем
        }


        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const queryParams = new URLSearchParams({
                tokenA_address: token0.address,
                tokenA_decimals: token0.decimals.toString(),
                tokenA_symbol: token0.symbol,
                tokenB_address: token1.address,
                tokenB_decimals: token1.decimals.toString(),
                tokenB_symbol: token1.symbol,
                feeTier: feeTier.toString(),
            });
            const response = await fetch(`${backendUrl}/api/pool-data?${queryParams.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setPoolData(data);
                // console.log(`Pool data updated for ${token0.symbol}/${token1.symbol} - Fee: ${feeTier}`);
            } else {
                console.warn(`PoolRow: Could not fetch pool data for ${token0.symbol}/${token1.symbol} fee ${feeTier}. Status: ${response.status}`);
                setPoolData(null);
            }
        } catch (error) {
            console.error(`PoolRow: Error fetching pool data for ${token0.symbol}/${token1.symbol} fee ${feeTier}:`, error);
            setPoolData(null);
        } finally {
            setIsLoading(false);
        }
    }, [token0, token1, feeTier, poolData, isLoading]); // Добавлен isLoading в зависимости, чтобы управлять им при первой загрузке

    useEffect(() => {
        fetchPoolData(); // Первичная загрузка
    }, [fetchPoolData]); // fetchPoolData теперь более стабильна благодаря useCallback и его зависимостям

    useEffect(() => {
        const intervalId = setInterval(() => {
            // console.log(`Auto-refreshing pool data for ${token0?.symbol}/${token1?.symbol} - Fee: ${feeTier}`);
            fetchPoolData();
        }, 60000); // 1 минута

        return () => clearInterval(intervalId);
    }, [fetchPoolData, token0, token1, feeTier]);

    const handleAddLiquidity = () => {
        if (!poolData) {
            alert("Pool data is not available. Cannot add liquidity.");
            return;
        }
        navigate('/add-liquidity', {
            state: {
                initialToken0: token0,
                initialToken1: token1,
                initialFeeTier: feeTier,
                poolCurrentTick: poolData.tickCurrent,
            }
        });
    };

    if (!token0 || !token1) {
        return <div className="pool-row error">Token data missing for this row.</div>;
    }
    
    let displayRate = 'N/A';
    if (poolData) {
        const poolToken0 = poolData.token0; // Токен0 из ответа API (канонический)
        const poolToken1 = poolData.token1; // Токен1 из ответа API (канонический)

        // Определяем, какой из наших токенов (token0, token1 из SUPPORTED_POOLS_CONFIG) является token0 в пуле
        if (poolToken0 && poolToken1) { // Убедимся, что API вернул token0 и token1
            if (token0.address.toLowerCase() === poolToken0.address.toLowerCase()) {
                // Наш token0 из конфига совпадает с token0 пула, используем token0Price (цена token0 в token1)
                displayRate = `1 ${token0.symbol} ≈ ${parseFloat(poolData.token0Price).toFixed(Math.min(token1.decimals, 6))} ${token1.symbol}`;
            } else if (token0.address.toLowerCase() === poolToken1.address.toLowerCase()) {
                // Наш token0 из конфига совпадает с token1 пула, значит, отображаемый token0 - это token1 пула.
                // Используем token1Price (цена token1 пула в token0 пула)
                // Чтобы получить "1 наш_token0 = X наш_token1", нам нужно инвертировать token1Price или использовать token0Price от другого токена.
                // Проще: если наш token0 это poolData.token1, то наш token1 это poolData.token0.
                // Цена должна быть "1 наш_token0 (который poolData.token1) = X наш_token1 (который poolData.token0)"
                // poolData.token1Price это "1 poolData.token1 = Y poolData.token0"
                displayRate = `1 ${token0.symbol} ≈ ${parseFloat(poolData.token1Price).toFixed(Math.min(token1.decimals, 6))} ${token1.symbol}`;
            } else if (poolData.token0Price) { // Запасной вариант, если адреса не совпали (маловероятно)
                 displayRate = `1 ${token0.symbol} ≈ ${parseFloat(poolData.token0Price).toFixed(Math.min(token1.decimals, 6))} ${token1.symbol}`;
            }
        }
    }

    return (
        <div className="pool-row">
            <div className="pool-pair">
                {token0.logoURI && <img src={token0.logoURI} alt={token0.symbol} className="token-logo-pool first" />}
                {token1.logoURI && <img src={token1.logoURI} alt={token1.symbol} className="token-logo-pool second" />}
                <span>{token0.symbol} / {token1.symbol}</span>
            </div>
            <div className="pool-fee-tier">{feeTier / 10000}%</div>
            <div className="pool-rate">
                {isLoading && !poolData ? 'Loading...' : displayRate}
            </div>
            <div className="pool-actions">
                <button onClick={handleAddLiquidity} className="add-liquidity-pool-btn" disabled={isLoading || !poolData}>
                    + Add Liquidity
                </button>
            </div>
        </div>
    );
};


function AllPools({ provider }) {
    const [displayedPools, setDisplayedPools] = useState([]);
    const [isLoadingPools, setIsLoadingPools] = useState(true);
    const [filterPairSymbol, setFilterPairSymbol] = useState('');

    useEffect(() => {
        const poolsToDisplay = SUPPORTED_POOLS_CONFIG.map((poolConfig, index) => {
            const token0 = PREDEFINED_TOKENS[poolConfig.token0Key];
            const token1 = PREDEFINED_TOKENS[poolConfig.token1Key];

            if (token0 && token1) {
                if (token0.address.toLowerCase() === token1.address.toLowerCase()) {
                    console.warn(`Skipping pool config with identical tokens: ${token0.symbol}`);
                    return null;
                }
                // Для ID используем адреса в том порядке, как они в конфиге, плюс feeTier
                const id = `${token0.address}-${token1.address}-${poolConfig.feeTier}`;
                return {
                    id: id,
                    token0: token0, 
                    token1: token1,
                    feeTier: poolConfig.feeTier
                };
            }
            console.warn(`Tokens not found for pool config: ${poolConfig.token0Key}/${poolConfig.token1Key}`);
            return null;
        }).filter(pool => pool !== null);

        // Убираем дубликаты по id, если они случайно появились (хотя с таким ID не должно быть)
        const uniquePools = Array.from(new Map(poolsToDisplay.map(pool => [pool.id, pool])).values());
        setDisplayedPools(uniquePools);
        setIsLoadingPools(false);
    }, []);

    const handleFilterChange = (event) => {
        setFilterPairSymbol(event.target.value.toUpperCase());
    };

    const filteredPools = displayedPools.filter(pool => {
        if (!filterPairSymbol) return true;
        const searchStr = filterPairSymbol.toUpperCase();
        // Поиск по отдельным символам или паре
        return (
            pool.token0.symbol.toUpperCase().includes(searchStr) ||
            pool.token1.symbol.toUpperCase().includes(searchStr) ||
            `${pool.token0.symbol}/${pool.token1.symbol}`.toUpperCase().includes(searchStr) ||
            `${pool.token1.symbol}/${pool.token0.symbol}`.toUpperCase().includes(searchStr)
        );
    });

    if (isLoadingPools) {
        return <p className="info-message">Loading pool configurations...</p>;
    }

    return (
        <div className="all-pools-container">
            <div className="pools-filter-bar">
                <input 
                    type="text" 
                    placeholder="Search pairs (e.g., WETH, USDC, WETH/USDC)" 
                    value={filterPairSymbol} 
                    onChange={handleFilterChange}
                    className="pools-filter-input"
                />
            </div>

            <div className="pools-list-header">
                <span>Pair</span>
                <span>Fee Tier</span>
                <span>Rate</span>
                <span>Action</span>
            </div>
            {filteredPools.length > 0 ? (
                filteredPools.map(pool => (
                    <PoolRowContent
                        key={pool.id}
                        token0={pool.token0}
                        token1={pool.token1}
                        feeTier={pool.feeTier}
                        provider={provider}
                    />
                ))
            ) : (
                <p className="info-message">No pools found matching your criteria or configuration.</p>
            )}
        </div>
    );
}

export default AllPools;