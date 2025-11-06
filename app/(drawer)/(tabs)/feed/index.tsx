import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function Page() {
    const navigation = useNavigation<any>();
    const numbers = Array.from({ length: 5 }, (_, i) => i + 1);

    const onPress = (n: number) => {
        navigation.navigate('FeedItem', { id: String(n) });
    };

    return (
        <View style={styles.container}>
            {numbers.map((number) => (
                <Pressable key={number} onPress={() => onPress(number)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
                    <Text>Item {number}</Text>
                </Pressable>
            ))}
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