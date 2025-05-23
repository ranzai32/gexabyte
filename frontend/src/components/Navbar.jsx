 
import React, { useState } from 'react'; // useEffect здесь больше не нужен, если вся логика событий кошелька в App.jsx
import './Navbar.css';


function Navbar({ userAddress, connectWallet, navbarErrorMessage }) {
    // Локальное состояние для errorMessage может остаться, если Navbar сам генерирует ошибки,
    // не связанные с подключением кошелька.
    // const [errorMessage, setErrorMessage] = useState('');

    return (
        <nav className="navbar">
            <div className="navbar-left-section">
                <div className="navbar-brand">RocketSwap</div>
                <div className="navbar-links">
                    {/* В будущем здесь можно использовать <Link> из react-router-dom */}
                    <a href="#trade">Trade</a>
                    <a href="#earn">Earn</a>
                </div>
            </div>
            <div className="navbar-wallet">
                {userAddress ? (
                    <div className="wallet-info">
                        <p>Адрес: {`${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`}</p>
                    </div>
                ) : (
                    // Вызываем функцию connectWallet, которая передана через пропсы из App.jsx
                    <button onClick={connectWallet} className="connect-wallet-btn">
                        Connect Wallet
                    </button>
                )}
                {/* Отображаем сообщение об ошибке, если оно есть и передано из App.jsx */}
                {navbarErrorMessage && <p className="error-message">{navbarErrorMessage}</p>}
            </div>
        </nav>
    );
}

export default Navbar;