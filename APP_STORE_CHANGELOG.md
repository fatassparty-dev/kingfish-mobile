# KingFish — App Store Submission Changelog

**Purpose:** A running, plain-English log of every change, so that when it's time to
submit an iOS update to Apple, you can clearly explain what changed. Apple review
prefers **small, incremental, easily-explained** changes — so each iOS release
below lists only a few changes, each with a one-line "what the reviewer sees" and
"why."

**Key architecture fact (worth telling reviewers):** Most stats, odds, and "edge"
values in KingFish are **calculated on our server and sent to the app as data** —
the app just displays them. This is why most product improvements ship with **no
app update**. An app update is only needed when the app must *render a new kind of
data* it didn't know about before.

---

## How to read this doc
- **🟢 Server/web only — NO app update needed.** Already shows in the current app, or
  will as soon as the server sends it. Listed here only for your records.
- **🔵 Needs an iOS app update.** These are the ones to describe in the App Store
  "What's New" / review notes. Keep them small and explained.

---

## ✅ 1.0.3 (build 19) — APPROVED + LIVE 2026-07-08 (submitted 2026-07-07; builds 16/17/18 were TestFlight iterations)

> _1.0.3 (16) uploaded 2026-07-07 and put on TestFlight (NOT submitted — Brian tests
> first). TestFlight review of 16 produced the three fixes below, going into build 17.
> Version had to be 1.0.3: the 1.0.2 train is CLOSED (Transporter 409) because
> **1.0.2 (15) shipped and is the live store build** — so the store already has the
> auth-deadlock fix, guest mode, and signup name capture._

- **[2026-07-07] Home screen: deep-link tiles, server-driven (build 18).**
  - **What the reviewer sees:** The Bait Shop home grid no longer repeats the tab bar
    (Dashboard/Tools/Ask/Account tiles are gone). It now offers eight destinations:
    Top 5 KingFish Leans, NRFI/YRFI, Game Lines, Game Factors, Fantasy Hub, The Scout,
    Ref Report, Grade My Slip — each opening its screen directly.
  - **Why:** Home should hold destinations, not duplicate the tab bar's categories. The
    tile list is served by /api/mobile-config (`home_tiles`, kingfish-bets PR #54) so the
    layout can change with a site deploy — never an App Store build. The same list is
    baked in as the offline fallback, so the app renders identically if the config
    fetch fails. User-customizable tiles are deferred to a future version.
- **[2026-07-07] New cheat sheet: Top 5 KingFish Leans (build 18).**
  - **What the reviewer sees:** A new "Top 5 KingFish Leans" tile (first in Cheat
    Sheets, badge ALL) opens today's board: the five best prop edges across every
    sport plus the top game-line lean, locked at 9:05 AM CT. Same premium gate as the
    other sheets.
  - **Why:** The sheet has been live on the web (/api/top-leans daily snapshot); this
    renders that server data in the app — no client math. Also supports
    /cheat-sheets?sheet=<key> deep links (used by the home tiles).
- **[2026-07-07] NRFI: stray "No MLB markets…" line removed (port of Studio b2a23ae
  empty-state fix — the generic props empty-state leaked onto the NRFI board).**
- **[2026-07-07] Lean tiles are verdict-only (no-doubled-data law port from Studio).**
  - **What the reviewer sees:** The KingFish Lean / Total Lean tiles on game cards show
    the call, grade, and one-line read — no price or sportsbook. All odds appear once,
    in the card's Moneyline / Spread / Total sections.
  - **Why:** A tile price could disagree with the market section mid-cache-refresh
    (the +196/+182 incident). Same removal Studio shipped 2026-07-02
    (`components/dashboard/GameLineCard.tsx` `LeanBox`).
- **[2026-07-07] Tools ("TackleBox") opens on Calculators.**
  - **What the reviewer sees:** The Tools tab lands on the free Calculators (order:
    Calculators, Cheat Sheets, Tools) instead of opening straight into the premium
    Cheat Sheets gate.
  - **Why:** Free users (and App Review) see usable free tools first — supports the
    5.1.1 posture that content isn't locked behind registration/payment up front.
- **[2026-07-07] Game Matchups text enlarged.** Stat labels/values 13→15, team grade
  13→16 on the matchup team boxes (was hard to read). Display-only.
- **[2026-07-07] Dashboard tab renamed "Game Matchups" → "Matchups".** The four view
  pills now all render at full size on the phone's one-row tab bar ("Game Matchups"
  was getting shrunk to fit). Label only — keys/behavior unchanged.
- **[2026-07-07] Home "Game Factors" tile opens Game Factors.** It routed to the
  Tools screen with a `mode: 'factors'` param the Tools screen ignores, landing users
  on Tools instead of the Game Factors tool. Now routes to `/game-factors` directly.

### Build 1.0.3 (16) — 2026-07-07 — TestFlight only

- **[2026-07-05] Dashboard "Game Lines" tab is now "Game Props" — a dense board table.**
  - **What the reviewer sees:** The dashboard's game-lines tab is renamed Game Props and
    shows a sortable table per date — matchup, KingFish ML lean, Edge, Grade, best
    moneyline/spread/total prices with the book. Portrait shows a compact decision set;
    rotating to landscape opens the full board.
  - **Why:** Matches the website's dashboard (swapped 2026-07-02). All leans/edge values
    are server-computed on the odds feed the app already reads — the table only renders.

- **[2026-07-05] New Pro Tool: "Game Lines" (Value Finder).**
  - **What the reviewer sees:** A new tile under Tools → Pro Tools opens Game Lines —
    per-sport cards showing the KingFish value lean for each game plus the best
    available moneyline, run line/spread, and total across supported sportsbooks.
  - **Why:** Ports the website's /value-finder Pro Tool. Uses the same odds endpoints
    the dashboard already calls; verdicts are server-computed. Gated to Premium (or the
    HQ "Free Access: Pro Tools" promo flag).

- **[2026-07-05] Prop tables now render the server's EDGE scores (commit f88221e).**
  - **What the reviewer sees:** Nothing visually new — EDGE scores on player props now
    come from the server (identical numbers to web/iPad) instead of being recomputed
    on-device. Local math stays only as an offline fallback.
  - **Why:** Cross-platform consistency law — one number, computed once, everywhere.

### ⚠️ MUST be in the next shipped build — signup name capture

- **Signup must send the name in auth metadata.** The current source (build 10+,
  commit `7df389f`) already does: `signUp({ options: { data: { first_name,
  last_name, full_name, state } } })`. The **shipped 1.0.0 store build predates this**
  and sends only `{ email, password }` — which made every account from it nameless in
  HQ (and, while email confirmation was on, also un-signin-able). **Do not ship a
  build that regresses this.** Background: `kingfish-bets/docs/auth-signup.md`.
- Context (server-side, already done, no app change): the DB name guard was dropped
  and **email confirmation was turned OFF** so the 1.0.0 build's post-signup profile
  write succeeds and names save without an app update. Once this metadata-sending
  build is the universal shipped build, name capture no longer depends on that
  workaround.

### Build 1.0.2 (15) — 2026-06-25 — emergency fix build — ✅ SHIPPED (live store build)

- **Sign-in no longer hangs after signing in (no data / "Free" / no name).**
  - **What the user saw:** On 1.0.1, after signing in the app could sit with player props stuck "loading," the account shown as "Free," and no name/location — and never recover (even Restore Purchases did nothing).
  - **Why:** On launch/sign-in the app read the profile from inside the Supabase `onAuthStateChange` handler, which Supabase runs **while holding an internal auth lock**. That read calls `getSession()`, which needs the **same lock** → a re-entrant deadlock. One deadlock froze everything at once: the profile never loaded (premium showed "Free"), every data fetch hung ("Loading…" forever), and **Sign Out hung** (the dead-button issue from 1.0.1).
  - **Fix:** Defer the auth-state-change work so the lock releases before any further auth call (the supabase-recommended pattern), and make Sign Out never block on a lock-bound call. Also routed Supabase through `kingfishbets.com` (HTTP/2) and added a 15s network timeout as hardening against a separate device-only HTTP/3 stall. Files: `lib/auth.tsx`, `lib/api.ts`, `eas.json`. **Verified in the iOS Simulator** (premium shows, props load, Sign Out works).
  - **Scope/permissions:** Client logic + networking path only. No new data, no new permissions.
  - **Risk:** Low — the fix is the documented way to avoid this exact Supabase deadlock; verified locally before submission.
- **Sign-up "Location" is a dropdown (matches the website).** The Create Account location field is now a state dropdown (Other / outside US + all states, Puerto Rico in place) instead of a free-text box, matching the web signup. Files: `app/(auth)/sign-up.tsx`, `lib/locations.ts`.
- **Clearer weak-password message.** A weak password now shows plain guidance (e.g. "at least 8 characters and include a lowercase letter, an uppercase letter, and a number") instead of the raw system message that listed entire character sets. File: `app/(auth)/sign-up.tsx`.

### Build 1.0.1 (14) — 2026-06-23 (latest pass; supersedes builds 12/13)

- **Premium status now correct for admin/comp accounts.** Admin/VIP/gifted accounts now show "Premium / Pro" in the app instead of "Free." (Server-side fix in the entitlement source; the app simply reads the corrected `is_premium` from `GET /api/account`.) **No new data or permissions.**
- **Sign-in entry simplified.** Removed the "Sign In / Sign Up Free" buttons from the top of the Home screen (supersedes the earlier note about those buttons). Sign-in is now reached from the **Account** tab. Added a **Home** link on the Sign In screen so users can always exit. Files: `app/(tabs)/home.tsx`, `app/(auth)/sign-in.tsx`.
- **"Get Access" wording.** Premium upgrade buttons now read **"Get Access"** (was "View Premium") so the same prompt works whether premium is paid or offered free during a promo. Removed the small "// Premium" labels above gated sections. Paywall bullet now reads "Unlimited Ask KingFish with live context" (free tier keeps 3 chats/day).
- **Account screen — safer Delete.** "Delete Account" moved into its own separate "Danger Zone" card (away from Sign Out) with a stronger "this cannot be undone / cannot be recovered" confirmation. Fixed a Sign Out reliability issue (it now always completes even on a flaky network). File: `app/(tabs)/account.tsx`, `lib/auth.tsx`.
- **Account announcement card.** The account pages and the Sign In screen now display an optional one-line notice (e.g. a promo message) sent from the server. Display-only; the text is set server-side. Files: `app/(tabs)/account.tsx`, `app/(auth)/sign-in.tsx`.
- **The Scout — readability.** Team column shows abbreviations, player names abbreviated (e.g. "J. Winston"), removed the "Born" column (kept Age), and the table is now a fixed-width aligned grid. File: `app/scout.tsx`.
- **Game Factors is its own screen.** Moved Game Factors out of the Tools tab into its own full-screen page (with a Back button) for more room. New file: `app/game-factors.tsx`. Reads existing endpoints; no new permissions.
- **Tools polish.** Renamed the "Pro Tools" sub-tab to "Tools"; Grade My Slip header label tidied; Fantasy Hub top button is now a standard Back; added a "Stadium Cheat Sheet" shortcut in the Cheat Sheets list; MLB stadium cheat-sheet team names shortened to fit. NRFI/YRFI is now the same premium tier as the other cheat sheets.
- **Account required for premium & promos.** Logged-out users who tap a premium/locked feature are now prompted to **create a free account** rather than a purchase screen. Free promotional access (when enabled server-side) requires a logged-in account. Files: `app/modals/paywall.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/cheat-sheets.tsx`.
- **Promo access plumbing.** The app reads server feature flags so KingFish can open specific sections (game lines / player props / cheat sheets / Soccer) to free logged-in users during promos — all controlled server-side, no app behavior change unless a flag is on.
  - **Risk:** Low overall — these are UI/wording refinements, an account-gating tightening, and reading server-provided values. No new permissions, no new data collection.

- **[Built — 2026-06-23] App opens to the full experience — no sign-in required to browse.**
  - **What the reviewer sees:** The app no longer forces a sign-in screen on first launch. Users land directly on the Home tab and can browse freely. A "Sign In" and "Sign Up Free" button appear in the upper right of the Home screen. The Account tab shows a sign-in/create-account prompt when not logged in. Tapping any tab or feature works without an account.
  - **Why:** New users were seeing a login wall before they could evaluate the product. Removing the mandatory sign-in gate lets people see value before committing to an account.
  - **Scope:** Small. Files: `lib/auth.tsx` (removed forced redirect), `app/(tabs)/home.tsx` (added auth buttons when signed out), `app/(tabs)/account.tsx` (added sign-in/sign-up prompt when signed out). No new data collected, no new permissions.
  - **Risk:** Low — users can still sign in and sign up as before; the change only removes the forced redirect.

- **[Built — 2026-06-23] New Pro Tool: The Scout (NFL tracking data).**
  - **What the reviewer sees:** A new "The Scout" screen accessible from the Pro Tools section of the TackleBox tab. Shows NFL Next Gen Stats (CPOE, air yards, time to throw for QBs; separation and YAC+ for receivers; efficiency and RYOE for rushers) with combine measurements. Sortable columns, player search, and team filter. Premium-gated (shows upgrade prompt for free users).
  - **Why:** Adds NFL player tracking and physical profiling data to the iPhone app, matching what is already available on the iPad app.
  - **Scope:** New screen. File: `app/scout.tsx`. Reads from existing `/api/nfl-command-data` endpoint (no new server endpoint). No new permissions beyond what the app already has.
  - **Risk:** Low — new standalone screen, no changes to existing screens.

- **[Built — 2026-06-23] New Pro Tool: Grade My Slip (bet-slip OCR grader).**
  - **What the reviewer sees:** A new "Grade My Slip" screen in Pro Tools. User picks a sport, chooses a screenshot of a bet slip from their photo library, and the app reads the legs on-device using Apple Vision (no image is sent to any server). The detected legs are shown for review/editing, then submitted to KingFish's server for a grade and commentary. Same-game parlays get an "Improve my grade" option. Premium-gated.
  - **Why:** Adds the bet-slip grading tool already available on the iPad app to the iPhone.
  - **Scope:** New screen. Files: `app/grade-slip.tsx`, `lib/slip/parseSlip.ts`, `modules/visionocr/` (Apple Vision OCR native module). New dependency: `expo-image-picker` (photo library access). Reads from existing `/api/grade-slip` endpoint.
  - **Permissions:** Photo library access (`NSPhotoLibraryUsageDescription`) — only to pick a bet-slip screenshot the user explicitly selects. No background access, no camera.
  - **Risk:** Low — new standalone screen; the OCR runs fully on-device, no image data leaves the device.

> _The items below were pending in previous build planning._

- **[Built — 2026-06-21] Premium status no longer briefly shows as "Free" after sign-in.**
  - **What the reviewer sees:** When a paid/Pro user signs in, the account now shows
    "Premium Active / Pro" reliably. Previously, some users (especially those who
    subscribed on the website) would see "Free" right after signing in and had to
    tap **Restore** — or wait ~30 seconds — before Pro appeared.
  - **Why:** Premium status was read by querying the account record directly from
    the database at sign-in; that single request could lose a race with the login
    token (or time out on a cold network) and the app fell back to "Free" and never
    retried. The app now reads premium from one authoritative server endpoint
    (`GET /api/account`), which resolves entitlement server-side (so there's no
    client-side timing race) and self-heals a stale subscription. The app also
    retries transient failures in the background and never downgrades an
    already-loaded Pro account to "Free."
  - **Scope:** Small, client-only. File: `lib/auth.tsx` — `loadProfile` now calls
    the server endpoint with a timed read + background retry and preserves a
    known-good profile. No new screens, no new data collected, no new permissions.
  - **Risk:** Low — strictly more resilient than before; removes the need for the
    Restore workaround.
  - **Note:** Requires the matching server endpoint (`kingfish-bets /api/account`
    GET) to be deployed first; it is additive and backward-compatible, so older app
    builds keep working unchanged.

- **[Built — 2026-06-19] Location is now required at sign-up.**
  - **What the reviewer sees:** On the Create Account screen, the Location field
    (state, PR, or OTHER) is now required, like first/last name. Submitting without
    it shows "Please enter your location (state, PR, or OTHER)." Label no longer
    says "optional"; helper line notes it can be changed anytime from Account.
  - **Why:** Location drives which sportsbooks KingFish shows; requiring it at
    sign-up means every account has the right book context from the start.
  - **Scope:** Small, client validation only. File: `app/(auth)/sign-up.tsx` — a
    `normalizeLocation(state)` required-check plus placeholder/helper text. No new
    data collected (field already existed), no new screens or permissions.
  - **Risk:** Low — an extra required field on an existing screen.
  - **Note:** Pairs with a server-side guard (in the web/Supabase project) that
    rejects account creation without a name — that part needs no app update and
    covers this app even on the current build.

- **[Built — 2026-06-18] Ask KingFish header shrinks once a chat is active.**
  - **What the reviewer sees:** On the Ask KingFish tab, the large mascot image +
    "Ask KingFish" title show at the top of a new/empty chat as before. Once you've
    sent a message, that header collapses to a small bar (a small avatar + the title
    on one line) so the conversation has more room. Same screen, same chat — only
    the header size changes based on whether a conversation has started.
  - **Why:** The full-size header was taking up the top third of the screen during an
    active conversation, squeezing the chat. This is a layout-only refinement.
  - **Scope:** Small, layout-only. File: `app/(tabs)/ask-kingfish.tsx` — a compact
    header variant shown when the chat has messages. No new screens, no new data, no
    new permissions. (The iPhone keeps its single-conversation Ask — the multi-chat
    sidebar is iPad/web only.)
  - **Risk:** Very low / cosmetic — display layout only.

- **[Built — 2026-06-18] Consistent "off-season / no markets" wording on the dashboard.**
  - **What the reviewer sees:** When a league has no live betting markets, the
    placeholder card now uses clear, consistent wording across every sport (e.g.
    college football now reads "College Football Not In Season" instead of
    "College Football Lines Awaiting Markets"; NBA/NHL read "Not In Season" when
    off-season). Same card, same place — only the text changed.
  - **Why:** The copy had drifted per-sport and didn't match our website, so the
    same situation was described several different ways. This aligns the app's
    empty-state wording with the web for one coherent message.
  - **Scope:** Small, text-only. File: `app/(tabs)/index.tsx` — the `inactiveTitle`
    / `inactiveDescription` strings for all nine sports. No layout changes (the
    iPhone keeps its existing card structure), no new screens, no new data.
  - **Risk:** Very low / cosmetic — display strings only.

- **[Built — 2026-06-14] Sign-up now reliably saves the customer's name.**
  - **What the reviewer sees:** No visible change — the Create Account screen still
    has the same First name / Last name fields. The only difference is under the
    hood: the name is now attached to the account at the moment it's created.
  - **Why:** The old app collected the name but didn't store it reliably (the save
    ran before the account session existed and was silently dropped), so some
    accounts ended up with no name. Now the name is passed straight into the account
    record at sign-up.
  - **Scope:** Small. File: `app/(auth)/sign-up.tsx` — pass first/last/full name +
    state into `signUp({ options: { data } })` (account metadata).
  - **Risk:** Low — no new screens, no new permissions, no new data collected. Same
    fields the app already asked for, just persisted correctly.
  - **Note:** A server-side database trigger (🟢 below) already recovers names for
    new sign-ups even on the *current* app build, so this is belt-and-suspenders.

- **[Planned] Game cards can display a server-provided "KingFish model edge."**
  - **What the reviewer sees:** The same lean/edge box already shown on game cards,
    now able to show an edge value our server calculates and sends down. No new
    screens, no new permissions — a display change to an existing card.
  - **Why:** Moves edge calculation to the server so the website and the app always
    show the same number, and so future model improvements ship without an app
    update.
  - **Scope:** Small. File: `components/dashboard/GameLineCard.tsx` (render the
    `kingfishModel` field generically for all sports).
  - **Risk:** Low / cosmetic — falls back to the existing on-device lean if the
    server sends nothing.

---

## 🟢 Server/web changes — no app update needed (for your records)

### 2026-07-09
- **ONE number per prop — every cheat sheet now renders DASHBOARD edges**
  (`kingfish-bets` `0b135bc`→`9aec758`). Architecture ruling (Brian): the
  dashboard is the source of truth; sheets pull its numbers, never own math.
  - **HR edge = new probability model.** The dashboard's batter_home_runs O 0.5
    edge is now P(homers today) — Statcast xSLG-led power × platoon × park HR
    factor by handedness × game-time weather × lineup-slot PAs (competitor
    research build; no price term, BvP display-only). Ships via boardScores, so
    **iPhone 1.0.3 and iPad show the new HR numbers with no build.** Payload
    carries `hrProb` + `hrDetail` (receipts line).
  - HR Targets / Hits Bet-Fade / Hot Total Bases / Safe Alt K sheets all render
    the dashboard edge (fades = 100 − edge; alt K lines = the shared
    probability engine at the row's line). **Hot Hitters redesigned as a
    STREAKS sheet** — new `streak` field (consecutive games with a hit), top 10
    by streak, no L5/L10 columns (🔵 app cheat-sheet renderers pick all this up
    with the sheet_scores adoption below).
  - Web sheets: PICK columns show direction/tier word only (no doubled score),
    and the "● SAVED DAILY + method blurb" strip is REMOVED (secret-sauce rule
    — never publish formula ingredients; apps should drop any equivalent strip
    in their next builds too).
- **Cheat-sheet scores now server-side** (`kingfish-bets` `9e5fef3`): the five
  derived-score sheets (Hits bets+fades, HR Targets, Total Bases, Hot Streaks,
  Strikeouts) are computed once on the web and shipped as
  `sheet_scores` on `/api/statsheet-data` (keyed `gameId|player|line`). Web
  renders them already. **🔵 iPhone (and iPad): next build should read
  `sheet_scores` server-first in the cheat-sheet renderers** — same
  `server || local` pattern the prop boards use — keeping local math as
  offline fallback. Until then the app's local formulas still run (no
  regression, but formula improvements — e.g. the new HR Targets score with
  shrunk BvP and no price term — won't reach the app).

### 2026-07-08
- **MLB edge score: probability-based for ALL lines (extended same day).** Every
  non-HR MLB prop edge now reads as P(over) × 100 — a 75 means the model gives
  the over a 75% chance — with the old ratio kept only as a no-data fallback.
  Also: the matchup grade no longer prints a letter from opponent record alone
  (a no-history rookie vs a good team was grading D+); it now requires real
  BvP/vs-team history. Server-side; iPhone 1.0.3 renders the new numbers via
  boardScores with no build. The app-bundled fallback copies (old ratio,
  record-only grade) update whenever a future build ships.
- **MLB edge score: probability-based for O 0.5 lines.** The old rate-to-line
  ratio pinned every regular at a clamped 100 on 0.5-line combo props (TB,
  H+R+RBI average 2-5x the line), which is how a 100 edge sat next to a D+
  matchup and flooded the Top 5 sheet with ties. Sub-1.0 lines now score
  P(over) × 100 from the same model VALUE/EV and the grading cron use; O 0.5
  total bases reads the hits distribution since it's literally the same bet.
  Server-side (`lib/scoring/mlbPropScoring.ts`) — every surface updates with
  no app build.
- **Top 5 KingFish Leans: matchup grade + tie-break.** The `grade` field on
  `/api/top-leans` is now strictly a **matchup grade** (MLB: career BvP vs
  today's starter + career vs-team + opponent record). Non-MLB sports send
  `grade: null` — their old letter was just the edge score re-bucketed, i.e.
  the same number twice. Ties on edge score now break server-side to the best
  matchup grade, then price. The app renders `row.grade` inline with no
  header, so nothing breaks; non-MLB rows simply stop showing a redundant
  letter (matters in the fall). Web-only extras (not app-relevant): column
  header renamed GRADE → MATCHUP, player names click through to the player
  profile.

### 2026-06-14
- **Sign-up names are now created server-side by a database trigger.** A new
  `on_auth_user_created` trigger copies the name from sign-up into the customer
  profile the instant an account is created, so it can no longer be lost to a
  missing session / RLS. Also backfilled existing accounts whose names were
  stranded in account metadata. HQ's customer directory reads names from this
  profile table, which is why some accounts had been showing up nameless (email
  twice). **Covers both web and app sign-ups immediately — no app update needed
  for this part.** The matching app change (🔵 above) just makes the app send the
  name itself, on top of this safety net.
  - _Status: live in Supabase (ran 2026-06-14): `supabase-user-profile-autocreate.sql`._
- **Soccer / World Cup predictions — real statistical model** computed on the
  server (`lib/soccer/model.ts`): team-strength (Elo) → expected goals (Poisson) →
  win/draw/away probabilities → de-vig the market → edge % → quarter-Kelly stake.
  Delivered via `/api/soccer-odds` as `kingfishModel`; the current app already
  renders it for World Cup, so **no app update required** when it does ship.
  - _Status: **SHIPPED then ROLLED BACK on 2026-06-14** (commit 23a7421 →
    reverted in cd0e6c9). It overstated edges — live cards showed implausible EV
    (e.g. Netherlands +18.7% vs Japan, a +2000 draw "edge" on Curaçao–Germany).
    **Blocker before re-ship: calibrate against real results.** Code kept as WIP,
    not deleted._
- **Bug fix — neutral-venue home-field.** World Cup games no longer give the
  listed-first team an unearned home-field boost (they're neutral-site), which was
  inflating one side's edge. Server-side only.
  - _Status: included in the rolled-back commit above; re-ships with the calibrated model._

---

## ⛔ Parked — not shipping yet (do not submit)
- **MLB model (`lib/mlb/model.ts`)** — built but **uncalibrated**; currently
  overstates edges. Must be graded against real game results before it goes to
  users on web or app. When ready, it ships server-side and rides the same generic
  `kingfishModel` rendering as the 🔵 item above (so still just one app update,
  already covered).
