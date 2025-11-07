import React, { useState } from 'react';
import { View, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, TYPOGRAPHY, LAYOUT, BORDER_RADIUS } from '@/constants/theme';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSend, 
  disabled = false, 
  placeholder = 'Type your message...' 
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(LAYOUT.inputMinHeight);

  const handleSend = async () => {
    if (message.trim() && !disabled) {
      // Haptic feedback
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      onSend(message.trim());
      setMessage('');
      setInputHeight(LAYOUT.inputMinHeight);
    }
  };

  const handleContentSizeChange = (event: any) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(
      Math.max(LAYOUT.inputMinHeight, height + 16),
      LAYOUT.inputMaxHeight
    );
    setInputHeight(newHeight);
  };

  const canSend = message.trim().length > 0 && !disabled;

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
            onContentSizeChange={handleContentSizeChange}
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
            blurOnSubmit={false}
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            canSend ? 'bg-blue-500' : 'bg-neutral-300'
          }`}
          style={{
            shadowColor: canSend ? COLORS.primary[500] : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: canSend ? 3 : 0,
          }}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={canSend ? '#ffffff' : COLORS.neutral[500]} 
          />
        </Pressable>
      </View>
    </View>
  );
}
