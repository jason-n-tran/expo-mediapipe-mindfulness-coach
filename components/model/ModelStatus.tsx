/**
 * ModelStatus Component
 * Displays current model status, metadata, and management options
 * Provides re-download functionality with confirmation
 */

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import type { ModelStatus as ModelStatusType } from '@/types/model';

interface ModelStatusProps {
  status: ModelStatusType;
  onRedownload?: () => void;
  onDelete?: () => void;
  onValidate?: () => void;
}

export function ModelStatus({
  status,
  onRedownload,
  onDelete,
  onValidate,
}: ModelStatusProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
   * Format date to readable string
   */
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get status badge color and text
   */
  const getStatusBadge = () => {
    if (status.isDownloading) {
      return {
        color: 'bg-warning-100 border-warning-300',
        textColor: 'text-warning-700',
        text: 'Downloading',
      };
    }
    if (status.isAvailable) {
      return {
        color: 'bg-success-100 border-success-300',
        textColor: 'text-success-700',
        text: 'Available',
      };
    }
    return {
      color: 'bg-error-100 border-error-300',
      textColor: 'text-error-700',
      text: 'Missing',
    };
  };

  /**
   * Handle re-download with confirmation
   */
  const handleRedownload = () => {
    Alert.alert(
      'Re-download Model',
      'This will delete the current model and download a fresh copy. This may take several minutes and use approximately 2GB of data. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Re-download',
          style: 'destructive',
          onPress: () => {
            onRedownload?.();
          },
        },
      ]
    );
  };

  /**
   * Handle delete with confirmation
   */
  const handleDelete = () => {
    Alert.alert(
      'Delete Model',
      'This will remove the model from your device. You will need to download it again to use the app. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
          },
        },
      ]
    );
  };

  const badge = getStatusBadge();

  return (
    <View className="p-6 bg-background-0 rounded-lg">
      {/* Header */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-typography-900">
            Model Status
          </Text>
          <View className={`px-3 py-1 rounded-full border ${badge.color}`}>
            <Text className={`text-sm font-semibold ${badge.textColor}`}>
              {badge.text}
            </Text>
          </View>
        </View>
        <Text className="text-base text-typography-600">
          Gemma-3n-E4B Mindfulness Coach
        </Text>
      </View>

      {/* Model Metadata */}
      {status.isAvailable && (
        <View className="mb-6 space-y-3">
          {/* Model Size */}
          {status.modelSize && (
            <View className="flex-row justify-between items-center py-2 border-b border-background-100">
              <Text className="text-sm text-typography-600">Model Size</Text>
              <Text className="text-sm font-semibold text-typography-900">
                {formatBytes(status.modelSize)}
              </Text>
            </View>
          )}

          {/* Last Validated */}
          {status.lastValidated && (
            <View className="flex-row justify-between items-center py-2 border-b border-background-100">
              <Text className="text-sm text-typography-600">Last Validated</Text>
              <Text className="text-sm font-semibold text-typography-900">
                {formatDate(status.lastValidated)}
              </Text>
            </View>
          )}

          {/* Version */}
          <View className="flex-row justify-between items-center py-2">
            <Text className="text-sm text-typography-600">Version</Text>
            <Text className="text-sm font-semibold text-typography-900">
              1.0.0
            </Text>
          </View>
        </View>
      )}

      {/* Download Progress */}
      {status.isDownloading && status.downloadProgress !== undefined && (
        <View className="mb-6">
          <View className="h-2 bg-background-100 rounded-full overflow-hidden">
            <View
              className="h-full bg-primary-500 rounded-full"
              style={{ width: `${status.downloadProgress}%` }}
            />
          </View>
          <Text className="text-sm text-typography-600 mt-2 text-center">
            Downloading: {status.downloadProgress.toFixed(1)}%
          </Text>
        </View>
      )}

      {/* Missing Model Message */}
      {!status.isAvailable && !status.isDownloading && (
        <View className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
          <Text className="text-sm font-semibold text-warning-700 mb-1">
            Model Not Available
          </Text>
          <Text className="text-sm text-warning-600">
            The mindfulness coach model needs to be downloaded before you can start chatting.
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {status.isAvailable && !status.isDownloading && (
        <View className="space-y-3">
          {/* Validate Button */}
          <Button
            action="secondary"
            variant="outline"
            size="md"
            onPress={onValidate}
            className="w-full"
          >
            <ButtonText>Validate Model</ButtonText>
          </Button>

          {/* Re-download Button */}
          <Button
            action="primary"
            variant="outline"
            size="md"
            onPress={handleRedownload}
            className="w-full"
          >
            <ButtonText>Re-download Model</ButtonText>
          </Button>

          {/* Delete Button */}
          <Button
            action="negative"
            variant="outline"
            size="md"
            onPress={handleDelete}
            className="w-full"
          >
            <ButtonText>Delete Model</ButtonText>
          </Button>
        </View>
      )}

      {/* Info Text */}
      {status.isAvailable && (
        <View className="mt-4 p-3 bg-background-50 rounded-lg">
          <Text className="text-xs text-typography-500 text-center">
            The model is stored locally on your device and works completely offline.
          </Text>
        </View>
      )}
    </View>
  );
}
