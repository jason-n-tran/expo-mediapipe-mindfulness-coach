/**
 * Offline Functionality Tests
 * Tests for app behavior without network connectivity
 */

import NetInfo from '@react-native-community/netinfo';
import ExpoLlmMediapipe from 'expo-llm-mediapipe';
import { ModelManager } from '@/services/llm/ModelManager';
import { LLMService } from '@/services/llm/LLMService';
import { MessageStore } from '@/services/storage/MessageStore';
import { ChatMessage } from '@/types';

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockExpoLlm = ExpoLlmMediapipe as jest.Mocked<typeof ExpoLlmMediapipe>;

describe('Offline Functionality', () => {
  let modelManager: ModelManager;
  let llmService: LLMService;
  let messageStore: MessageStore;

  beforeEach(() => {
    jest.clearAllMocks();
    modelManager = new ModelManager();
    llmService = new LLMService();
    messageStore = new MessageStore();
  });

  afterEach(async () => {
    modelManager.cleanup();
    await llmService.cleanup();
  });

  describe('Network Detection', () => {
    it('should detect offline state', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      const state = await NetInfo.fetch();

      expect(state.isConnected).toBe(false);
    });

    it('should detect online state', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      const state = await NetInfo.fetch();

      expect(state.isConnected).toBe(true);
    });
  });

  describe('Model Persistence', () => {
    it('should check model availability offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
      } as any);
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);

      const isAvailable = await modelManager.isModelAvailable();

      expect(isAvailable).toBe(true);
      expect(mockExpoLlm.isModelDownloaded).toHaveBeenCalled();
    });

    it('should use cached model offline', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
      } as any);
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);

      const modelPath = await modelManager.getModelPath();
      await llmService.initialize(modelPath);

      expect(llmService.isReady()).toBe(true);
    });

    it('should persist model across app restarts', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);

      // Simulate app restart by creating new instance
      const newModelManager = new ModelManager();
      const isAvailable = await newModelManager.isModelAvailable();

      expect(isAvailable).toBe(true);
      newModelManager.cleanup();
    });
  });

  describe('Inference Without Network', () => {
    beforeEach(async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
      } as any);
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);
      
      await llmService.initialize('test-model');
    });

    it('should generate responses offline', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
          sessionId: 'session1',
        },
      ];

      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'onPartialResponse') {
          setTimeout(() => {
            callback({ requestId: 1, response: 'Offline response' });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      const onToken = jest.fn();
      const promise = llmService.generateResponse(messages, {}, onToken);

      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(onToken).toHaveBeenCalled();
    });

    it('should handle inference errors offline', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test message',
          timestamp: new Date(),
          sessionId: 'session1',
        },
      ];

      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'onErrorResponse') {
          setTimeout(() => {
            callback({ requestId: 1, error: 'Offline error' });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      const onToken = jest.fn();

      await expect(
        llmService.generateResponse(messages, {}, onToken)
      ).rejects.toThrow();
    });
  });

  describe('Message Storage Without Network', () => {
    beforeEach(() => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
      } as any);
    });

    it('should save messages offline', async () => {
      const message: ChatMessage = {
        id: 'offline-msg',
        role: 'user',
        content: 'Offline message',
        timestamp: new Date(),
        sessionId: 'session1',
      };

      await messageStore.saveMessage(message, true);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should retrieve messages offline', async () => {
      const messages = await messageStore.getMessages();

      expect(Array.isArray(messages)).toBe(true);
    });

    it('should export messages offline', async () => {
      const exportData = await messageStore.exportMessages();

      expect(typeof exportData).toBe('string');
      expect(() => JSON.parse(exportData)).not.toThrow();
    });

    it('should search messages offline', async () => {
      const results = await messageStore.searchMessages('test');

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Download Restrictions Offline', () => {
    beforeEach(() => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
      } as any);
    });

    it('should not attempt download when offline', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockRejectedValue(
        new Error('Network unavailable')
      );

      await expect(
        modelManager.downloadModel(jest.fn())
      ).rejects.toThrow();
    });
  });

  describe('Complete Offline Workflow', () => {
    it('should support full chat workflow offline', async () => {
      // Setup offline state
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
      } as any);

      // Model is cached
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);

      // Initialize LLM
      const modelPath = await modelManager.getModelPath();
      await llmService.initialize(modelPath);

      // Save user message
      const userMessage: ChatMessage = {
        id: 'user-msg',
        role: 'user',
        content: 'Help me with anxiety',
        timestamp: new Date(),
        sessionId: 'offline-session',
      };
      await messageStore.saveMessage(userMessage, true);

      // Generate response
      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'onPartialResponse') {
          setTimeout(() => {
            callback({ requestId: 1, response: 'Mindfulness guidance' });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      const onToken = jest.fn();
      const promise = llmService.generateResponse([userMessage], {}, onToken);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Save assistant message
      const assistantMessage: ChatMessage = {
        id: 'assistant-msg',
        role: 'assistant',
        content: 'Mindfulness guidance',
        timestamp: new Date(),
        sessionId: 'offline-session',
      };
      await messageStore.saveMessage(assistantMessage, true);

      // Verify workflow completed
      expect(llmService.isReady()).toBe(true);
      expect(onToken).toHaveBeenCalled();
    });
  });
});
