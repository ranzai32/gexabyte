import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers'; // Понадобится для работы с суммами
import './SwapWidget.css';

// Для примера, захардкодим несколько токенов (используйте адреса из вашего .env для Sepolia)
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
 
};

function SwapWidget() {
    const [tokenFrom, setTokenFrom] = useState(PREDEFINED_TOKENS.WETH);
    const [tokenTo, setTokenTo] = useState(PREDEFINED_TOKENS.USDC);
    const [amountFrom, setAmountFrom] = useState('');
    const [amountTo, setAmountTo] = useState(''); // Будет рассчитываться
    const [isWalletConnected, setIsWalletConnected] = useState(false); // Предполагаем, что это состояние будет приходить из Navbar или контекста
    const [loadingQuote, setLoadingQuote] = useState(false);

    // TODO: Получить isWalletConnected из пропсов или контекста, когда Navbar будет передавать эту информацию

    const handleAmountFromChange = (e) => {
        const value = e.target.value;
        if (/^\d*\.?\d*$/.test(value)) { // Разрешаем ввод только чисел с точкой
            setAmountFrom(value);
            // Здесь или в useEffect будем запрашивать котировку, если amountFrom > 0
        }
    };

    const handleSwapDirection = () => {
        const tempToken = tokenFrom;
        setTokenFrom(tokenTo);
        setTokenTo(tempToken);
        // Также нужно поменять местами amountFrom и amountTo, если amountTo был рассчитан
        const tempAmount = amountFrom;
        setAmountFrom(amountTo); // Если amountTo был результатом котировки
        setAmountTo(tempAmount);  // Если amountFrom был введен пользователем
    };

    // Эффект для получения котировки при изменении токенов или суммы "From"
    useEffect(() => {
        if (parseFloat(amountFrom) > 0 && tokenFrom && tokenTo) {
            // Здесь будет логика запроса котировки на бэкенд
            console.log(`Нужно получить котировку для обмена ${amountFrom} ${tokenFrom.symbol} на ${tokenTo.symbol}`);
            // setAmountTo("Рассчитывается..."); // Показать индикацию
            // getQuote(tokenFrom, tokenTo, amountFrom);
        } else {
            setAmountTo(''); // Сбросить сумму "To", если сумма "From" некорректна
        }
    }, [amountFrom, tokenFrom, tokenTo]);

    // TODO: Функция getQuote для запроса на бэкенд
    // async function getQuote(from, to, amount) {
    //   setLoadingQuote(true);
    //   try {
    //      // Примерный URL, вам нужно его создать на бэкенде
    //      const response = await fetch(`/api/quote?tokenFromAddress=<span class="math-inline">\{from\.address\}&tokenToAddress\=</span>{to.address}&amountFrom=${ethers.parseUnits(amount, from.decimals).toString()}&feeTier=...`);
    //      if (!response.ok) throw new Error('Failed to fetch quote');
    //      const data = await response.json();
    //      setAmountTo(ethers.formatUnits(data.amountTo, to.decimals));
    //   } catch (error) {
    //      console.error("Error fetching quote:", error);
    //      setAmountTo("Ошибка");
    //   } finally {
    //      setLoadingQuote(false);
    //   }
    // }


    // TODO: Реализовать модальные окна для выбора токенов
    const openTokenSelector = (type) => {
        console.log(`Открыть селектор токенов для: ${type}`);
        // Здесь будет логика открытия модального окна
        // В модальном окне будет список PREDEFINED_TOKENS
        // При выборе токена вызывается setTokenFrom или setTokenTo
    };


    return (
        <div className="swap-widget">
            {/* ... (header, если нужен) ... */}
            <div className="swap-token-input-container">
                <label htmlFor="from-amount">From</label>
                <div className="swap-token-input">
                    <button onClick={() => openTokenSelector('from')} className="token-select-btn">
                        {tokenFrom.logoURI && <img src={tokenFrom.logoURI} alt={tokenFrom.symbol} className="token-logo" />}
                        {tokenFrom.symbol} ▼
                    </button>
                    <input
                        type="text"  
                        inputMode="decimal"  
                        id="from-amount"
                        placeholder="0.00"
                        value={amountFrom}
                        onChange={handleAmountFromChange}
                        className="amount-input-field"
                    />
                </div>
            </div>

            <div className="swap-arrow-container">
                <button onClick={handleSwapDirection} className="swap-direction-btn" title="Поменять токены местами">↓</button>
            </div>

            <div className="swap-token-input-container">
                <label htmlFor="to-amount">To (estimated)</label>
                <div className="swap-token-input">
                    <button onClick={() => openTokenSelector('to')} className="token-select-btn">
                       {tokenTo.logoURI && <img src={tokenTo.logoURI} alt={tokenTo.symbol} className="token-logo" />}
                       {tokenTo.symbol} ▼
                    </button>
                    <input
                        type="text"
                        inputMode="decimal"
                        id="to-amount"
                        placeholder="0.00"
                        value={loadingQuote ? "Рассчитывается..." : amountTo}
                        disabled
                        className="amount-input-field"  
                    />
                </div>
            </div>

            {/* TODO: Отображение цены, slippage, route и т.д. */}

            <button 
                className="swap-action-btn" 
                // disabled={!isWalletConnected || parseFloat(amountFrom) <= 0 || loadingQuote}
                disabled={parseFloat(amountFrom) <= 0 || loadingQuote} // Упрощенная проверка для начала
            >
                {/* { !isWalletConnected ? "Connect Wallet" : (parseFloat(amountFrom) > 0 ? "Swap" : "Enter an amount") } */}
                { (parseFloat(amountFrom) > 0 ? "Swap" : "Enter an amount") }
            </button>
        </div>
    );
}

export default SwapWidget;