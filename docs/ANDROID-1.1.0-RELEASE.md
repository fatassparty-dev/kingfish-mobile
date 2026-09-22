# Android 1.1.0 — NFL Teaser Builder

## Release identity

- Package: `com.kingfishbets.app`
- Version: `1.1.0`
- Version code: `8`
- Base: latest `origin/main`, `e49d59f` (verified September 14, 2026)
- Branch: `release/android-1.1.0`
- Isolated worktree: `/Users/briandelancey/Developer/KingFishBetsLLC/kingfish-mobile-android-1.1.0`
- Source commit: `30d24be79735cd2976d930a61eaaaa46425f8f4f`
- EAS build ID: `934b94b2-ed1d-4a14-89e5-cb11b4a0445b`
- Artifact: `/Users/briandelancey/Developer/KingFishBetsLLC/builds/KingFishBets-android-1.1.0-vc8.aab`
- Artifact SHA-256: `b96675e2239f50ff1597ccbd9d47f6789663203d2cdf35317b3d90c1fb42ae63`
- Production upload and submission: **pending Brian's manual Play Console upload**.

## Play status before this release

Verified directly in Play Console September 14, 2026 (Central):

- Production is active on `7 (1.0.10)`; no unpublished changes.
- All app bundles lists five uploaded codes: `7`, `6`, `4`, `2`, `1`.
- EAS Android history also tops out at `7` (build `c9009656-294b-4073-8786-c3c4fbc58130`).
- Code `8` is available and higher than all uploaded codes.
- Existing notices: payments-account issue (details not yet investigated), DEX
  optimization deadline February 2027, deprecated edge-to-edge API recommendation.

## Customer changes

Native Tools → Pro Tools → NFL Teaser Builder, backed solely by the existing
authenticated `/api/nfl-teaser?points=6|6.5|7` endpoint. The server supplies
qualifying legs, adjusted spreads, rankings, and suggested pairs. The client
calculates only payouts from the user's entered American ticket odds and stake.

Includes sportsbook selection, two-to-four distinct games, suggested pairs,
saved-line timestamps, stale warning, signed-out/Premium/loading/empty/error
states. Server authorization honors `pro_tools_free` and normal Premium access;
query keys include user, points, entitlement, promo flag and book preferences.
Changing books, points, user or refreshed data clears the ticket. Ticket odds
are never presented as a sportsbook quote or automatically inferred.

All existing main football behavior is preserved: NFL Today/Week/All filters,
current-season board and rolling player histories, first/last touchdown fields,
actual college weeks, college spread highlights and ML leans, `KF PROJ` totals,
no college Total Lean or redundant O/U column, persistent login, NFL Line Movers,
and no forced landscape button or screen-orientation dependency.

## Verification

- `npm run typecheck`: passed.
- `node --test tests/*.test.mjs`: 14 passed (including existing billing and signup tests).
- Focused teaser tests cover ticket math/invalid inputs, four-leg limit and
  distinct games; rendered screen tests cover gates, loading/error/empty/stale,
  pair selection, keyboard dismissal callback, back action, changed books/points,
  refreshed data and account changes.
- Android Expo preview bundled successfully (1,864 modules).
- Native screen behavior is covered by rendered tests for scrolling-to-ticket,
  keyboard dismissal, Back navigation, small-screen-safe wrapping, and state
  transitions. The ADB device was unavailable for a final hands-on pass.
- Signed AAB checks passed: ZIP integrity, `bundletool validate`, package
  `com.kingfishbets.app`, version `1.1.0`, code `8`, min SDK 24, target SDK 36,
  non-debuggable release, matching upload certificate fingerprint, and teaser
  code present in the compiled bundle. The AAB is installable when converted
  to a universal APK with bundletool.
- No production backend, iOS submission or Studio changes.
- Original mobile checkout's unrelated uncommitted work is preserved.

## Google Play release notes

Football tools are getting sharper. This update adds the NFL Teaser Builder,
current-week filters, clearer college spread and projection views, improved
player histories, and sign-in reliability.

## Pending

1. Upload the verified AAB to the Play Console production track and submit it.
2. Record the final Play Console status here after submission/publication.
3. After Google publishes: Play-installed sign-in persistence, Premium/promo
   access, all teaser sizes and book changes, ticket inputs, and football boards.
