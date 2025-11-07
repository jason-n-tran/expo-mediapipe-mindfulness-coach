import { Drawer } from 'expo-router/drawer';
import {
  Menu,
  MenuItem,
  MenuItemLabel,
  MenuSeparator,
} from '@/components/ui/menu';
import { Button } from '@/components/ui/button';
import { Ionicons } from '@expo/vector-icons';

function Example() {
  return (
    <Menu
      offset={5}
      trigger={(triggerProps) => {
        return (
          <Button {...triggerProps} size="sm">
            <Ionicons name="ellipsis-horizontal-outline" size={20} />
          </Button>
        );
      }}
    >
      <MenuItem
        key="Membership"
        textValue="Membership"
        className="p-2 justify-between"
      >
        <MenuItemLabel size="sm">Membership</MenuItemLabel>
      </MenuItem>
      <MenuItem key="Orders" textValue="Orders" className="p-2">
        <MenuItemLabel size="sm">Orders</MenuItemLabel>
      </MenuItem>
      <MenuItem key="Address Book" textValue="Address Book" className="p-2">
        <MenuItemLabel size="sm">Address Book</MenuItemLabel>
      </MenuItem>
      <MenuSeparator />
      <MenuItem key="Earn & Redeem" textValue="Earn & Redeem" className="p-2">
        <MenuItemLabel size="sm">Earn & Redeem</MenuItemLabel>
      </MenuItem>
      <MenuItem key="Coupons" textValue="Coupons" className="p-2">
        <MenuItemLabel size="sm">Coupons</MenuItemLabel>
      </MenuItem>
      <MenuItem key="Help Center" textValue="Help Center" className="p-2">
        <MenuItemLabel size="sm">Help Center</MenuItemLabel>
      </MenuItem>
      <MenuSeparator />
      <MenuItem key="Logout" textValue="Logout" className="p-2">
        <MenuItemLabel size="sm">Logout</MenuItemLabel>
      </MenuItem>
    </Menu>
  );
}


export default function Layout() {
    return (
        <Drawer>
            <Drawer.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
            <Drawer.Screen name="chat" options={{ title: 'Mindfulness Coach' }} />
            <Drawer.Screen name="index" options={{ headerRight: () => <Example />, title: 'Demo Overview' }} />
        </Drawer>
    );
};