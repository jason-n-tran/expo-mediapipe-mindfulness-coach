/**
 * ModelManager Tests
 * Tests for model download flow, caching, and validation
 */

import ExpoLlmMediapipe from 'expo-llm-mediapipe';
import { ModelManager } from '@/services/llm/ModelManager';
import { createMMKV } from 'react-native-mmkv';

// Mock implementations
const mockMMKV = createMMKV({ id: 'test' });
const mockExpoLlm = ExpoLlmMediapipe as jest.Mocked<typeof ExpoLlmMediapipe>;

describe('ModelManager', () => {
  let modelManager: ModelManager;
  let mockProgressCallback: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    modelManager = new ModelManager();
    mockProgressCallback = jest.fn();
  });

  afterEach(() => {
    modelManager.cleanup();
  });

  describe('Model Availability', () => {
    it('should check if model is available', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);

      const isAvailable = await modelManager.isModelAvailable();

      expect(isAvailable).toBe(true);
      expect(mockExpoLlm.isModelDownloaded).toHaveBeenCalled();
    });

    it('should return false when model is not available', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);

      const isAvailable = await modelManager.isModelAvailable();

      expect(isAvailable).toBe(false);
    });

    it('should handle errors when checking availability', async () => {
      mockExpoLlm.isModelDownloaded.mockRejectedValue(new Error('Check failed'));

      const isAvailable = await modelManager.isModelAvailable();

      expect(isAvailable).toBe(false);
    });
  });

  describe('Model Status', () => {
    it('should return correct status when model is available', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);

      const status = await modelManager.getModelStatus();

      expect(status.isAvailable).toBe(true);
      expect(status.isDownloading).toBe(false);
    });

    it('should return correct status when model is not available', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);

      const status = await modelManager.getModelStatus();

      expect(status.isAvailable).toBe(false);
    });
  });

  describe('Model Download', () => {
    it('should skip download if model already exists', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);

      await modelManager.downloadModel(mockProgressCallback);

      expect(mockExpoLlm.downloadModel).not.toHaveBeenCalled();
    });

    it('should download model with progress updates', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockResolvedValue(true);
      
      // Mock listener to simulate download progress
      let progressListener: any;
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'downloadProgress') {
          progressListener = callback;
          // Simulate progress events
          setTimeout(() => {
            callback({
              modelName: 'gemma-3n-E4B-it-int4',
              status: 'downloading',
              bytesDownloaded: 1000000,
              totalBytes: 2000000,
            });
            setTimeout(() => {
              callback({
                modelName: 'gemma-3n-E4B-it-int4',
                status: 'completed',
                bytesDownloaded: 2000000,
                totalBytes: 2000000,
              });
            }, 100);
          }, 50);
        }
        return { remove: jest.fn() };
      });

      await modelManager.downloadModel(mockProgressCallback);

      expect(mockExpoLlm.downloadModel).toHaveBeenCalled();
      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should handle download errors', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockRejectedValue(new Error('Download failed'));

      await expect(
        modelManager.downloadModel(mockProgressCallback)
      ).rejects.toThrow();
    });

    it('should handle download cancellation', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);
      mockExpoLlm.downloadModel.mockResolvedValue(true);
      
      mockExpoLlm.addListener.mockImplementation((event, callback) => {
        if (event === 'downloadProgress') {
          setTimeout(() => {
            callback({
              modelName: 'gemma-3n-E4B-it-int4',
              status: 'cancelled',
            });
          }, 50);
        }
        return { remove: jest.fn() };
      });

      await expect(
        modelManager.downloadModel(mockProgressCallback)
      ).rejects.toThrow('cancelled');
    });
  });

  describe('Model Validation', () => {
    it('should validate available model', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);

      const isValid = await modelManager.validateModel();

      expect(isValid).toBe(true);
    });

    it('should return false for unavailable model', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);

      const isValid = await modelManager.validateModel();

      expect(isValid).toBe(false);
    });

    it('should handle validation errors', async () => {
      mockExpoLlm.isModelDownloaded.mockRejectedValue(new Error('Validation failed'));

      const isValid = await modelManager.validateModel();

      expect(isValid).toBe(false);
    });
  });

  describe('Model Caching', () => {
    it('should return model path when available', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(true);

      const modelPath = await modelManager.getModelPath();

      expect(modelPath).toBeTruthy();
      expect(typeof modelPath).toBe('string');
    });

    it('should throw error when model not available', async () => {
      mockExpoLlm.isModelDownloaded.mockResolvedValue(false);

      await expect(modelManager.getModelPath()).rejects.toThrow(
        'Model is not available'
      );
    });
  });

  describe('Download Cancellation', () => {
    it('should cancel ongoing download', async () => {
      mockExpoLlm.cancelDownload.mockResolvedValue(undefined);

      await modelManager.cancelDownload();

      expect(mockExpoLlm.cancelDownload).toHaveBeenCalled();
    });

    it('should handle cancellation errors', async () => {
      mockExpoLlm.cancelDownload.mockRejectedValue(new Error('Cancel failed'));

      await expect(modelManager.cancelDownload()).rejects.toThrow();
    });
  });
});
