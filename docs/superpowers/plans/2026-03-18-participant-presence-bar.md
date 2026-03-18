# Participant Presence Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent participant status bar to the group-swipe screen showing other participants' connection state via colored initial avatars, with a long-press tooltip and a one-time intro legend toast.

**Architecture:** New `ParticipantBar` and `LegendToast` components rendered in `group-swipe.tsx`. Presence tracked via Firebase `onDisconnect()` with two new fields (`connected`, `lastConnected`) on participant nodes. Status derived from existing `completed` flag + new `connected` flag.

**Tech Stack:** React Native, Expo, Firebase Realtime Database (`onDisconnect`), React Native Reanimated (legend fade), AsyncStorage (legend gate), Pressable (tooltip)

**Spec:** `docs/superpowers/specs/2026-03-18-participant-presence-bar-design.md`

---

### Task 1: Add `connected` color to theme and update ParticipantData type

**Files:**
- Modify: `src/theme.ts:1-14`
- Modify: `src/services/sessionService.ts:1-28`

- [ ] **Step 1: Add `connected` color to theme**

In `src/theme.ts`, add `connected: '#4A90D9'` to the `colors` object after `danger`:

```typescript
  danger: '#FF4444',
  connected: '#4A90D9',
  shadow: '#000000',
```

- [ ] **Step 2: Update ParticipantData interface**

In `src/services/sessionService.ts`, add `connected` and `lastConnected` to `ParticipantData`:

```typescript
export interface ParticipantData {
  name: string;
  joinedAt: number;
  completed?: boolean;
  connected?: boolean;
  lastConnected?: number;
  swipes?: Record<string, boolean>;
}
```

- [ ] **Step 3: Add `onDisconnect` to firebase/database import**

In `src/services/sessionService.ts` line 1, add `onDisconnect` to the import:

```typescript
import { ref, set, get, onValue, update, onDisconnect } from 'firebase/database';
```

- [ ] **Step 4: Add `onDisconnect` to firebase/database mock in tests**

In `__tests__/services/sessionService.test.ts`, add `onDisconnect` to the mock at the top of the file:

```typescript
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  onValue: jest.fn(),
  update: jest.fn(),
  onDisconnect: jest.fn(() => ({ set: jest.fn(), cancel: jest.fn() })),
}));
```

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: All existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/theme.ts src/services/sessionService.ts __tests__/services/sessionService.test.ts
git commit -m "feat: add connected color and presence fields to ParticipantData"
```

---

### Task 2: Add presence service functions and fix `startNextRound`

**Files:**
- Modify: `src/services/sessionService.ts:246-271`
- Test: `__tests__/services/sessionService.test.ts`

- [ ] **Step 1: Write tests for the `getParticipantStatus` helper**

Add to `__tests__/services/sessionService.test.ts`. First add `getParticipantStatus` to the import:

```typescript
import {
  generateSessionCode,
  isSessionExpired,
  computeMatches,
  computeLiveMatches,
  hasHopelessParticipant,
  getParticipantStatus,
  SessionData,
} from '../../src/services/sessionService';
```

Then add a new describe block at the end:

```typescript
describe('getParticipantStatus', () => {
  it('returns "done" when completed is true, even if disconnected', () => {
    expect(getParticipantStatus({ name: 'A', joinedAt: 0, completed: true, connected: false }))
      .toBe('done');
  });

  it('returns "done" when completed is true and connected', () => {
    expect(getParticipantStatus({ name: 'A', joinedAt: 0, completed: true, connected: true }))
      .toBe('done');
  });

  it('returns "swiping" when connected and not completed', () => {
    expect(getParticipantStatus({ name: 'A', joinedAt: 0, connected: true }))
      .toBe('swiping');
  });

  it('returns "offline" when not connected and not completed', () => {
    expect(getParticipantStatus({ name: 'A', joinedAt: 0, connected: false }))
      .toBe('offline');
  });

  it('returns "offline" when connected is undefined', () => {
    expect(getParticipantStatus({ name: 'A', joinedAt: 0 }))
      .toBe('offline');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/sessionService.test.ts --no-coverage 2>&1 | tail -10`
Expected: FAIL — `getParticipantStatus` is not exported.

- [ ] **Step 3: Implement `getParticipantStatus`**

Add to `src/services/sessionService.ts` before the `createSession` function (around line 34):

```typescript
export type ParticipantStatus = 'done' | 'swiping' | 'offline';

export function getParticipantStatus(participant: ParticipantData): ParticipantStatus {
  if (participant.completed) return 'done';
  if (participant.connected) return 'swiping';
  return 'offline';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/sessionService.test.ts --no-coverage 2>&1 | tail -10`
Expected: All tests PASS.

- [ ] **Step 5: Add presence helper functions**

Add to `src/services/sessionService.ts` after `getParticipantStatus`:

```typescript
export async function setPresence(
  code: string,
  deviceId: string
): Promise<() => void> {
  const connectedRef = ref(database, `sessions/${code}/participants/${deviceId}/connected`);
  const lastConnectedRef = ref(database, `sessions/${code}/participants/${deviceId}/lastConnected`);

  await set(connectedRef, true);
  await set(lastConnectedRef, Date.now());

  const disconnectRef = onDisconnect(connectedRef);
  await disconnectRef.set(false);

  return () => {
    disconnectRef.cancel();
    set(connectedRef, false);
  };
}
```

- [ ] **Step 6: Fix `startNextRound` to preserve presence fields**

In `src/services/sessionService.ts`, update the `startNextRound` function. Replace the participant reset loop:

```typescript
  // Reset all participants' swipes and completed
  const resetParticipants: Record<string, ParticipantData> = {};
  for (const [pid, pdata] of Object.entries(session.participants)) {
    resetParticipants[pid] = {
      name: pdata.name,
      joinedAt: pdata.joinedAt,
    };
  }
```

With:

```typescript
  // Reset swipes and completed, but preserve presence fields
  const resetParticipants: Record<string, ParticipantData> = {};
  for (const [pid, pdata] of Object.entries(session.participants)) {
    resetParticipants[pid] = {
      name: pdata.name,
      joinedAt: pdata.joinedAt,
      connected: pdata.connected,
      lastConnected: pdata.lastConnected,
    };
  }
```

- [ ] **Step 7: Run all tests to verify no regressions**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/services/sessionService.ts __tests__/services/sessionService.test.ts
git commit -m "feat: add presence helpers and fix startNextRound to preserve presence"
```

---

### Task 3: Create ParticipantBar component

**Files:**
- Create: `src/components/ParticipantBar.tsx`
- Test: `__tests__/components/ParticipantBar.test.tsx`

- [ ] **Step 1: Write tests for ParticipantBar**

Create `__tests__/components/ParticipantBar.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { ParticipantBar } from '../../src/components/ParticipantBar';
import { ParticipantData } from '../../src/services/sessionService';

const participants: Record<string, ParticipantData> = {
  dev1: { name: 'Sarah', joinedAt: 0, connected: true },
  dev2: { name: 'Mike', joinedAt: 0, completed: true, connected: true },
  dev3: { name: 'Kim', joinedAt: 0, connected: false },
  self: { name: 'You', joinedAt: 0, connected: true },
};

describe('ParticipantBar', () => {
  it('renders initials for other participants, excluding self', () => {
    const { getByText, queryByText } = render(
      <ParticipantBar participants={participants} selfDeviceId="self" />
    );
    expect(getByText('S')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
    expect(getByText('K')).toBeTruthy();
    expect(queryByText('Y')).toBeNull();
  });

  it('renders nothing when only self is in session', () => {
    const { queryByText } = render(
      <ParticipantBar participants={{ self: { name: 'You', joinedAt: 0, connected: true } }} selfDeviceId="self" />
    );
    expect(queryByText('Y')).toBeNull();
  });

  it('renders all 7 participants when session is full', () => {
    const full: Record<string, ParticipantData> = {};
    const names = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace'];
    names.forEach((name, i) => {
      full[`dev${i}`] = { name, joinedAt: 0, connected: true };
    });
    full['self'] = { name: 'Me', joinedAt: 0, connected: true };

    const { getByText } = render(
      <ParticipantBar participants={full} selfDeviceId="self" />
    );
    names.forEach(name => {
      expect(getByText(name[0])).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ParticipantBar.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ParticipantBar**

Create `src/components/ParticipantBar.tsx`:

```tsx
import React, { useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';
import { ParticipantData, getParticipantStatus, ParticipantStatus } from '../services/sessionService';

interface ParticipantBarProps {
  participants: Record<string, ParticipantData>;
  selfDeviceId: string;
}

const STATUS_COLORS: Record<ParticipantStatus, string> = {
  done: colors.success,
  swiping: colors.connected,
  offline: colors.danger,
};

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  done: 'done',
  swiping: 'swiping',
  offline: 'offline',
};

export function ParticipantBar({ participants, selfDeviceId }: ParticipantBarProps) {
  const [tooltip, setTooltip] = useState<{ name: string; status: ParticipantStatus; index: number } | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const others = Object.entries(participants)
    .filter(([id]) => id !== selfDeviceId)
    .sort(([, a], [, b]) => a.joinedAt - b.joinedAt);

  if (others.length === 0) return null;

  const showTooltip = (name: string, status: ParticipantStatus, index: number) => {
    setTooltip({ name, status, index });
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2000);
  };

  const hideTooltip = () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    setTooltip(null);
  };

  return (
    <View style={styles.container}>
      {tooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>
            {tooltip.name} — {STATUS_LABELS[tooltip.status]}
          </Text>
        </View>
      )}
      <View style={styles.row}>
        {others.map(([id, p], index) => {
          const status = getParticipantStatus(p);
          const bgColor = STATUS_COLORS[status];
          const initial = p.name.charAt(0).toUpperCase();

          return (
            <Pressable
              key={id}
              onPressIn={() => showTooltip(p.name, status, index)}
              onPressOut={hideTooltip}

            >
              <View style={[styles.avatar, { backgroundColor: bgColor }]}>
                <Text style={styles.initial}>{initial}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(255,107,74,0.05)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tooltip: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    backgroundColor: 'rgba(45,45,45,0.9)',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 10,
  },
  tooltipText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ParticipantBar.test.tsx --no-coverage 2>&1 | tail -10`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ParticipantBar.tsx __tests__/components/ParticipantBar.test.tsx
git commit -m "feat: create ParticipantBar component with initial avatars and tooltip"
```

---

### Task 4: Create LegendToast component

**Files:**
- Create: `src/components/LegendToast.tsx`
- Test: `__tests__/components/LegendToast.test.tsx`

- [ ] **Step 1: Write tests for LegendToast**

Create `__tests__/components/LegendToast.test.tsx`:

```tsx
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (comp: any) => comp,
    },
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withTiming: (val: any) => val,
    withDelay: (_delay: any, val: any) => val,
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { LegendToast } from '../../src/components/LegendToast';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('LegendToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders legend rows when not previously seen', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const { findByText } = render(<LegendToast dismissed={false} />);
    expect(await findByText('Swiping')).toBeTruthy();
    expect(await findByText('Done')).toBeTruthy();
    expect(await findByText('Disconnected')).toBeTruthy();
  });

  it('does not render when previously seen', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { queryByText } = render(<LegendToast dismissed={false} />);
    // Give effect time to run
    await new Promise(r => setTimeout(r, 50));
    expect(queryByText('Swiping')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/LegendToast.test.tsx --no-coverage 2>&1 | tail -10`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement LegendToast**

Create `src/components/LegendToast.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing } from '../theme';

const LEGEND_KEY = 'whato_seen_legend';
const DISPLAY_MS = 3000;
const FADE_MS = 500;

interface LegendToastProps {
  dismissed: boolean;
}

const ROWS: { color: string; label: string }[] = [
  { color: colors.connected, label: 'Swiping' },
  { color: colors.success, label: 'Done' },
  { color: colors.danger, label: 'Disconnected' },
];

export function LegendToast({ dismissed }: LegendToastProps) {
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = (delayMs: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), delayMs);
  };

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(LEGEND_KEY).then((val) => {
      if (!mounted) return;
      if (val) {
        setVisible(false);
      } else {
        setVisible(true);
        AsyncStorage.setItem(LEGEND_KEY, 'true');
        opacity.value = withDelay(DISPLAY_MS, withTiming(0, { duration: FADE_MS }));
        scheduleHide(DISPLAY_MS + FADE_MS);
      }
    });
    return () => {
      mounted = false;
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    if (dismissed && visible) {
      opacity.value = withTiming(0, { duration: 200 });
      scheduleHide(200);
    }
  }, [dismissed]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      {ROWS.map(({ color, label }) => (
        <View key={label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(45,45,45,0.9)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 100,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    color: '#FFFFFF',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/LegendToast.test.tsx --no-coverage 2>&1 | tail -10`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LegendToast.tsx __tests__/components/LegendToast.test.tsx
git commit -m "feat: create LegendToast component with one-time display and fade animation"
```

---

### Task 5: Integrate presence lifecycle and components into group-swipe

**Files:**
- Modify: `app/group-swipe.tsx`

- [ ] **Step 1: Add imports**

In `app/group-swipe.tsx`, update imports:

```typescript
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, AppState } from 'react-native';
```

Add new component and service imports after the existing imports:

```typescript
import { ParticipantBar } from '../src/components/ParticipantBar';
import { LegendToast } from '../src/components/LegendToast';
import { setPresence } from '../src/services/sessionService';
```

Also add `setPresence` and `markCompleted` to the existing sessionService import:

```typescript
import {
  listenToSession,
  recordSwipe,
  endSession,
  computeLiveMatches,
  hasHopelessParticipant,
  startNextRound,
  setPresence,
  markCompleted,
  SessionData,
} from '../src/services/sessionService';
```

- [ ] **Step 2: Add presence lifecycle effect**

Inside `GroupSwipeScreen`, after the existing `useEffect` for `getDeviceId`, add:

```typescript
  // Presence lifecycle
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!code || !deviceId) return;

    const connectPresence = async () => {
      if (isConnectedRef.current) return;
      isConnectedRef.current = true;
      presenceCleanupRef.current = await setPresence(code, deviceId);
    };

    connectPresence();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        isConnectedRef.current = false;
        connectPresence();
      }
    });

    return () => {
      subscription.remove();
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }
      isConnectedRef.current = false;
    };
  }, [code, deviceId]);
```

- [ ] **Step 3: Add `markCompleted` call to `handleEmpty`**

The existing `handleEmpty` callback never calls `markCompleted`, so participants who finish all cards never get the "done" (green) status. Add the call at the start of `handleEmpty`:

Replace:

```typescript
  const handleEmpty = useCallback(() => {
    // Participant exhausted all cards. Match detection in the listener
    // will handle hopeless participant check.
    // If match banner is already showing, resolve immediately.
    if (matchBanner && session) {
```

With:

```typescript
  const handleEmpty = useCallback(() => {
    if (code && deviceId) {
      markCompleted(code, deviceId);
    }
    // Participant exhausted all cards. Match detection in the listener
    // will handle hopeless participant check.
    // If match banner is already showing, resolve immediately.
    if (matchBanner && session) {
```

- [ ] **Step 4: Add ParticipantBar and LegendToast to the render**

In the JSX return, insert `ParticipantBar` between `SwipeDeck` and the hints `View`, and add `LegendToast` inside the container:

Replace:

```tsx
      <SwipeDeck
        cards={cards}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
        onEmpty={handleEmpty}
      />
      <View style={styles.hints}>
```

With:

```tsx
      <SwipeDeck
        cards={cards}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
        onEmpty={handleEmpty}
      />
      {session && deviceId && (
        <ParticipantBar
          participants={session.participants}
          selfDeviceId={deviceId}
        />
      )}
      <View style={styles.hints}>
```

And add the `LegendToast` right after the opening `<SafeAreaView style={styles.container}>`:

```tsx
    <SafeAreaView style={styles.container}>
      <LegendToast dismissed={matchBanner} />
```

- [ ] **Step 5: Run all tests to verify no regressions**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add app/group-swipe.tsx
git commit -m "feat: integrate ParticipantBar, LegendToast, and presence lifecycle into group-swipe"
```

---

### Task 6: Run full test suite and manual verification

- [ ] **Step 1: Run full test suite**

Run: `npx jest --no-coverage 2>&1`
Expected: All tests PASS with no warnings.

- [ ] **Step 2: TypeScript type check**

Run: `npx tsc --noEmit 2>&1 | tail -20`
Expected: No type errors.

- [ ] **Step 3: Manual test checklist**

Start the app with `npx expo start` and test:

1. Open a group session on two devices/simulators
2. Verify participant avatars appear in the bottom bar on the swipe screen
3. Verify your own avatar does NOT appear
4. Verify blue circles for connected participants
5. Long-press an avatar → tooltip shows "{Name} — swiping"
6. Have one participant finish all cards → their avatar turns green
7. Long-press → tooltip shows "{Name} — done"
8. Kill one participant's app → their avatar turns red within ~30s
9. Long-press → tooltip shows "{Name} — offline"
10. Verify legend toast appears on first session entry (3 rows: blue/green/red with labels)
11. Verify legend toast fades after 3 seconds
12. Re-enter a group session → verify legend toast does NOT appear again
13. Trigger a match while legend toast is showing → toast dismisses immediately
14. Test round transition → verify avatars don't all turn red (presence preserved)
15. Test with max 8 participants → verify 7 avatars fit cleanly

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address manual testing feedback for participant presence bar"
```
