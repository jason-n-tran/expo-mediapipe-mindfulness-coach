import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

type FeedRouteProp = RouteProp<Record<string, { id?: string }>, string>;

export default function Tab() {
  // Prefer react-navigation params when this screen is mounted by the native stack
  const route = useRoute<FeedRouteProp>();
  const routeId = route?.params?.id;
  const { id: localId } = useLocalSearchParams();
  const id = routeId ?? localId;

  return (
    <View style={styles.container}>
      <Text>Id: {id}</Text>
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