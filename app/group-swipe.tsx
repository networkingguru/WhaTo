import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeDeck } from '../src/components/SwipeDeck';
import { CardItem } from '../src/providers/types';
import { colors, spacing, typography } from '../src/theme';
import { topicDisplayNames } from '../src/utils/topicLabels';
import {
  listenToSession,
  recordSwipe,
  markCompleted,
  SessionData,
} from '../src/services/sessionService';
import { getDeviceId } from '../src/services/deviceId';

export default function GroupSwipeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    if (!code) return;
    const unsub = listenToSession(code, (data) => {
      setSession(data);
      if (data?.cards && cards.length === 0) {
        setCards(data.cards);
      }
      if (data?.status === 'complete') {
        router.replace({ pathname: '/group-result', params: { code } });
      }
      if (data?.participants) {
        const allDone = Object.values(data.participants).every((p) => p.completed);
        if (allDone && Object.keys(data.participants).length > 0) {
          router.replace({ pathname: '/group-result', params: { code } });
        }
      }
    });
    return unsub;
  }, [code, router, cards.length]);

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

  const handleEmpty = useCallback(async () => {
    if (code && deviceId) {
      await markCompleted(code, deviceId);
    }
  }, [code, deviceId]);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          {topicDisplayNames[session.topic] ?? 'Swipe'}
        </Text>
        <Text style={styles.code}>{code}</Text>
      </View>
      <SwipeDeck
        cards={cards}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
        onEmpty={handleEmpty}
      />
      <View style={styles.hints}>
        <Text style={typography.caption}>← Nope</Text>
        <Text style={typography.caption}>Yes! →</Text>
      </View>
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
  header: {
    ...typography.subtitle,
  },
  code: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
