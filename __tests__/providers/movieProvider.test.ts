import { movieProvider } from '../../src/providers/movieProvider';
import { CardItem } from '../../src/providers/types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const tmdbMovieResponse = {
  results: [
    {
      id: 550,
      title: 'Fight Club',
      overview: 'An insomniac office worker...',
      poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      vote_average: 8.4,
      release_date: '1999-10-15',
      genre_ids: [18, 53],
    },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
  process.env.EXPO_PUBLIC_TMDB_API_KEY = 'test-key';
});

describe('movieProvider', () => {
  it('fetches trending movies and maps to CardItem format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tmdbMovieResponse,
    });

    const cards = await movieProvider.fetchCards({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.themoviedb.org/3/trending/movie/week'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual<CardItem>({
      id: 'tmdb-movie-550',
      title: 'Fight Club',
      subtitle: '1999',
      imageUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      rating: 4.2,
      details: ['1999', 'Rating: 8.4/10'],
      sourceUrl: 'https://www.themoviedb.org/movie/550',
      meta: { tmdbId: 550, overview: 'An insomniac office worker...' },
    });
  });

  it('returns empty array on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const cards = await movieProvider.fetchCards({});
    expect(cards).toEqual([]);
  });
});
