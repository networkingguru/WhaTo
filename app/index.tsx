import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopicButton } from '../src/components/TopicButton';
import { Logo } from '../src/components/Logo';
import { SparkleButton } from '../src/components/SparkleButton';
import { SupportPanel } from '../src/components/SupportPanel';
import { colors, spacing, typography } from '../src/theme';
import { Topic } from '../src/providers/types';
import { topicDisplayNames, topicColors } from '../src/utils/topicLabels';
import { getDeviceId } from '../src/services/deviceId';
import { createSession, generateSessionCode } from '../src/services/sessionService';
import { movieProvider } from '../src/providers/movieProvider';
import { showProvider } from '../src/providers/showProvider';
import { restaurantProvider } from '../src/providers/restaurantProvider';
import * as Location from 'expo-location';

export default function HomeScreen() {
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);
  const [groupStep, setGroupStep] = useState<'idle' | 'pick-topic' | 'enter-name' | 'creating'>('idle');
  const [groupTopic, setGroupTopic] = useState<Topic | null>(null);
  const [displayName, setDisplayName] = useState('');

  function handleTopic(topic: Topic) {
    router.push({ pathname: '/swipe', params: { topic } });
  }

  const providers = { movie: movieProvider, show: showProvider, food: restaurantProvider };

  async function handleCreateGroup() {
    if (!groupTopic || !displayName.trim()) {
      Alert.alert('Missing info', 'Please select a topic and enter your name.');
      return;
    }
    setGroupStep('creating');
    try {
      const code = generateSessionCode();
      const deviceId = await getDeviceId();

      let fetchOptions: { latitude?: number; longitude?: number } = {};
      if (groupTopic === 'food') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          fetchOptions = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      }

      const cards = await providers[groupTopic].fetchCards(fetchOptions);
      if (cards.length === 0) {
        Alert.alert('No results', 'Could not find any options. Try again later.');
        setGroupStep('enter-name');
        return;
      }

      const location = groupTopic === 'food' && fetchOptions.latitude
        ? { latitude: fetchOptions.latitude, longitude: fetchOptions.longitude!, radiusMiles: 5 }
        : undefined;

      await createSession(code, groupTopic, deviceId, displayName.trim(), cards, location);
      setGroupStep('idle');
      router.push({ pathname: '/lobby', params: { code, topic: groupTopic, isCreator: 'true' } });
    } catch {
      Alert.alert('Error', 'Could not create session. Please try again.');
      setGroupStep('enter-name');
    }
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

        {groupStep === 'idle' && (
          <View style={styles.groupSection}>
            <TouchableOpacity style={styles.groupButton} onPress={() => setGroupStep('pick-topic')}>
              <Text style={styles.groupButtonText}>Group Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/join')}>
              <Text style={styles.joinButtonText}>Join Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {groupStep === 'pick-topic' && (
          <View style={styles.groupSection}>
            <Text style={styles.groupTitle}>Pick a topic for the group</Text>
            <TopicButton label={topicDisplayNames.food} color={topicColors.food} icon="ForkKnife"
              onPress={() => { setGroupTopic('food'); setGroupStep('enter-name'); }} />
            <TopicButton label={topicDisplayNames.movie} color={topicColors.movie} icon="FilmSlate"
              onPress={() => { setGroupTopic('movie'); setGroupStep('enter-name'); }} />
            <TopicButton label={topicDisplayNames.show} color={topicColors.show} icon="Television"
              onPress={() => { setGroupTopic('show'); setGroupStep('enter-name'); }} />
          </View>
        )}

        {groupStep === 'enter-name' && (
          <View style={styles.groupSection}>
            <Text style={styles.groupTitle}>Your display name</Text>
            <TextInput
              style={styles.nameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textSecondary}
              maxLength={20}
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
              <Text style={styles.createButtonText}>Create Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {groupStep === 'creating' && (
          <View style={styles.groupSection}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { marginTop: spacing.md }]}>Creating session...</Text>
          </View>
        )}
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
  groupSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  groupTitle: {
    ...typography.subtitle,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  groupButton: {
    backgroundColor: colors.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  groupButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  joinButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  joinButtonText: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '600',
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    width: '100%',
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  createButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
