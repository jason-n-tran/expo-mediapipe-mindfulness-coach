import React, { useState } from 'react';
import { View, TextInput, Pressable, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, TYPOGRAPHY, LAYOUT, BORDER_RADIUS, ANIMATION } from '@/constants/theme';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  enableHaptics?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = 'Type your message...',
  enableHaptics = true,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const buttonScale = useSharedValue(1);
  const buttonRotation = useSharedValue(0);

  const handleSend = async () => {
    if (message.trim() && !disabled) {
      // Enhanced haptic feedback
      if (enableHaptics && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Animate button
      buttonScale.value = withSequence(
        withTiming(0.85, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      
      buttonRotation.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withSpring(0, { damping: 10, stiffness: 200 })
      );
      
      onSend(message.trim());
      setMessage('');
    }
  };

  const canSend = message.trim().length > 0 && !disabled;

  // Animated styles for send button
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: buttonScale.value },
      { rotate: `${buttonRotation.value}deg` },
    ],
  }));

  return (
    <View 
      className="px-4 py-3 bg-white border-t border-neutral-200"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View className="flex-row items-end">
        <View 
          className="flex-1 bg-neutral-100 rounded-3xl px-4 py-2 mr-2"
          style={{ minHeight: LAYOUT.inputMinHeight }}
        >
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={placeholder}
            placeholderTextColor={COLORS.neutral[400]}
            multiline
            editable={!disabled}
            className="text-base text-neutral-900"
            style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              lineHeight: TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal,
              maxHeight: LAYOUT.inputMaxHeight - 16,
              paddingTop: Platform.OS === 'ios' ? 8 : 4,
              paddingBottom: Platform.OS === 'ios' ? 8 : 4,
            }}
            returnKeyType="default"
          />
        </View>

        <AnimatedPressable
          onPress={handleSend}
          disabled={!canSend}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            canSend ? 'bg-blue-500' : 'bg-neutral-300'
          }`}
          style={[
            {
              shadowColor: canSend ? COLORS.primary[500] : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: canSend ? 3 : 0,
            },
            buttonAnimatedStyle,
          ]}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={canSend ? '#ffffff' : COLORS.neutral[500]} 
          />
        </AnimatedPressable>
      </View>
    </View>
  );
}
