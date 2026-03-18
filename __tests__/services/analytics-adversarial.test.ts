/**
 * Adversarial test suite for src/services/analytics.ts
 *
 * Every test asserts the service NEVER throws, regardless of
 * how broken the underlying Firebase module is or how bizarre
 * the caller-supplied arguments are.
 */

/* ---------- configurable mock ---------- */
let mockLogEvent: jest.Mock;
let mockLogScreenView: jest.Mock;
let mockAnalyticsFn: jest.Mock;

jest.mock('@react-native-firebase/analytics', () => {
  mockLogEvent = jest.fn().mockResolvedValue(undefined);
  mockLogScreenView = jest.fn().mockResolvedValue(undefined);
  mockAnalyticsFn = jest.fn(() => ({
    logEvent: mockLogEvent,
    logScreenView: mockLogScreenView,
  }));
  return mockAnalyticsFn;
});

import {
  trackTopicSelected,
  trackSoloSwipeRight,
  trackSoloDeckEmpty,
  trackCardDetailOpened,
  trackGroupSessionCreated,
  trackGroupSessionJoined,
  trackGroupSessionStarted,
  trackGroupMatchFound,
  trackGroupNoMatch,
  trackFeedbackLinkTapped,
  trackScreenView,
} from '../../src/services/analytics';

const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  jest.clearAllMocks();
  // restore happy-path mock implementations
  mockAnalyticsFn.mockImplementation(() => ({
    logEvent: mockLogEvent,
    logScreenView: mockLogScreenView,
  }));
  mockLogEvent.mockResolvedValue(undefined);
  mockLogScreenView.mockResolvedValue(undefined);
});

/* ============================
   1. analytics() itself throws
   ============================ */
describe('analytics() factory throws', () => {
  beforeEach(() => {
    mockAnalyticsFn.mockImplementation(() => {
      throw new Error('native module not linked');
    });
  });

  it('trackTopicSelected does not throw', () => {
    expect(() => trackTopicSelected('food', 'solo')).not.toThrow();
  });

  it('trackScreenView does not throw', () => {
    expect(() => trackScreenView('Home')).not.toThrow();
  });

  it('trackGroupSessionStarted does not throw', () => {
    expect(() => trackGroupSessionStarted('movie', 3)).not.toThrow();
  });
});

/* ===================================
   2. logEvent / logScreenView are undefined
   =================================== */
describe('analytics() returns object with undefined methods', () => {
  beforeEach(() => {
    mockAnalyticsFn.mockImplementation(() => ({
      logEvent: undefined,
      logScreenView: undefined,
    }));
  });

  it('trackTopicSelected does not throw', () => {
    expect(() => trackTopicSelected('food', 'solo')).not.toThrow();
  });

  it('trackScreenView does not throw', () => {
    expect(() => trackScreenView('Home')).not.toThrow();
  });
});

/* ===================================
   3. analytics() returns null
   =================================== */
describe('analytics() returns null', () => {
  beforeEach(() => {
    mockAnalyticsFn.mockReturnValue(null);
  });

  it('trackTopicSelected does not throw', () => {
    expect(() => trackTopicSelected('food', 'solo')).not.toThrow();
  });

  it('trackScreenView does not throw', () => {
    expect(() => trackScreenView('Home')).not.toThrow();
  });
});

/* ===================================
   4. Unexpected topic values
   =================================== */
describe('unexpected topic values', () => {
  it('empty string topic does not throw', async () => {
    expect(() => trackTopicSelected('' as any, 'solo')).not.toThrow();
    await flush();
  });

  it('undefined topic does not throw', async () => {
    expect(() => trackTopicSelected(undefined as any, 'solo')).not.toThrow();
    await flush();
  });

  it('numeric topic does not throw', async () => {
    expect(() => trackSoloSwipeRight(42 as any)).not.toThrow();
    await flush();
  });

  it('null topic does not throw', async () => {
    expect(() => trackGroupSessionCreated(null as any)).not.toThrow();
    await flush();
  });
});

/* ===================================
   5. Unexpected participantCount values
   =================================== */
describe('unexpected participantCount values', () => {
  it('participantCount = 0 does not throw', async () => {
    expect(() => trackGroupSessionStarted('food', 0)).not.toThrow();
    await flush();
    expect(mockLogEvent).toHaveBeenCalledWith('group_session_started', {
      topic: 'food',
      participant_count: 0,
    });
  });

  it('participantCount = -1 does not throw', async () => {
    expect(() => trackGroupSessionStarted('food', -1)).not.toThrow();
    await flush();
  });

  it('participantCount = NaN does not throw', async () => {
    expect(() => trackGroupSessionStarted('food', NaN)).not.toThrow();
    await flush();
  });

  it('participantCount = Infinity does not throw', async () => {
    expect(() => trackGroupSessionStarted('food', Infinity)).not.toThrow();
    await flush();
  });

  it('participantCount = -Infinity does not throw', async () => {
    expect(() => trackGroupSessionStarted('food', -Infinity)).not.toThrow();
    await flush();
  });
});

/* ===================================
   6. Unexpected screenName values
   =================================== */
describe('unexpected screenName values', () => {
  it('empty string does not throw', async () => {
    expect(() => trackScreenView('')).not.toThrow();
    await flush();
  });

  it('very long string (2000 chars) does not throw', async () => {
    const long = 'x'.repeat(2000);
    expect(() => trackScreenView(long)).not.toThrow();
    await flush();
  });

  it('special characters and emoji does not throw', async () => {
    expect(() => trackScreenView('screen/<id>?tab=1&foo=bar\n\t\0')).not.toThrow();
    await flush();
  });

  it('unicode/RTL does not throw', async () => {
    expect(() => trackScreenView('\u202Escreen')).not.toThrow();
    await flush();
  });
});

/* ===================================
   7. Rapid-fire calls
   =================================== */
describe('rapid-fire calls', () => {
  it('50 events in quick succession all fire without throwing', async () => {
    expect(() => {
      for (let i = 0; i < 50; i++) {
        trackTopicSelected('food', 'solo');
        trackScreenView(`screen_${i}`);
        trackGroupSessionStarted('movie', i);
      }
    }).not.toThrow();
    await flush();
    expect(mockLogEvent).toHaveBeenCalledTimes(100); // 50 topic + 50 group
    expect(mockLogScreenView).toHaveBeenCalledTimes(50);
  });
});

/* ===================================
   8. logEvent rejects every time
   =================================== */
describe('logEvent always rejects', () => {
  beforeEach(() => {
    mockLogEvent.mockRejectedValue(new Error('always fails'));
    mockLogScreenView.mockRejectedValue(new Error('always fails'));
  });

  it('all track functions still do not throw', async () => {
    expect(() => {
      trackTopicSelected('food', 'solo');
      trackSoloSwipeRight('movie');
      trackSoloDeckEmpty('show');
      trackCardDetailOpened('food');
      trackGroupSessionCreated('movie');
      trackGroupSessionJoined();
      trackGroupSessionStarted('food', 3);
      trackGroupMatchFound('show');
      trackGroupNoMatch('food');
      trackFeedbackLinkTapped();
      trackScreenView('Home');
    }).not.toThrow();
    await flush();
  });
});

/* ===================================
   9. logEvent throws synchronously
   =================================== */
describe('logEvent throws synchronously', () => {
  beforeEach(() => {
    mockLogEvent.mockImplementation(() => {
      throw new Error('sync boom');
    });
  });

  it('trackTopicSelected does not throw', () => {
    expect(() => trackTopicSelected('food', 'solo')).not.toThrow();
  });

  it('trackGroupSessionStarted does not throw', () => {
    expect(() => trackGroupSessionStarted('movie', 5)).not.toThrow();
  });
});
