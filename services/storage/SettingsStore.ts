/**
 * SettingsStore - Persistent storage for app settings using MMKV
 */

import { createMMKV } from 'react-native-mmkv';
import { InferenceSettings, UIPreferences } from '../../types';
import { DEFAULT_INFERENCE_SETTINGS, DEFAULT_UI_PREFERENCES, STORAGE_KEYS } from '../../constants/config';

export class SettingsStore {
  private storage: ReturnType<typeof createMMKV>;
  private inferenceSettingsKey = `${STORAGE_KEYS.SETTINGS}:inference`;
  private uiPreferencesKey = `${STORAGE_KEYS.SETTINGS}:ui`;

  constructor() {
    this.storage = createMMKV({
      id: 'mindfulness-coach-settings',
    });
  }

  /**
   * Get inference settings
   */
  async getInferenceSettings(): Promise<InferenceSettings> {
    try {
      const serialized = this.storage.getString(this.inferenceSettingsKey);
      
      if (!serialized) {
        // Return defaults if no settings exist
        return { ...DEFAULT_INFERENCE_SETTINGS };
      }
      
      const parsed = JSON.parse(serialized);
      
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_INFERENCE_SETTINGS,
        ...parsed,
      };
    } catch (error) {
      console.error('Failed to get inference settings:', error);
      return { ...DEFAULT_INFERENCE_SETTINGS };
    }
  }

  /**
   * Update inference settings with validation
   */
  async updateInferenceSettings(settings: Partial<InferenceSettings>): Promise<void> {
    try {
      // Get current settings
      const currentSettings = await this.getInferenceSettings();
      
      // Validate and merge new settings
      const updatedSettings: InferenceSettings = {
        ...currentSettings,
        ...settings,
      };
      
      // Validate settings ranges
      this.validateInferenceSettings(updatedSettings);
      
      // Save to storage
      this.storage.set(this.inferenceSettingsKey, JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Failed to update inference settings:', error);
      throw new Error('Failed to update inference settings');
    }
  }

  /**
   * Get UI preferences
   */
  async getUIPreferences(): Promise<UIPreferences> {
    try {
      const serialized = this.storage.getString(this.uiPreferencesKey);
      
      if (!serialized) {
        // Return defaults if no preferences exist
        return { ...DEFAULT_UI_PREFERENCES };
      }
      
      const parsed = JSON.parse(serialized);
      
      // Merge with defaults to ensure all properties exist
      return {
        ...DEFAULT_UI_PREFERENCES,
        ...parsed,
      };
    } catch (error) {
      console.error('Failed to get UI preferences:', error);
      return { ...DEFAULT_UI_PREFERENCES };
    }
  }

  /**
   * Update UI preferences with validation
   */
  async updateUIPreferences(preferences: Partial<UIPreferences>): Promise<void> {
    try {
      // Get current preferences
      const currentPreferences = await this.getUIPreferences();
      
      // Validate and merge new preferences
      const updatedPreferences: UIPreferences = {
        ...currentPreferences,
        ...preferences,
      };
      
      // Validate preferences
      this.validateUIPreferences(updatedPreferences);
      
      // Save to storage
      this.storage.set(this.uiPreferencesKey, JSON.stringify(updatedPreferences));
    } catch (error) {
      console.error('Failed to update UI preferences:', error);
      throw new Error('Failed to update UI preferences');
    }
  }

  /**
   * Reset all settings to defaults
   */
  async resetToDefaults(): Promise<void> {
    try {
      // Reset inference settings
      this.storage.set(
        this.inferenceSettingsKey,
        JSON.stringify(DEFAULT_INFERENCE_SETTINGS)
      );
      
      // Reset UI preferences
      this.storage.set(
        this.uiPreferencesKey,
        JSON.stringify(DEFAULT_UI_PREFERENCES)
      );
    } catch (error) {
      console.error('Failed to reset settings to defaults:', error);
      throw new Error('Failed to reset settings to defaults');
    }
  }

  // Private validation methods

  /**
   * Validate inference settings ranges
   */
  private validateInferenceSettings(settings: InferenceSettings): void {
    // Validate temperature (0-1)
    if (settings.temperature < 0 || settings.temperature > 1) {
      throw new Error('Temperature must be between 0 and 1');
    }
    
    // Validate maxTokens (must be positive)
    if (settings.maxTokens <= 0) {
      throw new Error('Max tokens must be greater than 0');
    }
    
    // Validate maxTokens upper bound (reasonable limit)
    if (settings.maxTokens > 4096) {
      throw new Error('Max tokens cannot exceed 4096');
    }
    
    // Validate topP (0-1)
    if (settings.topP < 0 || settings.topP > 1) {
      throw new Error('Top P must be between 0 and 1');
    }
    
    // Validate contextWindowSize (must be positive)
    if (settings.contextWindowSize <= 0) {
      throw new Error('Context window size must be greater than 0');
    }
    
    // Validate contextWindowSize upper bound
    if (settings.contextWindowSize > 8192) {
      throw new Error('Context window size cannot exceed 8192');
    }
    
    // Validate streamingEnabled is boolean
    if (typeof settings.streamingEnabled !== 'boolean') {
      throw new Error('Streaming enabled must be a boolean');
    }
  }

  /**
   * Validate UI preferences
   */
  private validateUIPreferences(preferences: UIPreferences): void {
    // Validate theme
    const validThemes = ['light', 'dark', 'auto'];
    if (!validThemes.includes(preferences.theme)) {
      throw new Error('Theme must be one of: light, dark, auto');
    }
    
    // Validate fontSize
    const validFontSizes = ['small', 'medium', 'large'];
    if (!validFontSizes.includes(preferences.fontSize)) {
      throw new Error('Font size must be one of: small, medium, large');
    }
    
    // Validate boolean preferences
    if (typeof preferences.hapticFeedback !== 'boolean') {
      throw new Error('Haptic feedback must be a boolean');
    }
    
    if (typeof preferences.soundEffects !== 'boolean') {
      throw new Error('Sound effects must be a boolean');
    }
    
    if (typeof preferences.showTimestamps !== 'boolean') {
      throw new Error('Show timestamps must be a boolean');
    }
    
    if (typeof preferences.messageAnimations !== 'boolean') {
      throw new Error('Message animations must be a boolean');
    }
  }
}

// Export singleton instance
export const settingsStore = new SettingsStore();
