/**
 * useChatHistory Hook
 * Manages chat session history and navigation
 */

import { useState, useEffect, useCallback } from 'react';
import { chatHistoryStore, ChatSession } from '@/services/storage/ChatHistoryStore';
import { messageStore } from '@/services/storage/MessageStore';
import { v4 as uuidv4 } from 'uuid';

interface UseChatHistoryReturn {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  createNewChat: () => string;
  switchToChat: (sessionId: string) => void;
  deleteChat: (sessionId: string) => Promise<void>;
  refreshSessions: () => void;
}

export function useChatHistory(): UseChatHistoryReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(() => {
    try {
      setIsLoading(true);
      const loadedSessions = chatHistoryStore.getSessions();
      const currentId = chatHistoryStore.getCurrentSessionId();
      
      // Sort by most recent first
      loadedSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      setSessions(loadedSessions);
      setCurrentSessionId(currentId);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createNewChat = useCallback((): string => {
    const newSessionId = uuidv4();
    chatHistoryStore.createSession(newSessionId);
    chatHistoryStore.setCurrentSessionId(newSessionId);
    messageStore.startNewSession(newSessionId);
    
    setCurrentSessionId(newSessionId);
    loadSessions();
    
    return newSessionId;
  }, [loadSessions]);

  const switchToChat = useCallback((sessionId: string) => {
    chatHistoryStore.setCurrentSessionId(sessionId);
    messageStore.startNewSession(sessionId);
    setCurrentSessionId(sessionId);
  }, []);

  const deleteChat = useCallback(async (sessionId: string) => {
    try {
      // Get all messages for this session
      const allMessages = await messageStore.getMessages();
      const sessionMessages = allMessages.filter(m => m.sessionId === sessionId);
      const messageIds = sessionMessages.map(m => m.id);
      
      // Delete messages
      if (messageIds.length > 0) {
        await messageStore.deleteMessages(messageIds);
      }
      
      // Delete session
      chatHistoryStore.deleteSession(sessionId);
      
      // If deleting current session, clear it
      if (currentSessionId === sessionId) {
        chatHistoryStore.clearCurrentSession();
        setCurrentSessionId(null);
      }
      
      loadSessions();
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  }, [currentSessionId, loadSessions]);

  const refreshSessions = useCallback(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    currentSessionId,
    isLoading,
    createNewChat,
    switchToChat,
    deleteChat,
    refreshSessions,
  };
}
