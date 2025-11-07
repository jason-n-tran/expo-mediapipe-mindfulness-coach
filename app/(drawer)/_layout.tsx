import { useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppInitializationContext } from '@/contexts/AppInitializationContext';
import { AppInitializationScreen } from '@/components/AppInitializationScreen';

export default function Layout() {
  const { initializationState, isReady, error, retryInitialization } = useAppInitializationContext();
  const router = useRouter();
  const segments = useSegments();

  // Handle navigation based on initialization state
  useEffect(() => {
    // Use setTimeout to ensure navigation happens after render
    const timer = setTimeout(() => {
      if (initializationState === 'model-missing') {
        // Navigate to model setup screen
        if (!segments.includes('model-setup')) {
          router.replace('/(drawer)/model-setup');
        }
      } else if (isReady) {
        // Navigate to chat screen when ready (default route)
        if (segments.includes('model-setup')) {
          router.replace('/(drawer)/chat');
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [initializationState, isReady, segments, router]);

  // Show initialization screen for loading states
  if (initializationState === 'checking' || 
      initializationState === 'initializing-llm' || 
      initializationState === 'loading-history' ||
      initializationState === 'error') {
    return (
      <AppInitializationScreen
        state={initializationState}
        error={error}
        onRetry={retryInitialization}
      />
    );
  }

  // Show normal drawer navigation when ready or during model download
  return (
    <Drawer
      screenOptions={{
        drawerActiveTintColor: '#4A90E2',
        drawerInactiveTintColor: '#6B7280',
        drawerActiveBackgroundColor: '#EFF6FF',
        drawerStyle: {
          backgroundColor: '#FFFFFF',
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#111827',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      {/* Chat Screen - Default Route */}
      <Drawer.Screen 
        name="chat" 
        options={{ 
          title: 'Mindfulness Coach',
          drawerLabel: 'Chat',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }} 
      />
      
      {/* Settings Screen */}
      <Drawer.Screen 
        name="settings" 
        options={{ 
          title: 'Settings',
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }} 
      />
      
      {/* Model Setup Screen - Hidden from drawer */}
      <Drawer.Screen 
        name="model-setup" 
        options={{ 
          title: 'Setup', 
          headerShown: false,
          drawerItemStyle: { display: 'none' },
        }} 
      />
      
      {/* Legacy screens - Hidden from drawer */}
      <Drawer.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false, 
          title: 'Home',
          drawerItemStyle: { display: 'none' },
        }} 
      />
      <Drawer.Screen 
        name="index" 
        options={{ 
          title: 'Demo Overview',
          drawerItemStyle: { display: 'none' },
        }} 
      />
    </Drawer>
  );
}