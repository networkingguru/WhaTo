function getCrashlytics() {
  try {
    const mod = require('@react-native-firebase/crashlytics');
    return (mod.default ?? mod)();
  } catch {
    return null;
  }
}

export function logError(error: unknown, context: string): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    getCrashlytics()?.setAttribute('context', context).catch(() => {});
    getCrashlytics()?.recordError(err);
  } catch {
    // never let crash reporting crash the app
  }
}
