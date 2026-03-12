import { View, Text } from 'react-native';
import { typography } from '../src/theme';

export default function ResultScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={typography.title}>Result</Text>
    </View>
  );
}
