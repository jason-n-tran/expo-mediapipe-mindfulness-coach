/**
 * Application configuration constants
 */

export const APP_CONFIG = {
  model: {
    name: 'gemma-3n-E4B-it-int4.task', // Using working model for now
    // name: 'gemma3-1B-it-int4.task', // Using working model for now
    downloadUrl: 'configured-by-expo-llm-mediapipe',
    maxContextTokens: 2048,
    defaultTemperature: 0.7,
    defaultMaxTokens: 2048, // Increased to match maxContextTokens
  },
  storage: {
    messageRetentionDays: 90,
    maxMessagesInMemory: 100,
    autoBackupEnabled: true,
  },
  ui: {
    streamingDelay: 30, // ms between token updates
    animationDuration: 300,
    hapticEnabled: true,
  },
  performance: {
    tokenBufferSize: 3,
    maxConcurrentInferences: 1,
    inferenceTimeout: 30000, // 30 seconds
  },
} as const;

export const DEFAULT_INFERENCE_SETTINGS = {
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  contextWindowSize: 2048,
  streamingEnabled: true,
} as const;

export const DEFAULT_UI_PREFERENCES = {
  theme: 'auto' as const,
  fontSize: 'medium' as const,
  hapticFeedback: true,
  soundEffects: false,
  showTimestamps: true,
  messageAnimations: true,
} as const;

export const STORAGE_KEYS = {
  MESSAGES: 'messages',
  SESSIONS: 'sessions',
  SETTINGS: 'settings',
  MODEL_METADATA: 'model_metadata',
  USER_PREFERENCES: 'user_preferences',
  FIRST_LAUNCH: 'first_launch',
} as const;
