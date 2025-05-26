import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MyPositions from '../components/MyPositions';
import AllPools from '../components/AllPools';
import './EarnPage.css';

function EarnPage({ isWalletConnected, provider, signer, userAddress }) {
  const [activeTab, setActiveTab] = useState('allPools');
  const navigate = useNavigate();

  const [userPositions, setUserPositions] = useState([]);
  const [isLoadingMyPositions, setIsLoadingMyPositions] = useState(false);
  const [myPositionsError, setMyPositionsError] = useState('');

  const [allPoolsDetailedData, setAllPoolsDetailedData] = useState([]);
  const [isLoadingAllPools, setIsLoadingAllPools] = useState(false);
  const [allPoolsError, setAllPoolsError] = useState('');

  const fetchUserPositions = useCallback(async () => {
    if (!isWalletConnected || !userAddress) {
      setUserPositions([]);
      setMyPositionsError('');
      return;
    }
    setIsLoadingMyPositions(true);
    setMyPositionsError('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/user-positions/${userAddress}`);
      if (!response.ok) {
        let errorMsg = `Failed to fetch user positions: ${response.status}`;
        try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch (e) { /* ignore */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setUserPositions(data);
      if (data.length === 0) {
        setMyPositionsError('No liquidity positions found for this address.');
      }
    } catch (error) {
      console.error("EarnPage: Error fetching user positions:", error);
      setMyPositionsError(error.message || "An unknown error occurred while fetching your positions.");
      setUserPositions([]);
    } finally {
      setIsLoadingMyPositions(false);
    }
  }, [isWalletConnected, userAddress]);

  useEffect(() => {
    fetchUserPositions();
  }, [fetchUserPositions]);

  const fetchAllPoolsData = useCallback(async () => {
    const PREDEFINED_TOKENS_EARN = {
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
        logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661'
      },
      WBTC: {
        address: '0x340a5B718557801f20AfD6E244C78Fcd1c0B2212',
        symbol: 'WBTC',
        decimals: 8,
        logoURI: 'https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png?1696507857'
      },
      SR2USD: {
        address: '0xBD6b25c4132F09369C354beE0f7be777D7d434fa',
        symbol: 'SR2USD',
        decimals: 6,
        logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661'
      },
      LINK: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'LINK',
        decimals: 18,
        logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1696502009'
      }
    };
    const SUPPORTED_POOLS_CONFIG_EARN = [
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

    if (SUPPORTED_POOLS_CONFIG_EARN.length === 0) {
      setAllPoolsDetailedData([]);
      setIsLoadingAllPools(false);
      return;
    }

    setIsLoadingAllPools(true);
    setAllPoolsError('');
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

      const poolDataPromises = SUPPORTED_POOLS_CONFIG_EARN.map(async (poolConfig) => {
        const token0 = PREDEFINED_TOKENS_EARN[poolConfig.token0Key];
        const token1 = PREDEFINED_TOKENS_EARN[poolConfig.token1Key];

        if (!token0 || !token1) {
          console.warn(`EarnPage: Tokens not found for pool config: ${poolConfig.token0Key}/${poolConfig.token1Key}`);
          return { ...poolConfig, token0, token1, poolData: null, error: true };
        }
        if (token0.address.toLowerCase() === token1.address.toLowerCase()) return null;

        const queryParams = new URLSearchParams({
          tokenA_address: token0.address,
          tokenA_decimals: token0.decimals.toString(),
          tokenA_symbol: token0.symbol,
          tokenB_address: token1.address,
          tokenB_decimals: token1.decimals.toString(),
          tokenB_symbol: token1.symbol,
          feeTier: poolConfig.feeTier.toString(),
        });

        try {
          const response = await fetch(`${backendUrl}/api/pool-data?${queryParams.toString()}`);
          if (response.ok) {
            const data = await response.json();
            return { ...poolConfig, token0, token1, poolData: data };
          } else {
            console.warn(`EarnPage: Could not fetch pool data for ${token0.symbol}/${token1.symbol} fee ${poolConfig.feeTier}`);
            return { ...poolConfig, token0, token1, poolData: null, error: true };
          }
        } catch (error) {
          console.error(`EarnPage: Error fetching for ${token0.symbol}/${token1.symbol} fee ${poolConfig.feeTier}:`, error);
          return { ...poolConfig, token0, token1, poolData: null, error: true };
        }
      });

      const results = (await Promise.all(poolDataPromises)).filter(p => p !== null);
      setAllPoolsDetailedData(results);

    } catch (error) {
      console.error("EarnPage: General error fetching all pools data:", error);
      setAllPoolsError(error.message || "Failed to load pool data.");
    } finally {
      setIsLoadingAllPools(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPoolsData();

    const intervalId = setInterval(() => {
      console.log("EarnPage: Auto-refreshing all pools data...");
      fetchAllPoolsData();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [fetchAllPoolsData]);

  const handleAddNewPosition = () => {
    navigate('/add-liquidity');
  };

  const handlePositionDataUpdate = (tokenId) => {
    console.log(`EarnPage: Received update signal for tokenId ${tokenId} or all positions.`);
    fetchUserPositions();
  };

  return (
    <div className="earn-page-container">
      <div className="earn-page-header">
        <h1>Pools</h1>
      </div>

      <div className="earn-page-tabs">
        <button
          className={`tab-button ${activeTab === 'allPools' ? 'active' : ''}`}
          onClick={() => setActiveTab('allPools')}
        >
          All Pools
        </button>
        <button
          className={`tab-button ${activeTab === 'myPositions' ? 'active' : ''}`}
          onClick={() => setActiveTab('myPositions')}
        >
          My Positions
        </button>
      </div>

      <div className="earn-page-content">
        {activeTab === 'allPools' && (
          <AllPools
            provider={provider}
            poolsToShow={allPoolsDetailedData}
            isLoading={isLoadingAllPools}
            errorMessage={allPoolsError}
          />
        )}
        {activeTab === 'myPositions' && (
          <MyPositions
            provider={provider}
            isWalletConnected={isWalletConnected}
            signer={signer}
            userAddress={userAddress}
            positions={userPositions}
            isLoading={isLoadingMyPositions}
            errorMessage={myPositionsError}
            onPositionUpdate={handlePositionDataUpdate}
          />
        )}
      </div>
    </div>
  );
}

export default EarnPage;