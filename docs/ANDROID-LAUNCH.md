# Android launch plan

Written 2026-08-20, for a fresh chat session. Read this whole file before
starting — it front-loads two risks that can blow the Sept 9 deadline if
found late instead of first.

## Correcting an assumption from planning

**This is not a new app or a new codebase.** KingFish Bets is Expo/React
Native — the same JS/TS in this repo already runs on iOS; Android is the same
source with native Android project files generated from it (the same way
`ios/` already exists here, generated from this repo, not hand-built). There
is no new folder for the app itself. `android/` will appear inside
`kingfish-mobile` the first time it's built, same as `ios/` did.

What genuinely IS new is account-side setup — a different store, a different
console, a different signing story — which is most of what's below.

## Current repo state (verified 2026-08-20)

- `app.json` → `expo.android.package = "com.kingfishbets.app"` — already set,
  matches the iOS bundle ID convention. Nothing to decide here.
- `lib/purchases.ts` already branches on `Platform.OS === 'android'` and reads
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` — the code path exists, the env var
  does not.
- No `android/` directory, no keystore, no `google-services.json` anywhere in
  the repo. All three get created during this work, none exist yet.
- `expo-notifications` is an active dependency (push notifications are a real
  iOS feature already). Android push needs Firebase Cloud Messaging — this
  does NOT come free with the Apple-side setup; it's a separate credential.
- `eas.json` currently has only an `ios` block under `submit.production` and
  no `android` build profile at all.

## The two things to resolve FIRST, before any code work

### 1. Google Play's closed-testing requirement — this is the schedule risk

Google requires new developer accounts to run a **closed test with a minimum
number of opted-in testers for a minimum number of consecutive days** before
the account can request production access for its first app. This is a
policy Google has changed more than once, and I do not have a verified
current number for it — do not trust a remembered figure here, including any
number that might get typed into this file later without a fresh check.

**Before doing anything else:** check the current requirement at
`https://support.google.com/googleplay/android-developer/answer/14151465`
(Play Console's own testing-track requirements page) and confirm the number
of testers and days that apply to a brand-new account today, since this could
mean production isn't available on day one no matter how ready the app is.
Recruiting testers and running the clock is a parallel-track task that should
start the moment the Play Console account exists — it can run alongside
everything else below, but it cannot be skipped or rushed, and it is the
single most likely reason "submitted by Sunday" does not mean "live by
Sunday."

**Worth checking specifically:** whether verifying the Play Console account
as an **Organization** (using the LLC + D-U-N-S already on file for the Apple
submission) changes this requirement versus a personal account. Don't assume
either way — confirm on the page above.

### 2. Google Play's gambling policy — this is the rejection risk

KingFish does not accept wagers or process bets — same position as the note
already accepted by Apple. Google's gambling policy is separately stricter in
some respects and enforcement mistakes here can affect the whole developer
account, not just this one app's listing. Read Google Play's current
Gambling policy page before submitting, and if the app's category or
description gets anywhere near "sportsbook" language, that's worth a second
look before Store Listing is finalized. The Apple review-notes language that
worked ("does not accept wagers, process bets, or handle any gambling
transactions... displays publicly available odds and statistics for
comparison") is a reasonable starting point for Google's own
gambling-content declaration if the listing flow asks for one, but Google's
form is a different questionnaire and needs its own honest answers, not a
copy-paste.

## Account-side setup (Brian — needs a Google account, cannot be scripted)

1. **Google Play Console developer account** — $25 one-time (vs. Apple's
   $99/year). Register as **Organization**, not Individual, given the LLC +
   D-U-N-S are already on hand from the Apple submission — check whether this
   affects item #1 above before deciding.
2. **Start the closed-testing clock immediately** once the account exists —
   don't wait for the app to be "ready." Recruit testers early (can be the
   same TestFlight testers, redirected).
3. **RevenueCat** — add an Android app to the existing KingFish project in
   the RevenueCat dashboard, connect it to Play Console once that exists, get
   the Play Store API key. Comes back as `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
   for `eas.json`.
4. **Play Console subscription products** — the Android equivalent of App
   Store Connect's in-app purchases. Same product structure as iOS ideally,
   configured in Play Console directly (not something I can do from the
   repo).
5. **Firebase project + `google-services.json`** — needed for push
   notifications (FCM). Create a Firebase project, add an Android app inside
   it with package `com.kingfishbets.app`, download `google-services.json`.
   This file is a secret — do not commit it; it follows the same
   gitignore-and-keep-a-copy pattern as `.env`.
6. **Signing** — decide between Google Play App Signing (Google holds the
   upload key, recommended, standard for new apps) and a self-managed
   keystore. If using EAS Build, `eas credentials` can generate and manage
   this without a manual keytool step.
7. **Store listing assets** — different shapes than Apple, not a re-export of
   the iOS ones:
   - Feature graphic, 1024×500 (Google-only, no iOS equivalent)
   - App icon, 512×512 PNG
   - Phone screenshots — Google is looser on aspect ratio than Apple, but
     still needs real screenshots, not the iOS set resized
   - Short description (80 char) and full description (4000 char) — the iOS
     description (`kingfish-mobile`'s App Store copy) is a solid starting
     draft, needs a pass for Google's own tone/format rather than a
     straight copy-paste
   - Data safety section — Google's own version of Apple's privacy nutrition
     label, a different form asking similar questions
   - Content rating questionnaire (IARC) — answer honestly; gambling-adjacent
     categories will trigger extra questions given the app's subject matter

## Code-side work (can happen in parallel with the above)

- `eas.json`: add an `android` build profile (production, matching the `ios`
  one's shape) and `submit.production.android` with the Play Console package
  name and, if using automated `eas submit`, a Google **service account** JSON
  key with Play Console API access (a separate credential from
  `google-services.json` — one authenticates the app to Google's push
  service, the other authenticates EAS to the Play Console API for uploads).
- Wire `google-services.json` into the Android build the way `GoogleService-Info.plist`
  equivalent is wired on iOS — via `app.json`'s `android.googleServicesFile`.
- First build: `eas build --platform android --profile production` (or the
  local-build equivalent, to be decided once EAS access is confirmed) —
  expect this to surface Android-specific build issues no amount of iOS
  testing would catch. Budget real time for a first-build shakeout, same as
  the iOS archive took multiple attempts to get the flags right.
- Test on an Android emulator or a real device before any store submission —
  there is no iOS-side substitute for this; the two platforms diverge in
  real, not cosmetic, ways (permissions dialogs, back-button behavior,
  notification channels).

## What does NOT need redoing

Everything server-side is already cross-platform and needs zero Android
work: every API route, every cheat sheet, Sports You Follow, Home
customization, RevenueCat's iOS entitlement logic (Android just needs its own
key wired into the same code path), the whole `/api/account` and
`/api/mobile-config` contract. Android is a client, same as iOS and Studio
are clients — it reads the same server.

## Suggested sequence

1. Play Console account (Organization) — do this literally first, today,
   because the closed-testing clock only starts once it exists.
2. While that account/clock runs: RevenueCat Android app, Firebase project,
   `eas.json` android block, first `eas build` attempt, on-device testing.
3. Store listing assets + copy.
4. Once the closed-testing requirement is satisfied AND the app is tested:
   submit for production review.

Given the closed-testing clock is unverified but plausibly measured in days
(not hours), "submitted by Sunday" is achievable for the app/build itself;
"live by Sunday" depends entirely on what step 1's research finds. Confirm
that number before promising a date to anyone.
