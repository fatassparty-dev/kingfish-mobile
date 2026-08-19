# KingFish (iPhone) — Future Feature Ideas

Features held for a future app version. Not in scope for the current build.

---

## Home screen: user-customizable tiles (v3)
The home screen redesign v1+v2 SHIPPED in 1.0.3 build 19 (2026-07-07): 8
deep-link tiles (Top 5 Leans, NRFI/YRFI, Game Lines, Game Factors, Fantasy Hub,
The Scout, Batter vs Pitcher, Grade My Slip), server-driven via
/api/mobile-config `home_tiles`, editable at HQ → Launch → App Home Tiles.

Remaining, DEFERRED to a later app version (Brian 2026-07-07, raised again
2026-08-19): user-customizable favorites — the USER picks their home tiles
instead of us.

**Entry point (2026-08-19):** Account settings. A "Customize Home" screen
listing every tool with a checkbox and an order, not a drag-and-drop widget
canvas.

**Why it matters most between seasons (Brian, 2026-08-19):** our one server-side
tile list has to serve everybody, so in August it is a compromise between a
baseball bettor and someone who only cares about football. A user who wants
nothing but NFL — Scout, Ref Report, TD streaks, Fantasy Hub — currently has to
scroll past MLB tiles for months. Letting them choose removes a seasonal
complaint we would otherwise field twice a year, and it removes the pressure on
us to re-guess the right default list every time a season turns over.

**Shape:** local-first, then synced to the profile so it survives a reinstall and
follows the user to iPad. Add/remove plus ordering only.

**Keep the server list.** `home_tiles` from /api/mobile-config stays as the
default for anyone who has not customized, and as the source of truth for which
tiles EXIST. A user's saved list should be filtered against it, or a tile we
retire server-side would linger on a customized home screen and dead-end —
exactly the failure The Ref Report hit in build 21 (screen with no route to it).

**Applies to Studio too** — same argument on iPad, where there is more room and
the home screen matters more.

---

## Per-user sport preferences ("hide the sports I don't follow")
Brian, 2026-08-19, while building the Home shortcut picker: *"some people really
just don't like other sports."*

Distinct from the Home picker that shipped in 1.0.5 — that only decides which
shortcuts sit on Home. This is bigger: a user picks the sports they follow, and
the whole app respects it — dashboard sport tabs, cheat-sheet lists, Top 5 Leans
sport mix, notifications.

**Why it is a separate job:** the Home picker touches two screens. This touches
every screen that enumerates sports, and it interacts with the existing
server-side `dashboard_tab_*` flags — those decide what KingFish OFFERS, and a
user preference would have to narrow that without ever widening it (a user must
not be able to switch on a sport we have turned off).

**Open question:** whether an empty selection means "all sports" (safest) or
should be prevented in the UI.

Would reuse the same pattern as the Home picker: its own jsonb column on
user_profiles, filtered against the server's live list.
