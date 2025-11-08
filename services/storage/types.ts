/**
 * Storage-related type definitions
 */

import { ChatMessage, ChatSession, ConversationStats } from '../../types';

export interface IMessageStore {
  // Save a message
  saveMessage(message: ChatMessage): Promise<void>;
  
  // Get all messages for current session
  getMessages(limit?: number): Promise<ChatMessage[]>;
  
  // Get messages by date range
  getMessagesByDateRange(start: Date, end: Date): Promise<ChatMessage[]>;
  
  // Search messages by content
  searchMessages(query: string): Promise<ChatMessage[]>;
  
  // Delete messages
  deleteMessages(messageIds: string[]): Promise<void>;
  
  // Clear all messages
  clearAllMessages(): Promise<void>;
  
  // Export conversation history
  exportMessages(): Promise<string>;
  
  // Get conversation statistics
  getStatistics(): Promise<ConversationStats>;
}

export interface MessageIndex {
  messageId: string;
  timestamp: number;
  sessionId: string;
}

export interface SessionIndex {
  sessionId: string;
  startTime: number;
  endTime?: number;
  messageIds: string[];
}
