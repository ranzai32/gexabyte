// frontend/src/pages/EarnPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MyPositions from '../components/MyPositions';
// import AllPools from '../components/AllPools'; // Для будущего
import './EarnPage.css';

function EarnPage({ isWalletConnected, provider, signer, userAddress }) {
    // Решим, какая вкладка будет активна по умолчанию.
    // Если пользователь хочет сначала видеть свои позиции:
    const [activeTab, setActiveTab] = useState('myPositions');
    // Если хотите, чтобы сначала была "All Pools":
    // const [activeTab, setActiveTab] = useState('allPools');

    const navigate = useNavigate();

    const handleAddNewPosition = () => {
        // Предполагаем, что у нас будет маршрут /add-liquidity для создания новой позиции
        // Эта страница может быть похожа на TradePage, но с фокусом на минтинг.
        navigate('/add-liquidity');
    };

    return (
        <div className="earn-page-container">
            <div className="earn-page-header">
                <h1>Earn Liquidity</h1> {/* Более описательный заголовок */}
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
                {activeTab === 'myPositions' && (
                    <MyPositions
                        isWalletConnected={isWalletConnected}
                        provider={provider} // provider может не понадобиться MyPositions, если все через API
                        signer={signer}     // signer понадобится для действий с позициями (collect, increase/decrease)
                        userAddress={userAddress} // userAddress нужен для загрузки позиций пользователя
                    />
                )}
                {activeTab === 'allPools' && (
                    <div className="all-pools-placeholder">
                        <h2>All Liquidity Pools</h2>
                        <p>Browse available pools or create a new one. (Coming Soon)</p>
                        {/* Здесь будет компонент <AllPools /> */}
                    </div>
                )}
            </div>
        </div>
    );
}

export default EarnPage;