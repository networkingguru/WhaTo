/**
 * Screen-level integration tests for the Solo Swipe screen (app/swipe.tsx).
 *
 * Covers: loading states, location permission, API empty results, card rendering,
 * navigation, food-specific UI (RadiusSelector, location picker), media topics,
 * attribution text, filter param initialization, and swipe callbacks.
 */

// --- Mocks (must precede imports) ---

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn<Record<string, string>, []>(() => ({ topic: 'food' }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: (...args: any[]) => mockUseLocalSearchParams(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

const mockRequestPermissions = jest.fn();
const mockGetCurrentPosition = jest.fn();
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: (...args: any[]) => mockRequestPermissions(),
  getCurrentPositionAsync: (...args: any[]) => mockGetCurrentPosition(),
}));

jest.mock('expo-device', () => ({ deviceName: null }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-firebase/analytics', () => {
  return () => ({ logEvent: jest.fn().mockResolvedValue(undefined), logScreenView: jest.fn() });
});

jest.mock('@react-native-firebase/crashlytics', () => {
  return () => ({ recordError: jest.fn(), log: jest.fn(), setAttribute: jest.fn() });
});

jest.mock('phosphor-react-native', () => ({
  ForkKnife: 'ForkKnife',
  FilmSlate: 'FilmSlate',
  Television: 'Television',
  Star: 'Star',
  Sparkle: 'Sparkle',
  ChatCircleDots: 'ChatCircleDots',
  Bug: 'Bug',
  Lightbulb: 'Lightbulb',
  X: 'X',
}));

jest.mock('../../src/services/analytics', () => ({
  trackSoloSwipeRight: jest.fn(),
  trackSoloDeckEmpty: jest.fn(),
  trackCardDetailOpened: jest.fn(),
}));

jest.mock('../../src/services/crashlytics', () => ({
  logError: jest.fn(),
}));

// SwipeDeck: simplified mock that renders children-like UI and exposes callbacks
let capturedSwipeDeckProps: any = null;
jest.mock('../../src/components/SwipeDeck', () => ({
  SwipeDeck: (props: any) => {
    capturedSwipeDeckProps = props;
    const { View, Text } = require('react-native');
    return (
      <View testID="swipe-deck">
        {(props.cards || []).map((c: any, i: number) => (
          <Text key={i}>{c.title}</Text>
        ))}
      </View>
    );
  },
}));

jest.mock('../../src/components/CardDetail', () => ({
  CardDetail: (props: any) => {
    if (!props.visible) return null;
    const { View, Text } = require('react-native');
    return (
      <View testID="card-detail">
        <Text>{props.card?.title}</Text>
      </View>
    );
  },
}));

// RadiusSelector: render real-looking UI so we can query for radius text
jest.mock('../../src/components/RadiusSelector', () => ({
  RadiusSelector: (props: any) => {
    const { View, Text, Pressable } = require('react-native');
    const options = [1, 5, 10, 25];
    return (
      <View testID="radius-selector">
        <Text>Search radius</Text>
        {options.map((r: number) => (
          <Pressable key={r} onPress={() => props.onSelect(r)}>
            <Text>{r} mi</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

jest.mock('../../src/components/SearchOptions', () => ({
  SearchOptions: () => null,
}));

// --- Imports ---

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import SwipeScreen from '../../app/swipe';
import { trackSoloSwipeRight, trackSoloDeckEmpty, trackCardDetailOpened } from '../../src/services/analytics';
import { logError } from '../../src/services/crashlytics';
import { CardItem } from '../../src/providers/types';

const flush = () => new Promise((r) => setImmediate(r));

const makeCard = (overrides: Partial<CardItem> = {}): CardItem => ({
  id: 'card-1',
  title: 'Test Restaurant',
  subtitle: 'Great food',
  imageUrl: 'https://example.com/img.jpg',
  rating: 4.5,
  details: ['$$', 'Downtown'],
  sourceUrl: 'https://yelp.com/biz/test',
  meta: {},
  ...overrides,
});

// --- Helpers ---

function setParams(params: Record<string, string>) {
  mockUseLocalSearchParams.mockReturnValue(params);
}

function grantLocation(lat = 37.7749, lng = -122.4194) {
  mockRequestPermissions.mockResolvedValue({ status: 'granted' });
  mockGetCurrentPosition.mockResolvedValue({
    coords: { latitude: lat, longitude: lng },
  });
}

function denyLocation() {
  mockRequestPermissions.mockResolvedValue({ status: 'denied' });
}

// --- Setup ---

beforeEach(() => {
  jest.clearAllMocks();
  capturedSwipeDeckProps = null;
});

// We need a fresh useCards mock for each describe block, but since jest.mock
// is hoisted we set it here and control return values per test.
const mockUseCards = jest.fn();
jest.mock('../../src/hooks/useCards', () => ({
  useCards: (...args: any[]) => mockUseCards(...args),
}));

// ---------------------------------------------------------------------------
// 1. Loading states
// ---------------------------------------------------------------------------
describe('Loading states', () => {
  it('shows "Finding your location..." for food topic while location is resolving', async () => {
    setParams({ topic: 'food' });
    // Location never resolves immediately — keep it pending
    mockRequestPermissions.mockReturnValue(new Promise(() => {}));
    mockUseCards.mockReturnValue({ cards: [], loading: true, error: null });

    const { getByText } = render(<SwipeScreen />);

    expect(getByText('Finding your location...')).toBeTruthy();
  });

  it('shows "Loading cards..." for movie topic', () => {
    setParams({ topic: 'movie' });
    mockUseCards.mockReturnValue({ cards: [], loading: true, error: null });

    const { getByText } = render(<SwipeScreen />);

    expect(getByText('Loading cards...')).toBeTruthy();
  });

  it('shows "Loading cards..." for show topic', () => {
    setParams({ topic: 'show' });
    mockUseCards.mockReturnValue({ cards: [], loading: true, error: null });

    const { getByText } = render(<SwipeScreen />);

    expect(getByText('Loading cards...')).toBeTruthy();
  });

  it('shows "Loading cards..." for food once location is acquired but cards still loading', async () => {
    setParams({ topic: 'food', pickedLatitude: '37.77', pickedLongitude: '-122.42' });
    mockUseCards.mockReturnValue({ cards: [], loading: true, error: null });

    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByText('Loading cards...')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Location permission denied (food topic)
// ---------------------------------------------------------------------------
describe('Location permission denied', () => {
  it('shows location error message when permission is denied', async () => {
    setParams({ topic: 'food' });
    denyLocation();
    mockUseCards.mockReturnValue({ cards: [], loading: false, error: null });

    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByText('Location permission is needed to find restaurants near you.')).toBeTruthy();
  });

  it('shows "Back to home" link on location error that navigates home', async () => {
    setParams({ topic: 'food' });
    denyLocation();
    mockUseCards.mockReturnValue({ cards: [], loading: false, error: null });

    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    const backLink = getByText(/Back to home/);
    fireEvent.press(backLink);

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('calls logError when getCurrentPositionAsync throws', async () => {
    setParams({ topic: 'food' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetCurrentPosition.mockRejectedValue(new Error('GPS failure'));
    mockUseCards.mockReturnValue({ cards: [], loading: false, error: null });

    render(<SwipeScreen />);
    await act(flush);

    expect(logError).toHaveBeenCalledWith(expect.any(Error), 'swipe_location');
  });
});

// ---------------------------------------------------------------------------
// 3. API returns no results
// ---------------------------------------------------------------------------
describe('API returns no results', () => {
  it('shows "No results found" error from useCards', async () => {
    setParams({ topic: 'movie' });
    mockUseCards.mockReturnValue({
      cards: [],
      loading: false,
      error: 'No results found. Try adjusting your filters.',
    });

    const { getByText } = render(<SwipeScreen />);

    expect(getByText('No results found. Try adjusting your filters.')).toBeTruthy();
  });

  it('shows generic API error from useCards', async () => {
    setParams({ topic: 'food', pickedLatitude: '37.77', pickedLongitude: '-122.42' });
    mockUseCards.mockReturnValue({
      cards: [],
      loading: false,
      error: 'Failed to load cards',
    });

    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByText('Failed to load cards')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4. Cards loaded — SwipeDeck renders
// ---------------------------------------------------------------------------
describe('Cards loaded', () => {
  const cards = [
    makeCard({ id: '1', title: 'Cafe Roma' }),
    makeCard({ id: '2', title: 'Sushi Zen' }),
  ];

  beforeEach(() => {
    setParams({ topic: 'food', pickedLatitude: '37.77', pickedLongitude: '-122.42' });
    mockUseCards.mockReturnValue({ cards, loading: false, error: null });
  });

  it('renders SwipeDeck with cards', async () => {
    const { getByTestId, getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByTestId('swipe-deck')).toBeTruthy();
    expect(getByText('Cafe Roma')).toBeTruthy();
    expect(getByText('Sushi Zen')).toBeTruthy();
  });

  it('passes correct callbacks to SwipeDeck', async () => {
    render(<SwipeScreen />);
    await act(flush);

    expect(capturedSwipeDeckProps).not.toBeNull();
    expect(typeof capturedSwipeDeckProps.onSwipeRight).toBe('function');
    expect(typeof capturedSwipeDeckProps.onSwipeLeft).toBe('function');
    expect(typeof capturedSwipeDeckProps.onEmpty).toBe('function');
    expect(typeof capturedSwipeDeckProps.onTap).toBe('function');
  });

  it('swipe right navigates to result screen with card data', async () => {
    render(<SwipeScreen />);
    await act(flush);

    const card = cards[0];
    act(() => {
      capturedSwipeDeckProps.onSwipeRight(card);
    });

    expect(trackSoloSwipeRight).toHaveBeenCalledWith('food');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/result',
      params: expect.objectContaining({
        title: 'Cafe Roma',
        subtitle: 'Great food',
        topic: 'food',
      }),
    });
  });

  it('swipe left does not navigate (just skips)', async () => {
    render(<SwipeScreen />);
    await act(flush);

    act(() => {
      capturedSwipeDeckProps.onSwipeLeft();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('onEmpty tracks event and navigates home', async () => {
    render(<SwipeScreen />);
    await act(flush);

    act(() => {
      capturedSwipeDeckProps.onEmpty();
    });

    expect(trackSoloDeckEmpty).toHaveBeenCalledWith('food');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('onTap opens card detail', async () => {
    const { getByTestId } = render(<SwipeScreen />);
    await act(flush);

    act(() => {
      capturedSwipeDeckProps.onTap(cards[0]);
    });

    expect(trackCardDetailOpened).toHaveBeenCalledWith('food');
    expect(getByTestId('card-detail')).toBeTruthy();
  });

  it('renders swipe hints', async () => {
    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByText(/Nope/)).toBeTruthy();
    expect(getByText(/Yes!/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 5. Back button
// ---------------------------------------------------------------------------
describe('Back button', () => {
  it('navigates to home when back arrow is pressed', async () => {
    setParams({ topic: 'movie' });
    mockUseCards.mockReturnValue({
      cards: [makeCard()],
      loading: false,
      error: null,
    });

    const { getByText } = render(<SwipeScreen />);

    fireEvent.press(getByText('←'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

// ---------------------------------------------------------------------------
// 6. Food topic specific
// ---------------------------------------------------------------------------
describe('Food topic specific', () => {
  beforeEach(() => {
    setParams({ topic: 'food', pickedLatitude: '37.77', pickedLongitude: '-122.42' });
    mockUseCards.mockReturnValue({
      cards: [makeCard()],
      loading: false,
      error: null,
    });
  });

  it('renders RadiusSelector with radius options', async () => {
    const { getByTestId, getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByTestId('radius-selector')).toBeTruthy();
    expect(getByText('1 mi')).toBeTruthy();
    expect(getByText('5 mi')).toBeTruthy();
    expect(getByText('10 mi')).toBeTruthy();
    expect(getByText('25 mi')).toBeTruthy();
  });

  it('renders "Pick location" link', async () => {
    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByText('Pick location')).toBeTruthy();
  });

  it('"Pick location" navigates to /location-picker with correct params', async () => {
    setParams({
      topic: 'food',
      pickedLatitude: '37.77',
      pickedLongitude: '-122.42',
      openNow: 'true',
      categories: JSON.stringify(['chinese']),
      sortBy: 'distance',
    });

    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    fireEvent.press(getByText('Pick location'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/location-picker',
      params: expect.objectContaining({
        topic: 'food',
        latitude: '37.77',
        longitude: '-122.42',
        openNow: 'true',
        categories: JSON.stringify(['chinese']),
        sortBy: 'distance',
      }),
    });
  });

  it('filter params initialized from route params (openNow, categories, sortBy)', async () => {
    setParams({
      topic: 'food',
      pickedLatitude: '37.77',
      pickedLongitude: '-122.42',
      openNow: 'false',
      categories: JSON.stringify(['italian', 'pizza']),
      sortBy: 'rating',
    });

    render(<SwipeScreen />);
    await act(flush);

    expect(mockUseCards).toHaveBeenCalledWith(
      'food',
      { latitude: 37.77, longitude: -122.42 },
      expect.objectContaining({
        openNow: false,
        categories: ['italian', 'pizza'],
        sortBy: 'rating',
      }),
    );
  });

  it('default radius is 5 when not provided in params', async () => {
    render(<SwipeScreen />);
    await act(flush);

    expect(mockUseCards).toHaveBeenCalledWith(
      'food',
      expect.anything(),
      expect.objectContaining({ radius: 5 }),
    );
  });

  it('radius from route params is used', async () => {
    setParams({
      topic: 'food',
      pickedLatitude: '37.77',
      pickedLongitude: '-122.42',
      radius: '10',
    });

    render(<SwipeScreen />);
    await act(flush);

    expect(mockUseCards).toHaveBeenCalledWith(
      'food',
      expect.anything(),
      expect.objectContaining({ radius: 10 }),
    );
  });

  it('displays header with "Eat?"', async () => {
    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByText('Eat?')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. Movie/show topics
// ---------------------------------------------------------------------------
describe('Movie topic', () => {
  beforeEach(() => {
    setParams({ topic: 'movie' });
    mockUseCards.mockReturnValue({
      cards: [makeCard({ title: 'The Matrix' })],
      loading: false,
      error: null,
    });
  });

  it('does NOT render RadiusSelector', () => {
    const { queryByTestId } = render(<SwipeScreen />);

    expect(queryByTestId('radius-selector')).toBeNull();
  });

  it('does NOT render "Pick location" link', () => {
    const { queryByText } = render(<SwipeScreen />);

    expect(queryByText('Pick location')).toBeNull();
  });

  it('passes genreIds and sortTmdb from route params', () => {
    setParams({
      topic: 'movie',
      genreIds: JSON.stringify([28, 35]),
      sortTmdb: 'rating',
    });

    render(<SwipeScreen />);

    expect(mockUseCards).toHaveBeenCalledWith(
      'movie',
      undefined,
      expect.objectContaining({
        genreIds: [28, 35],
        sortTmdb: 'rating',
      }),
    );
  });

  it('defaults sortTmdb to "popularity" when not provided', () => {
    setParams({ topic: 'movie' });

    render(<SwipeScreen />);

    expect(mockUseCards).toHaveBeenCalledWith(
      'movie',
      undefined,
      expect.objectContaining({
        sortTmdb: 'popularity',
      }),
    );
  });

  it('displays header with "Watch?"', () => {
    const { getByText } = render(<SwipeScreen />);

    expect(getByText('Watch?')).toBeTruthy();
  });
});

describe('Show topic', () => {
  beforeEach(() => {
    setParams({ topic: 'show' });
    mockUseCards.mockReturnValue({
      cards: [makeCard({ title: 'Breaking Bad' })],
      loading: false,
      error: null,
    });
  });

  it('does NOT render RadiusSelector', () => {
    const { queryByTestId } = render(<SwipeScreen />);

    expect(queryByTestId('radius-selector')).toBeNull();
  });

  it('does NOT render "Pick location" link', () => {
    const { queryByText } = render(<SwipeScreen />);

    expect(queryByText('Pick location')).toBeNull();
  });

  it('displays header with "Stream?"', () => {
    const { getByText } = render(<SwipeScreen />);

    expect(getByText('Stream?')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 8. Attribution text
// ---------------------------------------------------------------------------
describe('Attribution text', () => {
  it('shows "Powered by Yelp" for food topic', async () => {
    setParams({ topic: 'food', pickedLatitude: '37.77', pickedLongitude: '-122.42' });
    mockUseCards.mockReturnValue({
      cards: [makeCard()],
      loading: false,
      error: null,
    });

    const { getByText } = render(<SwipeScreen />);
    await act(flush);

    expect(getByText('Powered by Yelp')).toBeTruthy();
  });

  it('shows TMDB attribution for movie topic', () => {
    setParams({ topic: 'movie' });
    mockUseCards.mockReturnValue({
      cards: [makeCard()],
      loading: false,
      error: null,
    });

    const { getByText } = render(<SwipeScreen />);

    expect(
      getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'),
    ).toBeTruthy();
  });

  it('shows TMDB attribution for show topic', () => {
    setParams({ topic: 'show' });
    mockUseCards.mockReturnValue({
      cards: [makeCard()],
      loading: false,
      error: null,
    });

    const { getByText } = render(<SwipeScreen />);

    expect(
      getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 9. Picked location from location-picker (bypasses device location)
// ---------------------------------------------------------------------------
describe('Picked location from location-picker', () => {
  it('uses pickedLatitude/pickedLongitude and skips device location request', async () => {
    setParams({
      topic: 'food',
      pickedLatitude: '40.7128',
      pickedLongitude: '-74.006',
    });
    mockUseCards.mockReturnValue({
      cards: [makeCard()],
      loading: false,
      error: null,
    });

    render(<SwipeScreen />);
    await act(flush);

    // Should NOT have requested device location
    expect(mockRequestPermissions).not.toHaveBeenCalled();

    // useCards should receive parsed picked location
    expect(mockUseCards).toHaveBeenCalledWith(
      'food',
      { latitude: 40.7128, longitude: -74.006 },
      expect.objectContaining({ enabled: true }),
    );
  });
});

// ---------------------------------------------------------------------------
// 10. useCards enabled flag
// ---------------------------------------------------------------------------
describe('useCards enabled flag', () => {
  it('passes enabled:false for food when location is not yet available', () => {
    setParams({ topic: 'food' });
    // Location pending (never resolves)
    mockRequestPermissions.mockReturnValue(new Promise(() => {}));
    mockUseCards.mockReturnValue({ cards: [], loading: true, error: null });

    render(<SwipeScreen />);

    expect(mockUseCards).toHaveBeenCalledWith(
      'food',
      undefined,
      expect.objectContaining({ enabled: false }),
    );
  });

  it('passes enabled:true for movie (no location needed)', () => {
    setParams({ topic: 'movie' });
    mockUseCards.mockReturnValue({ cards: [], loading: true, error: null });

    render(<SwipeScreen />);

    expect(mockUseCards).toHaveBeenCalledWith(
      'movie',
      undefined,
      expect.objectContaining({ enabled: true }),
    );
  });
});

