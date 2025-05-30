import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ethers } from 'ethers';
import { Token, Price } from '@uniswap/sdk-core';
import { Pool, Position, FeeAmount, tickToPrice, priceToClosestTick, TICK_SPACINGS } from '@uniswap/v3-sdk';
import TokenSelectorDropdown from '../components/TokenSelectorDropdown';
import './AddLiquidityPage.css';
  

const PREDEFINED_TOKENS = {
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
const tokenKeys = Object.keys(PREDEFINED_TOKENS);
 
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];
 
const INonfungiblePositionManagerABI_MinimalMint = [{"inputs":[{"internalType":"address","name":"_factory","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"},{"internalType":"address","name":"_tokenDescriptor_","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Collect","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"DecreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint128","name":"liquidity","type":"uint128"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"IncreaseLiquidity","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"baseURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint128","name":"amount0Max","type":"uint128"},{"internalType":"uint128","name":"amount1Max","type":"uint128"}],"internalType":"struct INonfungiblePositionManager.CollectParams","name":"params","type":"tuple"}],"name":"collect","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"uint160","name":"sqrtPriceX96","type":"uint160"}],"name":"createAndInitializePoolIfNecessary","outputs":[{"internalType":"address","name":"pool","type":"address"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.DecreaseLiquidityParams","name":"params","type":"tuple"}],"name":"decreaseLiquidity","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Desired","type":"uint256"},{"internalType":"uint256","name":"amount1Desired","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"}],"internalType":"struct INonfungiblePositionManager.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"positions","outputs":[{"internalType":"uint96","name":"nonce","type":"uint96"},{"internalType":"address","name":"operator","type":"address"},{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint128","name":"liquidity","type":"uint128"},{"internalType":"uint256","name":"feeGrowthInside0LastX128","type":"uint256"},{"internalType":"uint256","name":"feeGrowthInside1LastX128","type":"uint256"},{"internalType":"uint128","name":"tokensOwed0","type":"uint128"},{"internalType":"uint128","name":"tokensOwed1","type":"uint128"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"index","type":"uint256"}],"name":"tokenOfOwnerByIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount0Owed","type":"uint256"},{"internalType":"uint256","name":"amount1Owed","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"uniswapV3MintCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];


const CHAIN_ID = 11155111;  

function AddLiquidityPage({ isWalletConnected, provider, signer, userAddress }) {
    const navigate = useNavigate();
    const location = useLocation();

    const initialToken0FromState = location.state?.initialToken0;
    const initialToken1FromState = location.state?.initialToken1;
    const initialPoolDataFromState = location.state?.initialPoolData;

    const [token0Index, setToken0Index] = useState(() => initialToken0FromState ? tokenKeys.findIndex(k => PREDEFINED_TOKENS[k].address.toLowerCase() === initialToken0FromState.address.toLowerCase()) : 0);
    const [token1Index, setToken1Index] = useState(() => {
        let idx = initialToken1FromState ? tokenKeys.findIndex(k => PREDEFINED_TOKENS[k].address.toLowerCase() === initialToken1FromState.address.toLowerCase()) : 1;
        const _token0Index = initialToken0FromState ? tokenKeys.findIndex(k => PREDEFINED_TOKENS[k].address.toLowerCase() === initialToken0FromState.address.toLowerCase()) : token0Index;
        const currentToken0Addr = (_token0Index !== -1 && tokenKeys.length > 0 && PREDEFINED_TOKENS[tokenKeys[_token0Index]]) ? PREDEFINED_TOKENS[tokenKeys[_token0Index]].address.toLowerCase() : '';
        
        if (idx === -1 && tokenKeys.length > 1) {
             idx = (_token0Index + 1) % tokenKeys.length;
        }
        if (idx === -1 || (idx === _token0Index && tokenKeys.length <=1 ) ) idx = 0;


        if (idx !== -1 && PREDEFINED_TOKENS[tokenKeys[idx]]?.address.toLowerCase() === currentToken0Addr && tokenKeys.length > 1) {
            idx = (idx + 1) % tokenKeys.length;
        }
        return idx;
    });

    const [selectedFeeTier, setSelectedFeeTier] = useState(location.state?.initialFeeTier || FeeAmount.MEDIUM);
    const [poolData, setPoolData] = useState(null);
    const [isLoadingPool, setIsLoadingPool] = useState(false);
    const [amount0Input, setAmount0Input] = useState('');
    const [amount1Input, setAmount1Input] = useState('');
    
    const [tickLower, setTickLower] = useState('');
    const [tickUpper, setTickUpper] = useState('');
    const [priceMinDisplay, setPriceMinDisplay] = useState('');
    const [priceMaxDisplay, setPriceMaxDisplay] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [processStatus, setProcessStatus] = useState('');
    const [txHash, setTxHash] = useState('');
    const [showDropdown0, setShowDropdown0] = useState(false);
    const [showDropdown1, setShowDropdown1] = useState(false);
    const dropdown0Ref = useRef(null);
    const dropdown1Ref = useRef(null);

    const currentToken0 = token0Index >= 0 && token0Index < tokenKeys.length ? PREDEFINED_TOKENS[tokenKeys[token0Index]] : null;
    const currentToken1 = token1Index >= 0 && token1Index < tokenKeys.length ? PREDEFINED_TOKENS[tokenKeys[token1Index]] : null;
    
    const [selectedSlippage, setSelectedSlippage] = useState(0.5);
    const [transactionDeadlineMinutes, setTransactionDeadlineMinutes] = useState(20);
    const lastEditedFieldRef = useRef(null);

    const getTickSpacing = useCallback((fee) => {
        return TICK_SPACINGS[fee] || TICK_SPACINGS[FeeAmount.MEDIUM];
    }, []);

    const uiPriceToAlignedTick = useCallback((priceStr, baseTokenForPrice, quoteTokenForPrice, poolCanonicalToken0, poolCanonicalToken1, fee, forUpperBoundary = false) => {
        if (!priceStr || isNaN(parseFloat(priceStr)) || parseFloat(priceStr) <= 0 || !baseTokenForPrice || !quoteTokenForPrice || !poolCanonicalToken0 || !poolCanonicalToken1) {
            return null;
        }
        try {
            const typedPrice = parseFloat(priceStr);
            const baseAmount = ethers.parseUnits("1", baseTokenForPrice.decimals);
            const quoteAmount = ethers.parseUnits(typedPrice.toFixed(quoteTokenForPrice.decimals), quoteTokenForPrice.decimals); 
            
            let priceForSdk = new Price(baseTokenForPrice, quoteTokenForPrice, baseAmount, quoteAmount);

            if (!baseTokenForPrice.equals(poolCanonicalToken0)) {
                priceForSdk = priceForSdk.invert();
            }
            
            const unalignedTick = priceToClosestTick(priceForSdk);
            const tickSpacing = getTickSpacing(fee);
            
            if (forUpperBoundary) {
                 return Math.ceil(unalignedTick / tickSpacing) * tickSpacing;
            }
            return Math.floor(unalignedTick / tickSpacing) * tickSpacing; 
        } catch (error) {
            console.error("Error converting UI price to tick:", error);
            return null;
        }
    }, [getTickSpacing]);

    const tickToUiPriceString = useCallback((tick, baseTokenForPrice, quoteTokenForPrice, poolCanonicalToken0, poolCanonicalToken1) => {
        if (isNaN(parseInt(tick)) || !baseTokenForPrice || !quoteTokenForPrice || !poolCanonicalToken0 || !poolCanonicalToken1) {
            return "";
        }
        try {
            let priceFromTick = tickToPrice(poolCanonicalToken0, poolCanonicalToken1, parseInt(tick));
            if (!baseTokenForPrice.equals(poolCanonicalToken0)) {
                priceFromTick = priceFromTick.invert();
            }
            return priceFromTick.toSignificant(Math.min(quoteTokenForPrice.decimals + 2, 8)); 
        } catch (error) {
            console.error("Error converting tick to UI price string:", error);
            return "";
        }
    }, []);

    useEffect(() => {
        if ((lastEditedFieldRef.current === 'priceMin' || lastEditedFieldRef.current === 'priceMax') &&
            priceMinDisplay && priceMaxDisplay && currentToken0 && currentToken1 && poolData?.token0 && poolData?.token1) {

            const sdkCurrentToken0 = new Token(CHAIN_ID, currentToken0.address, currentToken0.decimals);
            const sdkCurrentToken1 = new Token(CHAIN_ID, currentToken1.address, currentToken1.decimals);
            const sdkPoolToken0 = new Token(CHAIN_ID, poolData.token0.address, poolData.token0.decimals);
            const sdkPoolToken1 = new Token(CHAIN_ID, poolData.token1.address, poolData.token1.decimals);

            const tickForMinDisplay = uiPriceToAlignedTick(priceMinDisplay, sdkCurrentToken0, sdkCurrentToken1, sdkPoolToken0, sdkPoolToken1, selectedFeeTier, false);
            const tickForMaxDisplay = uiPriceToAlignedTick(priceMaxDisplay, sdkCurrentToken0, sdkCurrentToken1, sdkPoolToken0, sdkPoolToken1, selectedFeeTier, true);

            if (tickForMinDisplay !== null && tickForMaxDisplay !== null) {
                const newTickLower = Math.min(tickForMinDisplay, tickForMaxDisplay);
                const newTickUpper = Math.max(tickForMinDisplay, tickForMaxDisplay);
                
                if (newTickLower.toString() !== tickLower) setTickLower(newTickLower.toString());
                if (newTickUpper.toString() !== tickUpper) setTickUpper(newTickUpper.toString());
            }
        }
    }, [priceMinDisplay, priceMaxDisplay, currentToken0, currentToken1, poolData, selectedFeeTier, uiPriceToAlignedTick, tickLower, tickUpper]);


    useEffect(() => {
        if (tickLower && tickUpper && currentToken0 && currentToken1 && poolData?.token0 && poolData?.token1 &&
            (lastEditedFieldRef.current !== 'priceMin' && lastEditedFieldRef.current !== 'priceMax')) {
            
            const sdkCurrentToken0 = new Token(CHAIN_ID, currentToken0.address, currentToken0.decimals);
            const sdkCurrentToken1 = new Token(CHAIN_ID, currentToken1.address, currentToken1.decimals);
            const sdkPoolToken0 = new Token(CHAIN_ID, poolData.token0.address, poolData.token0.decimals);
            const sdkPoolToken1 = new Token(CHAIN_ID, poolData.token1.address, poolData.token1.decimals);

            const priceStrForTickLower = tickToUiPriceString(tickLower, sdkCurrentToken0, sdkCurrentToken1, sdkPoolToken0, sdkPoolToken1);
            const priceStrForTickUpper = tickToUiPriceString(tickUpper, sdkCurrentToken0, sdkCurrentToken1, sdkPoolToken0, sdkPoolToken1);

            const numPriceForTickLower = parseFloat(priceStrForTickLower);
            const numPriceForTickUpper = parseFloat(priceStrForTickUpper);
            
            if (!isNaN(numPriceForTickLower) && !isNaN(numPriceForTickUpper)) {
                const displayMin = Math.min(numPriceForTickLower, numPriceForTickUpper);
                const displayMax = Math.max(numPriceForTickLower, numPriceForTickUpper);
                const precision = Math.min(sdkCurrentToken1.decimals + 2, 8);

                if (displayMin.toFixed(precision) !== priceMinDisplay) {
                    setPriceMinDisplay(displayMin.toFixed(precision));
                }
                if (displayMax.toFixed(precision) !== priceMaxDisplay) {
                    setPriceMaxDisplay(displayMax.toFixed(precision));
                }
            }
        }
    }, [tickLower, tickUpper, currentToken0, currentToken1, poolData, tickToUiPriceString, priceMinDisplay, priceMaxDisplay]);


    useEffect(() => {
        const loadPoolData = async () => {
            if (!currentToken0 || !currentToken1) {
                 setPoolData(null); setIsLoadingPool(false); return;
            }
            const doTokensAndFeeMatchInitialData = initialPoolDataFromState && currentToken0 && currentToken1 &&
                ( (initialPoolDataFromState.token0.address.toLowerCase() === currentToken0.address.toLowerCase() &&
                   initialPoolDataFromState.token1.address.toLowerCase() === currentToken1.address.toLowerCase()) ||
                  (initialPoolDataFromState.token0.address.toLowerCase() === currentToken1.address.toLowerCase() &&
                   initialPoolDataFromState.token1.address.toLowerCase() === currentToken0.address.toLowerCase()) 
                ) &&
                initialPoolDataFromState.fee === selectedFeeTier;

            if (doTokensAndFeeMatchInitialData) {
                setPoolData(initialPoolDataFromState);
                if (initialPoolDataFromState.tickCurrent) {
                    const tickSpacing = getTickSpacing(selectedFeeTier);
                    const rangeDeltaTicks = tickSpacing * 20; 
                    const initialTickLower = Math.floor((initialPoolDataFromState.tickCurrent - rangeDeltaTicks) / tickSpacing) * tickSpacing;
                    const initialTickUpper = Math.ceil((initialPoolDataFromState.tickCurrent + rangeDeltaTicks) / tickSpacing) * tickSpacing;
                    
                    lastEditedFieldRef.current = 'initialLoad'; 
                    setTickLower(initialTickLower.toString());
                    setTickUpper(initialTickUpper.toString());
                }
                setIsLoadingPool(false);
            } else if (currentToken0.address.toLowerCase() !== currentToken1.address.toLowerCase()) {
                setIsLoadingPool(true); setPoolData(null); 
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                    const queryParams = new URLSearchParams({
                        tokenA_address: currentToken0.address, tokenA_decimals: currentToken0.decimals.toString(), tokenA_symbol: currentToken0.symbol,
                        tokenB_address: currentToken1.address, tokenB_decimals: currentToken1.decimals.toString(), tokenB_symbol: currentToken1.symbol,
                        feeTier: selectedFeeTier.toString(),
                    });
                    const response = await fetch(`${backendUrl}/api/pool-data?${queryParams.toString()}`);
                    if (response.ok) {
                        const data = await response.json();
                        setPoolData(data); 
                        if (data.tickCurrent) {
                            const tickSpacing = getTickSpacing(selectedFeeTier);
                            const rangeDeltaTicks = tickSpacing * 20; 
                            const initialTickLower = Math.floor((data.tickCurrent - rangeDeltaTicks) / tickSpacing) * tickSpacing;
                            const initialTickUpper = Math.ceil((data.tickCurrent + rangeDeltaTicks) / tickSpacing) * tickSpacing;
                            
                            lastEditedFieldRef.current = 'initialLoad';
                            setTickLower(initialTickLower.toString());
                            setTickUpper(initialTickUpper.toString());
                        }
                    } else { setPoolData(null); }
                // eslint-disable-next-line no-unused-vars
                } catch (error) { setPoolData(null); } 
                finally { setIsLoadingPool(false); }
            } else { setPoolData(null); setIsLoadingPool(false); }
        };
        loadPoolData();
    }, [initialPoolDataFromState, token0Index, token1Index, selectedFeeTier, currentToken0, currentToken1, getTickSpacing]);

    useEffect(() => {
        if (!poolData || !currentToken0 || !currentToken1 || !poolData.token0 || !poolData.token1 || isNaN(parseInt(tickLower)) || isNaN(parseInt(tickUpper)) || parseInt(tickLower) >= parseInt(tickUpper)) {
            if (lastEditedFieldRef.current === 'amount0' && !amount0Input) setAmount1Input('');
            if (lastEditedFieldRef.current === 'amount1' && !amount1Input) setAmount0Input('');
            return;
        }

        const sdkCurrentToken0 = new Token(CHAIN_ID, currentToken0.address, currentToken0.decimals, currentToken0.symbol);
        const sdkCurrentToken1 = new Token(CHAIN_ID, currentToken1.address, currentToken1.decimals, currentToken1.symbol);
        const poolToken0FromData = new Token(CHAIN_ID, poolData.token0.address, poolData.token0.decimals, poolData.token0.symbol);
        const poolToken1FromData = new Token(CHAIN_ID, poolData.token1.address, poolData.token1.decimals, poolData.token1.symbol);
        
        const sdkPool = new Pool(
            poolToken0FromData, poolToken1FromData, selectedFeeTier,
            poolData.sqrtPriceX96, poolData.liquidity, Number(poolData.tickCurrent)
        );

        const parsedAmount0Input = parseFloat(amount0Input);
        const parsedAmount1Input = parseFloat(amount1Input);

        if (lastEditedFieldRef.current === 'amount0' && amount0Input && parsedAmount0Input > 0) {
            try {
                const amountCurrentToken0 = ethers.parseUnits(amount0Input, sdkCurrentToken0.decimals);
                let positionToSimulate;
                if (sdkCurrentToken0.equals(sdkPool.token0)) {
                    positionToSimulate = Position.fromAmount0({ pool: sdkPool, tickLower: parseInt(tickLower), tickUpper: parseInt(tickUpper), amount0: amountCurrentToken0.toString(), useFullPrecision: true });
                    setAmount1Input(positionToSimulate.amount1.toSignificant(6));
                } else { 
                    positionToSimulate = Position.fromAmount1({ pool: sdkPool, tickLower: parseInt(tickLower), tickUpper: parseInt(tickUpper), amount1: amountCurrentToken0.toString(), useFullPrecision: true });
                    setAmount1Input(positionToSimulate.amount0.toSignificant(6));
                }
            // eslint-disable-next-line no-unused-vars
            } catch (e) { setAmount1Input(''); }
        } else if (lastEditedFieldRef.current === 'amount1' && amount1Input && parsedAmount1Input > 0) {
            try {
                const amountCurrentToken1 = ethers.parseUnits(amount1Input, sdkCurrentToken1.decimals);
                let positionToSimulate;
                if (sdkCurrentToken1.equals(sdkPool.token1)) {
                    positionToSimulate = Position.fromAmount1({ pool: sdkPool, tickLower: parseInt(tickLower), tickUpper: parseInt(tickUpper), amount1: amountCurrentToken1.toString(), useFullPrecision: true });
                    setAmount0Input(positionToSimulate.amount0.toSignificant(6));
                } else { 
                     positionToSimulate = Position.fromAmount0({ pool: sdkPool, tickLower: parseInt(tickLower), tickUpper: parseInt(tickUpper), amount0: amountCurrentToken1.toString(), useFullPrecision: true });
                    setAmount0Input(positionToSimulate.amount1.toSignificant(6));
                }
            // eslint-disable-next-line no-unused-vars
            } catch (e) { setAmount0Input(''); }
        } else if (lastEditedFieldRef.current === 'amount0' && !amount0Input) {
             setAmount1Input('');
        } else if (lastEditedFieldRef.current === 'amount1' && !amount1Input) {
             setAmount0Input('');
        }
    }, [amount0Input, amount1Input, currentToken0, currentToken1, selectedFeeTier, tickLower, tickUpper, poolData]);


    const handleTokenSelect = (type, tokenKey) => {
        const newlySelectedTokenIndex = tokenKeys.indexOf(tokenKey);
        if (type === 'token0') {
            if (newlySelectedTokenIndex === token1Index && tokenKeys.length > 1) setToken1Index(token0Index); 
            setToken0Index(newlySelectedTokenIndex);
            setShowDropdown0(false);
        } else { 
            if (newlySelectedTokenIndex === token0Index && tokenKeys.length > 1) setToken0Index(token1Index); 
            setToken1Index(newlySelectedTokenIndex);
            setShowDropdown1(false);
        }
        setAmount0Input(''); setAmount1Input(''); 
        setPriceMinDisplay(''); setPriceMaxDisplay(''); 
        setTickLower(''); setTickUpper(''); 
        lastEditedFieldRef.current = null;
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdown0Ref.current && !dropdown0Ref.current.contains(event.target) && !event.target.closest('.token-select-btn-0')) setShowDropdown0(false); 
            if (dropdown1Ref.current && !dropdown1Ref.current.contains(event.target) && !event.target.closest('.token-select-btn-1')) setShowDropdown1(false); 
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMintPosition = async () => {
        if (!isWalletConnected || !signer || !userAddress || !currentToken0 || !currentToken1 || !poolData ||
            !amount0Input || !amount1Input || parseFloat(amount0Input) <= 0 || parseFloat(amount1Input) <=0 ||
            !tickLower || !tickUpper || isNaN(parseInt(tickLower)) || isNaN(parseInt(tickUpper))) {
            setProcessStatus("Please fill all fields correctly (including both token amounts > 0 and a valid price range/ticks) and connect your wallet.");
            return;
        }
        if (parseInt(tickLower) >= parseInt(tickUpper)) {
             setProcessStatus("Min Price (Tick Lower) must be less than Max Price (Tick Upper).");
             return;
        }
        setIsProcessing(true); setProcessStatus("Preparing to mint new position..."); setTxHash('');
        try {
            const nftManagerAddress = import.meta.env.VITE_UNISWAP_V3_NFT_POSITION_MANAGER_ADDRESS;
            if (!nftManagerAddress) throw new Error("NFT Position Manager address is not configured.");

            let contractParamToken0 = currentToken0;
            let contractParamToken1 = currentToken1;
            let contractParamAmount0Desired = ethers.parseUnits(amount0Input, currentToken0.decimals);
            let contractParamAmount1Desired = ethers.parseUnits(amount1Input, currentToken1.decimals);

            if (currentToken0.address.toLowerCase() > currentToken1.address.toLowerCase()) {
                contractParamToken0 = currentToken1; contractParamToken1 = currentToken0;
                contractParamAmount0Desired = ethers.parseUnits(amount1Input, currentToken1.decimals);
                contractParamAmount1Desired = ethers.parseUnits(amount0Input, currentToken0.decimals);
            }
            
            if (contractParamAmount0Desired > 0n) { 
                setProcessStatus(`Checking allowance for ${contractParamToken0.symbol}...`);
                const tokenContract0 = new ethers.Contract(contractParamToken0.address, ERC20_ABI, signer);
                const allowance0 = await tokenContract0.allowance(userAddress, nftManagerAddress);
                if (allowance0 < contractParamAmount0Desired) {
                    setProcessStatus(`Approving ${contractParamToken0.symbol}...`);
                    const approveTx0 = await tokenContract0.approve(nftManagerAddress, contractParamAmount0Desired);
                    await approveTx0.wait(1); setProcessStatus(`${contractParamToken0.symbol} approved!`);
                } else { setProcessStatus(`Allowance for ${contractParamToken0.symbol} is sufficient.`); }
            }
            if (contractParamAmount1Desired > 0n) { 
                setProcessStatus(`Checking allowance for ${contractParamToken1.symbol}...`);
                const tokenContract1 = new ethers.Contract(contractParamToken1.address, ERC20_ABI, signer);
                const allowance1 = await tokenContract1.allowance(userAddress, nftManagerAddress);
                if (allowance1 < contractParamAmount1Desired) {
                    setProcessStatus(`Approving ${contractParamToken1.symbol}...`);
                    const approveTx1 = await tokenContract1.approve(nftManagerAddress, contractParamAmount1Desired);
                    await approveTx1.wait(1); setProcessStatus(`${contractParamToken1.symbol} approved!`);
                } else { setProcessStatus(`Allowance for ${contractParamToken1.symbol} is sufficient.`); }
            }

            const positionManagerContract = new ethers.Contract(nftManagerAddress, INonfungiblePositionManagerABI_MinimalMint, signer);
            const deadline = Math.floor(Date.now() / 1000) + (transactionDeadlineMinutes * 60); 
            const slippageBips = Math.floor(selectedSlippage * 100);
            const amount0Min = contractParamAmount0Desired - (contractParamAmount0Desired * BigInt(slippageBips)) / 10000n;
            const amount1Min = contractParamAmount1Desired - (contractParamAmount1Desired * BigInt(slippageBips)) / 10000n;

            const mintParams = {
                token0: contractParamToken0.address, token1: contractParamToken1.address,
                fee: selectedFeeTier,
                tickLower: parseInt(tickLower), tickUpper: parseInt(tickUpper),
                amount0Desired: contractParamAmount0Desired.toString(), amount1Desired: contractParamAmount1Desired.toString(),
                amount0Min: amount0Min.toString(), amount1Min: amount1Min.toString(), 
                recipient: userAddress, deadline: deadline
            };
            setProcessStatus("Sending mint transaction...");
            const mintTx = await positionManagerContract.mint(mintParams);
            setTxHash(mintTx.hash);
            setProcessStatus(`Mint transaction sent: ${mintTx.hash.substring(0,10)}... Waiting...`);
            const receipt = await mintTx.wait(1);
            if (receipt.status === 1) {
                let mintedTokenId = null;
                const eventInterface = new ethers.Interface(INonfungiblePositionManagerABI_MinimalMint); 
                for (const log of receipt.logs) {
                    try {
                        if (log.address.toLowerCase() === nftManagerAddress.toLowerCase()) {
                            const parsedLog = eventInterface.parseLog(log);
                            if (parsedLog && parsedLog.name === "IncreaseLiquidity") { 
                                mintedTokenId = parsedLog.args.tokenId.toString(); break;
                            }
                        }
                    // eslint-disable-next-line no-unused-vars
                    } catch (e) { /* ignore */ }
                }

                if (mintedTokenId) {
                    try {
                        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                        const response = await fetch(`${backendUrl}/api/positions/track-manual-mint`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                tokenId: mintedTokenId,
                                userAddress: userAddress,
                                token0Address: contractParamToken0.address,
                                token1Address: contractParamToken1.address,
                                initialAmount0Wei: contractParamAmount0Desired.toString(),
                                initialAmount1Wei: contractParamAmount1Desired.toString(),
                                fee: selectedFeeTier,
                                tickLower: parseInt(tickLower),
                                tickUpper: parseInt(tickUpper)
                            })
                        });
                        if (!response.ok) {
                            const errorData = await response.json();
                            console.error("Backend error tracking position:", errorData);
                            setProcessStatus(`Position created, but tracking failed: ${errorData.error || 'Unknown error'}`);
                        } else {
                            setProcessStatus(`New position successfully minted! ${mintedTokenId ? `Token ID: ${mintedTokenId}`: ''} Tx: ${mintTx.hash.substring(0,10)}...`);
                        }
                    } catch (backendError) {
                        console.error("Error updating backend after mint:", backendError);
                        setProcessStatus(`Position created, but tracking failed: ${backendError.message}`);
                    }
                } else {
                    setProcessStatus(`New position successfully minted! Tx: ${mintTx.hash.substring(0,10)}... (TokenId not found in logs)`);
                }
                setAmount0Input(''); 
                setAmount1Input(''); 
                lastEditedFieldRef.current = null;
            } else { throw new Error("Mint transaction failed (reverted)."); }
        } catch (error) {
            console.error("Error minting position:", error);
            let errMsg = error.reason || error.message || "Unknown error.";
            if (error.data && typeof error.data.message === 'string') errMsg = error.data.message;
            else if (error.error && typeof error.error.message === 'string') errMsg = error.error.message;
            setProcessStatus(`Error minting position: ${errMsg}`);
        }
        finally { setIsProcessing(false); }
    };

    if (!isWalletConnected) return <div className="add-liquidity-page"><p>Please connect your wallet to add liquidity.</p></div>;
    if (!currentToken0 || !currentToken1) return <div className="add-liquidity-page"><p>Loading token data...</p></div>;

    return (
        <div className="add-liquidity-page">
            <h2>Create New Liquidity Position</h2>
            <div className="form-section">
                <div className="input-group">
                    <label>Token 1:</label>
                    <div className="token-selector-wrapper" ref={dropdown0Ref}>
                        <button onClick={() => setShowDropdown0(!showDropdown0)} className="token-select-btn token-select-btn-0">
                            {currentToken0.logoURI && <img src={currentToken0.logoURI} alt={currentToken0.symbol} className="token-logo"/>}
                            {currentToken0.symbol} ▼
                        </button>
                        {showDropdown0 && <TokenSelectorDropdown tokens={PREDEFINED_TOKENS} tokenKeys={tokenKeys} onSelectToken={(key) => handleTokenSelect('token0', key)} otherSelectedKey={token1Index !== -1 ? tokenKeys[token1Index] : undefined}/>}
                    </div>
                </div>
                <div className="input-group">
                    <label>Token 2:</label>
                    <div className="token-selector-wrapper" ref={dropdown1Ref}>
                         <button onClick={() => setShowDropdown1(!showDropdown1)} className="token-select-btn token-select-btn-1">
                            {currentToken1.logoURI && <img src={currentToken1.logoURI} alt={currentToken1.symbol} className="token-logo"/>}
                            {currentToken1.symbol} ▼
                        </button>
                        {showDropdown1 && <TokenSelectorDropdown tokens={PREDEFINED_TOKENS} tokenKeys={tokenKeys} onSelectToken={(key) => handleTokenSelect('token1', key)} otherSelectedKey={token0Index !== -1 ? tokenKeys[token0Index] : undefined}/>}
                    </div>
                </div>
                <div className="input-group">
                    <label>Fee Tier:</label>
                    <div className="fee-tier-options-add">
                        {[FeeAmount.LOWEST, FeeAmount.LOW, FeeAmount.MEDIUM, FeeAmount.HIGH].map(fee => (
                            <button key={fee} className={selectedFeeTier === fee ? 'active' : ''} onClick={() => setSelectedFeeTier(fee)}>
                                {fee/10000}%
                            </button>
                        ))}
                    </div>
                </div>

                {isLoadingPool && <p>Loading pool data...</p>}
                {poolData && currentToken0 && currentToken1 && (
                    (() => {
                        let displayPriceStr = "N/A";
                        if (poolData.token0 && poolData.token1) {
                            let priceAsNumber;
                            const quoteTokenSymbol = currentToken1.symbol;
                            const quoteTokenDecimals = currentToken1.decimals;
                            const priceSignificantDigits = Math.max(2, Math.min(quoteTokenDecimals + 2, 8));

                            if (currentToken0.address.toLowerCase() === poolData.token0.address.toLowerCase()) {
                                priceAsNumber = parseFloat(poolData.token0Price);
                            } else if (currentToken0.address.toLowerCase() === poolData.token1.address.toLowerCase()) {
                                priceAsNumber = parseFloat(poolData.token1Price);
                            }
                            
                            if (typeof priceAsNumber === 'number' && !isNaN(priceAsNumber)) {
                                displayPriceStr = `${priceAsNumber.toFixed(priceSignificantDigits)} ${quoteTokenSymbol}`;
                            }
                        }
                        return <p>Current Pool Price (1 {currentToken0.symbol}): {displayPriceStr} (Tick: {poolData.tickCurrent || 'N/A'})</p>;
                    })()
                )}

                <div className="input-group">
                    <label htmlFor="priceMinDisplay">Min Price ({currentToken1?.symbol} per 1 {currentToken0?.symbol}):</label>
                    <input 
                        type="text" inputMode="decimal" id="priceMinDisplay" 
                        value={priceMinDisplay} 
                        onChange={(e) => {
                            setPriceMinDisplay(e.target.value);
                            lastEditedFieldRef.current = 'priceMin';
                        }} 
                        placeholder="0.0" disabled={isProcessing} className="range-input"
                    />
                     {tickLower && <small>Derived Tick: {tickLower}</small>}
                </div>
                <div className="input-group">
                    <label htmlFor="priceMaxDisplay">Max Price ({currentToken1?.symbol} per 1 {currentToken0?.symbol}):</label>
                    <input 
                        type="text" inputMode="decimal" id="priceMaxDisplay" 
                        value={priceMaxDisplay} 
                        onChange={(e) => {
                            setPriceMaxDisplay(e.target.value);
                            lastEditedFieldRef.current = 'priceMax';
                        }} 
                        placeholder="0.0" disabled={isProcessing} className="range-input"
                    />
                    {tickUpper && <small>Derived Tick: {tickUpper}</small>}
                </div>

                <div className="input-group">
                    <label htmlFor="amount0Input">{currentToken0?.symbol} Amount:</label>
                    <input 
                        type="text" inputMode="decimal" id="amount0Input" value={amount0Input} 
                        onChange={(e) => { 
                            setAmount0Input(e.target.value); 
                            lastEditedFieldRef.current = 'amount0';
                        }} 
                        placeholder="0.0" disabled={isProcessing} 
                    />
                </div>
                 <div className="input-group">
                    <label htmlFor="amount1Input">{currentToken1?.symbol} Amount (approx.):</label>
                    <input 
                        type="text" inputMode="decimal" id="amount1Input" value={amount1Input} 
                        onChange={(e) => { 
                            setAmount1Input(e.target.value); 
                            lastEditedFieldRef.current = 'amount1';
                        }} 
                        placeholder="0.0" 
                        disabled={isProcessing} 
                    />
                </div>

                <div className="settings-section">
                    <label>Slippage Tolerance:</label>
                    <div className="slippage-options">
                        {[0.1, 0.5, 1.0].map(val => (<button key={val} onClick={() => setSelectedSlippage(val)} className={selectedSlippage === val ? 'active' : ''}>{val}%</button>))}
                        <div className="slippage-input-group">
                            <input type="number" value={selectedSlippage} onChange={(e) => setSelectedSlippage(parseFloat(e.target.value))} className="slippage-input" step="0.1" min="0.01"/>
                            <span>%</span>
                        </div>
                    </div>
                </div>
                 <div className="settings-section">
                    <label>Transaction Deadline:</label>
                    <div className="deadline-input-group">
                        <input type="number" value={transactionDeadlineMinutes} onChange={(e) => setTransactionDeadlineMinutes(parseInt(e.target.value))} className="deadline-input" min="1"/>
                        <span>minutes</span>
                    </div>
                </div>

                <button 
                    onClick={handleMintPosition} 
                    className="action-btn-mint" 
                    disabled={isProcessing || !isWalletConnected || !poolData || isLoadingPool || !tickLower || !tickUpper || parseFloat(amount0Input) <= 0 || parseFloat(amount1Input) <= 0}
                >
                    {isProcessing ? 'Processing...' : 'Create Position'}
                </button>
                {processStatus && <p className="process-status-message">{processStatus}</p>}
                {txHash && <p className="tx-hash-message">Tx: <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash.substring(0,10)}...</a></p>}
            </div>
        </div>
    );
}

export default AddLiquidityPage;