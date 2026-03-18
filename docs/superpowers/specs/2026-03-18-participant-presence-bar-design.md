# Participant Presence Bar — Design Spec

## Overview

Add a persistent participant status bar to the group-swipe screen showing other participants' connection state via colored initial avatars. Users can long-press any avatar for full name and status. A one-time intro legend toast explains the color meanings on first use.

## Visual Design

### Bottom Bar (ParticipantBar component)

- Rendered between the SwipeDeck and the "← Nope / Yes! →" hints in `group-swipe.tsx`
- Horizontal centered row of 24x24px colored circles, 4px gap
- Each circle contains the participant's first initial in white bold text (10px)
- The current user's own avatar is excluded — up to 7 others shown
- Background: subtle tinted strip (`rgba(255,107,74,0.05)`) with top border

### Status Colors

| Status | Color | Hex | Priority |
|--------|-------|-----|----------|
| Done (completed all cards) | Green | `#4CAF50` | 1 (highest) |
| Connected (swiping) | Blue | `#4A90D9` | 2 |
| Disconnected | Red | `#FF4444` | 3 (lowest) |

Priority determines which status to display when multiple could apply (e.g., completed + disconnected shows green).

### Long-Press Tooltip

- Triggered by `onLongPress` (~300ms) on any avatar circle
- Dark semi-transparent background (`rgba(45,45,45,0.9)`), rounded corners
- Positioned above the pressed avatar
- Content: `"{Name} — {status}"` (e.g., "Sarah — swiping", "Mike — done", "Kim — offline")
- Dismisses on touch release or after 2 seconds

### Intro Legend Toast

- Dark rounded overlay shown near the top of the swipe screen
- Three rows: colored dot + label for each status (blue "Swiping", green "Done", red "Disconnected")
- Displays for 3 seconds, then fades out via Reanimated opacity animation
- Shown only on the user's first group session entry (gated by AsyncStorage key `whato_seen_legend`)
- Dismissed immediately if a match banner appears during the 3-second window

## Data Model

### Firebase Realtime Database Changes

Add two fields to each participant node:

```
sessions/{code}/participants/{deviceId}/
  name: string
  joinedAt: number
  completed?: boolean
  connected: boolean          ← NEW
  lastConnected: number       ← NEW
  swipes?: { [cardId]: boolean }
```

### TypeScript Type Update

```typescript
// In sessionService.ts — ParticipantData
interface ParticipantData {
  name: string;
  joinedAt: number;
  completed?: boolean;
  connected?: boolean;        // NEW
  lastConnected?: number;     // NEW
  swipes?: Record<string, boolean>;
}
```

## Presence Lifecycle

### Connecting (group-swipe mount)

1. Write `connected: true` and `lastConnected: Date.now()` to participant node
2. Register Firebase `onDisconnect()` handler on the `connected` field to set it to `false`
3. This leverages Firebase's server-side disconnect detection — if the client drops (app kill, network loss, phone sleep), Firebase sets `connected: false` automatically

### Reconnecting (app resume)

- Listen to React Native `AppState` changes
- On `active` state: re-write `connected: true`, re-register `onDisconnect()` handler
- Handles cases where the app was backgrounded long enough for Firebase to trigger disconnect

### Cleanup (intentional exit)

- On component unmount (leave/end session): explicitly set `connected: false`
- Cancel the `onDisconnect` handler on clean unmount to avoid stale triggers

### Reading Presence

- The existing `listenToSession()` real-time listener already watches the full session node including all participant data
- `ParticipantBar` derives each participant's display status from `session.participants` on every update
- Status derivation: check `completed` first (green), then `connected` (blue), else disconnected (red)

## Edge Cases

- **Duplicate initials:** Two participants with the same first initial both show that letter. Long-press tooltip disambiguates with full name.
- **Rapid connect/disconnect:** Firebase `onDisconnect` is idempotent. Re-registering on reconnect overwrites the previous handler.
- **Session creator leaves:** Already handled by existing "End Session" flow. Presence reflects the disconnect naturally.
- **Legend toast vs match banner:** If a match is found within the first 3 seconds, legend toast dismisses immediately. Match banner takes priority.
- **Solo session (1 participant):** Bar renders empty since the user is excluded. No special handling needed.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ParticipantBar.tsx` | **Create** — avatar row + long-press tooltip |
| `src/components/LegendToast.tsx` | **Create** — one-time intro legend overlay |
| `src/services/sessionService.ts` | **Modify** — add presence write/disconnect helpers, update types |
| `src/services/firebase.ts` | **Modify** — export `onDisconnect` from Firebase SDK |
| `app/group-swipe.tsx` | **Modify** — integrate ParticipantBar, LegendToast, presence lifecycle, AppState listener |

## Testing Strategy

- Unit test `ParticipantBar` rendering with mock participant data (all 3 status states, 1–7 participants)
- Unit test status derivation logic: completed > connected > disconnected priority
- Integration test presence lifecycle: mount sets connected, unmount clears it
- Manual test: two devices in a session, kill one app, verify red dot appears within ~30s
- Manual test: long-press tooltip shows correct name and status
- Manual test: legend toast shows once on first session, doesn't appear on subsequent sessions
