import crashlytics from '@react-native-firebase/crashlytics';

export function logError(error: unknown, context: string): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    crashlytics().setAttribute('context', context).catch(() => {});
    crashlytics().recordError(err);
  } catch {
    // never let crash reporting crash the app
  }
}
