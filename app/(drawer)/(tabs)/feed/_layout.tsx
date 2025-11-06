import { DrawerToggleButton } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeedIndex from './index';
import FeedItem from './[id]';

const Stack = createNativeStackNavigator();

export default function Layout() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="FeedIndex"
        component={FeedIndex}
        options={{ title: 'Feed', headerLeft: () => <DrawerToggleButton /> }}
      />
      <Stack.Screen
        name="FeedItem"
        component={FeedItem}
        // Use a generic title; the detail screen can update the header if needed
        options={{ title: 'Item' }}
      />
    </Stack.Navigator>
  );
}