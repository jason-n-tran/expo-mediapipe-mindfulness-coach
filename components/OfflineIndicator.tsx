/**
 * OfflineIndicator Component
 * Displays a banner when the device is offline
 * Shows that all features still work without network after model download
 */

import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface OfflineIndicatorProps {
  showWhenOffline?: boolean;
}

export function OfflineIndicator({ showWhenOffline = true }: OfflineIndicatorProps) {
  const { isOffline } = useNetworkStatus();

  if (!showWhenOffline || !isOffline) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(300)}
    >
      <View className="bg-amber-50 border-b border-amber-200 px-4 py-2">
        <View className="flex-row items-center justify-center">
          <Text className="text-amber-900 text-sm mr-2">✈️</Text>
          <Text className="text-amber-900 text-sm font-medium">
            Offline Mode
          </Text>
          <Text className="text-amber-700 text-sm ml-2">
            • All features available
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
