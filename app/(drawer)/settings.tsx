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
} from 'react-native';
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from '@/components/ui/slider';
import { useSettings } from '@/hooks/useSettings';
import { useModelManager } from '@/hooks/useModelManager';

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

  const handleResetSettings = () => {
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
    try {
      await updateUIPreferences({ theme });
    } catch (error) {
      console.error('Failed to update theme:', error);
    }
  };

  const handleFontSizeChange = async (fontSize: 'small' | 'medium' | 'large') => {
    try {
      await updateUIPreferences({ fontSize });
    } catch (error) {
      console.error('Failed to update font size:', error);
    }
  };

  const handleRedownloadModel = () => {
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

  const handleDeleteModel = () => {
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
            className="w-full"
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
            className="w-full"
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetSettings}
          disabled={settingsLoading}
        >
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
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
              onValueChange={(value) => updateUIPreferences({ hapticFeedback: value })}
              trackColor={{ false: '#D1D5DB', true: '#4A90E2' }}
              thumbColor="#FFFFFF"
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
              onValueChange={(value) => updateUIPreferences({ showTimestamps: value })}
              trackColor={{ false: '#D1D5DB', true: '#4A90E2' }}
              thumbColor="#FFFFFF"
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
              onValueChange={(value) => updateUIPreferences({ messageAnimations: value })}
              trackColor={{ false: '#D1D5DB', true: '#4A90E2' }}
              thumbColor="#FFFFFF"
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
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRedownloadModel}
              disabled={modelLoading || modelStatus.isDownloading}
            >
              {modelLoading ? (
                <ActivityIndicator color="#4A90E2" />
              ) : (
                <Text style={styles.actionButtonText}>Re-download Model</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDeleteModel}
              disabled={modelLoading || modelStatus.isDownloading}
            >
              {modelLoading ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                  Delete Model Cache
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {!modelStatus.isAvailable && !modelStatus.isDownloading && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={downloadModel}
            disabled={modelLoading}
          >
            {modelLoading ? (
              <ActivityIndicator color="#4A90E2" />
            ) : (
              <Text style={styles.actionButtonText}>Download Model</Text>
            )}
          </TouchableOpacity>
        )}

        {modelStatus.isDownloading && (
          <View style={styles.downloadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
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
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
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
    color: '#374151',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentButtonTextActive: {
    color: '#4A90E2',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  infoValueSuccess: {
    color: '#10B981',
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A90E2',
  },
  dangerButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  dangerButtonText: {
    color: '#EF4444',
  },
  downloadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  downloadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
  },
});
