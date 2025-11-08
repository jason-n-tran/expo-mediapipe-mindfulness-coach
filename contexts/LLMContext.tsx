/**
 * LLMContext
 * Provides LLM state globally to avoid hook re-render issues
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useLLM } from '@/hooks/useLLM';
import type { InferenceOptions, ModelCapabilities } from '@/types';
import type { ChatMessage } from '@/types';

type InferenceState = 'idle' | 'initializing' | 'generating' | 'error';

interface LLMContextValue {
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

const LLMContext = createContext<LLMContextValue | undefined>(undefined);

interface LLMProviderProps {
  children: ReactNode;
}

export function LLMProvider({ children }: LLMProviderProps) {
  const llmHook = useLLM();

  return (
    <LLMContext.Provider value={llmHook}>
      {children}
    </LLMContext.Provider>
  );
}

export function useLLMContext(): LLMContextValue {
  const context = useContext(LLMContext);
  
  if (context === undefined) {
    throw new Error('useLLMContext must be used within LLMProvider');
  }
  
  return context;
}
