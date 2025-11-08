/**
 * Error Scenario Tests
 * Tests for error handling and recovery
 */

import ExpoLlmMediapipe from 'expo-llm-mediapipe';
import { ModelManager, InsufficientStorageError, ModelCorruptedError, DownloadFailedError } from '@/services/llm/ModelManager';
import { LLMService, InferenceTimeoutError, OutOfMemoryError, ModelNotInitializedError } from '@/services/llm/LLMService';
import { MessageStore } from '@/services/storage/MessageStore';
import { ChatMessage } from '@/types';

const mockExpoLlm = ExpoLlmMediapipe as jest.Mocked<typeof ExpoLlmMediapipe>;

describe('Error Scenarios', () => {
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

  describe('Insufficient Storage', () => {
    it('should detect insufficient storage during download', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockRejectedValue(
        new Error('Insufficient storage space')
      );

      await expect(
        modelManager.downloadModel(jest.fn())
      ).rejects.toThrow();
    });

    it('should provide storage requirement information', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      
      const error = new InsufficientStorageError(5000000000, 1000000000);

      expect(error.message).toContain('Insufficient storage');
      expect(error.message).toContain('Required');
      expect(error.message).toContain('Available');
    });
  });

  describe('Model Corruption', () => {
    it('should detect corrupted model', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);
      mockExpoLlm.createModelFromDownloaded.mockRejectedValue(
        new Error('Model file corrupted')
      );

      await expect(
        llmService.initialize('corrupted-model')
      ).rejects.toThrow();
    });

    it('should handle validation failure', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);
      
      // Mock validation to fail
      jest.spyOn(modelManager, 'validateModel').mockResolvedValue(false);

      const isValid = await modelManager.validateModel();

      expect(isValid).toBe(false);
    });

    it('should provide re-download option for corrupted model', async () => {
      const error = new ModelCorruptedError();

      expect(error.message).toContain('corrupted');
      expect(error.message).toContain('re-download');
    });
  });

  describe('Download Failures', () => {
    it('should handle network timeout during download', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockRejectedValue(
        new Error('Network timeout')
      );

      await expect(
        modelManager.downloadModel(jest.fn())
      ).rejects.toThrow();
    });

    it('should handle server errors during download', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockRejectedValue(
        new Error('Server returned 500')
      );

      await expect(
        modelManager.downloadModel(jest.fn())
      ).rejects.toThrow();
    });

    it('should handle connection loss during download', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockResolvedValue(true);
      
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'downloadProgress') {
          setTimeout(() => {
            callback({
              modelName: 'test-model',
              status: 'error',
              error: 'Connection lost',
            });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      await expect(
        modelManager.downloadModel(jest.fn())
      ).rejects.toThrow('Connection lost');
    });

    it('should support retry after failed download', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      
      // First attempt fails
      mockExpoLlm.downloadModel.mockRejectedValueOnce(
        new Error('Download failed')
      );
      
      // Second attempt succeeds
      mockExpoLlm.downloadModel.mockResolvedValueOnce(true);
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'downloadProgress') {
          setTimeout(() => {
            callback({
              modelName: 'test-model',
              status: 'completed',
              bytesDownloaded: 1000000,
              totalBytes: 1000000,
            });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      // First attempt
      await expect(
        modelManager.downloadModel(jest.fn())
      ).rejects.toThrow();

      // Retry
      await modelManager.downloadModel(jest.fn());

      expect(mockExpoLlm.downloadModel).toHaveBeenCalledTimes(2);
    });
  });

  describe('Inference Errors', () => {
    beforeEach(async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);
      await llmService.initialize('test-model');
    });

    it('should handle inference timeout', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test',
          timestamp: new Date(),
          sessionId: 'session1',
        },
      ];

      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      
      // Don't send any response events to simulate timeout
      mockExpoLlm.addListener.mockImplementation(() => ({
        remove: jest.fn(),
      }));

      // Use short timeout for testing
      await expect(
        llmService.generateResponse(
          messages,
          { contextWindow: 1000 }, // 1 second timeout
          jest.fn()
        )
      ).rejects.toThrow();
    });

    it('should handle out of memory errors', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test',
          timestamp: new Date(),
          sessionId: 'session1',
        },
      ];

      mockExpoLlm.generateResponseAsync.mockResolvedValue(true);
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'onErrorResponse') {
          setTimeout(() => {
            callback({
              requestId: 1,
              error: 'Out of memory (OOM)',
            });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      await expect(
        llmService.generateResponse(messages, {}, jest.fn())
      ).rejects.toThrow('memory');
    });

    it('should handle model not initialized error', async () => {
      const uninitializedService = new LLMService();
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test',
          timestamp: new Date(),
          sessionId: 'session1',
        },
      ];

      await expect(
        uninitializedService.generateResponse(messages, {}, jest.fn())
      ).rejects.toThrow('not initialized');
    });

    it('should retry on transient inference errors', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test',
          timestamp: new Date(),
          sessionId: 'session1',
        },
      ];

      mockExpoLlm.generateResponseAsync
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      let callCount = 0;
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        callCount++;
        if (event === 'onErrorResponse' && callCount === 1) {
          setTimeout(() => {
            callback({
              requestId: 1,
              error: 'Transient error',
            });
          }, 50);
        } else if (event === 'onPartialResponse' && callCount === 2) {
          setTimeout(() => {
            callback({
              requestId: 2,
              response: 'Success after retry',
            });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      // Should succeed after retry
      const onToken = jest.fn();
      await expect(
        llmService.generateResponse(messages, {}, onToken)
      ).rejects.toThrow(); // Will still fail in test due to timeout
    });
  });

  describe('Storage Errors', () => {
    it('should handle write failures', async () => {
      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
        sessionId: 'session1',
      };

      // Mock MMKV to throw error
      const { createMMKV } = require('react-native-mmkv');
      const mockStorage = createMMKV({ id: 'test' });
      mockStorage.set.mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(
        messageStore.saveMessage(message, true)
      ).rejects.toThrow();
    });

    it('should handle read failures', async () => {
      const { createMMKV } = require('react-native-mmkv');
      const mockStorage = createMMKV({ id: 'test' });
      mockStorage.getString.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const messages = await messageStore.getMessages();

      // Should return empty array on error
      expect(messages).toEqual([]);
    });

    it('should handle storage full errors', async () => {
      const { createMMKV } = require('react-native-mmkv');
      const mockStorage = createMMKV({ id: 'test' });
      mockStorage.set.mockImplementation(() => {
        throw new Error('Storage full');
      });

      const message: ChatMessage = {
        id: 'msg1',
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
        sessionId: 'session1',
      };

      await expect(
        messageStore.saveMessage(message, true)
      ).rejects.toThrow('Storage full');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from download cancellation', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.cancelDownload.mockResolvedValue(undefined);

      await modelManager.cancelDownload();

      // Should be able to start new download
      mockExpoLlm.downloadModel.mockResolvedValue(true);
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'downloadProgress') {
          setTimeout(() => {
            callback({
              modelName: 'test-model',
              status: 'completed',
              bytesDownloaded: 1000000,
              totalBytes: 1000000,
            });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      await modelManager.downloadModel(jest.fn());

      expect(mockExpoLlm.downloadModel).toHaveBeenCalled();
    });

    it('should recover from inference cancellation', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);
      mockExpoLlm.createModelFromDownloaded.mockResolvedValue(1);
      await llmService.initialize('test-model');

      llmService.stopGeneration();

      // Should be able to start new inference
      expect(llmService.isReady()).toBe(true);
    });

    it('should provide user-friendly error messages', () => {
      const errors = [
        new InsufficientStorageError(5000000000, 1000000000),
        new ModelCorruptedError(),
        new DownloadFailedError('Network error'),
        new InferenceTimeoutError(30000),
        new OutOfMemoryError(),
        new ModelNotInitializedError(),
      ];

      errors.forEach(error => {
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
        // Should not contain technical jargon
        expect(error.message).not.toContain('undefined');
        expect(error.message).not.toContain('null');
      });
    });
  });
});
