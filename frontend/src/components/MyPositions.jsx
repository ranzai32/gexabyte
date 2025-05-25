// frontend/src/components/MyPositions.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import { ethers } from 'ethers'; // Необязателен здесь, если форматирование в PositionCard
import PositionCard from './PositionCard';
import './MyPositions.css';

// PREDEFINED_TOKENS_LIST нужен для определения символов и десятичных по адресам
// В идеале, импортировать из общего файла констант
const PREDEFINED_TOKENS_LIST = {
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
// const getTokenByAddress = (address) => { // Эта функция должна быть в PositionCard или общей утилите
// return Object.values(PREDEFINED_TOKENS_LIST).find(token => token.address.toLowerCase() === address.toLowerCase());
// };


function MyPositions({ isWalletConnected, provider, signer, userAddress }) {
    const [userPositions, setUserPositions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    // const navigate = useNavigate(); // useNavigate пока не используется напрямую здесь, если управление через PositionCard

    useEffect(() => {
        const fetchUserPositions = async () => {
            if (!isWalletConnected || !userAddress) {
                setUserPositions([]);
                setErrorMessage(''); // Очищаем ошибку, если кошелек не подключен
                return;
            }
            setIsLoading(true);
            setErrorMessage('');
            setUserPositions([]);
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                const response = await fetch(`${backendUrl}/api/user-positions/${userAddress}`);
                
                if (!response.ok) {
                    let errorMsg = `Failed to fetch user positions: ${response.status}`;
                    try {
                        const errData = await response.json();
                        errorMsg = errData.error || errorMsg;
                    } catch (e) { /* остаемся с ursprünglichen сообщением */ }
                    throw new Error(errorMsg);
                }
                const data = await response.json();
                setUserPositions(data);
                if (data.length === 0) {
                    setErrorMessage('No liquidity positions found for this address.');
                }
            } catch (error) {
                console.error("Error fetching user positions:", error);
                setErrorMessage(error.message || "An unknown error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserPositions();
    }, [isWalletConnected, userAddress]); // Перезагружаем при смене адреса или статуса подключения


    if (!isWalletConnected) {
        return <p className="info-message">Please connect your wallet to view your liquidity positions.</p>;
    }

    if (isLoading) {
        return <p className="info-message">Loading your positions...</p>;
    }

    return (
        <div className="my-positions-container">
            <h3>My Liquidity Positions</h3>
            {errorMessage && userPositions.length === 0 && (
                <p className="error-message" style={{textAlign: 'center', padding: '1rem'}}>{errorMessage}</p>
            )}
            
            {userPositions.length > 0 ? (
                <div className="positions-list">
                    {userPositions.map(posData => (
                        <PositionCard
                            key={posData.tokenId}
                            tokenId={posData.tokenId}
                            positionInfo={posData.positionInfo}
                            fees={posData.fees}
                            signer={signer}  
                            userAddress={userAddress} 
                            isWalletConnected={isWalletConnected} 
                            // PREDEFINED_TOKENS={PREDEFINED_TOKENS_LIST} // Если PositionCard не импортирует сам
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