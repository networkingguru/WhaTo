# Analytics & Crash Reporting Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase Analytics event tracking and Crashlytics crash/error reporting to WhaTo (iOS), anonymously tracking user behaviour across all screens and catching fatal/non-fatal errors.

**Architecture:** Two new service wrappers (`src/services/analytics.ts`, `src/services/crashlytics.ts`) provide typed, fire-and-forget functions. A class-based error boundary wraps the root layout for fatal crash capture. Each app screen imports only the specific tracker functions it needs.

**Tech Stack:** `@react-native-firebase/analytics`, `@react-native-firebase/crashlytics`, Expo managed workflow, EAS Build, Jest for unit tests.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `src/services/analytics.ts` | **Create** | Named analytics event functions |
| `src/services/crashlytics.ts` | **Create** | `logError` wrapper |
| `__tests__/services/analytics.test.ts` | **Create** | Unit tests for analytics wrapper |
| `__tests__/services/crashlytics.test.ts` | **Create** | Unit tests for crashlytics wrapper |
| `app.json` | **Modify** | Add `@react-native-firebase/app` + crashlytics plugins |
| `package.json` | **Modify** | Add `@react-native-firebase` to jest transformIgnorePatterns |
| `app/_layout.tsx` | **Modify** | Screen view tracking + error boundary class |
| `app/index.tsx` | **Modify** | `topic_selected`, `group_session_created` |
| `app/swipe.tsx` | **Modify** | `solo_swipe_right`, `solo_deck_empty`, `card_detail_opened`, `logError` |
| `app/lobby.tsx` | **Modify** | `group_session_started`, `logError` |
| `app/join.tsx` | **Modify** | `group_session_joined`, `logError` |
| `app/group-swipe.tsx` | **Modify** | `logError` on swipe/endSession failures |
| `app/group-result.tsx` | **Modify** | `group_match_found`, `group_no_match` |
| `src/components/FeedbackModal.tsx` | **Modify** | `feedback_link_tapped` |
| `docs/privacy-policy.html` | **Modify** | Disclose Firebase Analytics |

---

## Task 1: Pre-flight — Firebase console setup (manual)

These steps must be completed by the developer before any build. They cannot be automated.

- [ ] **Step 1: Enable Google Analytics in Firebase console**

  Go to https://console.firebase.google.com → select the WhaTo project → Project Settings → Integrations tab → enable Google Analytics.

- [ ] **Step 2: Enable Crashlytics**

  In Firebase console → Crashlytics (left sidebar) → click "Enable Crashlytics" for the iOS app (`com.whato.app`).

- [ ] **Step 3: Download GoogleService-Info.plist**

  Firebase console → Project Settings → Your apps → iOS app → "Download GoogleService-Info.plist". Place the file at the project root (`/Users/brianhill/Scripts/Whato/GoogleService-Info.plist`).

- [ ] **Step 4: Add to .gitignore**

  Open `.gitignore` and add:
  ```
  GoogleService-Info.plist
  ```

- [ ] **Step 5: Upload as EAS secret**

  ```bash
  eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
  ```

---

## Task 2: Install dependencies

- [ ] **Step 1: Install the three packages**

  ```bash
  npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics
  ```

  Expected: packages added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Update jest transformIgnorePatterns**

  In `package.json`, find the `transformIgnorePatterns` array and replace it with:

  ```json
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@react-native-firebase)"
  ]
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add package.json package-lock.json
  git commit -m "chore: install @react-native-firebase analytics and crashlytics"
  ```

---

## Task 3: Create analytics service

**Files:**
- Create: `src/services/analytics.ts`
- Create: `__tests__/services/analytics.test.ts`

- [ ] **Step 1: Write the failing tests**

  Create `__tests__/services/analytics.test.ts`:

  ```typescript
  jest.mock('@react-native-firebase/analytics', () => {
    const logEvent = jest.fn().mockResolvedValue(undefined);
    const logScreenView = jest.fn().mockResolvedValue(undefined);
    return () => ({ logEvent, logScreenView });
  });

  import analytics from '@react-native-firebase/analytics';
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

  const mockAnalytics = analytics as jest.MockedFunction<typeof analytics>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper: flush all pending promises
  const flush = () => new Promise((r) => setImmediate(r));

  describe('analytics service', () => {
    it('trackTopicSelected logs topic_selected with topic and mode', async () => {
      trackTopicSelected('food', 'solo');
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('topic_selected', { topic: 'food', mode: 'solo' });
    });

    it('trackSoloSwipeRight logs solo_swipe_right with topic', async () => {
      trackSoloSwipeRight('movie');
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('solo_swipe_right', { topic: 'movie' });
    });

    it('trackSoloDeckEmpty logs solo_deck_empty with topic', async () => {
      trackSoloDeckEmpty('show');
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('solo_deck_empty', { topic: 'show' });
    });

    it('trackCardDetailOpened logs card_detail_opened with topic', async () => {
      trackCardDetailOpened('food');
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('card_detail_opened', { topic: 'food' });
    });

    it('trackGroupSessionCreated logs group_session_created with topic', async () => {
      trackGroupSessionCreated('movie');
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_session_created', { topic: 'movie' });
    });

    it('trackGroupSessionJoined logs group_session_joined with no params', async () => {
      trackGroupSessionJoined();
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_session_joined', {});
    });

    it('trackGroupSessionStarted logs group_session_started with topic and count', async () => {
      trackGroupSessionStarted('food', 3);
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_session_started', { topic: 'food', participant_count: 3 });
    });

    it('trackGroupMatchFound logs group_match_found with topic', async () => {
      trackGroupMatchFound('show');
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_match_found', { topic: 'show' });
    });

    it('trackGroupNoMatch logs group_no_match with topic', async () => {
      trackGroupNoMatch('food');
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('group_no_match', { topic: 'food' });
    });

    it('trackFeedbackLinkTapped logs feedback_link_tapped', async () => {
      trackFeedbackLinkTapped();
      await flush();
      expect(mockAnalytics().logEvent).toHaveBeenCalledWith('feedback_link_tapped', {});
    });

    it('trackScreenView calls logScreenView with screen_name', async () => {
      trackScreenView('/swipe');
      await flush();
      expect(mockAnalytics().logScreenView).toHaveBeenCalledWith({ screen_name: '/swipe', screen_class: '/swipe' });
    });

    it('does not throw if analytics().logEvent rejects', async () => {
      (mockAnalytics().logEvent as jest.Mock).mockRejectedValueOnce(new Error('network error'));
      expect(() => trackTopicSelected('food', 'solo')).not.toThrow();
      await flush();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npx jest __tests__/services/analytics.test.ts --no-coverage
  ```

  Expected: FAIL — module not found (`src/services/analytics`).

- [ ] **Step 3: Create `src/services/analytics.ts`**

  ```typescript
  import analytics from '@react-native-firebase/analytics';

  type Topic = 'food' | 'movie' | 'show';
  type Mode = 'solo' | 'group';

  function safe(fn: () => Promise<void>): void {
    fn().catch(() => {});
  }

  export function trackTopicSelected(topic: Topic, mode: Mode): void {
    safe(() => analytics().logEvent('topic_selected', { topic, mode }));
  }

  export function trackSoloSwipeRight(topic: Topic): void {
    safe(() => analytics().logEvent('solo_swipe_right', { topic }));
  }

  export function trackSoloDeckEmpty(topic: Topic): void {
    safe(() => analytics().logEvent('solo_deck_empty', { topic }));
  }

  export function trackCardDetailOpened(topic: Topic): void {
    safe(() => analytics().logEvent('card_detail_opened', { topic }));
  }

  export function trackGroupSessionCreated(topic: Topic): void {
    safe(() => analytics().logEvent('group_session_created', { topic }));
  }

  export function trackGroupSessionJoined(): void {
    safe(() => analytics().logEvent('group_session_joined', {}));
  }

  export function trackGroupSessionStarted(topic: Topic, participantCount: number): void {
    safe(() =>
      analytics().logEvent('group_session_started', {
        topic,
        participant_count: participantCount,
      })
    );
  }

  export function trackGroupMatchFound(topic: Topic): void {
    safe(() => analytics().logEvent('group_match_found', { topic }));
  }

  export function trackGroupNoMatch(topic: Topic): void {
    safe(() => analytics().logEvent('group_no_match', { topic }));
  }

  export function trackFeedbackLinkTapped(): void {
    safe(() => analytics().logEvent('feedback_link_tapped', {}));
  }

  export function trackScreenView(screenName: string): void {
    safe(() =>
      analytics().logScreenView({ screen_name: screenName, screen_class: screenName })
    );
  }
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npx jest __tests__/services/analytics.test.ts --no-coverage
  ```

  Expected: PASS — 12 tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/services/analytics.ts __tests__/services/analytics.test.ts
  git commit -m "feat: add analytics service wrapper"
  ```

---

## Task 4: Create crashlytics service

**Files:**
- Create: `src/services/crashlytics.ts`
- Create: `__tests__/services/crashlytics.test.ts`

- [ ] **Step 1: Write the failing tests**

  Create `__tests__/services/crashlytics.test.ts`:

  ```typescript
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
  ```

- [ ] **Step 2: Run test to verify it fails**

  ```bash
  npx jest __tests__/services/crashlytics.test.ts --no-coverage
  ```

  Expected: FAIL — module not found (`src/services/crashlytics`).

- [ ] **Step 3: Create `src/services/crashlytics.ts`**

  ```typescript
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
  ```

- [ ] **Step 4: Run tests to verify they pass**

  ```bash
  npx jest __tests__/services/crashlytics.test.ts --no-coverage
  ```

  Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

  ```bash
  git add src/services/crashlytics.ts __tests__/services/crashlytics.test.ts
  git commit -m "feat: add crashlytics service wrapper"
  ```

---

## Task 5: Configure app.json plugins

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Add plugins**

  In `app.json`, find the `"plugins"` array and replace it with:

  ```json
  "plugins": [
    "expo-router",
    "@react-native-firebase/app",
    "@react-native-firebase/crashlytics"
  ]
  ```

- [ ] **Step 2: Verify JSON is valid**

  ```bash
  node -e "require('./app.json'); console.log('valid')"
  ```

  Expected: `valid`

- [ ] **Step 3: Commit**

  ```bash
  git add app.json
  git commit -m "chore: add @react-native-firebase expo config plugins"
  ```

---

## Task 6: Update `app/_layout.tsx` — screen tracking + error boundary

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Replace `app/_layout.tsx` content**

  Replace the entire file with:

  ```tsx
  import React, { useEffect } from 'react';
  import { View, Text } from 'react-native';
  import { Stack, useRouter, usePathname } from 'expo-router';
  import { GestureHandlerRootView } from 'react-native-gesture-handler';
  import { StatusBar } from 'expo-status-bar';
  import * as Linking from 'expo-linking';
  import { colors } from '../src/theme';
  import { trackScreenView } from '../src/services/analytics';
  import { logError } from '../src/services/crashlytics';
  import crashlytics from '@react-native-firebase/crashlytics';

  // Class-based error boundary — required pattern for React 19
  // (no stable hook-based API for error boundaries exists in React 19)
  class AppErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };

    static getDerivedStateFromError() {
      return { hasError: true };
    }

    componentDidCatch(error: Error) {
      try {
        crashlytics().recordError(error);
      } catch {
        // never let crash reporting crash the app
      }
    }

    render() {
      if (this.state.hasError) {
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 18, color: '#333', textAlign: 'center', paddingHorizontal: 32 }}>
              Something went wrong. Please restart the app.
            </Text>
          </View>
        );
      }
      return this.props.children;
    }
  }

  function ScreenTracker() {
    const pathname = usePathname();
    useEffect(() => {
      trackScreenView(pathname);
    }, [pathname]);
    return null;
  }

  export default function RootLayout() {
    const router = useRouter();

    useEffect(() => {
      function handleUrl(event: { url: string }) {
        const parsed = Linking.parse(event.url);
        if (parsed.path?.startsWith('join/')) {
          const code = parsed.path.split('/')[1];
          if (code) {
            router.push({
              pathname: '/join',
              params: { code },
            });
          }
        }
      }

      const subscription = Linking.addEventListener('url', handleUrl);
      Linking.getInitialURL().then((url) => {
        if (url) handleUrl({ url });
      });

      return () => subscription.remove();
    }, [router]);

    return (
      <AppErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
          <StatusBar style="dark" />
          <ScreenTracker />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'slide_from_right',
            }}
          />
        </GestureHandlerRootView>
      </AppErrorBoundary>
    );
  }
  ```

  Note: `ScreenTracker` is a separate functional component so it can use the `usePathname` hook inside the expo-router context (expo-router's context is available to all components rendered within the layout).

- [ ] **Step 2: Run all tests to verify no regressions**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all previously passing tests still pass.

- [ ] **Step 3: Commit**

  ```bash
  git add app/_layout.tsx
  git commit -m "feat: add screen view tracking and error boundary to root layout"
  ```

---

## Task 7: Update `app/index.tsx` — topic_selected, group_session_created

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Add imports at top of file**

  After the existing imports, add:

  ```typescript
  import { trackTopicSelected, trackGroupSessionCreated } from '../src/services/analytics';
  import { logError } from '../src/services/crashlytics';
  ```

- [ ] **Step 2: Fire `topic_selected` in `handleTopicPress`**

  Find `handleTopicPress`:
  ```typescript
  function handleTopicPress(topic: Topic) {
    if (isGroupMode) {
      setGroupTopic(topic);
      setGroupPhase('enter-name');
    } else {
      router.push({ pathname: '/swipe', params: { topic } });
    }
  }
  ```

  Replace with:
  ```typescript
  function handleTopicPress(topic: Topic) {
    trackTopicSelected(topic, isGroupMode ? 'group' : 'solo');
    if (isGroupMode) {
      setGroupTopic(topic);
      setGroupPhase('enter-name');
    } else {
      router.push({ pathname: '/swipe', params: { topic } });
    }
  }
  ```

- [ ] **Step 3: Fire `group_session_created` and add `logError` in `handleCreateGroup`**

  Find the success path in `handleCreateGroup` — the line `await createSession(...)`:
  ```typescript
      await createSession(code, groupTopic, deviceId, trimmedName, cards, location);
      resetToSolo();
      router.push({ pathname: '/lobby', params: { code, topic: groupTopic, isCreator: 'true' } });
  ```

  Replace with:
  ```typescript
      await createSession(code, groupTopic, deviceId, trimmedName, cards, location);
      trackGroupSessionCreated(groupTopic);
      resetToSolo();
      router.push({ pathname: '/lobby', params: { code, topic: groupTopic, isCreator: 'true' } });
  ```

  Find the catch block in `handleCreateGroup`:
  ```typescript
    } catch (err) {
      Alert.alert('Error', `Could not create session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGroupPhase('enter-name');
    }
  ```

  Replace with:
  ```typescript
    } catch (err) {
      logError(err, 'handleCreateGroup');
      Alert.alert('Error', `Could not create session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGroupPhase('enter-name');
    }
  ```

- [ ] **Step 4: Run all tests**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/index.tsx
  git commit -m "feat: track topic_selected and group_session_created events"
  ```

---

## Task 8: Update `app/swipe.tsx` — solo events + logError

**Files:**
- Modify: `app/swipe.tsx`

- [ ] **Step 1: Add imports**

  After existing imports, add:

  ```typescript
  import { trackSoloSwipeRight, trackSoloDeckEmpty, trackCardDetailOpened } from '../src/services/analytics';
  import { logError } from '../src/services/crashlytics';
  ```

- [ ] **Step 2: Fire `solo_swipe_right` in `handleSwipeRight`**

  Find:
  ```typescript
  const handleSwipeRight = useCallback(
    (card: CardItem) => {
      router.replace({
  ```

  Add `trackSoloSwipeRight(topic)` before `router.replace`:
  ```typescript
  const handleSwipeRight = useCallback(
    (card: CardItem) => {
      trackSoloSwipeRight(topic);
      router.replace({
  ```

- [ ] **Step 3: Fire `solo_deck_empty` in `handleEmpty`**

  Find:
  ```typescript
  const handleEmpty = useCallback(() => {
    router.replace('/');
  }, [router]);
  ```

  Replace with:
  ```typescript
  const handleEmpty = useCallback(() => {
    trackSoloDeckEmpty(topic);
    router.replace('/');
  }, [router, topic]);
  ```

- [ ] **Step 4: Fire `card_detail_opened` on card tap**

  Find the `onTap` prop on `SwipeDeck`:
  ```typescript
  onTap={(card) => setDetailCard(card)}
  ```

  Replace with:
  ```typescript
  onTap={(card) => { trackCardDetailOpened(topic); setDetailCard(card); }}
  ```

- [ ] **Step 5: Add `logError` to location error catch**

  Find:
  ```typescript
      } catch {
        setLocationError('Could not determine your location. Please try again.');
      }
  ```

  Replace with:
  ```typescript
      } catch (err) {
        logError(err, 'swipe_location');
        setLocationError('Could not determine your location. Please try again.');
      }
  ```

- [ ] **Step 6: Run all tests**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add app/swipe.tsx
  git commit -m "feat: track solo swipe events and location errors"
  ```

---

## Task 9: Update `app/lobby.tsx` — group_session_started + logError

**Files:**
- Modify: `app/lobby.tsx`

- [ ] **Step 1: Add imports**

  After existing imports, add:

  ```typescript
  import { trackGroupSessionStarted } from '../src/services/analytics';
  import { logError } from '../src/services/crashlytics';
  ```

- [ ] **Step 2: Fire `group_session_started` in `handleStart`**

  Find `handleStart`:
  ```typescript
  const handleStart = useCallback(async () => {
    if (!code) return;
    await startSession(code);
    router.replace({
      pathname: '/group-swipe',
      params: { code },
    });
  }, [code, router]);
  ```

  Replace with:
  ```typescript
  const handleStart = useCallback(async () => {
    if (!code) return;
    try {
      await startSession(code);
      trackGroupSessionStarted(topic as Topic, participants.length);
      router.replace({
        pathname: '/group-swipe',
        params: { code },
      });
    } catch (err) {
      logError(err, 'lobby_start_session');
    }
  }, [code, router, topic, participants.length]);
  ```

- [ ] **Step 3: Run all tests**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add app/lobby.tsx
  git commit -m "feat: track group_session_started event"
  ```

---

## Task 10: Update `app/join.tsx` — group_session_joined + logError

**Files:**
- Modify: `app/join.tsx`

- [ ] **Step 1: Add imports**

  After existing imports, add:

  ```typescript
  import { trackGroupSessionJoined } from '../src/services/analytics';
  import { logError } from '../src/services/crashlytics';
  ```

- [ ] **Step 2: Fire `group_session_joined` on success; add `logError` on failure**

  Find:
  ```typescript
      if (result.success) {
        router.replace({
          pathname: '/lobby',
          params: { code: code.trim().toUpperCase(), topic: '', isCreator: 'false' },
        });
      } else {
        Alert.alert('Could not join', result.error ?? 'Unknown error');
      }
    } catch {
      Alert.alert('Error', "Couldn't connect — try again in a moment.");
    } finally {
      setJoining(false);
    }
  ```

  Replace with:
  ```typescript
      if (result.success) {
        trackGroupSessionJoined();
        router.replace({
          pathname: '/lobby',
          params: { code: code.trim().toUpperCase(), topic: '', isCreator: 'false' },
        });
      } else {
        Alert.alert('Could not join', result.error ?? 'Unknown error');
      }
    } catch (err) {
      logError(err, 'join_session');
      Alert.alert('Error', "Couldn't connect — try again in a moment.");
    } finally {
      setJoining(false);
    }
  ```

- [ ] **Step 3: Run all tests**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add app/join.tsx
  git commit -m "feat: track group_session_joined event"
  ```

---

## Task 11: Update `app/group-swipe.tsx` — logError on swipe/session failures

**Files:**
- Modify: `app/group-swipe.tsx`

- [ ] **Step 1: Add import**

  After existing imports, add:

  ```typescript
  import { logError } from '../src/services/crashlytics';
  ```

- [ ] **Step 2: Add try/catch around `recordSwipe` in `handleSwipeRight`**

  Find:
  ```typescript
  const handleSwipeRight = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        await recordSwipe(code, deviceId, card.id, true);
      }
    },
    [code, deviceId]
  );
  ```

  Replace with:
  ```typescript
  const handleSwipeRight = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        try {
          await recordSwipe(code, deviceId, card.id, true);
        } catch (err) {
          logError(err, 'group_swipe_right');
        }
      }
    },
    [code, deviceId]
  );
  ```

- [ ] **Step 3: Add try/catch around `recordSwipe` in `handleSwipeLeft`**

  Find:
  ```typescript
  const handleSwipeLeft = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        await recordSwipe(code, deviceId, card.id, false);
      }
    },
    [code, deviceId]
  );
  ```

  Replace with:
  ```typescript
  const handleSwipeLeft = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        try {
          await recordSwipe(code, deviceId, card.id, false);
        } catch (err) {
          logError(err, 'group_swipe_left');
        }
      }
    },
    [code, deviceId]
  );
  ```

- [ ] **Step 4: Add logError to first `endSession` call (single match path)**

  Find this unique context (the `ids.length === 1` branch):
  ```typescript
    if (ids.length === 1) {
      // Single match — done!
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      });
  ```

  Replace with:
  ```typescript
    if (ids.length === 1) {
      // Single match — done!
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      }).catch((err) => logError(err, 'group_end_session_match'));
  ```

- [ ] **Step 5: Add logError to second `endSession` call (no-match fallback path)**

  Find this unique context (the final `else` branch):
  ```typescript
    } else {
      // Somehow no matches anymore — end
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      });
    }
  ```

  Replace with:
  ```typescript
    } else {
      // Somehow no matches anymore — end
      endSession(code!).then(() => {
        router.replace({ pathname: '/group-result', params: { code } });
      }).catch((err) => logError(err, 'group_end_session_no_match'));
    }
  ```

- [ ] **Step 6: Run all tests**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add app/group-swipe.tsx
  git commit -m "feat: add non-fatal error logging to group swipe screen"
  ```

---

## Task 12: Update `app/group-result.tsx` — group_match_found, group_no_match

**Files:**
- Modify: `app/group-result.tsx`

- [ ] **Step 1: Add imports**

  After existing imports, add:

  ```typescript
  import { trackGroupMatchFound, trackGroupNoMatch } from '../src/services/analytics';
  ```

- [ ] **Step 2: Fire events in a `useEffect` after session loads**

  The session is loaded asynchronously via `getSession(code).then(setSession)`. Events must fire after the session is available and the outcome is determined.

  Add a second `useEffect` after the existing one:

  ```typescript
  useEffect(() => {
    if (!session) return;
    if (isFailed) {
      trackGroupNoMatch(session.topic);
      return;
    }
    const matches = computeMatches(
      session.participants as Record<string, { name: string; swipes: Record<string, boolean> }>
    );
    const cardMap = new Map(session.cards.map((c) => [c.id, c]));
    const hasMatches =
      matches.unanimous.some((id) => cardMap.has(id)) ||
      matches.majority.some((id) => cardMap.has(id));
    if (hasMatches) {
      trackGroupMatchFound(session.topic);
    } else {
      trackGroupNoMatch(session.topic);
    }
  }, [session, isFailed]);
  ```

  The `computeMatches` function is already imported in this file. No new imports needed beyond the analytics functions.

- [ ] **Step 3: Run all tests**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add app/group-result.tsx
  git commit -m "feat: track group_match_found and group_no_match events"
  ```

---

## Task 13: Update `src/components/FeedbackModal.tsx` — feedback_link_tapped

**Files:**
- Modify: `src/components/FeedbackModal.tsx`

- [ ] **Step 1: Add import**

  After existing imports, add:

  ```typescript
  import { trackFeedbackLinkTapped } from '../services/analytics';
  ```

- [ ] **Step 2: Fire event in `openForm`**

  Find:
  ```typescript
  function openForm(type: 'Bug' | 'Feature') {
    const typeValue = type === 'Bug' ? 'Bug+Report' : 'Feature+Request';
    Linking.openURL(`${FORM_URL}?entry.1372637109=${typeValue}`);
    onClose();
  }
  ```

  Replace with:
  ```typescript
  function openForm(type: 'Bug' | 'Feature') {
    trackFeedbackLinkTapped();
    const typeValue = type === 'Bug' ? 'Bug+Report' : 'Feature+Request';
    Linking.openURL(`${FORM_URL}?entry.1372637109=${typeValue}`);
    onClose();
  }
  ```

- [ ] **Step 3: Run all tests**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/FeedbackModal.tsx
  git commit -m "feat: track feedback_link_tapped event"
  ```

---

## Task 14: Update privacy policy

**Files:**
- Modify: `docs/privacy-policy.html`

- [ ] **Step 1: Add Firebase Analytics disclosure to Third-Party Services section**

  Find the existing Firebase Realtime Database `<li>` item:
  ```html
  <li><strong>Firebase Realtime Database</strong> (<a href="https://policies.google.com/privacy">Google Privacy Policy</a>) — Stores temporary group session data. Sessions auto-delete after 24 hours.</li>
  ```

  Replace with:
  ```html
  <li><strong>Firebase Realtime Database</strong> (<a href="https://policies.google.com/privacy">Google Privacy Policy</a>) — Stores temporary group session data. Sessions auto-delete after 24 hours.</li>
  <li><strong>Firebase Analytics</strong> (<a href="https://policies.google.com/privacy">Google Privacy Policy</a>) — Collects anonymous usage data such as screen views and in-app events (e.g., which topics are selected, whether sessions are completed). No personally identifiable information is collected. Firebase assigns an anonymous installation ID; we do not set any user ID.</li>
  <li><strong>Firebase Crashlytics</strong> (<a href="https://policies.google.com/privacy">Google Privacy Policy</a>) — Collects anonymous crash reports and error logs to help us identify and fix bugs. Reports include device model, OS version, and stack traces. No personally identifiable information is included.</li>
  ```

- [ ] **Step 2: Update "What We Do NOT Collect" to be accurate**

  Find:
  ```html
  <li>No analytics or usage tracking</li>
  <li>No crash reports sent to us</li>
  ```

  Remove these two lines (they are no longer accurate after adding analytics/crashlytics).

- [ ] **Step 3: Commit and push**

  ```bash
  git add docs/privacy-policy.html
  git commit -m "docs: update privacy policy to disclose Firebase Analytics and Crashlytics"
  git push
  ```

---

## Task 15: Build and manual verification

- [ ] **Step 1: Run full test suite one final time**

  ```bash
  npx jest --no-coverage
  ```

  Expected: all tests pass.

- [ ] **Step 2: Enable Firebase Analytics DebugView**

  To see events in near-real-time during development, run your app with this flag set. Since you're using EAS Build, build a development client first:

  ```bash
  eas build --profile development --platform ios
  ```

  Then launch the app on device. In Firebase console → Analytics → DebugView — events will appear within seconds.

- [ ] **Step 3: Verify screen views appear in DebugView**

  Navigate between screens in the app. In Firebase DebugView you should see `screen_view` events with `screen_name` matching the pathname (e.g., `/`, `/swipe`, `/lobby`).

- [ ] **Step 4: Verify custom events in DebugView**

  - Tap a topic in solo mode → `topic_selected` with `mode: solo`
  - Swipe right on a card → `solo_swipe_right`
  - Create a group session → `group_session_created`
  - Join a session from a second device → `group_session_joined`
  - Tap the feedback button → `feedback_link_tapped`

- [ ] **Step 5: Verify Crashlytics is receiving sessions**

  Firebase console → Crashlytics. After the first app launch, the dashboard should show a session within a few minutes. Crashlytics only shows data from real builds (not Expo Go).

- [ ] **Step 6: Final commit if any cleanup needed**

  ```bash
  git push
  ```
