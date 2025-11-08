import React from 'react';
import { ScrollView, Pressable, Text, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { QuickAction } from '@/types/chat';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/theme';

interface QuickActionsProps {
  onActionSelect: (action: QuickAction) => void;
  disabled?: boolean;
}

interface ActionConfig {
  action: QuickAction;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const QUICK_ACTIONS: ActionConfig[] = [
  {
    action: QuickAction.BreathingExercise,
    label: 'Breathing',
    icon: 'leaf-outline',
    color: COLORS.mindfulness.breathing,
  },
  {
    action: QuickAction.DailyReflection,
    label: 'Reflection',
    icon: 'bulb-outline',
    color: COLORS.mindfulness.reflection,
  },
  {
    action: QuickAction.GratitudePractice,
    label: 'Gratitude',
    icon: 'heart-outline',
    color: COLORS.mindfulness.gratitude,
  },
  {
    action: QuickAction.StressRelief,
    label: 'Stress Relief',
    icon: 'water-outline',
    color: COLORS.mindfulness.stress,
  },
  {
    action: QuickAction.MorningIntention,
    label: 'Morning',
    icon: 'sunny-outline',
    color: COLORS.mindfulness.morning,
  },
  {
    action: QuickAction.EveningReview,
    label: 'Evening',
    icon: 'moon-outline',
    color: COLORS.mindfulness.evening,
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuickActions({ onActionSelect, disabled = false }: QuickActionsProps) {
  const handleActionPress = async (action: QuickAction) => {
    if (!disabled) {
      // Haptic feedback
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onActionSelect(action);
    }
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(400).delay(200)}
      className="py-3 bg-white border-t border-neutral-100"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SPACING.md,
          gap: SPACING.sm,
        }}
      >
        {QUICK_ACTIONS.map((config, index) => (
          <AnimatedPressable
            key={config.action}
            entering={FadeInDown.duration(300).delay(100 * index)}
            onPress={() => handleActionPress(config.action)}
            disabled={disabled}
            className={`px-4 py-3 rounded-2xl flex-row items-center ${
              disabled ? 'opacity-50' : ''
            }`}
            style={{
              backgroundColor: `${config.color}15`,
              borderWidth: 1,
              borderColor: `${config.color}30`,
            }}
          >
            <Ionicons 
              name={config.icon} 
              size={20} 
              color={config.color}
              style={{ marginRight: SPACING.xs }}
            />
            <Text
              className="font-medium"
              style={{
                fontSize: TYPOGRAPHY.fontSize.sm,
                color: config.color,
                fontWeight: TYPOGRAPHY.fontWeight.medium,
              }}
            >
              {config.label}
            </Text>
          </AnimatedPressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}
