import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { SwipeDeck } from '../src/components/SwipeDeck';
import { CardDetail } from '../src/components/CardDetail';
import { SearchOptions, FoodFilters, MediaFilters } from '../src/components/SearchOptions';
import { RadiusSelector } from '../src/components/RadiusSelector';
import { useCards } from '../src/hooks/useCards';
import { Topic, CardItem } from '../src/providers/types';
import { colors, spacing, typography } from '../src/theme';
import { topicDisplayNames } from '../src/utils/topicLabels';

export default function SwipeScreen() {
  const params = useLocalSearchParams<{ topic: string; pickedLatitude?: string; pickedLongitude?: string }>();
  const topic = params.topic as Topic;
  const router = useRouter();
  const [radius, setRadius] = useState(5);
  const [detailCard, setDetailCard] = useState<CardItem | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>();
  const [locationLoading, setLocationLoading] = useState(topic === 'food');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Filter state
  const [foodFilters, setFoodFilters] = useState<FoodFilters>({
    openNow: true,
    categories: [],
    sortBy: 'best_match',
  });
  const [mediaFilters, setMediaFilters] = useState<MediaFilters>({
    genreIds: [],
    sortTmdb: 'popularity',
  });

  // Use picked location from location-picker if available
  React.useEffect(() => {
    if (params.pickedLatitude && params.pickedLongitude) {
      const lat = parseFloat(params.pickedLatitude);
      const lng = parseFloat(params.pickedLongitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setLocation({ latitude: lat, longitude: lng });
        setLocationLoading(false);
      }
    }
  }, [params.pickedLatitude, params.pickedLongitude]);

  // Request location for food topic (skip if picked location is available)
  React.useEffect(() => {
    if (topic !== 'food') return;
    if (params.pickedLatitude && params.pickedLongitude) return;

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
  }, [topic, params.pickedLatitude, params.pickedLongitude]);

  const needsLocation = topic === 'food';
  const locationReady = !needsLocation || location != null;
  const { cards, loading, error } = useCards(
    topic as Topic,
    needsLocation ? location : undefined,
    {
      enabled: locationReady,
      radius,
      ...(topic === 'food'
        ? {
            openNow: foodFilters.openNow,
            categories: foodFilters.categories.length > 0 ? foodFilters.categories : undefined,
            sortBy: foodFilters.sortBy,
          }
        : {
            genreIds: mediaFilters.genreIds.length > 0 ? mediaFilters.genreIds : undefined,
            sortTmdb: mediaFilters.sortTmdb,
          }),
    }
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
        <Pressable onPress={() => setOptionsVisible(true)} hitSlop={12}>
          <Text style={styles.optionsButton}>Options</Text>
        </Pressable>
      </View>
      {topic === 'food' && (
        <>
          <RadiusSelector selected={radius} onSelect={setRadius} />
          <Pressable
            onPress={() => router.push({ pathname: '/location-picker', params: { topic } })}
            style={styles.pickLocationButton}
          >
            <Text style={styles.pickLocationText}>Pick location</Text>
          </Pressable>
        </>
      )}
      <SwipeDeck
        cards={cards}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
        onEmpty={handleEmpty}
        onTap={(card) => setDetailCard(card)}
      />
      {detailCard && (
        <CardDetail
          card={detailCard}
          visible={true}
          onClose={() => setDetailCard(null)}
          topic={topic}
        />
      )}
      <SearchOptions
        topic={topic}
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        foodFilters={foodFilters}
        mediaFilters={mediaFilters}
        onApplyFood={setFoodFilters}
        onApplyMedia={setMediaFilters}
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
  optionsButton: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  pickLocationButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  pickLocationText: {
    ...typography.caption,
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
});
