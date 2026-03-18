# WhaTo — Apple App Store Distribution Guide

## Prerequisites Already Completed
- [x] Privacy policy written and hosted (GitHub Pages)
- [x] TMDB and Yelp attribution added to swipe screens
- [x] All console statements removed from production code
- [x] iOS `buildNumber` added to app.json
- [x] Location permission description in `infoPlist`
- [x] `ITSAppUsesNonExemptEncryption: false` (avoids export compliance questionnaire)
- [x] `eas.json` created with build profiles
- [x] App name corrected to "WhaTo"
- [x] Android `versionCode` added
- [x] All code pushed to GitHub

---

## Step 1: Apple Developer Account (~5 min)

Enroll at https://developer.apple.com ($99/year). If you already have one, skip this.

## Step 2: Install EAS CLI & Log In (~2 min)

```bash
npm install -g eas-cli
eas login
```

## Step 3: Link Your Expo Project (~1 min)

```bash
cd ~/Scripts/Whato
eas init
```

This registers the project with Expo and creates a project ID.

## Step 4: Enable GitHub Pages (~2 min)

1. Go to https://github.com/networkingguru/WhaTo/settings/pages
2. Source: **Deploy from branch** → Branch: `main`, folder: `/docs`
3. Save
4. Privacy policy will be live at: `https://networkingguru.github.io/WhaTo/privacy-policy`

## Step 5: Update eas.json Submit Config (~2 min)

Open `eas.json` and replace the three placeholders under `submit.production.ios`:

| Placeholder | Where to Find It |
|-------------|-----------------|
| `YOUR_APPLE_ID` | Your Apple Developer account email |
| `YOUR_APP_STORE_CONNECT_APP_ID` | Created in Step 6 (numeric Apple ID shown in App Store Connect) |
| `YOUR_TEAM_ID` | Apple Developer account → Membership → Team ID |

## Step 6: Create App in App Store Connect (~10 min)

1. Go to https://appstoreconnect.apple.com
2. Click **"+"** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** WhaTo
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** `com.whato.app` (register it first under Certificates, Identifiers & Profiles if not already there)
   - **SKU:** `whato`
4. Note the **Apple ID** (numeric) — this is your `ascAppId` for eas.json

## Step 7: Fill in App Store Connect Metadata (~15 min)

### App Information
- **Subtitle:** Group decisions made easy
- **Category:** Lifestyle (primary), Food & Drink (secondary)
- **Privacy Policy URL:** `https://networkingguru.github.io/WhaTo/privacy-policy`

### Description (suggested)
```
Can't decide what to eat or watch? WhaTo helps you and your friends decide — fast.

Pick a topic — Eat? Watch? Stream? — then decide together or go solo. In a group, everyone swipes until you match. On your own, swipe right on what you love.

Features:
• Swipe through restaurants near you, powered by Yelp
• Browse trending movies and TV shows from TMDB
• Filter by cuisine, genre, rating, and more
• Decide together: create a group, invite friends via SMS, and match in real time
• Decide solo: swipe on your own when you just need a pick
• No account needed — just open and swipe

No ads. No data collection. Just decisions, made easier.
```

### Keywords
```
restaurant,movie,group,decision,swipe,food,watch,tv,show,friend
```

### App Privacy Section
Select the following data types:
- **Location:** "Used for app functionality" → "Not linked to user" → "Not used to track"
- **Identifiers (Device ID):** "Used for app functionality" → "Not linked to user" → "Not used to track"
- **Diagnostics (Crash Data):** "Used for app functionality" → "Not linked to user" → "Not used to track" (Firebase Crashlytics)
- **Usage Data (Product Interaction):** "Used for analytics" → "Not linked to user" → "Not used to track" (Firebase Analytics — anonymous screen views and events)

## Step 8: Screenshots (~10 min)

### Required Sizes
| Device | Resolution | Required? |
|--------|-----------|-----------|
| 6.7" (iPhone 15 Pro Max) | 1290 × 2796 | **Yes** |
| 6.5" (iPhone 14 Plus) | 1284 × 2778 | **Yes** |
| 5.5" (iPhone 8 Plus) | 1242 × 2208 | Recommended |

### How to Get Screenshots

**Option A: Xcode Simulator (easiest, no device needed)**
1. After running `eas build`, or locally with `npx expo run:ios`
2. Open Simulator → Device menu → choose the right device size
3. Take screenshots with Cmd+S
4. Capture 4-6 screens: home screen, mode-choice screen, swipe screen (food), group lobby, card detail, group results

**Option B: Real Device**
Take screenshots on an actual iPhone and transfer them.

**Option C: Mockup Tools (if you want marketing-style frames)**
- https://mockuphone.com (free, paste screenshots into device frames)
- https://screenshots.pro (free tier available)
- Figma with device frame templates

Apple accepts both raw screenshots and framed mockups. Framed mockups with captions tend to convert better but are not required.

## Step 9: Build for iOS (~15 min wait)

```bash
eas build --platform ios --profile production
```

EAS handles provisioning profiles and signing automatically. First build takes ~15 minutes. You'll be prompted to log in to your Apple account.

## Step 10: Submit the Build (~2 min)

```bash
eas submit --platform ios --profile production
```

Or download the `.ipa` from EAS and upload through Apple's **Transporter** app.

## Step 11: Submit for Review

1. In App Store Connect, go to your app
2. Under the new version, select the uploaded build
3. Add your screenshots
4. Fill in "What's New" (for 1.0.0: "Initial release")
5. Click **Submit for Review**

First review typically takes **24-48 hours**. If rejected, Apple tells you exactly why — fix the issue and resubmit.

---

## Common First-Submission Rejections (and how to avoid them)

| Reason | Prevention |
|--------|-----------|
| Missing privacy policy | Already done — linked in app and App Store Connect |
| Incomplete metadata | Fill in all fields in Step 7 |
| Crashes on launch | Test the production build on a real device before submitting |
| Missing permission descriptions | Already added NSLocationWhenInUseUsageDescription |
| App feels like a demo | All features are functional — not an issue |
| Login wall without guest access | No login required — not an issue |

---

## After Approval

- Enable **GitHub Pages** if not already done (Step 4)
- Consider adding `expo-updates` later for OTA updates without resubmitting
- Increment `buildNumber` in app.json for each new submission
- The `autoIncrement` setting in eas.json handles this automatically for EAS builds

---

**Total estimated active time:** ~1 hour
**Total wall-clock time (including build + review):** 2-3 days
