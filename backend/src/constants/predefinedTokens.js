// backend/src/constants/predefinedTokens.js
const PREDEFINED_TOKENS_BACKEND = {
        WETH: {
            address: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',  
            symbol: 'WETH',
            decimals: 18,
        },
        USDC: {
            address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',  
            symbol: 'USDC',
            decimals: 6,
        },
        OKB: {
            address: '0x3F4B6664338F23d2397c953f2AB4Ce8031663f80',
            symbol: 'OKB',
            decimals: 18, 
        },
        R2USD: {
            address: '0x20c54C5F742F123Abb49a982BFe0af47edb38756',
            symbol: 'R2USD',
            decimals: 6,  
 
        },
        WBTC: {
            address: '0x340a5B718557801f20AfD6E244C78Fcd1c0B2212',
            symbol: 'WBTC',
            decimals: 8,   
        },
        SR2USD: {
            address: '0xBD6b25c4132F09369C354beE0f7be777D7d434fa',
            symbol: 'SR2USD',
            decimals: 6,  
        },
        LINK: {
            address: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
            symbol: 'LINK',
            decimals: 18,
        }
    };

function getTokenDetailsByAddressOnBackend(address) {
    if (!address) return { symbol: 'Unknown', decimals: 18 };  
    return PREDEFINED_TOKENS_BACKEND[address.toLowerCase()] || { symbol: address.substring(0, 6) + '...', decimals: 18 };
}

module.exports = {
    PREDEFINED_TOKENS_BACKEND,
    getTokenDetailsByAddressOnBackend
};