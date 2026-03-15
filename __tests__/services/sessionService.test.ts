jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  onValue: jest.fn(),
  update: jest.fn(),
  off: jest.fn(),
}));

jest.mock('../../src/services/firebase', () => ({
  database: {},
}));

import {
  generateSessionCode,
  isSessionExpired,
  computeMatches,
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
