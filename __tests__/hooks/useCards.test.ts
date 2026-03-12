import { renderHook, waitFor } from '@testing-library/react-native';
import { useCards } from '../../src/hooks/useCards';

jest.mock('../../src/providers/movieProvider', () => ({
  movieProvider: {
    fetchCards: jest.fn().mockResolvedValue([
      { id: 'movie-1', title: 'Test Movie', subtitle: '2024', imageUrl: null, rating: 4, details: [], sourceUrl: null, meta: {} },
    ]),
  },
}));

jest.mock('../../src/providers/showProvider', () => ({
  showProvider: {
    fetchCards: jest.fn().mockResolvedValue([
      { id: 'show-1', title: 'Test Show', subtitle: '2024', imageUrl: null, rating: 4, details: [], sourceUrl: null, meta: {} },
    ]),
  },
}));

jest.mock('../../src/providers/restaurantProvider', () => ({
  restaurantProvider: {
    fetchCards: jest.fn().mockResolvedValue([
      { id: 'rest-1', title: 'Test Restaurant', subtitle: 'Pizza', imageUrl: null, rating: 4, details: [], sourceUrl: null, meta: {} },
    ]),
  },
}));

describe('useCards', () => {
  it('fetches movie cards for movie topic', async () => {
    const { result } = renderHook(() => useCards('movie'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].title).toBe('Test Movie');
    expect(result.current.error).toBeNull();
  });

  it('fetches show cards for show topic', async () => {
    const { result } = renderHook(() => useCards('show'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cards[0].title).toBe('Test Show');
  });

  it('fetches restaurant cards for food topic with location', async () => {
    const { result } = renderHook(() =>
      useCards('food', { latitude: 40.71, longitude: -74.0 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cards[0].title).toBe('Test Restaurant');
  });
});
