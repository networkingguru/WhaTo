# Unified Home Flow — Design Spec

**Date:** 2026-03-18
**Goal:** Remove the solo/group mode toggle and replace with a unified flow where users pick a topic first, then choose how to decide (together or solo). Group mode becomes the primary path.

## Current Flow

- Home defaults to solo mode (light background)
- User taps "Group Mode" toggle → background turns purple, same topic buttons
- Topic tap in solo → straight to swipe screen
- Topic tap in group → enter-name form → create session → lobby
- "Join Session" button below "Group Mode" toggle
- Options (search filters) live on swipe screen header (solo) and enter-name form (group)

## New Flow

### Screen 1: Home (always the same — no mode state)

- Light background (no purple/white switching)
- Logo (no tagline — the topic buttons ARE the question: "Eat?", "Watch?", "Stream?")
- 3 topic buttons: Eat?, Watch?, Stream? (existing `topicDisplayNames` already use these labels)
- "Join Group" button below topics — **same width/prominence** as topic buttons, outlined style with purple border
- Sparkle button (support) stays in top-right
- Feedback button stays at bottom

**Removed:** Solo/Group mode toggle, "Group Mode" button, "Go Back" button, tagline text

### Screen 2: Mode Choice (new — shown after tapping a topic)

- Light background
- Topic icon + name at top (e.g. "🍴 Eat?")
- No subtitle/tagline
- **"Decide Together"** — primary button (filled purple). Subtitle: "Create a group"
- **"Decide Solo"** — secondary button (outlined purple). Subtitle: "Swipe on your own"
- **"Options"** link below — opens SearchOptions modal (food filters or media filters depending on topic)
- **"← Back"** link returns to home

This screen replaces the mode toggle. Options are shared between both paths — set them once, they apply whether you go solo or group.

### Screen 3: Enter Name (existing — after "Decide Together")

- Purple background (signals group context)
- "Your display name" label + text input
- "Create Group" button
- Single "← Back" link below button, returns to mode-choice screen

**Removed:** "Options" button (moved to mode-choice screen), duplicate back button at top

### Screen 4: Solo Swipe (existing — after "Decide Solo")

- Goes straight to `/swipe` screen with selected topic + any filter options applied

**Removed:** "Options" button from header (moved to mode-choice screen)

## State Management Changes

### Current state in `index.tsx`:
- `mode: 'solo' | 'group'` — **remove**
- `groupPhase: 'pick' | 'enter-name' | 'creating'` — **rename/repurpose**
- `groupTopic: Topic | null` — **rename to `selectedTopic`**

### New state:
- `phase: 'home' | 'choose-mode' | 'enter-name' | 'creating'`
- `selectedTopic: Topic | null`
- Filter state (foodFilters, mediaFilters) — unchanged, just used from mode-choice screen

### Other state (unchanged, kept as-is):
- `displayName` — loaded from AsyncStorage on mount, saved on group creation (existing behavior)
- `optionsVisible`, `supportVisible`, `feedbackVisible` — modal visibility toggles
- `foodFilters`, `mediaFilters` — filter state, now set from mode-choice screen

### Flow transitions:
- Home: topic tap → `phase = 'choose-mode'`, `selectedTopic = topic`
- Mode-choice: "Decide Together" → `phase = 'enter-name'`
- Mode-choice: "Decide Solo" → fire `trackTopicSelected(topic, 'solo')`, then `router.push('/swipe', { topic, ...serializedFilters })`
- Mode-choice: "← Back" → `phase = 'home'`, `selectedTopic = null`
- Enter-name: "Create Session" → `phase = 'creating'` → create session → on success: reset `phase = 'home'`, `selectedTopic = null`, navigate to lobby
- Enter-name: "← Back" → `phase = 'choose-mode'`

### Creating phase appearance:
- Same as current: spinner + "Creating session..." text on purple background. The `creating` phase renders inside the enter-name screen context (purple bg), not the home screen.

### Filter option passing:
- Food filters and media filters are set on the mode-choice screen via the existing `SearchOptions` modal (conditioned on `selectedTopic` instead of `groupTopic`)
- For solo: serialize filters as route params to `/swipe`:
  - Food: `openNow` (string "true"/"false"), `categories` (JSON string), `sortBy` (string)
  - Media: `genreIds` (JSON string), `sortTmdb` (string)
  - `swipe.tsx` must parse these from route params and use them as initial filter state instead of defaults
- For group: pass filters to `handleCreateGroup` (current behavior, unchanged)

### RadiusSelector and Pick Location:
- These stay on the swipe screen — they are interactive features used during the swipe session, not pre-session configuration. Only the SearchOptions modal (cuisine types, sort order, genres) moves to mode-choice.

## UI String Renames: "session" → "group"

Replace user-facing "session" text with "group" across all screens. Code-level names (functions, variables, services) stay unchanged.

| File | Old text | New text |
|------|----------|----------|
| `app/index.tsx` | "Join Session" | "Join Group" |
| `app/index.tsx` | "Create Session" | "Create Group" |
| `app/index.tsx` | "Creating session..." | "Creating group..." |
| `app/index.tsx` | "Could not create session:" | "Could not create group:" |
| `app/join.tsx` | "Join Session" (title) | "Join Group" |
| `app/join.tsx` | "Session Code" (label) | "Group Code" |
| `app/join.tsx` | "Please enter the session code and your name." | "Please enter the group code and your name." |
| `app/lobby.tsx` | "Session: {code}" | "Group: {code}" |
| `app/lobby.tsx` | "Join my session:" (SMS text) | "Join my group:" |
| `app/lobby.tsx` | "Cancel Session" | "Cancel Group" |
| `app/lobby.tsx` | "Leave Session" | "Leave Group" |
| `app/group-swipe.tsx` | "End Session?" (alert title) | "End Group?" |
| `app/group-swipe.tsx` | "This will end the session for everyone..." | "This will end the group for everyone..." |
| `app/group-swipe.tsx` | "End Session" (alert button) | "End Group" |
| `app/group-swipe.tsx` | "Loading session..." | "Loading group..." |
| `app/group-result.tsx` | "starting a group session" (tip text) | "starting a group" |

## Files Changed

| File | Change |
|------|--------|
| `app/index.tsx` | Rewrite state machine: remove mode toggle, add phase-based rendering with new mode-choice screen. Remove tagline. Rename session→group strings. |
| `app/swipe.tsx` | Remove "Options" button from header, receive filter params from route instead |
| `app/join.tsx` | Rename session→group in UI strings |
| `app/lobby.tsx` | Rename session→group in UI strings |
| `app/group-swipe.tsx` | Rename session→group in UI strings |
| `app/group-result.tsx` | Rename session→group in tip text |

## Files NOT Changed

- `src/components/SearchOptions.tsx` — no changes (just rendered from different parent)
- `src/services/sessionService.ts` — code-level names stay as-is
- `src/services/analytics.ts` — event names stay as-is (analytics events use snake_case internal names, not user-facing)

## Analytics Impact

- `trackTopicSelected(topic, mode)` — the `mode` parameter is now determined on the mode-choice screen, not at topic-tap time. Fire it when the user commits to a path ("Decide Together" or "Decide Solo"), not when they tap a topic.
- All other analytics events unchanged.

## Visual Notes

- Home screen is always light background — no more purple state
- Enter-name screen keeps purple background (group context indicator)
- Join Group button uses outlined style: white background, purple border, purple text
- "Decide Together" is visually primary (filled purple)
- "Decide Solo" is visually secondary (outlined purple)
- "Options" is a text link, not a button
