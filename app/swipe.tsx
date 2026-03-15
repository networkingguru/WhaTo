import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { SwipeDeck } from '../src/components/SwipeDeck';
import { useCards } from '../src/hooks/useCards';
import { Topic, CardItem } from '../src/providers/types';
import { colors, spacing, typography } from '../src/theme';
import { topicDisplayNames } from '../src/utils/topicLabels';

export default function SwipeScreen() {
  const { topic } = useLocalSearchParams<{ topic: Topic }>();
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>();
  const [locationLoading, setLocationLoading] = useState(topic === 'food');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Request location for food topic
  React.useEffect(() => {
    if (topic !== 'food') return;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission is needed to find restaurants near you.');
          setLocationLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        setLocationError('Could not determine your location. Please try again.');
      } finally {
        setLocationLoading(false);
      }
    })();
  }, [topic]);

  const needsLocation = topic === 'food';
  const locationReady = !needsLocation || location != null;
  const { cards, loading, error } = useCards(
    topic as Topic,
    needsLocation ? location : undefined,
    { enabled: locationReady }
  );

  const handleSwipeRight = useCallback(
    (card: CardItem) => {
      router.replace({
        pathname: '/result',
        params: {
          title: card.title,
          subtitle: card.subtitle,
          imageUrl: card.imageUrl ?? '',
          rating: card.rating?.toString() ?? '',
          details: JSON.stringify(card.details),
          sourceUrl: card.sourceUrl ?? '',
          topic: topic,
        },
      });
    },
    [router, topic]
  );

  const handleSwipeLeft = useCallback(() => {
    // Just skip the card — SwipeDeck advances automatically
  }, []);

  const handleEmpty = useCallback(() => {
    router.replace('/');
  }, [router]);

  const isLoading = loading || locationLoading;
  const displayError = error || locationError;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { marginTop: spacing.md }]}>
          {locationLoading ? 'Finding your location...' : 'Loading cards...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (displayError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={[typography.body, { color: colors.primary }]}>{displayError}</Text>
        <Pressable onPress={() => router.replace('/')} style={{ marginTop: spacing.lg }}>
          <Text style={[typography.caption, { color: colors.primary }]}>← Back to home</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/')} hitSlop={12}>
          <Text style={styles.backButton}>←</Text>
        </Pressable>
        <Text style={styles.header}>{topicDisplayNames[topic as Topic] ?? 'Swipe'}</Text>
        <View style={{ width: 32 }} />
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
    textAlign: 'center',
  },
  backButton: {
    ...typography.subtitle,
    color: colors.primary,
    fontSize: 24,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
