import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeDeck } from '../src/components/SwipeDeck';
import { CardItem } from '../src/providers/types';
import { colors, spacing, typography } from '../src/theme';
import { topicDisplayNames } from '../src/utils/topicLabels';
import {
  listenToSession,
  recordSwipe,
  endSession,
  computeLiveMatches,
  hasHopelessParticipant,
  startNextRound,
  setPresence,
  markCompleted,
  SessionData,
} from '../src/services/sessionService';
import { getDeviceId } from '../src/services/deviceId';
import { ParticipantBar } from '../src/components/ParticipantBar';
import { LegendToast } from '../src/components/LegendToast';

const GRACE_PERIOD_MS = 30_000;

export default function GroupSwipeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [round, setRound] = useState(1);
  const [matchBanner, setMatchBanner] = useState(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchHandledRef = useRef(false);
  const cardsLoadedRef = useRef(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  // Presence lifecycle
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!code || !deviceId) return;

    const connectPresence = async () => {
      if (isConnectedRef.current) return;
      isConnectedRef.current = true;
      presenceCleanupRef.current = await setPresence(code, deviceId);
    };

    connectPresence();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        isConnectedRef.current = false;
        connectPresence();
      }
    });

    return () => {
      subscription.remove();
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }
      isConnectedRef.current = false;
    };
  }, [code, deviceId]);

  // Listen for session updates
  useEffect(() => {
    if (!code) return;
    const unsub = listenToSession(code, (data) => {
      setSession(data);

      // Detect round change — reload cards
      const dataRound = data?.round ?? 1;
      if (data?.cards && dataRound !== round) {
        setRound(dataRound);
        setCards([...data.cards]);
        cardsLoadedRef.current = true;
        setMatchBanner(false);
        matchHandledRef.current = false;
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
        }
      } else if (data?.cards && !cardsLoadedRef.current) {
        setCards([...data.cards]);
        cardsLoadedRef.current = true;
      }

      // Session ended externally
      if (data?.status === 'complete' && !matchHandledRef.current) {
        router.replace({ pathname: '/group-result', params: { code } });
      }
    });
    return unsub;
  }, [code, router, round]);

  // Real-time match detection
  useEffect(() => {
    if (!session || !deviceId || matchHandledRef.current) return;

    // Check for hopeless participant (exhausted cards, zero yes-swipes)
    if (hasHopelessParticipant(session)) {
      matchHandledRef.current = true;
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      router.replace({ pathname: '/group-result', params: { code, failed: 'true' } });
      return;
    }

    // Check for live unanimous matches
    const liveMatches = computeLiveMatches(session);
    if (liveMatches.length > 0 && !matchBanner) {
      setMatchBanner(true);

      // Start grace timer — 30s for everyone to finish current card
      graceTimerRef.current = setTimeout(() => {
        handleMatchResolution(session, liveMatches);
      }, GRACE_PERIOD_MS);
    }
  }, [session, deviceId, matchBanner]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
    };
  }, []);

  function handleMatchResolution(sess: SessionData, matchIds: string[]) {
    if (matchHandledRef.current) return;
    matchHandledRef.current = true;

    // Re-check matches with latest session data
    const finalMatches = computeLiveMatches(sess);
    const ids = finalMatches.length > 0 ? finalMatches : matchIds;

    if (ids.length === 1) {
      // Single match — done!
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      });
    } else if (ids.length > 1) {
      // Multiple matches — start next round with just those cards
      const cardMap = new Map(sess.cards.map((c) => [c.id, c]));
      const nextCards = ids.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
      startNextRound(code!, nextCards);
    } else {
      // Somehow no matches anymore — end
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      });
    }
  }

  const handleSwipeRight = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        await recordSwipe(code, deviceId, card.id, true);
      }
    },
    [code, deviceId]
  );

  const handleSwipeLeft = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        await recordSwipe(code, deviceId, card.id, false);
      }
    },
    [code, deviceId]
  );

  const handleEmpty = useCallback(() => {
    if (code && deviceId) {
      markCompleted(code, deviceId);
    }
    // Participant exhausted all cards. Match detection in the listener
    // will handle hopeless participant check.
    // If match banner is already showing, resolve immediately.
    if (matchBanner && session) {
      const liveMatches = computeLiveMatches(session);
      if (liveMatches.length > 0) {
        if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
        handleMatchResolution(session, liveMatches);
      }
    }
  }, [matchBanner, session, code]);

  const isCreator = session?.createdBy === deviceId;

  const handleEndSession = useCallback(() => {
    Alert.alert('End Session?', 'This will end the session for everyone and show results.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          if (code) await endSession(code);
        },
      },
    ]);
  }, [code]);

  const handleLeave = useCallback(() => {
    router.replace('/');
  }, [router]);

  if (!session || cards.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { marginTop: spacing.md }]}>
          Loading session...
        </Text>
      </SafeAreaView>
    );
  }

  const currentRound = session.round ?? 1;

  return (
    <SafeAreaView style={styles.container}>
      <LegendToast dismissed={matchBanner} />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={isCreator ? handleEndSession : handleLeave} hitSlop={12}>
          <Text style={styles.exitText}>{isCreator ? 'End' : 'Leave'}</Text>
        </TouchableOpacity>
        <Text style={styles.header}>
          {topicDisplayNames[session.topic] ?? 'Swipe'}
        </Text>
        <Text style={styles.code}>{code}</Text>
      </View>

      <Text style={styles.instruction}>
        {currentRound > 1
          ? `Round ${currentRound} — Narrow it down!`
          : 'Select as many options as you like!\nWhaTo will end when everyone has matched.'}
      </Text>

      {matchBanner && (
        <View style={styles.matchBanner}>
          <Text style={styles.matchBannerText}>Match found! Wrapping up...</Text>
        </View>
      )}

      <SwipeDeck
        cards={cards}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
        onEmpty={handleEmpty}
      />
      {session && deviceId && (
        <ParticipantBar
          participants={session.participants}
          selfDeviceId={deviceId}
        />
      )}
      <View style={styles.hints}>
        <Text style={typography.caption}>← Nope</Text>
        <Text style={typography.caption}>Yes! →</Text>
      </View>
      <Text style={styles.attribution}>
        {session.topic === 'food'
          ? 'Powered by Yelp'
          : 'This product uses the TMDB API but is not endorsed or certified by TMDB.'}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  exitText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  header: {
    ...typography.subtitle,
  },
  code: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  instruction: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  matchBanner: {
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  matchBannerText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  attribution: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    paddingBottom: spacing.sm,
    opacity: 0.6,
  },
});
