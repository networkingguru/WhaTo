import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
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

  // Pre-populate display name from device name (e.g., "Brian's iPhone" → "Brian")
  useEffect(() => {
    const devName = Device.deviceName;
    if (devName && !displayName) {
      const match = devName.match(/^(.+?)['']s\s/i);
      if (match) {
        setDisplayName(match[1]);
      }
    }
  }, []);

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
    // Keep displayName so it persists across group mode toggling
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
    } catch (err) {
      console.error('Group creation failed:', err);
      Alert.alert('Error', `Could not create session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGroupPhase('enter-name');
    }
  }

  return (
    <SafeAreaView style={[styles.container, isGroupMode && styles.containerGroupMode]}>
      <View style={styles.sparkleContainer}>
        <SparkleButton onPress={() => setSupportVisible(true)} />
      </View>
      <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />

      <View style={styles.header}>
        <Logo />
        <Text style={[styles.tagline, isGroupMode && styles.taglineGroup]}>
          {isGroupMode ? 'Group Mode — pick a topic' : 'What do you feel like?'}
        </Text>
      </View>

      {/* Back button only visible in group enter-name sub-phase */}
      {isGroupMode && groupPhase === 'enter-name' && (
        <TouchableOpacity style={styles.backRow} onPress={() => setGroupPhase('pick')}>
          <Text style={styles.backText}>← Back to topics</Text>
        </TouchableOpacity>
      )}

      <View style={styles.buttons}>
        {/* Show topic buttons in both modes — but enter-name/creating replaces them in group */}
        {(mode === 'solo' || (isGroupMode && groupPhase === 'pick')) && (
          <>
            <TopicButton
              label={topicDisplayNames.food}
              color={topicColors.food}
              icon="ForkKnife"
              onPress={() => handleTopicPress('food')}
            />
            <TopicButton
              label={topicDisplayNames.movie}
              color={topicColors.movie}
              icon="FilmSlate"
              onPress={() => handleTopicPress('movie')}
            />
            <TopicButton
              label={topicDisplayNames.show}
              color={topicColors.show}
              icon="Television"
              onPress={() => handleTopicPress('show')}
            />
          </>
        )}

        {isGroupMode && groupPhase === 'enter-name' && (
          <View style={styles.groupForm}>
            <Text style={[styles.groupTitle, styles.groupTitleWhite]}>Your display name</Text>
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
            <Text style={[typography.body, { marginTop: spacing.md, color: '#FFFFFF' }]}>Creating session...</Text>
          </View>
        )}

        {/* Mode buttons below topics */}
        {(mode === 'solo' || (isGroupMode && groupPhase === 'pick')) && (
          <View style={styles.modeButtons}>
            {mode === 'solo' ? (
              <>
                <TouchableOpacity style={styles.groupButton} onPress={() => setMode('group')}>
                  <Text style={styles.groupButtonText}>Group Mode</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/join')}>
                  <Text style={styles.joinButtonText}>Join Session</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.goBackButton} onPress={resetToSolo}>
                <Text style={styles.goBackButtonText}>Go Back</Text>
              </TouchableOpacity>
            )}
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
  containerGroupMode: {
    backgroundColor: colors.tertiary,
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
  taglineGroup: {
    color: '#FFFFFF',
  },
  backRow: {
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  backText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttons: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
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
  goBackButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  goBackButtonText: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '700',
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
  groupTitleWhite: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
  },
});
