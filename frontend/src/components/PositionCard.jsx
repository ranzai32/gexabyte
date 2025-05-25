 
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import './PositionCard.css';
 
const PREDEFINED_TOKENS_LIST_CARD = {
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



// В идеале, импортировать из общего файла утилит
const getTokenByAddressCard = (address) => {
    if (!address) return { symbol: '?', logoURI: '', decimals: 18 }; // Возвращаем заглушку, если адрес не определен
    const tokenAddressLower = address.toLowerCase();
    const foundToken = Object.values(PREDEFINED_TOKENS_LIST_CARD).find(
        token => token.address.toLowerCase() === tokenAddressLower
    );
    return foundToken || { symbol: address.substring(0, 6) + '...', logoURI: '', decimals: 18 }; // Заглушка для неизвестных токенов
};

const INonfungiblePositionManagerABI_MinimalCollect = [
    {
        "inputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
                    { "internalType": "address", "name": "recipient", "type": "address" },
                    { "internalType": "uint128", "name": "amount0Max", "type": "uint128" },
                    { "internalType": "uint128", "name": "amount1Max", "type": "uint128" }
                ],
                "internalType": "struct INonfungiblePositionManager.CollectParams",
                "name": "params",
                "type": "tuple"
            }
        ],
        "name": "collect",
        "outputs": [
            { "internalType": "uint256", "name": "amount0", "type": "uint256" },
            { "internalType": "uint256", "name": "amount1", "type": "uint256" }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

function PositionCard({ positionInfo, fees, tokenId, signer, userAddress, onFeesCollected, isWalletConnected }) {
    const navigate = useNavigate();
    const [isCollecting, setIsCollecting] = useState(false);
    const [collectStatus, setCollectStatus] = useState('');
    console.log('PositionCard isWalletConnected:', isWalletConnected);
    console.log('PositionCard fees:', fees); 
    console.log('PositionCard isCollecting:', isCollecting);

    if (!positionInfo) {
        return <div className="position-card loading">Loading position data...</div>;
    }

    const token0 = getTokenByAddressCard(positionInfo.token0);
    const token1 = getTokenByAddressCard(positionInfo.token1);
    
     
    const isInRange = true;  

    const handleManage = () => {
        // Предполагаем, что есть маршрут /manage-liquidity/:tokenId
        // или передаем данные на существующую страницу, например /trade
        navigate(`/manage-liquidity/${tokenId}`, { state: { positionInfo, fees, token0, token1 } });
        console.log(`Переход к управлению позицией ${tokenId}`);
    };
    
    const handleCollectFees = async () => {
        if (!signer || !userAddress) {
            setCollectStatus("Wallet not connected or signer not available.");
            return;
        }
        if (!fees || (fees.feesAmount0 === '0' && fees.feesAmount1 === '0')) {
            setCollectStatus("No fees to collect.");
            return;
        }
        if (isCollecting) return;

        setIsCollecting(true);
        setCollectStatus('Preparing to collect fees...');

        try {
            const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
            if (!nftManagerAddress) {
                throw new Error("NFT Position Manager address is not configured on frontend.");
            }

            const positionManagerContract = new ethers.Contract(
                nftManagerAddress,
                INonfungiblePositionManagerABI_MinimalCollect,
                signer
            );

            const MAX_UINT128 = (2n ** 128n) - 1n;

            const params = {
                tokenId: tokenId,
                recipient: userAddress,
                amount0Max: MAX_UINT128,
                amount1Max: MAX_UINT128
            };

            setCollectStatus('Sending collect transaction... Please confirm in wallet.');
            const tx = await positionManagerContract.collect(params);
            setCollectStatus(`Collect transaction sent: ${tx.hash.substring(0,10)}... Waiting...`);
            
            await tx.wait(1);
            setCollectStatus(`Fees collected successfully! Tx: ${tx.hash.substring(0,10)}...`);
            if (onFeesCollected) {
                onFeesCollected(tokenId); 
            }

        } catch (error) {
            console.error("Error collecting fees:", error);
            let errMsg = error.reason || error.message || "Unknown error collecting fees.";
            if (error.data && typeof error.data.message === 'string') errMsg = error.data.message;
            else if (error.error && typeof error.error.message === 'string') errMsg = error.error.message;
            setCollectStatus(`Failed to collect fees: ${errMsg}`);
        } finally {
            setIsCollecting(false);
        }
    };

    const canCollect = fees && (BigInt(fees.feesAmount0 || '0') > 0n || BigInt(fees.feesAmount1 || '0') > 0n);
    console.log('PositionCard canCollect:', canCollect);
    return (
        <div className={`position-card ${!isInRange ? 'out-of-range' : 'in-range'}`}>
            <div className="position-card-header">
                <div className="token-pair">
                    {token0.logoURI && <img src={token0.logoURI} alt={token0.symbol} className="token-logo-card first" />}
                    {token1.logoURI && <img src={token1.logoURI} alt={token1.symbol} className="token-logo-card second" />}
                    <span className="pair-symbols">{token0.symbol}/{token1.symbol}</span>
                </div>
                <div>
                    <span className="fee-tier-chip">Fee: {positionInfo.fee / 10000}%</span>
                    <span className={`status-chip ${isInRange ? 'in-range' : 'out-of-range-chip'}`}>
                        {isInRange ? 'In Range' : 'Out of Range'}
                    </span>
                </div>
            </div>

            <div className="position-info-grid">
                <div>
                    <span className="info-label">Min Price (Tick {positionInfo.tickLower})</span>
                    <span className="info-value"> {/* TODO: Calculate and display price from tick */} N/A </span>
                </div>
                <div>
                    <span className="info-label">Max Price (Tick {positionInfo.tickUpper})</span>
                    <span className="info-value"> {/* TODO: Calculate and display price from tick */} N/A </span>
                </div>
                <div>
                    <span className="info-label">Liquidity</span>
                    <span className="info-value">{positionInfo.liquidity !== '0' ? Number(ethers.formatUnits(positionInfo.liquidity, 0)).toLocaleString() : '0'}</span>
                </div>
                <div>
                    <span className="info-label">Position ID</span>
                    <span className="info-value">#{tokenId}</span>
                </div>
            </div>

            {fees && (
                <div className="uncollected-fees">
                    <span className="info-label">Uncollected Fees:</span>
                    <div className="fee-values">
                        <span>
                            {parseFloat(ethers.formatUnits(fees.feesAmount0 || '0', token0.decimals)).toFixed(Math.min(token0.decimals, 6))} {token0.symbol}
                        </span>
                        <span>
                            {parseFloat(ethers.formatUnits(fees.feesAmount1 || '0', token1.decimals)).toFixed(Math.min(token1.decimals, 6))} {token1.symbol}
                        </span>
                    </div>
                    <button 
                        onClick={handleCollectFees} 
                        className="collect-fees-btn-small"
                        disabled={!canCollect || isCollecting || !isWalletConnected}
                    >
                        {isCollecting ? 'Collecting...' : 'Collect'}
                    </button>
                </div>
            )}
            {collectStatus && <p className="collect-status-message" style={{ color: collectStatus.toLowerCase().includes('fail') ? 'red' : (collectStatus.toLowerCase().includes('success') ? 'green' : '#a5a2b3') }}>{collectStatus}</p>}

            <div className="position-card-actions">
                <button onClick={handleManage} className="action-button manage" disabled={!isWalletConnected}>Manage</button>
                {/* <button className="action-button auto-manage" disabled={!isWalletConnected}>Auto-Manage</button> */}
            </div>
        </div>
    );
}

export default PositionCard;