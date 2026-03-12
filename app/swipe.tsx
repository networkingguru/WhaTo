import { View, Text } from 'react-native';
import { typography } from '../src/theme';

export default function SwipeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={typography.title}>Swipe</Text>
    </View>
  );
}
