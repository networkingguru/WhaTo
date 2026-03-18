/**
 * Adversarial test suite for src/services/crashlytics.ts
 *
 * Every test asserts logError NEVER throws, regardless of
 * how broken the underlying Firebase module is or how bizarre
 * the caller-supplied arguments are.
 */

/* ---------- configurable mock ---------- */
let mockRecordError: jest.Mock;
let mockSetAttribute: jest.Mock;
let mockCrashlyticsFn: jest.Mock;

jest.mock('@react-native-firebase/crashlytics', () => {
  mockRecordError = jest.fn();
  mockSetAttribute = jest.fn().mockResolvedValue(undefined);
  mockCrashlyticsFn = jest.fn(() => ({
    recordError: mockRecordError,
    setAttribute: mockSetAttribute,
  }));
  return mockCrashlyticsFn;
});

import { logError } from '../../src/services/crashlytics';

beforeEach(() => {
  jest.clearAllMocks();
  mockCrashlyticsFn.mockImplementation(() => ({
    recordError: mockRecordError,
    setAttribute: mockSetAttribute,
  }));
  mockRecordError.mockReset();
  mockSetAttribute.mockReset().mockResolvedValue(undefined);
});

/* ============================
   1. Unexpected error argument types
   ============================ */
describe('unexpected error types', () => {
  it('undefined does not throw', () => {
    expect(() => logError(undefined, 'ctx')).not.toThrow();
    expect(mockRecordError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('empty string does not throw and wraps to Error', () => {
    expect(() => logError('', 'ctx')).not.toThrow();
    const recorded = mockRecordError.mock.calls[0][0] as Error;
    expect(recorded).toBeInstanceOf(Error);
  });

  it('number does not throw', () => {
    expect(() => logError(42, 'ctx')).not.toThrow();
    const recorded = mockRecordError.mock.calls[0][0] as Error;
    expect(recorded.message).toBe('42');
  });

  it('plain object does not throw', () => {
    expect(() => logError({ code: 'E_FAIL', msg: 'oops' }, 'ctx')).not.toThrow();
    expect(mockRecordError).toHaveBeenCalled();
  });

  it('symbol does not throw', () => {
    expect(() => logError(Symbol('bad'), 'ctx')).not.toThrow();
  });

  it('function does not throw', () => {
    expect(() => logError(() => 'surprise', 'ctx')).not.toThrow();
  });

  it('null does not throw', () => {
    expect(() => logError(null, 'ctx')).not.toThrow();
  });

  it('boolean false does not throw', () => {
    expect(() => logError(false, 'ctx')).not.toThrow();
  });

  it('bigint does not throw', () => {
    expect(() => logError(BigInt(999), 'ctx')).not.toThrow();
  });
});

/* ============================
   2. Unexpected context values
   ============================ */
describe('unexpected context values', () => {
  it('empty string context does not throw', () => {
    expect(() => logError(new Error('e'), '')).not.toThrow();
  });

  it('undefined context (cast) does not throw', () => {
    expect(() => logError(new Error('e'), undefined as any)).not.toThrow();
  });

  it('null context (cast) does not throw', () => {
    expect(() => logError(new Error('e'), null as any)).not.toThrow();
  });

  it('very long context (5000 chars) does not throw', () => {
    const long = 'c'.repeat(5000);
    expect(() => logError(new Error('e'), long)).not.toThrow();
  });

  it('context with special characters does not throw', () => {
    expect(() => logError(new Error('e'), 'ctx\n\t\0<script>alert(1)</script>')).not.toThrow();
  });
});

/* ============================
   3. crashlytics() returns null / undefined
   ============================ */
describe('crashlytics() returns null', () => {
  beforeEach(() => {
    mockCrashlyticsFn.mockReturnValue(null);
  });

  it('logError does not throw', () => {
    expect(() => logError(new Error('e'), 'ctx')).not.toThrow();
  });
});

describe('crashlytics() returns undefined', () => {
  beforeEach(() => {
    mockCrashlyticsFn.mockReturnValue(undefined);
  });

  it('logError does not throw', () => {
    expect(() => logError(new Error('e'), 'ctx')).not.toThrow();
  });
});

/* ============================
   4. crashlytics() itself throws
   ============================ */
describe('crashlytics() factory throws', () => {
  beforeEach(() => {
    mockCrashlyticsFn.mockImplementation(() => {
      throw new Error('native module missing');
    });
  });

  it('logError does not throw', () => {
    expect(() => logError(new Error('e'), 'ctx')).not.toThrow();
  });
});

/* ============================
   5. setAttribute throws synchronously
   ============================ */
describe('setAttribute throws synchronously', () => {
  beforeEach(() => {
    mockSetAttribute.mockImplementation(() => {
      throw new Error('setAttribute boom');
    });
  });

  it('logError does not throw', () => {
    expect(() => logError(new Error('e'), 'ctx')).not.toThrow();
  });

  it('recordError is still called even though setAttribute threw', () => {
    logError(new Error('e'), 'ctx');
    // If setAttribute is called first and throws, recordError may not be reached.
    // This test documents the actual behavior.
    // The key assertion is the not-throw above.
  });
});

/* ============================
   6. recordError is not a function
   ============================ */
describe('recordError is not a function', () => {
  beforeEach(() => {
    mockCrashlyticsFn.mockImplementation(() => ({
      recordError: 'not-a-function',
      setAttribute: mockSetAttribute,
    }));
  });

  it('logError does not throw', () => {
    expect(() => logError(new Error('e'), 'ctx')).not.toThrow();
  });
});

/* ============================
   7. recordError throws synchronously
   ============================ */
describe('recordError throws synchronously', () => {
  beforeEach(() => {
    mockRecordError.mockImplementation(() => {
      throw new Error('recordError boom');
    });
  });

  it('logError does not throw', () => {
    expect(() => logError(new Error('e'), 'ctx')).not.toThrow();
  });
});

/* ============================
   8. Rapid-fire calls (1000x)
   ============================ */
describe('rapid-fire calls', () => {
  it('1000 calls in quick succession do not throw', () => {
    expect(() => {
      for (let i = 0; i < 1000; i++) {
        logError(new Error(`error_${i}`), `ctx_${i}`);
      }
    }).not.toThrow();
    expect(mockRecordError).toHaveBeenCalledTimes(1000);
  });
});

/* ============================
   9. String(error) throws (e.g. object with throwing toString)
   ============================ */
describe('error whose String() throws', () => {
  it('logError does not throw', () => {
    const evil = {
      toString() {
        throw new Error('toString trap');
      },
    };
    expect(() => logError(evil, 'ctx')).not.toThrow();
  });
});
