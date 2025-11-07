/**
 * MessageStore - Persistent storage for chat messages using MMKV
 */

import { createMMKV } from 'react-native-mmkv';
import { ChatMessage, ChatSession, ConversationStats } from '../../types';
import { APP_CONFIG, STORAGE_KEYS } from '../../constants/config';
import { MessageIndex, SessionIndex } from './types';

export class MessageStore {
  private storage: ReturnType<typeof createMMKV>;
  private messageIndexKey = 'message_index';
  private sessionIndexKey = 'session_index';
  private currentSessionId: string | null = null;

  constructor() {
    this.storage = createMMKV({
      id: 'mindfulness-coach-storage',
    });
  }

  /**
   * Save a message to storage
   */
  async saveMessage(message: ChatMessage): Promise<void> {
    try {
      // Serialize and store the message
      const messageKey = this.getMessageKey(message.id);
      const serializedMessage = JSON.stringify({
        ...message,
        timestamp: message.timestamp.toISOString(),
      });
      this.storage.set(messageKey, serializedMessage);

      // Update message index
      await this.updateMessageIndex(message);

      // Update session index
      await this.updateSessionIndex(message);
    } catch (error) {
      console.error('Failed to save message:', error);
      throw new Error('Failed to save message to storage');
    }
  }

  /**
   * Get messages with optional limit
   */
  async getMessages(limit?: number): Promise<ChatMessage[]> {
    try {
      const index = this.getMessageIndex();
      
      // Sort by timestamp descending (newest first)
      const sortedIndex = index.sort((a, b) => b.timestamp - a.timestamp);
      
      // Apply limit if specified
      const limitedIndex = limit ? sortedIndex.slice(0, limit) : sortedIndex;
      
      // Retrieve messages
      const messages: ChatMessage[] = [];
      for (const indexEntry of limitedIndex) {
        const message = this.getMessage(indexEntry.messageId);
        if (message) {
          messages.push(message);
        }
      }
      
      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  /**
   * Get messages by date range
   */
  async getMessagesByDateRange(start: Date, end: Date): Promise<ChatMessage[]> {
    try {
      const index = this.getMessageIndex();
      const startTime = start.getTime();
      const endTime = end.getTime();
      
      // Filter by date range
      const filteredIndex = index.filter(
        entry => entry.timestamp >= startTime && entry.timestamp <= endTime
      );
      
      // Sort by timestamp ascending
      const sortedIndex = filteredIndex.sort((a, b) => a.timestamp - b.timestamp);
      
      // Retrieve messages
      const messages: ChatMessage[] = [];
      for (const indexEntry of sortedIndex) {
        const message = this.getMessage(indexEntry.messageId);
        if (message) {
          messages.push(message);
        }
      }
      
      return messages;
    } catch (error) {
      console.error('Failed to get messages by date range:', error);
      return [];
    }
  }

  /**
   * Search messages by content
   */
  async searchMessages(query: string): Promise<ChatMessage[]> {
    try {
      const index = this.getMessageIndex();
      const lowerQuery = query.toLowerCase();
      const matchingMessages: ChatMessage[] = [];
      
      for (const indexEntry of index) {
        const message = this.getMessage(indexEntry.messageId);
        if (message && message.content.toLowerCase().includes(lowerQuery)) {
          matchingMessages.push(message);
        }
      }
      
      // Sort by timestamp ascending
      return matchingMessages.sort((a, b) => 
        a.timestamp.getTime() - b.timestamp.getTime()
      );
    } catch (error) {
      console.error('Failed to search messages:', error);
      return [];
    }
  }

  /**
   * Delete specific messages
   */
  async deleteMessages(messageIds: string[]): Promise<void> {
    try {
      // Delete messages from storage
      for (const messageId of messageIds) {
        const messageKey = this.getMessageKey(messageId);
        this.storage.delete(messageKey);
      }
      
      // Update message index
      const index = this.getMessageIndex();
      const updatedIndex = index.filter(
        entry => !messageIds.includes(entry.messageId)
      );
      this.saveMessageIndex(updatedIndex);
      
      // Update session indexes
      await this.rebuildSessionIndexes();
    } catch (error) {
      console.error('Failed to delete messages:', error);
      throw new Error('Failed to delete messages from storage');
    }
  }

  /**
   * Clear all messages
   */
  async clearAllMessages(): Promise<void> {
    try {
      const index = this.getMessageIndex();
      
      // Delete all messages
      for (const indexEntry of index) {
        const messageKey = this.getMessageKey(indexEntry.messageId);
        this.storage.delete(messageKey);
      }
      
      // Clear indexes
      this.storage.delete(this.messageIndexKey);
      this.storage.delete(this.sessionIndexKey);
      
      this.currentSessionId = null;
    } catch (error) {
      console.error('Failed to clear all messages:', error);
      throw new Error('Failed to clear messages from storage');
    }
  }

  /**
   * Export conversation history as JSON
   */
  async exportMessages(): Promise<string> {
    try {
      const messages = await this.getMessages();
      const sessions = this.getSessionIndex();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        messageCount: messages.length,
        sessionCount: sessions.length,
        messages: messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
        })),
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          startTime: new Date(session.startTime).toISOString(),
          endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
          messageCount: session.messageIds.length,
        })),
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export messages:', error);
      throw new Error('Failed to export conversation history');
    }
  }

  /**
   * Get conversation statistics
   */
  async getStatistics(): Promise<ConversationStats> {
    try {
      const index = this.getMessageIndex();
      const sessions = this.getSessionIndex();
      
      if (index.length === 0) {
        return {
          totalMessages: 0,
          totalSessions: 0,
          averageMessagesPerDay: 0,
        };
      }
      
      // Sort by timestamp
      const sortedIndex = index.sort((a, b) => a.timestamp - b.timestamp);
      const firstMessageDate = new Date(sortedIndex[0].timestamp);
      const lastMessageDate = new Date(sortedIndex[sortedIndex.length - 1].timestamp);
      
      // Calculate average messages per day
      const daysDiff = Math.max(
        1,
        Math.ceil((lastMessageDate.getTime() - firstMessageDate.getTime()) / (1000 * 60 * 60 * 24))
      );
      const averageMessagesPerDay = index.length / daysDiff;
      
      return {
        totalMessages: index.length,
        totalSessions: sessions.length,
        firstMessageDate,
        lastMessageDate,
        averageMessagesPerDay: Math.round(averageMessagesPerDay * 100) / 100,
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalMessages: 0,
        totalSessions: 0,
        averageMessagesPerDay: 0,
      };
    }
  }

  /**
   * Cleanup old messages based on retention period
   */
  async cleanupOldMessages(): Promise<void> {
    try {
      const retentionDays = APP_CONFIG.storage.messageRetentionDays;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const index = this.getMessageIndex();
      const cutoffTime = cutoffDate.getTime();
      
      // Find messages older than retention period
      const oldMessageIds = index
        .filter(entry => entry.timestamp < cutoffTime)
        .map(entry => entry.messageId);
      
      if (oldMessageIds.length > 0) {
        await this.deleteMessages(oldMessageIds);
      }
    } catch (error) {
      console.error('Failed to cleanup old messages:', error);
    }
  }

  /**
   * Start a new session
   */
  startNewSession(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Private helper methods

  private getMessageKey(messageId: string): string {
    return `${STORAGE_KEYS.MESSAGES}:${messageId}`;
  }

  private getMessage(messageId: string): ChatMessage | null {
    try {
      const messageKey = this.getMessageKey(messageId);
      const serialized = this.storage.getString(messageKey);
      
      if (!serialized) {
        return null;
      }
      
      const parsed = JSON.parse(serialized);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      };
    } catch (error) {
      console.error(`Failed to get message ${messageId}:`, error);
      return null;
    }
  }

  private getMessageIndex(): MessageIndex[] {
    try {
      const serialized = this.storage.getString(this.messageIndexKey);
      return serialized ? JSON.parse(serialized) : [];
    } catch (error) {
      console.error('Failed to get message index:', error);
      return [];
    }
  }

  private saveMessageIndex(index: MessageIndex[]): void {
    try {
      this.storage.set(this.messageIndexKey, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to save message index:', error);
    }
  }

  private async updateMessageIndex(message: ChatMessage): Promise<void> {
    try {
      const index = this.getMessageIndex();
      
      // Check if message already exists in index
      const existingIndex = index.findIndex(entry => entry.messageId === message.id);
      
      const indexEntry: MessageIndex = {
        messageId: message.id,
        timestamp: message.timestamp.getTime(),
        sessionId: message.sessionId,
      };
      
      if (existingIndex >= 0) {
        // Update existing entry
        index[existingIndex] = indexEntry;
      } else {
        // Add new entry
        index.push(indexEntry);
      }
      
      this.saveMessageIndex(index);
    } catch (error) {
      console.error('Failed to update message index:', error);
    }
  }

  private getSessionIndex(): SessionIndex[] {
    try {
      const serialized = this.storage.getString(this.sessionIndexKey);
      return serialized ? JSON.parse(serialized) : [];
    } catch (error) {
      console.error('Failed to get session index:', error);
      return [];
    }
  }

  private saveSessionIndex(index: SessionIndex[]): void {
    try {
      this.storage.set(this.sessionIndexKey, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to save session index:', error);
    }
  }

  private async updateSessionIndex(message: ChatMessage): Promise<void> {
    try {
      const index = this.getSessionIndex();
      const sessionIndex = index.find(entry => entry.sessionId === message.sessionId);
      
      if (sessionIndex) {
        // Update existing session
        if (!sessionIndex.messageIds.includes(message.id)) {
          sessionIndex.messageIds.push(message.id);
        }
        sessionIndex.endTime = message.timestamp.getTime();
      } else {
        // Create new session
        index.push({
          sessionId: message.sessionId,
          startTime: message.timestamp.getTime(),
          messageIds: [message.id],
        });
      }
      
      this.saveSessionIndex(index);
    } catch (error) {
      console.error('Failed to update session index:', error);
    }
  }

  private async rebuildSessionIndexes(): Promise<void> {
    try {
      const messageIndex = this.getMessageIndex();
      const sessionMap = new Map<string, SessionIndex>();
      
      // Group messages by session
      for (const indexEntry of messageIndex) {
        const message = this.getMessage(indexEntry.messageId);
        if (!message) continue;
        
        const sessionId = message.sessionId;
        const existing = sessionMap.get(sessionId);
        
        if (existing) {
          existing.messageIds.push(message.id);
          existing.endTime = Math.max(
            existing.endTime || 0,
            message.timestamp.getTime()
          );
        } else {
          sessionMap.set(sessionId, {
            sessionId,
            startTime: message.timestamp.getTime(),
            endTime: message.timestamp.getTime(),
            messageIds: [message.id],
          });
        }
      }
      
      // Save rebuilt index
      const newIndex = Array.from(sessionMap.values());
      this.saveSessionIndex(newIndex);
    } catch (error) {
      console.error('Failed to rebuild session indexes:', error);
    }
  }
}

// Export singleton instance
export const messageStore = new MessageStore();
