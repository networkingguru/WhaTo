import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, cardStyle } from '../src/theme';
import { getSession, computeMatches, SessionData } from '../src/services/sessionService';
import { CardItem } from '../src/providers/types';
import { trackGroupMatchFound, trackGroupNoMatch } from '../src/services/analytics';

function getTopVotedCards(session: SessionData): CardItem[] {
  const participants = Object.values(session.participants || {});
  const voteCounts = new Map<string, number>();
  for (const p of participants) {
    if (p.swipes) {
      for (const [cardId, liked] of Object.entries(p.swipes)) {
        if (liked) voteCounts.set(cardId, (voteCounts.get(cardId) ?? 0) + 1);
      }
    }
  }
  const cardMap = new Map(session.cards.map((c) => [c.id, c]));
  return [...voteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => cardMap.get(id))
    .filter(Boolean) as CardItem[];
}

export default function GroupResultScreen() {
  const params = useLocalSearchParams<{ code: string; failed?: string }>();
  const { code } = params;
  const isFailed = params.failed === 'true';
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    if (code) {
      getSession(code).then(setSession);
    }
  }, [code]);

  const { unanimousCards, majorityCards, hasMatches } = useMemo(() => {
    if (!session || isFailed) return { unanimousCards: [], majorityCards: [], hasMatches: false };
    const matches = computeMatches(
      session.participants as Record<string, { name: string; swipes: Record<string, boolean> }>
    );
    const cardMap = new Map(session.cards.map((c) => [c.id, c]));
    const unanimous = matches.unanimous.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
    const majority = matches.majority.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
    return { unanimousCards: unanimous, majorityCards: majority, hasMatches: unanimous.length > 0 || majority.length > 0 };
  }, [session, isFailed]);

  // Fire analytics once when session loads
  const trackedRef = useRef(false);
  useEffect(() => {
    if (!session || trackedRef.current) return;
    trackedRef.current = true;
    if (isFailed || !hasMatches) {
      trackGroupNoMatch(session.topic);
    } else {
      trackGroupMatchFound(session.topic);
    }
  }, [session, isFailed, hasMatches]);

  if (!session) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={typography.body}>Loading results...</Text>
      </SafeAreaView>
    );
  }

  // Match Failed state
  if (isFailed) {
    return (
      <SafeAreaView style={[styles.container, styles.failedContainer]}>
        <ScrollView contentContainerStyle={styles.failedScroll}>
          <Text style={styles.failedTitle}>Match Failed</Text>
          <Text style={styles.failedSubtitle}>
            Someone ran out of options without finding any common ground.
          </Text>
          <Text style={styles.failedHint}>
            Tip: Try enabling more cuisine types or genres in Options before starting a group session. More options = better chances of matching!
          </Text>
          <TouchableOpacity style={styles.failedHomeButton} onPress={() => router.replace('/')}>
            <Text style={styles.homeText}>Start Over</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>
          {hasMatches ? 'You matched!' : 'Close enough?'}
        </Text>
        <Text style={styles.subtitle}>
          {hasMatches
            ? `${unanimousCards.length + majorityCards.length} match${unanimousCards.length + majorityCards.length !== 1 ? 'es' : ''} found`
            : 'Nobody agreed on anything, but here are the top picks'}
        </Text>

        {unanimousCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Everyone agreed</Text>
            {unanimousCards.map((card) => (
              <ResultCard key={card.id} card={card} />
            ))}
          </View>
        )}

        {majorityCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most people liked</Text>
            {majorityCards.map((card) => (
              <ResultCard key={card.id} card={card} />
            ))}
          </View>
        )}

        {!hasMatches && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top voted</Text>
            {getTopVotedCards(session).map((card) => (
              <ResultCard key={card.id} card={card} />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/')}>
          <Text style={styles.homeText}>Start Over</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({ card }: { card: CardItem }) {
  return (
    <View style={resultStyles.card}>
      {card.imageUrl && (
        <Image source={{ uri: card.imageUrl }} style={resultStyles.image} />
      )}
      <View style={resultStyles.info}>
        <Text style={resultStyles.title}>{card.title}</Text>
        <Text style={resultStyles.subtitle}>{card.subtitle}</Text>
        {card.rating != null && (
          <Text style={resultStyles.rating}>★ {card.rating}</Text>
        )}
      </View>
    </View>
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
  scroll: {
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  homeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  homeText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  failedContainer: {
    backgroundColor: '#FFF0F0',
  },
  failedScroll: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  failedTitle: {
    ...typography.title,
    color: colors.danger,
    textAlign: 'center',
  },
  failedSubtitle: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 24,
  },
  failedHint: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  failedHomeButton: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
});

const resultStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    ...cardStyle,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  image: {
    width: 80,
    height: 80,
  },
  info: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  rating: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
});
