import { StatusBar } from 'expo-status-bar';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Stack } from 'expo-router';
import '@/global.css';

export default function App() {
  return (
      <GluestackUIProvider mode="dark">
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerBackTitle: 'Back'
          }}
        >
          <Stack.Screen name="(drawer)" options={{ headerShown: false }}/>
          <Stack.Screen name="outside" options={{ title: 'Outside Page' }}/>
        </Stack>
      </GluestackUIProvider>
  );
}