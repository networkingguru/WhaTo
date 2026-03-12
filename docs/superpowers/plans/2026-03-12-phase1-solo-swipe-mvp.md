# Whato Phase 1: Solo Swipe MVP — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working solo-mode Whato app where a user picks a topic (Food, Movie, or Show), swipes through cards fetched from real APIs, and sees a result screen when they swipe right.

**Architecture:** Expo (React Native) app using file-based routing via expo-router. Three screens: topic selection → swipe → result. Data providers abstract API calls behind a common `CardItem` interface so Yelp/Google/TMDB can be swapped without UI changes. Gesture handling via react-native-gesture-handler and react-native-reanimated.

**Tech Stack:** Expo SDK 52, TypeScript, expo-router, react-native-gesture-handler, react-native-reanimated, expo-location, Jest + React Native Testing Library

---

## File Structure

```
whato/
├── app/                          # Expo Router file-based routing
│   ├── _layout.tsx               # Root layout with gesture handler wrapper
│   ├── index.tsx                 # Home screen — topic selection
│   ├── swipe.tsx                 # Swipe screen — card deck
│   └── result.tsx                # Result screen — chosen item
├── src/
│   ├── components/
│   │   ├── TopicButton.tsx       # Styled button for topic selection
│   │   ├── SwipeCard.tsx         # Single card display (image, title, details)
│   │   └── SwipeDeck.tsx         # Animated card stack with swipe gestures
│   ├── providers/
│   │   ├── types.ts              # CardItem interface shared by all providers
│   │   ├── movieProvider.ts      # TMDB API — popular/trending movies
│   │   ├── showProvider.ts       # TMDB API — popular/trending shows
│   │   └── restaurantProvider.ts # Yelp API (primary) + Google Places (failover)
│   ├── hooks/
│   │   └── useCards.ts           # Fetches cards for a given topic, manages loading/error
│   └── theme.ts                  # Colors, typography, spacing constants
├── __tests__/
│   ├── providers/
│   │   ├── movieProvider.test.ts
│   │   ├── showProvider.test.ts
│   │   └── restaurantProvider.test.ts
│   ├── hooks/
│   │   └── useCards.test.ts
│   └── components/
│       ├── TopicButton.test.tsx
│       ├── SwipeCard.test.tsx
│       └── SwipeDeck.test.tsx
├── app.json
├── package.json
├── tsconfig.json
├── jest-setup.js                 # Reanimated v3 test setup
└── .env.example                  # Documents required API keys
```

---

## Chunk 1: Project Scaffolding & Foundation

### Task 1: Create Expo Project

**Files:**
- Create: `app.json`, `package.json`, `tsconfig.json` (via expo CLI)

- [ ] **Step 1: Initialize Expo project**

Run from `/Users/brianhill/Scripts/Whato`:
```bash
npx create-expo-app@latest . --template blank-typescript
```
Expected: Expo project scaffolded with TypeScript config in current directory.

- [ ] **Step 2: Install core dependencies**

```bash
npx expo install expo-router expo-location react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

- [ ] **Step 3: Install dev/test dependencies**

```bash
npm install --save-dev @testing-library/react-native jest-expo
```

- [ ] **Step 3b: Create jest-setup.js for Reanimated v3**

Create `jest-setup.js`:
```javascript
require('react-native-reanimated').setUpTests();
```

Add to `package.json` jest config (or create `jest.config.js`):
```json
"jest": {
  "preset": "jest-expo",
  "setupFiles": ["./jest-setup.js"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)"
  ]
}
```

- [ ] **Step 4: Configure expo-router in app.json**

Update `app.json` to set the entry point for expo-router:
```json
{
  "expo": {
    "name": "Whato",
    "slug": "whato",
    "scheme": "whato",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": ["expo-router"],
    "experiments": {
      "typedRoutes": true
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.whato.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.whato.app"
    },
    "web": {
      "bundler": "metro"
    }
  }
}
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:
```
EXPO_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
EXPO_PUBLIC_YELP_API_KEY=your_yelp_api_key_here
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

Add `.env` to `.gitignore` (Expo template should already have this, but verify).

- [ ] **Step 6: Verify project builds**

```bash
npx expo start --clear
```
Expected: Metro bundler starts. Press `q` to quit. We just need to confirm no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo project with TypeScript and core dependencies"
```

---

### Task 2: Theme & Shared Types

**Files:**
- Create: `src/theme.ts`
- Create: `src/providers/types.ts`

- [ ] **Step 1: Create theme file**

Create `src/theme.ts`:
```typescript
export const colors = {
  background: '#1A1A2E',
  surface: '#16213E',
  primary: '#E94560',
  primaryLight: '#FF6B81',
  text: '#EAEAEA',
  textSecondary: '#A0A0B0',
  accent: '#0F3460',
  success: '#4CAF50',
  shadow: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
} as const;

export const cardStyle = {
  borderRadius: 16,
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
} as const;
```

- [ ] **Step 2: Create CardItem interface**

Create `src/providers/types.ts`:
```typescript
export type Topic = 'food' | 'movie' | 'show';

export interface CardItem {
  id: string;
  title: string;
  subtitle: string;       // e.g. genre, cuisine type
  imageUrl: string | null;
  rating: number | null;   // 0-5 scale (normalized from source)
  details: string[];       // bullet points: year, runtime, price range, etc.
  sourceUrl: string | null; // deep link to Yelp/TMDB page
  meta: Record<string, unknown>; // provider-specific data for the result screen
}

export interface CardProvider {
  fetchCards(options: FetchOptions): Promise<CardItem[]>;
}

export interface FetchOptions {
  latitude?: number;
  longitude?: number;
  page?: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/theme.ts src/providers/types.ts
git commit -m "feat: add theme constants and CardItem interface"
```

---

### Task 3: Root Layout & Navigation Shell

**Files:**
- Create: `app/_layout.tsx`
- Remove: default `App.tsx` if it exists (Expo template artifact)

- [ ] **Step 1: Create root layout**

Create `app/_layout.tsx`:
```typescript
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 2: Create placeholder screens**

Create `app/index.tsx`:
```typescript
import { View, Text } from 'react-native';
import { colors, typography, spacing } from '../src/theme';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }}>
      <Text style={typography.title}>Whato</Text>
      <Text style={[typography.body, { marginTop: spacing.md }]}>Pick a topic to get started</Text>
    </View>
  );
}
```

Create `app/swipe.tsx`:
```typescript
import { View, Text } from 'react-native';
import { typography } from '../src/theme';

export default function SwipeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={typography.title}>Swipe</Text>
    </View>
  );
}
```

Create `app/result.tsx`:
```typescript
import { View, Text } from 'react-native';
import { typography } from '../src/theme';

export default function ResultScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={typography.title}>Result</Text>
    </View>
  );
}
```

- [ ] **Step 3: Remove App.tsx if present**

```bash
rm -f App.tsx
```

Update `package.json` main field to use expo-router:
```json
"main": "expo-router/entry"
```

- [ ] **Step 4: Verify navigation works**

```bash
npx expo start --clear
```
Expected: App opens to HomeScreen showing "Whato" title. No crashes.

- [ ] **Step 5: Commit**

```bash
git add app/ package.json
git rm -f App.tsx 2>/dev/null; true
git commit -m "feat: add expo-router navigation shell with placeholder screens"
```

---

## Chunk 2: Data Providers

### Task 4: TMDB Movie Provider

**Files:**
- Create: `src/providers/movieProvider.ts`
- Create: `__tests__/providers/movieProvider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/providers/movieProvider.test.ts`:
```typescript
import { movieProvider } from '../../src/providers/movieProvider';
import { CardItem } from '../../src/providers/types';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const tmdbMovieResponse = {
  results: [
    {
      id: 550,
      title: 'Fight Club',
      overview: 'An insomniac office worker...',
      poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      vote_average: 8.4,
      release_date: '1999-10-15',
      genre_ids: [18, 53],
    },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
  process.env.EXPO_PUBLIC_TMDB_API_KEY = 'test-key';
});

describe('movieProvider', () => {
  it('fetches trending movies and maps to CardItem format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tmdbMovieResponse,
    });

    const cards = await movieProvider.fetchCards({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.themoviedb.org/3/trending/movie/week'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual<CardItem>({
      id: 'tmdb-movie-550',
      title: 'Fight Club',
      subtitle: '1999',
      imageUrl: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      rating: 4.2,
      details: ['1999', 'Rating: 8.4/10'],
      sourceUrl: 'https://www.themoviedb.org/movie/550',
      meta: { tmdbId: 550, overview: 'An insomniac office worker...' },
    });
  });

  it('returns empty array on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const cards = await movieProvider.fetchCards({});
    expect(cards).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/providers/movieProvider.test.ts --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/providers/movieProvider.ts`:
```typescript
import { CardItem, CardProvider, FetchOptions } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
}

function mapMovie(movie: TmdbMovie): CardItem {
  const year = movie.release_date?.slice(0, 4) ?? 'Unknown';
  return {
    id: `tmdb-movie-${movie.id}`,
    title: movie.title,
    subtitle: year,
    imageUrl: movie.poster_path
      ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
      : null,
    rating: Math.round((movie.vote_average / 2) * 10) / 10, // 10-scale → 5-scale
    details: [year, `Rating: ${movie.vote_average}/10`],
    sourceUrl: `https://www.themoviedb.org/movie/${movie.id}`,
    meta: { tmdbId: movie.id, overview: movie.overview },
  };
}

export const movieProvider: CardProvider = {
  async fetchCards(options: FetchOptions): Promise<CardItem[]> {
    const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
    const page = options.page ?? 1;

    try {
      const response = await fetch(
        `${TMDB_BASE}/trending/movie/week?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.results as TmdbMovie[]).map(mapMovie);
    } catch {
      return [];
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/providers/movieProvider.test.ts --verbose
```
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/providers/movieProvider.ts __tests__/providers/movieProvider.test.ts
git commit -m "feat: add TMDB movie provider with tests"
```

---

### Task 5: TMDB Show Provider

**Files:**
- Create: `src/providers/showProvider.ts`
- Create: `__tests__/providers/showProvider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/providers/showProvider.test.ts`:
```typescript
import { showProvider } from '../../src/providers/showProvider';
import { CardItem } from '../../src/providers/types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const tmdbShowResponse = {
  results: [
    {
      id: 1399,
      name: 'Game of Thrones',
      overview: 'Seven noble families fight...',
      poster_path: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
      vote_average: 8.4,
      first_air_date: '2011-04-17',
      genre_ids: [10765, 18],
    },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
  process.env.EXPO_PUBLIC_TMDB_API_KEY = 'test-key';
});

describe('showProvider', () => {
  it('fetches trending shows and maps to CardItem format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tmdbShowResponse,
    });

    const cards = await showProvider.fetchCards({});

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.themoviedb.org/3/trending/tv/week'),
      expect.any(Object)
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual<CardItem>({
      id: 'tmdb-show-1399',
      title: 'Game of Thrones',
      subtitle: '2011',
      imageUrl: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
      rating: 4.2,
      details: ['2011', 'Rating: 8.4/10'],
      sourceUrl: 'https://www.themoviedb.org/tv/1399',
      meta: { tmdbId: 1399, overview: 'Seven noble families fight...' },
    });
  });

  it('returns empty array on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const cards = await showProvider.fetchCards({});
    expect(cards).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/providers/showProvider.test.ts --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/providers/showProvider.ts`:
```typescript
import { CardItem, CardProvider, FetchOptions } from './types';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TmdbShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
}

function mapShow(show: TmdbShow): CardItem {
  const year = show.first_air_date?.slice(0, 4) ?? 'Unknown';
  return {
    id: `tmdb-show-${show.id}`,
    title: show.name,
    subtitle: year,
    imageUrl: show.poster_path
      ? `${TMDB_IMAGE_BASE}${show.poster_path}`
      : null,
    rating: Math.round((show.vote_average / 2) * 10) / 10,
    details: [year, `Rating: ${show.vote_average}/10`],
    sourceUrl: `https://www.themoviedb.org/tv/${show.id}`,
    meta: { tmdbId: show.id, overview: show.overview },
  };
}

export const showProvider: CardProvider = {
  async fetchCards(options: FetchOptions): Promise<CardItem[]> {
    const apiKey = process.env.EXPO_PUBLIC_TMDB_API_KEY;
    const page = options.page ?? 1;

    try {
      const response = await fetch(
        `${TMDB_BASE}/trending/tv/week?page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      return (data.results as TmdbShow[]).map(mapShow);
    } catch {
      return [];
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/providers/showProvider.test.ts --verbose
```
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/providers/showProvider.ts __tests__/providers/showProvider.test.ts
git commit -m "feat: add TMDB show provider with tests"
```

---

### Task 6: Yelp Restaurant Provider (with Google Places Failover)

**Files:**
- Create: `src/providers/restaurantProvider.ts`
- Create: `__tests__/providers/restaurantProvider.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/providers/restaurantProvider.test.ts`:
```typescript
import { restaurantProvider } from '../../src/providers/restaurantProvider';
import { CardItem } from '../../src/providers/types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const yelpResponse = {
  businesses: [
    {
      id: 'yelp-abc123',
      name: 'Joes Pizza',
      image_url: 'https://s3-media1.fl.yelpcdn.com/bphoto/abc/o.jpg',
      rating: 4.5,
      categories: [{ alias: 'pizza', title: 'Pizza' }],
      price: '$$',
      location: {
        display_address: ['123 Main St', 'New York, NY 10001'],
      },
      url: 'https://www.yelp.com/biz/joes-pizza',
    },
  ],
};

const googleResponse = {
  results: [
    {
      place_id: 'google-xyz789',
      name: 'Burger Joint',
      photos: [{ photo_reference: 'photo-ref-123' }],
      rating: 4.0,
      types: ['restaurant', 'food'],
      price_level: 2,
      vicinity: '456 Oak Ave',
    },
  ],
};

beforeEach(() => {
  mockFetch.mockClear();
  process.env.EXPO_PUBLIC_YELP_API_KEY = 'yelp-test-key';
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY = 'google-test-key';
});

describe('restaurantProvider', () => {
  it('fetches from Yelp and maps to CardItem format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => yelpResponse,
    });

    const cards = await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('api.yelp.com/v3/businesses/search'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer yelp-test-key',
        }),
      })
    );

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'yelp-abc123',
      title: 'Joes Pizza',
      subtitle: 'Pizza',
      rating: 4.5,
    });
  });

  it('falls back to Google Places when Yelp fails', async () => {
    // Yelp fails
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // Google succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => googleResponse,
    });

    const cards = await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      id: 'google-xyz789',
      title: 'Burger Joint',
    });
  });

  it('returns empty array when both APIs fail', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const cards = await restaurantProvider.fetchCards({
      latitude: 40.7128,
      longitude: -74.006,
    });

    expect(cards).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/providers/restaurantProvider.test.ts --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/providers/restaurantProvider.ts`:
```typescript
import { CardItem, CardProvider, FetchOptions } from './types';

// --- Yelp ---

interface YelpBusiness {
  id: string;
  name: string;
  image_url: string;
  rating: number;
  categories: { alias: string; title: string }[];
  price?: string;
  location: { display_address: string[] };
  url: string;
}

function mapYelpBusiness(biz: YelpBusiness): CardItem {
  const cuisine = biz.categories.map((c) => c.title).join(', ');
  const address = biz.location.display_address.join(', ');
  return {
    id: biz.id,
    title: biz.name,
    subtitle: cuisine,
    imageUrl: biz.image_url || null,
    rating: biz.rating,
    details: [cuisine, biz.price ?? '', address].filter(Boolean),
    sourceUrl: biz.url,
    meta: { source: 'yelp' },
  };
}

async function fetchFromYelp(
  latitude: number,
  longitude: number
): Promise<CardItem[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_YELP_API_KEY;
  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?latitude=${latitude}&longitude=${longitude}&categories=restaurants&limit=20&sort_by=best_match`,
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

// --- Google Places ---

interface GooglePlace {
  place_id: string;
  name: string;
  photos?: { photo_reference: string }[];
  rating?: number;
  types: string[];
  price_level?: number;
  vicinity: string;
}

const PRICE_MAP: Record<number, string> = { 0: '', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

function mapGooglePlace(place: GooglePlace): CardItem {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  const photoRef = place.photos?.[0]?.photo_reference;
  const imageUrl = photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`
    : null;

  return {
    id: place.place_id,
    title: place.name,
    subtitle: place.types.filter((t) => t !== 'restaurant' && t !== 'point_of_interest' && t !== 'establishment').join(', ') || 'Restaurant',
    imageUrl,
    rating: place.rating ?? null,
    details: [
      PRICE_MAP[place.price_level ?? 0],
      place.vicinity,
    ].filter(Boolean),
    sourceUrl: null,
    meta: { source: 'google', placeId: place.place_id },
  };
}

async function fetchFromGoogle(
  latitude: number,
  longitude: number
): Promise<CardItem[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=restaurant&key=${apiKey}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return (data.results as GooglePlace[]).map(mapGooglePlace);
  } catch {
    return null;
  }
}

// --- Provider ---

export const restaurantProvider: CardProvider = {
  async fetchCards(options: FetchOptions): Promise<CardItem[]> {
    const { latitude, longitude } = options;
    if (latitude == null || longitude == null) return [];

    // Try Yelp first, fall back to Google
    const yelpResult = await fetchFromYelp(latitude, longitude);
    if (yelpResult !== null) return yelpResult;

    const googleResult = await fetchFromGoogle(latitude, longitude);
    if (googleResult !== null) return googleResult;

    return [];
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/providers/restaurantProvider.test.ts --verbose
```
Expected: PASS — all three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/providers/restaurantProvider.ts __tests__/providers/restaurantProvider.test.ts
git commit -m "feat: add restaurant provider with Yelp primary and Google Places failover"
```

---

### Task 7: useCards Hook

**Files:**
- Create: `src/hooks/useCards.ts`
- Create: `__tests__/hooks/useCards.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useCards.test.ts`:
```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useCards } from '../../src/hooks/useCards';

// Mock the providers
jest.mock('../../src/providers/movieProvider', () => ({
  movieProvider: {
    fetchCards: jest.fn().mockResolvedValue([
      { id: 'movie-1', title: 'Test Movie', subtitle: '2024', imageUrl: null, rating: 4, details: [], sourceUrl: null, meta: {} },
    ]),
  },
}));

jest.mock('../../src/providers/showProvider', () => ({
  showProvider: {
    fetchCards: jest.fn().mockResolvedValue([
      { id: 'show-1', title: 'Test Show', subtitle: '2024', imageUrl: null, rating: 4, details: [], sourceUrl: null, meta: {} },
    ]),
  },
}));

jest.mock('../../src/providers/restaurantProvider', () => ({
  restaurantProvider: {
    fetchCards: jest.fn().mockResolvedValue([
      { id: 'rest-1', title: 'Test Restaurant', subtitle: 'Pizza', imageUrl: null, rating: 4, details: [], sourceUrl: null, meta: {} },
    ]),
  },
}));

describe('useCards', () => {
  it('fetches movie cards for movie topic', async () => {
    const { result } = renderHook(() => useCards('movie'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].title).toBe('Test Movie');
    expect(result.current.error).toBeNull();
  });

  it('fetches show cards for show topic', async () => {
    const { result } = renderHook(() => useCards('show'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cards[0].title).toBe('Test Show');
  });

  it('fetches restaurant cards for food topic with location', async () => {
    const { result } = renderHook(() =>
      useCards('food', { latitude: 40.71, longitude: -74.0 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cards[0].title).toBe('Test Restaurant');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/hooks/useCards.test.ts --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/hooks/useCards.ts`:
```typescript
import { useState, useEffect } from 'react';
import { CardItem, Topic, FetchOptions } from '../providers/types';
import { movieProvider } from '../providers/movieProvider';
import { showProvider } from '../providers/showProvider';
import { restaurantProvider } from '../providers/restaurantProvider';

const providers = {
  movie: movieProvider,
  show: showProvider,
  food: restaurantProvider,
} as const;

interface UseCardsResult {
  cards: CardItem[];
  loading: boolean;
  error: string | null;
}

export function useCards(
  topic: Topic,
  location?: { latitude: number; longitude: number },
  options?: { enabled?: boolean }
): UseCardsResult {
  const enabled = options?.enabled ?? true;
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const provider = providers[topic];
        const fetchOptions: FetchOptions = {
          latitude: location?.latitude,
          longitude: location?.longitude,
        };
        const result = await provider.fetchCards(fetchOptions);

        if (!cancelled) {
          setCards(result);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cards');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [topic, location?.latitude, location?.longitude, enabled]);

  return { cards, loading, error };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/hooks/useCards.test.ts --verbose
```
Expected: PASS — all three tests green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCards.ts __tests__/hooks/useCards.test.ts
git commit -m "feat: add useCards hook to fetch cards by topic"
```

---

## Chunk 3: UI Components

### Task 8: TopicButton Component

**Files:**
- Create: `src/components/TopicButton.tsx`
- Create: `__tests__/components/TopicButton.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/TopicButton.test.tsx`:
```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TopicButton } from '../../src/components/TopicButton';

describe('TopicButton', () => {
  it('renders label and emoji', () => {
    const { getByText } = render(
      <TopicButton label="Movies" emoji="🎬" onPress={() => {}} />
    );
    expect(getByText('🎬')).toBeTruthy();
    expect(getByText('Movies')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TopicButton label="Movies" emoji="🎬" onPress={onPress} />
    );
    fireEvent.press(getByText('Movies'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/components/TopicButton.test.tsx --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/components/TopicButton.tsx`:
```typescript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, spacing, typography, cardStyle } from '../theme';

interface TopicButtonProps {
  label: string;
  emoji: string;
  onPress: () => void;
}

export function TopicButton({ label, emoji, onPress }: TopicButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label}>{label}</Text>
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
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.subtitle,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/TopicButton.test.tsx --verbose
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TopicButton.tsx __tests__/components/TopicButton.test.tsx
git commit -m "feat: add TopicButton component with tests"
```

---

### Task 9: SwipeCard Component

**Files:**
- Create: `src/components/SwipeCard.tsx`
- Create: `__tests__/components/SwipeCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SwipeCard.test.tsx`:
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { SwipeCard } from '../../src/components/SwipeCard';
import { CardItem } from '../../src/providers/types';

const mockCard: CardItem = {
  id: 'test-1',
  title: 'Test Title',
  subtitle: 'Test Subtitle',
  imageUrl: 'https://example.com/image.jpg',
  rating: 4.2,
  details: ['Detail 1', 'Detail 2'],
  sourceUrl: null,
  meta: {},
};

describe('SwipeCard', () => {
  it('renders card title and subtitle', () => {
    const { getByText } = render(<SwipeCard card={mockCard} />);
    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Subtitle')).toBeTruthy();
  });

  it('renders details', () => {
    const { getByText } = render(<SwipeCard card={mockCard} />);
    expect(getByText('Detail 1')).toBeTruthy();
    expect(getByText('Detail 2')).toBeTruthy();
  });

  it('renders rating when provided', () => {
    const { getByText } = render(<SwipeCard card={mockCard} />);
    expect(getByText('4.2')).toBeTruthy();
  });

  it('handles null imageUrl gracefully', () => {
    const noImageCard = { ...mockCard, imageUrl: null };
    const { getByText } = render(<SwipeCard card={noImageCard} />);
    expect(getByText('Test Title')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/components/SwipeCard.test.tsx --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/components/SwipeCard.tsx`:
```typescript
import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { CardItem } from '../providers/types';
import { colors, spacing, typography, cardStyle } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.xl * 2;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

interface SwipeCardProps {
  card: CardItem;
}

export function SwipeCard({ card }: SwipeCardProps) {
  return (
    <View style={styles.card}>
      {card.imageUrl ? (
        <Image source={{ uri: card.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {card.title}
          </Text>
          {card.rating != null && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{card.rating}</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>{card.subtitle}</Text>
        {card.details.map((detail, i) => (
          <Text key={i} style={styles.detail}>
            {detail}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.surface,
    ...cardStyle,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '65%',
    backgroundColor: colors.accent,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.caption,
  },
  info: {
    flex: 1,
    padding: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.subtitle,
    flex: 1,
    marginRight: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  detail: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  ratingBadge: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  ratingText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/SwipeCard.test.tsx --verbose
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SwipeCard.tsx __tests__/components/SwipeCard.test.tsx
git commit -m "feat: add SwipeCard component with tests"
```

---

### Task 10: SwipeDeck Component

**Files:**
- Create: `src/components/SwipeDeck.tsx`
- Create: `__tests__/components/SwipeDeck.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SwipeDeck.test.tsx`:
```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { SwipeDeck } from '../../src/components/SwipeDeck';
import { CardItem } from '../../src/providers/types';

// Mock gesture handler for testing (GestureDetector requires GestureHandlerRootView)
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        onUpdate: (cb: any) => ({ onEnd: (cb2: any) => ({ onUpdate: cb, onEnd: cb2 }) }),
      }),
    },
  };
});

const mockCards: CardItem[] = [
  {
    id: '1',
    title: 'Card One',
    subtitle: 'Sub 1',
    imageUrl: null,
    rating: 3,
    details: [],
    sourceUrl: null,
    meta: {},
  },
  {
    id: '2',
    title: 'Card Two',
    subtitle: 'Sub 2',
    imageUrl: null,
    rating: 4,
    details: [],
    sourceUrl: null,
    meta: {},
  },
];

describe('SwipeDeck', () => {
  it('renders the top card', () => {
    const { getByText } = render(
      <SwipeDeck
        cards={mockCards}
        onSwipeRight={() => {}}
        onSwipeLeft={() => {}}
        onEmpty={() => {}}
      />
    );
    expect(getByText('Card One')).toBeTruthy();
  });

  it('calls onEmpty when no cards', () => {
    const onEmpty = jest.fn();
    render(
      <SwipeDeck
        cards={[]}
        onSwipeRight={() => {}}
        onSwipeLeft={() => {}}
        onEmpty={onEmpty}
      />
    );
    expect(onEmpty).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/components/SwipeDeck.test.tsx --verbose
```
Expected: FAIL — module not found.

- [ ] **Step 3: Write implementation**

Create `src/components/SwipeDeck.tsx`:
```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { CardItem } from '../providers/types';
import { SwipeCard } from './SwipeCard';
import { colors, spacing, typography } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeDeckProps {
  cards: CardItem[];
  onSwipeRight: (card: CardItem) => void;
  onSwipeLeft: (card: CardItem) => void;
  onEmpty: () => void;
}

export function SwipeDeck({ cards, onSwipeRight, onSwipeLeft, onEmpty }: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  useEffect(() => {
    if (currentIndex >= cards.length && cards.length > 0) {
      onEmpty();
    }
  }, [currentIndex, cards.length, onEmpty]);

  useEffect(() => {
    if (cards.length === 0) {
      onEmpty();
    }
  }, [cards.length, onEmpty]);

  const advanceCard = useCallback(
    (direction: 'left' | 'right') => {
      const card = cards[currentIndex];
      if (!card) return;

      if (direction === 'right') {
        onSwipeRight(card);
      } else {
        onSwipeLeft(card);
      }
      setCurrentIndex((i) => i + 1);
      translateX.value = 0;
      translateY.value = 0;
    },
    [currentIndex, cards, onSwipeRight, onSwipeLeft, translateX, translateY]
  );

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(
          direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH,
          { duration: 200 },
          () => runOnJS(advanceCard)(direction)
        );
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-15, 0, 15]
        )}deg`,
      },
    ],
  }));

  const overlayLeftStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const overlayRightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  if (!currentCard) {
    return (
      <View style={styles.empty}>
        <Text style={typography.body}>No more cards!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Next card (underneath) */}
      {nextCard && (
        <View style={[styles.cardContainer, { zIndex: 0 }]}>
          <SwipeCard card={nextCard} />
        </View>
      )}

      {/* Current card (on top, draggable) */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.cardContainer, { zIndex: 1 }, animatedStyle]}>
          <SwipeCard card={currentCard} />
          <Animated.View style={[styles.overlay, styles.overlayLeft, overlayLeftStyle]}>
            <Text style={styles.overlayText}>NOPE</Text>
          </Animated.View>
          <Animated.View style={[styles.overlay, styles.overlayRight, overlayRightStyle]}>
            <Text style={styles.overlayText}>YES!</Text>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    position: 'absolute',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 3,
  },
  overlayLeft: {
    right: spacing.lg,
    borderColor: '#FF4444',
  },
  overlayRight: {
    left: spacing.lg,
    borderColor: colors.success,
  },
  overlayText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/SwipeDeck.test.tsx --verbose
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SwipeDeck.tsx __tests__/components/SwipeDeck.test.tsx
git commit -m "feat: add SwipeDeck component with swipe gestures and tests"
```

---

## Chunk 4: Screens & Integration

### Task 11: Home Screen (Topic Selection)

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1: Implement full home screen**

Replace `app/index.tsx`:
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TopicButton } from '../src/components/TopicButton';
import { colors, spacing, typography } from '../src/theme';
import { Topic } from '../src/providers/types';

export default function HomeScreen() {
  const router = useRouter();

  function handleTopic(topic: Topic) {
    router.push({ pathname: '/swipe', params: { topic } });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Whato</Text>
        <Text style={styles.tagline}>What do you feel like?</Text>
      </View>
      <View style={styles.buttons}>
        <TopicButton emoji="🍕" label="Food" onPress={() => handleTopic('food')} />
        <TopicButton emoji="🎬" label="Movies" onPress={() => handleTopic('movie')} />
        <TopicButton emoji="📺" label="Shows" onPress={() => handleTopic('show')} />
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
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.primary,
  },
  tagline: {
    ...typography.body,
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  buttons: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Verify visually**

```bash
npx expo start --clear
```
Expected: App shows "Whato" title with three styled topic buttons. Tapping navigates to swipe screen (which is still a placeholder).

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: implement home screen with topic selection"
```

---

### Task 12: Swipe Screen

**Files:**
- Modify: `app/swipe.tsx`

- [ ] **Step 1: Implement swipe screen**

Replace `app/swipe.tsx`:
```typescript
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { SwipeDeck } from '../src/components/SwipeDeck';
import { useCards } from '../src/hooks/useCards';
import { Topic, CardItem } from '../src/providers/types';
import { colors, spacing, typography } from '../src/theme';

export default function SwipeScreen() {
  const { topic } = useLocalSearchParams<{ topic: Topic }>();
  const router = useRouter();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>();
  const [locationLoading, setLocationLoading] = useState(topic === 'food');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Request location for food topic
  React.useEffect(() => {
    if (topic !== 'food') return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is needed to find restaurants near you.');
        setLocationLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setLocationLoading(false);
    })();
  }, [topic]);

  const needsLocation = topic === 'food';
  const locationReady = !needsLocation || location != null;
  const { cards, loading, error } = useCards(
    topic as Topic,
    needsLocation ? location : undefined,
    { enabled: locationReady }
  );

  const handleSwipeRight = useCallback(
    (card: CardItem) => {
      router.replace({
        pathname: '/result',
        params: {
          title: card.title,
          subtitle: card.subtitle,
          imageUrl: card.imageUrl ?? '',
          rating: card.rating?.toString() ?? '',
          details: JSON.stringify(card.details),
          sourceUrl: card.sourceUrl ?? '',
          topic: topic,
        },
      });
    },
    [router, topic]
  );

  const handleSwipeLeft = useCallback(() => {
    // Just skip the card — SwipeDeck advances automatically
  }, []);

  const handleEmpty = useCallback(() => {
    // Could load more cards in the future; for now just show empty state
  }, []);

  const isLoading = loading || locationLoading;
  const displayError = error || locationError;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { marginTop: spacing.md }]}>
          {locationLoading ? 'Finding your location...' : 'Loading cards...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (displayError) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={[typography.body, { color: colors.primary }]}>{displayError}</Text>
      </SafeAreaView>
    );
  }

  const topicLabels: Record<string, string> = {
    food: 'Restaurants',
    movie: 'Movies',
    show: 'Shows',
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>{topicLabels[topic as string] ?? 'Swipe'}</Text>
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
  header: {
    ...typography.subtitle,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
});
```

- [ ] **Step 2: Verify visually**

```bash
npx expo start --clear
```
Expected: Pick a topic → cards load → swiping works → swiping right navigates to result screen.

- [ ] **Step 3: Commit**

```bash
git add app/swipe.tsx
git commit -m "feat: implement swipe screen with card deck and location support"
```

---

### Task 13: Result Screen

**Files:**
- Modify: `app/result.tsx`

- [ ] **Step 1: Implement result screen**

Replace `app/result.tsx`:
```typescript
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography, cardStyle } from '../src/theme';

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    title: string;
    subtitle: string;
    imageUrl: string;
    rating: string;
    details: string;
    sourceUrl: string;
    topic: string;
  }>();
  const router = useRouter();

  const details: string[] = params.details ? JSON.parse(params.details) : [];
  const topicLabels: Record<string, string> = {
    food: 'eat at',
    movie: 'watch',
    show: 'watch',
  };
  const verb = topicLabels[params.topic] ?? 'go with';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>You should {verb}...</Text>

      <View style={styles.card}>
        {params.imageUrl ? (
          <Image source={{ uri: params.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        <View style={styles.info}>
          <Text style={styles.title}>{params.title}</Text>
          <Text style={styles.subtitle}>{params.subtitle}</Text>
          {params.rating ? (
            <Text style={styles.rating}>Rating: {params.rating}/5</Text>
          ) : null}
          {details.map((d, i) => (
            <Text key={i} style={styles.detail}>{d}</Text>
          ))}
        </View>
      </View>

      {params.sourceUrl ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => Linking.openURL(params.sourceUrl)}
        >
          <Text style={styles.linkText}>View Details</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.restartButton}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.restartText}>Start Over</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    ...typography.title,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    ...cardStyle,
    overflow: 'hidden',
    width: '100%',
    marginBottom: spacing.xl,
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: colors.accent,
  },
  placeholder: {},
  info: {
    padding: spacing.lg,
  },
  title: {
    ...typography.title,
    fontSize: 28,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  rating: {
    ...typography.body,
    color: colors.primaryLight,
    marginTop: spacing.sm,
  },
  detail: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  linkButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  linkText: {
    ...typography.body,
    fontWeight: '600',
  },
  restartButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
  },
  restartText: {
    ...typography.body,
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Verify visually**

```bash
npx expo start --clear
```
Expected: Full flow works — pick topic → swipe → swipe right → see result with title, image, details, and "Start Over" button.

- [ ] **Step 3: Commit**

```bash
git add app/result.tsx
git commit -m "feat: implement result screen with chosen item display"
```

---

### Task 14: Final Integration Test & Cleanup

**Files:**
- Modify: `.gitignore` (verify `.env` is ignored)
- Modify: `package.json` (verify test script)

- [ ] **Step 1: Verify .gitignore includes .env**

Check `.gitignore` contains `.env`. If not, add it.

- [ ] **Step 2: Run all tests**

```bash
npx jest --verbose
```
Expected: All tests pass.

- [ ] **Step 3: Run the app end-to-end**

```bash
npx expo start --clear
```
Manual test:
1. Home screen shows "Whato" with three topic buttons
2. Tap "Movies" → cards load from TMDB → swipe left/right works → swipe right shows result
3. Tap "Shows" → same flow
4. Tap "Food" → location prompt → cards load from Yelp → swipe right shows result
5. "Start Over" returns to home

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: final cleanup and integration verification for Phase 1 MVP"
```
