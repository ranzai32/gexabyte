import React from 'react';
import './TokenSelectorDropdown.css';  
function TokenSelectorDropdown({
    tokens,  
    tokenKeys,  
    onSelectToken,  
    // currentSelectedKey, 
    otherSelectedKey    
}) {
    if (!tokens || !tokenKeys) return null;

    return (
        <div className="token-selector-dropdown">
            
            <ul className="token-list">
                {tokenKeys.map((key) => {
                    const token = tokens[key];
                    const isSelectedInOtherField = key === otherSelectedKey;
                    
                    if (isSelectedInOtherField) {
                        return null;
                    }

                    return (
                        <li
                            key={token.address}
                            className="token-list-item"
                            onClick={() => onSelectToken(key)}
                        >
                            {token.logoURI && (
                                <img src={token.logoURI} alt={token.symbol} className="token-logo-dropdown" />
                            )}
                            <span className="token-symbol-dropdown">{token.symbol}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default TokenSelectorDropdown;