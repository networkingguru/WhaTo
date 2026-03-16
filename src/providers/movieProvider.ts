import { CardItem, CardProvider, FetchOptions } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
}

function mapMovie(movie: TmdbMovie): CardItem {
  const year = movie.release_date?.slice(0, 4) ?? 'Unknown';
  return {
    id: `tmdb-movie-${movie.id}`,
    title: movie.title,
    subtitle: year,
    imageUrl: movie.poster_path
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
      : null,
    rating: Math.round((movie.vote_average / 2) * 10) / 10,
    details: [year, `Rating: ${movie.vote_average}/10`],
    sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
    meta: { tmdbId: movie.id, overview: movie.overview },
  };
}

export const movieProvider: CardProvider = {
  async fetchCards(options: FetchOptions): Promise<CardItem[]> {
    const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
    const page = options.page ?? 1;
    const hasGenres = options.genreIds && options.genreIds.length > 0;
    const useDiscover = hasGenres || options.sortTmdb === 'rating';

    try {
      let url: string;
      if (useDiscover) {
        const params = new URLSearchParams({
          page: String(page),
          sort_by: options.sortTmdb === 'rating' ? 'vote_average.desc' : 'popularity.desc',
          'vote_count.gte': '500',
        });
        if (hasGenres) {
          params.set('with_genres', options.genreIds!.join(','));
        }
        url = `${TMDB_BASE}/discover/movie?${params}`;
      } else {
        url = `${TMDB_BASE}/trending/movie/week?page=${page}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) return [];

      const data = await response.json();
      return (data.results as TmdbMovie[]).map(mapMovie);
    } catch {
      return [];
    }
  },
};
