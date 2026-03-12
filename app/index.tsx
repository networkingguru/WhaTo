import { View, Text } from 'react-native';
import { colors, typography, spacing } from '../src/theme';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
      <Text style={typography.title}>Whato</Text>
      <Text style={[typography.body, { marginTop: spacing.md }]}>Pick a topic to get started</Text>
    </View>
  );
}
