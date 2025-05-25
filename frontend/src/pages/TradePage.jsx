import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import TokenSelectorDropdown from '../components/TokenSelectorDropdown';
import './TradePage.css';

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
];

const SWAP_ROUTER_ABI_MINIMAL = [{"inputs":[{"internalType":"address","name":"_factoryV2","type":"address"},{"internalType":"address","name":"factoryV3","type":"address"},{"internalType":"address","name":"_positionManager","type":"address"},{"internalType":"address","name":"_WETH9","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"WETH9","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveMax","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveMaxMinusOne","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveZeroThenMax","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"approveZeroThenMaxMinusOne","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes","name":"data","type":"bytes"}],"name":"callPositionManager","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"paths","type":"bytes[]"},{"internalType":"uint128[]","name":"amounts","type":"uint128[]"},{"internalType":"uint24","name":"maximumTickDivergence","type":"uint24"},{"internalType":"uint32","name":"secondsAgo","type":"uint32"}],"name":"checkOracleSlippage","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"uint24","name":"maximumTickDivergence","type":"uint24"},{"internalType":"uint32","name":"secondsAgo","type":"uint32"}],"name":"checkOracleSlippage","outputs":[],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"}],"internalType":"struct IV3SwapRouter.ExactInputParams","name":"params","type":"tuple"}],"name":"exactInput","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IV3SwapRouter.ExactInputSingleParams","name":"params","type":"tuple"}],"name":"exactInputSingle","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"bytes","name":"path","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"}],"internalType":"struct IV3SwapRouter.ExactOutputParams","name":"params","type":"tuple"}],"name":"exactOutput","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMaximum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct IV3SwapRouter.ExactOutputSingleParams","name":"params","type":"tuple"}],"name":"exactOutputSingle","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"factoryV2","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getApprovalType","outputs":[{"internalType":"enum IApproveAndCall.ApprovalType","name":"","type":"uint8"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"}],"internalType":"struct IApproveAndCall.IncreaseLiquidityParams","name":"params","type":"tuple"}],"name":"increaseLiquidity","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"components":[{"internalType":"address","name":"token0","type":"address"},{"internalType":"address","name":"token1","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"int24","name":"tickLower","type":"int24"},{"internalType":"int24","name":"tickUpper","type":"int24"},{"internalType":"uint256","name":"amount0Min","type":"uint256"},{"internalType":"uint256","name":"amount1Min","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"internalType":"struct IApproveAndCall.MintParams","name":"params","type":"tuple"}],"name":"mint","outputs":[{"internalType":"bytes","name":"result","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"previousBlockhash","type":"bytes32"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"bytes[]","name":"data","type":"bytes[]"}],"name":"multicall","outputs":[{"internalType":"bytes[]","name":"results","type":"bytes[]"}],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"positionManager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"pull","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[],"name":"refundETH","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermit","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowed","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"uint256","name":"expiry","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitAllowedIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"selfPermitIfNecessary","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMin","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"}],"name":"swapExactTokensForTokens","outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"},{"internalType":"uint256","name":"amountInMax","type":"uint256"},{"internalType":"address[]","name":"path","type":"address[]"},{"internalType":"address","name":"to","type":"address"}],"name":"swapTokensForExactTokens","outputs":[{"internalType":"uint256","name":"amountIn","type":"uint256"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"}],"name":"sweepToken","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"sweepTokenWithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"sweepTokenWithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"int256","name":"amount0Delta","type":"int256"},{"internalType":"int256","name":"amount1Delta","type":"int256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"uniswapV3SwapCallback","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"}],"name":"unwrapWETH9","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"unwrapWETH9WithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amountMinimum","type":"uint256"},{"internalType":"uint256","name":"feeBips","type":"uint256"},{"internalType":"address","name":"feeRecipient","type":"address"}],"name":"unwrapWETH9WithFee","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"name":"wrapETH","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}];

const PREDEFINED_TOKENS = {
    WETH: { address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14', symbol: 'WETH', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png?1696501628' },
    USDC: { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', symbol: 'USDC', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png?1696506694' },
    OKB: { address: '0x3F4B6664338F23d2397c953f2AB4Ce8031663f80', symbol: 'OKB', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/4463/small/okb_token.png?1696504795' },
    R2USD: { address: '0x20c54C5F742F123Abb49a982BFe0af47edb38756', symbol: 'R2USD', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661' },
    WBTC: { address: '0x340a5B718557801f20AfD6E244C78Fcd1c0B2212', symbol: 'WBTC', decimals: 8, logoURI: 'https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png?1696507857' },
    SR2USD: { address: '0xBD6b25c4132F09369C354beE0f7be777D7d434fa', symbol: 'SR2USD', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png?1696501661' },
    LINK: { address: '0x779877A7B0D9E8603169DdbD7836e478b4624789', symbol: 'LINK', decimals: 18, logoURI: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png?1696502009' }
};
const tokenKeys = Object.keys(PREDEFINED_TOKENS);
const findTokenIndexByAddress = (address) => tokenKeys.findIndex(key => PREDEFINED_TOKENS[key].address.toLowerCase() === address?.toLowerCase());

const initialFromTokenSymbol = 'WETH';
const initialToTokenSymbol = 'USDC';
let initialFromIndex = findTokenIndexByAddress(PREDEFINED_TOKENS[initialFromTokenSymbol]?.address);
if (initialFromIndex === -1 && tokenKeys.length > 0) initialFromIndex = 0;
let initialToIndex = findTokenIndexByAddress(PREDEFINED_TOKENS[initialToTokenSymbol]?.address);
if (initialToIndex === -1 && tokenKeys.length > 0) {
    initialToIndex = (initialFromIndex + 1) % tokenKeys.length;
}
if (tokenKeys.length > 1 && initialFromIndex === initialToIndex) {
    initialToIndex = (initialFromIndex + 1) % tokenKeys.length;
}

function TradePage({ isWalletConnected, provider, signer }) {
    const location = useLocation();
    const navigate = useNavigate();
    const initialSwapParams = location.state;

    const [tokenFromIndex, setTokenFromIndex] = useState(() => {
        const idx = findTokenIndexByAddress(initialSwapParams?.tokenFrom?.address);
        return idx !== -1 ? idx : initialFromIndex;
    });
    const [tokenToIndex, setTokenToIndex] = useState(() => {
        let idx = findTokenIndexByAddress(initialSwapParams?.tokenTo?.address);
        const currentFromIdx = findTokenIndexByAddress(initialSwapParams?.tokenFrom?.address);
        const defaultFromIdx = currentFromIdx !== -1 ? currentFromIdx : initialFromIndex;

        if (idx === -1) {
            idx = (defaultFromIdx + 1) % tokenKeys.length;
        }
        if (tokenKeys.length > 1 && idx === defaultFromIdx) {
            idx = (idx + 1) % tokenKeys.length;
        }
        return idx !== -1 ? idx : initialToIndex;
    });

    const [amountFrom, setAmountFrom] = useState(initialSwapParams?.amountFrom || '');
    const [amountTo, setAmountTo] = useState(initialSwapParams?.amountTo || '');
    const [loadingQuote, setLoadingQuote] = useState(false);
    const [showDropdownFrom, setShowDropdownFrom] = useState(false);
    const [showDropdownTo, setShowDropdownTo] = useState(false);
    const dropdownFromRef = useRef(null);
    const dropdownToRef = useRef(null);
    const availableFeeTiers = [500, 3000, 10000];
    const [selectedFeeTier, setSelectedFeeTier] = useState(initialSwapParams?.feeTier || availableFeeTiers[1]);
    const [isSwapping, setIsSwapping] = useState(false);
    const [swapTxHash, setSwapTxHash] = useState('');
    const [swapStatusMessage, setSwapStatusMessage] = useState('');
    const [selectedSlippage, setSelectedSlippage] = useState(0.5);
    const [transactionDeadlineMinutes, setTransactionDeadlineMinutes] = useState(20);

    const getTokenByIndex = (index) => (index >= 0 && index < tokenKeys.length) ? PREDEFINED_TOKENS[tokenKeys[index]] : null;
    
    const currentTokenFrom = getTokenByIndex(tokenFromIndex);
    const currentTokenTo = getTokenByIndex(tokenToIndex);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownFromRef.current && !dropdownFromRef.current.contains(event.target) && !event.target.closest('.token-select-btn-from-trade')) { setShowDropdownFrom(false); }
            if (dropdownToRef.current && !dropdownToRef.current.contains(event.target) && !event.target.closest('.token-select-btn-to-trade')) { setShowDropdownTo(false); }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAmountFromChange = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value) || value === '') {
            setAmountFrom(value);
        }
    };
    
    const handleSwapDirection = () => {
        const oldTokenFromIndex = tokenFromIndex;
        setTokenFromIndex(tokenToIndex);
        setTokenToIndex(oldTokenFromIndex);
        setAmountFrom(amountTo);
        setAmountTo(amountFrom);
    };

    const getQuote = async (fromTokenObj, toTokenObj, currentAmountFromStr, fee) => {
        const currentAmountNum = parseFloat(currentAmountFromStr);
        if (currentAmountNum <= 0 || !fromTokenObj || !toTokenObj ) { setAmountTo(''); setLoadingQuote(false); return; }
        if (fromTokenObj.address === toTokenObj.address) { setAmountTo(currentAmountFromStr); setLoadingQuote(false); return; }
        setLoadingQuote(true); setAmountTo("Counting...");
        try {
            const amountInWei = ethers.parseUnits(currentAmountFromStr, fromTokenObj.decimals).toString();
            const queryParams = new URLSearchParams({
                tokenFromAddress: fromTokenObj.address, tokenFromDecimals: fromTokenObj.decimals.toString(), tokenFromSymbol: fromTokenObj.symbol,
                tokenToAddress: toTokenObj.address, tokenToDecimals: toTokenObj.decimals.toString(), tokenToSymbol: toTokenObj.symbol,
                amountFrom: amountInWei, feeTier: fee.toString(),
            });
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/quote?${queryParams.toString()}`);
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `Network error: ${response.status}`); }
            const data = await response.json();
            if (data.amountTo) {
                const formattedAmountTo = ethers.formatUnits(data.amountTo, toTokenObj.decimals);
                const displayAmountTo = parseFloat(formattedAmountTo).toFixed(Math.min(toTokenObj.decimals, 6));
                setAmountTo(displayAmountTo);
            } else { throw new Error("API response missing amountTo"); }
        } catch (error) { console.error("Error fetching quote in TradePage:", error); setAmountTo("Error");
        } finally { setLoadingQuote(false); }
    };
    
    useEffect(() => {
        const handler = setTimeout(() => {
            if (amountFrom && currentTokenFrom && currentTokenTo && selectedFeeTier) {
                getQuote(currentTokenFrom, currentTokenTo, amountFrom, selectedFeeTier);
            } else {
                setAmountTo(''); setLoadingQuote(false);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [amountFrom, tokenFromIndex, tokenToIndex, selectedFeeTier]);

    const handleTokenSelect = (type, tokenKey) => {
        const newlySelectedTokenIndex = tokenKeys.indexOf(tokenKey);
        if (type === 'from') {
            if (newlySelectedTokenIndex === tokenToIndex && tokenKeys.length > 1) { setTokenToIndex(tokenFromIndex); }
            setTokenFromIndex(newlySelectedTokenIndex); setShowDropdownFrom(false);
        } else {
            if (newlySelectedTokenIndex === tokenFromIndex && tokenKeys.length > 1) { setTokenFromIndex(tokenToIndex); }
            setTokenToIndex(newlySelectedTokenIndex); setShowDropdownTo(false);
        }
    };

    const handleFeeTierSelect = (fee) => setSelectedFeeTier(fee);

    const handleConfirmSwap = async () => {
        if (!isWalletConnected || !signer || !currentTokenFrom || !currentTokenTo || !amountFrom || !amountTo || amountTo === "Error" || isSwapping) {
            setSwapStatusMessage("Please connect wallet and ensure all swap parameters are correct.");
            return;
        }
        setIsSwapping(true); setSwapTxHash(''); setSwapStatusMessage('Initiating swap...');
        try {
            const userAddr = await signer.getAddress();
            const routerAddress = import.meta.env.VITE_UNISWAP_V3_SWAP_ROUTER_ADDRESS;
            if (!routerAddress) throw new Error("Swap Router address not configured (VITE_UNISWAP_V3_SWAP_ROUTER_ADDRESS).");
            const tokenFromContract = new ethers.Contract(currentTokenFrom.address, ERC20_ABI, signer);
            const amountInWei = ethers.parseUnits(amountFrom, currentTokenFrom.decimals);
            setSwapStatusMessage(`Checking allowance for ${currentTokenFrom.symbol}...`);
            const currentAllowance = await tokenFromContract.allowance(userAddr, routerAddress);
            if (currentAllowance < amountInWei) {
                setSwapStatusMessage(`Approving ${currentTokenFrom.symbol}...`);
                const approveTx = await tokenFromContract.approve(routerAddress, amountInWei);
                setSwapStatusMessage(`Approval sent: ${approveTx.hash.substring(0,10)}... Waiting...`);
                await approveTx.wait(1);
                setSwapStatusMessage(`${currentTokenFrom.symbol} approved!`);
            } else {
                setSwapStatusMessage(`${currentTokenFrom.symbol} allowance sufficient.`);
            }
            setSwapStatusMessage('Preparing swap...');
            const swapRouterContract = new ethers.Contract(routerAddress, SWAP_ROUTER_ABI_MINIMAL, signer);
            if (isNaN(parseFloat(amountTo))) throw new Error("Estimated output amount is invalid.");
            const amountToWeiFromQuote = ethers.parseUnits(amountTo, currentTokenTo.decimals);
            const slippageToleranceBips = Math.floor(selectedSlippage * 100);
            const amountOutMinimum = amountToWeiFromQuote - (amountToWeiFromQuote * BigInt(slippageToleranceBips)) / 10000n;
            const deadline = Math.floor(Date.now() / 1000) + (transactionDeadlineMinutes * 60);
            const params = {
                tokenIn: currentTokenFrom.address, tokenOut: currentTokenTo.address,
                fee: selectedFeeTier, recipient: userAddr, deadline: deadline,
                amountIn: amountInWei, amountOutMinimum: amountOutMinimum, sqrtPriceLimitX96: 0,
            };
            setSwapStatusMessage('Sending swap tx...');
            const swapTx = await swapRouterContract.exactInputSingle(params);
            setSwapTxHash(swapTx.hash);
            setSwapStatusMessage(`Swap sent: ${swapTx.hash.substring(0,10)}... Waiting...`);
            const receipt = await swapTx.wait(1);
            if (receipt.status === 1) {
                setSwapStatusMessage(`Swap successful! Tx: ${swapTx.hash.substring(0,10)}...`);
            } else {
                throw new Error("Swap transaction failed (reverted).");
            }
        } catch (error) {
            console.error("Swap error in TradePage:", error);
            let errMsg = error.reason || error.message || "Unknown swap error.";
            if (error.data && typeof error.data.message === 'string') errMsg = error.data.message;
            else if (error.error && typeof error.error.message === 'string') errMsg = error.error.message;
            setSwapStatusMessage(`Swap failed: ${errMsg}`);
        } finally {
            setIsSwapping(false);
        }
    };
    
    let confirmButtonText = "Enter an amount";
    let confirmButtonDisabled = true;
    if (!isWalletConnected) { confirmButtonText = "Connect Wallet"; confirmButtonDisabled = true; }
    else if (!currentTokenFrom || !currentTokenTo || currentTokenFrom.address === currentTokenTo.address) { confirmButtonText = "Select different tokens"; confirmButtonDisabled = true; }
    else if (parseFloat(amountFrom) <= 0 || !amountFrom) { confirmButtonText = "Enter an amount"; confirmButtonDisabled = true; }
    else if (loadingQuote) { confirmButtonText = "Getting price..."; confirmButtonDisabled = true; }
    else if (!amountTo || amountTo === "Error") { confirmButtonText = "Price unavailable"; confirmButtonDisabled = true; }
    else if (isSwapping) { confirmButtonText = "Processing..."; confirmButtonDisabled = true; }
    else { confirmButtonText = "Confirm Swap"; confirmButtonDisabled = false; }

    if ((!initialSwapParams && (tokenFromIndex === -1 || tokenToIndex === -1)) || !currentTokenFrom || !currentTokenTo) {
        return (
            <div className="trade-page-container">
                <div className="trade-page-content">
                    <p className="no-params-message">Could not load swap parameters. Please start from the homepage.</p>
                    <button onClick={() => navigate('/')} className="confirm-swap-button">Go to Home</button>
                </div>
            </div>
        );
    }

    return (
        <div className="trade-page-container">
            <div className="trade-page-content">
                <h2>Swap</h2>

                <div className="swap-token-input-container">
                    <label htmlFor="trade-from-amount">From</label>
                    <div className="swap-token-input">
                        <div className="token-selector-wrapper" ref={dropdownFromRef}>
                            <button onClick={() => setShowDropdownFrom(!showDropdownFrom)} className="token-select-btn token-select-btn-from-trade">
                                {currentTokenFrom.logoURI && <img src={currentTokenFrom.logoURI} alt={currentTokenFrom.symbol} className="token-logo" />}
                                <span className="token-symbol-button">{currentTokenFrom.symbol}</span>
                                <span className="token-arrow-button">▼</span>
                            </button>
                            {showDropdownFrom && (
                                <TokenSelectorDropdown
                                    tokens={PREDEFINED_TOKENS} tokenKeys={tokenKeys}
                                    onSelectToken={(key) => handleTokenSelect('from', key)}
                                    otherSelectedKey={tokenKeys[tokenToIndex]}
                                />
                            )}
                        </div>
                        <input
                            type="text" inputMode="decimal" id="trade-from-amount" placeholder="0.00"
                            value={amountFrom} onChange={handleAmountFromChange} className="amount-input-field"
                        />
                    </div>
                </div>

                <div className="swap-arrow-container">
                    <button onClick={handleSwapDirection} className="swap-direction-btn" title="Swap tokens">↓</button>
                </div>

                <div className="swap-token-input-container">
                    <label htmlFor="trade-to-amount">To (estimated)</label>
                    <div className="swap-token-input">
                         <div className="token-selector-wrapper" ref={dropdownToRef}>
                            <button onClick={() => setShowDropdownTo(!showDropdownTo)} className="token-select-btn token-select-btn-to-trade">
                                {currentTokenTo.logoURI && <img src={currentTokenTo.logoURI} alt={currentTokenTo.symbol} className="token-logo" />}
                                <span className="token-symbol-button">{currentTokenTo.symbol}</span>
                                <span className="token-arrow-button">▼</span>
                            </button>
                            {showDropdownTo && (
                                <TokenSelectorDropdown
                                    tokens={PREDEFINED_TOKENS} tokenKeys={tokenKeys}
                                    onSelectToken={(key) => handleTokenSelect('to', key)}
                                    otherSelectedKey={tokenKeys[tokenFromIndex]}
                                />
                            )}
                        </div>
                        <input
                            type="text" inputMode="decimal" id="trade-to-amount" placeholder="0.00"
                            value={loadingQuote ? "Counting..." : amountTo} disabled className="amount-input-field"
                        />
                    </div>
                </div>

                <div className="settings-section fee-tier-selector">
                    <span className="trade-summary-label">Pool Fee Tier:</span>
                    <div className="fee-tier-options">
                        {availableFeeTiers.map(fee => (
                            <button
                                key={fee}
                                className={selectedFeeTier === fee ? 'active' : ''}
                                onClick={() => handleFeeTierSelect(fee)}
                            >
                                {fee / 10000}%
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-section slippage-settings">
                    <span className="trade-summary-label">Slippage Tolerance:</span>
                    <div className="slippage-options">
                        {[0.1, 0.5, 1.0].map(val => (
                            <button 
                                key={val}
                                onClick={() => setSelectedSlippage(val)}
                                className={selectedSlippage === val ? 'active' : ''}
                            >
                                {val}%
                            </button>
                        ))}
                        <div className="slippage-input-group">
                            <input 
                                type="number" 
                                value={selectedSlippage}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val >= 0.01 && val <= 50) {
                                        setSelectedSlippage(val);
                                    } else if (e.target.value === '') {
                                        setSelectedSlippage('');
                                    }
                                }}
                                className="slippage-input"
                                step="0.1" min="0.01"
                            />
                            <span>%</span>
                        </div>
                    </div>
                </div>

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
                                    setTransactionDeadlineMinutes('');
                                }
                            }}
                            className="deadline-input"
                            min="1"
                        />
                        <span>minutes</span>
                    </div>
                </div>
                
                {swapStatusMessage && <div className="trade-summary-item swap-status-message" style={{ color: swapTxHash && !swapStatusMessage.toLowerCase().includes('fail') ? 'green' : (swapStatusMessage.toLowerCase().includes('fail') || swapStatusMessage.toLowerCase().includes('error') ? 'red' : '#c3c0d0') }}>{swapStatusMessage}</div>}
                {swapTxHash && !swapStatusMessage.toLowerCase().includes('fail') && !swapStatusMessage.toLowerCase().includes('error') && (
                    <div className="trade-summary-item" style={{justifyContent: 'center'}}>
                        <a href={`https://sepolia.etherscan.io/tx/${swapTxHash}`} target="_blank" rel="noopener noreferrer" style={{color: '#85c9ff'}}>
                            View Transaction
                        </a>
                    </div>
                )}
                
                <button 
                    className="confirm-swap-button" 
                    onClick={handleConfirmSwap}
                    disabled={confirmButtonDisabled}
                >
                    {confirmButtonText}
                </button>
            </div>
        </div>
    );
}

export default TradePage;