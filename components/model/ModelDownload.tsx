/**
 * ModelDownload Component
 * Displays download progress bar with percentage, speed, and ETA
 * Provides cancel and retry functionality
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import type { DownloadProgress } from '@/types/model';

interface ModelDownloadProps {
  progress: DownloadProgress | null;
  isDownloading: boolean;
  error: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
  onStart?: () => void;
}

export function ModelDownload({
  progress,
  isDownloading,
  error,
  onCancel,
  onRetry,
  onStart,
}: ModelDownloadProps) {
  /**
   * Format bytes to human-readable size
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  /**
   * Format seconds to human-readable time
   */
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  /**
   * Calculate download speed
   */
  const calculateSpeed = (): string => {
    if (!progress || !progress.estimatedTimeRemaining) return 'Calculating...';
    
    const remainingBytes = progress.totalBytes - progress.bytesDownloaded;
    const bytesPerSecond = remainingBytes / progress.estimatedTimeRemaining;
    
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  return (
    <View className="p-6 bg-background-0 rounded-lg">
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-typography-900 mb-2">
          Model Download
        </Text>
        <Text className="text-base text-typography-600">
          {isDownloading
            ? 'Downloading mindfulness coach model...'
            : error
            ? 'Download failed'
            : 'Ready to download'}
        </Text>
      </View>

      {/* Progress Section */}
      {isDownloading && progress && (
        <View className="mb-6">
          {/* Progress Bar */}
          <View className="h-3 bg-background-100 rounded-full overflow-hidden mb-3">
            <View
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${progress.percentage}%` }}
            />
          </View>

          {/* Progress Stats */}
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-sm font-semibold text-typography-700">
              {progress.percentage.toFixed(1)}%
            </Text>
            <Text className="text-sm text-typography-600">
              {formatBytes(progress.bytesDownloaded)} / {formatBytes(progress.totalBytes)}
            </Text>
          </View>

          {/* Speed and ETA */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#6366f1" />
              <Text className="text-sm text-typography-600">
                {calculateSpeed()}
              </Text>
            </View>
            {progress.estimatedTimeRemaining !== undefined && (
              <Text className="text-sm text-typography-600">
                ETA: {formatTime(progress.estimatedTimeRemaining)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Error Message */}
      {error && !isDownloading && (
        <View className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg">
          <Text className="text-sm font-semibold text-error-700 mb-1">
            Error
          </Text>
          <Text className="text-sm text-error-600">
            {error}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View className="flex-row gap-3">
        {isDownloading ? (
          <Button
            action="negative"
            variant="outline"
            size="lg"
            onPress={onCancel}
            className="flex-1"
          >
            <ButtonText>Cancel Download</ButtonText>
          </Button>
        ) : error ? (
          <>
            <Button
              action="primary"
              variant="solid"
              size="lg"
              onPress={onRetry}
              className="flex-1"
            >
              <ButtonText>Retry Download</ButtonText>
            </Button>
          </>
        ) : (
          <Button
            action="primary"
            variant="solid"
            size="lg"
            onPress={onStart}
            className="flex-1"
          >
            <ButtonText>Start Download</ButtonText>
          </Button>
        )}
      </View>

      {/* Info Text */}
      {!isDownloading && !error && (
        <View className="mt-4 p-3 bg-background-50 rounded-lg">
          <Text className="text-xs text-typography-500 text-center">
            This will download approximately 2GB of data. Make sure you have sufficient storage space and a stable internet connection.
          </Text>
        </View>
      )}
    </View>
  );
}
