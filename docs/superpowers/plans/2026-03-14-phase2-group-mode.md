# WhaTo Phase 2: Group Mode, Visual Refresh & Creator Support — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform WhaTo from a solo swipe app into a group decision tool with a visual refresh, creator support button, and location controls.

**Architecture:** Extends the existing Expo (React Native) app. Visual refresh updates `theme.ts` and all components/screens. Group mode adds Firebase Realtime Database for session sync, deep linking for invites via SMS, and new screens (lobby, group results). Location controls add a radius selector and map picker for the Eat? topic.

**Tech Stack:** Expo SDK 54, TypeScript, Firebase Realtime Database, react-native-maps, phosphor-react-native, expo-sms, expo-linking (deep links)

---

## File Structure

```
app/
├── _layout.tsx                    # MODIFY — update theme colors, StatusBar style
├── index.tsx                      # MODIFY — new logo, renamed categories, sparkle button, group mode entry
├── swipe.tsx                      # MODIFY — add radius selector, updated labels/theme
├── result.tsx                     # MODIFY — updated theme, updated verb labels
├── join.tsx                       # CREATE — deep link handler for joining group sessions
├── lobby.tsx                      # CREATE — group session waiting room
├── group-swipe.tsx                # CREATE — group swipe screen (same deck, writes to Firebase)
├── group-result.tsx               # CREATE — group results with match computation
├── location-picker.tsx            # CREATE — map view for picking custom location
src/
├── theme.ts                       # MODIFY — new color palette, add secondary/tertiary
├── components/
│   ├── TopicButton.tsx            # MODIFY — pill shape, Phosphor icons, new colors
│   ├── SwipeCard.tsx              # MODIFY — light theme styles
│   ├── SwipeDeck.tsx              # MODIFY — light theme overlays
│   ├── Logo.tsx                   # CREATE — speech bubble WhaTo? wordmark
│   ├── SparkleButton.tsx          # CREATE — animated sparkle/bling button
│   ├── SupportPanel.tsx           # CREATE — bottom sheet with creator message + links
│   ├── RadiusSelector.tsx         # CREATE — preset distance pill selector
│   └── GroupModeButton.tsx        # CREATE — entry point for group sessions
├── providers/
│   ├── types.ts                   # MODIFY — add radius to FetchOptions, add display name map
│   └── restaurantProvider.ts      # MODIFY — use radius param in Yelp/Google API calls
├── hooks/
│   └── useCards.ts                # MODIFY — pass radius through to providers
├── services/
│   ├── firebase.ts                # CREATE — Firebase init + config
│   ├── sessionService.ts          # CREATE — create/join/listen/write session operations
│   └── deviceId.ts                # CREATE — anonymous device ID generation + persistence
└── utils/
    └── topicLabels.ts             # CREATE — display name mapping (food→Eat?, movie→Watch?, show→Stream?)
```

---

## Chunk 1: Visual Refresh — Theme, Logo & Component Updates

### Task 1: Update Theme

**Files:**
- Modify: `src/theme.ts`
- Modify: `src/utils/topicLabels.ts` (create)

- [ ] **Step 1: Create topic labels utility**

Create `src/utils/topicLabels.ts`:
```typescript
import { Topic } from '../providers/types';

export const topicDisplayNames: Record<Topic, string> = {
  food: 'Eat?',
  movie: 'Watch?',
  show: 'Stream?',
};

export const topicColors: Record<Topic, string> = {
  food: '#FF6B4A',
  movie: '#F5A623',
  show: '#7B68EE',
};
```

- [ ] **Step 2: Update theme.ts with new palette**

Replace the colors object in `src/theme.ts`:
```typescript
export const colors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  primary: '#FF6B4A',
  primaryLight: '#FF8A6A',
  secondary: '#F5A623',
  tertiary: '#7B68EE',
  text: '#2D2D2D',
  textSecondary: '#8B7355',
  accent: '#7B68EE',
  success: '#4CAF50',
  danger: '#FF4444',
  shadow: '#000000',
} as const;
```

Update typography colors to reference new `colors.text` and `colors.textSecondary`. Update `cardStyle` shadowOpacity to `0.1` (lighter for light theme).

- [ ] **Step 3: Run existing tests**

Run: `npm test`
Expected: All 18 tests pass (theme is used via imports, but tests mock styles — should still pass).

- [ ] **Step 4: Commit**

```bash
git add src/theme.ts src/utils/topicLabels.ts
git commit -m "feat: update theme to Warm & Playful palette and add topic labels"
```

### Task 2: Create Logo Component

**Files:**
- Create: `src/components/Logo.tsx`
- Test: `__tests__/components/Logo.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/Logo.test.tsx`:
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { Logo } from '../../src/components/Logo';

describe('Logo', () => {
  it('renders WhaTo? text', () => {
    const { getByText } = render(<Logo />);
    expect(getByText(/Wha/)).toBeTruthy();
    expect(getByText(/To/)).toBeTruthy();
  });

  it('renders small variant', () => {
    const { getByText } = render(<Logo size="small" />);
    expect(getByText(/Wha/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/Logo.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Logo component**

Create `src/components/Logo.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface LogoProps {
  size?: 'large' | 'small';
}

export function Logo({ size = 'large' }: LogoProps) {
  const isSmall = size === 'small';
  const fontSize = isSmall ? 24 : 42;
  const paddingH = isSmall ? 16 : 32;
  const paddingV = isSmall ? 8 : 16;
  const tailSize = isSmall ? 8 : 14;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.bubble, { paddingHorizontal: paddingH, paddingVertical: paddingV }]}>
        <Text style={[styles.text, { fontSize }]}>
          <Text style={styles.wha}>Wha</Text>
          <Text style={styles.to}>To</Text>
          <Text style={styles.question}>?</Text>
        </Text>
        <View
          style={[
            styles.tail,
            {
              borderLeftWidth: tailSize,
              borderRightWidth: tailSize,
              borderTopWidth: tailSize,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    overflow: 'visible',
    position: 'relative',
  },
  text: {
    fontWeight: '800',
  },
  wha: {
    color: '#FFFFFF',
  },
  to: {
    color: colors.text,
  },
  question: {
    color: '#FFFFFF',
  },
  tail: {
    position: 'absolute',
    bottom: -12,
    left: 30,
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.secondary,
    borderStyle: 'solid',
  },
});
```

Note: The gradient background from the spec (coral → amber) requires `expo-linear-gradient`. Install it (`npx expo install expo-linear-gradient`) and replace the `<View style={styles.bubble}>` wrapper with `<LinearGradient colors={[colors.primary, colors.secondary]} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.bubble, ...]}>`. The solid `backgroundColor: colors.primary` on the bubble style serves as the fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/Logo.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Logo.tsx __tests__/components/Logo.test.tsx
git commit -m "feat: add Logo component with speech bubble wordmark"
```

### Task 3: Install Phosphor Icons

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install phosphor-react-native and its peer dep**

```bash
npx expo install phosphor-react-native react-native-svg expo-linear-gradient expo-store-review
```

- [ ] **Step 2: Verify installation**

Run: `npx expo-doctor`
Expected: All checks pass

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install phosphor-react-native and react-native-svg"
```

### Task 4: Update TopicButton Component

**Files:**
- Modify: `src/components/TopicButton.tsx`
- Modify: `__tests__/components/TopicButton.test.tsx`

- [ ] **Step 1: Update the test for new props**

Update `__tests__/components/TopicButton.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopicButton } from '../../src/components/TopicButton';

describe('TopicButton', () => {
  it('renders display label', () => {
    const { getByText } = render(
      <TopicButton label="Eat?" color="#FF6B4A" icon="ForkKnife" onPress={() => {}} />
    );
    expect(getByText('Eat?')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TopicButton label="Eat?" color="#FF6B4A" icon="ForkKnife" onPress={onPress} />
    );
    fireEvent.press(getByText('Eat?'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/TopicButton.test.tsx`
Expected: FAIL — props mismatch

- [ ] **Step 3: Update TopicButton implementation**

Replace `src/components/TopicButton.tsx`:
```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ForkKnife, FilmSlate, Television, type Icon } from 'phosphor-react-native';
import { colors, spacing, typography, cardStyle } from '../theme';

const ICON_MAP: Record<string, Icon> = {
  ForkKnife,
  FilmSlate,
  Television,
};

interface TopicButtonProps {
  label: string;
  color: string;
  icon: string;
  onPress: () => void;
}

export function TopicButton({ label, color, icon, onPress }: TopicButtonProps) {
  const IconComponent = ICON_MAP[icon];
  return (
    <TouchableOpacity
      style={[styles.button, { borderLeftColor: color, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {IconComponent && (
        <IconComponent size={28} color={color} weight="fill" style={{ marginRight: 12 }} />
      )}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.surface,
    ...cardStyle,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    width: '100%',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  label: {
    ...typography.subtitle,
    fontWeight: '700',
    fontSize: 22,
  },
});
```

Note: Tests for TopicButton mock `phosphor-react-native` to avoid `react-native-svg` native module issues in Jest. Add this mock to the test file:
```typescript
jest.mock('phosphor-react-native', () => ({
  ForkKnife: 'ForkKnife',
  FilmSlate: 'FilmSlate',
  Television: 'Television',
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/TopicButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TopicButton.tsx __tests__/components/TopicButton.test.tsx
git commit -m "feat: update TopicButton with pill shape and per-topic color accent"
```

### Task 5: Update SwipeCard for Light Theme

**Files:**
- Modify: `src/components/SwipeCard.tsx`

- [ ] **Step 1: Verify SwipeCard — no code changes needed**

`SwipeCard.tsx` imports `colors` and `cardStyle` from theme. The new theme values (white surface, dark text, lighter shadow) propagate automatically. No code changes required.

- [ ] **Step 2: Run SwipeCard tests**

Run: `npx jest __tests__/components/SwipeCard.test.tsx`
Expected: PASS

- [ ] **Step 3: Update SwipeDeck overlay text color**

In `src/components/SwipeDeck.tsx`, the `overlayText` style uses `color: colors.text`. With the old dark theme, this was light gray on dark cards. With the new light theme, it's dark charcoal on white cards — which works. However, the overlay text should stand out more. Change the NOPE overlay text to `colors.danger` (`#FF4444`) and YES! overlay text to `colors.success` (`#4CAF50`):

```typescript
// Replace the single overlayText style with two:
overlayLeftText: {
  fontSize: 24,
  fontWeight: '800',
  color: '#FF4444',
},
overlayRightText: {
  fontSize: 24,
  fontWeight: '800',
  color: colors.success,
},
```

Update the JSX to use `styles.overlayLeftText` and `styles.overlayRightText` on the respective overlay `<Text>` elements.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/SwipeCard.tsx src/components/SwipeDeck.tsx
git commit -m "feat: update card and deck components for light theme"
```

### Task 6: Update Screens for Visual Refresh

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx`
- Modify: `app/swipe.tsx`
- Modify: `app/result.tsx`

- [ ] **Step 1: Update _layout.tsx**

In `app/_layout.tsx`:
- Change `StatusBar style` from `"light"` to `"dark"` (dark text on light background)
- Background color already comes from `colors.background` via import — will auto-update

- [ ] **Step 2: Update index.tsx (home screen)**

In `app/index.tsx`:
- Import `Logo` component and replace the `<Text style={styles.title}>Whato</Text>` with `<Logo />`
- Replace tagline text with `"What do you feel like?"` (keep as-is, it works)
- Update `TopicButton` props: replace `emoji`/`label` with new `label`/`color`/`icon` props:
  ```typescript
  import { topicDisplayNames, topicColors } from '../src/utils/topicLabels';

  <TopicButton label={topicDisplayNames.food} color={topicColors.food} icon="ForkKnife" onPress={() => handleTopic('food')} />
  <TopicButton label={topicDisplayNames.movie} color={topicColors.movie} icon="FilmSlate" onPress={() => handleTopic('movie')} />
  <TopicButton label={topicDisplayNames.show} color={topicColors.show} icon="Television" onPress={() => handleTopic('show')} />
  ```
- Remove old title styles

- [ ] **Step 3: Update swipe.tsx**

In `app/swipe.tsx`:
- Update `topicLabels` to use the new display names:
  ```typescript
  import { topicDisplayNames } from '../src/utils/topicLabels';
  // In the JSX:
  <Text style={styles.header}>{topicDisplayNames[topic as Topic] ?? 'Swipe'}</Text>
  ```

- [ ] **Step 4: Update result.tsx**

In `app/result.tsx`:
- Update `topicLabels` verb mapping to match new names:
  ```typescript
  const topicLabels: Record<string, string> = {
    food: 'eat at',
    movie: 'watch',
    show: 'stream',
  };
  ```

- [ ] **Step 5: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 6: Visual smoke test**

Run: `npx expo start`
Verify on device/simulator:
- Cream background throughout (no dark navy remnants)
- Logo renders as coral speech bubble with "WhaTo?" text
- Topic buttons show Phosphor icons + "Eat?" / "Watch?" / "Stream?"
- Swipe overlays are legible (colored text on light cards)
- Result screen verb says "stream" for shows

- [ ] **Step 7: Commit**

```bash
git add app/_layout.tsx app/index.tsx app/swipe.tsx app/result.tsx
git commit -m "feat: update all screens with new theme, logo, and category names"
```

---

## Chunk 2: Support the Creator Button

### Task 7: Create SparkleButton Component

**Files:**
- Create: `src/components/SparkleButton.tsx`
- Test: `__tests__/components/SparkleButton.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SparkleButton.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SparkleButton } from '../../src/components/SparkleButton';

describe('SparkleButton', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<SparkleButton onPress={() => {}} />);
    expect(getByTestId('sparkle-button')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<SparkleButton onPress={onPress} />);
    fireEvent.press(getByTestId('sparkle-button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/SparkleButton.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SparkleButton**

Create `src/components/SparkleButton.tsx`:
```typescript
import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkle } from 'phosphor-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

interface SparkleButtonProps {
  onPress: () => void;
}

export function SparkleButton({ onPress }: SparkleButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    // Bling animation: pulse every ~30 seconds
    scale.value = withRepeat(
      withDelay(
        30000,
        withSequence(
          withTiming(1.3, { duration: 200 }),
          withTiming(0.9, { duration: 150 }),
          withTiming(1.15, { duration: 150 }),
          withTiming(1, { duration: 200 })
        )
      ),
      -1,
      false
    );
    opacity.value = withRepeat(
      withDelay(
        30000,
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(0.6, { duration: 500 })
        )
      ),
      -1,
      false
    );
  }, [scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <TouchableOpacity onPress={onPress} testID="sparkle-button" activeOpacity={0.7}>
      <Animated.View style={[styles.button, animatedStyle]}>
        <Sparkle size={24} color="#F5A623" weight="fill" />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/SparkleButton.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SparkleButton.tsx __tests__/components/SparkleButton.test.tsx
git commit -m "feat: add SparkleButton with periodic bling animation"
```

### Task 8: Create SupportPanel Component

**Files:**
- Create: `src/components/SupportPanel.tsx`
- Test: `__tests__/components/SupportPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SupportPanel.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SupportPanel } from '../../src/components/SupportPanel';

describe('SupportPanel', () => {
  it('renders the creator message', () => {
    const { getByText } = render(
      <SupportPanel visible={true} onClose={() => {}} />
    );
    expect(getByText(/I made this app/)).toBeTruthy();
  });

  it('renders support links', () => {
    const { getByText } = render(
      <SupportPanel visible={true} onClose={() => {}} />
    );
    expect(getByText(/books/i)).toBeTruthy();
    expect(getByText(/podcast/i)).toBeTruthy();
    expect(getByText(/coffee/i)).toBeTruthy();
    expect(getByText(/rate/i)).toBeTruthy();
  });

  it('calls onClose when dismiss is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <SupportPanel visible={true} onClose={onClose} />
    );
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <SupportPanel visible={false} onClose={() => {}} />
    );
    expect(queryByText(/I made this app/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/SupportPanel.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement SupportPanel**

Create `src/components/SupportPanel.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface SupportPanelProps {
  visible: boolean;
  onClose: () => void;
}

// IMPORTANT: Replace these placeholder URLs with the creator's actual links before shipping
const LINKS = [
  { label: 'Check out my books', url: 'https://amazon.com/author/REPLACE_ME' },
  { label: 'Listen to the podcast', url: 'https://podcast.example.com/REPLACE_ME' },
  { label: 'Buy me a coffee', url: 'https://patreon.com/REPLACE_ME' },
  { label: 'Rate & share the app', url: 'store-review' },
];

export function SupportPanel({ visible, onClose }: SupportPanelProps) {
  if (!visible) return null;

  async function handleLink(url: string) {
    if (url === 'store-review') {
      // expo-store-review handles both iOS and Android app store review prompts
      try {
        const StoreReview = require('expo-store-review');
        if (await StoreReview.hasAction()) {
          await StoreReview.requestReview();
        }
      } catch {
        // Silently fail if store review is not available (e.g., dev builds)
      }
    } else if (url) {
      Linking.openURL(url);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.message}>
            I made this app because I was sick of this problem. I don't collect
            your data, no ads. But if you'd like to help me out...
          </Text>

          {LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.linkButton}
              onPress={() => handleLink(link.url)}
            >
              <Text style={styles.linkText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing.sm,
  },
  closeText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  message: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  linkButton: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  linkText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/SupportPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/SupportPanel.tsx __tests__/components/SupportPanel.test.tsx
git commit -m "feat: add SupportPanel bottom sheet with creator message and links"
```

### Task 9: Integrate Sparkle Button + Support Panel into Home Screen

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Add sparkle button and support panel to home screen**

In `app/index.tsx`, add imports and state:
```typescript
import { SparkleButton } from '../src/components/SparkleButton';
import { SupportPanel } from '../src/components/SupportPanel';

// Inside HomeScreen component:
const [supportVisible, setSupportVisible] = useState(false);
```

Add the SparkleButton in the top-right corner of the screen (inside SafeAreaView, positioned absolutely):
```typescript
<SparkleButton onPress={() => setSupportVisible(true)} />
<SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />
```

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: integrate sparkle button and support panel on home screen"
```

---

## Chunk 3: Location Controls

### Task 10: Add Radius to FetchOptions and Restaurant Provider

**Files:**
- Modify: `src/providers/types.ts`
- Modify: `src/providers/restaurantProvider.ts`
- Modify: `__tests__/providers/restaurantProvider.test.ts`

- [ ] **Step 1: Update the test for radius parameter**

Add to `__tests__/providers/restaurantProvider.test.ts`:
```typescript
it('passes radius to Yelp API in meters', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => yelpResponse,
  });

  await restaurantProvider.fetchCards({
    latitude: 40.7128,
    longitude: -74.006,
    radius: 10, // 10 miles
  });

  const url = mockFetch.mock.calls[0][0] as string;
  // 10 miles = 16093 meters
  expect(url).toContain('radius=16093');
});

it('defaults to 5 mile radius when not specified', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => yelpResponse,
  });

  await restaurantProvider.fetchCards({
    latitude: 40.7128,
    longitude: -74.006,
  });

  const url = mockFetch.mock.calls[0][0] as string;
  // 5 miles = 8047 meters
  expect(url).toContain('radius=8047');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/providers/restaurantProvider.test.ts`
Expected: FAIL — URL doesn't contain radius param

- [ ] **Step 3: Add radius to FetchOptions**

In `src/providers/types.ts`, add `radius` to `FetchOptions`:
```typescript
export interface FetchOptions {
  latitude?: number;
  longitude?: number;
  page?: number;
  radius?: number; // in miles
}
```

- [ ] **Step 4: Update restaurantProvider to use radius**

In `src/providers/restaurantProvider.ts`:

Update `fetchFromYelp` to accept and use radius:
```typescript
async function fetchFromYelp(
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<CardItem[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_YELP_API_KEY;
  // Yelp caps radius at 40000 meters
  const clampedRadius = Math.min(radiusMeters, 40000);
  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?latitude=${latitude}&longitude=${longitude}&radius=${clampedRadius}&categories=restaurants&limit=20&sort_by=best_match`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return (data.businesses as YelpBusiness[]).map(mapYelpBusiness);
  } catch {
    return null;
  }
}
```

Update `fetchFromGoogle` similarly:
```typescript
async function fetchFromGoogle(
  latitude: number,
  longitude: number,
  radiusMeters: number
): Promise<CardItem[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radiusMeters}&type=restaurant&key=${apiKey}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return (data.results as GooglePlace[]).map(mapGooglePlace);
  } catch {
    return null;
  }
}
```

Update the provider's `fetchCards`:
```typescript
export const restaurantProvider: CardProvider = {
  async fetchCards(options: FetchOptions): Promise<CardItem[]> {
    const { latitude, longitude, radius } = options;
    if (latitude == null || longitude == null) return [];

    const MILES_TO_METERS = 1609.34;
    const radiusMiles = radius ?? 5;
    const radiusMeters = Math.round(radiusMiles * MILES_TO_METERS);

    const yelpResult = await fetchFromYelp(latitude, longitude, radiusMeters);
    if (yelpResult !== null) return yelpResult;

    const googleResult = await fetchFromGoogle(latitude, longitude, radiusMeters);
    if (googleResult !== null) return googleResult;

    return [];
  },
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/providers/restaurantProvider.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/providers/types.ts src/providers/restaurantProvider.ts __tests__/providers/restaurantProvider.test.ts
git commit -m "feat: add radius parameter to FetchOptions and restaurant provider"
```

### Task 11: Create RadiusSelector Component

**Files:**
- Create: `src/components/RadiusSelector.tsx`
- Test: `__tests__/components/RadiusSelector.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/RadiusSelector.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RadiusSelector } from '../../src/components/RadiusSelector';

describe('RadiusSelector', () => {
  it('renders all radius options', () => {
    const { getByText } = render(
      <RadiusSelector selected={5} onSelect={() => {}} />
    );
    expect(getByText('1 mi')).toBeTruthy();
    expect(getByText('5 mi')).toBeTruthy();
    expect(getByText('10 mi')).toBeTruthy();
    expect(getByText('25 mi')).toBeTruthy();
  });

  it('highlights the selected radius', () => {
    const { getByText } = render(
      <RadiusSelector selected={5} onSelect={() => {}} />
    );
    // The selected option should have a different style — we verify it renders
    expect(getByText('5 mi')).toBeTruthy();
  });

  it('calls onSelect with the chosen radius', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <RadiusSelector selected={5} onSelect={onSelect} />
    );
    fireEvent.press(getByText('10 mi'));
    expect(onSelect).toHaveBeenCalledWith(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/RadiusSelector.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement RadiusSelector**

Create `src/components/RadiusSelector.tsx`:
```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

const RADIUS_OPTIONS = [1, 5, 10, 25];

interface RadiusSelectorProps {
  selected: number;
  onSelect: (radius: number) => void;
}

export function RadiusSelector({ selected, onSelect }: RadiusSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Search radius</Text>
      <View style={styles.options}>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.pill, selected === r && styles.pillSelected]}
            onPress={() => onSelect(r)}
          >
            <Text style={[styles.pillText, selected === r && styles.pillTextSelected]}>
              {r} mi
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  options: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/RadiusSelector.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/RadiusSelector.tsx __tests__/components/RadiusSelector.test.tsx
git commit -m "feat: add RadiusSelector component with preset distance pills"
```

### Task 12: Install react-native-maps and Create Location Picker Screen

**Files:**
- Modify: `package.json`
- Create: `app/location-picker.tsx`

- [ ] **Step 1: Install react-native-maps**

```bash
npx expo install react-native-maps
```

- [ ] **Step 2: Create location picker screen**

Create `app/location-picker.tsx`:
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { colors, spacing, typography } from '../src/theme';

export default function LocationPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();

  const initialLat = params.latitude ? parseFloat(params.latitude) : 37.7749;
  const initialLng = params.longitude ? parseFloat(params.longitude) : -122.4194;

  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLat,
    longitude: initialLng,
  });

  const [region, setRegion] = useState<Region>({
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    // If no initial coords provided, get current location
    if (!params.latitude) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setSelectedLocation(coords);
          setRegion((r) => ({ ...r, ...coords }));
        }
      })();
    }
  }, [params.latitude]);

  function handleConfirm() {
    // Navigate back to the calling screen with the picked location as params.
    // Use router.navigate (not back + setParams) so params arrive on the previous screen.
    router.navigate({
      pathname: '/swipe',
      params: {
        topic: 'food',
        pickedLatitude: selectedLocation.latitude.toString(),
        pickedLongitude: selectedLocation.longitude.toString(),
      },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pick Location</Text>
        <TouchableOpacity onPress={handleConfirm}>
          <Text style={styles.confirmButton}>Done</Text>
        </TouchableOpacity>
      </View>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
      >
        <Marker coordinate={selectedLocation} draggable onDragEnd={(e) => setSelectedLocation(e.nativeEvent.coordinate)} />
      </MapView>
      <Text style={styles.hint}>Tap or drag the pin to set your search center</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.subtitle,
  },
  backButton: {
    ...typography.body,
    color: colors.primary,
  },
  confirmButton: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json app/location-picker.tsx
git commit -m "feat: add location picker screen with map view"
```

### Task 13: Integrate Radius Selector into Swipe Screen

**Files:**
- Modify: `app/swipe.tsx`
- Modify: `src/hooks/useCards.ts`

- [ ] **Step 1: Update useCards to accept radius**

In `src/hooks/useCards.ts`, add radius to the hook parameters:
```typescript
export function useCards(
  topic: Topic,
  location?: { latitude: number; longitude: number },
  options?: { enabled?: boolean; radius?: number }
): UseCardsResult {
```

And pass it through to the provider:
```typescript
const fetchOptions: FetchOptions = {
  latitude: location?.latitude,
  longitude: location?.longitude,
  radius: options?.radius,
};
```

Add `options?.radius` to the `useEffect` dependency array.

- [ ] **Step 2: Add RadiusSelector to swipe screen for food topic**

In `app/swipe.tsx`:
- Add `import { RadiusSelector } from '../src/components/RadiusSelector';`
- Add state: `const [radius, setRadius] = useState(5);`
- Show `RadiusSelector` above the SwipeDeck when `topic === 'food'`
- Pass `radius` to `useCards`: `{ enabled: locationReady, radius }`
- Add a "Pick location" button that navigates to `/location-picker`

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCards.ts app/swipe.tsx
git commit -m "feat: integrate radius selector and location picker into swipe screen"
```

---

## Chunk 4: Firebase Setup & Group Mode

### Task 14: Install Firebase Dependencies

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install Firebase packages**

```bash
npx expo install @react-native-firebase/app @react-native-firebase/database
```

Note: If `@react-native-firebase` has compatibility issues with Expo Go, use the Firebase JS SDK instead:
```bash
npm install firebase
```

The Firebase JS SDK (`firebase` package) works in Expo Go without native modules. Use `firebase/database` for Realtime Database.

- [ ] **Step 2: Update .env.example**

Add Firebase config to `.env.example`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install Firebase JS SDK and update env template"
```

### Task 15: Create Firebase Service

**Files:**
- Create: `src/services/firebase.ts`

- [ ] **Step 1: Create Firebase initialization**

Create `src/services/firebase.ts`:
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);
```

- [ ] **Step 2: Commit**

```bash
git add src/services/firebase.ts
git commit -m "feat: add Firebase initialization service"
```

### Task 16: Create Device ID Service

**Files:**
- Create: `src/services/deviceId.ts`
- Test: `__tests__/services/deviceId.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/services/deviceId.test.ts`:
```typescript
import { getDeviceId } from '../../src/services/deviceId';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('getDeviceId', () => {
  it('returns existing device ID if stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('existing-id-123');
    const id = await getDeviceId();
    expect(id).toBe('existing-id-123');
  });

  it('generates and stores new ID if none exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const id = await getDeviceId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('whato-device-id', id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/deviceId.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Install AsyncStorage**

```bash
npx expo install @react-native-async-storage/async-storage
```

- [ ] **Step 4: Implement deviceId service**

Create `src/services/deviceId.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'whato-device-id';

function generateId(): string {
  // Simple random ID — no crypto needed for anonymous device identification
  return 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const newId = generateId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  return newId;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/services/deviceId.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/services/deviceId.ts __tests__/services/deviceId.test.ts package.json package-lock.json
git commit -m "feat: add device ID service for anonymous session identification"
```

### Task 17: Create Session Service

**Files:**
- Create: `src/services/sessionService.ts`
- Test: `__tests__/services/sessionService.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/services/sessionService.test.ts`:
```typescript
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
    expect(result.unanimous).toEqual(['a']); // all 3 swiped right
  });

  it('identifies majority matches', () => {
    const result = computeMatches(participants);
    expect(result.majority).toContain('b'); // 2/3 swiped right
    expect(result.majority).toContain('c'); // 2/3 swiped right
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/sessionService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement session service**

Create `src/services/sessionService.ts`:
```typescript
import { ref, set, get, onValue, update, off } from 'firebase/database';
import { database } from './firebase';
import { CardItem, Topic } from '../providers/types';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PARTICIPANTS = 8;

export interface SessionData {
  topic: Topic;
  status: 'waiting' | 'active' | 'complete';
  createdBy: string;
  createdAt: number;
  location?: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };
  cards: CardItem[];
  participants: Record<string, ParticipantData>;
}

export interface ParticipantData {
  name: string;
  joinedAt: number;
  completed?: boolean;
  swipes?: Record<string, boolean>;
}

export interface MatchResult {
  unanimous: string[]; // card IDs everyone swiped right on
  majority: string[];  // card IDs >50% swiped right on (excluding unanimous)
}

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I for clarity
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `WHATO-${code}`;
}

export function isSessionExpired(createdAt: number): boolean {
  return Date.now() - createdAt > SESSION_TTL_MS;
}

export function computeMatches(
  participants: Record<string, { name: string; swipes: Record<string, boolean> }>
): MatchResult {
  const participantIds = Object.keys(participants);
  const totalParticipants = participantIds.length;
  if (totalParticipants === 0) return { unanimous: [], majority: [] };

  // Collect all card IDs from all swipes
  const allCardIds = new Set<string>();
  for (const p of participantIds) {
    const swipes = participants[p].swipes;
    if (swipes) {
      for (const cardId of Object.keys(swipes)) {
        allCardIds.add(cardId);
      }
    }
  }

  const unanimous: string[] = [];
  const majority: string[] = [];

  for (const cardId of allCardIds) {
    let yesCount = 0;
    for (const p of participantIds) {
      if (participants[p].swipes?.[cardId] === true) {
        yesCount++;
      }
    }

    if (yesCount === totalParticipants) {
      unanimous.push(cardId);
    } else if (yesCount > totalParticipants / 2) {
      majority.push(cardId);
    }
  }

  return { unanimous, majority };
}

export async function createSession(
  code: string,
  topic: Topic,
  deviceId: string,
  displayName: string,
  cards: CardItem[],
  location?: { latitude: number; longitude: number; radiusMiles: number }
): Promise<void> {
  const sessionRef = ref(database, `sessions/${code}`);
  const sessionData: SessionData = {
    topic,
    status: 'waiting',
    createdBy: deviceId,
    createdAt: Date.now(),
    ...(location && { location }),
    cards,
    participants: {
      [deviceId]: {
        name: displayName,
        joinedAt: Date.now(),
      },
    },
  };
  await set(sessionRef, sessionData);
}

export async function joinSession(
  code: string,
  deviceId: string,
  displayName: string
): Promise<{ success: boolean; error?: string }> {
  const sessionRef = ref(database, `sessions/${code}`);
  const snapshot = await get(sessionRef);

  if (!snapshot.exists()) {
    return { success: false, error: 'Session not found' };
  }

  const session = snapshot.val() as SessionData;

  if (isSessionExpired(session.createdAt)) {
    return { success: false, error: 'Session has expired' };
  }

  if (session.status === 'active') {
    return { success: false, error: 'Session already started' };
  }

  if (session.status === 'complete') {
    return { success: false, error: 'Session has ended' };
  }

  const participantCount = Object.keys(session.participants || {}).length;
  if (participantCount >= MAX_PARTICIPANTS) {
    return { success: false, error: 'Session is full (max 8 participants)' };
  }

  await update(ref(database, `sessions/${code}/participants/${deviceId}`), {
    name: displayName,
    joinedAt: Date.now(),
  });

  return { success: true };
}

export async function startSession(code: string): Promise<void> {
  await update(ref(database, `sessions/${code}`), { status: 'active' });
}

export async function endSession(code: string): Promise<void> {
  await update(ref(database, `sessions/${code}`), { status: 'complete' });
}

export async function recordSwipe(
  code: string,
  deviceId: string,
  cardId: string,
  liked: boolean
): Promise<void> {
  await update(
    ref(database, `sessions/${code}/participants/${deviceId}/swipes`),
    { [cardId]: liked }
  );
}

export async function markCompleted(
  code: string,
  deviceId: string
): Promise<void> {
  await update(ref(database, `sessions/${code}/participants/${deviceId}`), {
    completed: true,
  });
}

export function listenToSession(
  code: string,
  callback: (session: SessionData | null) => void
): () => void {
  const sessionRef = ref(database, `sessions/${code}`);
  const handler = onValue(sessionRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as SessionData) : null);
  });
  return () => off(sessionRef, 'value', handler);
}

export async function getSession(code: string): Promise<SessionData | null> {
  const snapshot = await get(ref(database, `sessions/${code}`));
  return snapshot.exists() ? (snapshot.val() as SessionData) : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/sessionService.test.ts`
Expected: PASS (the test only tests pure functions, not Firebase operations)

- [ ] **Step 5: Commit**

```bash
git add src/services/sessionService.ts __tests__/services/sessionService.test.ts
git commit -m "feat: add session service with create/join/match computation"
```

### Task 18: Install expo-sms and Configure Deep Linking

**Files:**
- Modify: `package.json`
- Modify: `app.json`

- [ ] **Step 1: Install expo-sms**

```bash
npx expo install expo-sms
```

- [ ] **Step 2: Verify deep link scheme in app.json**

The `app.json` already has `"scheme": "whato"` — this enables `whato://` URLs. Verify it's present.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install expo-sms for session invites"
```

### Task 19: Create Group Mode Screens — Lobby

**Files:**
- Create: `app/lobby.tsx`

- [ ] **Step 1: Create lobby screen**

Create `app/lobby.tsx`:
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SMS from 'expo-sms';
import { colors, spacing, typography } from '../src/theme';
import { topicDisplayNames } from '../src/utils/topicLabels';
import { Topic } from '../src/providers/types';
import {
  listenToSession,
  startSession,
  SessionData,
} from '../src/services/sessionService';

export default function LobbyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code: string; topic: string; isCreator: string }>();
  const { code, topic, isCreator } = params;
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    if (!code) return;
    const unsub = listenToSession(code, (data) => {
      setSession(data);
      // If session started and I'm not the creator, go to swipe
      if (data?.status === 'active' && isCreator !== 'true') {
        router.replace({
          pathname: '/group-swipe',
          params: { code },
        });
      }
    });
    return unsub;
  }, [code, isCreator, router]);

  const handleInvite = useCallback(async () => {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('SMS not available', 'SMS is not available on this device.');
      return;
    }
    const topicLabel = topicDisplayNames[topic as Topic] ?? topic;
    await SMS.sendSMSAsync([], [
      `WhaTo... ${topicLabel} Join my session: whato://join/${code}`,
      `Don't have WhaTo? Get it on the App Store!`, // App Store URL will be added after app is published
    ].join('\n'));
  }, [code, topic]);

  const handleStart = useCallback(async () => {
    if (!code) return;
    await startSession(code);
    router.replace({
      pathname: '/group-swipe',
      params: { code },
    });
  }, [code, router]);

  const participants = session?.participants ? Object.values(session.participants) : [];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Session: {code}</Text>
      <Text style={styles.subtitle}>
        WhaTo... {topicDisplayNames[topic as Topic] ?? topic}
      </Text>

      <View style={styles.participantList}>
        <Text style={styles.sectionTitle}>
          Participants ({participants.length}/8)
        </Text>
        {participants.map((p, i) => (
          <Text key={i} style={styles.participant}>{p.name}</Text>
        ))}
        {participants.length === 0 && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        )}
      </View>

      <View style={styles.actions}>
        {isCreator === 'true' && (
          <>
            <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
              <Text style={styles.inviteText}>Invite via SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.startButton, participants.length < 2 && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={participants.length < 2}
            >
              <Text style={styles.startText}>Start Swiping</Text>
            </TouchableOpacity>
          </>
        )}
        {isCreator !== 'true' && (
          <Text style={styles.waitingText}>Waiting for host to start...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.subtitle,
    marginBottom: spacing.md,
  },
  participantList: {
    flex: 1,
    marginTop: spacing.xl,
  },
  participant: {
    ...typography.body,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  actions: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  inviteButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  inviteText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  startText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  waitingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/lobby.tsx
git commit -m "feat: add lobby screen with participant list and SMS invite"
```

### Task 20: Create Group Swipe Screen

**Files:**
- Create: `app/group-swipe.tsx`

- [ ] **Step 1: Create group swipe screen**

Create `app/group-swipe.tsx`:
```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SwipeDeck } from '../src/components/SwipeDeck';
import { CardItem } from '../src/providers/types';
import { colors, spacing, typography } from '../src/theme';
import { topicDisplayNames } from '../src/utils/topicLabels';
import {
  listenToSession,
  recordSwipe,
  markCompleted,
  SessionData,
} from '../src/services/sessionService';
import { getDeviceId } from '../src/services/deviceId';

export default function GroupSwipeScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    if (!code) return;
    const unsub = listenToSession(code, (data) => {
      setSession(data);
      if (data?.cards && cards.length === 0) {
        setCards(data.cards);
      }
      // If session is complete, go to results
      if (data?.status === 'complete') {
        router.replace({ pathname: '/group-result', params: { code } });
      }
      // Check if all participants are done
      if (data?.participants) {
        const allDone = Object.values(data.participants).every((p) => p.completed);
        if (allDone && Object.keys(data.participants).length > 0) {
          router.replace({ pathname: '/group-result', params: { code } });
        }
      }
    });
    return unsub;
  }, [code, router, cards.length]);

  const handleSwipeRight = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        await recordSwipe(code, deviceId, card.id, true);
      }
    },
    [code, deviceId]
  );

  const handleSwipeLeft = useCallback(
    async (card: CardItem) => {
      if (code && deviceId) {
        await recordSwipe(code, deviceId, card.id, false);
      }
    },
    [code, deviceId]
  );

  const handleEmpty = useCallback(async () => {
    if (code && deviceId) {
      await markCompleted(code, deviceId);
    }
  }, [code, deviceId]);

  if (!session || cards.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { marginTop: spacing.md }]}>
          Loading session...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>
          {topicDisplayNames[session.topic] ?? 'Swipe'}
        </Text>
        <Text style={styles.code}>{code}</Text>
      </View>
      <SwipeDeck
        cards={cards}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
        onEmpty={handleEmpty}
      />
      <View style={styles.hints}>
        <Text style={typography.caption}>← Nope</Text>
        <Text style={typography.caption}>Yes! →</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  header: {
    ...typography.subtitle,
  },
  code: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/group-swipe.tsx
git commit -m "feat: add group swipe screen with Firebase sync"
```

### Task 21: Create Group Results Screen

**Files:**
- Create: `app/group-result.tsx`

- [ ] **Step 1: Create group results screen**

Create `app/group-result.tsx`:
```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, cardStyle } from '../src/theme';
import { getSession, computeMatches, SessionData } from '../src/services/sessionService';
import { CardItem } from '../src/providers/types';

function getTopVotedCards(session: SessionData): CardItem[] {
  const participants = Object.values(session.participants || {});
  const voteCounts = new Map<string, number>();
  for (const p of participants) {
    if (p.swipes) {
      for (const [cardId, liked] of Object.entries(p.swipes)) {
        if (liked) voteCounts.set(cardId, (voteCounts.get(cardId) ?? 0) + 1);
      }
    }
  }
  const cardMap = new Map(session.cards.map((c) => [c.id, c]));
  return [...voteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => cardMap.get(id))
    .filter(Boolean) as CardItem[];
}

export default function GroupResultScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    if (code) {
      getSession(code).then(setSession);
    }
  }, [code]);

  if (!session) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={typography.body}>Loading results...</Text>
      </SafeAreaView>
    );
  }

  const matches = computeMatches(
    session.participants as Record<string, { name: string; swipes: Record<string, boolean> }>
  );

  const cardMap = new Map<string, CardItem>();
  for (const card of session.cards) {
    cardMap.set(card.id, card);
  }

  const unanimousCards = matches.unanimous.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
  const majorityCards = matches.majority.map((id) => cardMap.get(id)).filter(Boolean) as CardItem[];
  const hasMatches = unanimousCards.length > 0 || majorityCards.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>
          {hasMatches ? 'You matched!' : 'Close enough?'}
        </Text>
        <Text style={styles.subtitle}>
          {hasMatches
            ? `${unanimousCards.length + majorityCards.length} match${unanimousCards.length + majorityCards.length !== 1 ? 'es' : ''} found`
            : 'Nobody agreed on anything, but here are the top picks'}
        </Text>

        {unanimousCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Everyone agreed</Text>
            {unanimousCards.map((card) => (
              <ResultCard key={card.id} card={card} />
            ))}
          </View>
        )}

        {majorityCards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most people liked</Text>
            {majorityCards.map((card) => (
              <ResultCard key={card.id} card={card} />
            ))}
          </View>
        )}

        {!hasMatches && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top voted</Text>
            {getTopVotedCards(session).map((card) => (
              <ResultCard key={card.id} card={card} />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.homeButton} onPress={() => router.replace('/')}>
          <Text style={styles.homeText}>Start Over</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultCard({ card }: { card: CardItem }) {
  return (
    <View style={resultStyles.card}>
      {card.imageUrl && (
        <Image source={{ uri: card.imageUrl }} style={resultStyles.image} />
      )}
      <View style={resultStyles.info}>
        <Text style={resultStyles.title}>{card.title}</Text>
        <Text style={resultStyles.subtitle}>{card.subtitle}</Text>
        {card.rating != null && (
          <Text style={resultStyles.rating}>★ {card.rating}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  homeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  homeText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

const resultStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    ...cardStyle,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  image: {
    width: 80,
    height: 80,
  },
  info: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    ...typography.body,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  rating: {
    ...typography.caption,
    color: colors.secondary,
    marginTop: spacing.xs,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/group-result.tsx
git commit -m "feat: add group results screen with match computation display"
```

### Task 22: Create Join Screen (Deep Link Handler)

**Files:**
- Create: `app/join.tsx`

- [ ] **Step 1: Create join screen**

Create `app/join.tsx`:
```typescript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../src/theme';
import { joinSession } from '../src/services/sessionService';
import { getDeviceId } from '../src/services/deviceId';

export default function JoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? '');
  const [name, setName] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Missing info', 'Please enter the session code and your name.');
      return;
    }

    setJoining(true);
    try {
      const deviceId = await getDeviceId();
      const result = await joinSession(code.trim().toUpperCase(), deviceId, name.trim());

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
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.replace('/')}>
        <Text style={styles.backButton}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Join Session</Text>

        <Text style={styles.label}>Session Code</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="WHATO-XXXX"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          placeholderTextColor={colors.textSecondary}
          autoCorrect={false}
          maxLength={20}
        />

        <TouchableOpacity
          style={[styles.joinButton, joining && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.joinText}>Join</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  backButton: {
    ...typography.body,
    color: colors.primary,
    paddingVertical: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.textSecondary,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  joinText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/join.tsx
git commit -m "feat: add join screen for entering session code and name"
```

### Task 23: Add Group Mode Entry to Home Screen

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Add group mode flow to home screen**

In `app/index.tsx`, add group mode as an inline state machine within the home screen. The flow uses `groupStep` state to walk through: idle → pick topic → enter name (+ location for Eat?) → creating → lobby.

Add imports:
```typescript
import { useState } from 'react';
import { TextInput, Alert, ActivityIndicator } from 'react-native';
import { getDeviceId } from '../src/services/deviceId';
import { createSession, generateSessionCode } from '../src/services/sessionService';
import { movieProvider } from '../src/providers/movieProvider';
import { showProvider } from '../src/providers/showProvider';
import { restaurantProvider } from '../src/providers/restaurantProvider';
import * as Location from 'expo-location';
```

Add state:
```typescript
const [groupStep, setGroupStep] = useState<'idle' | 'pick-topic' | 'enter-name' | 'creating'>('idle');
const [groupTopic, setGroupTopic] = useState<Topic | null>(null);
const [displayName, setDisplayName] = useState('');
```

Add the group session creation handler — this fetches cards from the appropriate provider and freezes them in the session:
```typescript
const providers = { movie: movieProvider, show: showProvider, food: restaurantProvider };

async function handleCreateGroup() {
  if (!groupTopic || !displayName.trim()) {
    Alert.alert('Missing info', 'Please select a topic and enter your name.');
    return;
  }
  setGroupStep('creating');
  try {
    const code = generateSessionCode();
    const deviceId = await getDeviceId();

    // Fetch cards — for food, get current location first
    let fetchOptions: { latitude?: number; longitude?: number } = {};
    if (groupTopic === 'food') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        fetchOptions = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }
    }

    const cards = await providers[groupTopic].fetchCards(fetchOptions);
    if (cards.length === 0) {
      Alert.alert('No results', 'Could not find any options. Try again later.');
      setGroupStep('enter-name');
      return;
    }

    const location = groupTopic === 'food' && fetchOptions.latitude
      ? { latitude: fetchOptions.latitude, longitude: fetchOptions.longitude!, radiusMiles: 5 }
      : undefined;

    await createSession(code, groupTopic, deviceId, displayName.trim(), cards, location);
    setGroupStep('idle');
    router.push({ pathname: '/lobby', params: { code, topic: groupTopic, isCreator: 'true' } });
  } catch {
    Alert.alert('Error', 'Could not create session. Please try again.');
    setGroupStep('enter-name');
  }
}
```

Add the group mode UI below the solo topic buttons. When `groupStep === 'idle'`, show two buttons:
```typescript
{groupStep === 'idle' && (
  <View style={styles.groupSection}>
    <TouchableOpacity style={styles.groupButton} onPress={() => setGroupStep('pick-topic')}>
      <Text style={styles.groupButtonText}>Group Mode</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/join')}>
      <Text style={styles.joinButtonText}>Join Session</Text>
    </TouchableOpacity>
  </View>
)}

{groupStep === 'pick-topic' && (
  <View style={styles.groupSection}>
    <Text style={styles.groupTitle}>Pick a topic for the group</Text>
    <TopicButton label={topicDisplayNames.food} color={topicColors.food} icon="ForkKnife"
      onPress={() => { setGroupTopic('food'); setGroupStep('enter-name'); }} />
    <TopicButton label={topicDisplayNames.movie} color={topicColors.movie} icon="FilmSlate"
      onPress={() => { setGroupTopic('movie'); setGroupStep('enter-name'); }} />
    <TopicButton label={topicDisplayNames.show} color={topicColors.show} icon="Television"
      onPress={() => { setGroupTopic('show'); setGroupStep('enter-name'); }} />
  </View>
)}

{groupStep === 'enter-name' && (
  <View style={styles.groupSection}>
    <Text style={styles.groupTitle}>Your display name</Text>
    <TextInput
      style={styles.nameInput}
      value={displayName}
      onChangeText={setDisplayName}
      placeholder="Enter your name"
      placeholderTextColor={colors.textSecondary}
      maxLength={20}
      autoCorrect={false}
    />
    <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
      <Text style={styles.createButtonText}>Create Session</Text>
    </TouchableOpacity>
  </View>
)}

{groupStep === 'creating' && (
  <View style={styles.groupSection}>
    <ActivityIndicator size="large" color={colors.primary} />
    <Text style={[typography.body, { marginTop: spacing.md }]}>Creating session...</Text>
  </View>
)}
```

Add corresponding styles for the group section, buttons, and text input.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: add group mode entry and join session button to home screen"
```

### Task 24: Configure Deep Link Routing

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add deep link handling**

The `whato://join/WHATO-XXXX` URL needs to route to the join screen. With expo-router's file-based routing, create a route that handles the deep link.

Add to `app/_layout.tsx` a useEffect that listens for incoming URLs:
```typescript
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';

// Inside RootLayout:
const router = useRouter();

useEffect(() => {
  function handleUrl(event: { url: string }) {
    const parsed = Linking.parse(event.url);
    // URL format: whato://join/WHATO-7K3M → parsed.path = "join/WHATO-7K3M"
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

  // Handle initial URL (app opened from deep link)
  Linking.getInitialURL().then((url) => {
    if (url) handleUrl({ url });
  });

  return () => subscription.remove();
}, [router]);
```

- [ ] **Step 2: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add deep link handling for whato://join URLs"
```

### Task 25: Final Integration & Verification

**Files:**
- All files

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run expo-doctor**

Run: `npx expo-doctor`
Expected: All checks pass

- [ ] **Step 3: Verify the app starts**

Run: `npx expo start`
Expected: App loads in Expo Go without errors. Verify:
- New theme (cream background, coral/amber/purple accents)
- Logo renders as speech bubble
- Topic buttons show "Eat?", "Watch?", "Stream?"
- Sparkle button visible on home screen, opens support panel
- Radius selector appears for Eat? topic
- Group mode flow works end-to-end (requires Firebase project setup)

- [ ] **Step 4: Commit any remaining fixes**

```bash
git status
# Review the list, then add specific files (avoid staging .env or build artifacts):
git add app/ src/ __tests__/ package.json package-lock.json
git commit -m "feat: Phase 2 final integration and cleanup"
```

- [ ] **Step 5: Add .superpowers to .gitignore**

```bash
echo ".superpowers/" >> .gitignore
git add .gitignore
git commit -m "chore: add .superpowers to gitignore"
```
