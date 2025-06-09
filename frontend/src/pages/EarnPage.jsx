import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MyPositions from '../components/MyPositions';
import AllPools from '../components/AllPools';
import './EarnPage.css';
import { usePools } from '../context/PoolsContext';
import { usePositions } from '../context/PositionsContext';

function EarnPage({ provider, signer }) {
  const [activeTab, setActiveTab] = useState('allPools');
  const navigate = useNavigate();

  const { allPools, isLoading: isLoadingAllPools, error: allPoolsError, fetchAllPools } = usePools();
  
  const { 
      userPositions, 
      isLoading: isLoadingMyPositions, 
      error: myPositionsError, 
      fetchUserPositions,
      isWalletConnected,
      userAddress
  } = usePositions();

  useEffect(() => {
    // Начальная загрузка данных при монтировании компонента
    if (allPools.length === 0) {
        fetchAllPools();
    }
    // fetchUserPositions вызывается автоматически из своего контекста при изменении userAddress
  }, [fetchAllPools, allPools.length]);

  // Эффект для установки интервала обновления
  useEffect(() => {
    const refreshInterval = 60000; // 60 секунд
    
    // Функция для обновления данных
    const refreshData = () => {
      console.log('Refreshing pools and positions data...');
      fetchAllPools();
      if (isWalletConnected) {
        fetchUserPositions();
      }
    };

    const intervalId = setInterval(refreshData, refreshInterval);

    // Очистка интервала при размонтировании компонента
    return () => clearInterval(intervalId);
  }, [fetchAllPools, fetchUserPositions, isWalletConnected]);

  const handlePositionDataUpdate = () => {
    console.log(`EarnPage: Received update signal. Refetching positions...`);
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
            poolsToShow={allPools}
            isLoading={isLoadingAllPools}
            errorMessage={allPoolsError}
          />
        )}
        {activeTab === 'myPositions' && (
          <MyPositions
            provider={provider} 
            signer={signer}
            isWalletConnected={isWalletConnected}
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