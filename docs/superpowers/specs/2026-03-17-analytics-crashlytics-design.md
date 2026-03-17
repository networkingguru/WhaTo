# Analytics & Crash Reporting — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** iOS first

---

## Overview

Add anonymous usage analytics and crash reporting to WhaTo using `@react-native-firebase/analytics` and `@react-native-firebase/crashlytics`. The app already uses the Firebase JS SDK for Realtime Database; this adds the native `@react-native-firebase` SDK alongside it (same Firebase project, coexists fine).

All analytics are anonymous — no user IDs, no names, no free text. All event params are enums or integer counts.

---

## Architecture

### New files

**`src/services/analytics.ts`**
Typed wrapper over `@react-native-firebase/analytics`. Exports one named function per event. All calls are fire-and-forget, wrapped in try/catch so analytics failures never affect the user.

**`src/services/crashlytics.ts`**
Thin wrapper over `@react-native-firebase/crashlytics`. Exports `logError(error: unknown, context: string)` for non-fatal errors. Wired into an error boundary in `app/_layout.tsx` for fatal crashes.

### Modified files

- **`app.json`** — add `@react-native-firebase/app` Expo config plugin
- **`app/_layout.tsx`** — add `usePathname` screen view tracking; add error boundary wrapping the root
- **`app/index.tsx`** — track `topic_selected`, `group_session_created`
- **`app/swipe.tsx`** — track `solo_swipe_right`, `solo_deck_empty`, `card_detail_opened`; non-fatal error logging
- **`app/lobby.tsx`** — track `group_session_started`; non-fatal error logging
- **`app/join.tsx`** — track `group_session_joined`; non-fatal error logging
- **`app/group-swipe.tsx`** — non-fatal error logging (swipe recording failures, endSession failures)
- **`app/group-result.tsx`** — track `group_match_found`, `group_no_match`
- **`src/components/FeedbackModal.tsx`** — track `feedback_link_tapped`
- **`docs/privacy-policy.html`** — update to disclose Firebase Analytics

### Firebase config

`@react-native-firebase` reads from `GoogleService-Info.plist` (iOS), placed in the project root. This is separate from the existing JS SDK env vars. Both point at the same Firebase project.

**Important:** `GoogleService-Info.plist` contains sensitive credentials and must NOT be committed to the repository. Inject it for EAS Build using EAS file secrets:
```
eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist
```

---

## Events

| Event name | Trigger | Params |
|---|---|---|
| `topic_selected` | User taps a topic button | `topic: 'food'|'movie'|'show'`, `mode: 'solo'|'group'` |
| `solo_swipe_right` | User swipes right (solo) | `topic` |
| `solo_deck_empty` | User exhausts all cards (solo) | `topic` |
| `card_detail_opened` | User taps a card for details | `topic` |
| `group_session_created` | Host creates a group session | `topic` |
| `group_session_joined` | Participant successfully joins via code (fires in `join.tsx` on `result.success`) | *(none — topic not available in join.tsx at join time)* |
| `group_session_started` | Host taps Start Swiping | `topic`, `participant_count: number` |
| `group_match_found` | Group result screen: `!isFailed && hasMatches === true` | `topic` |
| `group_no_match` | Group result screen: `isFailed === true` (someone ran out) OR `!isFailed && hasMatches === false` (no consensus) | `topic` |
| `feedback_link_tapped` | User taps a feedback option (opens Google Form URL) | *(none)* |

Note: swipe-left in solo mode is not tracked — the app navigates to a result on swipe-right and silently advances the deck on swipe-left, so "swipe count" is out of scope for this iteration.

**Screen view tracking:** Use `usePathname` from `expo-router` inside a `useEffect` in `_layout.tsx`. When the pathname changes, call `analytics().logScreenView({ screen_name: pathname })`. expo-router owns its own `NavigationContainer` internally, so a `NavigationContainer` state-change listener cannot be used.

---

## Crash Reporting

- **Fatal crashes**: Caught by a class-based error boundary component in `_layout.tsx` (React 19 does not have a stable hook-based error boundary API; `componentDidCatch` is the correct pattern). Calls `crashlytics().recordError(error)` before showing a fallback UI.
- **Non-fatal errors**: `logError(error, context)` called in existing catch blocks throughout the app (session creation, card fetch, location, swipe recording, etc.).
- Crashlytics is enabled by default in release builds; can be disabled per-session for testing.

---

## Privacy

- No `setUserId()` calls — Firebase assigns anonymous installation IDs only
- No PII in any event params — all values are enums (`'food'`, `'movie'`, `'show'`, `'solo'`, `'group'`) or integer counts
- Privacy policy updated to disclose Firebase Analytics data collection

---

## Setup Steps (manual, done by developer before building)

1. In Firebase console → enable **Google Analytics** for the project
2. In Firebase console → enable **Crashlytics** for the iOS app
3. Download `GoogleService-Info.plist` from Firebase console
4. Add `GoogleService-Info.plist` to `.gitignore`
5. Upload as EAS file secret: `eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist`
6. Place `GoogleService-Info.plist` at project root for local builds (do not commit)
7. Run `eas build --platform ios` (EAS compiles the native modules)

---

## Dependencies to install

```
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics
```

---

## Out of scope

- Android (defer to a follow-up)
- User properties / custom dimensions
- Conversion funnels (available in Firebase console from the events above without code changes)
- Performance monitoring (separate `@react-native-firebase/perf` module — can be added later)
- Swipe-left count tracking in solo mode
