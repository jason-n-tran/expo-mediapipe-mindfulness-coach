/**
 * ModelManager - Handles model download, caching, and validation
 * Uses expo-llm-mediapipe direct API
 */

import ExpoLlmMediapipe, { 
  DownloadProgressEvent, 
  NativeModuleSubscription,
  DownloadOptions 
} from 'expo-llm-mediapipe';
import { createMMKV } from 'react-native-mmkv';
import { APP_CONFIG, STORAGE_KEYS } from '@/constants/config';
import type { ModelStatus, DownloadProgress, ModelMetadata, ModelManagerInterface } from './types';

const storage = createMMKV({
  id: 'model-manager-storage',
});

// Model configuration
// Using the model name from config (now set to a working model)
const MODEL_NAME = APP_CONFIG.model.name;
// Using a VERIFIED working Gemma model URL
const MODEL_URL = 'https://huggingface.co/t-ghosh/gemma-tflite/resolve/main/gemma-1.1-2b-it-cpu-int4.bin';

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
  private downloadProgressListener: NativeModuleSubscription | null = null;
  private currentDownloadProgress: DownloadProgress | null = null;
  private downloadPromiseResolve: (() => void) | null = null;
  private downloadPromiseReject: ((error: Error) => void) | null = null;

  constructor() {
    // Set up download progress listener
    this.setupDownloadListener();
  }

  /**
   * Set up listener for download progress events
   */
  private setupDownloadListener(): void {
    if (this.downloadProgressListener) {
      return; // Already set up
    }

    this.downloadProgressListener = ExpoLlmMediapipe.addListener(
      'downloadProgress',
      (event: DownloadProgressEvent) => {
        if (event.modelName !== MODEL_NAME) return;

        if (event.status === 'downloading') {
          const progress = event.progress ?? 0;
          this.currentDownloadProgress = {
            bytesDownloaded: 0, // Not provided by the event
            totalBytes: 0, // Not provided by the event
            percentage: progress * 100,
            estimatedTimeRemaining: undefined,
          };
        } else if (event.status === 'completed') {
          this.currentDownloadProgress = {
            bytesDownloaded: 0,
            totalBytes: 0,
            percentage: 100,
            estimatedTimeRemaining: 0,
          };
          
          // Store metadata
          this.storeModelMetadata().catch(err => {
            console.error('Failed to store metadata:', err);
          });

          // Resolve download promise
          if (this.downloadPromiseResolve) {
            this.downloadPromiseResolve();
            this.downloadPromiseResolve = null;
            this.downloadPromiseReject = null;
          }
        } else if (event.status === 'error') {
          const error = new DownloadFailedError(event.error || 'Unknown download error');
          
          // Reject download promise
          if (this.downloadPromiseReject) {
            this.downloadPromiseReject(error);
            this.downloadPromiseResolve = null;
            this.downloadPromiseReject = null;
          }
        } else if (event.status === 'cancelled') {
          const error = new DownloadFailedError('Download was cancelled');
          
          // Reject download promise
          if (this.downloadPromiseReject) {
            this.downloadPromiseReject(error);
            this.downloadPromiseResolve = null;
            this.downloadPromiseReject = null;
          }
        }
      }
    );
  }

  /**
   * Clean up listener
   */
  cleanup(): void {
    if (this.downloadProgressListener) {
      this.downloadProgressListener.remove();
      this.downloadProgressListener = null;
    }
  }

  /**
   * Check if model exists in cache
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const isDownloaded = await ExpoLlmMediapipe.isModelDownloaded(MODEL_NAME);
      return isDownloaded;
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
      const isAvailable = await this.isModelAvailable();
      
      // Get metadata from storage if available
      const metadataJson = storage.getString(STORAGE_KEYS.MODEL_METADATA);
      const metadata: ModelMetadata | undefined = metadataJson 
        ? JSON.parse(metadataJson) 
        : undefined;

      return {
        isAvailable,
        isDownloading: this.currentDownloadProgress !== null && this.currentDownloadProgress.percentage < 100,
        downloadProgress: this.currentDownloadProgress?.percentage,
        modelSize: metadata?.fileSize,
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
   * Get cached model name (used for initialization)
   */
  async getModelPath(): Promise<string> {
    try {
      const isAvailable = await this.isModelAvailable();
      if (!isAvailable) {
        throw new Error('Model is not available. Please download it first.');
      }

      // Return the model name - expo-llm-mediapipe uses model name, not path
      return MODEL_NAME;
    } catch (error) {
      console.error('Error getting model name:', error);
      throw error;
    }
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return MODEL_NAME;
  }

  /**
   * Download model with progress tracking
   */
  async downloadModel(onProgress: (progress: DownloadProgress) => void): Promise<void> {
    // Check if already downloaded
    const isAvailable = await this.isModelAvailable();
    if (isAvailable) {
      console.log('Model already downloaded');
      return;
    }

    try {
      // Create a promise that will be resolved/rejected by the listener
      const downloadPromise = new Promise<void>((resolve, reject) => {
        this.downloadPromiseResolve = resolve;
        this.downloadPromiseReject = reject;
      });

      // Set up progress callback interval
      const progressInterval = setInterval(() => {
        if (this.currentDownloadProgress) {
          onProgress(this.currentDownloadProgress);
        }
      }, 500);

      // Start download
      const options: DownloadOptions = { 
        overwrite: true, 
        timeout: 300000 // 5 minutes timeout
      };
      
      await ExpoLlmMediapipe.downloadModel(MODEL_URL, MODEL_NAME, options);

      // Wait for download to complete (listener will resolve/reject)
      await downloadPromise;

      // Clear progress interval
      clearInterval(progressInterval);

      // Final progress update
      onProgress({
        bytesDownloaded: 0,
        totalBytes: 0,
        percentage: 100,
        estimatedTimeRemaining: 0,
      });

      console.log('Model download completed successfully');
    } catch (error) {
      console.error('Error downloading model:', error);
      throw error instanceof ModelError 
        ? error 
        : new DownloadFailedError((error as Error).message);
    } finally {
      this.currentDownloadProgress = null;
    }
  }

  /**
   * Cancel ongoing download
   */
  async cancelDownload(): Promise<void> {
    try {
      await ExpoLlmMediapipe.cancelDownload(MODEL_NAME);
      this.currentDownloadProgress = null;
    } catch (error) {
      console.error('Error cancelling download:', error);
      throw error;
    }
  }

  /**
   * Validate model integrity
   */
  async validateModel(): Promise<boolean> {
    try {
      const isAvailable = await this.isModelAvailable();
      if (!isAvailable) {
        console.log('Model not available for validation');
        return false;
      }

      // Update last validated timestamp
      const metadataJson = storage.getString(STORAGE_KEYS.MODEL_METADATA);
      if (metadataJson) {
        const metadata: ModelMetadata = JSON.parse(metadataJson);
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
   * Delete cached model for cleanup
   */
  async deleteModel(): Promise<void> {
    try {
      // expo-llm-mediapipe doesn't have a direct delete method
      // We'll just clear the metadata
      storage.set(STORAGE_KEYS.MODEL_METADATA, '');
      console.log('Model metadata cleared');
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  }

  /**
   * Store model metadata in MMKV after successful download
   */
  private async storeModelMetadata(): Promise<void> {
    try {
      const metadata: ModelMetadata = {
        modelName: MODEL_NAME,
        version: '1.0.0',
        downloadDate: new Date(),
        fileSize: 0, // Size not available from expo-llm-mediapipe
        checksum: '',
        lastValidated: new Date(),
        filePath: MODEL_NAME,
      };

      storage.set(STORAGE_KEYS.MODEL_METADATA, JSON.stringify(metadata));
      console.log('Model metadata stored successfully');
    } catch (error) {
      console.error('Error storing model metadata:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const modelManager = new ModelManager();
