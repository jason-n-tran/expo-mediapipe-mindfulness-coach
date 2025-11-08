import React, { memo, useEffect, useState, useRef } from 'react';
import { Text, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming,
  useSharedValue,
  FadeIn,
  withSpring,
} from 'react-native-reanimated';
import { TYPOGRAPHY, ANIMATION } from '@/constants/theme';

interface StreamingTextProps {
  text: string;
  isComplete?: boolean;
  className?: string;
  style?: any;
  bufferSize?: number; // Number of tokens to buffer before updating UI
  enableAnimations?: boolean;
}

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedView = Animated.createAnimatedComponent(View);

// Memoized component with token buffering for smooth streaming
const StreamingTextComponent = ({
  text,
  isComplete = false,
  className = '',
  style = {},
  bufferSize = 3, // Default buffer size from APP_CONFIG
  enableAnimations = true,
}: StreamingTextProps) => {
  const [displayText, setDisplayText] = useState('');
  const bufferRef = useRef<string>('');
  const lastUpdateRef = useRef<number>(Date.now());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cursor animation - smooth pulsing
  const cursorOpacity = useSharedValue(1);
  const cursorScale = useSharedValue(1);
  
  useEffect(() => {
    if (!isComplete && enableAnimations) {
      // Animate cursor while streaming with smooth pulse
      cursorOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
      
      cursorScale.value = withRepeat(
        withSequence(
          withSpring(0.95, { damping: 10, stiffness: 100 }),
          withSpring(1, { damping: 10, stiffness: 100 })
        ),
        -1,
        true
      );
    } else {
      cursorOpacity.value = withTiming(0, { duration: ANIMATION.duration.fast });
      cursorScale.value = 1;
    }
  }, [isComplete, enableAnimations]);
  
  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
    transform: [{ scale: cursorScale.value }],
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
    <AnimatedView 
      className="flex-row items-start"
      entering={enableAnimations ? FadeIn.duration(ANIMATION.duration.fast) : undefined}
    >
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
    </AnimatedView>
  );
};

// Memoize to prevent unnecessary re-renders
export const StreamingText = memo(StreamingTextComponent, (prevProps, nextProps) => {
  return (
    prevProps.text === nextProps.text &&
    prevProps.isComplete === nextProps.isComplete &&
    prevProps.enableAnimations === nextProps.enableAnimations
  );
});