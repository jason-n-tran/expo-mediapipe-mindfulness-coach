/**
 * AppInitializationScreen
 * Displays loading states during app initialization
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@/components/ui/button';
import { InitializationState } from '@/hooks/useAppInitialization';
import { COLORS } from '@/constants/theme';

interface AppInitializationScreenProps {
  state: InitializationState;
  error: string | null;
  onRetry: () => void;
}

export function AppInitializationScreen({ 
  state, 
  error, 
  onRetry 
}: AppInitializationScreenProps) {
  
  // Get display content based on state
  const getContent = () => {
    switch (state) {
      case 'checking':
        return {
          icon: '🔍',
          title: 'Checking Setup',
          message: 'Verifying your mindfulness coach is ready...',
          showSpinner: true,
        };
      
      case 'initializing-llm':
        return {
          icon: '🧠',
          title: 'Initializing AI',
          message: 'Loading your mindfulness coach...',
          showSpinner: true,
        };
      
      case 'loading-history':
        return {
          icon: '📚',
          title: 'Loading History',
          message: 'Retrieving your conversation history...',
          showSpinner: true,
        };
      
      case 'error':
        return {
          icon: '⚠️',
          title: 'Initialization Failed',
          message: error || 'Something went wrong during startup',
          showSpinner: false,
          showRetry: true,
        };
      
      default:
        return {
          icon: '⏳',
          title: 'Loading',
          message: 'Please wait...',
          showSpinner: true,
        };
    }
  };

  const content = getContent();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        {/* Icon */}
        <Text className="text-6xl mb-6">{content.icon}</Text>

        {/* Title */}
        <Text className="text-2xl font-bold text-neutral-900 mb-3 text-center">
          {content.title}
        </Text>

        {/* Message */}
        <Text className="text-base text-neutral-600 text-center mb-8 leading-6">
          {content.message}
        </Text>

        {/* Spinner */}
        {content.showSpinner && (
          <ActivityIndicator 
            size="large" 
            color={COLORS.primary[500]} 
          />
        )}

        {/* Retry Button */}
        {content.showRetry && (
          <Button
            size="lg"
            onPress={onRetry}
            className="bg-blue-600 rounded-xl px-8"
          >
            <ButtonText className="text-white font-semibold">
              Try Again
            </ButtonText>
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}
