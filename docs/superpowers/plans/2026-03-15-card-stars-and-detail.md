# Card Star Ratings + Tap-to-Open Detail View

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show star ratings on swipe cards and add a tap-to-open detail modal with rich info (overview, reviews link, map link, menu link for restaurants).

**Architecture:** Add a StarRating component, update SwipeCard to show it and handle taps, create a CardDetail modal component. The SwipeDeck gesture needs to distinguish taps from swipes.

**Tech Stack:** React Native, Phosphor Icons (Star), expo-linking

---

## Chunk 1: Star Ratings + Card Detail

### Task 1: Create StarRating Component

**Files:**
- Create: `src/components/StarRating.tsx`
- Test: `__tests__/components/StarRating.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/StarRating.test.tsx`:
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { StarRating } from '../../src/components/StarRating';

describe('StarRating', () => {
  it('renders correct number of filled stars for whole rating', () => {
    const { getAllByTestId } = render(<StarRating rating={4} />);
    const filled = getAllByTestId('star-filled');
    expect(filled.length).toBe(4);
  });

  it('renders half star for fractional rating', () => {
    const { getAllByTestId, getByTestId } = render(<StarRating rating={3.5} />);
    const filled = getAllByTestId('star-filled');
    expect(filled.length).toBe(3);
    expect(getByTestId('star-half')).toBeTruthy();
  });

  it('renders 5 stars total', () => {
    const { getAllByTestId } = render(<StarRating rating={2} />);
    const filled = getAllByTestId('star-filled');
    const empty = getAllByTestId('star-empty');
    expect(filled.length + empty.length).toBe(5);
  });

  it('renders nothing when rating is null', () => {
    const { queryByTestId } = render(<StarRating rating={null} />);
    expect(queryByTestId('star-filled')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/StarRating.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement StarRating**

Create `src/components/StarRating.tsx`:
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Star, StarHalf } from 'phosphor-react-native';

interface StarRatingProps {
  rating: number | null;
  size?: number;
  color?: string;
}

export function StarRating({ rating, size = 16, color = '#F5A623' }: StarRatingProps) {
  if (rating == null) return null;

  const clamped = Math.max(0, Math.min(5, rating));
  const fullStars = Math.floor(clamped);
  const hasHalf = clamped - fullStars >= 0.25 && clamped - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <View style={styles.container}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`f${i}`} testID="star-filled" size={size} color={color} weight="fill" />
      ))}
      {hasHalf && (
        <StarHalf testID="star-half" size={size} color={color} weight="fill" />
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`e${i}`} testID="star-empty" size={size} color={color} weight="regular" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/StarRating.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StarRating.tsx __tests__/components/StarRating.test.tsx
git commit -m "feat: add StarRating component with filled, half, and empty stars"
```

### Task 2: Add Stars to SwipeCard and Replace Numeric Rating Badge

**Files:**
- Modify: `src/components/SwipeCard.tsx`

- [ ] **Step 1: Update SwipeCard to use StarRating**

In `src/components/SwipeCard.tsx`:
- Add import: `import { StarRating } from './StarRating';`
- Replace the ratingBadge with StarRating
- Remove the old ratingBadge and ratingText styles

Replace the rating section in the titleRow:
```typescript
{card.rating != null && (
  <StarRating rating={card.rating} size={18} />
)}
```

Remove the old `ratingBadge` and `ratingText` styles.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/components/SwipeCard.tsx
git commit -m "feat: show star ratings on swipe cards instead of numeric badge"
```

### Task 3: Create CardDetail Modal Component

**Files:**
- Create: `src/components/CardDetail.tsx`
- Test: `__tests__/components/CardDetail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/CardDetail.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CardDetail } from '../../src/components/CardDetail';

const mockCard = {
  id: 'test-1',
  title: 'Test Restaurant',
  subtitle: 'Italian',
  imageUrl: 'https://example.com/img.jpg',
  rating: 4.5,
  details: ['Italian', '$$', '123 Main St'],
  sourceUrl: 'https://yelp.com/biz/test',
  meta: { source: 'yelp' },
};

describe('CardDetail', () => {
  it('renders card title and details', () => {
    const { getByText } = render(
      <CardDetail card={mockCard} visible={true} onClose={() => {}} topic="food" />
    );
    expect(getByText('Test Restaurant')).toBeTruthy();
    expect(getByText('Italian')).toBeTruthy();
  });

  it('renders action buttons for food topic', () => {
    const { getByText } = render(
      <CardDetail card={mockCard} visible={true} onClose={() => {}} topic="food" />
    );
    expect(getByText(/view on/i)).toBeTruthy();
  });

  it('calls onClose when back is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <CardDetail card={mockCard} visible={true} onClose={onClose} topic="food" />
    );
    fireEvent.press(getByText('← Back to swiping'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <CardDetail card={mockCard} visible={false} onClose={() => {}} topic="food" />
    );
    expect(queryByText('Test Restaurant')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/CardDetail.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CardDetail**

Create `src/components/CardDetail.tsx`:
```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Dimensions,
} from 'react-native';
import { colors, spacing, typography } from '../theme';
import { CardItem, Topic } from '../providers/types';
import { StarRating } from './StarRating';

interface CardDetailProps {
  card: CardItem;
  visible: boolean;
  onClose: () => void;
  topic: Topic;
}

function getActionButtons(card: CardItem, topic: Topic): { label: string; url: string }[] {
  const buttons: { label: string; url: string }[] = [];

  if (card.sourceUrl) {
    const sourceLabel = topic === 'food'
      ? (card.meta?.source === 'google' ? 'View on Google Maps' : 'View on Yelp')
      : (topic === 'movie' ? 'View on TMDB' : 'View on TMDB');
    buttons.push({ label: sourceLabel, url: card.sourceUrl });
  }

  if (topic === 'food') {
    // Google Maps directions link
    const encodedName = encodeURIComponent(card.title);
    buttons.push({
      label: 'Get Directions',
      url: `https://www.google.com/maps/search/?api=1&query=${encodedName}`,
    });

    // Search for menu
    buttons.push({
      label: 'Search for Menu',
      url: `https://www.google.com/search?q=${encodedName}+menu`,
    });
  }

  if (topic === 'movie' || topic === 'show') {
    const tmdbId = card.meta?.tmdbId;
    const type = topic === 'movie' ? 'movie' : 'tv';
    if (tmdbId) {
      buttons.push({
        label: 'View Trailer',
        url: `https://www.themoviedb.org/${type}/${tmdbId}/videos`,
      });
      buttons.push({
        label: 'View Reviews',
        url: `https://www.themoviedb.org/${type}/${tmdbId}/reviews`,
      });
    }
    // Search streaming availability
    const encodedTitle = encodeURIComponent(card.title);
    buttons.push({
      label: 'Where to Watch',
      url: `https://www.google.com/search?q=${encodedTitle}+streaming`,
    });
  }

  return buttons;
}

export function CardDetail({ card, visible, onClose, topic }: CardDetailProps) {
  if (!visible) return null;

  const overview = card.meta?.overview as string | undefined;
  const actions = getActionButtons(card, topic);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {card.imageUrl && (
              <Image source={{ uri: card.imageUrl }} style={styles.image} />
            )}

            <View style={styles.content}>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.subtitle}>{card.subtitle}</Text>

              {card.rating != null && (
                <View style={styles.ratingRow}>
                  <StarRating rating={card.rating} size={22} />
                  <Text style={styles.ratingNumber}>{card.rating.toFixed(1)}</Text>
                </View>
              )}

              {card.details.length > 0 && (
                <View style={styles.detailsSection}>
                  {card.details.map((d, i) => (
                    <Text key={i} style={styles.detail}>{d}</Text>
                  ))}
                </View>
              )}

              {overview && (
                <View style={styles.overviewSection}>
                  <Text style={styles.sectionTitle}>Overview</Text>
                  <Text style={styles.overviewText}>{overview}</Text>
                </View>
              )}

              <View style={styles.actionsSection}>
                {actions.map((action) => (
                  <TouchableOpacity
                    key={action.label}
                    style={styles.actionButton}
                    onPress={() => Linking.openURL(action.url)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>← Back to swiping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: SCREEN_HEIGHT * 0.9,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  scroll: {
    paddingBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 250,
  },
  content: {
    padding: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 26,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  ratingNumber: {
    ...typography.body,
    color: colors.secondary,
    fontWeight: '600',
  },
  detailsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  detail: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  overviewSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  sectionTitle: {
    ...typography.subtitle,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  overviewText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionsSection: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  closeText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/CardDetail.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CardDetail.tsx __tests__/components/CardDetail.test.tsx
git commit -m "feat: add CardDetail modal with rich info and action buttons"
```

### Task 4: Wire Tap-to-Open in SwipeDeck

**Files:**
- Modify: `src/components/SwipeDeck.tsx`
- Modify: `app/swipe.tsx`

- [ ] **Step 1: Add onTap callback to SwipeDeck**

In `src/components/SwipeDeck.tsx`:
- Add `onTap?: (card: CardItem) => void` to `SwipeDeckProps`
- Use `Gesture.Tap()` combined with the existing Pan gesture via `Gesture.Race()` or `Gesture.Exclusive()`. The tap should fire only when the user taps without dragging.

The simplest approach: use `Gesture.Tap()` and compose with `Gesture.Exclusive(panGesture, tapGesture)` so swipe takes priority. If the pan distance is below threshold and the user lifts, it snaps back (existing behavior). A dedicated tap gesture fires `onTap`.

```typescript
// Add to props:
onTap?: (card: CardItem) => void;

// Add tap gesture:
const tap = Gesture.Tap().onEnd(() => {
  if (onTap && cards[currentIndex]) {
    runOnJS(onTap)(cards[currentIndex]);
  }
});

// Compose gestures — pan takes priority over tap:
const composed = Gesture.Exclusive(gesture, tap);

// Replace <GestureDetector gesture={gesture}> with:
<GestureDetector gesture={composed}>
```

- [ ] **Step 2: Add CardDetail to swipe screen**

In `app/swipe.tsx`:
- Add imports for `CardDetail` and state for the detail modal
- Add `onTap` handler to SwipeDeck that opens the detail modal
- Render `<CardDetail>` in the component tree

```typescript
import { CardDetail } from '../src/components/CardDetail';

// Add state:
const [detailCard, setDetailCard] = useState<CardItem | null>(null);

// Add to SwipeDeck:
<SwipeDeck
  cards={cards}
  onSwipeRight={handleSwipeRight}
  onSwipeLeft={handleSwipeLeft}
  onEmpty={handleEmpty}
  onTap={(card) => setDetailCard(card)}
/>

// Add after SwipeDeck:
{detailCard && (
  <CardDetail
    card={detailCard}
    visible={true}
    onClose={() => setDetailCard(null)}
    topic={topic}
  />
)}
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/SwipeDeck.tsx app/swipe.tsx
git commit -m "feat: tap card to open detail modal with rich info and actions"
```
