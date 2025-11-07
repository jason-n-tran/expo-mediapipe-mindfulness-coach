/**
 * useSettings Hook
 * Wraps SettingsStore with React state
 * Provides settings and update functions
 */

import { useState, useEffect, useCallback } from 'react';
import { settingsStore } from '@/services/storage/SettingsStore';
import type { InferenceSettings, UIPreferences } from '@/types';

interface UseSettingsReturn {
  inferenceSettings: InferenceSettings;
  uiPreferences: UIPreferences;
  isLoading: boolean;
  error: string | null;
  updateInferenceSettings: (settings: Partial<InferenceSettings>) => Promise<void>;
  updateUIPreferences: (preferences: Partial<UIPreferences>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [inferenceSettings, setInferenceSettings] = useState<InferenceSettings>({
    temperature: 0.7,
    maxTokens: 512,
    topP: 0.9,
    contextWindowSize: 2048,
    streamingEnabled: true,
  });
  const [uiPreferences, setUIPreferences] = useState<UIPreferences>({
    theme: 'auto',
    fontSize: 'medium',
    hapticFeedback: true,
    soundEffects: false,
    showTimestamps: true,
    messageAnimations: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh settings from storage
   */
  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [inference, ui] = await Promise.all([
        settingsStore.getInferenceSettings(),
        settingsStore.getUIPreferences(),
      ]);
      
      setInferenceSettings(inference);
      setUIPreferences(ui);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      console.error('Error refreshing settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update inference settings
   */
  const updateInferenceSettings = useCallback(async (settings: Partial<InferenceSettings>) => {
    try {
      setError(null);
      await settingsStore.updateInferenceSettings(settings);
      
      // Update local state
      setInferenceSettings(prev => ({
        ...prev,
        ...settings,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update inference settings';
      setError(errorMessage);
      console.error('Error updating inference settings:', err);
      throw err;
    }
  }, []);

  /**
   * Update UI preferences
   */
  const updateUIPreferences = useCallback(async (preferences: Partial<UIPreferences>) => {
    try {
      setError(null);
      await settingsStore.updateUIPreferences(preferences);
      
      // Update local state
      setUIPreferences(prev => ({
        ...prev,
        ...preferences,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update UI preferences';
      setError(errorMessage);
      console.error('Error updating UI preferences:', err);
      throw err;
    }
  }, []);

  /**
   * Reset all settings to defaults
   */
  const resetToDefaults = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await settingsStore.resetToDefaults();
      
      // Refresh settings to get defaults
      await refreshSettings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      setError(errorMessage);
      console.error('Error resetting settings:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshSettings]);

  /**
   * Load initial settings on mount
   */
  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return {
    inferenceSettings,
    uiPreferences,
    isLoading,
    error,
    updateInferenceSettings,
    updateUIPreferences,
    resetToDefaults,
    refreshSettings,
  };
}
