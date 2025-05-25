 
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import './ManageLiquidityPage.css';  
const PREDEFINED_TOKENS_LIST_MANAGE = {
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
        decimals: 6,  
        logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661' // Добавьте URL логотипа
    },
    LINK: {
        address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
        symbol: 'LINK',
        decimals: 18,
        logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1696502009'
    }
};

const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "payable": true,
        "stateMutability": "payable",
        "type": "fallback"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
];

const INonfungiblePositionManagerABI_Manage = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"},{"internalType":"address","name":"_tokenDescriptor_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Collect","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"DecreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"IncreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint128","name":"amount0Max","type":"uint128"},{"internalType":"uint128","name":"amount1Max","type":"uint128"}],"internalType":"struct INonfungiblePositionManager.CollectParams","name":"params","type":"tuple"}],"name":"collect","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"}],"name":"createAndInitializePoolIfNecessary","outputs":[{"internalType":"address","name":"pool","type":"address"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.DecreaseLiquidityParams","name":"params","type":"tuple"}],"name":"decreaseLiquidity","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"positions","outputs":[{"internalType":"uint96","name":"nonce","type":"uint96"},{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"feeGrowthInside0LastX128","type":"uint256"},{"internalType":"uint256","name":"feeGrowthInside1LastX128","type":"uint256"},{"internalType":"uint128","name":"tokensOwed0","type":"uint128"},{"internalType":"uint128","name":"tokensOwed1","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount0Owed","type":"uint256"},{"internalType":"uint256","name":"amount1Owed","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3MintCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];
const getTokenByAddressManage = (address) => {
    if (!address) return { symbol: '?', logoURI: '', decimals: 18 };
    const tokenAddressLower = address.toLowerCase();
    const foundToken = Object.values(PREDEFINED_TOKENS_LIST_MANAGE).find(
        token => token.address.toLowerCase() === tokenAddressLower
    );
    return foundToken || { symbol: address.substring(0, 6) + '...', logoURI: '', decimals: 18 };
};


function ManageLiquidityPage({ isWalletConnected, provider, signer, userAddress }) {
    const { tokenId } = useParams();  
    const location = useLocation();  
    const navigate = useNavigate();

    const [positionInfo, setPositionInfo] = useState(location.state?.positionInfo || null);
    const [fees, setFees] = useState(location.state?.fees || null);
    const [token0, setToken0] = useState(location.state?.token0 || null);
    const [token1, setToken1] = useState(location.state?.token1 || null);

    const [isLoading, setIsLoading] = useState(!positionInfo);  
    const [errorMessage, setErrorMessage] = useState('');

    // Состояния для вкладок Add/Remove
    const [activeTab, setActiveTab] = useState('add');  

    // Состояния для форм Add/Remove
    const [amountToAddToken0, setAmountToAddToken0] = useState('');
    const [amountToAddToken1, setAmountToAddToken1] = useState('');
    const [removeLiquidityPercentage, setRemoveLiquidityPercentage] = useState(100); // По умолчанию 100%

    const [isProcessing, setIsProcessing] = useState(false);
    const [processStatus, setProcessStatus] = useState('');
    // const [selectedSlippage, setSelectedSlippage] = useState(0.5); // По умолчанию 0.5%
    const [transactionDeadlineMinutes, setTransactionDeadlineMinutes] = useState(20);

    const fetchDetailsIfNeeded = async () => {
             if (tokenId && provider) { // provider может быть не нужен, если вся логика на бэкенде
                 setIsLoading(true);
                 setErrorMessage('');
                 try {
                     const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                     const response = await fetch(`${backendUrl}/api/position-details/${tokenId}`);
                     if (!response.ok) {
                         const errData = await response.json();
                         throw new Error(errData.error || `Failed to fetch position details: ${response.status}`);
                     }
                     const data = await response.json();
                     if (data.positionInfo) {
                         setPositionInfo(data.positionInfo);
                         setFees(data.fees);
                         setToken0(getTokenByAddressManage(data.positionInfo.token0));
                         setToken1(getTokenByAddressManage(data.positionInfo.token1));
                     } else {
                         throw new Error(`Position details not found for tokenId ${tokenId}.`);
                     }
                 } catch (error) {
                     console.error("Error fetching position details for manage page:", error);
                     setErrorMessage(error.message);
                 }
                 finally {
                     setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        const fetchDetailsIfNeeded = async () => {
            if (!positionInfo && tokenId && provider) { // Если нет state, загружаем
                setIsLoading(true);
                setErrorMessage('');
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                    const response = await fetch(`<span class="math-inline">\{backendUrl\}/api/position\-details/</span>{tokenId}`);
                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.error || `Failed to fetch position: ${response.status}`);
                    }
                    const data = await response.json();
                    if (data.positionInfo) {
                        setPositionInfo(data.positionInfo);
                        setFees(data.fees);
                        setToken0(getTokenByAddressManage(data.positionInfo.token0));
                        setToken1(getTokenByAddressManage(data.positionInfo.token1));
                    } else {
                        throw new Error(`Position with tokenId ${tokenId} not found.`);
                    }
                } catch (error) {
                    console.error("Error fetching position details for manage page:", error);
                    setErrorMessage(error.message);
                } finally {
                    setIsLoading(false);
                }
            } else if (positionInfo) { // Если данные пришли из state, просто установим токены
                setToken0(getTokenByAddressManage(positionInfo.token0));
                setToken1(getTokenByAddressManage(positionInfo.token1));
            }
        };
        fetchDetailsIfNeeded();
    }, [tokenId, provider, positionInfo]); // Зависимость от positionInfo, чтобы не перезагружать, если уже есть

    const handleAddLiquidity = async () => {
        if (!isWalletConnected || !signer || !userAddress || !positionInfo || !token0 || !token1 || isProcessing) {
            setProcessStatus("Wallet not connected or position data unavailable.");
            return;
        }

        // Пользователь вводит сумму для одного из токенов.
        // Мы будем использовать ту, которая больше нуля. Если обе, можно взять token0.
        let amount0DesiredWei = 0n;
        let amount1DesiredWei = 0n;
        let tokenToApprove = null;
        let amountToApproveWei = 0n;

        const parsedAmount0 = parseFloat(amountToAddToken0);
        const parsedAmount1 = parseFloat(amountToAddToken1);

        if (parsedAmount0 > 0 && parsedAmount1 > 0) {
            // Если введены обе суммы, это сложнее. Для простоты пока что потребуем ввод одной.
            // Либо можно использовать обе, но тогда amount0Min и amount1Min должны быть рассчитаны аккуратно.
            setProcessStatus("Please enter an amount for only one token to add, or implement logic for dual input.");
             // return; // Раскомментируйте, если хотите строгую проверку на ввод только одной суммы
            // Пока что, если введены обе, приоритет у Token0
             amount0DesiredWei = ethers.parseUnits(amountToAddToken0, token0.decimals);
             amount1DesiredWei = ethers.parseUnits(amountToAddToken1, token1.decimals); // Будет использоваться, если нужно
             tokenToApprove = token0; // По умолчанию одобряем первый, если оба введены
             amountToApproveWei = amount0DesiredWei;

        } else if (parsedAmount0 > 0) {
            amount0DesiredWei = ethers.parseUnits(amountToAddToken0, token0.decimals);
            tokenToApprove = token0;
            amountToApproveWei = amount0DesiredWei;
            // amount1DesiredWei остается 0n, контракт рассчитает, сколько нужно
        } else if (parsedAmount1 > 0) {
            amount1DesiredWei = ethers.parseUnits(amountToAddToken1, token1.decimals);
            tokenToApprove = token1;
            amountToApproveWei = amount1DesiredWei;
            // amount0DesiredWei остается 0n
        } else {
            setProcessStatus("Please enter a valid amount for at least one token.");
            return;
        }

        setIsProcessing(true);
        setProcessStatus(`Preparing to add liquidity...`);

        try {
            const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
            if (!nftManagerAddress) throw new Error("NFT Position Manager address not configured.");

            // Approve для токена, который добавляем (если его сумма > 0)
            if (tokenToApprove && amountToApproveWei > 0n) {
                setProcessStatus(`Checking allowance for ${tokenToApprove.symbol}...`);
                const tokenContract = new ethers.Contract(tokenToApprove.address, ERC20_ABI, signer);
                const currentAllowance = await tokenContract.allowance(userAddress, nftManagerAddress);

                if (currentAllowance < amountToApproveWei) {
                    setProcessStatus(`Approving ${tokenToApprove.symbol}...`);
                    const approveTx = await tokenContract.approve(nftManagerAddress, amountToApproveWei);
                    setProcessStatus(`Approval sent: ${approveTx.hash.substring(0,10)}... Waiting...`);
                    await approveTx.wait(1);
                    setProcessStatus(`${tokenToApprove.symbol} approved!`);
                } else {
                    setProcessStatus(`${tokenToApprove.symbol} allowance sufficient.`);
                }
            }
             // Если добавляем оба токена (случай, когда parsedAmount0 > 0 && parsedAmount1 > 0)
            // и amount1DesiredWei > 0n и tokenToApprove был token0, нужно отдельно одобрить token1.
            // Это для случая, если вы решите позволить ввод обеих сумм.
            // Пока что эта логика упрощена и приоритет у одного токена.
            // Если пользователь ввел обе суммы, и вы хотите одобрить обе:
            if (parsedAmount0 > 0 && parsedAmount1 > 0 && tokenToApprove.address !== token1.address && amount1DesiredWei > 0n) {
                setProcessStatus(`Checking allowance for ${token1.symbol}...`);
                const token1Contract = new ethers.Contract(token1.address, ERC20_ABI, signer);
                const allowanceToken1 = await token1Contract.allowance(userAddress, nftManagerAddress);
                if (allowanceToken1 < amount1DesiredWei) {
                    setProcessStatus(`Approving ${token1.symbol}...`);
                    const approveTx1 = await token1Contract.approve(nftManagerAddress, amount1DesiredWei);
                    setProcessStatus(`Approval for ${token1.symbol} sent: ${approveTx1.hash.substring(0,10)}... Waiting...`);
                    await approveTx1.wait(1);
                    setProcessStatus(`${token1.symbol} approved!`);
                } else {
                     setProcessStatus(`${token1.symbol} allowance sufficient.`);
                }
            }


            const positionManagerContract = new ethers.Contract(
                nftManagerAddress,
                INonfungiblePositionManagerABI_Manage,
                signer
            );

            const deadline = Math.floor(Date.now() / 1000) + (transactionDeadlineMinutes * 60 || 20 * 60);

            // Для amount0Min и amount1Min можно использовать 0 для простоты,
            // или рассчитать их на основе slippage и amount0Desired/amount1Desired.
            // Если пользователь ввел только одну сумму, то для другой min можно оставить 0.
            // Контракт сам определит, сколько второго токена нужно.
            const params = {
                tokenId: parseInt(tokenId),
                amount0Desired: amount0DesiredWei.toString(),
                amount1Desired: amount1DesiredWei.toString(),
                amount0Min: 0, // Упрощение! В проде нужен расчет со slippage.
                amount1Min: 0, // Упрощение!
                deadline: deadline
            };

            setProcessStatus(`Sending increaseLiquidity transaction... Please confirm.`);
            const increaseTx = await positionManagerContract.increaseLiquidity(params);
            setProcessStatus(`Increase liquidity transaction sent: ${increaseTx.hash.substring(0,10)}... Waiting...`);

            const receipt = await increaseTx.wait(1);

            if (receipt.status === 1) {
                setProcessStatus(`Liquidity successfully added! Tx: ${increaseTx.hash.substring(0,10)}...`);
                setAmountToAddToken0(''); // Сбрасываем поля ввода
                setAmountToAddToken1('');
                await fetchDetailsIfNeeded(); // Обновляем данные о позиции
            } else {
                throw new Error("Increase liquidity transaction failed (reverted).");
            }

        } catch (error) {
            console.error("Error adding liquidity:", error);
            let errMsg = error.reason || error.message || "Unknown error adding liquidity.";
            if (error.data && typeof error.data.message === 'string') errMsg = error.data.message;
            else if (error.error && typeof error.error.message === 'string') errMsg = error.error.message;
            setProcessStatus(`Failed to add liquidity: ${errMsg}`);
        } finally {
            setIsProcessing(false);
        }
    };

     const handleRemoveLiquidity = async () => {
        if (!isWalletConnected || !signer || !userAddress || !positionInfo || isProcessing) {
            setProcessStatus("Wallet not connected or data unavailable.");
            return;
        }
        if (removeLiquidityPercentage <= 0 || removeLiquidityPercentage > 100) {
            setProcessStatus("Please select a valid percentage (1-100).");
            return;
        }

        setIsProcessing(true);
        setProcessStatus(`Preparing to remove ${removeLiquidityPercentage}% liquidity...`);

        try {
            const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
            if (!nftManagerAddress) {
                throw new Error("NFT Position Manager address not configured.");
            }

            const positionManagerContract = new ethers.Contract(
                nftManagerAddress,
                INonfungiblePositionManagerABI_Manage, // Убедитесь, что этот ABI содержит decreaseLiquidity и collect
                signer
            );

            const currentLiquidity = BigInt(positionInfo.liquidity);
            const liquidityToRemove = (currentLiquidity * BigInt(removeLiquidityPercentage)) / 100n;

            if (liquidityToRemove <= 0n) {
                setProcessStatus("Calculated liquidity to remove is zero. No action taken.");
                setIsProcessing(false);
                return;
            }
            
            const deadline = Math.floor(Date.now() / 1000) + (transactionDeadlineMinutes * 60 || 20 * 60);

            // 1. Decrease Liquidity
            const decreaseParams = {
                tokenId: parseInt(tokenId),
                liquidity: liquidityToRemove.toString(),
                amount0Min: 0, 
                amount1Min: 0, 
                deadline: deadline
            };

            setProcessStatus(`Sending decreaseLiquidity transaction for ${removeLiquidityPercentage}%... Please confirm.`);
            const decreaseTx = await positionManagerContract.decreaseLiquidity(decreaseParams);
            setProcessStatus(`Decrease transaction sent: ${decreaseTx.hash.substring(0,10)}... Waiting for confirmation...`);
            const decreaseReceipt = await decreaseTx.wait(1);

            if (decreaseReceipt.status !== 1) {
                throw new Error("Decrease liquidity transaction failed (reverted).");
            }
            setProcessStatus(`Liquidity decreased successfully! Now collecting funds...`); // Изменено сообщение

            // 2. Collect (чтобы забрать высвобожденные токены и все накопленные комиссии)
            const MAX_UINT128 = (2n ** 128n) - 1n;
            const collectParams = {
                tokenId: parseInt(tokenId),
                recipient: userAddress, // Комиссии и токены будут отправлены на адрес пользователя
                amount0Max: MAX_UINT128, // Собираем всё доступное
                amount1Max: MAX_UINT128  // Собираем всё доступное
            };

            setProcessStatus(`Sending collect transaction... Please confirm in your wallet.`);
            const collectTx = await positionManagerContract.collect(collectParams);
            setProcessStatus(`Collect transaction sent: ${collectTx.hash.substring(0,10)}... Waiting for confirmation...`);
            const collectReceipt = await collectTx.wait(1);

            if (collectReceipt.status !== 1) {
                 
                throw new Error("Collect transaction after decrease failed (reverted). Funds are available for later collection.");
            }

            setProcessStatus(`Successfully removed ${removeLiquidityPercentage}% liquidity and collected funds! Tx: ${decreaseTx.hash.substring(0,10)}... (and ${collectTx.hash.substring(0,10)}...)`);
            // TODO: Обновить данные о позиции (вызвать fetchDetailsIfNeeded или колбэк),
            // positionInfo.liquidity изменится, а tokensOwed0/1 (и fees) должны стать близки к нулю.
            // Например: fetchDetailsIfNeeded(); 
            await fetchDetailsIfNeeded();


        } catch (error) {
            console.error("Error removing liquidity and collecting:", error);
            let errMsg = error.reason || error.message || "Unknown error during removal/collection.";
            if (error.data && typeof error.data.message === 'string') errMsg = error.data.message;
            else if (error.error && typeof error.error.message === 'string') errMsg = error.error.message;
            setProcessStatus(`Operation failed: ${errMsg}`);
        } finally {
            setIsProcessing(false);
        }
    };


    if (isLoading) return <div className="manage-liquidity-page loading">Loading position data...</div>;
    if (errorMessage) return <div className="manage-liquidity-page error">{errorMessage} <button onClick={() => navigate('/earn')}>Back to Earn</button></div>;
    if (!positionInfo || !token0 || !token1) return <div className="manage-liquidity-page error">Position data not available. <button onClick={() => navigate('/earn')}>Back to Earn</button></div>;


    return (
        <div className="manage-liquidity-page">
            <div className="manage-liquidity-header">
                <button onClick={() => navigate('/earn')} className="back-button">← Back to Positions</button>
                <h2>Manage Liquidity</h2>
                <div className="position-summary-header">
                    <div className="token-pair-manage">
                        {token0.logoURI && <img src={token0.logoURI} alt={token0.symbol} className="token-logo-manage first" />}
                        {token1.logoURI && <img src={token1.logoURI} alt={token1.symbol} className="token-logo-manage second" />}
                        <span>{token0.symbol} / {token1.symbol}</span>
                    </div>
                    <span className="fee-tier-chip-manage">{positionInfo.fee / 10000}% Fee</span>
                    <span>ID: #{tokenId}</span>
                </div>
            </div>

            <div className="manage-tabs">
                <button 
                    className={`manage-tab-button ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => setActiveTab('add')}
                >
                    Add Liquidity
                </button>
                <button 
                    className={`manage-tab-button ${activeTab === 'remove' ? 'active' : ''}`}
                    onClick={() => setActiveTab('remove')}
                >
                    Remove Liquidity
                </button>
            </div>

            <div className="manage-tab-content">
                {activeTab === 'add' && (
                    <div className="add-liquidity-form">
                        <h3>Add Liquidity to Position</h3>
                         
                        <p>Current Range: Tick {positionInfo.tickLower} - {positionInfo.tickUpper}</p>
                        <input 
                            type="text" 
                            placeholder={`Amount of ${token0?.symbol || 'Token0'}`} // Добавил ? для безопасности
                            value={amountToAddToken0}
                            onChange={(e) => {
                                setAmountToAddToken0(e.target.value);
                                // Если введено это поле, можно сбросить другое, чтобы пользователь вводил только одну сумму
                                // if (e.target.value) setAmountToAddToken1(''); 
                            }}
                            disabled={isProcessing}
                            className="amount-input-field" // Используем существующий класс или создаем новый
                        />
                        <input 
                            type="text" 
                            placeholder={`Amount of ${token1?.symbol || 'Token1'}`} // Добавил ? для безопасности
                            value={amountToAddToken1}
                            onChange={(e) => {
                                setAmountToAddToken1(e.target.value);
                                // if (e.target.value) setAmountToAddToken0('');
                            }}
                            disabled={isProcessing}
                            className="amount-input-field" // Используем существующий класс или создаем новый
                        />
                        <button 
                            onClick={handleAddLiquidity} 
                            disabled={isProcessing || !isWalletConnected || (!parseFloat(amountToAddToken0) && !parseFloat(amountToAddToken1))} 
                            className="action-btn-manage"
                        >
                            {isProcessing ? 'Processing...' : `Add Liquidity`}
                        </button>
                    </div>
                )}
                {activeTab === 'remove' && (
                    <div className="remove-liquidity-form">
                        <h3>Remove Liquidity from Position</h3>
                        <p>Current Liquidity: {Number(ethers.formatUnits(positionInfo.liquidity, 0)).toLocaleString()}</p>
                        <label htmlFor="remove-percentage">Percentage to remove:</label>
                        <div className="settings-section deadline-settings">
                        <span className="trade-summary-label">Transaction Deadline:</span>
                        <div className="deadline-input-group">
                            <input 
                                type="number" 
                                value={transactionDeadlineMinutes}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val) && val >= 1) {
                                        setTransactionDeadlineMinutes(val);
                                    } else if (e.target.value === '') {
                                        setTransactionDeadlineMinutes(''); // Позволяем очистить
                                    }
                                }}
                                className="deadline-input"
                                min="1"
                            />
                            <span>minutes</span>
                        </div>
                        </div>
                        <div className="percentage-slider-container">
                            <input 
                                type="range" 
                                id="remove-percentage"
                                min="1" 
                                max="100" 
                                value={removeLiquidityPercentage}
                                onChange={(e) => setRemoveLiquidityPercentage(Number(e.target.value))}
                                disabled={isProcessing}
                                className="percentage-slider"
                            />
                            <span>{removeLiquidityPercentage}%</span>
                        </div>
                        <button onClick={handleRemoveLiquidity} disabled={isProcessing || !isWalletConnected} className="action-btn-manage remove">
                            {isProcessing ? 'Processing...' : `Remove ${removeLiquidityPercentage}% Liquidity`}
                        </button>
                    </div>
                )}
                {processStatus && <p className="process-status-message">{processStatus}</p>}
            </div>
            
        </div>
    );
}

export default ManageLiquidityPage;