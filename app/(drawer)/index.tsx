import { useEffect } from 'react';
import { Redirect } from 'expo-router';

/**
 * Index route - Redirects to chat screen (default route)
 */
export default function Index() {
  return <Redirect href="/(drawer)/chat" />;
}