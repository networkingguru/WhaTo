# WhaTo Phase 2: Group Mode, Visual Refresh & Creator Support — Design Spec

## Overview

Phase 2 transforms WhaTo from a solo decision tool into a group decision app. Three major features ship together as one coherent release:

1. **Visual Refresh** — New Warm & Playful theme, speech bubble logo, renamed categories
2. **Support the Creator Button** — Hidden sparkle button with personal pitch panel
3. **Group Decision Mode** — Real-time multi-person swiping via Firebase
4. **Location Controls** — Radius selector and map-based location picker for Eat?

## 1. Visual Refresh

### Theme

Replace the current dark navy/red palette with Warm & Playful:

| Token | Current | New |
|-------|---------|-----|
| background | `#1A1A2E` (dark navy) | `#FFF8F0` (warm cream) |
| surface | `#16213E` (darker navy) | `#FFFFFF` (white cards) |
| primary | `#E94560` (red/pink) | `#FF6B4A` (coral) |
| secondary | — (new) | `#F5A623` (amber) |
| tertiary | — (new) | `#7B68EE` (purple) |
| text | `#EAEAEA` (light gray) | `#2D2D2D` (dark charcoal) |
| textSecondary | `#A0A0B0` | `#8B7355` (warm gray) |
| accent | `#0F3460` (dark blue) | `#7B68EE` (purple) |
| success | `#4CAF50` (green) | `#4CAF50` (keep) |

### Logo

Speech bubble wordmark: gradient background (coral → amber), "WhaTo?" text inside with "To" in dark charcoal for contrast. Small triangle tail on the bottom-left of the bubble. Used on the home screen as the main header, and as a smaller version on other screens.

### Categories

Renamed to flow from the app name — "WhaTo... Eat?" / "WhaTo... Watch?" / "WhaTo... Stream?":

- **Eat?** (coral `#FF6B4A`) — restaurants/food via Yelp + Google Places
- **Watch?** (amber `#F5A623`) — movies via TMDB
- **Stream?** (purple `#7B68EE`) — TV shows via TMDB

**Internal type values stay the same** (`'food' | 'movie' | 'show'` in `types.ts`). The display names ("Eat?", "Watch?", "Stream?") are UI-only labels. A display name mapping will be added (e.g., `{ food: 'Eat?', movie: 'Watch?', show: 'Stream?' }`) so the `Topic` type does not need to change and solo mode is unaffected.

### Iconography

Replace emoji icons (🍕🎬📺) with a consistent icon library (Phosphor Icons — lightweight, React Native compatible). Topic buttons become pill-shaped with rounded corners, each in its own accent color.

### Typography

System font. Lighter weights for body text, heavier contrast for headings. Warmer overall feel.

### Swipe Overlays

"YES!" stays green-bordered, "NOPE" stays red-bordered, adapted to work on the lighter cream background.

## 2. Support the Creator Button

### Placement

Small, subtle element on the home screen — a sparkle/star icon in a corner.

### Animation

Periodic "bling" shimmer effect that plays every ~30 seconds or on first app open. Subtle enough to be charming, not annoying. Draws the eye without being intrusive.

### Panel

Tapping opens a bottom sheet or modal containing:

- Personal message: *"I made this app because I was sick of this problem. I don't collect your data, no ads. But if you'd like to help me out..."*
- Styled buttons linking to:
  - "Check out my books" → Amazon
  - "Listen to the podcast" → podcast link
  - "Buy me a coffee" → Patreon
  - "Rate & share the app" → App Store review prompt
- Close/dismiss button

### Privacy Note

The message says "I don't collect **your** data" — the app may use simple, anonymized analytics (user counts, request counts, debugging, sizing) but does not collect personal or identifying data.

## 3. Group Decision Mode

### User Flow

1. **Create Session** — User taps a "Group Mode" button on the home screen. They pick a topic (Eat? / Watch? / Stream?). For Eat?, they also set location and radius. The app creates a session in Firebase and generates a short join code (e.g., `WHATO-7K3M`).

2. **Invite** — App opens the native SMS share sheet with a pre-composed message:
   > "WhaTo... Eat? Join my session: whato://join/WHATO-7K3M
   > Don't have WhaTo? Download it: [App Store link]"

3. **Lobby** — Creator sees a waiting screen showing who's joined (by display name). They tap "Start" when everyone's in.

4. **Swipe** — Everyone gets the same shuffled card deck and swipes independently on their own phone. Swipes are written to Firebase under the session ID in real-time.

5. **Results** — When all participants finish (or the creator ends the session), the app computes matches — items that got a right-swipe from everyone (or majority). Results screen shows matched items ranked by how many people picked them.

6. **No Match Fallback** — If nobody agrees on anything, show the top items by total votes with a "Close enough?" message.

### Deep Linking

- Custom URL scheme: `whato://join/<SESSION_CODE>`
- Opens the app directly if installed
- SMS message includes both the deep link and a fallback App Store download link
- No hosted server required — uses `expo-linking` for URL scheme registration

### Backend — Firebase Realtime Database

**Why Firebase:** Free tier supports 100 concurrent connections and 1GB storage — more than enough. No server to manage. Real-time sync is built in.

**Data Model:**

```
sessions/
  WHATO-7K3M/
    topic: "food" | "movie" | "show"    # matches internal Topic type
    status: "waiting" | "active" | "complete"
    createdBy: "device-id-abc"
    createdAt: <timestamp>
    location:                          # Eat? only
      latitude: 37.7749
      longitude: -122.4194
      radiusMiles: 5
    cards: [<card IDs — frozen at session creation>]
    participants/
      device-id-abc/
        name: "Brian"
        joinedAt: <timestamp>
        swipes:
          card-id-1: true              # right swipe
          card-id-2: false             # left swipe
      device-id-xyz/
        name: "Sam"
        joinedAt: <timestamp>
        swipes:
          card-id-1: true
          card-id-2: true
```

**Session Lifecycle:**
- Sessions auto-expire after 24 hours. Expiry is enforced client-side: when any client reads a session, it checks `createdAt` and ignores/deletes sessions older than 24 hours. Firebase security rules also deny reads/writes on sessions where `createdAt` is older than 24 hours, so stale data can't be accessed even if no client cleans it up.
- No user accounts — participants identified by anonymous device ID + display name entered when joining
- Creator can end the session early (sets `status: "complete"`)
- **Participant cap:** Maximum 8 participants per session. Firebase free tier allows 100 concurrent connections total; capping per-session keeps headroom for multiple concurrent sessions.

**Completion Detection:**
- Each participant's client writes `completed: true` to their participant record after their last swipe (when swipe count equals `cards` array length)
- All clients listen on the session's `participants/` node. When every participant has `completed: true`, the results screen triggers automatically
- The session creator can also force-end the session at any time (sets `status: "complete"`), which triggers results with whatever swipes exist

**Error Handling:**
- **Participant disconnects mid-swipe:** Their partial swipes are already in Firebase. If they reconnect, they resume from where they left off (check swipe count vs cards). If they never return, the creator can force-end the session.
- **Creator disconnects:** The session persists in Firebase. Any participant can still swipe. The session auto-expires after 24 hours if the creator never returns.
- **Late join attempt:** If a user tries to join a session with status `"active"` or `"complete"`, they see a "Session already started" or "Session ended" message.
- **Firebase connection limit:** If the connection fails, show a "Couldn't connect — try again in a moment" error. The 8-participant cap and 24-hour expiry keep connection usage manageable.

### Match Computation

When all participants have finished swiping (or creator ends session):
- **Unanimous matches:** Items right-swiped by everyone → top of results
- **Majority matches:** Items right-swiped by >50% → shown below
- **No matches:** Show top items by total vote count with "Close enough?" framing

## 4. Location Controls (Eat? Only)

### Radius Selector

Prominent control displayed when topic is Eat? — on the swipe screen for solo mode, on session creation for group mode.

- Preset distance options: 1 mi, 5 mi, 10 mi, 25 mi (or a slider)
- Default: 5 mi from current location
- Not buried in settings — directly affects results, so it's front and center

### Map Location Picker

A "Pick Location" button opens a map view (via `react-native-maps`) where the user can:
- See their current GPS location as the default pin
- Drag the pin or tap to set a different center point
- Useful for "we're meeting downtown" or "what's near the office"

### Group Mode Integration

The session creator sets location + radius when creating an Eat? session. All participants see cards for that location — not each person's individual GPS position.

### Implementation

- `react-native-maps` for the MapView picker
- Add `radius` (in miles) to the `FetchOptions` interface in `types.ts`
- Update `restaurantProvider.ts`: pass radius to Yelp API (convert miles → meters for the `radius` param) and to Google Places API (replace the hardcoded `radius=5000`)
- Default radius of 5 miles (~8047 meters) when not specified, preserving current behavior

## New Dependencies

| Package | Purpose |
|---------|---------|
| `@react-native-firebase/app` | Firebase core |
| `@react-native-firebase/database` | Realtime Database for session sync |
| `react-native-maps` | Map location picker for Eat? |
| `phosphor-react-native` | Icon library replacing emojis |
| `expo-sms` | Compose SMS with pre-filled message for session invites |

## Architecture Notes

- **No user accounts** — device ID + display name only
- **No hosted server** — Firebase handles all real-time sync; deep links use custom URL scheme
- **Anonymized analytics** — simple usage metrics (user counts, requests, debugging) with no personal data collection
- **Existing code preserved** — solo swipe mode continues to work; group mode is additive
- **Card deck consistency** — in group mode, the card list is frozen at session creation so all participants see the same options
