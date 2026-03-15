import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
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
  const [mode, setMode] = useState<'solo' | 'group'>('solo');
  const [groupPhase, setGroupPhase] = useState<'pick' | 'enter-name' | 'creating'>('pick');
  const [groupTopic, setGroupTopic] = useState<Topic | null>(null);
  const [displayName, setDisplayName] = useState('');

  const isGroupMode = mode === 'group';

  function handleTopicPress(topic: Topic) {
    if (isGroupMode) {
      setGroupTopic(topic);
      setGroupPhase('enter-name');
    } else {
      router.push({ pathname: '/swipe', params: { topic } });
    }
  }

  function resetToSolo() {
    setMode('solo');
    setGroupPhase('pick');
    setGroupTopic(null);
    setDisplayName('');
  }

  const providers = { movie: movieProvider, show: showProvider, food: restaurantProvider };

  async function handleCreateGroup() {
    if (!groupTopic || !displayName.trim()) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }
    setGroupPhase('creating');
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
        setGroupPhase('enter-name');
        return;
      }

      const location = groupTopic === 'food' && fetchOptions.latitude
        ? { latitude: fetchOptions.latitude, longitude: fetchOptions.longitude!, radiusMiles: 5 }
        : undefined;

      await createSession(code, groupTopic, deviceId, displayName.trim(), cards, location);
      resetToSolo();
      router.push({ pathname: '/lobby', params: { code, topic: groupTopic, isCreator: 'true' } });
    } catch {
      Alert.alert('Error', 'Could not create session. Please try again.');
      setGroupPhase('enter-name');
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
        <Text style={styles.tagline}>
          {isGroupMode ? 'Group Mode — pick a topic' : 'What do you feel like?'}
        </Text>
      </View>

      {/* Back button when in group mode or group sub-phase */}
      {isGroupMode && (
        <TouchableOpacity style={styles.backRow} onPress={resetToSolo}>
          <Text style={styles.backText}>← Solo Mode</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.buttons, isGroupMode && styles.buttonsGroupMode]}>
        {/* Show topic buttons in both modes — but enter-name/creating replaces them in group */}
        {(mode === 'solo' || (isGroupMode && groupPhase === 'pick')) && (
          <>
            <TopicButton
              label={isGroupMode ? `Group: ${topicDisplayNames.food}` : topicDisplayNames.food}
              color={topicColors.food}
              icon="ForkKnife"
              onPress={() => handleTopicPress('food')}
            />
            <TopicButton
              label={isGroupMode ? `Group: ${topicDisplayNames.movie}` : topicDisplayNames.movie}
              color={topicColors.movie}
              icon="FilmSlate"
              onPress={() => handleTopicPress('movie')}
            />
            <TopicButton
              label={isGroupMode ? `Group: ${topicDisplayNames.show}` : topicDisplayNames.show}
              color={topicColors.show}
              icon="Television"
              onPress={() => handleTopicPress('show')}
            />
          </>
        )}

        {isGroupMode && groupPhase === 'enter-name' && (
          <View style={styles.groupForm}>
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
            <TouchableOpacity onPress={() => setGroupPhase('pick')} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back to topics</Text>
            </TouchableOpacity>
          </View>
        )}

        {isGroupMode && groupPhase === 'creating' && (
          <View style={styles.groupForm}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { marginTop: spacing.md }]}>Creating session...</Text>
          </View>
        )}

        {/* Solo mode: show group/join buttons below topics */}
        {mode === 'solo' && (
          <View style={styles.modeButtons}>
            <TouchableOpacity style={styles.groupButton} onPress={() => setMode('group')}>
              <Text style={styles.groupButtonText}>Group Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/join')}>
              <Text style={styles.joinButtonText}>Join Session</Text>
            </TouchableOpacity>
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
  backRow: {
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  backText: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '600',
  },
  buttons: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonsGroupMode: {
    backgroundColor: `${colors.tertiary}10`,
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  modeButtons: {
    marginTop: spacing.xl,
    gap: spacing.md,
    width: '100%',
    alignItems: 'center',
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
  groupForm: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  groupTitle: {
    ...typography.subtitle,
    textAlign: 'center',
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
  backLink: {
    paddingVertical: spacing.sm,
  },
  backLinkText: {
    ...typography.caption,
    color: colors.tertiary,
  },
});
