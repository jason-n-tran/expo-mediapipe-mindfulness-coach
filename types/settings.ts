/**
 * Settings-related type definitions
 */

export interface InferenceSettings {
  temperature: number;
  maxTokens: number;
  topP: number;
  contextWindowSize: number;
  streamingEnabled: boolean;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  hapticFeedback: boolean;
  soundEffects: boolean;
  showTimestamps: boolean;
  messageAnimations: boolean;
}

export interface AppSettings {
  inference: InferenceSettings;
  ui: UIPreferences;
  privacy: {
    dataRetentionDays: number;
    analyticsEnabled: boolean;
  };
  version: string;
  lastModified: Date;
}
