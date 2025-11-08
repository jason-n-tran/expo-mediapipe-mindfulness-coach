import React, { memo, useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import Animated, { 
  SlideInRight,
  SlideInLeft,
  withSpring,
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { TYPOGRAPHY, ANIMATION } from '@/constants/theme';
import {
  Menu,
  MenuItem,
  MenuItemLabel,
} from '@/components/ui/menu';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onDelete?: (messageId: string) => void;
  showTimestamp?: boolean;
  enableAnimations?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Memoized component to prevent unnecessary re-renders
const ChatMessageComponent = ({ 
  message, 
  isStreaming = false, 
  onDelete,
  showTimestamp = false,
  enableAnimations = true,
}: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const scale = useSharedValue(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // System messages are typically hidden or styled differently
  if (isSystem) {
    return null;
  }

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  // Enhanced entrance animation based on role
  const getEntranceAnimation = () => {
    if (!enableAnimations) return undefined;
    
    if (isUser) {
      // User messages slide in from right with fade
      return SlideInRight
        .duration(ANIMATION.duration.normal)
        .springify()
        .damping(150)
        .stiffness(150);
    } else {
      // Assistant messages slide in from left with fade and slight scale
      return SlideInLeft
        .duration(ANIMATION.duration.normal)
        .springify()
        .damping(150)
        .stiffness(150);
    }
  };

  // Handle long press with haptic feedback
  const handleLongPress = async () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Animate scale for visual feedback
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    
    setIsMenuOpen(true);
  };

  // Handle delete action
  const handleDelete = () => {
    setIsMenuOpen(false);
    onDelete?.(message.id);
  };

  // Animated style for press feedback
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <AnimatedPressable
        entering={getEntranceAnimation()}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={animatedStyle}
      >
        <View
          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-blue-500 rounded-br-sm' 
              : 'bg-neutral-100 rounded-bl-sm'
          }`}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Text
            className={`text-base leading-relaxed ${
              isUser ? 'text-white' : 'text-neutral-900'
            }`}
            style={{
              fontSize: TYPOGRAPHY.fontSize.base,
              lineHeight: TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.relaxed,
            }}
          >
            {message.content}
          </Text>
          
          {showTimestamp && (
            <Text
              className={`text-xs mt-1 ${
                isUser ? 'text-blue-100' : 'text-neutral-500'
              }`}
              style={{ fontSize: TYPOGRAPHY.fontSize.xs }}
            >
              {formatTimestamp(message.timestamp)}
            </Text>
          )}
        </View>
      </AnimatedPressable>

      <Menu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onOpen={() => setIsMenuOpen(true)}
        trigger={({ ...triggerProps }) => {
          return <Text {...triggerProps} className="text-background-900 h-1"> </Text>;
        }}
      >
        <MenuItem key="delete" textValue="Delete" onPress={handleDelete}>
          <MenuItemLabel size="sm">Delete Message</MenuItemLabel>
        </MenuItem>
      </Menu>
    </View>
  );
};

// Memoize with custom comparison to prevent re-renders when message content hasn't changed
export const ChatMessage = memo(ChatMessageComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.showTimestamp === nextProps.showTimestamp &&
    prevProps.enableAnimations === nextProps.enableAnimations &&
    prevProps.onDelete === nextProps.onDelete
  );
});
