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
import { STORAGE_KEYS, APP_CONFIG } from '@/constants/config';
import { useRouter } from 'expo-router';
import ExpoLlmMediapipe from 'expo-llm-mediapipe';

const storage = createMMKV();

export default function ModelSetupScreen() {
  const router = useRouter();
  const { modelStatus, downloadProgress, downloadModel, error, refreshStatus } = useModelManager();
  const { isOffline } = useNetworkStatus();
  const [hasStartedDownload, setHasStartedDownload] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isCheckingModel, setIsCheckingModel] = useState(true);
  const [shouldShowSetup, setShouldShowSetup] = useState(false);

  // Check if model is already downloaded on mount
  useEffect(() => {
    const checkModelStatus = async () => {
      console.log('[ModelSetup] ===== MOUNT: Checking if model is already downloaded =====');
      console.log('[ModelSetup] Initial modelStatus:', JSON.stringify(modelStatus));
      
      try {
        // Check directly with native module first
        console.log('[ModelSetup] Checking directly with ExpoLlmMediapipe...');
        const isDownloadedDirect = await ExpoLlmMediapipe.isModelDownloaded(APP_CONFIG.model.name);
        console.log('[ModelSetup] Direct check result:', isDownloadedDirect);
        
        if (isDownloadedDirect) {
          console.log('[ModelSetup] ✓ Model IS downloaded (direct check) - navigating to chat immediately');
          router.replace('/(drawer)/chat');
          return;
        }
        
        // Also check via ModelManager
        console.log('[ModelSetup] Calling refreshStatus()...');
        await refreshStatus();
        
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[ModelSetup] After refresh, modelStatus:', JSON.stringify(modelStatus));
        
        if (modelStatus.isAvailable) {
          console.log('[ModelSetup] ✓ Model IS available (ModelManager check) - navigating to chat');
          router.replace('/(drawer)/chat');
          return;
        }
        
        console.log('[ModelSetup] ✗ Model NOT available - showing setup screen');
        setIsCheckingModel(false);
        setShouldShowSetup(true);
      } catch (err) {
        console.error('[ModelSetup] Error checking model status:', err);
        setIsCheckingModel(false);
        setShouldShowSetup(true);
      }
    };
    
    checkModelStatus();
  }, []);

  // Monitor modelStatus changes after initial check
  useEffect(() => {
    if (!isCheckingModel && modelStatus.isAvailable && !hasStartedDownload) {
      console.log('[ModelSetup] ===== Model became available after initial check =====');
      console.log('[ModelSetup] Navigating to chat...');
      router.replace('/(drawer)/chat');
    }
  }, [modelStatus.isAvailable, isCheckingModel, hasStartedDownload]);

  // Check if this is first launch and auto-trigger download
  useEffect(() => {
    console.log('[ModelSetup] First launch check - isCheckingModel:', isCheckingModel, 'shouldShowSetup:', shouldShowSetup);
    
    // Skip if still checking model status or shouldn't show setup
    if (isCheckingModel || !shouldShowSetup) {
      console.log('[ModelSetup] Skipping first launch check');
      return;
    }
    
    const firstLaunch = storage.getString(STORAGE_KEYS.FIRST_LAUNCH);
    console.log('[ModelSetup] First launch value from storage:', firstLaunch);
    
    if (!firstLaunch) {
      // This is the first launch
      console.log('[ModelSetup] This IS first launch - setting up auto-download');
      setIsFirstLaunch(true);
      storage.set(STORAGE_KEYS.FIRST_LAUNCH, 'false');
      
      // Auto-trigger download after a brief delay to show welcome message
      const timer = setTimeout(() => {
        console.log('[ModelSetup] Auto-triggering download for first launch...');
        handleStartDownload();
      }, 2000);
      
      return () => {
        console.log('[ModelSetup] Cleaning up first launch timer');
        clearTimeout(timer);
      };
    } else {
      console.log('[ModelSetup] NOT first launch');
    }
  }, [isCheckingModel, shouldShowSetup]);

  const handleStartDownload = async () => {
    console.log('[ModelSetup] ===== STARTING DOWNLOAD =====');
    console.log('[ModelSetup] Current modelStatus:', JSON.stringify(modelStatus));
    console.log('[ModelSetup] Current downloadProgress:', JSON.stringify(downloadProgress));
    console.log('[ModelSetup] Current error:', error);
    
    // Check if model is already available before starting download (direct check)
    const isDownloadedDirect = await ExpoLlmMediapipe.isModelDownloaded(APP_CONFIG.model.name);
    console.log('[ModelSetup] Direct check before download:', isDownloadedDirect);
    
    if (isDownloadedDirect || modelStatus.isAvailable) {
      console.log('[ModelSetup] ⚠️ Model already available, skipping download and navigating to chat');
      router.replace('/(drawer)/chat');
      return;
    }
    
    setHasStartedDownload(true);
    console.log('[ModelSetup] hasStartedDownload set to true');
    
    try {
      console.log('[ModelSetup] Calling downloadModel()...');
      await downloadModel();
      console.log('[ModelSetup] ===== DOWNLOAD COMPLETED SUCCESSFULLY =====');
      
      // Check directly with native module after download
      console.log('[ModelSetup] Checking model status directly after download...');
      const isDownloadedAfter = await ExpoLlmMediapipe.isModelDownloaded(APP_CONFIG.model.name);
      console.log('[ModelSetup] Direct check after download:', isDownloadedAfter);
      
      // Refresh status to ensure we have the latest
      console.log('[ModelSetup] Refreshing ModelManager status...');
      await refreshStatus();
      
      // Give a brief moment for the model status to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('[ModelSetup] Final modelStatus from ModelManager:', JSON.stringify(modelStatus));
      
      // Navigate regardless - the chat screen will handle initialization
      console.log('[ModelSetup] Navigating to chat screen...');
      router.replace('/(drawer)/chat');
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

  // Show loading while checking model status
  if (isCheckingModel) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-6">
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text className="text-neutral-600 mt-4 text-center">
            Checking model status...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
