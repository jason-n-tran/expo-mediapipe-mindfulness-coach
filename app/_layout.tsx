import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Stack } from 'expo-router';
import { AppInitializationProvider } from '@/contexts/AppInitializationContext';
import { LLMProvider } from '@/contexts/LLMContext';
import * as Linking from 'expo-linking'; // Force expo-linking to be included
import '@/global.css';

// Ensure Linking is available
if (__DEV__) {
  console.log('[App] Linking module loaded:', !!Linking);
}

export default function App() {
  return (
    <GluestackUIProvider mode="dark">
      <LLMProvider>
        <AppInitializationProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerBackTitle: 'Back'
            }}
          >
            <Stack.Screen name="(drawer)" options={{ headerShown: false }}/>
            <Stack.Screen name="outside" options={{ title: 'Outside Page' }}/>
          </Stack>
        </AppInitializationProvider>
      </LLMProvider>
    </GluestackUIProvider>
  );
}