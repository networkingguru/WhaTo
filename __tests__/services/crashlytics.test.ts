// Note: jest.mock is hoisted by babel-jest before const declarations, so
// mock functions must be defined INSIDE the factory to avoid temporal dead zone.
// Retrieve the mock instance via crashlytics() in assertions (same pattern as analytics.test.ts).
jest.mock('@react-native-firebase/crashlytics', () => {
  const recordError = jest.fn().mockResolvedValue(undefined);
  const setAttribute = jest.fn().mockResolvedValue(undefined);
  const instance = { recordError, setAttribute };
  return () => instance;
});

import crashlytics from '@react-native-firebase/crashlytics';
import { logError } from '../../src/services/crashlytics';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('logError', () => {
  it('calls recordError with the provided Error', () => {
    const err = new Error('test error');
    logError(err, 'test_context');
    expect(crashlytics().recordError).toHaveBeenCalledWith(err);
  });

  it('wraps non-Error values in an Error before recording', () => {
    logError('something went wrong', 'test_context');
    expect(crashlytics().recordError).toHaveBeenCalledWith(expect.any(Error));
    const recorded = (crashlytics().recordError as jest.Mock).mock.calls[0][0] as Error;
    expect(recorded.message).toBe('something went wrong');
  });

  it('does not throw even if crashlytics().recordError throws', () => {
    (crashlytics().recordError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('crashlytics down');
    });
    expect(() => logError(new Error('app error'), 'ctx')).not.toThrow();
  });

  it('does not throw if error is null', () => {
    expect(() => logError(null, 'ctx')).not.toThrow();
  });
});
