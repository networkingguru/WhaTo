import { CardItem, CardProvider, FetchOptions } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
}

function mapShow(show: TmdbShow): CardItem {
  const year = show.first_air_date?.slice(0, 4) ?? 'Unknown';
  return {
    id: `tmdb-show-${show.id}`,
    title: show.name,
    subtitle: year,
    imageUrl: show.poster_path
      ? `${TMDB_IMAGE_BASE}${show.poster_path}`
      : null,
    rating: Math.round((show.vote_average / 2) * 10) / 10,
    details: [year, `Rating: ${show.vote_average}/10`],
    sourceUrl: `https://www.themoviedb.org/tv/${show.id}`,
    meta: { tmdbId: show.id, overview: show.overview },
  };
}

export const showProvider: CardProvider = {
  async fetchCards(options: FetchOptions): Promise<CardItem[]> {
    const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
    const page = options.page ?? 1;

    try {
      const response = await fetch(
        `${TMDB_BASE}/trending/tv/week?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.results as TmdbShow[]).map(mapShow);
    } catch {
      return [];
    }
  },
};
