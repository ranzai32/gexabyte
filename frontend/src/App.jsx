import React, { useState, useEffect } from 'react'; 
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import './App.css';
import { ethers } from 'ethers';  
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import TradePage from './pages/TradePage';
import EarnPage from './pages/EarnPage';
import ManageLiquidityPage from './pages/ManageLiquidityPage';
import AddLiquidityPage from './pages/AddLiquidityPage';
import { PoolsProvider } from './context/PoolsContext';
import { PositionsProvider } from './context/PositionsContext';

function App() {
  const [userAddress, setUserAddress] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [navbarErrorMessage, setNavbarErrorMessage] = useState('');


  const handleConnectWallet = async () => {
    setNavbarErrorMessage('');
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
                setNavbarErrorMessage("Аккаунты не найдены.");
            }
        } catch (error) {
            console.error("Ошибка подключения кошелька в App:", error);
            if (error.code === 4001) {
                setNavbarErrorMessage("Запрос на подключение отклонен.");
            } else {
                setNavbarErrorMessage(`Ошибка подключения: ${error.message}`);
            }
        }
    } else {
        setNavbarErrorMessage("MetaMask не найден.");
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
                  handleConnectWallet(); 
              }
          };
          const handleChainChanged = () => window.location.reload();

          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', handleChainChanged);
 
          const checkConnectedWallet = async () => {
              try {
                  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                  if (accounts.length > 0) {
                      handleConnectWallet();
                  }
              } catch (e) {console.warn("Не удалось проверить кошелек при загрузке в App:", e);}
          };
          checkConnectedWallet();

          return () => {
              window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
              window.ethereum.removeListener('chainChanged', handleChainChanged);
          };
      }
  }, []);


  return (
    <div className="app-container">
      <BrowserRouter>
        <PoolsProvider>
          <PositionsProvider userAddress={userAddress} isWalletConnected={!!userAddress}> 
        <div className="app-container">
          <Navbar 
            userAddress={userAddress} 
            connectWallet={handleConnectWallet} 
            navbarErrorMessage={navbarErrorMessage}
          />
          <main className="main-content">
            <Routes>  
              <Route 
                  path="/" 
                  element={
                      <HomePage 
                          isWalletConnected={!!userAddress} 
                          provider={provider} 
                          signer={signer} 
                      />
                  } 
              />
              <Route 
                  path="/trade" 
                  element={
                      <TradePage 
                          isWalletConnected={!!userAddress} 
                          provider={provider} 
                          signer={signer} 
                      />
                  } 
              />
              <Route 
                path="/earn" 
                element={ 
                    <EarnPage 
                        isWalletConnected={!!userAddress} 
                        provider={provider} 
                        signer={signer}
                        userAddress={userAddress}  
                    /> 
                } 
              />
              <Route 
                path="/manage-liquidity/:tokenId"  
                element={ 
                    <ManageLiquidityPage 
                        isWalletConnected={!!userAddress} 
                        provider={provider} 
                        signer={signer}
                        userAddress={userAddress}
                    /> 
                } 
              />
              <Route 
                    path="/add-liquidity" // Новый маршрут
                    element={ 
                        <AddLiquidityPage 
                            isWalletConnected={!!userAddress} 
                            provider={provider} 
                            signer={signer}
                            userAddress={userAddress}
                        /> 
                    } 
                />
            </Routes>
          </main>
        </div>
         </PositionsProvider>
        </PoolsProvider> 
      </BrowserRouter>
    </div>
  );
}

export default App;