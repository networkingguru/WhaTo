import { useState, useEffect } from 'react';
import { CardItem, Topic, FetchOptions } from '../providers/types';
import { movieProvider } from '../providers/movieProvider';
import { showProvider } from '../providers/showProvider';
import { restaurantProvider } from '../providers/restaurantProvider';

const providers = {
  movie: movieProvider,
  show: showProvider,
  food: restaurantProvider,
} as const;

interface UseCardsResult {
  cards: CardItem[];
  loading: boolean;
  error: string | null;
}

export function useCards(
  topic: Topic,
  location?: { latitude: number; longitude: number },
  options?: {
    enabled?: boolean;
    radius?: number;
    openNow?: boolean;
    categories?: string[];
    sortBy?: 'best_match' | 'distance' | 'rating';
    genreIds?: number[];
    sortTmdb?: 'popularity' | 'rating';
  }
): UseCardsResult {
  const enabled = options?.enabled ?? true;
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize filter arrays for dependency comparison
  const categoriesKey = options?.categories?.join(',') ?? '';
  const genreIdsKey = options?.genreIds?.join(',') ?? '';

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setCards([]);

      try {
        const provider = providers[topic];
        const fetchOptions: FetchOptions = {
          latitude: location?.latitude,
          longitude: location?.longitude,
          radius: options?.radius,
          openNow: options?.openNow,
          categories: options?.categories,
          sortBy: options?.sortBy,
          genreIds: options?.genreIds,
          sortTmdb: options?.sortTmdb,
        };
        const result = await provider.fetchCards(fetchOptions);

        if (!cancelled) {
          if (result.length === 0) {
            setError('No results found. Try adjusting your filters.');
          } else {
            setCards(result);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cards');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [topic, location?.latitude, location?.longitude, enabled, options?.radius, options?.openNow, categoriesKey, options?.sortBy, genreIdsKey, options?.sortTmdb]);

  return { cards, loading, error };
}
