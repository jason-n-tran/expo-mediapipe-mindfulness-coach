import React from 'react';
import { Text, View } from 'react-native';
import { TYPOGRAPHY } from '@/constants/theme';

interface StaticTextProps {
  text: string;
  className?: string;
  style?: any;
}

export function StreamingText({
  text,
  className = '',
  style = {},
}: StaticTextProps) {
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
        {text}
      </Text>
    </View>
  );
}