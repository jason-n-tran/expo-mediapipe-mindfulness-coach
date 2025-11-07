/**
 * ModelManager - Handles model download, caching, and validation
 */

import { modelManager as expoModelManager } from 'expo-llm-mediapipe';
import * as FileSystem from 'expo-file-system';
import { createMMKV } from 'react-native-mmkv';
import { APP_CONFIG, STORAGE_KEYS } from '@/constants/config';
import type { ModelStatus, DownloadProgress, ModelMetadata, ModelManagerInterface } from './types';

const storage = createMMKV();

// Model configuration
const MODEL_NAME = APP_CONFIG.model.name;
const MODEL_URL = 'https://huggingface.co/google/gemma-2b-it-gpu-int4/resolve/main/gemma-2b-it-gpu-int4.bin';

// Error types
export class ModelError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ModelError';
  }
}

export class InsufficientStorageError extends ModelError {
  constructor(required: number, available: number) {
    super(
      `Insufficient storage space. Required: ${(required / 1024 / 1024).toFixed(2)} MB, Available: ${(available / 1024 / 1024).toFixed(2)} MB`,
      'INSUFFICIENT_STORAGE'
    );
    this.name = 'InsufficientStorageError';
  }
}

export class ModelCorruptedError extends ModelError {
  constructor() {
    super('Model file is corrupted. Please re-download the model.', 'MODEL_CORRUPTED');
    this.name = 'ModelCorruptedError';
  }
}

export class DownloadFailedError extends ModelError {
  constructor(message: string) {
    super(message, 'DOWNLOAD_FAILED');
    this.name = 'DownloadFailedError';
  }
}

export class ModelManager implements ModelManagerInterface {
  private downloadStartTime: number = 0;
  private lastBytesDownloaded: number = 0;
  private downloadSpeeds: number[] = [];
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // 2 seconds

  constructor() {
    // Register the model with expo-llm-mediapipe's ModelManager
    expoModelManager.registerModel(MODEL_NAME, MODEL_URL);
  }

  /**
   * Check if model exists in cache
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const modelInfo = expoModelManager.getModelInfo(MODEL_NAME);
      return modelInfo?.status === 'downloaded';
    } catch (error) {
      console.error('Error checking model availability:', error);
      return false;
    }
  }

  /**
   * Get current model status
   */
  async getModelStatus(): Promise<ModelStatus> {
    try {
      const modelInfo = expoModelManager.getModelInfo(MODEL_NAME);
      
      if (!modelInfo) {
        return {
          isAvailable: false,
          isDownloading: false,
        };
      }

      // Get metadata from storage if available
      const metadataJson = storage.getString(STORAGE_KEYS.MODEL_METADATA);
      const metadata: ModelMetadata | undefined = metadataJson 
        ? JSON.parse(metadataJson) 
        : undefined;

      return {
        isAvailable: modelInfo.status === 'downloaded',
        isDownloading: modelInfo.status === 'downloading',
        downloadProgress: modelInfo.progress,
        modelSize: modelInfo.size || metadata?.fileSize,
        lastValidated: metadata?.lastValidated ? new Date(metadata.lastValidated) : undefined,
      };
    } catch (error) {
      console.error('Error getting model status:', error);
      return {
        isAvailable: false,
        isDownloading: false,
      };
    }
  }

  /**
   * Get cached model file path
   */
  async getModelPath(): Promise<string> {
    try {
      const isAvailable = await this.isModelAvailable();
      if (!isAvailable) {
        throw new Error('Model is not available. Please download it first.');
      }

      // The expo-llm-mediapipe stores models in a specific directory
      // We'll use the model name to construct the path
      const modelDir = `${FileSystem.documentDirectory}models/`;
      const modelPath = `${modelDir}${MODEL_NAME}.bin`;

      return modelPath;
    } catch (error) {
      console.error('Error getting model path:', error);
      throw error;
    }
  }

  /**
   * Download model with progress tracking and retry logic
   * Integrates expo-llm-mediapipe download API with progress callbacks
   */
  async downloadModel(onProgress: (progress: DownloadProgress) => void): Promise<void> {
    // Check if already downloaded
    const isAvailable = await this.isModelAvailable();
    if (isAvailable) {
      console.log('Model already downloaded');
      return;
    }

    // Check storage space before download
    await this.checkStorageSpace();

    // Attempt download with retry logic
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Download attempt ${attempt}/${this.maxRetries}`);
        await this.attemptDownload(onProgress);
        
        // Validate after download
        const isValid = await this.validateModel();
        if (!isValid) {
          throw new ModelCorruptedError();
        }
        
        return; // Success
      } catch (error) {
        lastError = error as Error;
        console.error(`Download attempt ${attempt} failed:`, error);
        
        // Don't retry on insufficient storage
        if (error instanceof InsufficientStorageError) {
          throw error;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }
    
    // All retries failed
    throw new DownloadFailedError(
      `Failed to download model after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Attempt a single download
   */
  private async attemptDownload(onProgress: (progress: DownloadProgress) => void): Promise<void> {
    this.downloadStartTime = Date.now();
    this.lastBytesDownloaded = 0;
    this.downloadSpeeds = [];

    let unsubscribe: (() => void) | null = null;

    try {
      // Set up progress listener
      unsubscribe = expoModelManager.addListener((models) => {
        const modelInfo = models.get(MODEL_NAME);
        
        if (modelInfo) {
          if (modelInfo.status === 'downloading') {
            const bytesDownloaded = modelInfo.size && modelInfo.progress 
              ? Math.floor(modelInfo.size * modelInfo.progress / 100)
              : 0;
            
            const totalBytes = modelInfo.size || 0;
            const percentage = modelInfo.progress || 0;

            // Calculate ETA
            const estimatedTimeRemaining = this.calculateETA(bytesDownloaded, totalBytes);

            onProgress({
              bytesDownloaded,
              totalBytes,
              percentage,
              estimatedTimeRemaining,
            });

            // Update last bytes for speed calculation
            this.lastBytesDownloaded = bytesDownloaded;
          } else if (modelInfo.status === 'downloaded') {
            // Final progress update
            const totalBytes = modelInfo.size || 0;
            onProgress({
              bytesDownloaded: totalBytes,
              totalBytes,
              percentage: 100,
              estimatedTimeRemaining: 0,
            });
          } else if (modelInfo.status === 'error') {
            console.error('Download error:', modelInfo.error);
          }
        }
      });

      // Start download
      const success = await expoModelManager.downloadModel(MODEL_NAME, {
        overwrite: false,
        timeout: 300000, // 5 minutes timeout
      });

      if (!success) {
        throw new Error('Model download failed');
      }

      // Store metadata after successful download
      await this.storeModelMetadata();
    } finally {
      // Clean up listener
      if (unsubscribe) {
        unsubscribe();
      }
    }
  }

  /**
   * Validate model integrity with checksum verification
   */
  async validateModel(): Promise<boolean> {
    try {
      const isAvailable = await this.isModelAvailable();
      if (!isAvailable) {
        console.log('Model not available for validation');
        return false;
      }

      // Get model path and check if file exists
      const modelPath = await this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);

      if (!fileInfo.exists) {
        console.log('Model file does not exist');
        return false;
      }

      // Verify file size matches expected size
      const metadataJson = storage.getString(STORAGE_KEYS.MODEL_METADATA);
      if (metadataJson) {
        const metadata: ModelMetadata = JSON.parse(metadataJson);
        
        // Check if file size matches
        if (metadata.fileSize > 0 && fileInfo.size !== metadata.fileSize) {
          console.error('Model file size mismatch');
          return false;
        }

        // Calculate and verify checksum if available
        if (metadata.checksum) {
          const calculatedChecksum = await this.calculateChecksum(modelPath);
          if (calculatedChecksum !== metadata.checksum) {
            console.error('Model checksum mismatch');
            return false;
          }
        }

        // Update last validated timestamp
        metadata.lastValidated = new Date();
        storage.set(STORAGE_KEYS.MODEL_METADATA, JSON.stringify(metadata));
      }

      console.log('Model validation successful');
      return true;
    } catch (error) {
      console.error('Error validating model:', error);
      return false;
    }
  }

  /**
   * Calculate checksum for model file
   * Note: For large files, this is a simplified version
   * In production, you might want to use a native module for better performance
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    try {
      // For now, we'll use file size and modification time as a simple checksum
      // In a production app, you'd want to use a proper hash function
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      const checksum = `${fileInfo.size}-${fileInfo.modificationTime}`;
      return checksum;
    } catch (error) {
      console.error('Error calculating checksum:', error);
      return '';
    }
  }

  /**
   * Delete cached model for cleanup
   */
  async deleteModel(): Promise<void> {
    try {
      const success = await expoModelManager.deleteModel(MODEL_NAME);
      
      if (!success) {
        throw new ModelError('Failed to delete model', 'DELETE_FAILED');
      }

      // Remove metadata from storage
      storage.delete(STORAGE_KEYS.MODEL_METADATA);
      console.log('Model deleted successfully');
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  /**
   * Check if sufficient storage space is available
   */
  private async checkStorageSpace(): Promise<void> {
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      const requiredSpace = 2 * 1024 * 1024 * 1024; // 2GB estimated model size
      
      if (freeDiskStorage < requiredSpace) {
        throw new InsufficientStorageError(requiredSpace, freeDiskStorage);
      }
    } catch (error) {
      if (error instanceof InsufficientStorageError) {
        throw error;
      }
      console.warn('Could not check storage space:', error);
      // Continue anyway if we can't check storage
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Store model metadata in MMKV after successful download
   */
  private async storeModelMetadata(): Promise<void> {
    try {
      const modelPath = await this.getModelPath();
      const fileInfo = await FileSystem.getInfoAsync(modelPath);

      if (!fileInfo.exists) {
        throw new ModelError('Model file not found after download', 'FILE_NOT_FOUND');
      }

      const modelInfo = expoModelManager.getModelInfo(MODEL_NAME);
      
      // Calculate checksum
      const checksum = await this.calculateChecksum(modelPath);

      const metadata: ModelMetadata = {
        modelName: MODEL_NAME,
        version: '1.0.0', // Could be extracted from model info
        downloadDate: new Date(),
        fileSize: fileInfo.size || modelInfo?.size || 0,
        checksum,
        lastValidated: new Date(),
        filePath: modelPath,
      };

      storage.set(STORAGE_KEYS.MODEL_METADATA, JSON.stringify(metadata));
      console.log('Model metadata stored successfully');
    } catch (error) {
      console.error('Error storing model metadata:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated time remaining for download
   */
  private calculateETA(bytesDownloaded: number, totalBytes: number): number | undefined {
    if (totalBytes === 0 || bytesDownloaded === 0) {
      return undefined;
    }

    const elapsedTime = Date.now() - this.downloadStartTime;
    const bytesPerMs = bytesDownloaded / elapsedTime;
    const remainingBytes = totalBytes - bytesDownloaded;
    const estimatedMs = remainingBytes / bytesPerMs;

    return Math.floor(estimatedMs / 1000); // Convert to seconds
  }
}

// Export singleton instance
export const modelManager = new ModelManager();
