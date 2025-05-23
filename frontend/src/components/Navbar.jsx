import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './Navbar.css';

function Navbar() {
    const [userAddress, setUserAddress] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const connectWallet = async () => {
        setErrorMessage('');
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length > 0) {
                    const userAddr = accounts[0];
                    setUserAddress(userAddr);
                    const browserProvider = new ethers.BrowserProvider(window.ethereum);
                    setProvider(browserProvider);
                    const currentSigner = await browserProvider.getSigner();
                    setSigner(currentSigner);
                } else {
                    setErrorMessage("Аккаунты не найдены. Убедитесь, что кошелек разблокирован.");
                }
            } catch (error) {
                console.error("Ошибка подключения кошелька:", error);
                if (error.code === 4001) {
                    setErrorMessage("Запрос на подключение отклонен пользователем.");
                } else {
                    setErrorMessage(`Ошибка подключения: ${error.message}`);
                }
            }
        } else {
            setErrorMessage("MetaMask не найден. Пожалуйста, установите MetaMask.");
        }
    };

    useEffect(() => {
        if (window.ethereum) {
            const handleAccountsChanged = (accounts) => {
                if (accounts.length === 0) {
                    setUserAddress(null);
                    setProvider(null);
                    setSigner(null);
                } else {
                    connectWallet();
                }
            };

            const handleChainChanged = (_chainId) => {
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            const checkConnectedWallet = async () => {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        connectWallet();
                    }
                } catch (e) {
                    console.warn("Не удалось проверить подключенный кошелек при загрузке:", e);
                }
            };
            checkConnectedWallet();

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, []);

    return (
        <nav className="navbar">
            <div className="navbar-left-section"> 
                <div className="navbar-brand">RocketSwap</div>
                <div className="navbar-links">
                    <a href="#trade">Swap</a>
                    <a href="#earn">Pools</a>
                </div>
            </div>
            <div className="navbar-wallet">
                {userAddress ? (
                    <div className="wallet-info">
                        <p>Address: {`${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`}</p>
                    </div>
                ) : (
                    <button onClick={connectWallet} className="connect-wallet-btn">
                        Connect Wallet
                    </button>
                )}
                {errorMessage && <p className="error-message">{errorMessage}</p>}
            </div>
        </nav>
    );
}

export default Navbar;
