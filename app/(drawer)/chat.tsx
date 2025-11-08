/**
 * Main Chat Screen
 * Provides the primary interface for conversing with the mindfulness coach
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { 
  View, 
  KeyboardAvoidingView, 
  Platform,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { QuickActions } from '@/components/chat/QuickActions';
import { StreamingText } from '@/components/chat/StreamingText';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { useChatHistory } from '@/hooks/useChatHistory';
import { ChatMessage as ChatMessageType, QuickAction } from '@/types';
import { COLORS, SPACING } from '@/constants/theme';

export default function ChatScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { currentSessionId, createNewChat, switchToChat } = useChatHistory();
  
  // Track the active session ID - use params first, then currentSessionId
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>(() => {
    return (params.sessionId as string) || currentSessionId || undefined;
  });
  
  // Update active session when params or currentSessionId changes
  useEffect(() => {
    const newSessionId = (params.sessionId as string) || currentSessionId || undefined;
    console.log('[ChatScreen] Session change detected:', {
      newSessionId,
      activeSessionId,
      paramsSessionId: params.sessionId,
      currentSessionId,
    });
    if (newSessionId && newSessionId !== activeSessionId) {
      console.log('[ChatScreen] Switching to session:', newSessionId);
      setActiveSessionId(newSessionId);
      if (params.sessionId) {
        switchToChat(params.sessionId as string);
      }
    }
  }, [params.sessionId, currentSessionId]);
  
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
    deleteMessages,
  } = useChat({ sessionId: activeSessionId });
  
  const { uiPreferences } = useSettings();

  // Set up header buttons
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 8 }}>
          <TouchableOpacity
            onPress={() => {
              const newId = createNewChat();
              setActiveSessionId(newId);
              // Use replace to force re-render with new session
              router.replace({
                pathname: '/(drawer)/chat',
                params: { sessionId: newId },
              });
            }}
            style={{ padding: 8, marginRight: 8 }}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(drawer)/chat-history')}
            style={{ padding: 8 }}
          >
            <Ionicons name="time-outline" size={24} color={COLORS.primary[500]} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, router, createNewChat]);

  // Debug: Log when isReady changes
  useEffect(() => {
    console.log('[ChatScreen] isReady changed:', isReady);
  }, [isReady]);

  // Debug: Log when messages change
  useEffect(() => {
    console.log('[ChatScreen] Messages changed for session:', activeSessionId);
    console.log('[ChatScreen] Messages count:', messages.length);
    console.log('[ChatScreen] Assistant message count:', messages.filter(m => m.role === 'assistant').length);
    console.log('[ChatScreen] User message count:', messages.filter(m => m.role === 'user').length);
    if (messages.length > 0) {
      console.log('[ChatScreen] First message session:', messages[0].sessionId);
      console.log('[ChatScreen] Last 3 messages:', messages.slice(-3).map(m => ({ 
        id: m.id, 
        role: m.role, 
        sessionId: m.sessionId,
        contentLength: m.content.length,
        content: m.content.substring(0, 30) 
      })));
    }
  }, [messages, activeSessionId]);

  const flashListRef = useRef<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced auto-scroll for better performance
  useEffect(() => {
    // Only auto-scroll if the user is not manually scrolling up.
    if (!isUserScrolling && messages.length > 0) {
      // Clear existing timeout
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      
      // Debounce scroll to avoid excessive updates
      scrollDebounceRef.current = setTimeout(() => {
        // flashListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, [messages, isUserScrolling]);

  // Auto-scroll during streaming (debounced)
  useEffect(() => {
    if (streamingMessage && !isUserScrolling) {
      // Clear existing timeout
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      
      // Debounce scroll during streaming for performance
      scrollDebounceRef.current = setTimeout(() => {
        flashListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
    
    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
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

  // Handle message deletion
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessages([messageId]);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }, [deleteMessages]);

  // Render individual message (memoized)
  const renderMessage = useCallback(({ item }: { item: ChatMessageType }) => {
    return (
      <ChatMessage 
        message={item} 
        showTimestamp={uiPreferences.showTimestamps}
        enableAnimations={uiPreferences.messageAnimations}
        onDelete={handleDeleteMessage}
      />
    );
  }, [uiPreferences.showTimestamps, uiPreferences.messageAnimations, handleDeleteMessage]);
  
  // Get item type for FlashList optimization
  const getItemType = useCallback((item: ChatMessageType) => {
    return item.role; // Different types for user/assistant messages
  }, []);

  // Render streaming message (assistant's current response) - memoized
  const renderStreamingMessage = useCallback(() => {
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
            enableAnimations={uiPreferences.messageAnimations}
          />
        </View>
      </View>
    );
  }, [streamingMessage, uiPreferences.messageAnimations]);

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
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']} key={activeSessionId}>
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages List - Using FlashList for better performance */}
        <FlashList
          key={`messages-${activeSessionId}`}
          ref={flashListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          getItemType={getItemType}
          contentContainerStyle={{
            paddingTop: SPACING.md,
            paddingBottom: SPACING.md,
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
          // Performance optimizations
          drawDistance={400}
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
          enableHaptics={uiPreferences.hapticFeedback}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
