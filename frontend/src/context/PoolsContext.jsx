import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const PoolsContext = createContext();

export function usePools() {
    return useContext(PoolsContext);
}

export function PoolsProvider({ children }) {
    const [allPools, setAllPools] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // Начинаем с false
    const [error, setError] = useState('');

    // --- ИЗМЕНЕНИЕ: Убираем зависимость от allPools.length ---
    const fetchAllPools = useCallback(async () => {
        // Если уже идет загрузка, ничего не делаем
        if (isLoading) return;

        console.log("Context: Fetching all pools summary...");
        setIsLoading(true);
        setError('');
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
            const response = await fetch(`${backendUrl}/api/all-pools-summary`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            setAllPools(data);
        } catch (err) {
            console.error('PoolsContext: Error fetching pools:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading]); // Зависимость от isLoading, чтобы предотвратить двойные запросы

    const value = {
        allPools,
        isLoading,
        error,
        fetchAllPools,
    };

    return (
        <PoolsContext.Provider value={value}>
            {children}
        </PoolsContext.Provider>
    );
}