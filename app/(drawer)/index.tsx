import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import 'react-native-get-random-values';
import { chatHistoryStore } from '@/services/storage/ChatHistoryStore';

/**
 * Index route - Redirects to chat screen with new session
 */
export default function Index() {
  useEffect(() => {
    // Clear current session to start fresh
    chatHistoryStore.clearCurrentSession();
  }, []);
  
  return <Redirect href="/(drawer)/chat" />;
}