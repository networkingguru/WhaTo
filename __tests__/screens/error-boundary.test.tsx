/**
 * Tests for Error Boundary and screen tracking in app/_layout.tsx.
 * Covers error catching, recovery, and screen tracking.
 *
 * Note: Deep link handling was removed from _layout.tsx, so those tests
 * are not included. If deep linking is re-added, tests should be added here.
 */

// --- Mocks (must precede imports) ---

const mockPathname = jest.fn(() => '/');

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname(),
  Stack: ({ children }: any) => children ?? null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

const mockTrackScreenView = jest.fn();

jest.mock('../../src/services/analytics', () => ({
  trackScreenView: (...args: any[]) => mockTrackScreenView(...args),
}));

const mockLogError = jest.fn();

jest.mock('../../src/services/crashlytics', () => ({
  logError: (...args: any[]) => mockLogError(...args),
}));

jest.mock('@react-native-firebase/analytics', () => {
  return () => ({ logEvent: jest.fn().mockResolvedValue(undefined), logScreenView: jest.fn() });
});

jest.mock('@react-native-firebase/crashlytics', () => {
  return () => ({ recordError: jest.fn(), log: jest.fn(), setAttribute: jest.fn() });
});

// --- Imports ---

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import RootLayout from '../../app/_layout';

// --- Helpers ---

const flush = () => new Promise((r) => setImmediate(r));

// --- Setup ---

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname.mockReturnValue('/');
  // Suppress console.error from error boundary
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore?.();
});

// ---------------------------------------------------------------------------
// 1. Error boundary catches error
// ---------------------------------------------------------------------------
describe('AppErrorBoundary', () => {
  it('shows "Something went wrong." when a child throws', async () => {
    // Make Stack throw an error
    const expoRouter = require('expo-router');
    const originalStack = expoRouter.Stack;
    expoRouter.Stack = () => {
      throw new Error('Boom');
    };

    const { getByText } = render(<RootLayout />);
    await act(flush);

    expect(getByText('Something went wrong.')).toBeTruthy();
    expect(mockLogError).toHaveBeenCalledWith(expect.any(Error), 'AppErrorBoundary');

    // Restore
    expoRouter.Stack = originalStack;
  });

  // -------------------------------------------------------------------------
  // 2. Try Again resets error state and re-renders children
  // -------------------------------------------------------------------------
  it('Try Again button resets error state and re-renders children', async () => {
    const expoRouter = require('expo-router');
    const originalStack = expoRouter.Stack;

    let shouldThrow = true;
    expoRouter.Stack = () => {
      if (shouldThrow) throw new Error('Boom');
      return null;
    };

    const { getByText, queryByText } = render(<RootLayout />);
    await act(flush);

    expect(getByText('Something went wrong.')).toBeTruthy();

    // Now make it stop throwing, then press Try Again
    shouldThrow = false;
    fireEvent.press(getByText('Try Again'));
    await act(flush);

    // Error message should be gone (children re-rendered successfully)
    expect(queryByText('Something went wrong.')).toBeNull();

    // Restore
    expoRouter.Stack = originalStack;
  });

  it('logError is called with the thrown error', async () => {
    const expoRouter = require('expo-router');
    const originalStack = expoRouter.Stack;
    const testError = new Error('Specific error');
    expoRouter.Stack = () => {
      throw testError;
    };

    render(<RootLayout />);
    await act(flush);

    expect(mockLogError).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalledWith(testError, 'AppErrorBoundary');

    expoRouter.Stack = originalStack;
  });
});

// ---------------------------------------------------------------------------
// 3. Screen tracking
// ---------------------------------------------------------------------------
describe('ScreenTracker', () => {
  it('calls trackScreenView with the current pathname on mount', async () => {
    mockPathname.mockReturnValue('/home');

    render(<RootLayout />);
    await act(flush);

    expect(mockTrackScreenView).toHaveBeenCalledWith('/home');
  });

  it('calls trackScreenView again when pathname changes', async () => {
    mockPathname.mockReturnValue('/home');

    const { rerender } = render(<RootLayout />);
    await act(flush);

    expect(mockTrackScreenView).toHaveBeenCalledWith('/home');
    mockTrackScreenView.mockClear();

    // Simulate pathname change
    mockPathname.mockReturnValue('/swipe');
    rerender(<RootLayout />);
    await act(flush);

    expect(mockTrackScreenView).toHaveBeenCalledWith('/swipe');
  });

  it('does not fire duplicate trackScreenView for the same pathname', async () => {
    mockPathname.mockReturnValue('/lobby');

    const { rerender } = render(<RootLayout />);
    await act(flush);

    expect(mockTrackScreenView).toHaveBeenCalledTimes(1);

    // Re-render with same pathname
    rerender(<RootLayout />);
    await act(flush);

    // useEffect dependency [pathname] hasn't changed, so no extra call
    expect(mockTrackScreenView).toHaveBeenCalledTimes(1);
  });
});
