import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
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
import { trackTopicSelected, trackGroupSessionCreated } from '../src/services/analytics';
import { logError } from '../src/services/crashlytics';

const DISPLAY_NAME_KEY = 'whato_display_name';

const topicEmojis: Record<Topic, string> = {
  food: '🍴',
  movie: '🎬',
  show: '📺',
};

export default function HomeScreen() {
  const router = useRouter();
  const [supportVisible, setSupportVisible] = useState(false);
  const [phase, setPhase] = useState<'home' | 'choose-mode' | 'enter-name' | 'creating'>('home');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
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
    setSelectedTopic(topic);
    setPhase('choose-mode');
  }

  function resetToHome() {
    setPhase('home');
    setSelectedTopic(null);
  }

  function handleDecideSolo() {
    if (!selectedTopic) return;
    trackTopicSelected(selectedTopic, 'solo');

    const filterParams: Record<string, string> = { topic: selectedTopic };
    if (selectedTopic === 'food') {
      filterParams.openNow = String(foodFilters.openNow);
      if (foodFilters.categories.length > 0) filterParams.categories = JSON.stringify(foodFilters.categories);
      filterParams.sortBy = foodFilters.sortBy;
    } else {
      if (mediaFilters.genreIds.length > 0) filterParams.genreIds = JSON.stringify(mediaFilters.genreIds);
      filterParams.sortTmdb = mediaFilters.sortTmdb;
    }

    resetToHome();
    router.push({ pathname: '/swipe', params: filterParams });
  }

  const providers = { movie: movieProvider, show: showProvider, food: restaurantProvider };

  async function handleCreateGroup() {
    if (!selectedTopic || !displayName.trim()) {
      Alert.alert('Missing info', 'Please enter your name.');
      return;
    }
    setPhase('creating');
    try {
      const code = generateSessionCode();
      const deviceId = await getDeviceId();

      let fetchOptions: Record<string, any> = {};
      if (selectedTopic === 'food') {
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

      const cards = await providers[selectedTopic].fetchCards(fetchOptions);
      if (cards.length === 0) {
        Alert.alert('No results', 'Could not find any options. Try again later.');
        setPhase('enter-name');
        return;
      }

      const location = selectedTopic === 'food' && fetchOptions.latitude
        ? { latitude: fetchOptions.latitude, longitude: fetchOptions.longitude!, radiusMiles: 5 }
        : undefined;

      const trimmedName = displayName.trim();
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
      await createSession(code, selectedTopic, deviceId, trimmedName, cards, location);
      trackGroupSessionCreated(selectedTopic);
      resetToHome();
      router.push({ pathname: '/lobby', params: { code, topic: selectedTopic, isCreator: 'true' } });
    } catch (err) {
      logError(err, 'handleCreateGroup');
      Alert.alert('Error', `Could not create group: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPhase('enter-name');
    }
  }

  const isEnterNameOrCreating = phase === 'enter-name' || phase === 'creating';

  return (
    <SafeAreaView style={[styles.container, isEnterNameOrCreating && styles.containerGroupMode]}>
      <View style={styles.sparkleContainer}>
        <SparkleButton onPress={() => setSupportVisible(true)} />
      </View>
      <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />
      <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />
      {selectedTopic && (
        <SearchOptions
          visible={optionsVisible}
          topic={selectedTopic}
          foodFilters={foodFilters}
          mediaFilters={mediaFilters}
          onApplyFood={setFoodFilters}
          onApplyMedia={setMediaFilters}
          onClose={() => setOptionsVisible(false)}
        />
      )}

      <View style={styles.header}>
        <Logo />
      </View>

      <View style={styles.buttons}>
        {/* Phase: Home — topic buttons + Join Group */}
        {phase === 'home' && (
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
            <View style={styles.joinContainer}>
              <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/join')}>
                <Text style={styles.joinButtonText}>Join Group</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Phase: Choose Mode */}
        {phase === 'choose-mode' && selectedTopic && (
          <View style={styles.modeChoice}>
            <Text style={styles.modeTopicTitle}>
              {topicEmojis[selectedTopic]} {topicDisplayNames[selectedTopic]}
            </Text>
            <TouchableOpacity
              style={styles.decideTogether}
              onPress={() => { trackTopicSelected(selectedTopic, 'group'); setPhase('enter-name'); }}
            >
              <Text style={styles.decideTogetherText}>Decide Together</Text>
              <Text style={styles.decideSubtext}>Create a group</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.decideSolo}
              onPress={handleDecideSolo}
            >
              <Text style={styles.decideSoloText}>Decide Solo</Text>
              <Text style={styles.decideSoloSubtext}>Swipe on your own</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOptionsVisible(true)}>
              <Text style={styles.optionsLink}>Options</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetToHome} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phase: Enter Name */}
        {phase === 'enter-name' && (
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
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPhase('choose-mode')} style={styles.backLink}>
              <Text style={styles.backLinkTextWhite}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Phase: Creating */}
        {phase === 'creating' && (
          <View style={styles.groupForm}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { marginTop: spacing.md, color: '#FFFFFF' }]}>
              Creating group...
            </Text>
          </View>
        )}
      </View>

      <View style={styles.feedbackContainer}>
        <FeedbackButton onPress={() => setFeedbackVisible(true)} />
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
    alignItems: 'center',
    paddingBottom: spacing.md,
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
  buttons: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinContainer: {
    marginTop: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.tertiary,
  },
  joinButtonText: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '700',
  },
  modeChoice: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  modeTopicTitle: {
    ...typography.title,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  decideTogether: {
    backgroundColor: colors.tertiary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  decideTogetherText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  decideSubtext: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  decideSolo: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.tertiary,
  },
  decideSoloText: {
    ...typography.body,
    color: colors.tertiary,
    fontWeight: '600',
  },
  decideSoloSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionsLink: {
    ...typography.caption,
    color: colors.tertiary,
    textDecorationLine: 'underline' as const,
    marginTop: spacing.sm,
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
    color: colors.textSecondary,
  },
  backLinkTextWhite: {
    ...typography.caption,
    color: '#FFFFFF',
  },
});
