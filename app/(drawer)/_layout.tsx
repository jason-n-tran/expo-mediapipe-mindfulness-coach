import { Drawer } from 'expo-router/drawer';

export default function Layout() {
    return (
        <Drawer>
            <Drawer.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
            <Drawer.Screen name="index" options={{ title: 'Demo Overview' }} />
        </Drawer>
    );
};