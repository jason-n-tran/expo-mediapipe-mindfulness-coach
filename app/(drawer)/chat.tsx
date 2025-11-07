/**
 * Main Chat Screen
 * Provides the primary interface for conversing with the mindfulness coach
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { 
  View, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { QuickActions } from '@/components/chat/QuickActions';
import { StreamingText } from '@/components/chat/StreamingText';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useChat } from '@/hooks/useChat';
import { ChatMessage as ChatMessageType, QuickAction } from '@/types';
import { COLORS, SPACING } from '@/constants/theme';

export default function ChatScreen() {
  const {
    messages,
    isGenerating,
    isLoading,
    error,
    streamingMessage,
    sendMessage,
    sendQuickAction,
    stopGeneration,
  } = useChat();

  const flatListRef = useRef<FlatList>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive (with debouncing)
  useEffect(() => {
    if (!isUserScrolling && (messages.length > 0 || streamingMessage)) {
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Debounce scroll during streaming for performance
      scrollTimeoutRef.current = setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, isGenerating ? 300 : 100);
    }

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages.length, streamingMessage, isGenerating, isUserScrolling]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Messages are already loaded from storage via useChat
    // This is just for visual feedback
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, []);

  // Handle message sending
  const handleSendMessage = useCallback(async (content: string) => {
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }, [sendMessage]);

  // Handle quick action selection
  const handleQuickAction = useCallback(async (action: QuickAction) => {
    try {
      await sendQuickAction(action);
    } catch (err) {
      console.error('Failed to send quick action:', err);
    }
  }, [sendQuickAction]);

  // Track user scrolling to prevent auto-scroll interference
  const handleScrollBeginDrag = useCallback(() => {
    setIsUserScrolling(true);
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    // Reset after a delay to allow auto-scroll for new messages
    setTimeout(() => {
      setIsUserScrolling(false);
    }, 1000);
  }, []);

  // Render individual message
  const renderMessage = useCallback(({ item }: { item: ChatMessageType }) => {
    return <ChatMessage message={item} showTimestamp={false} />;
  }, []);

  // Render streaming message (assistant's current response)
  const renderStreamingMessage = () => {
    if (!streamingMessage) return null;

    return (
      <View className="px-4 mb-3">
        <View
          className="max-w-[80%] bg-neutral-100 rounded-2xl rounded-bl-sm px-4 py-3 self-start"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <StreamingText
            text={streamingMessage}
            isComplete={false}
            className="text-base text-neutral-900"
          />
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color={COLORS.primary[500]} />
          <Text className="text-neutral-500 mt-4 text-center">
            Loading conversation...
          </Text>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center p-8">
        <Text className="text-2xl mb-2">🧘</Text>
        <Text className="text-lg font-semibold text-neutral-900 mb-2 text-center">
          Welcome to Your Mindfulness Coach
        </Text>
        <Text className="text-base text-neutral-600 text-center">
          Share what's on your mind, or try a quick action below to get started.
        </Text>
      </View>
    );
  };

  // Render error message
  const renderError = () => {
    if (!error) return null;

    return (
      <View className="px-4 py-3 bg-red-50 border-t border-red-200">
        <Text className="text-red-800 text-sm">
          {error}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages List - Inverted for bottom-to-top flow */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={{
            paddingTop: SPACING.md,
            flexGrow: 1,
          }}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={
            <>
              {renderStreamingMessage()}
              <TypingIndicator visible={isGenerating && !streamingMessage} />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary[500]}
            />
          }
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          showsVerticalScrollIndicator={true}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />

        {/* Error Display */}
        {renderError()}

        {/* Quick Actions */}
        <QuickActions
          onActionSelect={handleQuickAction}
          disabled={isGenerating}
        />

        {/* Chat Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isGenerating}
          placeholder="Share what's on your mind..."
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
