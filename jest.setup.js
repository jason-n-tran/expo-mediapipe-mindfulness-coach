// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}));

// Mock expo-llm-mediapipe
jest.mock('expo-llm-mediapipe', () => ({
  __esModule: true,
  default: {
    isModelDownloaded: jest.fn(),
    downloadModel: jest.fn(),
    cancelDownload: jest.fn(),
    createModelFromDownloaded: jest.fn(),
    generateResponseAsync: jest.fn(),
    releaseModel: jest.fn(),
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
  GestureDetector: 'GestureDetector',
  Gesture: {
    Pan: jest.fn(),
    Tap: jest.fn(),
  },
}));

// Silence console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
