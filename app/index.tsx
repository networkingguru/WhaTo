import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Device from 'expo-device';
import { TopicButton } from '../src/components/TopicButton';
import { Logo } from '../src/components/Logo';
import { SparkleButton } from '../src/components/SparkleButton';
import { SupportPanel } from '../src/components/SupportPanel';
import { SearchOptions, FoodFilters, MediaFilters } from '../src/components/SearchOptions';
import { FeedbackButton } from '../src/components/FeedbackButton';
import { FeedbackModal } from '../src/components/FeedbackModal';
import { colors, spacing, typography } from '../src/theme';
import { Topic } from '../src/providers/types';
import { topicDisplayNames, topicColors } from '../src/utils/topicLabels';
import { getDeviceId } from '../src/services/deviceId';
import { createSession, generateSessionCode } from '../src/services/sessionService';
import { movieProvider } from '../src/providers/movieProvider';
import { showProvider } from '../src/providers/showProvider';
import { restaurantProvider } from '../src/providers/restaurantProvider';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISPLAY_NAME_KEY = 'whato_display_name';

export default function HomeScreen() {
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);
  const [mode, setMode] = useState<'solo' | 'group'>('solo');
  const [groupPhase, setGroupPhase] = useState<'pick' | 'enter-name' | 'creating'>('pick');
  const [groupTopic, setGroupTopic] = useState<Topic | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [foodFilters, setFoodFilters] = useState<FoodFilters>({
    openNow: true,
    categories: [],
    sortBy: 'best_match',
  });
  const [mediaFilters, setMediaFilters] = useState<MediaFilters>({
    genreIds: [],
    sortTmdb: 'popularity',
  });

  const isGroupMode = mode === 'group';

  // Load saved name, or fall back to extracting from device name
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(DISPLAY_NAME_KEY);
      if (saved) {
        setDisplayName(saved);
        return;
      }
      const devName = Device.deviceName;
      if (devName) {
        const match = devName.match(/^(.+?)[''\u2019]s\s/i);
        if (match) {
          const candidate = match[1].trim();
          const NON_NAMES = [
            'my', 'the', 'this', 'new', 'old', 'red', 'blue', 'big', 'dad', 'mom',
            'work', 'home', 'test', 'guest', 'admin', 'user', 'phone', 'device',
            'iphone', 'ipad', 'mac', 'macbook', 'pixel', 'samsung', 'galaxy',
          ];
          const isAllLetters = /^[a-zA-Z][a-zA-Z \-']{0,19}$/.test(candidate);
          const isNotCommonWord = !NON_NAMES.includes(candidate.toLowerCase());
          const isReasonableLength = candidate.length >= 2 && candidate.length <= 20;
          if (isAllLetters && isNotCommonWord && isReasonableLength) {
            setDisplayName(candidate);
          }
        }
      }
    })();
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

      let fetchOptions: Record<string, any> = {};
      if (groupTopic === 'food') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          fetchOptions = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
        fetchOptions.openNow = foodFilters.openNow;
        if (foodFilters.categories.length > 0) fetchOptions.categories = foodFilters.categories;
        fetchOptions.sortBy = foodFilters.sortBy;
      } else {
        if (mediaFilters.genreIds.length > 0) fetchOptions.genreIds = mediaFilters.genreIds;
        fetchOptions.sortTmdb = mediaFilters.sortTmdb;
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

      const trimmedName = displayName.trim();
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
      await createSession(code, groupTopic, deviceId, trimmedName, cards, location);
      resetToSolo();
      router.push({ pathname: '/lobby', params: { code, topic: groupTopic, isCreator: 'true' } });
    } catch (err) {
      Alert.alert('Error', `Could not create session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGroupPhase('enter-name');
    }
  }

  return (
    <SafeAreaView style={[styles.container, isGroupMode && styles.containerGroupMode]}>
      <View style={styles.feedbackContainer}>
        <FeedbackButton onPress={() => setFeedbackVisible(true)} />
      </View>
      <View style={styles.sparkleContainer}>
        <SparkleButton onPress={() => setSupportVisible(true)} />
      </View>
      <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />
      <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />
      {groupTopic && (
        <SearchOptions
          visible={optionsVisible}
          topic={groupTopic}
          foodFilters={foodFilters}
          mediaFilters={mediaFilters}
          onApplyFood={setFoodFilters}
          onApplyMedia={setMediaFilters}
          onClose={() => setOptionsVisible(false)}
        />
      )}

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
            <TouchableOpacity style={styles.optionsButton} onPress={() => setOptionsVisible(true)}>
              <Text style={styles.optionsButtonText}>Options</Text>
            </TouchableOpacity>
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
  feedbackContainer: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.md,
    zIndex: 10,
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
  optionsButton: {
    backgroundColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  optionsButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
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
