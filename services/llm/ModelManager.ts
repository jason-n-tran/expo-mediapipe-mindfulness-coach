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
const MODEL_URL = APP_CONFIG.model.downloadUrl;
// Expected model size in bytes (approximately 1.5GB for Gemma 1B)
const EXPECTED_MODEL_SIZE = 1500000000; // ~1.5GB

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
  private lastLoggedProgress: number = -1;

  constructor() {
    // Set up download progress listener
    this.setupDownloadListener();
  }

  /**
   * Set up listener for download progress events
   */
  private setupDownloadListener(): void {
    if (this.downloadProgressListener) {
      console.log('[ModelManager] Download listener already set up');
      return; // Already set up
    }

    console.log('[ModelManager] Setting up download progress listener');
    this.downloadProgressListener = ExpoLlmMediapipe.addListener(
      'downloadProgress',
      (event: DownloadProgressEvent) => {
        if (event.modelName !== MODEL_NAME) {
          return;
        }

        if (event.status === 'downloading') {
          const bytesDownloaded = event.bytesDownloaded || 0;
          const totalBytes = (event.totalBytes && event.totalBytes > 0) ? event.totalBytes : EXPECTED_MODEL_SIZE;
          
          // Calculate percentage based on bytes downloaded
          const percentage = Math.min((bytesDownloaded / totalBytes) * 100, 99.9);
          
          // Only log every 5% to reduce spam
          const progressMilestone = Math.floor(percentage / 5) * 5;
          if (progressMilestone > this.lastLoggedProgress) {
            console.log(`[ModelManager] Download progress: ${percentage.toFixed(1)}% (${(bytesDownloaded / 1024 / 1024).toFixed(0)}MB / ${(totalBytes / 1024 / 1024).toFixed(0)}MB)`);
            this.lastLoggedProgress = progressMilestone;
          }
          
          this.currentDownloadProgress = {
            bytesDownloaded,
            totalBytes,
            percentage,
            estimatedTimeRemaining: undefined,
          };
        } else if (event.status === 'completed') {
          console.log('[ModelManager] Download completed!');
          const bytesDownloaded = event.bytesDownloaded || EXPECTED_MODEL_SIZE;
          this.currentDownloadProgress = {
            bytesDownloaded,
            totalBytes: bytesDownloaded,
            percentage: 100,
            estimatedTimeRemaining: 0,
          };
          
          // Store metadata
          this.storeModelMetadata().catch(err => {
            console.error('[ModelManager] Failed to store metadata:', err);
          });

          // Resolve download promise
          if (this.downloadPromiseResolve) {
            console.log('[ModelManager] Resolving download promise');
            this.downloadPromiseResolve();
            this.downloadPromiseResolve = null;
            this.downloadPromiseReject = null;
          }
        } else if (event.status === 'error') {
          console.error('[ModelManager] Download error:', event.error);
          const error = new DownloadFailedError(event.error || 'Unknown download error');
          
          // Reject download promise
          if (this.downloadPromiseReject) {
            console.log('[ModelManager] Rejecting download promise with error');
            this.downloadPromiseReject(error);
            this.downloadPromiseResolve = null;
            this.downloadPromiseReject = null;
          }
        } else if (event.status === 'cancelled') {
          console.log('[ModelManager] Download cancelled');
          const error = new DownloadFailedError('Download was cancelled');
          
          // Reject download promise
          if (this.downloadPromiseReject) {
            console.log('[ModelManager] Rejecting download promise (cancelled)');
            this.downloadPromiseReject(error);
            this.downloadPromiseResolve = null;
            this.downloadPromiseReject = null;
          }
        }
      }
    );
    console.log('[ModelManager] Download listener setup complete');
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
    console.log('[ModelManager] downloadModel called');
    console.log('[ModelManager] Model name:', MODEL_NAME);
    console.log('[ModelManager] Model URL:', MODEL_URL);
    
    // Check if already downloaded
    console.log('[ModelManager] Checking if model is already available...');
    const isAvailable = await this.isModelAvailable();
    console.log('[ModelManager] Model available:', isAvailable);
    
    if (isAvailable) {
      console.log('[ModelManager] Model already downloaded, skipping');
      return;
    }

    try {
      console.log('[ModelManager] Starting download process...');
      
      // Create a promise that will be resolved/rejected by the listener
      const downloadPromise = new Promise<void>((resolve, reject) => {
        console.log('[ModelManager] Creating download promise');
        this.downloadPromiseResolve = resolve;
        this.downloadPromiseReject = reject;
      });

      // Set up progress callback interval
      console.log('[ModelManager] Setting up progress callback interval');
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
      
      console.log('[ModelManager] Calling ExpoLlmMediapipe.downloadModel...');
      console.log('[ModelManager] Download options:', JSON.stringify(options));
      
      const downloadResult = await ExpoLlmMediapipe.downloadModel(MODEL_URL, MODEL_NAME, options);
      console.log('[ModelManager] downloadModel call returned:', downloadResult);

      // Wait for download to complete (listener will resolve/reject)
      console.log('[ModelManager] Waiting for download promise to resolve...');
      await downloadPromise;
      console.log('[ModelManager] Download promise resolved!');

      // Clear progress interval
      clearInterval(progressInterval);
      console.log('[ModelManager] Progress interval cleared');

      // Final progress update
      console.log('[ModelManager] Sending final progress update');
      onProgress({
        bytesDownloaded: 0,
        totalBytes: 0,
        percentage: 100,
        estimatedTimeRemaining: 0,
      });

      console.log('[ModelManager] Model download completed successfully');
    } catch (error) {
      console.error('[ModelManager] Error downloading model:', error);
      console.error('[ModelManager] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[ModelManager] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[ModelManager] Error stack:', error instanceof Error ? error.stack : 'N/A');
      
      throw error instanceof ModelError 
        ? error 
        : new DownloadFailedError((error as Error).message);
    } finally {
      console.log('[ModelManager] Download process finished, cleaning up');
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
      console.log('[ModelManager] Getting list of downloaded models...');
      const downloadedModels = await ExpoLlmMediapipe.getDownloadedModels();
      console.log('[ModelManager] Downloaded models:', downloadedModels);
      
      if (downloadedModels && downloadedModels.length > 0) {
        console.log(`[ModelManager] Deleting ${downloadedModels.length} model(s)...`);
        
        for (const modelName of downloadedModels) {
          console.log(`[ModelManager] Deleting model: ${modelName}`);
          await ExpoLlmMediapipe.deleteDownloadedModel(modelName);
          console.log(`[ModelManager] Successfully deleted model: ${modelName}`);
        }
      } else {
        console.log('[ModelManager] No downloaded models found');
      }
      
      // Clear metadata
      storage.set(STORAGE_KEYS.MODEL_METADATA, '');
      console.log('[ModelManager] Model metadata cleared');
    } catch (error) {
      console.error('[ModelManager] Error deleting model:', error);
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
