import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopicButton } from '../src/components/TopicButton';
import { colors, spacing, typography } from '../src/theme';
import { Topic } from '../src/providers/types';

export default function HomeScreen() {
  const router = useRouter();

  function handleTopic(topic: Topic) {
    router.push({ pathname: '/swipe', params: { topic } });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Whato</Text>
        <Text style={styles.tagline}>What do you feel like?</Text>
      </View>
      <View style={styles.buttons}>
        <TopicButton emoji="🍕" label="Food" onPress={() => handleTopic('food')} />
        <TopicButton emoji="🎬" label="Movies" onPress={() => handleTopic('movie')} />
        <TopicButton emoji="📺" label="Shows" onPress={() => handleTopic('show')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
  tagline: {
    ...typography.body,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  buttons: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
