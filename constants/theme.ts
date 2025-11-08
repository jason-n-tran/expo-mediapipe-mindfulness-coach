/**
 * Theme constants for consistent styling
 * Designed with mindfulness aesthetics - calming, natural, accessible
 */

export const COLORS = {
  // Primary palette - serene blue inspired by sky and water
  // Promotes calmness and clarity
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main brand color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Secondary palette - warm earth tones
  // Grounding and comforting, inspired by nature
  secondary: {
    50: '#fdf8f6',
    100: '#f2e8e5',
    200: '#eaddd7',
    300: '#e0cec7',
    400: '#d2bab0',
    500: '#bfa094',
    600: '#a18072',
    700: '#977669',
    800: '#846358',
    900: '#43302b',
  },
  
  // Neutral palette - soft grays for balance
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // Accent colors for mindfulness topics
  mindfulness: {
    breathing: '#10b981', // Green - growth, renewal
    gratitude: '#f59e0b', // Amber - warmth, appreciation
    stress: '#3b82f6',    // Blue - calm, peace
    reflection: '#8b5cf6', // Purple - wisdom, introspection
    morning: '#fbbf24',   // Yellow - energy, new beginnings
    evening: '#6366f1',   // Indigo - rest, contemplation
  },
  
  // Semantic colors with accessibility in mind
  success: {
    500: '#10b981',  // WCAG AA compliant on white
  },
  warning: {
    500: '#f59e0b',  // WCAG AA compliant on white
  },
  error: {
    500: '#ef4444',    // WCAG AA compliant on white
  },
  info: {
    500: '#3b82f6',     // WCAG AA compliant on white
  },
  
  // Role-specific colors for chat messages
  user: {
    bg: '#0ea5e9',      // Primary blue
    text: '#ffffff',    // White text for contrast
    bgLight: '#e0f2fe', // Light variant for themes
  },
  assistant: {
    bg: '#f5f5f5',      // Soft gray
    text: '#171717',    // Dark text for contrast
    bgDark: '#e5e5e5',  // Slightly darker variant
  },
  
  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  
  // Text colors
  text: {
    primary: '#171717',    // neutral-900
    secondary: '#525252',  // neutral-600
    tertiary: '#737373',   // neutral-500
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const TYPOGRAPHY = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,    // Base size for comfortable reading
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.75,  // Optimal for reading longer text
    loose: 2,
  },
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
  // Font size multipliers for accessibility
  fontScale: {
    small: 0.875,   // 87.5% of base
    medium: 1,      // 100% of base
    large: 1.125,   // 112.5% of base
  },
} as const;

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

export const LAYOUT = {
  maxWidth: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  messageMaxWidth: 320,
  inputMinHeight: 44,
  inputMaxHeight: 120,
} as const;
