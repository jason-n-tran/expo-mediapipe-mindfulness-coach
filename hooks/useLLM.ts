/**
 * useLLM Hook
 * Custom implementation using expo-llm-mediapipe native module directly
 * Bypasses the broken useLLM hook to avoid crashes
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ExpoLlmMediapipe from 'expo-llm-mediapipe';
import type { 
  PartialResponseEventPayload, 
  ErrorResponseEventPayload,
  NativeModuleSubscription 
} from 'expo-llm-mediapipe';
import { APP_CONFIG } from '@/constants/config';
import type { ChatMessage, InferenceOptions, ModelCapabilities } from '@/types';

type InferenceState = 'idle' | 'initializing' | 'generating' | 'error';

interface UseLLMReturn {
  inferenceState: InferenceState;
  isReady: boolean;
  error: string | null;
  capabilities: ModelCapabilities | null;
  initialize: (modelName: string) => Promise<void>;
  generateResponse: (
    messages: ChatMessage[],
    options: InferenceOptions,
    onToken: (token: string) => void
  ) => Promise<string>;
  stopGeneration: () => void;
  cleanup: () => Promise<void>;
}

export function useLLM(): UseLLMReturn {
  const [inferenceState, setInferenceState] = useState<InferenceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [capabilities] = useState<ModelCapabilities>({
    maxContextLength: APP_CONFIG.model.maxContextTokens,
    supportsStreaming: true,
    modelName: APP_CONFIG.model.name,
    version: '1.0.0',
  });
  
  const modelHandleRef = useRef<number | null>(null);
  const requestIdCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const partialListenerRef = useRef<NativeModuleSubscription | null>(null);
  const errorListenerRef = useRef<NativeModuleSubscription | null>(null);

  // Log state changes
  useEffect(() => {
    console.log('[useLLM] State changed - isReady:', isReady, 'inferenceState:', inferenceState);
  }, [isReady, inferenceState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (modelHandleRef.current !== null) {
        console.log('[useLLM] Cleaning up model handle:', modelHandleRef.current);
        ExpoLlmMediapipe.releaseModel(modelHandleRef.current).catch(err => 
          console.error('[useLLM] Error releasing model:', err)
        );
      }
      if (partialListenerRef.current) {
        partialListenerRef.current.remove();
      }
      if (errorListenerRef.current) {
        errorListenerRef.current.remove();
      }
    };
  }, []);

  /**
   * Initialize LLM with model name - Direct native module implementation
   */
  const initialize = useCallback(async (name: string) => {
    console.log('[useLLM] === INITIALIZE START ===');
    console.log('[useLLM] Model name:', name);
    
    try {
      setInferenceState('initializing');
      setError(null);
      
      // Check if model is downloaded
      console.log('[useLLM] Checking if model is downloaded...');
      const isDownloaded = await ExpoLlmMediapipe.isModelDownloaded(name);
      console.log('[useLLM] Model downloaded:', isDownloaded);
      
      if (!isDownloaded) {
        throw new Error('Model not downloaded. Please download the model first.');
      }
      
      // Create model handle directly using native module
      console.log('[useLLM] Creating model handle from downloaded model...');
      console.log('[useLLM] Parameters:', {
        modelName: name,
        maxTokens: APP_CONFIG.model.defaultMaxTokens,
        topK: 40,
        temperature: APP_CONFIG.model.defaultTemperature,
        randomSeed: 0
      });
      
      try {
        const handle = await ExpoLlmMediapipe.createModelFromDownloaded(
          name,
          APP_CONFIG.model.defaultMaxTokens,
          40, // topK
          APP_CONFIG.model.defaultTemperature,
          0 // randomSeed
        );
        
        console.log('[useLLM] Model handle created:', handle);
        modelHandleRef.current = handle;
        setIsReady(true);
        setInferenceState('idle');
        console.log('[useLLM] === INITIALIZE SUCCESS ===');
      } catch (createError) {
        console.error('[useLLM] Error creating model handle:', createError);
        console.error('[useLLM] This might be a native crash - trying alternative approach...');
        
        // If createModelFromDownloaded fails, the model might be corrupted
        // Try to delete and re-download
        console.log('[useLLM] Deleting potentially corrupted model...');
        try {
          await ExpoLlmMediapipe.deleteDownloadedModel(name);
          console.log('[useLLM] Model deleted');
        } catch (deleteError) {
          console.error('[useLLM] Error deleting model:', deleteError);
        }
        
        throw new Error(`Failed to create model handle. The model file may be corrupted. Please re-download the model. Error: ${createError instanceof Error ? createError.message : String(createError)}`);
      }
    } catch (err) {
      console.error('[useLLM] === INITIALIZE FAILED ===');
      console.error('[useLLM] Error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize LLM';
      setError(errorMessage);
      setInferenceState('error');
      setIsReady(false);
      throw err;
    }
  }, []);

  /**
   * Generate response with streaming support - Direct native module implementation
   */
  const generateResponse = useCallback(
    async (
      messages: ChatMessage[],
      options: InferenceOptions,
      onToken: (token: string) => void
    ): Promise<string> => {
      if (modelHandleRef.current === null) {
        throw new Error('Model not initialized. Call initialize() first.');
      }

      try {
        setInferenceState('generating');
        setError(null);

        // Prepare prompt
        const prompt = preparePrompt(messages, options);
        console.log('[useLLM] Generating response for prompt length:', prompt.length);
        
        // Create abort controller
        abortControllerRef.current = new AbortController();
        
        // Generate unique request ID
        const requestId = ++requestIdCounterRef.current;
        console.log('[useLLM] Request ID:', requestId);
        
        let fullResponse = '';
        
        // Set up event listeners BEFORE starting generation
        partialListenerRef.current = ExpoLlmMediapipe.addListener(
          'onPartialResponse',
          (event: PartialResponseEventPayload) => {
            if (event.requestId !== requestId || event.handle !== modelHandleRef.current) return;
            
            if (abortControllerRef.current?.signal.aborted) {
              return;
            }
            
            // The native module sends individual chunks, not cumulative text
            console.log('[useLLM] Received chunk:', event.response.length, 'chars');
            
            // Append the new chunk to full response
            fullResponse += event.response;
            
            // Pass the chunk directly to the callback
            onToken(event.response);
          }
        );
        
        errorListenerRef.current = ExpoLlmMediapipe.addListener(
          'onErrorResponse',
          (event: ErrorResponseEventPayload) => {
            if (event.requestId !== requestId || event.handle !== modelHandleRef.current) return;
            
            console.error('[useLLM] Error response:', event.error);
          }
        );
        
        // Start async generation - this Promise resolves when generation is COMPLETE
        console.log('[useLLM] Starting generation...');
        await ExpoLlmMediapipe.generateResponseAsync(
          modelHandleRef.current,
          requestId,
          prompt
        );
        
        console.log('[useLLM] Generation complete, total length:', fullResponse.length);
        console.log('[useLLM] Returning response:', fullResponse);
        
        // Clean up listeners
        if (partialListenerRef.current) {
          partialListenerRef.current.remove();
          partialListenerRef.current = null;
        }
        if (errorListenerRef.current) {
          errorListenerRef.current.remove();
          errorListenerRef.current = null;
        }
        
        setInferenceState('idle');
        return fullResponse;
      } catch (err) {
        // Clean up listeners on error
        if (partialListenerRef.current) {
          partialListenerRef.current.remove();
          partialListenerRef.current = null;
        }
        if (errorListenerRef.current) {
          errorListenerRef.current.remove();
          errorListenerRef.current = null;
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
        setError(errorMessage);
        setInferenceState('error');
        console.error('[useLLM] Error generating response:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Stop ongoing generation
   */
  const stopGeneration = useCallback(() => {
    console.log('[useLLM] Stopping generation');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Clean up listeners
    if (partialListenerRef.current) {
      partialListenerRef.current.remove();
      partialListenerRef.current = null;
    }
    if (errorListenerRef.current) {
      errorListenerRef.current.remove();
      errorListenerRef.current = null;
    }
    
    setInferenceState('idle');
    setError(null);
  }, []);

  /**
   * Clean up LLM resources (called when model is deleted)
   */
  const cleanup = useCallback(async () => {
    console.log('[useLLM] === CLEANUP START ===');
    
    try {
      // Stop any ongoing generation
      stopGeneration();
      
      // Release model handle
      if (modelHandleRef.current !== null) {
        console.log('[useLLM] Releasing model handle:', modelHandleRef.current);
        await ExpoLlmMediapipe.releaseModel(modelHandleRef.current);
        modelHandleRef.current = null;
      }
      
      // Reset state
      setIsReady(false);
      setInferenceState('idle');
      setError(null);
      
      console.log('[useLLM] === CLEANUP COMPLETE ===');
    } catch (err) {
      console.error('[useLLM] Error during cleanup:', err);
      // Don't throw - cleanup should be best-effort
    }
  }, [stopGeneration]);

  return useMemo(() => ({
    inferenceState,
    isReady,
    error,
    capabilities,
    initialize,
    generateResponse,
    stopGeneration,
    cleanup,
  }), [inferenceState, isReady, error, cleanup]);
}

/**
 * Prepare prompt from messages
 */
function preparePrompt(messages: ChatMessage[], options: InferenceOptions): string {
  const systemPrompt = options.systemPrompt || '';
  let prompt = systemPrompt ? `${systemPrompt}\n\n` : '';

  // Add conversation history
  const conversationMessages = messages.filter(msg => msg.role !== 'system');
  
  for (const msg of conversationMessages) {
    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    prompt += `${roleLabel}: ${msg.content}\n\n`;
  }

  return prompt;
}
