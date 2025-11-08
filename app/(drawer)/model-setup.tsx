/**
 * Model Setup Screen
 * Handles model download for first-time users or when model is missing
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ButtonText } from '@/components/ui/button';
import { useModelManager } from '@/hooks/useModelManager';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ModelDownload } from '@/components/model/ModelDownload';
import { COLORS } from '@/constants/theme';
import { createMMKV } from 'react-native-mmkv';
import { STORAGE_KEYS } from '@/constants/config';

const storage = createMMKV();

export default function ModelSetupScreen() {
  const { modelStatus, downloadProgress, downloadModel, error } = useModelManager();
  const { isOffline } = useNetworkStatus();
  const [hasStartedDownload, setHasStartedDownload] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);

  // Check if this is first launch and auto-trigger download
  useEffect(() => {
    const firstLaunch = storage.getString(STORAGE_KEYS.FIRST_LAUNCH);
    
    if (!firstLaunch) {
      // This is the first launch
      setIsFirstLaunch(true);
      storage.set(STORAGE_KEYS.FIRST_LAUNCH, 'false');
      
      // Auto-trigger download after a brief delay to show welcome message
      const timer = setTimeout(() => {
        handleStartDownload();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleStartDownload = async () => {
    console.log('[ModelSetup] ===== STARTING DOWNLOAD =====');
    console.log('[ModelSetup] Current modelStatus:', JSON.stringify(modelStatus));
    console.log('[ModelSetup] Current downloadProgress:', JSON.stringify(downloadProgress));
    console.log('[ModelSetup] Current error:', error);
    
    setHasStartedDownload(true);
    console.log('[ModelSetup] hasStartedDownload set to true');
    
    try {
      console.log('[ModelSetup] Calling downloadModel()...');
      await downloadModel();
      console.log('[ModelSetup] ===== DOWNLOAD COMPLETED SUCCESSFULLY =====');
    } catch (err) {
      console.error('[ModelSetup] ===== DOWNLOAD FAILED =====');
      console.error('[ModelSetup] Error:', err);
      console.error('[ModelSetup] Error type:', err instanceof Error ? err.constructor.name : typeof err);
      console.error('[ModelSetup] Error message:', err instanceof Error ? err.message : String(err));
      setHasStartedDownload(false);
      console.log('[ModelSetup] hasStartedDownload set to false after error');
    }
  };

  const handleCancelDownload = () => {
    console.log('[ModelSetup] Cancelling download...');
    setHasStartedDownload(false);
  };

  const handleRetryDownload = async () => {
    console.log('[ModelSetup] Retrying download...');
    await handleStartDownload();
  };

  // Show download progress if downloading
  if (modelStatus.isDownloading || hasStartedDownload) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center px-6">
          {isFirstLaunch && (
            <View className="mb-6">
              <Text className="text-xl font-semibold text-neutral-900 text-center mb-2">
                Setting Up Your Coach
              </Text>
              <Text className="text-sm text-neutral-600 text-center">
                This will only take a few minutes...
              </Text>
            </View>
          )}
          <ModelDownload
            progress={downloadProgress}
            isDownloading={modelStatus.isDownloading}
            error={error}
            onCancel={handleCancelDownload}
            onRetry={handleRetryDownload}
            onStart={handleStartDownload}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Show welcome and download prompt
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-6 py-8">
          {/* Welcome Header */}
          <View className="items-center mb-8">
            <Text className="text-6xl mb-4">🧘</Text>
            <Text className="text-3xl font-bold text-neutral-900 text-center mb-3">
              Welcome to Your{'\n'}Mindfulness Coach
            </Text>
            <Text className="text-base text-neutral-600 text-center leading-6">
              Your personal guide combining Buddhist and Stoic wisdom to help you navigate life's challenges with clarity and peace.
            </Text>
          </View>

          {/* Features */}
          <View className="mb-8 space-y-4">
            <FeatureItem
              icon="🔒"
              title="Completely Private"
              description="All conversations stay on your device. No data is sent to the cloud."
            />
            <FeatureItem
              icon="✈️"
              title="Works Offline"
              description="Access your mindfulness coach anytime, anywhere, even without internet."
            />
            <FeatureItem
              icon="💭"
              title="Personalized Guidance"
              description="Receive thoughtful advice tailored to your unique situation and needs."
            />
          </View>

          {/* Download Info */}
          <View className="bg-blue-50 rounded-2xl p-4 mb-6">
            <Text className="text-sm font-semibold text-blue-900 mb-2">
              One-Time Setup Required
            </Text>
            <Text className="text-sm text-blue-800 leading-5">
              To enable offline functionality, we need to download the AI model (~2GB). This only happens once and allows the app to work without internet.
            </Text>
          </View>

          {/* Error Display */}
          {error && (
            <View className="bg-red-50 rounded-2xl p-4 mb-6">
              <Text className="text-sm font-semibold text-red-900 mb-1">
                Download Failed
              </Text>
              <Text className="text-sm text-red-800">
                {error}
              </Text>
            </View>
          )}

          {/* Offline Warning */}
          {isOffline && (
            <View className="bg-orange-50 rounded-2xl p-4 mb-6">
              <Text className="text-sm font-semibold text-orange-900 mb-1">
                No Internet Connection
              </Text>
              <Text className="text-sm text-orange-800">
                Please connect to the internet to download the model. Once downloaded, the app works completely offline.
              </Text>
            </View>
          )}

          {/* Download Button */}
          <Button
            size="lg"
            onPress={handleStartDownload}
            disabled={isOffline}
            className={`w-full rounded-xl ${isOffline ? 'bg-neutral-300' : 'bg-blue-600'}`}
          >
            <ButtonText className={`font-semibold ${isOffline ? 'text-neutral-500' : 'text-white'}`}>
              Download Model & Get Started
            </ButtonText>
          </Button>

          <Text className="text-xs text-neutral-500 text-center mt-4">
            Make sure you have a stable internet connection and at least 2GB of free storage space.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <View className="flex-row items-start">
      <Text className="text-2xl mr-3">{icon}</Text>
      <View className="flex-1">
        <Text className="text-base font-semibold text-neutral-900 mb-1">
          {title}
        </Text>
        <Text className="text-sm text-neutral-600 leading-5">
          {description}
        </Text>
      </View>
    </View>
  );
}
