# Android submission progress

Last updated: 2026-08-29

> Android 1.0.5 (version code 2) is approved and publicly downloadable from
> Google Play. The completed NCAA improvement release, 1.0.8 (version code 4),
> is intentionally being held until the weekend after the initial launch so it
> is not submitted on the same day as the first public approval.

## Next Android release — NCAA football + fantasy season transition

The final combined pre-season release is version `1.0.8`, version code `4`. Do
not reuse version codes `2` or `3`; code `2` belongs to the closed Alpha and
code `3` was superseded before the final opening-week candidate.

Required scope:

- Read the current official AP Top 25 from `/api/ncaaf-rankings` in League View.
- Use backend `homeConference` and `awayConference` fields for exact conference
  filtering in both Game Props and Game Matchups.
- Replace the Matchups Status column with NCAAF weather from
  `/api/ncaaf-weather`.
- Remove static 2025 ranking/record/baseline language while retaining the
  server-calculated edge, grade, and lean contract.
- Shift Fantasy Hub from draft rankings to player updates and connected-team
  tools when the NFL regular season begins.

Google Play release note:

> College football is here. This update adds current AP Top 25 rankings,
> improved conference filtering, matchup weather, refreshed game-line and edge
> context, plus an NFL Fantasy Hub that shifts to in-season roster tools at kickoff.

When submitting it this weekend, use a short description such as **Improved
college-football rankings, conference filters, matchup weather, and game-line
context.** Then run the NCAAF regression pass in a Play-installed build:
conference accuracy (especially SEC/Georgia-name collisions), weather and
indoor/unavailable states, AP Top 25 freshness, game-line/edge rendering, and
empty/loading/error states. OTA is intentionally deferred; this release ships
through Google Play.

## Current state

| Area | Status | Current result / next action |
|---|---|---|
| Play developer account | Complete | KingFish Bets, LLC organization account approved; exempt from the personal-account 12-testers/14-days rule |
| Android binary | Complete | Public: `1.0.5` code `2`; next completed source release: `1.0.8` code `4` |
| Firebase / RevenueCat / RTDN | Complete | Credentials validated and the Google real-time developer notification test was received |
| Internal install | Complete | Play-installed build launched in the Android emulator |
| Paywall copy | Smoke-tested | Displays 3 days free, then $0.99 for the first paid month, then $4.99/month |
| Store listing and declarations | Complete | Approved public listing and declarations |
| Google review | Approved | Initial public release approved 2026-08-27 |
| Google Payments | Complete | Launch purchase, restore, entitlement, and subscription-management checks passed |
| Public production release | Live | Android `1.0.5`, version code `2` |

## Pricing source of truth

| Channel | Monthly | Annual |
|---|---|---|
| Apple App Store | No free trial. $0.99 for the first month, then $4.99/month | No free trial. $49.99/year |
| Google Play | 3 days free, then $0.99 for the first paid month, then $4.99/month | Not offered at initial Android launch |
| Website / Stripe | 3 days free, then $0.99 for the first paid month, then $4.99/month | Intended: 3 days free, then $49.99/year; reconfirm the live annual checkout before launch |

These differences are intentional. Never describe the Apple offer as a free
trial, and never remove Apple's annual subscription merely because Android is
monthly-only at launch.

## Build and release identifiers

- App: KingFish Bets
- Package: `com.kingfishbets.app`
- Marketing version: `1.0.5`
- Android version code: `2`
- EAS build ID: `2dc94643-ccc5-48da-8ecd-2cc657072d68`
- Track submitted for review: closed testing — Alpha
- RevenueCat entitlement: the existing KingFish Bets Pro entitlement

## What has been verified

- The internal-testing link propagated and accepted the approved tester.
- The Play build installed and opened in the Android emulator.
- The upgrade screen showed the approved Google monthly offer copy.
- Google Play accepted the bundle, package, signing, version code, and target
  API level.
- RevenueCat accepted the Play credentials and received the RTDN test event.
- The account-deletion page is live at
  `https://kingfishbets.com/account-deletion`.

## Release gates not yet verified

- Complete a real Google Play test purchase.
- Confirm premium entitlement syncs after purchase and after a fresh login.
- Confirm **Restore Purchases** works.
- Confirm Google Play subscription management opens correctly.
- Receive and open a real Android push notification.
- Run broader Android QA: navigation/back behavior, account flows, live data,
  Grade My Slip/photo picker, legal/support links, and cancellation states.
- Confirm the W-9, bank verification, and merchant/payments profile are active.

## Next session

**Android is DONE and live.** The launch checklist was completed and verified
2026-08-27 — nothing on this tracker is blocking.

Remaining, as ordinary post-launch work:

1. Submit the completed NCAA football improvement, Android `1.0.8` version code
   `4`, this weekend and run its Play-installed regression pass after approval.
2. Keep Android in step with iOS releases from here — same Expo/RN codebase,
   so client changes need a Play build the same way they need an App Store
   build. There is no OTA on either platform.

## Activity log

### 2026-08-22

- Completed organization-account setup, Firebase/FCM, Play credentials,
  RevenueCat, RTDN, subscriptions, and the first internal releases.
- Published Android `1.0.5` version code `2` to internal testing.
- Installed and opened the app in a Google Play-enabled emulator after the
  internal-testing link finished propagating.
- Smoke-tested the approved monthly offer copy.

### 2026-08-23

- Completed the Play listing, graphics, reviewer access, Data Safety, content
  rating, target audience, ads, financial, health, Advertising ID, and store
  settings declarations.
- Created the closed Alpha release from version code `2`.
- Submitted the closed-test release and related changes; Publishing Overview
  moved them to **Changes in review**.

### 2026-08-27

- **LIVE ON GOOGLE PLAY.** Google approved the app and it is publicly
  downloadable at
  `https://play.google.com/store/apps/details?id=com.kingfishbets.app` —
  Android `1.0.5`, version code `2`. KingFish is now shipping on three stores.
- **Full launch checklist completed and verified the same day**: bank
  microdeposit cleared, merchant/payments profile active, and the purchase,
  restore, entitlement, subscription-management, and push gates all passed on a
  Play-installed build. Android subscriptions are live and purchasable.
- Only NCAAF native scope remains, and it needs a new binary anyway.
- Same day: KingFish Studio `1.0.2 (17)` was submitted for Apple App Review on
  both iPad and Mac.

### 2026-08-29

- Built Android `1.0.8`, version code `4`, on EAS (`production` profile,
  `app-bundle`). Build ID `6237b40d-9f23-4f94-87e2-8e51b8159185`, cut from
  commit `75cbaff`, finished 10:30 CT. Existing keystore
  (`Build Credentials q0PnE6Tqcy`) was reused, so the app signing key is
  unchanged.
- Verified in the shipping `.aab` itself, not just a local prebuild: the
  manifest carries the `asset_statements` meta-data entry and the compiled
  resources carry the `https://www.kingfishbets.com` string, both from
  `plugins/withAssetStatements.js`. No `autoVerify` intent filter was added.
- Pre-build gates passed: `tsc --noEmit` clean; NCAAF League View reads
  `/api/ncaaf-rankings`; matchup weather reads `/api/ncaaf-weather`; conference
  filtering uses the backend `homeConference`/`awayConference` fields; no static
  2025 baseline strings remain; `/api/mobile-config` returns a `release` object
  with both minimum-version fields blank.
- **`eas submit` could not be used.** EAS has no Google Service Account key
  stored for `com.kingfishbets.app`, and one cannot be configured in
  `--non-interactive` mode. A `submit.production.android` profile was added to
  `eas.json` (track `production`, `releaseStatus` `draft`) and is correct, but
  it stays inert until that credential exists. Until then, Android uploads are
  manual through the Play Console.
- The bundle is staged at
  `~/Developer/KingFishBetsLLC/builds/KingFishBets-android-1.0.8-vc4.aab`
  (53 MB, sha256 `00e78323…d1885`) awaiting a manual Play Console upload.
- Still outstanding: `ANDROID_CERT_SHA256` is not set in Vercel, so
  `https://www.kingfishbets.com/.well-known/assetlinks.json` returns 404 and the
  manifest entry above does nothing yet. Harmless, but the feature is not live
  until both halves are.

## Security notes

- `google-services.json` is Firebase client configuration, not a server secret,
  but its API key should still be restricted and the repository policy followed.
- Review and resolve the GitHub secret-scanning alert for the Firebase API key;
  rotate it if it was unrestricted or exposed beyond its intended client use.
- Never commit or paste service-account JSON, private keys, passwords, reviewer
  credentials, banking data, or tax data into this repository or tracker.
