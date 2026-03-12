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
  options?: { enabled?: boolean }
): UseCardsResult {
  const enabled = options?.enabled ?? true;
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const provider = providers[topic];
        const fetchOptions: FetchOptions = {
          latitude: location?.latitude,
          longitude: location?.longitude,
        };
        const result = await provider.fetchCards(fetchOptions);

        if (!cancelled) {
          setCards(result);
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
  }, [topic, location?.latitude, location?.longitude, enabled]);

  return { cards, loading, error };
}
