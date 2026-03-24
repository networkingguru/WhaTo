/**
 * Comprehensive screen-level integration tests for the Home screen (app/index.tsx).
 * Tests all 4 phases: home, choose-mode, enter-name, creating.
 */

// --- Mocks (must be before imports) ---
//
// IMPORTANT: jest.mock() calls are hoisted by babel to the top of the file.
// Any const/let variables referenced inside a factory will be undefined at
// that point (they are in the TDZ).  Two safe patterns:
//   (a) Create jest.fn() *inside* the factory, then retrieve via require().
//   (b) Reference variables only inside lazily-evaluated closures (e.g. useRouter).

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  // Safe: mockPush/mockReplace are accessed when useRouter() is called (at render
  // time), not when the factory runs.
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-device', () => ({ deviceName: null }));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
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

jest.mock('../../src/services/sessionService', () => ({
  createSession: jest.fn().mockResolvedValue('ABCD'),
  generateSessionCode: jest.fn(() => 'ABCD'),
}));

jest.mock('../../src/services/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('test-device-id'),
}));

jest.mock('../../src/providers/movieProvider', () => ({
  movieProvider: { fetchCards: jest.fn().mockResolvedValue([{ id: 1, title: 'Movie 1' }]) },
}));

jest.mock('../../src/providers/showProvider', () => ({
  showProvider: { fetchCards: jest.fn().mockResolvedValue([{ id: 2, title: 'Show 1' }]) },
}));

jest.mock('../../src/providers/restaurantProvider', () => ({
  restaurantProvider: { fetchCards: jest.fn().mockResolvedValue([{ id: 3, title: 'Restaurant 1' }]) },
}));

jest.mock('../../src/components/SearchOptions', () => ({
  SearchOptions: ({ visible }: any) => {
    if (!visible) return null;
    const { View, Text } = require('react-native');
    return <View><Text>SearchOptionsModal</Text></View>;
  },
}));

jest.mock('../../src/components/SupportPanel', () => ({
  SupportPanel: () => null,
}));

jest.mock('../../src/components/FeedbackButton', () => ({
  FeedbackButton: () => null,
}));

jest.mock('../../src/components/FeedbackModal', () => ({
  FeedbackModal: () => null,
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../../app/index';

// --- Retrieve mock references from the already-mocked modules ---

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

const { createSession: mockCreateSession, generateSessionCode: mockGenerateSessionCode } =
  require('../../src/services/sessionService') as {
    createSession: jest.Mock;
    generateSessionCode: jest.Mock;
  };

const Location = require('expo-location') as {
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
};
const mockRequestPermissions = Location.requestForegroundPermissionsAsync;
const mockGetCurrentPosition = Location.getCurrentPositionAsync;

const { movieProvider } = require('../../src/providers/movieProvider') as {
  movieProvider: { fetchCards: jest.Mock };
};
const mockMovieFetchCards = movieProvider.fetchCards;

const { showProvider } = require('../../src/providers/showProvider') as {
  showProvider: { fetchCards: jest.Mock };
};
const mockShowFetchCards = showProvider.fetchCards;

const { restaurantProvider } = require('../../src/providers/restaurantProvider') as {
  restaurantProvider: { fetchCards: jest.Mock };
};
const mockRestaurantFetchCards = restaurantProvider.fetchCards;

// --- Helpers ---

const flush = () => new Promise((r) => setImmediate(r));
const flushAll = async () => {
  for (let i = 0; i < 20; i++) await flush();
};

/**
 * Press a button by text label and wait for the full async handleCreateGroup
 * chain to settle.  Uses waitFor (which internally calls act()) to poll until
 * a sentinel mock has been invoked, signaling the chain completed.
 */
const pressAndWait = async (
  getByText: (text: string) => any,
  label: string,
  sentinel: jest.Mock = mockCreateSession,
) => {
  fireEvent.press(getByText(label));
  await waitFor(() => expect(sentinel).toHaveBeenCalled(), { timeout: 3000 });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockCreateSession.mockResolvedValue('ABCD');
  mockGenerateSessionCode.mockReturnValue('ABCD');
  mockMovieFetchCards.mockResolvedValue([{ id: 1, title: 'Movie 1' }]);
  mockShowFetchCards.mockResolvedValue([{ id: 2, title: 'Show 1' }]);
  mockRestaurantFetchCards.mockResolvedValue([{ id: 3, title: 'Restaurant 1' }]);
  mockRequestPermissions.mockResolvedValue({ status: 'denied' });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// Phase: home
// ---------------------------------------------------------------------------
describe('Phase: home', () => {
  it('renders 3 topic buttons and Join Group', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    expect(getByText('Eat?')).toBeTruthy();
    expect(getByText('Watch?')).toBeTruthy();
    expect(getByText('Stream?')).toBeTruthy();
    expect(getByText('Join Group')).toBeTruthy();
  });

  it('tapping Eat? transitions to choose-mode with food topic', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Eat?'));
    expect(getByText('Decide Together')).toBeTruthy();
    expect(getByText('Decide Solo')).toBeTruthy();
    // Topic name visible in choose-mode header
    expect(getByText('Eat?')).toBeTruthy();
  });

  it('tapping Watch? transitions to choose-mode with movie topic', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Watch?'));
    expect(getByText('Decide Together')).toBeTruthy();
    expect(getByText('Watch?')).toBeTruthy();
  });

  it('tapping Stream? transitions to choose-mode with show topic', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Stream?'));
    expect(getByText('Decide Together')).toBeTruthy();
    expect(getByText('Stream?')).toBeTruthy();
  });

  it('tapping Join Group navigates to /join', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Join Group'));
    expect(mockPush).toHaveBeenCalledWith('/join');
  });
});

// ---------------------------------------------------------------------------
// Phase: choose-mode
// ---------------------------------------------------------------------------
describe('Phase: choose-mode', () => {
  async function goToChooseMode(topic: 'Eat?' | 'Watch?' | 'Stream?') {
    const result = render(<HomeScreen />);
    await act(flush);
    fireEvent.press(result.getByText(topic));
    return result;
  }

  it('shows topic icon and name for food', async () => {
    const { getByText } = await goToChooseMode('Eat?');
    expect(getByText('Eat?')).toBeTruthy();
  });

  it('shows topic icon and name for movie', async () => {
    const { getByText } = await goToChooseMode('Watch?');
    expect(getByText('Watch?')).toBeTruthy();
  });

  it('shows topic icon and name for show', async () => {
    const { getByText } = await goToChooseMode('Stream?');
    expect(getByText('Stream?')).toBeTruthy();
  });

  it('"Decide Together" transitions to enter-name phase', async () => {
    const { getByText } = await goToChooseMode('Eat?');

    fireEvent.press(getByText('Decide Together'));
    expect(getByText('Your display name')).toBeTruthy();
    expect(getByText('Create Group')).toBeTruthy();
  });

  it('"Decide Solo" navigates to /swipe with correct food params', async () => {
    const { getByText } = await goToChooseMode('Eat?');

    fireEvent.press(getByText('Decide Solo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/swipe',
      params: expect.objectContaining({
        topic: 'food',
        openNow: 'true',
        sortBy: 'best_match',
      }),
    });
  });

  it('"Decide Solo" navigates to /swipe with correct movie params', async () => {
    const { getByText } = await goToChooseMode('Watch?');

    fireEvent.press(getByText('Decide Solo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/swipe',
      params: expect.objectContaining({
        topic: 'movie',
        sortTmdb: 'popularity',
      }),
    });
  });

  it('"Decide Solo" navigates to /swipe with correct show params', async () => {
    const { getByText } = await goToChooseMode('Stream?');

    fireEvent.press(getByText('Decide Solo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/swipe',
      params: expect.objectContaining({
        topic: 'show',
        sortTmdb: 'popularity',
      }),
    });
  });

  it('"Options" button opens SearchOptions modal', async () => {
    const { getByText, queryByText } = await goToChooseMode('Eat?');

    expect(queryByText('SearchOptionsModal')).toBeNull();
    fireEvent.press(getByText('Options'));
    expect(getByText('SearchOptionsModal')).toBeTruthy();
  });

  it('Back button returns to home phase', async () => {
    const { getByText, queryByText } = await goToChooseMode('Eat?');

    fireEvent.press(getByText(/Back/));
    await act(flush);

    expect(getByText('Eat?')).toBeTruthy();
    expect(getByText('Watch?')).toBeTruthy();
    expect(getByText('Stream?')).toBeTruthy();
    expect(queryByText('Decide Solo')).toBeNull();
    expect(queryByText('Decide Together')).toBeNull();
  });

  it('"Decide Solo" resets phase back to home after navigation', async () => {
    const { getByText } = await goToChooseMode('Eat?');

    fireEvent.press(getByText('Decide Solo'));

    // resetToHome is called before router.push, so phase should be home
    expect(getByText('Eat?')).toBeTruthy();
    expect(getByText('Watch?')).toBeTruthy();
    expect(getByText('Stream?')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Phase: enter-name
// ---------------------------------------------------------------------------
describe('Phase: enter-name', () => {
  async function goToEnterName(topic: 'Eat?' | 'Watch?' | 'Stream?' = 'Eat?') {
    const result = render(<HomeScreen />);
    await act(flush);
    fireEvent.press(result.getByText(topic));
    fireEvent.press(result.getByText('Decide Together'));
    return result;
  }

  it('shows text input for display name', async () => {
    const { getByPlaceholderText, getByText } = await goToEnterName();

    expect(getByText('Your display name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
  });

  it('"Create Group" with empty name shows alert', async () => {
    const { getByText } = await goToEnterName();

    fireEvent.press(getByText('Create Group'));

    expect(Alert.alert).toHaveBeenCalledWith('Missing info', 'Please enter your name.');
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('"Create Group" with whitespace-only name shows alert', async () => {
    const { getByText, getByPlaceholderText } = await goToEnterName();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), '   ');
    fireEvent.press(getByText('Create Group'));

    expect(Alert.alert).toHaveBeenCalledWith('Missing info', 'Please enter your name.');
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('"Create Group" with valid name calls createSession and navigates to /lobby', async () => {
    const { getByText, getByPlaceholderText } = await goToEnterName();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Alice');
    await pressAndWait(getByText, 'Create Group');

    expect(mockGenerateSessionCode).toHaveBeenCalled();
    expect(mockCreateSession).toHaveBeenCalledWith(
      'ABCD',
      'food',
      'test-device-id',
      'Alice',
      expect.any(Array),
      undefined,
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lobby',
      params: { code: 'ABCD', topic: 'food', isCreator: 'true' },
    });
  });

  it('"Create Group" saves display name to AsyncStorage', async () => {
    const { getByText, getByPlaceholderText } = await goToEnterName();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Bob');
    await pressAndWait(getByText, 'Create Group');

    expect(mockSetItem).toHaveBeenCalledWith('whato_display_name', 'Bob');
  });

  it('"Create Group" trims name to 20 characters', async () => {
    const { getByText, getByPlaceholderText } = await goToEnterName();

    const longName = 'A'.repeat(25);
    fireEvent.changeText(getByPlaceholderText('Enter your name'), longName);

    await pressAndWait(getByText, 'Create Group');

    expect(mockSetItem).toHaveBeenCalledWith('whato_display_name', 'A'.repeat(20));
  });

  it('Back button returns to choose-mode', async () => {
    const { getByText, queryByText } = await goToEnterName();

    fireEvent.press(getByText(/Back/));
    await act(flush);

    expect(getByText('Decide Solo')).toBeTruthy();
    expect(getByText('Decide Together')).toBeTruthy();
    expect(queryByText('Create Group')).toBeNull();
  });

  it('name is pre-filled from AsyncStorage on mount', async () => {
    mockGetItem.mockResolvedValue('StoredUser');

    const result = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(result.getByText('Eat?'));
    fireEvent.press(result.getByText('Decide Together'));

    expect(result.getByDisplayValue('StoredUser')).toBeTruthy();
  });

  it('creates group with movie topic using movieProvider', async () => {
    const result = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(result.getByText('Watch?'));
    fireEvent.press(result.getByText('Decide Together'));
    fireEvent.changeText(result.getByPlaceholderText('Enter your name'), 'Carol');

    await pressAndWait(result.getByText, 'Create Group');

    expect(mockMovieFetchCards).toHaveBeenCalled();
    expect(mockCreateSession).toHaveBeenCalledWith(
      'ABCD',
      'movie',
      'test-device-id',
      'Carol',
      expect.any(Array),
      undefined,
    );
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lobby',
      params: { code: 'ABCD', topic: 'movie', isCreator: 'true' },
    });
  });

  it('creates group with show topic using showProvider', async () => {
    const result = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(result.getByText('Stream?'));
    fireEvent.press(result.getByText('Decide Together'));
    fireEvent.changeText(result.getByPlaceholderText('Enter your name'), 'Dave');

    await pressAndWait(result.getByText, 'Create Group');

    expect(mockShowFetchCards).toHaveBeenCalled();
    expect(mockCreateSession).toHaveBeenCalledWith(
      'ABCD',
      'show',
      'test-device-id',
      'Dave',
      expect.any(Array),
      undefined,
    );
  });

  it('shows error alert when createSession rejects', async () => {
    mockCreateSession.mockRejectedValueOnce(new Error('Network failure'));

    const { getByText, getByPlaceholderText } = await goToEnterName();
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Eve');

    // Error path: createSession rejects, so Alert.alert is the sentinel
    await pressAndWait(getByText, 'Create Group', Alert.alert as unknown as jest.Mock);

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Could not create group: Network failure');
    expect(getByText('Create Group')).toBeTruthy();
  });

  it('shows alert when fetchCards returns empty array', async () => {
    mockRestaurantFetchCards.mockResolvedValueOnce([]);

    const { getByText, getByPlaceholderText } = await goToEnterName();
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Fay');

    // Empty-cards path: Alert.alert is the sentinel (createSession is never called)
    await pressAndWait(getByText, 'Create Group', Alert.alert as unknown as jest.Mock);

    expect(Alert.alert).toHaveBeenCalledWith('No results', 'Could not find any options. Try again later.');
    expect(getByText('Create Group')).toBeTruthy();
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('passes location to createSession for food topic when permission granted', async () => {
    mockRequestPermissions.mockResolvedValueOnce({ status: 'granted' });
    mockGetCurrentPosition.mockResolvedValueOnce({
      coords: { latitude: 37.7749, longitude: -122.4194 },
    });

    const { getByText, getByPlaceholderText } = await goToEnterName();
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Geo');

    await pressAndWait(getByText, 'Create Group');

    expect(mockCreateSession).toHaveBeenCalledWith(
      'ABCD',
      'food',
      'test-device-id',
      'Geo',
      expect.any(Array),
      { latitude: 37.7749, longitude: -122.4194, radiusMiles: 5 },
    );
  });
});

// ---------------------------------------------------------------------------
// Phase: creating
// ---------------------------------------------------------------------------
describe('Phase: creating', () => {
  it('shows loading spinner and "Creating group..." text', async () => {
    // Make fetchCards hang so we stay in creating phase
    let resolveFetch: (val: any[]) => void;
    mockRestaurantFetchCards.mockReturnValueOnce(new Promise((r) => { resolveFetch = r; }));

    const result = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(result.getByText('Eat?'));
    fireEvent.press(result.getByText('Decide Together'));
    fireEvent.changeText(result.getByPlaceholderText('Enter your name'), 'Test');

    // Press and let the async chain run up to the hanging fetchCards promise
    await act(async () => {
      fireEvent.press(result.getByText('Create Group'));
      await flushAll();
    });

    expect(result.getByText('Creating group...')).toBeTruthy();

    // Clean up: resolve the hanging promise
    await act(async () => {
      resolveFetch!([{ id: 1, title: 'R1' }]);
      await flushAll();
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-phase tests
// ---------------------------------------------------------------------------
describe('Cross-phase behavior', () => {
  it('topic selection preserved from choose-mode through enter-name', async () => {
    const { getByText, getByPlaceholderText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Eat?'));
    fireEvent.press(getByText('Decide Together'));
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'CrossTest');

    await pressAndWait(getByText, 'Create Group');

    expect(mockRestaurantFetchCards).toHaveBeenCalled();
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.any(String),
      'food',
      expect.any(String),
      'CrossTest',
      expect.any(Array),
      undefined,
    );
  });

  it('topic selection preserved after back from enter-name to choose-mode', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Watch?'));
    fireEvent.press(getByText('Decide Together'));
    // Back to choose-mode
    fireEvent.press(getByText(/Back/));
    await act(flush);

    // Should still show Watch? topic
    expect(getByText('Watch?')).toBeTruthy();
    expect(getByText('Decide Solo')).toBeTruthy();
  });

  it('back from choose-mode resets topic, then new topic works', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    // Select food, then go back
    fireEvent.press(getByText('Eat?'));
    fireEvent.press(getByText(/Back/));
    await act(flush);

    // Select show
    fireEvent.press(getByText('Stream?'));
    fireEvent.press(getByText('Decide Solo'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/swipe',
      params: expect.objectContaining({ topic: 'show' }),
    });
  });

  it('food filters are passed correctly to solo mode', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Eat?'));
    fireEvent.press(getByText('Decide Solo'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/swipe',
      params: {
        topic: 'food',
        openNow: 'true',
        sortBy: 'best_match',
      },
    });
  });

  it('media filters are passed correctly to solo mode for movie', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Watch?'));
    fireEvent.press(getByText('Decide Solo'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/swipe',
      params: {
        topic: 'movie',
        sortTmdb: 'popularity',
      },
    });
  });

  it('media filters are passed correctly to solo mode for show', async () => {
    const { getByText } = render(<HomeScreen />);
    await act(flush);

    fireEvent.press(getByText('Stream?'));
    fireEvent.press(getByText('Decide Solo'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/swipe',
      params: {
        topic: 'show',
        sortTmdb: 'popularity',
      },
    });
  });

  it('full flow: home -> choose-mode -> enter-name -> creating -> lobby', async () => {
    const result = render(<HomeScreen />);
    await act(flush);

    // Phase: home
    expect(result.getByText('Eat?')).toBeTruthy();

    // Phase: choose-mode
    fireEvent.press(result.getByText('Eat?'));
    expect(result.getByText('Decide Together')).toBeTruthy();

    // Phase: enter-name
    fireEvent.press(result.getByText('Decide Together'));
    expect(result.getByText('Create Group')).toBeTruthy();

    fireEvent.changeText(result.getByPlaceholderText('Enter your name'), 'FullFlow');

    // Phase: creating -> lobby
    await pressAndWait(result.getByText, 'Create Group');

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/lobby',
      params: { code: 'ABCD', topic: 'food', isCreator: 'true' },
    });
  });
});
