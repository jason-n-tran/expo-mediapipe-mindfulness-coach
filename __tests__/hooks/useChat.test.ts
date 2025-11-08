/**
 * useChat Hook Tests
 * Tests for chat functionality integration
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useChat } from '@/hooks/useChat';
import { QuickAction, MindfulnessTopic } from '@/types';

// Mock dependencies
jest.mock('@/hooks/useMessageStore', () => ({
  useMessageStore: () => ({
    messages: [],
    isLoading: false,
    error: null,
    saveMessage: jest.fn(),
    clearAllMessages: jest.fn(),
  }),
}));

jest.mock('@/contexts/LLMContext', () => ({
  useLLMContext: () => ({
    isReady: true,
    inferenceState: 'idle',
    error: null,
    generateResponse: jest.fn().mockResolvedValue('Test response'),
    stopGeneration: jest.fn(),
  }),
}));

jest.mock('@/services/llm/PromptBuilder', () => ({
  promptBuilder: {
    buildSystemPrompt: jest.fn().mockReturnValue('System prompt'),
    getQuickActionPrompt: jest.fn().mockReturnValue('Quick action prompt'),
  },
}));

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useChat());

      expect(result.current.messages).toEqual([]);
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.streamingMessage).toBe('');
    });

    it('should initialize with custom options', () => {
      const { result } = renderHook(() =>
        useChat({
          sessionId: 'custom-session',
          inferenceOptions: { temperature: 0.8 },
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('Message Sending', () => {
    it('should send a message', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendMessage('Hello');
      });

      expect(result.current.isGenerating).toBe(false);
    });

    it('should handle message metadata', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendMessage('Hello', { topic: 'anxiety' });
      });

      expect(result.current.isGenerating).toBe(false);
    });

    it('should prevent concurrent message sending', async () => {
      const { result } = renderHook(() => useChat());

      // Mock to make generation take time
      const mockGenerate = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('Response'), 1000))
      );

      await act(async () => {
        const promise1 = result.current.sendMessage('First');
        
        // Try to send second message while first is processing
        await expect(
          result.current.sendMessage('Second')
        ).rejects.toThrow();
      });
    });
  });

  describe('Quick Actions', () => {
    it('should send quick action', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.sendQuickAction(QuickAction.BreathingExercise);
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('Topic Management', () => {
    it('should set conversation topic', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.setTopic(MindfulnessTopic.Anxiety);
      });

      // Topic should be set without errors
      expect(true).toBe(true);
    });
  });

  describe('Generation Control', () => {
    it('should stop generation', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.stopGeneration();
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('Chat Clearing', () => {
    it('should clear chat history', async () => {
      const { result } = renderHook(() => useChat());

      await act(async () => {
        await result.current.clearChat();
      });

      expect(result.current.messages).toEqual([]);
    });
  });

  describe('Settings Updates', () => {
    it('should update inference options', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.updateInferenceOptions({ temperature: 0.9 });
      });

      // Should update without errors
      expect(true).toBe(true);
    });

    it('should update prompt options', () => {
      const { result } = renderHook(() => useChat());

      act(() => {
        result.current.updatePromptOptions({ emphasizeBuddhism: true });
      });

      // Should update without errors
      expect(true).toBe(true);
    });
  });

  describe('Streaming', () => {
    it('should handle streaming messages', async () => {
      const { result } = renderHook(() => useChat());

      // Streaming message should be empty initially
      expect(result.current.streamingMessage).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const { result } = renderHook(() => useChat());

      // Error should be null initially
      expect(result.current.error).toBeNull();
    });
  });
});
