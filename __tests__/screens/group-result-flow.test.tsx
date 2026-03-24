/**
 * Tests for the Group Result screen (app/group-result.tsx).
 * Covers loading, match states, no-match fallback, failure mode,
 * navigation, card rendering, and analytics tracking.
 */

// --- Mocks (must precede imports) ---

const mockReplace = jest.fn();
const mockSearchParams = jest.fn(() => ({ code: 'ABCD' } as { code: string; failed?: string }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: (...args: Parameters<typeof mockSearchParams>) => mockSearchParams(...args),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

const mockGetSession = jest.fn();
const mockComputeMatches = jest.fn();

jest.mock('../../src/services/sessionService', () => ({
  getSession: (...args: any[]) => mockGetSession(...args),
  computeMatches: (...args: any[]) => mockComputeMatches(...args),
}));

const mockTrackGroupMatchFound = jest.fn();
const mockTrackGroupNoMatch = jest.fn();

jest.mock('../../src/services/analytics', () => ({
  trackGroupMatchFound: (...args: any[]) => mockTrackGroupMatchFound(...args),
  trackGroupNoMatch: (...args: any[]) => mockTrackGroupNoMatch(...args),
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
import GroupResultScreen from '../../app/group-result';

// --- Helpers ---

const flush = () => new Promise((r) => setImmediate(r));

function makeCard(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    title: `Title ${id}`,
    subtitle: `Subtitle ${id}`,
    imageUrl: `https://img.test/${id}.jpg`,
    rating: 4.5,
    details: [],
    sourceUrl: null,
    meta: {},
    ...overrides,
  };
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    topic: 'food' as const,
    status: 'complete' as const,
    createdBy: 'dev1',
    createdAt: Date.now(),
    cards: [makeCard('c1'), makeCard('c2'), makeCard('c3')],
    participants: {
      dev1: { name: 'Alice', joinedAt: 1, swipes: { c1: true, c2: true, c3: false } },
      dev2: { name: 'Bob', joinedAt: 2, swipes: { c1: true, c2: false, c3: true } },
    },
    ...overrides,
  };
}

// --- Setup ---

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams.mockReturnValue({ code: 'ABCD' });
  mockGetSession.mockResolvedValue(null);
  mockComputeMatches.mockReturnValue({ unanimous: [], majority: [] });
});

// ---------------------------------------------------------------------------
// 1. Loading state
// ---------------------------------------------------------------------------
describe('GroupResultScreen', () => {
  it('shows "Loading results..." when session is null', async () => {
    mockGetSession.mockResolvedValue(null);
    const { getByText } = render(<GroupResultScreen />);
    expect(getByText('Loading results...')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 2. Match success - unanimous
  // -------------------------------------------------------------------------
  it('shows "You matched!" and "Everyone agreed" section for unanimous matches', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: ['c1'], majority: [] });

    const { getByText, queryByText } = render(<GroupResultScreen />);
    await act(flush);

    expect(getByText('You matched!')).toBeTruthy();
    expect(getByText('Everyone agreed')).toBeTruthy();
    expect(getByText('Title c1')).toBeTruthy();
    expect(queryByText('Most people liked')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 3. Match success - majority
  // -------------------------------------------------------------------------
  it('shows "Most people liked" section for majority-only matches', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: [], majority: ['c2'] });

    const { getByText, queryByText } = render(<GroupResultScreen />);
    await act(flush);

    expect(getByText('You matched!')).toBeTruthy();
    expect(getByText('Most people liked')).toBeTruthy();
    expect(getByText('Title c2')).toBeTruthy();
    expect(queryByText('Everyone agreed')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 4. Match success - both unanimous and majority
  // -------------------------------------------------------------------------
  it('shows both "Everyone agreed" and "Most people liked" sections', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: ['c1'], majority: ['c2'] });

    const { getByText } = render(<GroupResultScreen />);
    await act(flush);

    expect(getByText('You matched!')).toBeTruthy();
    expect(getByText('Everyone agreed')).toBeTruthy();
    expect(getByText('Most people liked')).toBeTruthy();
    expect(getByText('Title c1')).toBeTruthy();
    expect(getByText('Title c2')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 5. No matches
  // -------------------------------------------------------------------------
  it('shows "Close enough?" title, "Nobody agreed" text, and "Top voted" section when no matches', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: [], majority: [] });

    const { getByText } = render(<GroupResultScreen />);
    await act(flush);

    expect(getByText('Close enough?')).toBeTruthy();
    expect(getByText(/Nobody agreed/)).toBeTruthy();
    expect(getByText('Top voted')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 6. Match failed (params.failed='true')
  // -------------------------------------------------------------------------
  it('shows "Match Failed" with hint text when failed=true', async () => {
    mockSearchParams.mockReturnValue({ code: 'ABCD', failed: 'true' });
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);

    const { getByText } = render(<GroupResultScreen />);
    await act(flush);

    expect(getByText('Match Failed')).toBeTruthy();
    expect(getByText(/Tip: Try enabling more/)).toBeTruthy();
    expect(getByText(/Someone ran out of options/)).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 7. Start Over button navigates to /
  // -------------------------------------------------------------------------
  it('Start Over button calls router.replace("/")', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: ['c1'], majority: [] });

    const { getByText } = render(<GroupResultScreen />);
    await act(flush);

    fireEvent.press(getByText('Start Over'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('Start Over button works on failed screen too', async () => {
    mockSearchParams.mockReturnValue({ code: 'ABCD', failed: 'true' });
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);

    const { getByText } = render(<GroupResultScreen />);
    await act(flush);

    fireEvent.press(getByText('Start Over'));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  // -------------------------------------------------------------------------
  // 8. ResultCard rendering
  // -------------------------------------------------------------------------
  it('ResultCard shows image, title, subtitle, and rating', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: ['c1'], majority: [] });

    const { getByText, UNSAFE_queryAllByType } = render(<GroupResultScreen />);
    await act(flush);

    expect(getByText('Title c1')).toBeTruthy();
    expect(getByText('Subtitle c1')).toBeTruthy();
    // Rating is rendered as "★ 4.5"
    expect(getByText(/★\s*4\.5/)).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // 9. Analytics
  // -------------------------------------------------------------------------
  it('fires trackGroupMatchFound once on success', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: ['c1'], majority: [] });

    render(<GroupResultScreen />);
    await act(flush);

    expect(mockTrackGroupMatchFound).toHaveBeenCalledTimes(1);
    expect(mockTrackGroupMatchFound).toHaveBeenCalledWith('food');
    expect(mockTrackGroupNoMatch).not.toHaveBeenCalled();
  });

  it('fires trackGroupNoMatch once on no matches', async () => {
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);
    mockComputeMatches.mockReturnValue({ unanimous: [], majority: [] });

    render(<GroupResultScreen />);
    await act(flush);

    expect(mockTrackGroupNoMatch).toHaveBeenCalledTimes(1);
    expect(mockTrackGroupNoMatch).toHaveBeenCalledWith('food');
    expect(mockTrackGroupMatchFound).not.toHaveBeenCalled();
  });

  it('fires trackGroupNoMatch once on failed state', async () => {
    mockSearchParams.mockReturnValue({ code: 'ABCD', failed: 'true' });
    const session = makeSession();
    mockGetSession.mockResolvedValue(session);

    render(<GroupResultScreen />);
    await act(flush);

    expect(mockTrackGroupNoMatch).toHaveBeenCalledTimes(1);
    expect(mockTrackGroupNoMatch).toHaveBeenCalledWith('food');
    expect(mockTrackGroupMatchFound).not.toHaveBeenCalled();
  });
});
