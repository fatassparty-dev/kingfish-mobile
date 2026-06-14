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
- **Soccer / World Cup predictions are now a real statistical model**, computed on
  the server (`lib/soccer/model.ts`): team-strength (Elo) → expected goals (Poisson)
  → win/draw/away probabilities → de-vig the market → edge % → conservative
  quarter-Kelly stake. Delivered via `/api/soccer-odds` as `kingfishModel`. The
  current app already renders this for World Cup, so **no app update required.**
  - _Status: ready in working tree; pending deploy._
- **Bug fix — neutral-venue home-field.** World Cup games no longer give the
  listed-first team an unearned home-field boost (they're neutral-site), which was
  inflating one side's edge. Server-side only.
  - _Status: ready in working tree; pending deploy._

---

## ⛔ Parked — not shipping yet (do not submit)
- **MLB model (`lib/mlb/model.ts`)** — built but **uncalibrated**; currently
  overstates edges. Must be graded against real game results before it goes to
  users on web or app. When ready, it ships server-side and rides the same generic
  `kingfishModel` rendering as the 🔵 item above (so still just one app update,
  already covered).
