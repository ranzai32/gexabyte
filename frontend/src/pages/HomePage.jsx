import React from 'react';
import SwapWidget from '../components/SwapWidget'; 
import './HomePage.css';  


const chainIcons = [
    { name: 'BNB Chain', src: 'https://assets.pcswap.org/web/chains/svg/56.svg' },
    { name: 'Ethereum', src: 'https://assets.pcswap.org/web/chains/svg/1.svg' },
    { name: 'Base', src: 'https://assets.pcswap.org/web/chains/svg/8453.svg' },
    { name: 'Arbitrum', src: 'https://assets.pcswap.org/web/chains/svg/42161.svg' },
    { name: 'zkSync Era', src: 'https://assets.pcswap.org/web/chains/svg/324.svg' },
    { name: 'Linea', src: 'https://assets.pcswap.org/web/chains/svg/59144.svg' },
    { name: 'Polygon zkEVM', src: 'https://assets.pcswap.org/web/chains/svg/1101.svg' },
    { name: 'Aptos', src: 'https://assets.pcswap.org/web/chains/svg/aptos.svg' },
    { name: 'opBNB', src: 'https://assets.pcswap.org/web/chains/svg/204.svg' }
];

function HomePage() {
    return (
        <div className="homepage">
            <div className="homepage-left">
                <h1 className="homepage-title">
                    Everyone's <br /> Favorite DEX  
                </h1>
                <p className="homepage-subtitle">
                    Trade Crypto Instantly Across 9+ Chains
                </p>
                 <div className="chain-icons-container">
                    {chainIcons.map((icon) => (
                        <img
                            key={icon.name}
                            src={icon.src}
                            alt={`${icon.name} chain icon`}
                            title={icon.name}  
                            className="chain-icon"
                        />
                    ))}
                </div>
                 
            </div>
            <div className="homepage-right">
                <SwapWidget />
            </div>
        </div>
    );
}

export default HomePage;