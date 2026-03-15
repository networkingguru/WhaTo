jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  onValue: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../../src/services/firebase', () => ({
  database: {},
}));

import {
  generateSessionCode,
  isSessionExpired,
  computeMatches,
  computeLiveMatches,
  hasHopelessParticipant,
  SessionData,
} from '../../src/services/sessionService';

describe('generateSessionCode', () => {
  it('returns a code in WHATO-XXXX format', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^WHATO-[A-Z0-9]{4}$/);
  });
});

describe('isSessionExpired', () => {
  it('returns false for recent sessions', () => {
    const now = Date.now();
    expect(isSessionExpired(now)).toBe(false);
  });

  it('returns true for sessions older than 24 hours', () => {
    const dayAgo = Date.now() - 25 * 60 * 60 * 1000;
    expect(isSessionExpired(dayAgo)).toBe(true);
  });
});

describe('computeMatches', () => {
  const participants = {
    user1: { name: 'Alice', swipes: { a: true, b: false, c: true } },
    user2: { name: 'Bob', swipes: { a: true, b: true, c: true } },
    user3: { name: 'Carol', swipes: { a: true, b: true, c: false } },
  };

  it('identifies unanimous matches', () => {
    const result = computeMatches(participants);
    expect(result.unanimous).toEqual(['a']);
  });

  it('identifies majority matches', () => {
    const result = computeMatches(participants);
    expect(result.majority).toContain('b');
    expect(result.majority).toContain('c');
  });

  it('returns empty arrays when no matches', () => {
    const noMatch = {
      user1: { name: 'Alice', swipes: { a: true, b: false } },
      user2: { name: 'Bob', swipes: { a: false, b: true } },
    };
    const result = computeMatches(noMatch);
    expect(result.unanimous).toEqual([]);
    expect(result.majority).toEqual([]);
  });
});

function makeSession(participants: SessionData['participants'], cards?: { id: string }[]): SessionData {
  return {
    topic: 'food',
    status: 'active',
    createdBy: 'user1',
    createdAt: Date.now(),
    cards: (cards ?? [{ id: 'a' }, { id: 'b' }, { id: 'c' }]) as any,
    participants,
  };
}

describe('computeLiveMatches', () => {
  it('finds a card both participants have right-swiped', () => {
    const session = makeSession({
      user1: { name: 'Alice', joinedAt: 0, swipes: { a: true, b: false } },
      user2: { name: 'Bob', joinedAt: 0, swipes: { a: true } },
    });
    expect(computeLiveMatches(session)).toEqual(['a']);
  });

  it('returns empty when no overlap yet', () => {
    const session = makeSession({
      user1: { name: 'Alice', joinedAt: 0, swipes: { a: true } },
      user2: { name: 'Bob', joinedAt: 0, swipes: { b: true } },
    });
    expect(computeLiveMatches(session)).toEqual([]);
  });

  it('returns empty when only one person has swiped yes on a card', () => {
    const session = makeSession({
      user1: { name: 'Alice', joinedAt: 0, swipes: { a: true } },
      user2: { name: 'Bob', joinedAt: 0, swipes: { a: false } },
    });
    expect(computeLiveMatches(session)).toEqual([]);
  });

  it('returns multiple matches', () => {
    const session = makeSession({
      user1: { name: 'Alice', joinedAt: 0, swipes: { a: true, b: true } },
      user2: { name: 'Bob', joinedAt: 0, swipes: { a: true, b: true } },
    });
    expect(computeLiveMatches(session).sort()).toEqual(['a', 'b']);
  });
});

describe('hasHopelessParticipant', () => {
  it('returns true when someone swiped all cards with zero yes', () => {
    const session = makeSession({
      user1: { name: 'Alice', joinedAt: 0, swipes: { a: false, b: false, c: false } },
      user2: { name: 'Bob', joinedAt: 0, swipes: { a: true } },
    });
    expect(hasHopelessParticipant(session)).toBe(true);
  });

  it('returns false when everyone has at least one yes', () => {
    const session = makeSession({
      user1: { name: 'Alice', joinedAt: 0, swipes: { a: true, b: false } },
      user2: { name: 'Bob', joinedAt: 0, swipes: { a: false, b: true } },
    });
    expect(hasHopelessParticipant(session)).toBe(false);
  });

  it('returns false when not all cards are swiped yet', () => {
    const session = makeSession({
      user1: { name: 'Alice', joinedAt: 0, swipes: { a: false, b: false } },
      user2: { name: 'Bob', joinedAt: 0, swipes: { a: true } },
    });
    expect(hasHopelessParticipant(session)).toBe(false);
  });
});
