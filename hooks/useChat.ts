/**
 * useChat Hook
 * Combines useMessageStore and useLLM for complete chat functionality
 * Manages conversation state and message flow
 * Handles sending messages and receiving responses
 * Integrates PromptBuilder for system prompt construction
 */

import 'react-native-get-random-values';
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMessageStore } from './useMessageStore';
import { useLLMContext } from '@/contexts/LLMContext';
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
  isReady: boolean;
  error: string | null;
  streamingMessage: string;
  sendMessage: (content: string, metadata?: ChatMessage['metadata']) => Promise<void>;
  sendQuickAction: (action: QuickAction) => Promise<void>;
  setTopic: (topic: MindfulnessTopic) => void;
  stopGeneration: () => void;
  clearChat: () => Promise<void>;
  deleteMessages: (messageIds: string[]) => Promise<void>;
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
  const llmHook = useLLMContext();

  // Local state - use a persistent session ID or null to show all messages
  const [sessionId] = useState<string | null>(initialSessionId || null);
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
      console.log('[useChat] sendMessage called');
      console.log('[useChat] llmHook:', llmHook);
      console.log('[useChat] llmHook.isReady:', llmHook.isReady);
      console.log('[useChat] llmHook.inferenceState:', llmHook.inferenceState);
      console.log('[useChat] llmHook.error:', llmHook.error);
      
      // Check isReady at call time, not at callback creation time
      if (!llmHook.isReady) {
        console.error('[useChat] LLM not ready!');
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
          sessionId: sessionId || 'default',
          metadata,
        };

        // Save user message with immediate write for responsiveness
        await messageStoreHook.saveMessage(userMessage, true);

        // Prepare messages for inference (include conversation history)
        // Keep only the last 10 messages to avoid context overflow
        const recentMessages = messageStoreHook.messages.slice(-10);
        const conversationMessages = [...recentMessages, userMessage];

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
          sessionId: sessionId || 'default',
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

        console.log('[useChat] Generation complete. Full response length:', fullResponse.length);
        console.log('[useChat] Streaming content length:', streamingContentRef.current.length);
        
        // Create a new message object with the complete response
        const completedAssistantMessage: ChatMessage = {
          ...assistantMessage,
          content: fullResponse,
          metadata: {
            ...assistantMessage.metadata,
            inferenceTime,
          },
        };

        console.log('[useChat] Saving assistant message with content length:', completedAssistantMessage.content.length);
        
        // Save complete assistant message with immediate write
        await messageStoreHook.saveMessage(completedAssistantMessage, true);
        
        console.log('[useChat] Message saved successfully');

        // Small delay to ensure the message store state update has propagated
        await new Promise(resolve => setTimeout(resolve, 100));
        // Debug: Log full contents of messageStore
        console.log('[useChat] Full messageStore contents:', {
          messages: messageStoreHook.messages,
          isLoading: messageStoreHook.isLoading,
          error: messageStoreHook.error,
          totalMessages: messageStoreHook.messages.length,
        });
        

        // Clear streaming state
        setStreamingMessage('');
        streamingContentRef.current = '';
        currentAssistantMessageRef.current = null;
        
        console.log('[useChat] Streaming state cleared, message should now be visible in list');
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

  // Extract isReady to a separate variable to ensure it triggers re-renders
  const llmIsReady = llmHook.isReady;
  
  // Debug: Log when llmIsReady changes
  useEffect(() => {
    console.log('[useChat] llmIsReady changed:', llmIsReady);
  }, [llmIsReady]);

  return {
    messages: messageStoreHook.messages,
    isGenerating,
    isLoading,
    isReady: llmIsReady,
    error,
    streamingMessage,
    sendMessage,
    sendQuickAction,
    setTopic,
    stopGeneration,
    clearChat,
    deleteMessages: messageStoreHook.deleteMessages,
    updateInferenceOptions,
    updatePromptOptions,
  };
}
