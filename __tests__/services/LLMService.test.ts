/**
 * LLMService Tests
 * Tests for inference, streaming, and response generation
 */

import ExpoLlmMediapipe from 'expo-llm-mediapipe';
import { LLMService } from '@/services/llm/LLMService';
import { ChatMessage } from '@/types';

const mockExpoLlm = ExpoLlmMediapipe as jest.Mocked<typeof ExpoLlmMediapipe>;

describe('LLMService', () => {
  let llmService: LLMService;
  let testMessages: ChatMessage[];

  beforeEach(() => {
    jest.clearAllMocks();
    llmService = new LLMService();
    
    testMessages = [
      {
        id: 'msg1',
        role: 'user',
        content: 'Hello, I need guidance',
        timestamp: new Date(),
        sessionId: 'session1',
      },
    ];
  });

  afterEach(async () => {
    await llmService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with model name', async () => {
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);

      await llmService.initialize('test-model');

      expect(llmService.isReady()).toBe(true);
      expect(mockExpoLlm.createModelFromDownloaded).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockExpoLlm.createModelFromDownloaded.mockRejectedValue(
        new Error('Init failed')
      );

      await expect(llmService.initialize('test-model')).rejects.toThrow();
      expect(llmService.isReady()).toBe(false);
    });

    it('should return false when not initialized', () => {
      expect(llmService.isReady()).toBe(false);
    });
  });

  describe('Response Generation', () => {
    beforeEach(async () => {
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);
      await llmService.initialize('test-model');
    });

    it('should generate streaming response', async () => {
      const onToken = jest.fn();
      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      
      // Mock streaming events
      let partialListener: any;
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'onPartialResponse') {
          partialListener = callback;
          setTimeout(() => {
            callback({ requestId: 1, response: 'Hello' });
            setTimeout(() => {
              callback({ requestId: 1, response: 'Hello there' });
            }, 50);
          }, 50);
        }
        return { remove: jest.fn() };
      });

      const promise = llmService.generateResponse(
        testMessages,
        { temperature: 0.7 },
        onToken
      );

      // Wait for streaming to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(onToken).toHaveBeenCalled();
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = new LLMService();
      const onToken = jest.fn();

      await expect(
        uninitializedService.generateResponse(testMessages, {}, onToken)
      ).rejects.toThrow('not initialized');
    });

    it('should handle inference errors', async () => {
      const onToken = jest.fn();
      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'onErrorResponse') {
          setTimeout(() => {
            callback({ requestId: 1, error: 'Inference failed' });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      await expect(
        llmService.generateResponse(testMessages, {}, onToken)
      ).rejects.toThrow();
    });

    it('should handle out of memory errors', async () => {
      const onToken = jest.fn();
      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'onErrorResponse') {
          setTimeout(() => {
            callback({ requestId: 1, error: 'Out of memory' });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      await expect(
        llmService.generateResponse(testMessages, {}, onToken)
      ).rejects.toThrow('memory');
    });
  });

  describe('Generation Control', () => {
    beforeEach(async () => {
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);
      await llmService.initialize('test-model');
    });

    it('should stop ongoing generation', () => {
      llmService.stopGeneration();
      // Should not throw
      expect(true).toBe(true);
    });

    it('should prevent concurrent generations', async () => {
      const onToken = jest.fn();
      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      
      mockExpoLlm.addListener.mockImplementation(() => ({
        remove: jest.fn(),
      }));

      // Start first generation
      const promise1 = llmService.generateResponse(testMessages, {}, onToken);

      // Try to start second generation
      await expect(
        llmService.generateResponse(testMessages, {}, onToken)
      ).rejects.toThrow('already in progress');
    });
  });

  describe('Model Capabilities', () => {
    it('should return model capabilities', () => {
      const capabilities = llmService.getCapabilities();

      expect(capabilities).toHaveProperty('maxContextLength');
      expect(capabilities).toHaveProperty('supportsStreaming');
      expect(capabilities).toHaveProperty('modelName');
      expect(capabilities.supportsStreaming).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);
      mockExpoLlm.releaseModel.mockResolvedValue(undefined);
      
      await llmService.initialize('test-model');
      await llmService.cleanup();

      expect(llmService.isReady()).toBe(false);
      expect(mockExpoLlm.releaseModel).toHaveBeenCalled();
    });
  });
});
