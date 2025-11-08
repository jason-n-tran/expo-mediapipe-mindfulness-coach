import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { useSettings } from '@/hooks/useSettings';
import { useModelManager } from '@/hooks/useModelManager';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function SettingsScreen() {
  const {
    inferenceSettings,
    uiPreferences,
    isLoading: settingsLoading,
    error: settingsError,
    updateInferenceSettings,
    updateUIPreferences,
    resetToDefaults,
  } = useSettings();

  const {
    modelStatus,
    isLoading: modelLoading,
    error: modelError,
    downloadModel,
    deleteModel,
    validateModel,
  } = useModelManager();

  const [localTemperature, setLocalTemperature] = useState(inferenceSettings.temperature);
  const [localMaxTokens, setLocalMaxTokens] = useState(inferenceSettings.maxTokens);

  // Animation values for button interactions
  const resetButtonScale = useSharedValue(1);
  const actionButtonScale = useSharedValue(1);
  const dangerButtonScale = useSharedValue(1);

  // Update local state when settings change
  React.useEffect(() => {
    setLocalTemperature(inferenceSettings.temperature);
    setLocalMaxTokens(inferenceSettings.maxTokens);
  }, [inferenceSettings]);

  const handleTemperatureChange = async (value: number) => {
    setLocalTemperature(value);
  };

  const handleTemperatureComplete = async (value: number) => {
    try {
      await updateInferenceSettings({ temperature: value });
    } catch (error) {
      console.error('Failed to update temperature:', error);
    }
  };

  const handleMaxTokensChange = async (value: number) => {
    setLocalMaxTokens(Math.round(value));
  };

  const handleMaxTokensComplete = async (value: number) => {
    try {
      await updateInferenceSettings({ maxTokens: Math.round(value) });
    } catch (error) {
      console.error('Failed to update max tokens:', error);
    }
  };

  const handleResetSettings = async () => {
    // Haptic feedback
    if (uiPreferences.hapticFeedback && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Animate button
    resetButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToDefaults();
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    // Haptic feedback
    if (uiPreferences.hapticFeedback && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await updateUIPreferences({ theme });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const handleFontSizeChange = async (fontSize: 'small' | 'medium' | 'large') => {
    // Haptic feedback
    if (uiPreferences.hapticFeedback && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await updateUIPreferences({ fontSize });
    } catch (error) {
      console.error('Failed to update font size:', error);
    }
  };

  const handleRedownloadModel = async () => {
    // Haptic feedback
    if (uiPreferences.hapticFeedback && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Animate button
    actionButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    Alert.alert(
      'Re-download Model',
      'This will delete the current model and download it again. This may take several minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-download',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteModel();
              await downloadModel();
              Alert.alert('Success', 'Model re-downloaded successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to re-download model');
            }
          },
        },
      ]
    );
  };

  const handleDeleteModel = async () => {
    // Haptic feedback
    if (uiPreferences.hapticFeedback && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    // Animate button
    dangerButtonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    Alert.alert(
      'Delete Model',
      'Are you sure you want to delete the cached model? You will need to download it again to use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteModel();
              Alert.alert('Success', 'Model deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete model');
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  // Animated styles
  const resetButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: resetButtonScale.value }],
  }));

  const actionButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: actionButtonScale.value }],
  }));

  const dangerButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dangerButtonScale.value }],
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Inference Settings Panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inference Settings</Text>
        <Text style={styles.sectionDescription}>
          Adjust how the AI model generates responses
        </Text>

        {/* Temperature Slider */}
        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>Temperature</Text>
            <Text style={styles.settingValue}>{localTemperature.toFixed(2)}</Text>
          </View>
          <Text style={styles.settingDescription}>
            Controls randomness. Lower = more focused, Higher = more creative
          </Text>
          <Slider
            minValue={0}
            maxValue={1}
            step={0.01}
            value={localTemperature}
            onChange={(value) => handleTemperatureChange(value)}
            onChangeEnd={(value) => handleTemperatureComplete(value)}
            size="md"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </View>

        {/* Max Tokens Slider */}
        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>Max Tokens</Text>
            <Text style={styles.settingValue}>{localMaxTokens}</Text>
          </View>
          <Text style={styles.settingDescription}>
            Maximum length of responses (128-2048 tokens)
          </Text>
          <Slider
            minValue={128}
            maxValue={2048}
            step={64}
            value={localMaxTokens}
            onChange={(value) => handleMaxTokensChange(value)}
            onChangeEnd={(value) => handleMaxTokensComplete(value)}
            size="md"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </View>

        {/* Reset Button */}
        <AnimatedTouchable
          style={[styles.resetButton, resetButtonAnimatedStyle]}
          onPress={handleResetSettings}
          disabled={settingsLoading}
          activeOpacity={0.7}
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </AnimatedTouchable>
      </View>

      {/* UI Preferences Panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>UI Preferences</Text>
        <Text style={styles.sectionDescription}>
          Customize the app appearance and behavior
        </Text>

        {/* Theme Selector */}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Theme</Text>
          <View style={styles.segmentedControl}>
            {(['light', 'dark', 'auto'] as const).map((theme) => (
              <TouchableOpacity
                key={theme}
                style={[
                  styles.segmentButton,
                  uiPreferences.theme === theme && styles.segmentButtonActive,
                ]}
                onPress={() => handleThemeChange(theme)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    uiPreferences.theme === theme && styles.segmentButtonTextActive,
                  ]}
                >
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Font Size Selector */}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Font Size</Text>
          <View style={styles.segmentedControl}>
            {(['small', 'medium', 'large'] as const).map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.segmentButton,
                  uiPreferences.fontSize === size && styles.segmentButtonActive,
                ]}
                onPress={() => handleFontSizeChange(size)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    uiPreferences.fontSize === size && styles.segmentButtonTextActive,
                  ]}
                >
                  {size.charAt(0).toUpperCase() + size.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Haptic Feedback Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>Vibrate on interactions</Text>
            </View>
            <Switch
              value={uiPreferences.hapticFeedback}
              onValueChange={async (value) => {
                if (value && (Platform.OS === 'ios' || Platform.OS === 'android')) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                updateUIPreferences({ hapticFeedback: value });
              }}
              trackColor={{ false: '#d4d4d4', true: '#0ea5e9' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Show Timestamps Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Timestamps</Text>
              <Text style={styles.settingDescription}>Display message times</Text>
            </View>
            <Switch
              value={uiPreferences.showTimestamps}
              onValueChange={async (value) => {
                if (uiPreferences.hapticFeedback && (Platform.OS === 'ios' || Platform.OS === 'android')) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                updateUIPreferences({ showTimestamps: value });
              }}
              trackColor={{ false: '#d4d4d4', true: '#0ea5e9' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Message Animations Toggle */}
        <View style={styles.settingItem}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Message Animations</Text>
              <Text style={styles.settingDescription}>Animate message appearance</Text>
            </View>
            <Switch
              value={uiPreferences.messageAnimations}
              onValueChange={async (value) => {
                if (uiPreferences.hapticFeedback && (Platform.OS === 'ios' || Platform.OS === 'android')) {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                updateUIPreferences({ messageAnimations: value });
              }}
              trackColor={{ false: '#d4d4d4', true: '#0ea5e9' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      </View>

      {/* Model Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Model Management</Text>
        <Text style={styles.sectionDescription}>
          Manage the AI model cache and storage
        </Text>

        {/* Model Status */}
        <View style={styles.settingItem}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[styles.infoValue, modelStatus.isAvailable && styles.infoValueSuccess]}>
              {modelStatus.isAvailable ? 'Available' : 'Not Downloaded'}
            </Text>
          </View>
          {modelStatus.modelSize && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Size:</Text>
              <Text style={styles.infoValue}>{formatBytes(modelStatus.modelSize)}</Text>
            </View>
          )}
          {modelStatus.lastValidated && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Validated:</Text>
              <Text style={styles.infoValue}>{formatDate(modelStatus.lastValidated)}</Text>
            </View>
          )}
        </View>

        {/* Model Actions */}
        {modelStatus.isAvailable && (
          <>
            <AnimatedTouchable
              style={[styles.actionButton, actionButtonAnimatedStyle]}
              onPress={handleRedownloadModel}
              disabled={modelLoading || modelStatus.isDownloading}
              activeOpacity={0.7}
            >
              {modelLoading ? (
                <ActivityIndicator color="#0ea5e9" />
              ) : (
                <Text style={styles.actionButtonText}>Re-download Model</Text>
              )}
            </AnimatedTouchable>

            <AnimatedTouchable
              style={[styles.actionButton, styles.dangerButton, dangerButtonAnimatedStyle]}
              onPress={handleDeleteModel}
              disabled={modelLoading || modelStatus.isDownloading}
              activeOpacity={0.7}
            >
              {modelLoading ? (
                <ActivityIndicator color="#ef4444" />
              ) : (
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                  Delete Model Cache
                </Text>
              )}
            </AnimatedTouchable>
          </>
        )}

        {!modelStatus.isAvailable && !modelStatus.isDownloading && (
          <AnimatedTouchable
            style={[styles.actionButton, actionButtonAnimatedStyle]}
            onPress={downloadModel}
            disabled={modelLoading}
            activeOpacity={0.7}
          >
            {modelLoading ? (
              <ActivityIndicator color="#0ea5e9" />
            ) : (
              <Text style={styles.actionButtonText}>Download Model</Text>
            )}
          </AnimatedTouchable>
        )}

        {modelStatus.isDownloading && (
          <View style={styles.downloadingContainer}>
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text style={styles.downloadingText}>
              Downloading... {modelStatus.downloadProgress?.toFixed(0)}%
            </Text>
          </View>
        )}

        {/* Error Display */}
        {(settingsError || modelError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{settingsError || modelError}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb', // COLORS.background.secondary
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#ffffff', // COLORS.background.primary
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#171717', // COLORS.neutral[900]
    marginBottom: 4,
    letterSpacing: -0.25,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#737373', // COLORS.neutral[500]
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#404040', // COLORS.neutral[700]
    letterSpacing: -0.25,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0ea5e9', // COLORS.primary[500]
  },
  settingDescription: {
    fontSize: 13,
    color: '#737373', // COLORS.neutral[500]
    marginBottom: 8,
    lineHeight: 18,
  },
  resetButton: {
    backgroundColor: '#f3f4f6', // COLORS.background.tertiary
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#404040', // COLORS.neutral[700]
    letterSpacing: -0.25,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6', // COLORS.background.tertiary
    borderRadius: 8,
    padding: 2,
    marginTop: 8,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff', // COLORS.background.primary
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#737373', // COLORS.neutral[500]
  },
  segmentButtonTextActive: {
    color: '#0ea5e9', // COLORS.primary[500]
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#737373', // COLORS.neutral[500]
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#404040', // COLORS.neutral[700]
    fontWeight: '600',
  },
  infoValueSuccess: {
    color: '#10b981', // COLORS.success
  },
  actionButton: {
    backgroundColor: '#f3f4f6', // COLORS.background.tertiary
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5', // COLORS.neutral[200]
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0ea5e9', // COLORS.primary[500]
    letterSpacing: -0.25,
  },
  dangerButton: {
    backgroundColor: '#fef2f2', // Light red background
    borderColor: '#fee2e2', // Light red border
  },
  dangerButtonText: {
    color: '#ef4444', // COLORS.error
  },
  downloadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  downloadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#737373', // COLORS.neutral[500]
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#fef2f2', // Light red background
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444', // COLORS.error
    lineHeight: 18,
  },
});
