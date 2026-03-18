# Unified Home Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the solo/group mode toggle with a unified topic-first flow where users pick a topic, then choose "Decide Together" or "Decide Solo". Rename all user-facing "session" text to "group".

**Architecture:** Rewrite `app/index.tsx` state machine from `mode` + `groupPhase` to a single `phase` enum (`home | choose-mode | enter-name | creating`). Add a new "mode choice" screen phase. Move SearchOptions from swipe header and enter-name form to the mode-choice screen. Pass filter params via route to `/swipe`. Rename "session" → "group" in UI strings across 6 files.

**Tech Stack:** React Native, Expo Router, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-18-unified-home-flow-design.md`

---

### Task 1: Rename "session" → "group" in UI strings (non-index files)

Simple string replacements across 4 files. Do these first since they're independent of the index.tsx rewrite.

**Files:**
- Modify: `app/join.tsx:20,53,55`
- Modify: `app/lobby.tsx:48,76,113`
- Modify: `app/group-swipe.tsx:209,212,230`
- Modify: `app/group-result.tsx:82`

- [ ] **Step 1: Update `app/join.tsx`**

Replace three strings:

```typescript
// Line 20: Alert text
'Please enter the session code and your name.'
→ 'Please enter the group code and your name.'

// Line 53: Title
Join Session
→ Join Group

// Line 55: Label
Session Code
→ Group Code
```

- [ ] **Step 2: Update `app/lobby.tsx`**

Replace three strings:

```typescript
// Line 48: SMS text
`WhaTo... ${topicLabel} Join my session: whato://join/${code}`,
→ `WhaTo... ${topicLabel} Join my group: whato://join/${code}`,

// Line 76: Title
Session: {code}
→ Group: {code}

// Line 113: Cancel/Leave buttons
{isCreator === 'true' ? 'Cancel Session' : 'Leave Session'}
→ {isCreator === 'true' ? 'Cancel Group' : 'Leave Group'}
```

- [ ] **Step 3: Update `app/group-swipe.tsx`**

Replace four strings:

```typescript
// Line 209: Alert title
'End Session?'
→ 'End Group?'

// Line 209: Alert message
'This will end the session for everyone and show results.'
→ 'This will end the group for everyone and show results.'

// Line 212: Alert button
'End Session'
→ 'End Group'

// Line 230: Loading text
Loading session...
→ Loading group...
```

- [ ] **Step 4: Update `app/group-result.tsx`**

Replace one string:

```typescript
// Line 82: Tip text
starting a group session
→ starting a group
```

- [ ] **Step 5: Run tests**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Expected: All tests pass (string changes don't affect test logic).

- [ ] **Step 6: Commit**

```bash
git add app/join.tsx app/lobby.tsx app/group-swipe.tsx app/group-result.tsx
git commit -m "feat: rename 'session' to 'group' in user-facing UI strings"
```

---

### Task 2: Update `app/swipe.tsx` — remove Options button, accept filter route params

**Files:**
- Modify: `app/swipe.tsx:18,23,28-37,81-98,153-163,190-198,239-243`

- [ ] **Step 1: Add filter params to route params type**

In `app/swipe.tsx`, update the `useLocalSearchParams` call (line 18):

```typescript
const params = useLocalSearchParams<{
  topic: string;
  pickedLatitude?: string;
  pickedLongitude?: string;
  openNow?: string;
  categories?: string;
  sortBy?: string;
  genreIds?: string;
  sortTmdb?: string;
}>();
```

- [ ] **Step 2: Parse filter params into initial state**

Replace the filter state initialization (lines 28-37):

```typescript
// Filter state — initialize from route params if provided
const [foodFilters, setFoodFilters] = useState<FoodFilters>(() => ({
  openNow: params.openNow !== undefined ? params.openNow === 'true' : true,
  categories: params.categories ? JSON.parse(params.categories) : [],
  sortBy: (params.sortBy as FoodFilters['sortBy']) ?? 'best_match',
}));
const [mediaFilters, setMediaFilters] = useState<MediaFilters>(() => ({
  genreIds: params.genreIds ? JSON.parse(params.genreIds) : [],
  sortTmdb: (params.sortTmdb as MediaFilters['sortTmdb']) ?? 'popularity',
}));
```

- [ ] **Step 3: Remove Options button from header and SearchOptions modal**

Replace the header row (lines 155-163):

```tsx
<View style={styles.headerRow}>
  <Pressable onPress={() => router.replace('/')} hitSlop={12}>
    <Text style={styles.backButton}>←</Text>
  </Pressable>
  <Text style={styles.header}>{topicDisplayNames[topic as Topic] ?? 'Swipe'}</Text>
  <View style={{ width: 48 }} />
</View>
```

Remove the `SearchOptions` component render (lines 190-198) entirely — delete these lines:

```tsx
<SearchOptions
  topic={topic}
  visible={optionsVisible}
  onClose={() => setOptionsVisible(false)}
  foodFilters={foodFilters}
  mediaFilters={mediaFilters}
  onApplyFood={setFoodFilters}
  onApplyMedia={setMediaFilters}
/>
```

- [ ] **Step 4: Remove unused state and imports**

Remove `optionsVisible` state (line 23):
```typescript
const [optionsVisible, setOptionsVisible] = useState(false);
```

Remove `SearchOptions` from imports (line 8):
```typescript
import { SearchOptions, FoodFilters, MediaFilters } from '../src/components/SearchOptions';
→ import { FoodFilters, MediaFilters } from '../src/components/SearchOptions';
```

Remove the `optionsButton` style from the StyleSheet (lines 239-243).

- [ ] **Step 5: Run tests and type check**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add app/swipe.tsx
git commit -m "feat: remove Options from swipe header, accept filter route params"
```

---

### Task 3: Rewrite `app/index.tsx` — unified flow state machine

This is the main task. Complete rewrite of the state machine and JSX rendering.

**Files:**
- Modify: `app/index.tsx` (full rewrite of state + JSX)

- [ ] **Step 1: Replace state variables**

Remove:
```typescript
const [mode, setMode] = useState<'solo' | 'group'>('solo');
const [groupPhase, setGroupPhase] = useState<'pick' | 'enter-name' | 'creating'>('pick');
const [groupTopic, setGroupTopic] = useState<Topic | null>(null);
```

Replace with:
```typescript
const [phase, setPhase] = useState<'home' | 'choose-mode' | 'enter-name' | 'creating'>('home');
const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
```

Remove derived `isGroupMode`:
```typescript
const isGroupMode = mode === 'group';
```

- [ ] **Step 2: Replace `handleTopicPress`**

Replace the function:

```typescript
function handleTopicPress(topic: Topic) {
  setSelectedTopic(topic);
  setPhase('choose-mode');
}
```

Note: `trackTopicSelected` is no longer called here — it fires when the user commits to a path in the mode-choice screen.

- [ ] **Step 3: Replace `resetToSolo` with `resetToHome`**

```typescript
function resetToHome() {
  setPhase('home');
  setSelectedTopic(null);
}
```

- [ ] **Step 4: Add `handleDecideSolo` function**

```typescript
function handleDecideSolo() {
  if (!selectedTopic) return;
  trackTopicSelected(selectedTopic, 'solo');

  const filterParams: Record<string, string> = { topic: selectedTopic };
  if (selectedTopic === 'food') {
    filterParams.openNow = String(foodFilters.openNow);
    if (foodFilters.categories.length > 0) filterParams.categories = JSON.stringify(foodFilters.categories);
    filterParams.sortBy = foodFilters.sortBy;
  } else {
    if (mediaFilters.genreIds.length > 0) filterParams.genreIds = JSON.stringify(mediaFilters.genreIds);
    filterParams.sortTmdb = mediaFilters.sortTmdb;
  }

  resetToHome();
  router.push({ pathname: '/swipe', params: filterParams });
}
```

- [ ] **Step 5: Update `handleCreateGroup`**

Update references from `groupTopic` → `selectedTopic`, `setGroupPhase` → `setPhase`, `resetToSolo` → `resetToHome`, and rename UI strings:

```typescript
async function handleCreateGroup() {
  if (!selectedTopic || !displayName.trim()) {
    Alert.alert('Missing info', 'Please enter your name.');
    return;
  }
  setPhase('creating');
  try {
    const code = generateSessionCode();
    const deviceId = await getDeviceId();

    let fetchOptions: Record<string, any> = {};
    if (selectedTopic === 'food') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        fetchOptions = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      }
      fetchOptions.openNow = foodFilters.openNow;
      if (foodFilters.categories.length > 0) fetchOptions.categories = foodFilters.categories;
      fetchOptions.sortBy = foodFilters.sortBy;
    } else {
      if (mediaFilters.genreIds.length > 0) fetchOptions.genreIds = mediaFilters.genreIds;
      fetchOptions.sortTmdb = mediaFilters.sortTmdb;
    }

    const cards = await providers[selectedTopic].fetchCards(fetchOptions);
    if (cards.length === 0) {
      Alert.alert('No results', 'Could not find any options. Try again later.');
      setPhase('enter-name');
      return;
    }

    const location = selectedTopic === 'food' && fetchOptions.latitude
      ? { latitude: fetchOptions.latitude, longitude: fetchOptions.longitude!, radiusMiles: 5 }
      : undefined;

    const trimmedName = displayName.trim();
    await AsyncStorage.setItem(DISPLAY_NAME_KEY, trimmedName);
    await createSession(code, selectedTopic, deviceId, trimmedName, cards, location);
    trackTopicSelected(selectedTopic, 'group');
    trackGroupSessionCreated(selectedTopic);
    resetToHome();
    router.push({ pathname: '/lobby', params: { code, topic: selectedTopic, isCreator: 'true' } });
  } catch (err) {
    logError(err, 'handleCreateGroup');
    Alert.alert('Error', `Could not create group: ${err instanceof Error ? err.message : 'Unknown error'}`);
    setPhase('enter-name');
  }
}
```

- [ ] **Step 6: Rewrite the JSX return**

Replace the entire `return (...)` block:

```tsx
const isEnterNameOrCreating = phase === 'enter-name' || phase === 'creating';

return (
  <SafeAreaView style={[styles.container, isEnterNameOrCreating && styles.containerGroupMode]}>
    <View style={styles.sparkleContainer}>
      <SparkleButton onPress={() => setSupportVisible(true)} />
    </View>
    <SupportPanel visible={supportVisible} onClose={() => setSupportVisible(false)} />
    <FeedbackModal visible={feedbackVisible} onClose={() => setFeedbackVisible(false)} />
    {selectedTopic && (
      <SearchOptions
        visible={optionsVisible}
        topic={selectedTopic}
        foodFilters={foodFilters}
        mediaFilters={mediaFilters}
        onApplyFood={setFoodFilters}
        onApplyMedia={setMediaFilters}
        onClose={() => setOptionsVisible(false)}
      />
    )}

    <View style={styles.header}>
      <Logo />
    </View>

    <View style={styles.buttons}>
      {/* Phase: Home — topic buttons + Join Group */}
      {phase === 'home' && (
        <>
          <TopicButton
            label={topicDisplayNames.food}
            color={topicColors.food}
            icon="ForkKnife"
            onPress={() => handleTopicPress('food')}
          />
          <TopicButton
            label={topicDisplayNames.movie}
            color={topicColors.movie}
            icon="FilmSlate"
            onPress={() => handleTopicPress('movie')}
          />
          <TopicButton
            label={topicDisplayNames.show}
            color={topicColors.show}
            icon="Television"
            onPress={() => handleTopicPress('show')}
          />
          <View style={styles.joinContainer}>
            <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/join')}>
              <Text style={styles.joinButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Phase: Choose Mode — Decide Together / Solo / Options */}
      {phase === 'choose-mode' && selectedTopic && (
        <View style={styles.modeChoice}>
          <Text style={styles.modeTopicTitle}>
            {topicDisplayNames[selectedTopic]}
          </Text>
          <TouchableOpacity
            style={styles.decideTogether}
            onPress={() => setPhase('enter-name')}
          >
            <Text style={styles.decideTogetherText}>Decide Together</Text>
            <Text style={styles.decideSubtext}>Create a group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.decideSolo}
            onPress={handleDecideSolo}
          >
            <Text style={styles.decideSoloText}>Decide Solo</Text>
            <Text style={styles.decideSoloSubtext}>Swipe on your own</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setOptionsVisible(true)}>
            <Text style={styles.optionsLink}>Options</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetToHome} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Phase: Enter Name */}
      {phase === 'enter-name' && (
        <View style={styles.groupForm}>
          <Text style={[styles.groupTitle, styles.groupTitleWhite]}>Your display name</Text>
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
            <Text style={styles.createButtonText}>Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPhase('choose-mode')} style={styles.backLink}>
            <Text style={styles.backLinkTextWhite}>← Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Phase: Creating */}
      {phase === 'creating' && (
        <View style={styles.groupForm}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { marginTop: spacing.md, color: '#FFFFFF' }]}>
            Creating group...
          </Text>
        </View>
      )}
    </View>

    <View style={styles.feedbackContainer}>
      <FeedbackButton onPress={() => setFeedbackVisible(true)} />
    </View>
  </SafeAreaView>
);
```

- [ ] **Step 7: Update StyleSheet**

Remove unused styles: `tagline`, `taglineGroup`, `backRow`, `backText`, `modeButtons`, `groupButton`, `groupButtonText`, `goBackButton`, `goBackButtonText`, `optionsButton`, `optionsButtonText`.

Replace existing `joinButton` and `joinButtonText` styles (they already exist but need updated styling). Update `backLinkText` to use dark color for light backgrounds.

Replace/add styles:

```typescript
joinContainer: {
  marginTop: spacing.xl,
  width: '100%',
  alignItems: 'center',
},
joinButton: {
  backgroundColor: colors.surface,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.xl,
  borderRadius: 16,
  width: '100%',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: colors.tertiary,
},
joinButtonText: {
  ...typography.body,
  color: colors.tertiary,
  fontWeight: '700',
},
modeChoice: {
  width: '100%',
  gap: spacing.md,
  alignItems: 'center',
},
modeTopicTitle: {
  ...typography.title,
  textAlign: 'center',
  marginBottom: spacing.md,
},
decideTogether: {
  backgroundColor: colors.tertiary,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.xl,
  borderRadius: 16,
  width: '100%',
  alignItems: 'center',
},
decideTogetherText: {
  ...typography.body,
  color: '#FFFFFF',
  fontWeight: '700',
},
decideSubtext: {
  ...typography.caption,
  color: 'rgba(255,255,255,0.8)',
  marginTop: 2,
},
decideSolo: {
  backgroundColor: colors.surface,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.xl,
  borderRadius: 16,
  width: '100%',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: colors.tertiary,
},
decideSoloText: {
  ...typography.body,
  color: colors.tertiary,
  fontWeight: '600',
},
decideSoloSubtext: {
  ...typography.caption,
  color: colors.textSecondary,
  marginTop: 2,
},
optionsLink: {
  ...typography.caption,
  color: colors.tertiary,
  textDecorationLine: 'underline' as const,
  marginTop: spacing.sm,
},
// Update existing backLinkText to dark color (used on light-bg choose-mode screen)
backLinkText: {
  ...typography.caption,
  color: colors.textSecondary,
},
// New: white variant for purple-bg enter-name screen
backLinkTextWhite: {
  ...typography.caption,
  color: '#FFFFFF',
},
```

- [ ] **Step 8: Remove unused imports**

Remove `ScrollView` from the react-native import if no longer used.

- [ ] **Step 9: Run tests and type check**

Run: `npx jest --no-coverage 2>&1 | tail -5`
Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: All pass, zero TS errors.

- [ ] **Step 10: Commit**

```bash
git add app/index.tsx
git commit -m "feat: unified home flow — topic first, then choose solo or group"
```

---

### Task 4: Run full verification

- [ ] **Step 1: Run full test suite**

Run: `npx jest --no-coverage 2>&1`
Expected: All tests pass.

- [ ] **Step 2: TypeScript type check**

Run: `npx tsc --noEmit 2>&1`
Expected: Zero errors.

- [ ] **Step 3: Manual test checklist**

Start the app with `npx expo start` and test:

1. Home screen shows logo (no tagline), 3 topic buttons, "Join Group" button
2. No "Group Mode" toggle or "Go Back" button visible
3. Tap "Eat?" → mode-choice screen shows "Eat?" title, "Decide Together", "Decide Solo", "Options", "← Back"
4. Tap "Options" → SearchOptions modal opens with food filters
5. Tap "← Back" → returns to home
6. Tap "Decide Solo" → navigates to swipe screen (no Options button in header)
7. Verify food filters carry through to solo swipe results
8. Go back, tap "Watch?" → "Decide Solo" → verify media filters carry through
9. Tap "Decide Together" → enter-name screen (purple bg), "Create Group" button, single "← Back"
10. Tap "← Back" → returns to mode-choice (not home)
11. Enter name, tap "Create Group" → shows "Creating group..." spinner → navigates to lobby
12. Lobby shows "Group: {code}" (not "Session:")
13. Tap "Cancel Group" (not "Cancel Session")
14. "Join Group" button on home → navigates to join screen
15. Join screen shows "Join Group" title, "Group Code" label
16. Test SMS invite text says "Join my group:" (not "Join my session:")
17. In group-swipe, "End Group?" alert (not "End Session?")
18. In group-result failed state, tip says "starting a group" (not "starting a group session")

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Final commit if needed**

```bash
git add -A
git commit -m "fix: address manual testing feedback for unified home flow"
```
