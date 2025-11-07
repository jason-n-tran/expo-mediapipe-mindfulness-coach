/**
 * useAppInitialization Hook
 * Manages app startup logic including model availability check,
 * conversation history loading, and LLM service initialization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useModelManager } from './useModelManager';
import { useMessageStore } from './useMessageStore';
import { useLLM } from './useLLM';

export type InitializationState = 
  | 'checking'           // Checking model availability
  | 'model-missing'      // Model needs to be downloaded
  | 'model-downloading'  // Model is being downloaded
  | 'initializing-llm'   // Initializing LLM service
  | 'loading-history'    // Loading conversation history
  | 'ready'              // App is ready to use
  | 'error';             // Initialization error

interface UseAppInitializationReturn {
  initializationState: InitializationState;
  isReady: boolean;
  error: string | null;
  retryInitialization: () => Promise<void>;
}

export function useAppInitialization(): UseAppInitializationReturn {
  const [initializationState, setInitializationState] = useState<InitializationState>('checking');
  const [error, setError] = useState<string | null>(null);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  
  const { modelStatus, refreshStatus } = useModelManager();
  const { loadMessages } = useMessageStore();
  const { initialize: initializeLLM, isReady: llmReady } = useLLM();

  /**
   * Main initialization sequence
   */
  const initializeApp = useCallback(async () => {
    // Prevent double initialization
    if (isInitializingRef.current) {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    isInitializingRef.current = true;

    try {
      setError(null);
      setInitializationState('checking');

      // Step 1: Check model availability
      await refreshStatus();
      
      if (!modelStatus.isAvailable) {
        // Model is missing - user needs to download it
        setInitializationState('model-missing');
        isInitializingRef.current = false;
        return;
      }

      // Step 2: Initialize LLM service with cached model
      if (!llmReady && !hasInitializedRef.current) {
        setInitializationState('initializing-llm');
        
        // Get model name from ModelManager
        const { modelManager } = await import('@/services/llm/ModelManager');
        const modelName = await modelManager.getModelPath(); // Returns model name
        
        await initializeLLM(modelName);
        hasInitializedRef.current = true;
      }

      // Step 3: Load conversation history
      setInitializationState('loading-history');
      await loadMessages();

      // Step 4: Ready!
      setInitializationState('ready');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize app';
      setError(errorMessage);
      setInitializationState('error');
      console.error('App initialization error:', err);
    } finally {
      isInitializingRef.current = false;
    }
  }, [modelStatus.isAvailable, llmReady, refreshStatus, initializeLLM, loadMessages]);

  /**
   * Retry initialization after error
   */
  const retryInitialization = useCallback(async () => {
    await initializeApp();
  }, [initializeApp]);

  /**
   * Run initialization on mount and when model status changes
   */
  useEffect(() => {
    // Only initialize if we're in checking state or model just became available
    if (initializationState === 'checking' || 
        (initializationState === 'model-missing' && modelStatus.isAvailable)) {
      initializeApp();
    }
  }, [initializationState, modelStatus.isAvailable, initializeApp]);

  /**
   * Handle model downloading state
   */
  useEffect(() => {
    if (modelStatus.isDownloading) {
      setInitializationState('model-downloading');
    }
  }, [modelStatus.isDownloading]);

  return {
    initializationState,
    isReady: initializationState === 'ready',
    error,
    retryInitialization,
  };
}
