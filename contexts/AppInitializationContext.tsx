/**
 * AppInitializationContext
 * Provides app initialization state to all components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAppInitialization, InitializationState } from '@/hooks/useAppInitialization';

interface AppInitializationContextValue {
  initializationState: InitializationState;
  isReady: boolean;
  error: string | null;
  retryInitialization: () => Promise<void>;
}

const AppInitializationContext = createContext<AppInitializationContextValue | undefined>(undefined);

interface AppInitializationProviderProps {
  children: ReactNode;
}

export function AppInitializationProvider({ children }: AppInitializationProviderProps) {
  const initializationData = useAppInitialization();

  return (
    <AppInitializationContext.Provider value={initializationData}>
      {children}
    </AppInitializationContext.Provider>
  );
}

export function useAppInitializationContext(): AppInitializationContextValue {
  const context = useContext(AppInitializationContext);
  
  if (context === undefined) {
    throw new Error('useAppInitializationContext must be used within AppInitializationProvider');
  }
  
  return context;
}
