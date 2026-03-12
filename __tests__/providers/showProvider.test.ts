import { showProvider } from '../../src/providers/showProvider';
import { CardItem } from '../../src/providers/types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const tmdbShowResponse = {
  results: [
    {
      id: 1399,
      name: 'Game of Thrones',
      overview: 'Seven noble families fight...',
      poster_path: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
      vote_average: 8.4,
      first_air_date: '2011-04-17',
      genre_ids: [10765, 18],
    },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
  process.env.EXPO_PUBLIC_TMDB_API_KEY = 'test-key';
});

describe('showProvider', () => {
  it('fetches trending shows and maps to CardItem format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tmdbShowResponse,
    });

    const cards = await showProvider.fetchCards({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.themoviedb.org/3/trending/tv/week'),
      expect.any(Object)
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual<CardItem>({
      id: 'tmdb-show-1399',
      title: 'Game of Thrones',
      subtitle: '2011',
      imageUrl: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
      rating: 4.2,
      details: ['2011', 'Rating: 8.4/10'],
      sourceUrl: 'https://www.themoviedb.org/tv/1399',
      meta: { tmdbId: 1399, overview: 'Seven noble families fight...' },
    });
  });

  it('returns empty array on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const cards = await showProvider.fetchCards({});
    expect(cards).toEqual([]);
  });
});
