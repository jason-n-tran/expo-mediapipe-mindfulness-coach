import { View, Text, StyleSheet } from 'react-native';
import ContextMenu from '@/components/ui/contextmenu';

export default function Tab() {
  return (
    <View style={styles.container}>
      <Text>Tab [Index]</Text>
      <ContextMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});