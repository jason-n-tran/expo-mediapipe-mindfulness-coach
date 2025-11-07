import {
  Menu,
  MenuItem,
  MenuItemLabel,
  MenuSeparator,
} from '@/components/ui/menu';
import { Text } from "react-native";
import React from "react";
import { Pressable } from "@/components/ui/pressable";

export default function ContextMenu() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
        <Pressable
            onLongPress={() => {
              setIsOpen(true);
            }}
            delayLongPress={1000}
        >
            <Text>Long press me</Text>
        </Pressable>
        <Menu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onOpen={() => setIsOpen(true)}
        trigger={({ ...triggerProps }) => {
            return (
                <Text {...triggerProps} className="text-background-900 h-1">Long press me</Text>
            );
        }}
        >
        <MenuItem key="Account Settings" textValue="Account Settings">
            <MenuItemLabel size="sm">Account Settings</MenuItemLabel>
        </MenuItem>
        <MenuItem key="Help Centre" textValue="Help Centre">
            <MenuItemLabel size="sm">Help Centre</MenuItemLabel>
        </MenuItem>
        </Menu>
    </>
  );
}