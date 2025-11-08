/**
 * MessageStore Tests
 * Tests for message persistence and conversation history
 */

import { MessageStore } from '@/services/storage/MessageStore';
import { ChatMessage } from '@/types';
import { createMMKV } from 'react-native-mmkv';

const mockMMKV = createMMKV({ id: 'test' });

describe('MessageStore', () => {
  let messageStore: MessageStore;
  let testMessage: ChatMessage;

  beforeEach(() => {
    jest.clearAllMocks();
    messageStore = new MessageStore();
    
    testMessage = {
      id: 'test-message-1',
      role: 'user',
      content: 'Test message content',
      timestamp: new Date(),
      sessionId: 'test-session',
    };
  });

  describe('Message Saving', () => {
    it('should save a message', async () => {
      await messageStore.saveMessage(testMessage, true);

      expect(mockMMKV.set).toHaveBeenCalled();
    });

    it('should save multiple messages in batch', async () => {
      const messages: ChatMessage[] = [
        testMessage,
        { ...testMessage, id: 'test-message-2', content: 'Second message' },
        { ...testMessage, id: 'test-message-3', content: 'Third message' },
      ];

      await messageStore.saveMessages(messages);

      expect(mockMMKV.set).toHaveBeenCalled();
    });
  });

  describe('Message Retrieval', () => {
    it('should get messages with limit', async () => {
      mockMMKV.getString.mockReturnValue(JSON.stringify([
        { messageId: 'msg1', timestamp: Date.now(), sessionId: 'session1' },
        { messageId: 'msg2', timestamp: Date.now() + 1000, sessionId: 'session1' },
      ]));

      const messages = await messageStore.getMessages(10);

      expect(Array.isArray(messages)).toBe(true);
    });

    it('should get messages by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockMMKV.getString.mockReturnValue(JSON.stringify([]));

      const messages = await messageStore.getMessagesByDateRange(startDate, endDate);

      expect(Array.isArray(messages)).toBe(true);
    });

    it('should search messages by content', async () => {
      mockMMKV.getString.mockReturnValue(JSON.stringify([]));

      const results = await messageStore.searchMessages('test query');

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Message Deletion', () => {
    it('should delete specific messages', async () => {
      mockMMKV.getString.mockReturnValue(JSON.stringify([
        { messageId: 'msg1', timestamp: Date.now(), sessionId: 'session1' },
      ]));

      await messageStore.deleteMessages(['msg1']);

      expect(mockMMKV.delete).toHaveBeenCalled();
    });

    it('should clear all messages', async () => {
      mockMMKV.getString.mockReturnValue(JSON.stringify([
        { messageId: 'msg1', timestamp: Date.now(), sessionId: 'session1' },
      ]));

      await messageStore.clearAllMessages();

      expect(mockMMKV.delete).toHaveBeenCalled();
    });
  });

  describe('Message Export', () => {
    it('should export messages as JSON', async () => {
      mockMMKV.getString.mockReturnValue(JSON.stringify([]));

      const exportData = await messageStore.exportMessages();

      expect(typeof exportData).toBe('string');
      expect(() => JSON.parse(exportData)).not.toThrow();
    });
  });

  describe('Conversation Statistics', () => {
    it('should calculate statistics', async () => {
      mockMMKV.getString.mockReturnValue(JSON.stringify([]));

      const stats = await messageStore.getStatistics();

      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('averageMessagesPerDay');
    });

    it('should handle empty message store', async () => {
      mockMMKV.getString.mockReturnValue(JSON.stringify([]));

      const stats = await messageStore.getStatistics();

      expect(stats.totalMessages).toBe(0);
      expect(stats.totalSessions).toBe(0);
    });
  });

  describe('Session Management', () => {
    it('should start a new session', () => {
      messageStore.startNewSession('new-session-id');

      const sessionId = messageStore.getCurrentSessionId();

      expect(sessionId).toBe('new-session-id');
    });

    it('should get current session ID', () => {
      messageStore.startNewSession('test-session');

      const sessionId = messageStore.getCurrentSessionId();

      expect(sessionId).toBe('test-session');
    });
  });

  describe('Data Cleanup', () => {
    it('should cleanup old messages', async () => {
      const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000); // 100 days ago
      mockMMKV.getString.mockReturnValue(JSON.stringify([
        { messageId: 'old-msg', timestamp: oldTimestamp, sessionId: 'session1' },
      ]));

      await messageStore.cleanupOldMessages();

      expect(mockMMKV.delete).toHaveBeenCalled();
    });
  });
});
