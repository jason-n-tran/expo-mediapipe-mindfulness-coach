import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/theme';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onLongPress?: () => void;
  showTimestamp?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ChatMessage({ 
  message, 
  isStreaming = false, 
  onLongPress,
  showTimestamp = false 
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
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

  return (
    <AnimatedPressable
      entering={FadeInUp.duration(300)}
      onLongPress={onLongPress}
      className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}
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
  );
}
