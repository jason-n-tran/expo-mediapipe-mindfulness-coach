import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { TYPOGRAPHY } from '@/constants/theme';

interface StreamingTextProps {
  text: string;
  isComplete: boolean;
  animationSpeed?: number;
  className?: string;
  style?: any;
}

export function StreamingText({ 
  text, 
  isComplete, 
  animationSpeed = 30,
  className = '',
  style = {},
}: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const cursorOpacity = useSharedValue(1);

  // Animate cursor blinking
  useEffect(() => {
    if (!isComplete) {
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      cursorOpacity.value = 0;
    }
  }, [isComplete]);

  // Character-by-character reveal
  useEffect(() => {
    if (text.length === 0) {
      setDisplayedText('');
      return;
    }

    // If complete, show all text immediately
    if (isComplete) {
      setDisplayedText(text);
      return;
    }

    // Streaming animation
    let currentIndex = displayedText.length;
    
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
      }, animationSpeed);

      return () => clearTimeout(timer);
    }
  }, [text, isComplete, animationSpeed, displayedText.length]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <View className="flex-row items-start">
      <Text
        className={className}
        style={[
          {
            fontSize: TYPOGRAPHY.fontSize.base,
            lineHeight: TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.relaxed,
          },
          style,
        ]}
      >
        {displayedText}
        {!isComplete && (
          <Animated.Text style={[{ fontSize: TYPOGRAPHY.fontSize.base }, cursorStyle]}>
            ▊
          </Animated.Text>
        )}
      </Text>
    </View>
  );
}
