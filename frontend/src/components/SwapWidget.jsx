import React, { useState, useEffect, useRef } from 'react'; 
import { ethers } from 'ethers';
import TokenSelectorDropdown from './TokenSelectorDropdown';  
import './SwapWidget.css';

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

const tokenKeys = Object.keys(PREDEFINED_TOKENS);

const initialFromTokenSymbol = 'WETH';
const initialToTokenSymbol = 'USDC';

let initialFromIndex = tokenKeys.indexOf(initialFromTokenSymbol);
if (initialFromIndex === -1 && tokenKeys.length > 0) initialFromIndex = 0;

let initialToIndex = tokenKeys.indexOf(initialToTokenSymbol);
if (initialToIndex === -1 && tokenKeys.length > 0) {
    initialToIndex = (initialFromIndex + 1) % tokenKeys.length;  
}
 
if (tokenKeys.length > 1 && initialFromIndex === initialToIndex) {
    initialToIndex = (initialFromIndex + 1) % tokenKeys.length;
}

function SwapWidget({ isWalletConnected, provider, signer }) {
    const [tokenFromIndex, setTokenFromIndex] = useState(initialFromIndex);
    const [tokenToIndex, setTokenToIndex] = useState(initialToIndex);
    const [amountFrom, setAmountFrom] = useState('');
    const [amountTo, setAmountTo] = useState('');
    const [loadingQuote, setLoadingQuote] = useState(false);
 

    const [showDropdownFrom, setShowDropdownFrom] = useState(false);
    const [showDropdownTo, setShowDropdownTo] = useState(false);

    const dropdownFromRef = useRef(null);  
    const dropdownToRef = useRef(null); 

    const getTokenByIndex = (index) => PREDEFINED_TOKENS[tokenKeys[index]];

    const currentTokenFrom = getTokenByIndex(tokenFromIndex);
    const currentTokenTo = getTokenByIndex(tokenToIndex);

    let buttonText = "Enter an amount";
    let buttonDisabled = true;
    let buttonAction = null;

    if (!isWalletConnected) {
        buttonText = "Connect Wallet to Swap";  
        buttonDisabled = true;  
    } else if (currentTokenFrom && currentTokenTo && currentTokenFrom.address === currentTokenTo.address) {
        buttonText = "Select different tokens";
        buttonDisabled = true;
    } else if (parseFloat(amountFrom) <= 0 || !amountFrom) {
        buttonText = "Enter an amount";
        buttonDisabled = true;
    } else if (loadingQuote) {
        buttonText = "Getting price...";
        buttonDisabled = true;
    } else if (!amountTo || amountTo === "Ошибка") {
        buttonText = "Price unavailable";
        buttonDisabled = true;
    } else {
        buttonText = "Swap";
        buttonDisabled = false;
         
    }

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownFromRef.current && !dropdownFromRef.current.contains(event.target) &&
                !event.target.closest('.token-select-btn-from')) {  
                setShowDropdownFrom(false);
            }
            if (dropdownToRef.current && !dropdownToRef.current.contains(event.target) &&
                !event.target.closest('.token-select-btn-to')) {  
                setShowDropdownTo(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleAmountFromChange = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value) || value === '') {
            setAmountFrom(value);
        }
    };

    const handleSwapDirection = () => {
        setTokenFromIndex(tokenToIndex);
        setTokenToIndex(tokenFromIndex);
        const newAmountFrom = amountTo;  
        const newAmountTo = amountFrom;    
        setAmountFrom(newAmountFrom);
        setAmountTo(newAmountTo); 
    };

    const getQuote = async (fromTokenObj, toTokenObj, currentAmountFromStr) => {
            const currentAmountNum = parseFloat(currentAmountFromStr);

            if (currentAmountNum <= 0 || !fromTokenObj || !toTokenObj) {
                setAmountTo('');
                setLoadingQuote(false);
                return;
            }
            if (fromTokenObj.address === toTokenObj.address) {
                setAmountTo(currentAmountFromStr);
                setLoadingQuote(false);
                return;
            }

            console.log(`Запрос котировки: ${currentAmountFromStr} ${fromTokenObj.symbol} на ${toTokenObj.symbol}`);
            setLoadingQuote(true);
            setAmountTo("Counting...");

            try {
                const amountInWei = ethers.parseUnits(currentAmountFromStr, fromTokenObj.decimals).toString();
                const feeTier = 500;  

                const queryParams = new URLSearchParams({
                    tokenFromAddress: fromTokenObj.address,
                    tokenToAddress: toTokenObj.address,
                    amountFrom: amountInWei,
                    feeTier: feeTier.toString(),
                });

                const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
                const response = await fetch(`${backendUrl}/api/quote?${queryParams.toString()}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Ошибка сети: ${response.status}`);
                }

                const data = await response.json();

                if (data.amountTo) {
                    const formattedAmountTo = ethers.formatUnits(data.amountTo, toTokenObj.decimals);
                    const displayAmountTo = parseFloat(formattedAmountTo).toFixed(Math.min(toTokenObj.decimals, 6));
                    setAmountTo(displayAmountTo);
                } else {
                    throw new Error("Ответ API не содержит amountTo");
                }

            } catch (error) {
                console.error("Ошибка при получении котировки:", error);
                setAmountTo("Ошибка");
            } finally {
                setLoadingQuote(false);
            }
        };
    

    useEffect(() => {
        const handler = setTimeout(() => {
            if (amountFrom && currentTokenFrom && currentTokenTo) {
                getQuote(currentTokenFrom, currentTokenTo, amountFrom);
            } else {
                setAmountTo('');
                setLoadingQuote(false);
            }
        }, 500);
        return () => clearTimeout(handler);
    }, [amountFrom, tokenFromIndex, tokenToIndex]);

    const handleTokenSelect = (type, tokenKey) => {
        const newlySelectedTokenIndex = tokenKeys.indexOf(tokenKey);

        if (type === 'from') {
            if (newlySelectedTokenIndex === tokenToIndex && tokenKeys.length > 1) {
 
                setTokenToIndex(tokenFromIndex);
            }
            setTokenFromIndex(newlySelectedTokenIndex);
            setShowDropdownFrom(false);
        } else {  
            if (newlySelectedTokenIndex === tokenFromIndex && tokenKeys.length > 1) {
                 
                setTokenFromIndex(tokenToIndex);
            }
            setTokenToIndex(newlySelectedTokenIndex);
            setShowDropdownTo(false);
        }
    };

    if (!currentTokenFrom || !currentTokenTo) {
        return <div className="swap-widget"><p>Ошибка: Токены для обмена не определены.</p></div>;
    }

    return (
    <div className="swap-widget">
        <div className="swap-token-input-container">
            <label htmlFor="from-amount">From</label>
            <div className="swap-token-input">
                <div className="token-selector-wrapper" ref={dropdownFromRef}>
                    <button
                        onClick={() => setShowDropdownFrom(!showDropdownFrom)} 
                        className="token-select-btn token-select-btn-from"
                    >
                        {currentTokenFrom.logoURI && <img src={currentTokenFrom.logoURI} alt={currentTokenFrom.symbol} className="token-logo" />}
                        <span className="token-symbol-button">{currentTokenFrom.symbol}</span>
                        <span className="token-arrow-button">▼</span>
                    </button>
                    {showDropdownFrom && (  
                        <TokenSelectorDropdown
                            tokens={PREDEFINED_TOKENS}
                            tokenKeys={tokenKeys}
                            onSelectToken={(tokenKey) => handleTokenSelect('from', tokenKey)}
                            currentSelectedKey={tokenKeys[tokenFromIndex]}
                            otherSelectedKey={tokenKeys[tokenToIndex]}
                        />
                    )}
                </div>
                <input
                    type="text" inputMode="decimal" id="from-amount" placeholder="0.00"
                    value={amountFrom} onChange={handleAmountFromChange} className="amount-input-field"
                />
            </div>
        </div>
 
        <div className="swap-arrow-container">
            <button onClick={handleSwapDirection} className="swap-direction-btn" title="Поменять токены местами">↓</button>
        </div>
 
        <div className="swap-token-input-container">
            <label htmlFor="to-amount">To (estimated)</label>
            <div className="swap-token-input">
                <div className="token-selector-wrapper" ref={dropdownToRef}>
                    <button
                        onClick={() => setShowDropdownTo(!showDropdownTo)} 
                        className="token-select-btn token-select-btn-to"
                    >
                       {currentTokenTo.logoURI && <img src={currentTokenTo.logoURI} alt={currentTokenTo.symbol} className="token-logo" />}
                       <span className="token-symbol-button">{currentTokenTo.symbol}</span>
                       <span className="token-arrow-button">▼</span>
                    </button>
                    {showDropdownTo && ( 
                        <TokenSelectorDropdown
                            tokens={PREDEFINED_TOKENS}
                            tokenKeys={tokenKeys}
                            onSelectToken={(tokenKey) => handleTokenSelect('to', tokenKey)}
                            currentSelectedKey={tokenKeys[tokenToIndex]}
                            otherSelectedKey={tokenKeys[tokenFromIndex]}
                        />
                    )}
                </div>
                <input
                    type="text" inputMode="decimal" id="to-amount" placeholder="0.00"
                    value={loadingQuote ? "Рассчитывается..." : amountTo} disabled className="amount-input-field"
                />
            </div>
        </div>
 
        <button 
                className="swap-action-btn" 
                disabled={buttonDisabled}
                onClick={buttonAction}  
            >
                {buttonText}
            </button>
    </div>
);
}
export default SwapWidget;