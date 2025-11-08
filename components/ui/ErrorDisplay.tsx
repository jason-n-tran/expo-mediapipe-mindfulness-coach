/**
 * ErrorDisplay - Component for displaying user-friendly error messages
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { AppError, ErrorRecovery } from '@/types/error';

interface ErrorDisplayProps {
  error: AppError | null;
  recovery?: ErrorRecovery | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorDisplay({
  error,
  recovery,
  onRetry,
  onDismiss,
  className = '',
}: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  const showRetryButton = recovery?.action === 'retry' && onRetry;
  const showDismissButton = onDismiss;

  return (
    <View className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      {/* Error Icon */}
      <View className="flex-row items-center mb-2">
        <View className="w-6 h-6 bg-red-500 rounded-full items-center justify-center mr-2">
          <Text className="text-white font-bold text-sm">!</Text>
        </View>
        <Text className="text-red-800 font-semibold text-base">
          {error.category.charAt(0).toUpperCase() + error.category.slice(1)} Error
        </Text>
      </View>

      {/* User Message */}
      <Text className="text-red-700 text-sm mb-3">
        {error.userMessage}
      </Text>

      {/* Recovery Message */}
      {recovery && recovery.message && (
        <Text className="text-red-600 text-xs mb-3 italic">
          {recovery.message}
        </Text>
      )}

      {/* Action Buttons */}
      {(showRetryButton || showDismissButton) && (
        <View className="flex-row gap-2">
          {showRetryButton && (
            <Button
              onPress={onRetry}
              size="sm"
              className="bg-red-600 flex-1"
            >
              <ButtonText>Retry</ButtonText>
            </Button>
          )}
          {showDismissButton && (
            <Button
              onPress={onDismiss}
              size="sm"
              variant="outline"
              className="border-red-600 flex-1"
            >
              <ButtonText className="text-red-600">Dismiss</ButtonText>
            </Button>
          )}
        </View>
      )}

      {/* Technical Details (Dev Mode Only) */}
      {__DEV__ && error.technicalDetails && (
        <View className="mt-3 pt-3 border-t border-red-200">
          <Text className="text-red-600 text-xs font-mono">
            Code: {error.code}
          </Text>
          <Text className="text-red-600 text-xs font-mono mt-1">
            {error.message}
          </Text>
        </View>
      )}
    </View>
  );
}
