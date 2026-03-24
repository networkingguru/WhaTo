/**
 * Screen-level integration tests for GroupSwipeScreen (app/group-swipe.tsx).
 *
 * Covers: loading state, session loaded UI, creator vs non-creator buttons,
 * round display, match banner, swipe recording, deck exhaustion, hopeless
 * participant detection, external session end, round change, end session
 * confirmation, and presence setup.
 */

// --- Mocks (must be before imports) ---

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: jest.fn(() => ({ code: 'XYZW' })),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('@react-native-firebase/crashlytics', () => {
  return () => ({ recordError: jest.fn(), log: jest.fn(), setAttribute: jest.fn() });
});

jest.mock('@react-native-firebase/analytics', () => {
  return () => ({ logEvent: jest.fn(), logScreenView: jest.fn() });
});

jest.mock('phosphor-react-native', () => ({
  ForkKnife: 'ForkKnife',
  FilmSlate: 'FilmSlate',
  Television: 'Television',
}));

// ---- sessionService mock ----
const mockListenToSession = jest.fn();
const mockRecordSwipe = jest.fn().mockResolvedValue(undefined);
const mockEndSession = jest.fn().mockResolvedValue(undefined);
const mockMarkCompleted = jest.fn().mockResolvedValue(undefined);
const mockSetPresence = jest.fn().mockResolvedValue(jest.fn());
const mockComputeLiveMatches = jest.fn().mockReturnValue([]);
const mockHasHopelessParticipant = jest.fn().mockReturnValue(false);
const mockStartNextRound = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/services/sessionService', () => ({
  listenToSession: (...args: any[]) => mockListenToSession(...args),
  recordSwipe: (...args: any[]) => mockRecordSwipe(...args),
  endSession: (...args: any[]) => mockEndSession(...args),
  markCompleted: (...args: any[]) => mockMarkCompleted(...args),
  setPresence: (...args: any[]) => mockSetPresence(...args),
  computeLiveMatches: (...args: any[]) => mockComputeLiveMatches(...args),
  hasHopelessParticipant: (...args: any[]) => mockHasHopelessParticipant(...args),
  startNextRound: (...args: any[]) => mockStartNextRound(...args),
}));

jest.mock('../../src/services/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-123'),
}));

// ---- Component mocks ----
let capturedSwipeDeckProps: any = null;
jest.mock('../../src/components/SwipeDeck', () => ({
  SwipeDeck: (props: any) => {
    capturedSwipeDeckProps = props;
    const { View, Text } = require('react-native');
    return (
      <View testID="swipe-deck">
        <Text>{`cards:${props.cards?.length ?? 0}`}</Text>
      </View>
    );
  },
}));

jest.mock('../../src/components/ParticipantBar', () => ({
  ParticipantBar: (props: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="participant-bar">
        <Text>{`self:${props.selfDeviceId}`}</Text>
      </View>
    );
  },
}));

jest.mock('../../src/components/LegendToast', () => ({
  LegendToast: (props: any) => {
    const { View } = require('react-native');
    return <View testID="legend-toast" />;
  },
}));

jest.mock('../../src/components/CardDetail', () => ({
  CardDetail: () => null,
}));

// --- Imports ---
import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import GroupSwipeScreen from '../../app/group-swipe';
import { useLocalSearchParams } from 'expo-router';
import type { SessionData } from '../../src/services/sessionService';
import type { CardItem } from '../../src/providers/types';

// --- Helpers ---

jest.useFakeTimers();

const flush = () => act(async () => { jest.runAllTicks(); });

const makeCard = (id: string): CardItem => ({
  id,
  title: `Card ${id}`,
  subtitle: 'Test subtitle',
  imageUrl: 'https://example.com/img.jpg',
  rating: 4.5,
  details: [],
  sourceUrl: null,
  meta: {},
});

const makeSession = (overrides: Partial<SessionData> = {}): SessionData => ({
  topic: 'food',
  status: 'active',
  createdBy: 'device-123',
  createdAt: Date.now(),
  cards: [makeCard('c1'), makeCard('c2'), makeCard('c3')],
  participants: {
    'device-123': { name: 'Alice', joinedAt: Date.now() },
    'device-456': { name: 'Bob', joinedAt: Date.now() },
  },
  ...overrides,
});

/** Simulates listenToSession by capturing the callback and returning an unsubscribe fn. */
let sessionCallback: ((data: SessionData | null) => void) | null = null;
const mockUnsub = jest.fn();

function setupListener() {
  mockListenToSession.mockImplementation((_code: string, cb: (data: SessionData | null) => void) => {
    sessionCallback = cb;
    return mockUnsub;
  });
}

/** Emit a session update through the listener. */
function emitSession(data: SessionData | null) {
  act(() => {
    sessionCallback?.(data);
  });
}

// --- Setup & Teardown ---

beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  capturedSwipeDeckProps = null;
  sessionCallback = null;
  (useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'XYZW' });
  setupListener();
  mockComputeLiveMatches.mockReturnValue([]);
  mockHasHopelessParticipant.mockReturnValue(false);
  mockEndSession.mockResolvedValue(undefined);
  mockRecordSwipe.mockResolvedValue(undefined);
  mockMarkCompleted.mockResolvedValue(undefined);
  mockSetPresence.mockResolvedValue(jest.fn());
  jest.spyOn(Alert, 'alert');
});

afterEach(() => {
  jest.restoreAllMocks();
});

// --- Tests ---

describe('GroupSwipeScreen', () => {
  // 1. Loading state
  describe('Loading state', () => {
    it('shows loading indicator when session is null', async () => {
      const { getByText } = render(<GroupSwipeScreen />);
      await flush();

      expect(getByText('Loading group...')).toBeTruthy();
    });

    it('shows loading indicator when session exists but cards are empty', async () => {
      const { getByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ cards: [] }));

      expect(getByText('Loading group...')).toBeTruthy();
    });
  });

  // 2. Session loaded
  describe('Session loaded UI', () => {
    it('shows topic name, group code, instruction, SwipeDeck, ParticipantBar, and hints', async () => {
      const { getByText, getByTestId } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession());

      // Topic display name
      expect(getByText('Eat?')).toBeTruthy();
      // Group code
      expect(getByText('XYZW')).toBeTruthy();
      // Default round 1 instruction
      expect(getByText(/Select as many options as you like/)).toBeTruthy();
      // SwipeDeck rendered with cards
      expect(getByTestId('swipe-deck')).toBeTruthy();
      expect(getByText('cards:3')).toBeTruthy();
      // ParticipantBar
      expect(getByTestId('participant-bar')).toBeTruthy();
      expect(getByText('self:device-123')).toBeTruthy();
      // Hints
      expect(getByText(/Nope/)).toBeTruthy();
      expect(getByText(/Yes!/)).toBeTruthy();
      // LegendToast
      expect(getByTestId('legend-toast')).toBeTruthy();
    });

    it('shows movie attribution for movie topic', async () => {
      const { getByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ topic: 'movie' }));

      expect(getByText(/TMDB/)).toBeTruthy();
    });

    it('shows Yelp attribution for food topic', async () => {
      const { getByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ topic: 'food' }));

      expect(getByText(/Yelp/)).toBeTruthy();
    });
  });

  // 3. Creator view
  describe('Creator view', () => {
    it('shows "End" button when current device is creator', async () => {
      const { getByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ createdBy: 'device-123' }));

      expect(getByText('End')).toBeTruthy();
    });
  });

  // 4. Non-creator view
  describe('Non-creator view', () => {
    it('shows "Leave" button when current device is NOT creator', async () => {
      const { getByText, queryByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ createdBy: 'other-device' }));

      expect(getByText('Leave')).toBeTruthy();
      expect(queryByText('End')).toBeNull();
    });

    it('Leave button navigates to /', async () => {
      const { getByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ createdBy: 'other-device' }));

      fireEvent.press(getByText('Leave'));

      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  // 5. Round display
  describe('Round display', () => {
    it('shows "Round N - Narrow it down!" for round > 1', async () => {
      const { getByText, queryByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ round: 2 }));

      expect(getByText(/Round 2/)).toBeTruthy();
      expect(getByText(/Narrow it down/)).toBeTruthy();
      expect(queryByText(/Select as many options/)).toBeNull();
    });

    it('shows default instruction for round 1', async () => {
      const { getByText, queryByText } = render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ round: 1 }));

      expect(getByText(/Select as many options as you like/)).toBeTruthy();
      expect(queryByText(/Narrow it down/)).toBeNull();
    });
  });

  // 6. Match banner
  describe('Match banner', () => {
    it('shows "Match found! Wrapping up..." when live matches detected', async () => {
      const { getByText, queryByText } = render(<GroupSwipeScreen />);
      await flush();

      // First emit: no matches yet
      emitSession(makeSession());
      expect(queryByText('Match found! Wrapping up...')).toBeNull();

      // Now matches appear
      mockComputeLiveMatches.mockReturnValue(['c1']);
      emitSession(makeSession());

      expect(getByText('Match found! Wrapping up...')).toBeTruthy();
    });
  });

  // 7. Swipe recording
  describe('Swipe recording', () => {
    it('onSwipeRight calls recordSwipe with liked=true', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession());

      expect(capturedSwipeDeckProps).not.toBeNull();
      const card = makeCard('c1');

      await act(async () => {
        await capturedSwipeDeckProps.onSwipeRight(card);
      });

      expect(mockRecordSwipe).toHaveBeenCalledWith('XYZW', 'device-123', 'c1', true);
    });

    it('onSwipeLeft calls recordSwipe with liked=false', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession());

      const card = makeCard('c2');

      await act(async () => {
        await capturedSwipeDeckProps.onSwipeLeft(card);
      });

      expect(mockRecordSwipe).toHaveBeenCalledWith('XYZW', 'device-123', 'c2', false);
    });
  });

  // 8. Deck exhaustion
  describe('Deck exhaustion', () => {
    it('onEmpty calls markCompleted with code and deviceId', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession());

      await act(async () => {
        await capturedSwipeDeckProps.onEmpty();
      });

      expect(mockMarkCompleted).toHaveBeenCalledWith('XYZW', 'device-123');
    });

    it('onEmpty resolves match immediately if matchBanner is showing', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      // Emit session with live matches to trigger banner
      mockComputeLiveMatches.mockReturnValue(['c1']);
      emitSession(makeSession());

      // Now exhaust the deck -- should resolve match immediately
      await act(async () => {
        await capturedSwipeDeckProps.onEmpty();
      });

      // Single match -> endSession called
      expect(mockEndSession).toHaveBeenCalledWith('XYZW');
    });
  });

  // 9. Hopeless participant detection
  describe('Hopeless participant detection', () => {
    it('navigates to /group-result?failed=true when hasHopelessParticipant returns true', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      mockHasHopelessParticipant.mockReturnValue(true);
      emitSession(makeSession());

      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/group-result',
        params: { code: 'XYZW', failed: 'true' },
      });
    });
  });

  // 10. Session ended externally
  describe('Session ended externally', () => {
    it('navigates to /group-result when listener fires status=complete', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      // First emit active session so we get past loading
      emitSession(makeSession({ status: 'active' }));

      // Now emit complete
      emitSession(makeSession({ status: 'complete' }));

      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/group-result',
        params: { code: 'XYZW' },
      });
    });
  });

  // 11. Round change
  describe('Round change', () => {
    it('updates cards and resets matchBanner when session.round changes', async () => {
      const { queryByText, getByText } = render(<GroupSwipeScreen />);
      await flush();

      // Round 1: trigger match banner
      mockComputeLiveMatches.mockReturnValue(['c1']);
      emitSession(makeSession({ round: 1 }));
      expect(getByText('Match found! Wrapping up...')).toBeTruthy();

      // Round 2: new cards, banner should reset
      mockComputeLiveMatches.mockReturnValue([]);
      const round2Cards = [makeCard('c1'), makeCard('c4')];
      emitSession(makeSession({ round: 2, cards: round2Cards }));

      expect(queryByText('Match found! Wrapping up...')).toBeNull();
      expect(getByText('cards:2')).toBeTruthy();
      expect(getByText(/Round 2/)).toBeTruthy();
    });
  });

  // 12. End session confirmation
  describe('End session confirmation', () => {
    it('creator taps End, sees alert, confirms -> endSession called', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession({ createdBy: 'device-123' }));

      const { getByText } = render(<GroupSwipeScreen />);
      await flush();
      emitSession(makeSession({ createdBy: 'device-123' }));

      // Re-render with fresh tree to get button reference
      const alertSpy = jest.spyOn(Alert, 'alert');
      const endButton = getByText('End');
      fireEvent.press(endButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'End Group?',
        'This will end the group for everyone and show results.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'End Group', style: 'destructive' }),
        ]),
      );

      // Simulate pressing the destructive button
      const alertButtons = alertSpy.mock.calls[0][2] as any[];
      const endGroupButton = alertButtons.find((b: any) => b.text === 'End Group');

      await act(async () => {
        await endGroupButton.onPress();
      });

      expect(mockEndSession).toHaveBeenCalledWith('XYZW');
    });
  });

  // 13. Presence setup
  describe('Presence setup', () => {
    it('calls setPresence with code and deviceId on mount', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      expect(mockSetPresence).toHaveBeenCalledWith('XYZW', 'device-123');
    });
  });

  // Grace period timer
  describe('Grace period timer', () => {
    it('resolves match after 30s grace period', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession());

      // Trigger live matches -> starts grace timer
      mockComputeLiveMatches.mockReturnValue(['c1']);
      emitSession(makeSession());

      // Advance timer by 30s
      act(() => {
        jest.advanceTimersByTime(30_000);
      });

      // Single match -> endSession should be called
      expect(mockEndSession).toHaveBeenCalledWith('XYZW');
    });

    it('starts next round when multiple matches after grace period', async () => {
      render(<GroupSwipeScreen />);
      await flush();

      emitSession(makeSession());

      // Multiple live matches -> should start next round
      mockComputeLiveMatches.mockReturnValue(['c1', 'c2']);
      emitSession(makeSession());

      act(() => {
        jest.advanceTimersByTime(30_000);
      });

      expect(mockStartNextRound).toHaveBeenCalledWith(
        'XYZW',
        expect.arrayContaining([
          expect.objectContaining({ id: 'c1' }),
          expect.objectContaining({ id: 'c2' }),
        ]),
      );
    });
  });

  // Cleanup
  describe('Cleanup', () => {
    it('calls unsubscribe from listenToSession on unmount', async () => {
      const { unmount } = render(<GroupSwipeScreen />);
      await flush();

      unmount();

      expect(mockUnsub).toHaveBeenCalled();
    });
  });
});
