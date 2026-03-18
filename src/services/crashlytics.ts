import { NativeModules } from 'react-native';

const hasFirebase = !!NativeModules.RNFBAppModule;
let _mod: any = undefined;

function getCrashlytics() {
  if (!hasFirebase) return null;
  if (_mod === undefined) {
    try {
      _mod = require('@react-native-firebase/crashlytics');
    } catch {
      _mod = null;
    }
  }
  if (!_mod) return null;
  try {
    return (_mod.default ?? _mod)();
  } catch {
    return null;
  }
}

export function logError(error: unknown, context: string): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const c = getCrashlytics();
    c?.setAttribute('context', context).catch(() => {});
    c?.recordError(err);
  } catch {
    // never let crash reporting crash the app
  }
}
