# App Store Readiness — Design Spec

## Goal
Prepare WhaTo for Apple App Store and Google Play Store submission by addressing compliance blockers: missing privacy policy, missing third-party API attribution, and production code cleanup.

## Components

### 1. Privacy Policy (GitHub Pages)
A straightforward, honest privacy policy hosted at `docs/privacy-policy.md` and served via GitHub Pages. Covers:
- Anonymous device ID (generated UUID, stored locally)
- Display name (stored locally in AsyncStorage, shared only in group sessions)
- Temporary session data in Firebase (24h TTL, auto-expires)
- Location used only for restaurant search, not stored
- Third-party services: Firebase, Yelp, TMDB, Google Places
- No ads, no tracking, no personal data collection
- Children's privacy (COPPA)
- Contact: [CONTACT_EMAIL] placeholder

### 2. In-App Privacy Policy Link
Add "Privacy Policy" link to the SupportPanel so users can access it from within the app.

### 3. TMDB Attribution
TMDB API terms require: "This product uses the TMDB API but is not endorsed or certified by TMDB." Plus their logo. Add a small attribution line in the hints area of swipe screens for movie/show topics.

### 4. Yelp Attribution
Add "Powered by Yelp" text in the hints area of swipe screens for food topic.

### 5. Console Cleanup
Remove the `console.error` in `app/index.tsx:136`.

## Files to Modify
- `docs/privacy-policy.md` — new, the privacy policy
- `src/components/SupportPanel.tsx` — add Privacy Policy link
- `app/swipe.tsx` — add attribution text below hints
- `app/group-swipe.tsx` — add attribution text below hints
- `app/index.tsx` — remove console.error
