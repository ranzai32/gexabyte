// frontend/src/pages/TradePage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import TokenSelectorDropdown from '../components/TokenSelectorDropdown'; // Убедитесь, что путь правильный
import './TradePage.css'; // Стили для этой страницы, которые мы создавали
// Можно импортировать стили виджета, если они общие и вынесены
// import '../components/SwapWidget.css';


// Скопируйте PREDEFINED_TOKENS и tokenKeys из SwapWidget.jsx
// или импортируйте из общего файла (рекомендуется)
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


function TradePage({ isWalletConnected, provider, signer }) { // Получаем пропсы из App.jsx
    const location = useLocation();
    const navigate = useNavigate();
    const initialSwapParams = location.state;

    // Инициализация состояний на основе initialSwapParams
    const [tokenFromIndex, setTokenFromIndex] = useState(() => {
        const idx = findTokenIndexByAddress(initialSwapParams?.tokenFrom?.address);
        return idx !== -1 ? idx : (tokenKeys.length > 0 ? 0 : -1) ; // По умолчанию первый токен, если ничего не передано
    });
    const [tokenToIndex, setTokenToIndex] = useState(() => {
        let idx = findTokenIndexByAddress(initialSwapParams?.tokenTo?.address);
        if (idx === -1) { // Если токен To не передан или не найден
            idx = (tokenFromIndex + 1) % tokenKeys.length;
        }
        if (tokenKeys.length > 1 && idx === tokenFromIndex) { // Гарантируем, что не совпадают
            idx = (idx + 1) % tokenKeys.length;
        }
        return idx !== -1 ? idx : (tokenKeys.length > 1 ? 1 : 0);
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

    const getTokenByIndex = (index) => (index >= 0 && index < tokenKeys.length) ? PREDEFINED_TOKENS[tokenKeys[index]] : null;
    
    let currentTokenFrom = getTokenByIndex(tokenFromIndex);
    let currentTokenTo = getTokenByIndex(tokenToIndex);
    
    // Этот useEffect для обновления currentTokenFrom/To при изменении индексов
    useEffect(() => {
        currentTokenFrom = getTokenByIndex(tokenFromIndex);
        currentTokenTo = getTokenByIndex(tokenToIndex);
    }, [tokenFromIndex, tokenToIndex]);


    // useEffect для закрытия дропдаунов
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
        setAmountFrom(amountTo); // amountTo (старое) становится новым amountFrom
        // amountTo будет пересчитан useEffect'ом
    };

    const getQuote = async (fromTokenObj, toTokenObj, currentAmountFromStr, fee) => {
        // ... (Ваша существующая функция getQuote, делающая запрос к /api/quote)
        const currentAmountNum = parseFloat(currentAmountFromStr);
        if (currentAmountNum <= 0 || !fromTokenObj || !toTokenObj ) { setAmountTo(''); setLoadingQuote(false); return; }
        if (fromTokenObj.address === toTokenObj.address) { setAmountTo(currentAmountFromStr); setLoadingQuote(false); return; }
        console.log(`TradePage: Запрос котировки: ${currentAmountFromStr} ${fromTokenObj.symbol} на ${toTokenObj.symbol} с fee ${fee}`);
        setLoadingQuote(true); setAmountTo("Рассчитывается...");
        try {
            const amountInWei = ethers.parseUnits(currentAmountFromStr, fromTokenObj.decimals).toString();
            const queryParams = new URLSearchParams({
                tokenFromAddress: fromTokenObj.address, tokenFromDecimals: fromTokenObj.decimals.toString(), tokenFromSymbol: fromTokenObj.symbol,
                tokenToAddress: toTokenObj.address, tokenToDecimals: toTokenObj.decimals.toString(), tokenToSymbol: toTokenObj.symbol,
                amountFrom: amountInWei, feeTier: fee.toString(),
            });
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
            const response = await fetch(`${backendUrl}/api/quote?${queryParams.toString()}`);
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `Ошибка сети: ${response.status}`); }
            const data = await response.json();
            if (data.amountTo) {
                const formattedAmountTo = ethers.formatUnits(data.amountTo, toTokenObj.decimals);
                const displayAmountTo = parseFloat(formattedAmountTo).toFixed(Math.min(toTokenObj.decimals, 6));
                setAmountTo(displayAmountTo);
            } else { throw new Error("Ответ API не содержит amountTo"); }
        } catch (error) { console.error("Ошибка при получении котировки в TradePage:", error); setAmountTo("Ошибка");
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

    const handleFeeTierSelect = (fee) => {
        setSelectedFeeTier(fee);
        // getQuote вызовется автоматически благодаря useEffect
    };

    const handleConfirmSwap = async () => {
        if (!isWalletConnected || !signer || !currentTokenFrom || !currentTokenTo || !amountFrom || !amountTo || amountTo === "Ошибка") {
            alert("Пожалуйста, подключите кошелек и убедитесь, что все параметры обмена корректны.");
            return;
        }
        console.log("Подтверждение обмена со следующими параметрами:");
        console.log("From:", amountFrom, currentTokenFrom.symbol);
        console.log("To (estimated):", amountTo, currentTokenTo.symbol);
        console.log("Selected Fee Tier:", selectedFeeTier);
        // Здесь будет логика подготовки и отправки транзакции обмена
        alert("Функционал Confirm Swap в разработке!");
    };

    // Если параметры не пришли или токены не определились
    if ((!initialSwapParams && (tokenFromIndex === -1 || tokenToIndex === -1)) || !currentTokenFrom || !currentTokenTo) {
        return (
            <div className="trade-page-container">
                <div className="trade-page-content">
                    <p className="no-params-message">Не удалось загрузить параметры обмена. Пожалуйста, вернитесь на главную страницу.</p>
                    <button onClick={() => navigate('/')} className="confirm-swap-button">На главную</button>
                </div>
            </div>
        );
    }

    let confirmButtonText = "Enter an amount";
    let confirmButtonDisabled = true;

    if (!isWalletConnected) {
        confirmButtonText = "Connect Wallet to Swap";
        confirmButtonDisabled = true;
    } else if (currentTokenFrom.address === currentTokenTo.address) {
        confirmButtonText = "Select different tokens";
        confirmButtonDisabled = true;
    } else if (parseFloat(amountFrom) <= 0 || !amountFrom) {
        confirmButtonText = "Enter an amount";
        confirmButtonDisabled = true;
    } else if (loadingQuote) {
        confirmButtonText = "Getting price...";
        confirmButtonDisabled = true;
    } else if (!amountTo || amountTo === "Ошибка") {
        confirmButtonText = "Price unavailable";
        confirmButtonDisabled = true;
    } else {
        confirmButtonText = "Confirm Swap";
        confirmButtonDisabled = false;
    }

    return (
        <div className="trade-page-container">
            <div className="trade-page-content">
                <h2>Swap</h2>

                {/* Блок ввода "From" */}
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

                {/* Кнопка смены направления */}
                <div className="swap-arrow-container">
                    <button onClick={handleSwapDirection} className="swap-direction-btn" title="Поменять токены местами">↓</button>
                </div>

                {/* Блок ввода "To" */}
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
                            value={loadingQuote ? "Рассчитывается..." : amountTo} disabled className="amount-input-field"
                        />
                    </div>
                </div>

                {/* Выбор Fee Tier */}
                <div className="fee-tier-selector">
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
                
                {/* TODO: Отобразить детали котировки: цена, slippage, route */}
                {/* Например:
                <div className="trade-summary-item">
                    <span className="trade-summary-label">Price:</span>
                    <span className="trade-summary-value">1 {currentTokenFrom?.symbol} = {calculatedPrice} {currentTokenTo?.symbol}</span>
                </div>
                */}

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