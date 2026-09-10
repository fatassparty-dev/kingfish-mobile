# Android submission progress

Last updated: 2026-09-10

> Android 1.0.9 (version code 6) is approved and published to Google Play.
> Submission activity shows it was submitted September 8, 2026 at 10:14 p.m.
> Central and it was first confirmed **Published** September 9 at 7:35 a.m.
> Central. The exact approval/publication time within that interval is unknown.

## Next Android release — Free dashboard previews

Android `1.0.10`, version code `7`, is ready for production upload. The scope
is frozen to three-row Free dashboard previews, corrected NFL Player Props stat
display, and accurate required account-notification controls. The TypeScript
check and Android JavaScript bundle export passed before the signed build. The
signed production build completed successfully and passed a complete ZIP
integrity check. It is staged for the Google Play production upload.

- Source commit: `e23725969b6112c519e07d73bffe851a34c03092`
- EAS build ID: `c9009656-294b-4073-8786-c3c4fbc58130`
- Artifact: `~/Developer/KingFishBetsLLC/builds/KingFishBets-android-1.0.10-vc7.aab`
- Artifact size: `55,174,323` bytes
- Artifact SHA-256: `155d4267a283d48352647604e86625aebdc452023f518669b721306bbe26a012`
- Track: production
- Upload status: manual Play Console upload required; EAS Submit has no Google
  service-account key configured for `com.kingfishbets.app`

Planned Google Play release note:

> Free accounts can now sample live Player Props and Game Props boards before
> upgrading, with a compact three-row preview built for phones. This update also
> improves NFL player-stat display and account-notification settings.

## Current Android release — NFL opening week

The current production release is version `1.0.9`, version code `6`. Do not
reuse code `5`; it belongs to an earlier completed cloud build even though code
`4` was the prior public Play release.

Included scope:

- NFL Daily Intel in the native Tools area.
- Native NCAA football cheat sheets.
- Secure persistent sign-in across normal app closes and reopenings.
- Native signup metadata for platform, store source, client, version and build.
- Provider-aware subscription management and store-link fallback handling.
- The NCAA rankings, conference, matchup weather and current-season work already
  shipped in 1.0.8.

Intended Google Play release note:

> New NFL Daily Intel brings today's football headlines into Tools. This update
> also adds college football cheat sheets, improves sign-in persistence, and
> includes signup and subscription reliability improvements.

Google Play screenshots and the main store listing were not changed with this
binary submission. They can be updated separately. Track the release's effect
using [RELEASE-IMPACT-LEDGER.md](RELEASE-IMPACT-LEDGER.md).

## Current state

| Area | Status | Current result / next action |
|---|---|---|
| Play developer account | Complete | KingFish Bets, LLC organization account approved; exempt from the personal-account 12-testers/14-days rule |
| Android binary | Complete | Public: `1.0.9` code `6` |
| Firebase / RevenueCat / RTDN | Complete | Credentials validated and the Google real-time developer notification test was received |
| Internal install | Complete | Play-installed build launched in the Android emulator |
| Paywall copy | Smoke-tested | Displays 3 days free, then $0.99 for the first paid month, then $4.99/month |
| Store listing and declarations | Complete | Approved public listing and declarations |
| Google review | Approved | 1.0.9 submission published by 2026-09-09 7:35 a.m. Central |
| Google Payments | Complete | Launch purchase, restore, entitlement, and subscription-management checks passed |
| Public production release | Live | Android `1.0.9`, version code `6` |

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
- Marketing version: `1.0.9`
- Android version code: `6`
- Source commit: `adf4627a34b5f20178d5b36fff5d8fd75172a5ff`
- EAS build ID: `15a60bf7-b2c1-4f69-a5af-4bc6f91c2c77`
- Artifact: `~/Developer/KingFishBetsLLC/builds/KingFishBets-android-1.0.9-vc6.aab`
- Artifact SHA-256: `da3f923db7edf0e26525a8e87fa845dadd94052fedee538477feb419c864a534`
- Track: production
- RevenueCat entitlement: the existing KingFish Bets Pro entitlement

## What has been verified

- The internal-testing link propagated and accepted the approved tester.
- The Play build installed and opened in the Android emulator.
- The upgrade screen showed the approved Google monthly offer copy.
- Google Play accepted the bundle, package, signing, version code, and target
  API level.
- The 1.0.9 app bundle passed a complete ZIP integrity check before upload.
- Google Play reported no loss of supported phones, tablets or other existing
  device classes compared with the prior release.
- RevenueCat accepted the Play credentials and received the RTDN test event.
- The account-deletion page is live at
  `https://kingfishbets.com/account-deletion`.

## Launch gates verified 2026-08-27

- [x] Complete a real Google Play test purchase.
- [x] Confirm premium entitlement syncs after purchase and after a fresh login.
- [x] Confirm **Restore Purchases** works.
- [x] Confirm Google Play subscription management opens correctly.
- [x] Receive and open a real Android push notification.
- [x] Run broader Android QA: navigation/back behavior, account flows, live data,
  Grade My Slip/photo picker, legal/support links, and cancellation states.
- [x] Confirm the W-9, bank verification, and merchant/payments profile are active.

## Next session

**Android 1.0.9 is published.** Store publication is verified; post-release
device QA and a real new Android signup carrying version/build attribution have
not yet been verified.

Remaining, as ordinary post-launch work:

1. Run the Play-installed 1.0.9 regression pass and watch production/user
   reports through the September 9 opener and September 13 first NFL Sunday.
2. Capture the release-impact checkpoints in `RELEASE-IMPACT-LEDGER.md`.
3. Keep Android in step with iOS releases from here — same Expo/RN codebase,
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

### 2026-08-30

- **ANDROID 1.0.8 APPROVED AND LIVE ON GOOGLE PLAY.** Version code `4` is now
  the public production release with the same NCAA and opening-week reliability
  scope as iOS 1.0.8.
- The September 1 cross-platform goal is complete two days early. Remaining
  work is regression testing, production monitoring, user feedback, and NFL
  readiness rather than another store submission.

### 2026-09-08–09

- Built Android `1.0.9`, version code `6`, on EAS from commit `adf4627` using
  the existing production keystore. The cloud build completed September 8 at
  7:45 p.m. Central and its downloaded 53 MB app bundle passed archive
  integrity verification.
- Uploaded the bundle manually to the production track. Google accepted version
  `6 (1.0.9)`, target SDK 36, all four ABIs and all four screen layouts with no
  loss of supported devices. The only upload message was the expected optional
  deobfuscation-file warning; this project does not enable R8/ProGuard.
- Google Play submission activity records the production change as submitted
  September 8 at 10:14 p.m. Central. It was first observed as **Published** on
  September 9 at 7:35 a.m. Central. Managed publishing was off, so approval
  published automatically.
- Treat the publication as a measured acquisition event. The hypothesis is that
  a fresh Play release may increase store visibility and therefore signups. A
  signup increase alone cannot establish that: compare Play impressions and
  store acquisitions alongside KingFish registrations, activation and paid
  conversion, and account for the NFL opener and $0.99 promotion.

### 2026-09-10

- Built Android `1.0.10`, version code `7`, on EAS from commit `e237259` using
  the existing production keystore. The production app bundle completed at
  12:39 p.m. Central and passed archive integrity verification.
- Staged the 55,174,323-byte bundle at
  `~/Developer/KingFishBetsLLC/builds/KingFishBets-android-1.0.10-vc7.aab` with
  SHA-256 `155d4267a283d48352647604e86625aebdc452023f518669b721306bbe26a012`.
- Release scope: three-row Free previews for supported Player Props and Game
  Props boards, NFL player-stat display corrections, and accurate required
  account-notification controls.
- Fast-forwarded the verified release through commit `3892585` to `origin/main`.
- Retried the configured noninteractive EAS production submission. The bundle
  uploaded to EAS Submit, but submission stopped before Google Play because no
  Google service-account key is configured. Use the staged bundle for the same
  manual production-track upload flow used for 1.0.9.

## Security notes

- `google-services.json` is Firebase client configuration, not a server secret,
  but its API key should still be restricted and the repository policy followed.
- Review and resolve the GitHub secret-scanning alert for the Firebase API key;
  rotate it if it was unrestricted or exposed beyond its intended client use.
- Never commit or paste service-account JSON, private keys, passwords, reviewer
  credentials, banking data, or tax data into this repository or tracker.
