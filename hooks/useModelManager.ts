/**
 * useModelManager Hook
 * Wraps ModelManager service with React state
 * Provides model status, download progress, and control functions
 */

import { useState, useEffect, useCallback } from 'react';
import { modelManager } from '@/services/llm/ModelManager';
import type { ModelStatus, DownloadProgress } from '@/services/llm/types';

interface UseModelManagerReturn {
  modelStatus: ModelStatus;
  downloadProgress: DownloadProgress | null;
  isLoading: boolean;
  error: string | null;
  downloadModel: () => Promise<void>;
  validateModel: () => Promise<boolean>;
  deleteModel: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export function useModelManager(): UseModelManagerReturn {
  const [modelStatus, setModelStatus] = useState<ModelStatus>({
    isAvailable: false,
    isDownloading: false,
  });
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh model status from ModelManager
   */
  const refreshStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await modelManager.getModelStatus();
      setModelStatus(status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get model status';
      setError(errorMessage);
      console.error('Error refreshing model status:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Download model with progress tracking
   */
  const downloadModel = useCallback(async () => {
    console.log('[useModelManager] downloadModel called');
    try {
      console.log('[useModelManager] Setting loading state...');
      setIsLoading(true);
      setError(null);
      setDownloadProgress(null);

      // Update status to show downloading
      console.log('[useModelManager] Setting isDownloading to true');
      setModelStatus(prev => ({
        ...prev,
        isDownloading: true,
      }));

      console.log('[useModelManager] Calling modelManager.downloadModel...');
      let progressUpdateCount = 0;
      await modelManager.downloadModel((progress) => {
        progressUpdateCount++;
        console.log(`[useModelManager] Progress update #${progressUpdateCount}:`, JSON.stringify(progress));
        setDownloadProgress(progress);
        setModelStatus(prev => ({
          ...prev,
          isDownloading: true,
          downloadProgress: progress.percentage,
        }));
      });

      console.log('[useModelManager] Download completed, refreshing status...');
      // Download complete - refresh status
      await refreshStatus();
      setDownloadProgress(null);
      console.log('[useModelManager] Status refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download model';
      console.error('[useModelManager] Download error:', err);
      console.error('[useModelManager] Error message:', errorMessage);
      setError(errorMessage);
      
      // Reset downloading state
      setModelStatus(prev => ({
        ...prev,
        isDownloading: false,
      }));
      setDownloadProgress(null);
    } finally {
      console.log('[useModelManager] Setting loading to false');
      setIsLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Validate model integrity
   */
  const validateModel = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const isValid = await modelManager.validateModel();
      
      if (isValid) {
        // Refresh status to get updated validation timestamp
        await refreshStatus();
      } else {
        setError('Model validation failed. The model may be corrupted.');
      }
      
      return isValid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate model';
      setError(errorMessage);
      console.error('Error validating model:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshStatus]);

  /**
   * Delete cached model
   */
  const deleteModel = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await modelManager.deleteModel();
      
      // Update status to reflect deletion
      setModelStatus({
        isAvailable: false,
        isDownloading: false,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete model';
      setError(errorMessage);
      console.error('Error deleting model:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load initial model status on mount
   */
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return {
    modelStatus,
    downloadProgress,
    isLoading,
    error,
    downloadModel,
    validateModel,
    deleteModel,
    refreshStatus,
  };
}
