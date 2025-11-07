/**
 * useChat Hook
 * Combines useMessageStore and useLLM for complete chat functionality
 * Manages conversation state and message flow
 * Handles sending messages and receiving responses
 * Integrates PromptBuilder for system prompt construction
 */

import 'react-native-get-random-values';
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMessageStore } from './useMessageStore';
import { useLLM } from './useLLM';
import { promptBuilder } from '@/services/llm/PromptBuilder';
import type { ChatMessage, MindfulnessTopic, QuickAction } from '@/types';
import type { InferenceOptions, PromptOptions } from '@/services/llm/types';

interface UseChatOptions {
  sessionId?: string;
  promptOptions?: PromptOptions;
  inferenceOptions?: InferenceOptions;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  streamingMessage: string;
  sendMessage: (content: string, metadata?: ChatMessage['metadata']) => Promise<void>;
  sendQuickAction: (action: QuickAction) => Promise<void>;
  setTopic: (topic: MindfulnessTopic) => void;
  stopGeneration: () => void;
  clearChat: () => Promise<void>;
  updateInferenceOptions: (options: Partial<InferenceOptions>) => void;
  updatePromptOptions: (options: Partial<PromptOptions>) => void;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const {
    sessionId: initialSessionId,
    promptOptions: initialPromptOptions,
    inferenceOptions: initialInferenceOptions,
  } = options || {};

  // Initialize hooks
  const messageStoreHook = useMessageStore();
  const llmHook = useLLM();

  // Local state
  const [sessionId] = useState(initialSessionId || uuidv4());
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptOptions, setPromptOptions] = useState<PromptOptions>(
    initialPromptOptions || {}
  );
  const [inferenceOptions, setInferenceOptions] = useState<InferenceOptions>(
    initialInferenceOptions || {}
  );

  // Refs for tracking current assistant message
  const currentAssistantMessageRef = useRef<ChatMessage | null>(null);
  const streamingContentRef = useRef<string>('');

  /**
   * Build system prompt based on current options
   */
  const buildSystemPrompt = useCallback((): string => {
    return promptBuilder.buildSystemPrompt(promptOptions);
  }, [promptOptions]);

  /**
   * Send a user message and get AI response
   */
  const sendMessage = useCallback(
    async (content: string, metadata?: ChatMessage['metadata']) => {
      if (!llmHook.isReady) {
        throw new Error('LLM is not ready. Please initialize it first.');
      }

      if (isGenerating) {
        throw new Error('Already generating a response. Please wait.');
      }

      try {
        setIsGenerating(true);
        setStreamingMessage('');
        streamingContentRef.current = '';

        // Create and save user message
        const userMessage: ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content,
          timestamp: new Date(),
          sessionId,
          metadata,
        };

        await messageStoreHook.saveMessage(userMessage);

        // Prepare messages for inference (include conversation history)
        const conversationMessages = [...messageStoreHook.messages, userMessage];

        // Build system prompt
        const systemPrompt = buildSystemPrompt();

        // Prepare inference options with system prompt
        const fullInferenceOptions: InferenceOptions = {
          ...inferenceOptions,
          systemPrompt,
        };

        // Create assistant message placeholder
        const assistantMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          sessionId,
          metadata: {
            temperature: fullInferenceOptions.temperature,
          },
        };

        currentAssistantMessageRef.current = assistantMessage;

        // Generate response with streaming
        const startTime = Date.now();
        
        const fullResponse = await llmHook.generateResponse(
          conversationMessages,
          fullInferenceOptions,
          (token) => {
            // Update streaming content
            streamingContentRef.current += token;
            setStreamingMessage(streamingContentRef.current);
          }
        );

        const inferenceTime = Date.now() - startTime;

        // Update assistant message with complete response
        assistantMessage.content = fullResponse;
        assistantMessage.metadata = {
          ...assistantMessage.metadata,
          inferenceTime,
        };

        // Save complete assistant message
        await messageStoreHook.saveMessage(assistantMessage);

        // Clear streaming state
        setStreamingMessage('');
        streamingContentRef.current = '';
        currentAssistantMessageRef.current = null;
      } catch (err) {
        console.error('Error sending message:', err);
        
        // Clear streaming state on error
        setStreamingMessage('');
        streamingContentRef.current = '';
        currentAssistantMessageRef.current = null;
        
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [
      llmHook,
      isGenerating,
      sessionId,
      messageStoreHook,
      buildSystemPrompt,
      inferenceOptions,
    ]
  );

  /**
   * Send a quick action prompt
   */
  const sendQuickAction = useCallback(
    async (action: QuickAction) => {
      const actionPrompt = promptBuilder.getQuickActionPrompt(action);
      
      await sendMessage(actionPrompt, {
        quickAction: action,
      });
    },
    [sendMessage]
  );

  /**
   * Set conversation topic for prompt emphasis
   */
  const setTopic = useCallback((topic: MindfulnessTopic) => {
    setPromptOptions(prev => ({
      ...prev,
      userContext: {
        ...prev.userContext,
        recentTopics: [topic],
      },
    }));
  }, []);

  /**
   * Stop ongoing generation
   */
  const stopGeneration = useCallback(() => {
    llmHook.stopGeneration();
    setIsGenerating(false);
    setStreamingMessage('');
    streamingContentRef.current = '';
    currentAssistantMessageRef.current = null;
  }, [llmHook]);

  /**
   * Clear chat history
   */
  const clearChat = useCallback(async () => {
    await messageStoreHook.clearAllMessages();
    setStreamingMessage('');
    streamingContentRef.current = '';
    currentAssistantMessageRef.current = null;
  }, [messageStoreHook]);

  /**
   * Update inference options
   */
  const updateInferenceOptions = useCallback((options: Partial<InferenceOptions>) => {
    setInferenceOptions(prev => ({
      ...prev,
      ...options,
    }));
  }, []);

  /**
   * Update prompt options
   */
  const updatePromptOptions = useCallback((options: Partial<PromptOptions>) => {
    setPromptOptions(prev => ({
      ...prev,
      ...options,
    }));
  }, []);

  // Combine loading states
  const isLoading = messageStoreHook.isLoading;

  // Combine errors
  const error = messageStoreHook.error || llmHook.error;

  return {
    messages: messageStoreHook.messages,
    isGenerating,
    isLoading,
    error,
    streamingMessage,
    sendMessage,
    sendQuickAction,
    setTopic,
    stopGeneration,
    clearChat,
    updateInferenceOptions,
    updatePromptOptions,
  };
}
