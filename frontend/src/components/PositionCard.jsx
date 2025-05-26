 
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import './PositionCard.css';
const INonfungiblePositionManagerABI_Card = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"},{"internalType":"address","name":"_tokenDescriptor_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Collect","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"DecreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"IncreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint128","name":"amount0Max","type":"uint128"},{"internalType":"uint128","name":"amount1Max","type":"uint128"}],"internalType":"struct INonfungiblePositionManager.CollectParams","name":"params","type":"tuple"}],"name":"collect","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"}],"name":"createAndInitializePoolIfNecessary","outputs":[{"internalType":"address","name":"pool","type":"address"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.DecreaseLiquidityParams","name":"params","type":"tuple"}],"name":"decreaseLiquidity","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"positions","outputs":[{"internalType":"uint96","name":"nonce","type":"uint96"},{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"feeGrowthInside0LastX128","type":"uint256"},{"internalType":"uint256","name":"feeGrowthInside1LastX128","type":"uint256"},{"internalType":"uint128","name":"tokensOwed0","type":"uint128"},{"internalType":"uint128","name":"tokensOwed1","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount0Owed","type":"uint256"},{"internalType":"uint256","name":"amount1Owed","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3MintCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];
 
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

function PositionCard({ positionInfo, fees, tokenId, signer, userAddress, provider, isWalletConnected, onPositionUpdate }) {// Добавлен onPositionUpdate
    const navigate = useNavigate();
    const [isCollecting, setIsCollecting] = useState(false);
    const [collectStatus, setCollectStatus] = useState('');

    const [isAutoManageEnabled, setIsAutoManageEnabled] = useState(false);
    const [isTogglingAutoManage, setIsTogglingAutoManage] = useState(false);
    const [autoManageStatus, setAutoManageStatus] = useState('');

    // Состояние для отслеживания, дано ли разрешение оператору
    const [isNftApprovedForOperator, setIsNftApprovedForOperator] = useState(false);
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    const [isProcessingApproval, setIsProcessingApproval] = useState(false);

    const backendOperatorAddress = import.meta.env.VITE_BACKEND_OPERATOR_ADDRESS; 

    // Функция для проверки текущего статуса approve
    const checkNftApproval = async () => {
        if (!isWalletConnected || !signer || !tokenId || !backendOperatorAddress) {
            setIsNftApprovedForOperator(false);
            return;
        }
        setIsCheckingApproval(true);
        try {
            const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
            const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_Card, provider); // provider для чтения
            
            const approvedAddress = await positionManagerContract.getApproved(tokenId);
            
            if (approvedAddress && approvedAddress.toLowerCase() === backendOperatorAddress.toLowerCase()) {
                setIsNftApprovedForOperator(true);
            } else {
                // Дополнительно проверим, нет ли setApprovalForAll
                const isApprovedForAll = await positionManagerContract.isApprovedForAll(userAddress, backendOperatorAddress);
                setIsNftApprovedForOperator(isApprovedForAll);
            }
        } catch (error) {
            console.error("Error checking NFT approval:", error);
            setIsNftApprovedForOperator(false); // В случае ошибки считаем, что не апрувнут
        } finally {
            setIsCheckingApproval(false);
        }
    };
    
    // Функция для запроса approve у пользователя
    const handleApproveNftForOperator = async () => {
        if (!isWalletConnected || !signer || !tokenId || !backendOperatorAddress || isProcessingApproval) return;

        setIsProcessingApproval(true);
        setAutoManageStatus('Requesting approval for auto-management...');
        try {
            const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
            const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_Card, signer); // signer для транзакции

            const tx = await positionManagerContract.approve(backendOperatorAddress, tokenId);
            setAutoManageStatus(`Approval transaction sent: ${tx.hash.substring(0,10)}... Waiting for confirmation...`);
            await tx.wait(1);
            setIsNftApprovedForOperator(true);
            setAutoManageStatus('NFT successfully approved for auto-management!');
        } catch (error) {
            console.error("Error approving NFT for operator:", error);
            let errMsg = error.reason || error.data?.message || error.message || "Failed to approve NFT.";
            setAutoManageStatus(`Approval failed: ${errMsg}`);
            setIsNftApprovedForOperator(false);
        } finally {
            setIsProcessingApproval(false);
        }
    };


    useEffect(() => {
        const fetchAutoManageStatusFromBackend = async () => {
            if (!tokenId || !isWalletConnected) return;
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                const response = await fetch(`${backendUrl}/api/auto-manage/status/${tokenId}`); // Маршрут на бэкенде
                if (response.ok) {
                    const data = await response.json();
                    setIsAutoManageEnabled(data.isEnabled);
                    // Если бэкенд также хранит статус апрува, можно его использовать,
                    // но проверка на клиенте перед включением надежнее.
                    if (data.isEnabled) { // Если на бэке уже включено, проверим апрув
                        checkNftApproval();
                    }
                } else {
                    console.warn(`Could not fetch auto-manage status for token ${tokenId}`);
                }
            } catch (error) {
                console.error("Error fetching auto-manage status from backend:", error);
            }
        };

        fetchAutoManageStatusFromBackend();
        checkNftApproval(); // Проверяем апрув при монтировании и при смене кошелька/токена
     }, [tokenId, isWalletConnected, signer, provider]); // Добавили signer для re-check при смене аккаунта


    const handleToggleAutoManage = async () => {
        if (!isWalletConnected || !signer || isTogglingAutoManage || !isNftApprovedForOperator) {
            if (!isNftApprovedForOperator) {
                 setAutoManageStatus('Please approve the operator before enabling auto-management.');
            }
            return;
        }

        setIsTogglingAutoManage(true);
        const newStatus = !isAutoManageEnabled;
        setAutoManageStatus(newStatus ? 'Enabling auto-management...' : 'Disabling auto-management...');

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/auto-manage/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({
                    tokenId: parseInt(tokenId), // Убедимся, что tokenId это число
                    enable: newStatus,
                    userAddress: userAddress,
                    strategyParameters: { rangePercentage: 5 }, // Пример параметров
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setIsAutoManageEnabled(data.isEnabled);
                setAutoManageStatus(data.isEnabled ? 'Auto-management enabled.' : 'Auto-management disabled.');
                 if (onPositionUpdate) onPositionUpdate(tokenId); // Обновляем состояние в EarnPage, если нужно
            } else {
                const errorData = await response.json();
                setAutoManageStatus(`Error: ${errorData.error || 'Failed to toggle auto-management.'}`);
            }
        } catch (error) {
            console.error("Error toggling auto-management:", error);
            setAutoManageStatus(`Error: ${error.message || 'An unexpected error occurred.'}`);
        } finally {
            setIsTogglingAutoManage(false);
        }
    };

    if (!positionInfo) {
        return <div className="position-card loading">Loading position data...</div>;
    }

    const token0 = getTokenByAddressCard(positionInfo.token0);
    const token1 = getTokenByAddressCard(positionInfo.token1);
    
     
    let isInRange = null;
    
    if (typeof positionInfo.currentTick === 'number' && 
        typeof positionInfo.tickLower === 'number' && 
        typeof positionInfo.tickUpper === 'number') {
        isInRange = positionInfo.currentTick >= positionInfo.tickLower && positionInfo.currentTick <= positionInfo.tickUpper;
    }

    

    const handleManagePosition= () => {
         
        navigate(`/manage-liquidity/${tokenId}`, { state: { positionInfo, fees, token0, token1 } });
         
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
            if (onPositionUpdate) { 
+                onPositionUpdate(tokenId); 
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

    console.log("PositionCard - isWalletConnected:", isWalletConnected);
    console.log("PositionCard - backendOperatorAddress:", backendOperatorAddress);
    console.log("PositionCard - Condition for toggle:", isWalletConnected && backendOperatorAddress);
     
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
                    {isInRange !== null && (  
                        <span className={`status-chip ${isInRange ? 'in-range' : 'out-of-range-chip'}`}>
                            {isInRange ? 'In Range' : 'Out of Range'}
                        </span>
                    )}
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
                {typeof positionInfo.currentTick === 'number' && (  
                    <div>
                        <span className="info-label">Current Pool Tick</span>
                        <span className="info-value">{positionInfo.currentTick.toLocaleString()}</span>
                    </div>
                )}
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
                <button onClick={handleManagePosition} className="action-button manage" disabled={!isWalletConnected}>Manage</button>
                
                {!isNftApprovedForOperator && isWalletConnected && backendOperatorAddress && (
                    <button 
                        onClick={handleApproveNftForOperator} 
                        className="action-button approve-operator"
                        disabled={isProcessingApproval || isCheckingApproval}
                    >
                        {isProcessingApproval ? 'Approving...' : (isCheckingApproval ? 'Checking...' : 'Approve Auto-Manage')}
                    </button>
                )}

                {isWalletConnected && backendOperatorAddress && (  
                    <div className="auto-manage-toggle-container">
                        <label htmlFor={`autoManageToggle-${tokenId}`} className="auto-manage-label">
                            Auto-Manage:
                        </label>
                        <button
                            id={`autoManageToggle-${tokenId}`}
                            className={`action-button auto-manage-toggle ${isAutoManageEnabled ? 'active' : ''}`}
                            onClick={handleToggleAutoManage}
                            disabled={!isWalletConnected || isTogglingAutoManage || !isNftApprovedForOperator || isCheckingApproval}
                            title={isAutoManageEnabled ? "Disable Auto-Management" : (isNftApprovedForOperator ? "Enable Auto-Management" : "Approval required")}
                        >
                            <span className="toggle-switch-circle"></span>
                            <span className="toggle-status-text">{isAutoManageEnabled ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                )}
            </div>
            {autoManageStatus && <p className="auto-manage-status-message" style={{ color: autoManageStatus.toLowerCase().includes('error') ? 'red' : (autoManageStatus.toLowerCase().includes('enabled') || autoManageStatus.toLowerCase().includes('approved') ? 'green' : '#a5a2b3') }}>{autoManageStatus}</p>}
            </div>
    );
}

export default PositionCard;