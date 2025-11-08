import React, { memo, useEffect, useState, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue 
} from 'react-native-reanimated';
import { TYPOGRAPHY } from '@/constants/theme';

interface StreamingTextProps {
  text: string;
  isComplete?: boolean;
  className?: string;
  style?: any;
  bufferSize?: number; // Number of tokens to buffer before updating UI
}

const AnimatedText = Animated.createAnimatedComponent(Text);

// Memoized component with token buffering for smooth streaming
const StreamingTextComponent = ({
  text,
  isComplete = false,
  className = '',
  style = {},
  bufferSize = 3, // Default buffer size from APP_CONFIG
}: StreamingTextProps) => {
  const [displayText, setDisplayText] = useState('');
  const bufferRef = useRef<string>('');
  const lastUpdateRef = useRef<number>(Date.now());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cursor animation
  const cursorOpacity = useSharedValue(1);
  
  useEffect(() => {
    if (!isComplete) {
      // Animate cursor while streaming
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
  
  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  // Token buffering effect
  useEffect(() => {
    // If text is complete, show all immediately
    if (isComplete) {
      setDisplayText(text);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      return;
    }

    // Calculate new tokens
    const newTokens = text.slice(displayText.length);
    
    if (newTokens.length === 0) {
      return;
    }

    // Add to buffer
    bufferRef.current += newTokens;

    // Update display if buffer is full or enough time has passed
    const timeSinceLastUpdate = Date.now() - lastUpdateRef.current;
    const shouldUpdate = 
      bufferRef.current.length >= bufferSize || 
      timeSinceLastUpdate > 50; // Max 50ms delay

    if (shouldUpdate) {
      setDisplayText(prev => prev + bufferRef.current);
      bufferRef.current = '';
      lastUpdateRef.current = Date.now();
    } else if (!updateIntervalRef.current) {
      // Set up interval to flush buffer periodically
      updateIntervalRef.current = setInterval(() => {
        if (bufferRef.current.length > 0) {
          setDisplayText(prev => prev + bufferRef.current);
          bufferRef.current = '';
          lastUpdateRef.current = Date.now();
        }
      }, 30); // Update every 30ms for smooth display
    }

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [text, isComplete, bufferSize, displayText.length]);

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
        {displayText}
        {!isComplete && (
          <AnimatedText style={[{ color: 'inherit' }, cursorStyle]}>
            ▊
          </AnimatedText>
        )}
      </Text>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders
export const StreamingText = memo(StreamingTextComponent, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.isComplete === nextProps.isComplete
  );
});