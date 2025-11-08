/**
 * Chat History Screen
 * View and manage past chat sessions
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatHistory } from '@/hooks/useChatHistory';
import { ChatSession } from '@/services/storage/ChatHistoryStore';
import { COLORS, SPACING } from '@/constants/theme';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';

export default function ChatHistoryScreen() {
  const router = useRouter();
  const { sessions, currentSessionId, deleteChat, refreshSessions } = useChatHistory();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null);

  const handleSelectChat = useCallback((sessionId: string) => {
    // Use replace to ensure the chat screen re-renders with new session
    router.replace({
      pathname: '/(drawer)/chat',
      params: { sessionId },
    });
  }, [router]);

  const handleDeleteChat = useCallback((session: ChatSession) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!sessionToDelete) return;
    
    try {
      await deleteChat(sessionToDelete.id);
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      // Keep dialog open to show error
    }
  }, [sessionToDelete, deleteChat]);

  const formatDate = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  };

  const renderChatItem = ({ item }: { item: ChatSession }) => {
    const isActive = item.id === currentSessionId;

    return (
      <TouchableOpacity
        style={[styles.chatItem, isActive && styles.activeChatItem]}
        onPress={() => handleSelectChat(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          
          {item.preview && (
            <Text style={styles.chatPreview} numberOfLines={2}>
              {item.preview}
            </Text>
          )}
          
          <View style={styles.chatMeta}>
            <Text style={styles.chatDate}>{formatDate(item.updatedAt)}</Text>
            <Text style={styles.chatCount}>
              {item.messageCount} {item.messageCount === 1 ? 'message' : 'messages'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteChat(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.error[500]} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color={COLORS.neutral[300]} />
      <Text style={styles.emptyTitle}>No Chat History</Text>
      <Text style={styles.emptyText}>
        Start a new conversation to see it here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={sessions}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        onRefresh={refreshSessions}
        refreshing={false}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <AlertDialogBackdrop />
        <AlertDialogContent>
          <AlertDialogHeader>
            <Text style={styles.dialogTitle}>Delete Chat</Text>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text style={styles.dialogText}>
              Are you sure you want to delete "{sessionToDelete?.title}"? This action cannot be undone.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button
              variant="outline"
              action="secondary"
              onPress={() => setDeleteDialogOpen(false)}
              style={styles.dialogButton}
            >
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              action="negative"
              onPress={confirmDelete}
              style={styles.dialogButton}
            >
              <ButtonText>Delete</ButtonText>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  activeChatItem: {
    borderColor: COLORS.primary[500],
    backgroundColor: COLORS.primary[50],
  },
  chatContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: SPACING.xs,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  chatPreview: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  chatMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatDate: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  chatCount: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  deleteButton: {
    padding: SPACING.xs,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  dialogText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    lineHeight: 24,
  },
  dialogButton: {
    minWidth: 80,
  },
});
