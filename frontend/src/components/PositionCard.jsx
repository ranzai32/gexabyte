 
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import './PositionCard.css';
const INonfungiblePositionManagerABI_Card = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"},{"internalType":"address","name":"_tokenDescriptor_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Collect","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"DecreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"IncreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint128","name":"amount0Max","type":"uint128"},{"internalType":"uint128","name":"amount1Max","type":"uint128"}],"internalType":"struct INonfungiblePositionManager.CollectParams","name":"params","type":"tuple"}],"name":"collect","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"}],"name":"createAndInitializePoolIfNecessary","outputs":[{"internalType":"address","name":"pool","type":"address"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.DecreaseLiquidityParams","name":"params","type":"tuple"}],"name":"decreaseLiquidity","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"positions","outputs":[{"internalType":"uint96","name":"nonce","type":"uint96"},{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"feeGrowthInside0LastX128","type":"uint256"},{"internalType":"uint256","name":"feeGrowthInside1LastX128","type":"uint256"},{"internalType":"uint128","name":"tokensOwed0","type":"uint128"},{"internalType":"uint128","name":"tokensOwed1","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount0Owed","type":"uint256"},{"internalType":"uint256","name":"amount1Owed","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3MintCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

const MAX_UINT256 = ethers.MaxUint256;


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

function PositionCard({ positionInfo, fees, tokenId, signer, userAddress, provider, isWalletConnected, onPositionUpdate }) { 
    const navigate = useNavigate();
    const [isCollecting, setIsCollecting] = useState(false);
    const [collectStatus, setCollectStatus] = useState('');

    const [isAutoManageEnabled, setIsAutoManageEnabled] = useState(false);
    const [isTogglingAutoManage, setIsTogglingAutoManage] = useState(false);
    const [autoManageStatus, setAutoManageStatus] = useState('');
 
    const [isNftApprovedForOperator, setIsNftApprovedForOperator] = useState(false);
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    const [isProcessingApproval, setIsProcessingApproval] = useState(false);

    const [token0ApprovedForSwapRouter, setToken0ApprovedForSwapRouter] = useState(false);
    const [token1ApprovedForSwapRouter, setToken1ApprovedForSwapRouter] = useState(false);
    const [token0ApprovedForNftManager, setToken0ApprovedForNftManager] = useState(false);
    const [token1ApprovedForNftManager, setToken1ApprovedForNftManager] = useState(false);
    const [isProcessingTokenApproval, setIsProcessingTokenApproval] = useState(null);
    

    const backendOperatorAddress = import.meta.env.VITE_BACKEND_OPERATOR_ADDRESS; 
    const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
    const swapRouterAddress = import.meta.env.VITE_UNISWAP_V3_SWAP_ROUTER_ADDRESS;

    const token0 = getTokenByAddressCard(positionInfo?.token0);
    const token1 = getTokenByAddressCard(positionInfo?.token1);

    // Функция для проверки текущего статуса approve
    const checkNftApproval = async () => {
        if (!isWalletConnected || !signer || !tokenId || !backendOperatorAddress) {
            setIsNftApprovedForOperator(false);
            return;
        }
        setIsCheckingApproval(true);
        try {
            const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_Card, provider);
            const approvedAddress = await positionManagerContract.getApproved(tokenId);
            if (approvedAddress && approvedAddress.toLowerCase() === backendOperatorAddress.toLowerCase()) {
                setIsNftApprovedForOperator(true);
            } else {
                const isApprovedForAll = await positionManagerContract.isApprovedForAll(userAddress, backendOperatorAddress);
                setIsNftApprovedForOperator(isApprovedForAll);
            }
        } catch (error) {
            console.error("Error checking NFT approval:", error);
            setIsNftApprovedForOperator(false);
        } finally {
            setIsCheckingApproval(false);
        }
    };
    
    // Функция для запроса approve у пользователя
    const handleApproveNftForOperator = async () => {
        if (!isWalletConnected || !signer || !tokenId || !backendOperatorAddress || isProcessingApproval || !nftManagerAddress) return;
        setIsProcessingApproval(true);
        setAutoManageStatus('Requesting approval for auto-management...');
        try {
            const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_Card, signer);
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

    const checkTokenAllowance = async (tokenAddress, spenderAddress, setApprovalState) => {
        if (!isWalletConnected || !provider || !userAddress || !tokenAddress || !spenderAddress) return;
        try {
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            const allowance = await tokenContract.allowance(userAddress, spenderAddress);
            // Сравниваем с очень большой суммой (половина от MAX_UINT256, чтобы избежать проблем с точным сравнением)
            if (allowance >= (MAX_UINT256 / 2n) ) {
                setApprovalState(true);
            } else {
                setApprovalState(false);
            }
        } catch (error) {
            console.error(`Error checking allowance for token ${tokenAddress} to spender ${spenderAddress}:`, error);
            setApprovalState(false);
        }
    };

    const handleApproveToken = async (token, spenderAddress, approvalType, setApprovalState) => {
        if (!isWalletConnected || !signer || !token || !spenderAddress || isProcessingTokenApproval) return;

        setIsProcessingTokenApproval(approvalType);
        setAutoManageStatus(`Approving ${token.symbol} for ${spenderAddress === swapRouterAddress ? 'Swap Router' : 'Position Manager'}...`);
        try {
            const tokenContract = new ethers.Contract(token.address, ERC20_ABI, signer);
            const tx = await tokenContract.approve(spenderAddress, MAX_UINT256);
            setAutoManageStatus(`Approval for ${token.symbol} sent: ${tx.hash.substring(0,10)}... Waiting...`);
            await tx.wait(1);
            setApprovalState(true);
            setAutoManageStatus(`${token.symbol} successfully approved for ${spenderAddress === swapRouterAddress ? 'Swap Router' : 'Position Manager'}!`);
        } catch (error) {
            console.error(`Error approving ${token.symbol}:`, error);
            let errMsg = error.reason || error.data?.message || error.message || `Failed to approve ${token.symbol}.`;
            setAutoManageStatus(`Approval failed: ${errMsg}`);
            setApprovalState(false);
        } finally {
            setIsProcessingTokenApproval(null);
        }
    };


    useEffect(() => {
        const fetchAllStatuses = async () => {
            if (!tokenId || !isWalletConnected || !userAddress || !provider) return;
            
            // Статус автоуправления с бэкенда
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                const response = await fetch(`${backendUrl}/api/auto-manage/status/${tokenId}`);
                if (response.ok) {
                    const data = await response.json();
                    setIsAutoManageEnabled(data.isEnabled);
                } else { console.warn(`Could not fetch auto-manage status for token ${tokenId}`); }
            } catch (error) { console.error("Error fetching auto-manage status from backend:", error); }

            // Апрув NFT
            await checkNftApproval();

            // Апрувы токенов ERC20
            if (token0?.address && swapRouterAddress) await checkTokenAllowance(token0.address, swapRouterAddress, setToken0ApprovedForSwapRouter);
            if (token1?.address && swapRouterAddress) await checkTokenAllowance(token1.address, swapRouterAddress, setToken1ApprovedForSwapRouter);
            if (token0?.address && nftManagerAddress) await checkTokenAllowance(token0.address, nftManagerAddress, setToken0ApprovedForNftManager);
            if (token1?.address && nftManagerAddress) await checkTokenAllowance(token1.address, nftManagerAddress, setToken1ApprovedForNftManager);
        };
        fetchAllStatuses();
    }, [tokenId, isWalletConnected, userAddress, provider, token0?.address, token1?.address]); 


    const handleToggleAutoManage = async () => {
        if (!isWalletConnected || !signer || isTogglingAutoManage || !isNftApprovedForOperator || 
            !token0ApprovedForSwapRouter || !token1ApprovedForSwapRouter || 
            !token0ApprovedForNftManager || !token1ApprovedForNftManager
        ) {
            let missingApprovals = [];
            if (!isNftApprovedForOperator) missingApprovals.push("NFT for Operator");
            if (!token0ApprovedForSwapRouter) missingApprovals.push(`${token0.symbol} for Swapping`);
            if (!token1ApprovedForSwapRouter) missingApprovals.push(`${token1.symbol} for Swapping`);
            if (!token0ApprovedForNftManager) missingApprovals.push(`${token0.symbol} for Liquidity Management`);
            if (!token1ApprovedForNftManager) missingApprovals.push(`${token1.symbol} for Liquidity Management`);

            if (missingApprovals.length > 0) {
                 setAutoManageStatus(`Please grant all required approvals: ${missingApprovals.join(', ')}.`);
            } else {
                 setAutoManageStatus('Please wait, checking approvals or processing another action.');
            }
            return;
        }
        // ... остальная часть функции
        setIsTogglingAutoManage(true);
        const newStatus = !isAutoManageEnabled;
        setAutoManageStatus(newStatus ? 'Enabling auto-management...' : 'Disabling auto-management...');
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/auto-manage/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({
                    tokenId: parseInt(tokenId), 
                    enable: newStatus,
                    userAddress: userAddress,
                    strategyParameters: { rangePercentage: 5 }, 
                }),
            });
            if (response.ok) {
                const data = await response.json();
                setIsAutoManageEnabled(data.isEnabled);
                setAutoManageStatus(data.isEnabled ? 'Auto-management enabled.' : 'Auto-management disabled.');
                 if (onPositionUpdate) onPositionUpdate(tokenId); 
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

    const allApprovalsDone = isNftApprovedForOperator && token0ApprovedForSwapRouter && token1ApprovedForSwapRouter && token0ApprovedForNftManager && token1ApprovedForNftManager;
     
return (
    <div className={`position-card ${isInRange === false ? 'out-of-range' : (isInRange === true ? 'in-range': '')}`}>
        <div className="position-card-header">
            <div className="token-pair">
                {token0?.logoURI && <img src={token0.logoURI} alt={token0.symbol} className="token-logo-card first" />}
                {token1?.logoURI && <img src={token1.logoURI} alt={token1.symbol} className="token-logo-card second" />}
                <span className="pair-symbols">{token0?.symbol || 'T0'}/{token1?.symbol || 'T1'}</span>
            </div>
            <div>
                {positionInfo && <span className="fee-tier-chip">Fee: {positionInfo.fee / 10000}%</span>}
                {isInRange !== null && (  
                    <span className={`status-chip ${isInRange ? 'in-range' : 'out-of-range-chip'}`}>
                        {isInRange ? 'In Range' : 'Out of Range'}
                    </span>
                )}
            </div>
        </div>

        <div className="position-info-grid">
            <div>
                <span className="info-label">Min Price (Tick {positionInfo?.tickLower || 'N/A'})</span>
                <span className="info-value"> {/* TODO: Calculate and display price from tick */} N/A </span>
            </div>
            <div>
                <span className="info-label">Max Price (Tick {positionInfo?.tickUpper || 'N/A'})</span>
                <span className="info-value"> {/* TODO: Calculate and display price from tick */} N/A </span>
            </div>
            {typeof positionInfo?.currentTick === 'number' && (  
                <div>
                    <span className="info-label">Current Pool Tick</span>
                    <span className="info-value">{positionInfo.currentTick.toLocaleString()}</span>
                </div>
            )}
            <div>
                <span className="info-label">Liquidity</span>
                <span className="info-value">{(positionInfo?.liquidity && positionInfo.liquidity !== '0') ? Number(ethers.formatUnits(positionInfo.liquidity, 0)).toLocaleString() : '0'}</span>
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
                        {parseFloat(ethers.formatUnits(fees.feesAmount0 || '0', token0?.decimals || 18)).toFixed(Math.min(token0?.decimals || 18, 6))} {token0?.symbol || 'T0'}
                    </span>
                    <span>
                        {parseFloat(ethers.formatUnits(fees.feesAmount1 || '0', token1?.decimals || 18)).toFixed(Math.min(token1?.decimals || 18, 6))} {token1?.symbol || 'T1'}
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
        {collectStatus && <p className="collect-status-message" style={{ color: collectStatus.toLowerCase().includes('fail') || collectStatus.toLowerCase().includes('error') ? 'red' : (collectStatus.toLowerCase().includes('success') || collectStatus.toLowerCase().includes('successfully') ? 'green' : '#a5a2b3') }}>{collectStatus}</p>}

        {/* Секция с апрувами токенов, если NFT уже апрувнут для оператора */}
        {isWalletConnected && backendOperatorAddress && isNftApprovedForOperator && (!token0ApprovedForSwapRouter || !token1ApprovedForSwapRouter || !token0ApprovedForNftManager || !token1ApprovedForNftManager) && (
            <div className="token-approvals-section">
                <p className="info-label" style={{textAlign: 'center', marginBottom: '0.75rem'}}>Auto-management requires further token approvals:</p>
                {token0?.address && nftManagerAddress && swapRouterAddress && (
                    <>
                        {!token0ApprovedForSwapRouter && (
                            <button onClick={() => handleApproveToken(token0, swapRouterAddress, `token0Swap-${tokenId}`, setToken0ApprovedForSwapRouter)} disabled={isProcessingTokenApproval === `token0Swap-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token0Swap-${tokenId}` ? 'Approving...' : `Approve ${token0.symbol} for Swapping`}
                            </button>
                        )}
                        {!token0ApprovedForNftManager && (
                             <button onClick={() => handleApproveToken(token0, nftManagerAddress, `token0Nft-${tokenId}`, setToken0ApprovedForNftManager)} disabled={isProcessingTokenApproval === `token0Nft-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token0Nft-${tokenId}` ? 'Approving...' : `Approve ${token0.symbol} for Liquidity Mgmt.`}
                             </button>
                        )}
                    </>
                )}
                {token1?.address && nftManagerAddress && swapRouterAddress && (
                    <>
                        {!token1ApprovedForSwapRouter && (
                            <button onClick={() => handleApproveToken(token1, swapRouterAddress, `token1Swap-${tokenId}`, setToken1ApprovedForSwapRouter)} disabled={isProcessingTokenApproval === `token1Swap-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token1Swap-${tokenId}` ? 'Approving...' : `Approve ${token1.symbol} for Swapping`}
                            </button>
                        )}
                         {!token1ApprovedForNftManager && (
                             <button onClick={() => handleApproveToken(token1, nftManagerAddress, `token1Nft-${tokenId}`, setToken1ApprovedForNftManager)} disabled={isProcessingTokenApproval === `token1Nft-${tokenId}`} className="action-button approve-token">
                                {isProcessingTokenApproval === `token1Nft-${tokenId}` ? 'Approving...' : `Approve ${token1.symbol} for Liquidity Mgmt.`}
                             </button>
                        )}
                    </>
                )}
            </div>
        )}

        <div className="position-card-actions">
            <button onClick={handleManagePosition} className="action-button manage" disabled={!isWalletConnected}>Manage</button>
            
            {/* Кнопка для апрува самого NFT, если еще не апрувнут */}
            {!isNftApprovedForOperator && isWalletConnected && backendOperatorAddress && (
                <button 
                    onClick={handleApproveNftForOperator} 
                    className="action-button approve-operator" // Можете задать другой стиль, если хотите выделить
                    disabled={isProcessingApproval || isCheckingApproval}
                >
                    {isProcessingApproval ? 'Approving NFT...' : (isCheckingApproval ? 'Checking NFT...' : 'Approve NFT for Auto-Manage')}
                </button>
            )}

            {/* Переключатель Авто-управления */}
            {isWalletConnected && backendOperatorAddress && (
                <div className="auto-manage-toggle-container">
                    <label htmlFor={`autoManageToggle-${tokenId}`} className="auto-manage-label">
                        Auto-Manage:
                    </label>
                    <button
                        id={`autoManageToggle-${tokenId}`}
                        className={`action-button auto-manage-toggle ${isAutoManageEnabled ? 'active' : ''}`}
                        onClick={handleToggleAutoManage}
                        disabled={
                            !isWalletConnected || 
                            isTogglingAutoManage || 
                            !allApprovalsDone || // Проверяем все апрувы
                            isCheckingApproval || 
                            isProcessingApproval || 
                            !!isProcessingTokenApproval // Если любой из апрувов токенов в процессе
                        }
                        title={
                            isAutoManageEnabled ? "Disable Auto-Management" : 
                            (allApprovalsDone ? "Enable Auto-Management" : "All approvals required (NFT & Tokens)")
                        }
                    >
                        <span className="toggle-switch-circle"></span>
                        <span className="toggle-status-text">{isAutoManageEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            )}
        </div>
        {autoManageStatus && <p className="auto-manage-status-message" style={{ color: autoManageStatus.toLowerCase().includes('error') || autoManageStatus.toLowerCase().includes('fail') || autoManageStatus.toLowerCase().includes('required') ? 'red' : (autoManageStatus.toLowerCase().includes('enabled') || autoManageStatus.toLowerCase().includes('approved') || autoManageStatus.toLowerCase().includes('disabled') ? 'green' : '#a5a2b3') }}>{autoManageStatus}</p>}
    </div>
  );
}

export default PositionCard;