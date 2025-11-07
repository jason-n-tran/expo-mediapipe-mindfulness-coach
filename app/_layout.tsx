import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Stack } from 'expo-router';
import { AppInitializationProvider } from '@/contexts/AppInitializationContext';
import '@/global.css';

export default function App() {
  return (
    <GluestackUIProvider mode="dark">
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
    </GluestackUIProvider>
  );
}