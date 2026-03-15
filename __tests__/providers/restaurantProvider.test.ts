import { restaurantProvider } from '../../src/providers/restaurantProvider';
import { CardItem } from '../../src/providers/types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const yelpResponse = {
  businesses: [
    {
      id: 'yelp-abc123',
      name: 'Joes Pizza',
      image_url: 'https://s3-media1.fl.yelpcdn.com/bphoto/abc/o.jpg',
      rating: 4.5,
      categories: [{ alias: 'pizza', title: 'Pizza' }],
      price: '$$',
      location: {
        display_address: ['123 Main St', 'New York, NY 10001'],
      },
      url: 'https://www.yelp.com/biz/joes-pizza',
    },
  ],
};

const googleResponse = {
  results: [
    {
      place_id: 'google-xyz789',
      name: 'Burger Joint',
      photos: [{ photo_reference: 'photo-ref-123' }],
      rating: 4.0,
      types: ['restaurant', 'food'],
      price_level: 2,
      vicinity: '456 Oak Ave',
    },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
  process.env.EXPO_PUBLIC_YELP_API_KEY = 'yelp-test-key';
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'google-test-key';
});

describe('restaurantProvider', () => {
  it('fetches from Yelp and maps to CardItem format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => yelpResponse,
    });

    const cards = await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.yelp.com/v3/businesses/search'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer yelp-test-key',
        }),
      })
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'yelp-abc123',
      title: 'Joes Pizza',
      subtitle: 'Pizza',
      rating: 4.5,
    });
  });

  it('falls back to Google Places when Yelp fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => googleResponse,
    });

    const cards = await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'google-xyz789',
      title: 'Burger Joint',
    });
  });

  it('passes radius to Yelp API in meters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => yelpResponse,
    });

    await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
      radius: 10, // 10 miles
    });

    const url = mockFetch.mock.calls[0][0] as string;
    // 10 miles = 16093 meters
    expect(url).toContain('radius=16093');
  });

  it('defaults to 5 mile radius when not specified', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => yelpResponse,
    });

    await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
    });

    const url = mockFetch.mock.calls[0][0] as string;
    // 5 miles = 8047 meters
    expect(url).toContain('radius=8047');
  });

  it('returns empty array when both APIs fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const cards = await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(cards).toEqual([]);
  });
});
