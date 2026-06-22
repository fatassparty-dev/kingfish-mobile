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

## 🔵 Pending — next iOS submission (describe these to Apple)

> _Nothing submitted yet. The items below are pending the next build._

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
