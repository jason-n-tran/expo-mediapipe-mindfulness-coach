/**
 * useAppInitialization Hook
 * Manages app startup logic including model availability check,
 * conversation history loading, and LLM service initialization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useModelManager } from './useModelManager';
import { useMessageStore } from './useMessageStore';
import { useLLMContext } from '@/contexts/LLMContext';
import ExpoLlmMediapipe from 'expo-llm-mediapipe';
import { APP_CONFIG } from '@/constants/config';

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
  const { initialize: initializeLLM, isReady: llmReady } = useLLMContext();

  // Reset initialization flag when model becomes unavailable (e.g., deleted)
  useEffect(() => {
    if (!modelStatus.isAvailable && hasInitializedRef.current) {
      console.log('[AppInit] Model became unavailable, resetting initialization flag');
      hasInitializedRef.current = false;
    }
  }, [modelStatus.isAvailable]);

  /**
   * Main initialization sequence
   */
  const initializeApp = useCallback(async () => {
    console.log('[AppInit] === INITIALIZATION START ===');
    console.log('[AppInit] isInitializing:', isInitializingRef.current);
    console.log('[AppInit] hasInitialized:', hasInitializedRef.current);
    console.log('[AppInit] llmReady:', llmReady);
    console.log('[AppInit] modelStatus:', modelStatus);
    
    // Prevent double initialization
    if (isInitializingRef.current) {
      console.log('[AppInit] Initialization already in progress, skipping...');
      return;
    }

    isInitializingRef.current = true;

    try {
      setError(null);
      console.log('[AppInit] Step 1: Checking model availability...');
      setInitializationState('checking');
      const downloadedModels = await ExpoLlmMediapipe.getDownloadedModels();
      console.log('[ModelManager] Downloaded models:', downloadedModels);

      // Step 1: Check model availability - use direct check first
      console.log('[AppInit] Checking directly with ExpoLlmMediapipe...');
      const isDownloadedDirect = await ExpoLlmMediapipe.isModelDownloaded(APP_CONFIG.model.name);
      console.log('[AppInit] Direct check result:', isDownloadedDirect);
      
      // Also refresh ModelManager status
      await refreshStatus();
      console.log('[AppInit] Model status after refresh:', modelStatus);
      
      // Use direct check as source of truth
      if (!isDownloadedDirect) {
        console.log('[AppInit] Model not available (direct check) - need to download');
        // Model is missing - user needs to download it
        setInitializationState('model-missing');
        isInitializingRef.current = false;
        return;
      }

      console.log('[AppInit] Model is available (direct check confirmed)');

      // Step 2: Initialize LLM service with cached model
      if (!llmReady && !hasInitializedRef.current) {
        console.log('[AppInit] Step 2: Initializing LLM service...');
        setInitializationState('initializing-llm');
        
        // Get model name from ModelManager
        const { modelManager } = await import('@/services/llm/ModelManager');
        const modelName = await modelManager.getModelPath(); // Returns model name
        console.log('[AppInit] Got model name:', modelName);
        
        console.log('[AppInit] Calling initializeLLM...');
        await initializeLLM(modelName);
        hasInitializedRef.current = true;
        console.log('[AppInit] LLM initialized successfully');
      } else {
        console.log('[AppInit] Skipping LLM init - llmReady:', llmReady, 'hasInitialized:', hasInitializedRef.current);
      }

      // Step 3: Load conversation history
      console.log('[AppInit] Step 3: Loading conversation history...');
      setInitializationState('loading-history');
      await loadMessages();
      console.log('[AppInit] Messages loaded');

      // Step 4: Ready!
      console.log('[AppInit] Step 4: Setting state to ready');
      setInitializationState('ready');
      console.log('[AppInit] === INITIALIZATION COMPLETE ===');
    } catch (err) {
      console.error('[AppInit] === INITIALIZATION ERROR ===');
      console.error('[AppInit] Error type:', err?.constructor?.name);
      console.error('[AppInit] Error message:', err instanceof Error ? err.message : String(err));
      console.error('[AppInit] Full error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize app';
      setError(errorMessage);
      setInitializationState('error');
    } finally {
      isInitializingRef.current = false;
      console.log('[AppInit] Initialization flag cleared');
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
    console.log('[AppInit] useEffect triggered');
    console.log('[AppInit] initializationState:', initializationState);
    console.log('[AppInit] modelStatus.isAvailable:', modelStatus.isAvailable);
    
    // Only initialize if we're in checking state or model just became available
    if (initializationState === 'checking' || 
        (initializationState === 'model-missing' && modelStatus.isAvailable) ||
        (initializationState === 'model-downloading' && modelStatus.isAvailable && !modelStatus.isDownloading)) {
      console.log('[AppInit] Triggering initializeApp from useEffect');
      initializeApp();
    } else {
      console.log('[AppInit] Skipping initialization - conditions not met');
    }
  }, [initializationState, modelStatus.isAvailable, modelStatus.isDownloading, initializeApp]);

  /**
   * Re-check model availability when coming back from model-missing state
   * This handles the case where user downloads model and navigates to chat
   */
  useEffect(() => {
    const recheckInterval = setInterval(async () => {
      if (initializationState === 'model-missing') {
        console.log('[AppInit] Re-checking model availability (model-missing state)...');
        const isDownloaded = await ExpoLlmMediapipe.isModelDownloaded(APP_CONFIG.model.name);
        console.log('[AppInit] Re-check result:', isDownloaded);
        
        if (isDownloaded) {
          console.log('[AppInit] Model now available! Triggering initialization...');
          // Reset to checking state to trigger initialization
          setInitializationState('checking');
        }
      }
    }, 1000); // Check every second when in model-missing state

    return () => clearInterval(recheckInterval);
  }, [initializationState]);

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
