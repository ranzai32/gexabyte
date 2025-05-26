// frontend/src/components/MyPositions.jsx
import React from 'react';
import PositionCard from './PositionCard';
import './MyPositions.css';

// isWalletConnected, userAddress, signer передаются для PositionCard
// provider здесь больше не нужен, если вся загрузка в EarnPage
function MyPositions({ 
    isWalletConnected, 
    signer, 
    userAddress, 
    positions, // Получаем массив позиций как пропс
    isLoading, 
    errorMessage,
    onPositionUpdate // Получаем колбэк для обновления
}) {

    if (!isWalletConnected && !isLoading) { // Показываем сообщение, только если не идет загрузка
        return <p className="info-message">Please connect your wallet to view your liquidity positions.</p>;
    }

    if (isLoading) {
        return <p className="info-message">Loading your positions...</p>;
    }

    if (errorMessage && positions.length === 0) {
        return <p className="error-message" style={{textAlign: 'center', padding: '1rem'}}>{errorMessage}</p>;
    }
    
    return (
        <div className="my-positions-container">
            <h3>My Liquidity Positions</h3>
            
            {positions.length > 0 ? (
                <div className="positions-list">
                    {positions.map(posData => (
                        <PositionCard
                            key={posData.tokenId}
                            tokenId={posData.tokenId}
                            positionInfo={posData.positionInfo}
                            fees={posData.fees}
                            signer={signer}
                            userAddress={userAddress}
                            isWalletConnected={isWalletConnected}
                            onFeesCollected={() => onPositionUpdate(posData.tokenId)} // Вызываем общий колбэк
                        />
                    ))}
                </div>
            ) : (
                !isLoading && !errorMessage && <p className="info-message">You currently have no active liquidity positions.</p>
            )}
        </div>
    );
}

export default MyPositions;