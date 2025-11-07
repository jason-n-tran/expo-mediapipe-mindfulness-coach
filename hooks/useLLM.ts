/**
 * useLLM Hook
 * Wraps LLMService with React state
 * Manages inference state (idle, generating, error)
 * Provides generateResponse function with streaming support
 */

import { useState, useCallback, useRef } from 'react';
import { llmService } from '@/services/llm/LLMService';
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
}

export function useLLM(): UseLLMReturn {
  const [inferenceState, setInferenceState] = useState<InferenceState>('idle');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ModelCapabilities | null>(null);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  /**
   * Initialize LLM service with model name
   */
  const initialize = useCallback(async (modelName: string) => {
    try {
      setInferenceState('initializing');
      setError(null);
      
      await llmService.initialize(modelName);
      
      if (isMountedRef.current) {
        const caps = llmService.getCapabilities();
        setCapabilities(caps);
        setIsReady(true);
        setInferenceState('idle');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize LLM';
      
      if (isMountedRef.current) {
        setError(errorMessage);
        setInferenceState('error');
        setIsReady(false);
      }
      
      console.error('Error initializing LLM:', err);
      throw err;
    }
  }, []);

  /**
   * Generate response with streaming support
   */
  const generateResponse = useCallback(
    async (
      messages: ChatMessage[],
      options: InferenceOptions,
      onToken: (token: string) => void
    ): Promise<string> => {
      try {
        setInferenceState('generating');
        setError(null);

        const response = await llmService.generateResponse(
          messages,
          options,
          (token) => {
            if (isMountedRef.current) {
              onToken(token);
            }
          }
        );

        if (isMountedRef.current) {
          setInferenceState('idle');
        }

        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';

        if (isMountedRef.current) {
          setError(errorMessage);
          setInferenceState('error');
        }

        console.error('Error generating response:', err);
        throw err;
      }
    },
    []
  );

  /**
   * Stop ongoing generation
   */
  const stopGeneration = useCallback(() => {
    try {
      llmService.stopGeneration();
      
      if (isMountedRef.current) {
        setInferenceState('idle');
        setError(null);
      }
    } catch (err) {
      console.error('Error stopping generation:', err);
    }
  }, []);

  return {
    inferenceState,
    isReady,
    error,
    capabilities,
    initialize,
    generateResponse,
    stopGeneration,
  };
}
