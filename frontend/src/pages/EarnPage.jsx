// frontend/src/pages/EarnPage.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Добавили useEffect, useCallback
import { useNavigate } from 'react-router-dom';
import MyPositions from '../components/MyPositions';
import AllPools from '../components/AllPools';
import './EarnPage.css';

function EarnPage({ isWalletConnected, provider, signer, userAddress }) {
    const [activeTab, setActiveTab] = useState('allPools'); // По умолчанию теперь "All Pools"
    const navigate = useNavigate();

    // --- Состояния для данных вкладок ---
    // Для MyPositions
    const [userPositions, setUserPositions] = useState([]);
    const [isLoadingMyPositions, setIsLoadingMyPositions] = useState(false);
    const [myPositionsError, setMyPositionsError] = useState('');

    // Для AllPools (если данные для AllPools тоже нужно кэшировать на уровне EarnPage)
    // const [allPoolsData, setAllPoolsData] = useState([]);
    // const [isLoadingAllPools, setIsLoadingAllPools] = useState(false);
    // const [allPoolsError, setAllPoolsError] = useState('');

    // --- Функции для загрузки данных ---

    // Загрузка позиций пользователя (для MyPositions)
    const fetchUserPositions = useCallback(async () => {
        if (!isWalletConnected || !userAddress) {
            setUserPositions([]);
            setMyPositionsError('');
            return;
        }
        setIsLoadingMyPositions(true);
        setMyPositionsError('');
        // setUserPositions([]); // Очищать ли при каждом вызове или только если userAddress изменился - зависит от логики
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
            setUserPositions([]); // Очищаем позиции в случае ошибки
        } finally {
            setIsLoadingMyPositions(false);
        }
    }, [isWalletConnected, userAddress]); // Зависимости для useCallback

    // Загружаем позиции пользователя при монтировании EarnPage или смене userAddress/статуса кошелька
    useEffect(() => {
        fetchUserPositions();
    }, [fetchUserPositions]); // fetchUserPositions теперь стабильная ссылка благодаря useCallback

    const handleAddNewPosition = () => {
        navigate('/add-liquidity');
    };

    // Функция для обновления данных (например, после сбора комиссий или управления позицией)
    const handlePositionDataUpdate = (tokenId) => {
        console.log(`EarnPage: Received update signal for tokenId ${tokenId} or all positions.`);
        fetchUserPositions(); // Перезагружаем все позиции пользователя
    };


    return (
        <div className="earn-page-container">
            <div className="earn-page-header">
                <h1>Earn Liquidity</h1>
                {isWalletConnected && (
                    <button onClick={handleAddNewPosition} className="add-liquidity-btn">
                        + Add Liquidity
                    </button>
                )}
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
                    <div className="all-pools-placeholder">
                         {/* AllPools также может потребовать поднятия состояния, если его данные должны сохраняться */}
                        <AllPools provider={provider} /> 
                    </div>
                )}
                {activeTab === 'myPositions' && (
                    <MyPositions
                        isWalletConnected={isWalletConnected}
                        // provider={provider} // provider и signer могут быть не нужны, если MyPositions только отображает
                        signer={signer}     // signer нужен для действий с позициями (Collect Fees)
                        userAddress={userAddress}
                        positions={userPositions} // Передаем загруженные позиции
                        isLoading={isLoadingMyPositions}
                        errorMessage={myPositionsError}
                        onPositionUpdate={handlePositionDataUpdate} // Передаем колбэк для обновления
                    />
                )}
            </div>
        </div>
    );
}

export default EarnPage;