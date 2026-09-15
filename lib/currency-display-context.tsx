'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface CurrencyDisplayContextType {
  showUsd: boolean;
  setShowUsd: (value: boolean) => void;
}

const CurrencyDisplayContext = createContext<CurrencyDisplayContextType | undefined>(undefined);

const STORAGE_KEY = 'mis-gastos:show-usd';

export function CurrencyDisplayProvider({ children }: { children: ReactNode }) {
  const [showUsd, setShowUsdState] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setShowUsdState(true);
    } catch {
      // localStorage no disponible, seguimos con el default
    }
  }, []);

  const setShowUsd = (value: boolean) => {
    setShowUsdState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // sin persistencia, no pasa nada
    }
  };

  return (
    <CurrencyDisplayContext.Provider value={{ showUsd, setShowUsd }}>
      {children}
    </CurrencyDisplayContext.Provider>
  );
}

export function useCurrencyDisplay() {
  const context = useContext(CurrencyDisplayContext);
  if (context === undefined) {
    throw new Error('useCurrencyDisplay must be used within a CurrencyDisplayProvider');
  }
  return context;
}
