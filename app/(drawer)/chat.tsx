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
    isReady,
    error,
    streamingMessage,
    sendMessage,
    sendQuickAction,
    stopGeneration,
  } = useChat();

  // Debug: Log when isReady changes
  useEffect(() => {
    console.log('[ChatScreen] isReady changed:', isReady);
  }, [isReady]);

  // Debug: Log when messages change
  useEffect(() => {
    console.log('[ChatScreen] Messages changed. Count:', messages.length);
    console.log('[ChatScreen] Assistant message count:', messages.filter(m => m.role === 'assistant').length);
    console.log('[ChatScreen] User message count:', messages.filter(m => m.role === 'user').length);
    console.log('[ChatScreen] Last 3 messages:', messages.slice(-3).map(m => ({ 
      id: m.id, 
      role: m.role, 
      contentLength: m.content.length,
      content: m.content.substring(0, 30) 
    })));
  }, [messages]);

  const flatListRef = useRef<FlatList>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  // useEffect(() => {
  //   if (!isUserScrolling && messages.length > 0) {
  //     // Small delay to ensure render is complete
  //     setTimeout(() => {
  //       flatListRef.current?.scrollToEnd({ animated: true });
  //     }, 100);
  //   }
  // }, [messages.length, isUserScrolling]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (streamingMessage && !isUserScrolling) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [streamingMessage, isUserScrolling]);

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
    console.log('[ChatScreen] Rendering message:', { 
      id: item.id, 
      role: item.role, 
      contentLength: item.content.length 
    });
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
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: SPACING.md,
            paddingBottom: SPACING.md,
            flexGrow: 1,
          }}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
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
          disabled={isGenerating || !isReady}
          placeholder={isReady ? "Share what's on your mind..." : "Initializing..."}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
