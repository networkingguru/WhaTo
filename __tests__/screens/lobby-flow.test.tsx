/**
 * Screen-level integration tests for the Lobby screen (app/lobby.tsx).
 * Tests creator vs participant views, real-time session updates,
 * navigation, SMS invite, and start/cancel/leave flows.
 */

// --- Mocks (must be before imports) ---

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

const mockListenToSession = jest.fn();
const mockStartSession = jest.fn().mockResolvedValue(undefined);
const mockEndSession = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/services/sessionService', () => ({
  listenToSession: (...args: any[]) => mockListenToSession(...args),
  startSession: (...args: any[]) => mockStartSession(...args),
  endSession: (...args: any[]) => mockEndSession(...args),
}));

const mockIsAvailableAsync = jest.fn().mockResolvedValue(true);
const mockSendSMSAsync = jest.fn().mockResolvedValue({ result: 'sent' });
jest.mock('expo-sms', () => ({
  isAvailableAsync: (...args: any[]) => mockIsAvailableAsync(...args),
  sendSMSAsync: (...args: any[]) => mockSendSMSAsync(...args),
}));

const mockTrackGroupSessionStarted = jest.fn();
jest.mock('../../src/services/analytics', () => ({
  trackGroupSessionStarted: (...args: any[]) => mockTrackGroupSessionStarted(...args),
}));

jest.mock('@react-native-firebase/crashlytics', () => {
  return () => ({ recordError: jest.fn(), log: jest.fn(), setAttribute: jest.fn() });
});

jest.mock('../../src/services/crashlytics', () => ({
  logError: jest.fn(),
}));

jest.mock('phosphor-react-native', () => ({
  Crown: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View testID="crown-icon" {...props} />;
  },
}));

// --- Imports ---

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import LobbyScreen from '../../app/lobby';
import { SessionData } from '../../src/services/sessionService';

// --- Helpers ---

const flush = () => new Promise((r) => setImmediate(r));

/** Capture the listener callback from listenToSession and return a function to emit session updates. */
function setupSessionListener() {
  let callback: ((data: SessionData | null) => void) | null = null;
  const unsubscribe = jest.fn();

  mockListenToSession.mockImplementation((_code: string, cb: (data: SessionData | null) => void) => {
    callback = cb;
    return unsubscribe;
  });

  const emit = (data: SessionData | null) => {
    act(() => {
      callback?.(data);
    });
  };

  return { emit, unsubscribe };
}

function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    topic: 'food' as any,
    status: 'waiting',
    createdBy: 'creator-device',
    createdAt: Date.now(),
    cards: [],
    participants: {
      'creator-device': { name: 'Alice', joinedAt: Date.now() },
    },
    ...overrides,
  };
}

function renderAsCreator(code = 'XYZW') {
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    code,
    topic: 'food',
    isCreator: 'true',
  });
  return render(<LobbyScreen />);
}

function renderAsParticipant(code = 'XYZW') {
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    code,
    topic: '',
    isCreator: 'false',
  });
  return render(<LobbyScreen />);
}

// --- Tests ---

beforeEach(() => {
  jest.clearAllMocks();
  mockListenToSession.mockReturnValue(jest.fn()); // default: return unsubscribe
});

// ---------------------------------------------------------------------------
// 1. Creator view
// ---------------------------------------------------------------------------
describe('Creator view', () => {
  it('shows group code, topic name, Invite via SMS, Start Swiping, and Cancel Group', () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsCreator('ABCD');
    emit(makeSession());

    expect(getByText('Group: ABCD')).toBeTruthy();
    expect(getByText(/Eat\?/)).toBeTruthy();
    expect(getByText('Invite via SMS')).toBeTruthy();
    expect(getByText('Start Swiping')).toBeTruthy();
    expect(getByText('Cancel Group')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Participant view
// ---------------------------------------------------------------------------
describe('Participant view', () => {
  it('shows waiting text and Leave Group, no Start or Invite buttons', () => {
    const { emit } = setupSessionListener();
    const { getByText, queryByText } = renderAsParticipant('ABCD');
    emit(makeSession());

    expect(getByText('Waiting for host to start...')).toBeTruthy();
    expect(getByText('Leave Group')).toBeTruthy();
    expect(queryByText('Start Swiping')).toBeNull();
    expect(queryByText('Invite via SMS')).toBeNull();
    expect(queryByText('Cancel Group')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Participant list with crown icon
// ---------------------------------------------------------------------------
describe('Participant list', () => {
  it('shows participants with names and crown icon for creator', () => {
    const { emit } = setupSessionListener();
    const { getByText, getAllByTestId } = renderAsCreator();

    emit(makeSession({
      participants: {
        'creator-device': { name: 'Alice', joinedAt: 1 },
        'joiner-device': { name: 'Bob', joinedAt: 2 },
      },
    }));

    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(getByText('Participants (2/8)')).toBeTruthy();
    // Crown icon appears for creator only
    const crowns = getAllByTestId('crown-icon');
    expect(crowns).toHaveLength(1);
  });

  it('shows loading indicator when no participants', () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsCreator();
    emit(makeSession({ participants: {} as any }));

    expect(getByText('Participants (0/8)')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4. Start button disabled state
// ---------------------------------------------------------------------------
describe('Start button disabled state', () => {
  it('is disabled when fewer than 2 participants', () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsCreator();

    emit(makeSession({
      participants: {
        'creator-device': { name: 'Alice', joinedAt: 1 },
      },
    }));

    const startButton = getByText('Start Swiping');
    // The parent TouchableOpacity should be disabled — pressing it should not call startSession
    fireEvent.press(startButton);
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('is enabled when 2 or more participants', async () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsCreator();

    emit(makeSession({
      participants: {
        'creator-device': { name: 'Alice', joinedAt: 1 },
        'joiner-device': { name: 'Bob', joinedAt: 2 },
      },
    }));

    await act(async () => {
      fireEvent.press(getByText('Start Swiping'));
    });

    expect(mockStartSession).toHaveBeenCalledWith('XYZW');
  });
});

// ---------------------------------------------------------------------------
// 5. Start session (creator)
// ---------------------------------------------------------------------------
describe('Start session (creator)', () => {
  it('calls startSession, trackGroupSessionStarted, and navigates to /group-swipe', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      code: 'CODE',
      topic: 'movie',
      isCreator: 'true',
    });

    const { emit } = setupSessionListener();
    const { getByText } = render(<LobbyScreen />);

    emit(makeSession({
      topic: 'movie' as any,
      participants: {
        'creator-device': { name: 'Alice', joinedAt: 1 },
        'joiner-device': { name: 'Bob', joinedAt: 2 },
      },
    }));

    await act(async () => {
      fireEvent.press(getByText('Start Swiping'));
    });

    expect(mockStartSession).toHaveBeenCalledWith('CODE');
    expect(mockTrackGroupSessionStarted).toHaveBeenCalledWith('movie', 2);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/group-swipe',
      params: { code: 'CODE' },
    });
  });
});

// ---------------------------------------------------------------------------
// 6. Cancel group (creator)
// ---------------------------------------------------------------------------
describe('Cancel group (creator)', () => {
  it('calls endSession and navigates to /', async () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsCreator('ABCD');
    emit(makeSession());

    await act(async () => {
      fireEvent.press(getByText('Cancel Group'));
    });

    expect(mockEndSession).toHaveBeenCalledWith('ABCD');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

// ---------------------------------------------------------------------------
// 7. Leave group (non-creator)
// ---------------------------------------------------------------------------
describe('Leave group (non-creator)', () => {
  it('navigates to / without calling endSession', async () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsParticipant('ABCD');
    emit(makeSession());

    await act(async () => {
      fireEvent.press(getByText('Leave Group'));
    });

    expect(mockEndSession).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

// ---------------------------------------------------------------------------
// 8. Auto-redirect for joiner when session becomes active
// ---------------------------------------------------------------------------
describe('Auto-redirect for joiner', () => {
  it('navigates to /group-swipe when session status becomes active', () => {
    const { emit } = setupSessionListener();
    renderAsParticipant('LIVE');

    emit(makeSession({ status: 'active' }));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/group-swipe',
      params: { code: 'LIVE' },
    });
  });

  it('does NOT auto-redirect the creator when session becomes active', () => {
    const { emit } = setupSessionListener();
    renderAsCreator('LIVE');

    emit(makeSession({ status: 'active' }));

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 9. Auto-redirect on complete
// ---------------------------------------------------------------------------
describe('Auto-redirect on complete', () => {
  it('navigates to /group-result when session status becomes complete', () => {
    const { emit } = setupSessionListener();
    renderAsParticipant('DONE');

    emit(makeSession({ status: 'complete' }));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/group-result',
      params: { code: 'DONE' },
    });
  });

  it('does NOT auto-redirect the creator on complete', () => {
    const { emit } = setupSessionListener();
    renderAsCreator('DONE');

    emit(makeSession({ status: 'complete' }));

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 10. Topic display from session data
// ---------------------------------------------------------------------------
describe('Topic display', () => {
  it('shows topic from session data for joiners with empty topic param', () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsParticipant('ABCD');

    emit(makeSession({ topic: 'movie' as any }));

    // The subtitle should show the session topic, not the empty param
    expect(getByText(/Watch\?/)).toBeTruthy();
  });

  it('shows topic from params for creator', () => {
    const { emit } = setupSessionListener();
    // Before session data arrives, topic comes from params
    const { getByText } = renderAsCreator('ABCD');

    // Before any session emit, topic from params ('food') is used
    expect(getByText(/Eat\?/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 11. SMS invite
// ---------------------------------------------------------------------------
describe('SMS invite', () => {
  it('calls SMS.sendSMSAsync with deep link when SMS is available', async () => {
    const { emit } = setupSessionListener();
    const { getByText } = renderAsCreator('JOIN');
    emit(makeSession());

    await act(async () => {
      fireEvent.press(getByText('Invite via SMS'));
    });

    expect(mockIsAvailableAsync).toHaveBeenCalled();
    expect(mockSendSMSAsync).toHaveBeenCalledWith(
      [],
      expect.stringContaining('whato://join/JOIN'),
    );
  });

  it('shows alert when SMS is not available', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { emit } = setupSessionListener();
    const { getByText } = renderAsCreator('JOIN');
    emit(makeSession());

    await act(async () => {
      fireEvent.press(getByText('Invite via SMS'));
    });

    expect(mockSendSMSAsync).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('SMS not available', 'SMS is not available on this device.');
    alertSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 12. Listener lifecycle
// ---------------------------------------------------------------------------
describe('Listener lifecycle', () => {
  it('calls listenToSession with the code and returns unsubscribe on unmount', () => {
    const { unsubscribe } = setupSessionListener();
    const { unmount } = renderAsCreator('LIFE');

    expect(mockListenToSession).toHaveBeenCalledWith('LIFE', expect.any(Function));

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('does not listen when code is missing', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      code: '',
      topic: 'food',
      isCreator: 'true',
    });

    render(<LobbyScreen />);
    expect(mockListenToSession).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 13. Joiner does not double-navigate on repeated active emissions
// ---------------------------------------------------------------------------
describe('No double navigation', () => {
  it('only navigates once even if listener fires active status multiple times', () => {
    const { emit } = setupSessionListener();
    renderAsParticipant('MULTI');

    emit(makeSession({ status: 'active' }));
    emit(makeSession({ status: 'active' }));
    emit(makeSession({ status: 'active' }));

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
