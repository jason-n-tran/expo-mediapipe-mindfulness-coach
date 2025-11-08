/**
 * useMessageStore Hook
 * Wraps MessageStore service with React state
 * Provides messages array and CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { messageStore } from '@/services/storage/MessageStore';
import type { ChatMessage, ConversationStats } from '@/types';

interface UseMessageStoreReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  saveMessage: (message: ChatMessage, immediate?: boolean) => Promise<void>;
  loadMessages: (limit?: number) => Promise<void>;
  searchMessages: (query: string) => Promise<ChatMessage[]>;
  deleteMessages: (messageIds: string[]) => Promise<void>;
  clearAllMessages: () => Promise<void>;
  exportMessages: () => Promise<string>;
  getStatistics: () => Promise<ConversationStats>;
  refreshMessages: () => Promise<void>;
}

export function useMessageStore(sessionId?: string): UseMessageStoreReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load messages from storage
   */
  const loadMessages = useCallback(async (limit?: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedMessages = await messageStore.getMessages(limit);
      
      // Filter by session if sessionId is provided
      const filteredMessages = sessionId 
        ? loadedMessages.filter(m => m.sessionId === sessionId)
        : loadedMessages;
      
      setMessages(filteredMessages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  /**
   * Save a new message
   */
  const saveMessage = useCallback(async (message: ChatMessage, immediate: boolean = false) => {
    try {
      setError(null);
      console.log('[useMessageStore] Saving message:', { 
        id: message.id, 
        role: message.role, 
        contentLength: message.content.length,
        immediate 
      });
      
      await messageStore.saveMessage(message, immediate);
      
      // Add message to local state immediately for optimistic update
      setMessages(prev => {
        const updated = [...prev, message];
        console.log('[useMessageStore] State updated. New count:', updated.length);
        return updated;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save message';
      setError(errorMessage);
      console.error('Error saving message:', err);
      
      // Remove the optimistically added message on error
      setMessages(prev => prev.filter(msg => msg.id !== message.id));
      throw err;
    }
  }, []);

  /**
   * Search messages by content
   */
  const searchMessages = useCallback(async (query: string): Promise<ChatMessage[]> => {
    try {
      setError(null);
      const results = await messageStore.searchMessages(query);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search messages';
      setError(errorMessage);
      console.error('Error searching messages:', err);
      return [];
    }
  }, []);

  /**
   * Delete specific messages
   */
  const deleteMessages = useCallback(async (messageIds: string[]) => {
    try {
      setError(null);
      
      // Optimistically remove from local state
      setMessages(prev => prev.filter(msg => !messageIds.includes(msg.id)));
      
      await messageStore.deleteMessages(messageIds);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete messages';
      setError(errorMessage);
      console.error('Error deleting messages:', err);
      
      // Reload messages on error to restore state
      await loadMessages();
      throw err;
    }
  }, [loadMessages]);

  /**
   * Clear all messages
   */
  const clearAllMessages = useCallback(async () => {
    try {
      setError(null);
      
      // Optimistically clear local state
      setMessages([]);
      
      await messageStore.clearAllMessages();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear messages';
      setError(errorMessage);
      console.error('Error clearing messages:', err);
      
      // Reload messages on error to restore state
      await loadMessages();
      throw err;
    }
  }, [loadMessages]);

  /**
   * Export conversation history
   */
  const exportMessages = useCallback(async (): Promise<string> => {
    try {
      setError(null);
      const exportData = await messageStore.exportMessages();
      return exportData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export messages';
      setError(errorMessage);
      console.error('Error exporting messages:', err);
      throw err;
    }
  }, []);

  /**
   * Get conversation statistics
   */
  const getStatistics = useCallback(async (): Promise<ConversationStats> => {
    try {
      setError(null);
      const stats = await messageStore.getStatistics();
      return stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get statistics';
      setError(errorMessage);
      console.error('Error getting statistics:', err);
      return {
        totalMessages: 0,
        totalSessions: 0,
        averageMessagesPerDay: 0,
      };
    }
  }, []);

  /**
   * Refresh messages from storage
   */
  const refreshMessages = useCallback(async () => {
    await loadMessages();
  }, [loadMessages]);

  /**
   * Load messages on mount and when sessionId changes
   */
  useEffect(() => {
    console.log('[useMessageStore] Loading messages for session:', sessionId);
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    isLoading,
    error,
    saveMessage,
    loadMessages,
    searchMessages,
    deleteMessages,
    clearAllMessages,
    exportMessages,
    getStatistics,
    refreshMessages,
  };
}
