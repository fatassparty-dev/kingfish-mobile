# Android 1.1.0 — NFL Teaser Builder

## Release identity

- Package: `com.kingfishbets.app`
- Version: `1.1.0`
- Version code: `8`
- Base: latest `origin/main`, `e49d59f` (verified September 14, 2026)
- Branch: `release/android-1.1.0`
- Isolated worktree: `/Users/briandelancey/Developer/KingFishBetsLLC/kingfish-mobile-android-1.1.0`
- Source commit, EAS build ID, final artifact and SHA-256: pending build.
- Production upload and submission: authorized by Brian; pending verification.

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
- Native scrolling, real keyboard, small-screen and installed AAB checks: pending.
- Signed AAB identity, signature and archive checks: pending build.
- No production backend, iOS submission or Studio changes.
- Original mobile checkout's unrelated uncommitted work is preserved.

## Google Play release notes

Football tools are getting sharper. This update adds the NFL Teaser Builder,
current-week filters, clearer college spread and projection views, improved
player histories, and sign-in reliability.

## Pending

1. Complete Android interaction verification and signed AAB build checks.
2. Upload the verified AAB to production and submit changes for review.
3. Record exact build/artifact/commit/checksum and final Console status here.
4. After Google publishes: Play-installed sign-in persistence, Premium/promo
   access, all teaser sizes and book changes, ticket inputs, and football boards.
