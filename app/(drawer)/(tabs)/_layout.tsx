import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteProp, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import FeedLayout from './feed/_layout';

const Stack = createNativeStackNavigator();

function TabsHost() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <Label>Home</Label>
                <Icon sf="house.fill" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
                <Icon sf="gear" drawable="custom_settings_drawable" />
                <Label>Settings</Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="feed">
                <Icon sf="gear" drawable="custom_settings_drawable" />
                <Label>Feed</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
};

function getActiveTabName(route?: RouteProp<Record<string, object | undefined>, string>) {
    // Use the helper from react-navigation to correctly read nested focused route names
    const name = getFocusedRouteNameFromRoute(route as any);
    return name ?? 'index';
}

export default function Layout() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="TabsHost"
                component={TabsHost}
                options={({ route }) => {
                    const active = getActiveTabName(route);
                    const showHeader = active === 'index' || active === 'settings';
                    const titleMap: Record<string, string> = {
                        index: 'Home',
                        settings: 'Settings',
                    };

                    return {
                        headerShown: showHeader,
                        headerTitle: titleMap[active] ?? '',
                        headerLeft: showHeader ? () => <DrawerToggleButton /> : undefined,
                    } as any;
                }}
            />
        </Stack.Navigator>
    );
}

function FeedWrapper() {
    return <FeedLayout />;
}