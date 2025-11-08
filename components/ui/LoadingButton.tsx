import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';

interface LoadingButtonProps {
  onPress: () => void | Promise<void>;
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  enableHaptics?: boolean;
  style?: any;
  textStyle?: any;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function LoadingButton({
  onPress,
  title,
  loading = false,
  disabled = false,
  variant = 'primary',
  enableHaptics = true,
  style,
  textStyle,
}: LoadingButtonProps) {
  const scale = useSharedValue(1);

  const handlePress = async () => {
    if (loading || disabled) return;

    // Haptic feedback
    if (enableHaptics && (Platform.OS === 'ios' || Platform.OS === 'android')) {
      const feedbackStyle = variant === 'danger' 
        ? Haptics.ImpactFeedbackStyle.Heavy 
        : Haptics.ImpactFeedbackStyle.Medium;
      await Haptics.impactAsync(feedbackStyle);
    }

    // Animate button press
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    await onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primaryButton);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.secondaryButton);
    } else if (variant === 'danger') {
      baseStyle.push(styles.dangerButton);
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabledButton);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    if (variant === 'primary') {
      baseStyle.push(styles.primaryText);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.secondaryText);
    } else if (variant === 'danger') {
      baseStyle.push(styles.dangerText);
    }

    if (disabled || loading) {
      baseStyle.push(styles.disabledText);
    }

    return baseStyle;
  };

  return (
    <AnimatedTouchable
      style={[getButtonStyle(), animatedStyle, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? '#ffffff' : COLORS.primary[500]} 
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: COLORS.primary[500],
    shadowColor: COLORS.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: COLORS.background.tertiary,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  dangerButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: COLORS.primary[500],
  },
  dangerText: {
    color: COLORS.error,
  },
  disabledText: {
    opacity: 0.7,
  },
});
