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
        drawerActiveTintColor: '#0ea5e9', // COLORS.primary[500]
        drawerInactiveTintColor: '#737373', // COLORS.neutral[500]
        drawerActiveBackgroundColor: '#e0f2fe', // COLORS.primary[100]
        drawerStyle: {
          backgroundColor: '#ffffff', // COLORS.background.primary
        },
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
          letterSpacing: -0.25,
        },
        headerStyle: {
          backgroundColor: '#ffffff', // COLORS.background.primary
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#f5f5f5', // COLORS.neutral[100]
        },
        headerTintColor: '#171717', // COLORS.neutral[900]
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          letterSpacing: -0.25,
        },
        // Smooth screen transitions
        animation: 'slide_from_right',
        animationDuration: 300,
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