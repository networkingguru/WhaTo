import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, cardStyle } from '../src/theme';
import { getSession, computeMatches, SessionData } from '../src/services/sessionService';
import { CardItem } from '../src/providers/types';

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
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    if (code) {
      getSession(code).then(setSession);
    }
  }, [code]);

  if (!session) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={typography.body}>Loading results...</Text>
      </SafeAreaView>
    );
  }

  const matches = computeMatches(
    session.participants as Record<string, { name: string; swipes: Record<string, boolean> }>
  );

  const cardMap = new Map<string, CardItem>();
  for (const card of session.cards) {
    cardMap.set(card.id, card);
  }

  const unanimousCards = matches.unanimous.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
  const majorityCards = matches.majority.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
  const hasMatches = unanimousCards.length > 0 || majorityCards.length > 0;

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
