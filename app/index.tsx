import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopicButton } from '../src/components/TopicButton';
import { Logo } from '../src/components/Logo';
import { SparkleButton } from '../src/components/SparkleButton';
import { SupportPanel } from '../src/components/SupportPanel';
import { colors, spacing, typography } from '../src/theme';
import { Topic } from '../src/providers/types';
import { topicDisplayNames, topicColors } from '../src/utils/topicLabels';

export default function HomeScreen() {
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);

  function handleTopic(topic: Topic) {
    router.push({ pathname: '/swipe', params: { topic } });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.sparkleContainer}>
        <SparkleButton onPress={() => setSupportVisible(true)} />
      </View>
      <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />
      <View style={styles.header}>
        <Logo />
        <Text style={styles.tagline}>What do you feel like?</Text>
      </View>
      <View style={styles.buttons}>
        <TopicButton label={topicDisplayNames.food} color={topicColors.food} icon="ForkKnife" onPress={() => handleTopic('food')} />
        <TopicButton label={topicDisplayNames.movie} color={topicColors.movie} icon="FilmSlate" onPress={() => handleTopic('movie')} />
        <TopicButton label={topicDisplayNames.show} color={topicColors.show} icon="Television" onPress={() => handleTopic('show')} />
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
  sparkleContainer: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    zIndex: 10,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
