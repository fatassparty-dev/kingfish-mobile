# Android submission progress

Last updated: 2026-08-24

> The closed Alpha release and its Play listing/declarations have been
> submitted and are in Google review. KingFish Bets is **not** publicly released
> on Google Play yet.

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

Before promotion, run the NCAAF regression pass in a Play-installed build:
conference accuracy (especially SEC/Georgia-name collisions), weather and
indoor/unavailable states, AP Top 25 freshness, game-line/edge rendering, and
empty/loading/error states. OTA is intentionally deferred; this release ships
through Google Play.

## Current state

| Area | Status | Current result / next action |
|---|---|---|
| Play developer account | Complete | KingFish Bets, LLC organization account approved; exempt from the personal-account 12-testers/14-days rule |
| Android binary | Complete | Version `1.0.5`, version code `2` |
| Firebase / RevenueCat / RTDN | Complete | Credentials validated and the Google real-time developer notification test was received |
| Internal install | Complete | Play-installed build launched in the Android emulator |
| Paywall copy | Smoke-tested | Displays 3 days free, then $0.99 for the first paid month, then $4.99/month |
| Store listing and declarations | Submitted | Closed Alpha, store assets/copy, Data Safety, content rating, target audience, and other declarations submitted 2026-08-23 |
| Google review | In review | Publishing Overview showed **Changes in review** |
| Google Payments | In progress | W-9 submitted/in review; bank microdeposit and merchant activation pending |
| Public production release | Not started | Do not proceed until review, payments, and release-gate QA are complete |

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

**The app is live on Google Play as of 2026-08-27.** These are open items on a
shipped app, not blockers to launch.

1. Complete the bank microdeposit and verify merchant activation — **do this
   first**, revenue depends on it.
2. Run the purchase, restore, entitlement, subscription-management, push, and
   broader QA gates above in a Play-installed build.
3. Complete the NCAA football native scope above and run its Play-installed
   regression pass alongside the broader QA gates.
4. Fix any review or QA findings and upload a higher version code; the NCAAF
   changes require a new binary.


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
- The remaining items below are therefore **live-app** work, not pre-launch
  gates. The one that affects real users: until the bank microdeposit and
  merchant/payments profile are verified, Play subscriptions may not be
  purchasable — check that a real purchase completes on a Play-installed build
  before driving any traffic to the listing.
- NCAAF native scope still requires a new binary and a higher version code.
- Same day: KingFish Studio `1.0.2 (17)` was submitted for Apple App Review on
  both iPad and Mac.

## Security notes

- `google-services.json` is Firebase client configuration, not a server secret,
  but its API key should still be restricted and the repository policy followed.
- Review and resolve the GitHub secret-scanning alert for the Firebase API key;
  rotate it if it was unrestricted or exposed beyond its intended client use.
- Never commit or paste service-account JSON, private keys, passwords, reviewer
  credentials, banking data, or tax data into this repository or tracker.
