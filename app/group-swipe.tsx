import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, AppState } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeDeck } from '../src/components/SwipeDeck';
import { CardDetail } from '../src/components/CardDetail';
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
import { logError } from '../src/services/crashlytics';
import { ParticipantBar } from '../src/components/ParticipantBar';
import { LegendToast } from '../src/components/LegendToast';

const GRACE_PERIOD_S = 5;

export default function GroupSwipeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [round, setRound] = useState(1);
  const [matchBanner, setMatchBanner] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [deckExhausted, setDeckExhausted] = useState(false);
  const [detailCard, setDetailCard] = useState<CardItem | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef<SessionData | null>(null);
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
      try {
        presenceCleanupRef.current = await setPresence(code, deviceId);
        isConnectedRef.current = true;
      } catch {
        // Allow retry on next AppState change
      }
    };

    connectPresence();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (presenceCleanupRef.current) {
          presenceCleanupRef.current();
          presenceCleanupRef.current = null;
        }
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
      sessionRef.current = data;

      // Detect round change — reload cards
      const dataRound = data?.round ?? 1;
      if (data?.cards && dataRound !== round) {
        setRound(dataRound);
        setCards([...data.cards]);
        cardsLoadedRef.current = true;
        setMatchBanner(false);
        setCountdown(0);
        setDeckExhausted(false);
        matchHandledRef.current = false;
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
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

  const handleMatchResolution = useCallback((sess: SessionData, matchIds: string[]) => {
    if (matchHandledRef.current) return;
    matchHandledRef.current = true;

    // Re-check matches with latest session data
    const finalMatches = computeLiveMatches(sess);
    const ids = finalMatches.length > 0 ? finalMatches : matchIds;

    if (ids.length === 1) {
      // Single match — done!
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      }).catch((err) => logError(err, 'group_end_session_match'));
    } else if (ids.length > 1) {
      // Multiple matches — start next round with just those cards
      const cardMap = new Map(sess.cards.map((c) => [c.id, c]));
      const nextCards = ids.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
      startNextRound(code!, nextCards);
    } else {
      // Somehow no matches anymore — end
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      }).catch((err) => logError(err, 'group_end_session_no_match'));
    }
  }, [code, router]);

  // Real-time match detection
  useEffect(() => {
    if (!session || !deviceId || matchHandledRef.current) return;

    // Check if ALL participants are completed — end immediately
    const participantIds = Object.keys(session.participants || {});
    const allCompleted = participantIds.length > 0 && participantIds.every(
      (pid) => session.participants[pid].completed
    );
    if (allCompleted) {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      const liveMatches = computeLiveMatches(session);
      if (liveMatches.length > 0) {
        handleMatchResolution(session, liveMatches);
      } else {
        matchHandledRef.current = true;
        endSession(code!).then(() => {
          router.replace({ pathname: '/group-result', params: { code } });
        }).catch((err) => logError(err, 'group_all_completed'));
      }
      return;
    }

    // Check for hopeless participant (exhausted cards, zero yes-swipes)
    if (hasHopelessParticipant(session)) {
      matchHandledRef.current = true;
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      router.replace({ pathname: '/group-result', params: { code, failed: 'true' } });
      return;
    }

    // Check for live unanimous matches
    const liveMatches = computeLiveMatches(session);
    if (liveMatches.length > 0 && !matchBanner) {
      setMatchBanner(true);
      setCountdown(GRACE_PERIOD_S);

      // Countdown timer (ticks every second)
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Grace timer — resolves after countdown
      graceTimerRef.current = setTimeout(() => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        const freshSession = sessionRef.current;
        if (freshSession) {
          const freshMatches = computeLiveMatches(freshSession);
          handleMatchResolution(freshSession, freshMatches.length > 0 ? freshMatches : liveMatches);
        } else {
          handleMatchResolution(session, liveMatches);
        }
      }, GRACE_PERIOD_S * 1000);
    }
  }, [session, deviceId, matchBanner, handleMatchResolution, code, router]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleSwipe = useCallback(
    async (card: CardItem, liked: boolean) => {
      if (code && deviceId) {
        try {
          await recordSwipe(code, deviceId, card.id, liked);
        } catch (err) {
          logError(err, liked ? 'group_swipe_right' : 'group_swipe_left');
        }
      }
    },
    [code, deviceId]
  );

  const handleSwipeRight = useCallback(
    (card: CardItem) => handleSwipe(card, true),
    [handleSwipe]
  );

  const handleSwipeLeft = useCallback(
    (card: CardItem) => handleSwipe(card, false),
    [handleSwipe]
  );

  const handleEmpty = useCallback(async () => {
    setDeckExhausted(true);
    if (code && deviceId) {
      await markCompleted(code, deviceId);
    }
    // If match banner is already showing, resolve immediately.
    const freshSession = sessionRef.current;
    if (matchBanner && freshSession) {
      const liveMatches = computeLiveMatches(freshSession);
      if (liveMatches.length > 0) {
        if (graceTimerRef.current) clearTimeout(graceTimerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
        handleMatchResolution(freshSession, liveMatches);
      }
    }
  }, [matchBanner, code, deviceId, handleMatchResolution]);

  const isCreator = session?.createdBy === deviceId;

  const handleEndSession = useCallback(() => {
    Alert.alert('End Group?', 'This will end the group for everyone and show results.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Group',
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
          Loading group...
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
          <Text style={styles.matchBannerText}>
            Match found! {countdown > 0 ? `Wrapping up in ${countdown}...` : 'Resolving...'}
          </Text>
        </View>
      )}

      {deckExhausted && !matchBanner ? (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Out of cards!</Text>
          <Text style={styles.waitingSubtext}>Waiting on the rest of the group to decide.</Text>
        </View>
      ) : (
        <SwipeDeck
          cards={cards}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          onEmpty={handleEmpty}
          onTap={(card) => setDetailCard(card)}
        />
      )}
      {detailCard && (
        <CardDetail
          card={detailCard}
          visible={true}
          onClose={() => setDetailCard(null)}
          topic={session.topic}
        />
      )}
      {session && deviceId && (
        <ParticipantBar
          participants={session.participants}
          selfDeviceId={deviceId}
        />
      )}
      <View style={styles.hints}>
        <Text style={styles.hintLeft}>← Nope</Text>
        <Text style={styles.hintRight}>Yes! →</Text>
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
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  waitingText: {
    ...typography.title,
    color: colors.primary,
    textAlign: 'center',
  },
  waitingSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  hintLeft: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4444',
  },
  hintRight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  attribution: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    paddingBottom: spacing.sm,
    opacity: 0.6,
  },
});
