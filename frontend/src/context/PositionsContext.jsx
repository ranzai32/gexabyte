import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const PositionsContext = createContext();

export function usePositions() {
    return useContext(PositionsContext);
}

export function PositionsProvider({ children, isWalletConnected, userAddress }) {
    const [userPositions, setUserPositions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchUserPositions = useCallback(async () => {
        if (!isWalletConnected || !userAddress) {
            setUserPositions([]);
            return;
        }

        console.log("Context: Fetching user positions for", userAddress);
        setIsLoading(true);
        setError('');
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
            const response = await fetch(`${backendUrl}/api/user-positions/${userAddress}`);
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to fetch positions');
            }
            const data = await response.json();
            setUserPositions(data);
        } catch (err) {
            console.error('PositionsContext: Error fetching positions:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [isWalletConnected, userAddress]);

    useEffect(() => {
        fetchUserPositions();
    }, [fetchUserPositions]);

    // --- ИЗМЕНЕНИЕ: Добавляем isWalletConnected и userAddress в value ---
    const value = {
        userPositions,
        isLoading,
        error,
        fetchUserPositions,
        isWalletConnected, // Теперь контекст знает о состоянии подключения
        userAddress,       // И об адресе
    };

    return (
        <PositionsContext.Provider value={value}>
            {children}
        </PositionsContext.Provider>
    );
}