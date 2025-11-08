/**
 * ChatHistoryStore - Manages multiple chat sessions
 */

import { createMMKV } from 'react-native-mmkv';
import { ChatMessage } from '../../types';
import { STORAGE_KEYS } from '../../constants/config';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview?: string; // First user message or summary
}

export class ChatHistoryStore {
  private storage: ReturnType<typeof createMMKV>;
  private sessionsKey = 'chat_sessions';

  constructor() {
    this.storage = createMMKV({
      id: 'mindfulness-coach-storage',
    });
  }

  /**
   * Get all chat sessions
   */
  getSessions(): ChatSession[] {
    try {
      const serialized = this.storage.getString(this.sessionsKey);
      if (!serialized) return [];
      
      const sessions = JSON.parse(serialized);
      return sessions.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to get sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): ChatSession | null {
    const sessions = this.getSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Create a new chat session
   */
  createSession(sessionId: string, firstMessage?: string): ChatSession {
    const sessions = this.getSessions();
    
    const newSession: ChatSession = {
      id: sessionId,
      title: this.generateTitle(firstMessage),
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
      preview: firstMessage,
    };

    sessions.push(newSession);
    this.saveSessions(sessions);
    
    return newSession;
  }

  /**
   * Update session metadata
   */
  updateSession(sessionId: string, updates: Partial<ChatSession>): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index >= 0) {
      sessions[index] = {
        ...sessions[index],
        ...updates,
        updatedAt: new Date(),
      };
      this.saveSessions(sessions);
    }
  }

  /**
   * Update session from message
   */
  updateSessionFromMessage(message: ChatMessage): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === message.sessionId);
    
    if (index >= 0) {
      const session = sessions[index];
      session.messageCount++;
      session.updatedAt = new Date();
      
      // Update preview if it's a user message and no preview exists
      if (message.role === 'user' && !session.preview) {
        session.preview = message.content.substring(0, 100);
      }
      
      // Update title if it's still default
      if (session.title.startsWith('Chat') && message.role === 'user') {
        session.title = this.generateTitle(message.content);
      }
      
      this.saveSessions(sessions);
    } else {
      // Create new session if it doesn't exist
      this.createSession(message.sessionId, message.role === 'user' ? message.content : undefined);
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    this.saveSessions(filtered);
  }

  /**
   * Get current active session ID
   */
  getCurrentSessionId(): string | null {
    return this.storage.getString('current_session_id') || null;
  }

  /**
   * Set current active session ID
   */
  setCurrentSessionId(sessionId: string): void {
    this.storage.set('current_session_id', sessionId);
  }

  /**
   * Clear current session (for new chat)
   */
  clearCurrentSession(): void {
    this.storage.remove('current_session_id');
  }

  private saveSessions(sessions: ChatSession[]): void {
    try {
      const serialized = JSON.stringify(sessions.map(s => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })));
      this.storage.set(this.sessionsKey, serialized);
    } catch (error) {
      console.error('Failed to save sessions:', error);
    }
  }

  private generateTitle(firstMessage?: string): string {
    if (!firstMessage) {
      return `Chat ${new Date().toLocaleDateString()}`;
    }
    
    // Extract first meaningful words (up to 40 chars)
    const cleaned = firstMessage.trim().replace(/\s+/g, ' ');
    if (cleaned.length <= 40) {
      return cleaned;
    }
    
    return cleaned.substring(0, 37) + '...';
  }
}

// Export singleton instance
export const chatHistoryStore = new ChatHistoryStore();
