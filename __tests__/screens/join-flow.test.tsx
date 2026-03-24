/**
 * Screen-level integration tests for the Join screen (app/join.tsx).
 * Covers all user interactions: render, inputs, deep-link prefill,
 * validation, success/failure/error flows, loading state, and back nav.
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

jest.mock('../../src/services/sessionService', () => ({
  joinSession: jest.fn(),
}));

jest.mock('../../src/services/deviceId', () => ({
  getDeviceId: jest.fn().mockResolvedValue('test-device-id'),
}));

jest.mock('../../src/services/analytics', () => ({
  trackGroupSessionJoined: jest.fn(),
}));

jest.mock('../../src/services/crashlytics', () => ({
  logError: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import JoinScreen from '../../app/join';
import { useLocalSearchParams } from 'expo-router';
import { joinSession } from '../../src/services/sessionService';
import { getDeviceId } from '../../src/services/deviceId';
import { trackGroupSessionJoined } from '../../src/services/analytics';
import { logError } from '../../src/services/crashlytics';

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// 1. Initial render
// ---------------------------------------------------------------------------
describe('Initial render', () => {
  it('shows "Join Group" title, code input, name input, and Join button', async () => {
    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    expect(getByText('Join Group')).toBeTruthy();
    expect(getByPlaceholderText('ABCD')).toBeTruthy();
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    expect(getByText('Join')).toBeTruthy();
  });

  it('shows back button', async () => {
    const { getByText } = render(<JoinScreen />);
    await act(flush);

    expect(getByText(/Back/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. Code input properties
// ---------------------------------------------------------------------------
describe('Code input', () => {
  it('has maxLength=4 and autoCapitalize=characters', async () => {
    const { getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    const codeInput = getByPlaceholderText('ABCD');
    expect(codeInput.props.maxLength).toBe(4);
    expect(codeInput.props.autoCapitalize).toBe('characters');
  });
});

// ---------------------------------------------------------------------------
// 3. Name input properties
// ---------------------------------------------------------------------------
describe('Name input', () => {
  it('has maxLength=20', async () => {
    const { getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    const nameInput = getByPlaceholderText('Enter your name');
    expect(nameInput.props.maxLength).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// 4. Pre-filled code from deep link
// ---------------------------------------------------------------------------
describe('Pre-filled code from deep link', () => {
  it('populates code input when params.code is provided', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ code: 'WXYZ' });

    const { getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    const codeInput = getByPlaceholderText('ABCD');
    expect(codeInput.props.value).toBe('WXYZ');
  });
});

// ---------------------------------------------------------------------------
// 5. Empty fields validation
// ---------------------------------------------------------------------------
describe('Empty fields validation', () => {
  it('shows "Missing info" alert when both fields are empty', async () => {
    const { getByText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.press(getByText('Join'));
    await act(flush);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing info',
      'Please enter the group code and your name.',
    );
  });

  it('shows "Missing info" alert when code is empty but name is filled', async () => {
    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Alice');
    fireEvent.press(getByText('Join'));
    await act(flush);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing info',
      'Please enter the group code and your name.',
    );
  });

  it('shows "Missing info" alert when name is empty but code is filled', async () => {
    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), 'ABCD');
    fireEvent.press(getByText('Join'));
    await act(flush);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing info',
      'Please enter the group code and your name.',
    );
  });

  it('shows "Missing info" alert when fields contain only whitespace', async () => {
    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), '   ');
    fireEvent.changeText(getByPlaceholderText('Enter your name'), '  ');
    fireEvent.press(getByText('Join'));
    await act(flush);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Missing info',
      'Please enter the group code and your name.',
    );
    // Should NOT call joinSession
    expect(joinSession).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Successful join
// ---------------------------------------------------------------------------
describe('Successful join', () => {
  it('calls joinSession with uppercased+trimmed code, deviceId, trimmed+sliced name and navigates to /lobby', async () => {
    (joinSession as jest.Mock).mockResolvedValue({ success: true });

    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), ' abcd ');
    fireEvent.changeText(getByPlaceholderText('Enter your name'), '  Alice  ');

    await act(async () => {
      fireEvent.press(getByText('Join'));
      await flush();
    });

    expect(getDeviceId).toHaveBeenCalled();
    expect(joinSession).toHaveBeenCalledWith('ABCD', 'test-device-id', 'Alice');
    expect(trackGroupSessionJoined).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/lobby',
      params: { code: 'ABCD', topic: '', isCreator: 'false' },
    });
  });

  it('slices name to 20 chars', async () => {
    (joinSession as jest.Mock).mockResolvedValue({ success: true });

    const longName = 'A'.repeat(30);

    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), 'WXYZ');
    fireEvent.changeText(getByPlaceholderText('Enter your name'), longName);

    await act(async () => {
      fireEvent.press(getByText('Join'));
      await flush();
    });

    // name.trim().slice(0, 20)
    expect(joinSession).toHaveBeenCalledWith(
      'WXYZ',
      'test-device-id',
      'A'.repeat(20),
    );
  });
});

// ---------------------------------------------------------------------------
// 7. Failed join (service returns error)
// ---------------------------------------------------------------------------
describe('Failed join', () => {
  it('shows alert with error from joinSession when success is false', async () => {
    (joinSession as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Session not found',
    });

    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), 'XXXX');
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Bob');

    await act(async () => {
      fireEvent.press(getByText('Join'));
      await flush();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Could not join', 'Session not found');
    expect(mockReplace).not.toHaveBeenCalled();
    expect(trackGroupSessionJoined).not.toHaveBeenCalled();
  });

  it('shows "Unknown error" when error field is missing', async () => {
    (joinSession as jest.Mock).mockResolvedValue({ success: false });

    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), 'XXXX');
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Bob');

    await act(async () => {
      fireEvent.press(getByText('Join'));
      await flush();
    });

    expect(Alert.alert).toHaveBeenCalledWith('Could not join', 'Unknown error');
  });
});

// ---------------------------------------------------------------------------
// 8. Network error
// ---------------------------------------------------------------------------
describe('Network error', () => {
  it('shows "Couldn\'t connect" alert and logs error via crashlytics', async () => {
    const networkError = new Error('Network request failed');
    (joinSession as jest.Mock).mockRejectedValue(networkError);

    const { getByText, getByPlaceholderText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), 'XXXX');
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Charlie');

    await act(async () => {
      fireEvent.press(getByText('Join'));
      await flush();
    });

    expect(logError).toHaveBeenCalledWith(networkError, 'join_session');
    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      "Couldn't connect — try again in a moment.",
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 9. Loading state
// ---------------------------------------------------------------------------
describe('Loading state', () => {
  it('shows ActivityIndicator and disables button while joining', async () => {
    let resolveJoin!: (v: any) => void;
    (joinSession as jest.Mock).mockImplementation(
      () => new Promise((r) => { resolveJoin = r; }),
    );

    const { getByText, getByPlaceholderText, queryByText, UNSAFE_getByType } = render(
      <JoinScreen />,
    );
    await act(flush);

    fireEvent.changeText(getByPlaceholderText('ABCD'), 'ABCD');
    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'Dana');

    // Press join - starts loading
    await act(async () => {
      fireEvent.press(getByText('Join'));
    });

    // "Join" text should be gone, replaced by ActivityIndicator
    expect(queryByText('Join')).toBeNull();

    // Resolve the promise to finish
    await act(async () => {
      resolveJoin({ success: true });
      await flush();
    });
  });
});

// ---------------------------------------------------------------------------
// 10. Back button
// ---------------------------------------------------------------------------
describe('Back button', () => {
  it('navigates to / when back is pressed', async () => {
    const { getByText } = render(<JoinScreen />);
    await act(flush);

    fireEvent.press(getByText(/Back/));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
