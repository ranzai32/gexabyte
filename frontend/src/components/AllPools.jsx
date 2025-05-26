import React, { useState, useEffect, useCallback } from 'react'; // useState, useEffect, useCallback импортируются из 'react'
import { useNavigate } from 'react-router-dom'; // useNavigate импортируется из 'react-router-dom'
import './AllPools.css';

const PoolRowContent = ({ token0, token1, feeTier, poolData, isLoadingPoolData, provider }) => {
    const navigate = useNavigate();
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
    if (poolData && !isLoadingPoolData) {
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
                {isLoadingPoolData ? 'Loading...' : displayRate}
            </div>
            <div className="pool-actions">
                <button onClick={handleAddLiquidity} className="add-liquidity-pool-btn" disabled={isLoadingPoolData || !poolData}>
                    + Add Liquidity
                </button>
            </div>
        </div>
    );
};


function AllPools({ provider, poolsToShow, isLoading, errorMessage }) {
     
    const [filterPairSymbol, setFilterPairSymbol] = useState('');

    const handleFilterChange = (event) => {
        setFilterPairSymbol(event.target.value.toUpperCase());
    };

    const filteredPools = poolsToShow.filter(pool => {
        // Убедимся, что pool.token0 и pool.token1 существуют перед доступом к symbol
        if (!pool || !pool.token0 || !pool.token1) return false;
        if (!filterPairSymbol) return true;
        const searchStr = filterPairSymbol.toUpperCase();
        return (
            pool.token0.symbol.toUpperCase().includes(searchStr) ||
            pool.token1.symbol.toUpperCase().includes(searchStr) ||
            `<span class="math-inline">\{pool\.token0\.symbol\}/</span>{pool.token1.symbol}`.toUpperCase().includes(searchStr) ||
            `<span class="math-inline">\{pool\.token1\.symbol\}/</span>{pool.token0.symbol}`.toUpperCase().includes(searchStr)
        );
    });


    if (isLoading) {  
        return <p className="info-message">Loading pools data...</p>;
    }
    if (errorMessage) {
        return <p className="error-message">{errorMessage}</p>
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
                        key={pool.id || `<span class="math-inline">\{pool\.token0\.address\}\-</span>{pool.token1.address}-${pool.feeTier}`} // Генерируем ключ, если id нет
                        token0={pool.token0}
                        token1={pool.token1}
                        feeTier={pool.feeTier}
                        poolData={pool.poolData}  
                        isLoadingPoolData={!pool.poolData && !pool.error} 
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