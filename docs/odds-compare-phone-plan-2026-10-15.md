# Phone app plan — compare every book, Over / Under, book cleanup

Written 2026-10-15. Plan only, nothing coded. Brian's decisions are folded in
(see "Decided" at the bottom). Covers `kingfish-mobile` (iPhone
and Android, one codebase). Brings the phone up to what shipped on the web the
same day (`kingfish-bets` `da3dcbf` → `ec136c7`). KingFish Bets Studio
(iPad/Mac) is out of scope here and gets its own pass.

The phone apps have no over-the-air updates, so everything under "App build"
needs a store release. Anything under "Server first" ships with a web deploy and
reaches the apps already in customers' hands.

---

## What's wrong on the phone today

Found by reading the code, not by running the app.

1. **The book is never shown on player props.** `PropsList`
   (`components/dashboard/PropCard.tsx`, used for NFL/NBA/WNBA/NHL) works out
   the best book (`prop.book`) and then never renders it. `MLBPropsTable` does
   the same (`row.bestBook`). Customers see a price with no idea where to bet it.
   This was Brian's original "problem 2."
2. **Player props ignore Book Preferences.** Both tables call
   `eligiblePropBookKeys(userState)` with no preferences
   (`PropCard.tsx:456,483`, `MLBPropsTable.tsx:374`). They're also limited to
   `PROP_BOOK_KEYS` (the six standard books plus Hard Rock). Fanatics, BetPARX
   and Bally Bet can never show on phone props, even when a customer turns them
   on. Game Props does pass preferences (`index.tsx:2706`), so the two tabs
   disagree.
3. **Under prices are thrown away.** `flattenProps` keeps only Over/Yes outcomes
   (`PropCard.tsx:496`), so there's nothing to build an Under board from.
4. **Short book labels are missing for the new books.** `BOOK_SHORT` in
   `GamePropsTable.tsx` has no Fanatics, BetPARX or Bally Bet, so they'd show as
   raw keys ("fanatics").
5. **The app's built-in fallback book lists are out of date.**
   `lib/sportsbooks.ts` still lists bet365, PointsBet, Unibet, Barstool, WynnBET
   and SuperBook, plus the Hard Rock state feeds. The server config replaces
   these on launch, so it only matters if the config fails to load.
6. Phone NFL props still drop anything priced over +700 (`PropCard.tsx:498`).
   The web removed that cap in September. **In scope (Brian: yes).**
7. **No alt-line dropdown.** The app asks for props without `alts=board`
   (`index.tsx:1483`), so it never gets the server's filtered alt ladders or
   their server-scored Edge (`altScores`). NFL instead shows a Standard/Alt
   toggle that switches the whole board to the raw alt market, an extra row
   with junk rungs (the thing the web dropdown replaced on 2026-09-27). NHL
   shows no alts at all.

---

## Server first (web deploy, no app update)

**S1–S3 DONE and live 2026-10-15** (`kingfish-bets` `0901b95`; verified with a
`curl` of `/api/mobile-config`): `prop_keys` = `PROPS_REQUEST_BOOK_KEYS`
(fanduel, draftkings, betmgm, betrivers, williamhill_us, espnbet, hardrockbet,
betparx, fanatics, ballybet), and `short_names` is sent. The NBA/WNBA/MLB/NHL
props routes and their stats-prefetch routes request those 10 books. **S4 is not
built:** the server sends no `underBoardScores` yet. The app should still render
it if present.

**S1. Phone props get the books customers turned on.**
`app/api/mobile-config/route.ts` sends `prop_keys` = six standard books + four
Hard Rock keys. Change it to the six + `hardrockbet`, `fanatics`, `betparx`,
`ballybet`. Today's app passes no preferences, so nothing it shows changes yet.
The new build starts honoring preferences against this list.

**S2. Put the new books on the NBA/WNBA/MLB/NHL props feeds.**
Those routes still send fixed 10-book lists that include the three duplicate
Hard Rock feeds (`docs/odds-api-open-items.md` #9). Swap them for Fanatics,
BetPARX and Bally Bet. Same cost, and it's needed or those books have no props
data to show on phone or web.

**S3. Short book names come from the server.**
Add `short_names` (`FD`, `DK`, `MGM`, `BR`, `CZR`, `TSB`, `HR`, `FAN`, `PRX`,
`BAL`) to the `sportsbooks` block of mobile-config. The app reads it, falling
back to its own table, so a future book never needs an app update just for its
label.

**S4. Agree the future Under Edge field now.**
No-OTA rule: if the app is built to render a field the server doesn't send yet,
the Under Edge can switch on later with only a web deploy. Proposed contract:
`underBoardScores` on the props payload, same shape and key as `boardScores`
(`${marketKey}-${player}` → `{ line, edgeScore, edgeLabel }`). The server doesn't
send it yet. The app renders it when present (same line-match guard as
`serverEdge`) and hides Edge otherwise. This follows the "calculated scores live
on the web" law: no Under math in the app.

---

## App build

### A1. Shared helpers and the compare sheet

- New `lib/oddsCompare.ts`: ports of the web helpers in
  `kingfish-bets/app/dashboard/components/OddsCompare.tsx`. `priceList` (best
  first, ties keep book order so "Best" matches the row), `sidePricesAtLine`
  (Over or Under per book at one line), and `gameLinePrices` (one game-line
  outcome per book, same spread/total number only). Pure functions, with unit
  tests in `tests/oddsCompare.test.mjs` (node:test, like the existing tests).
- New `components/dashboard/OddsCompareSheet.tsx`: a bottom sheet built on React
  Native `Modal` (same pattern as `PlayerProfileModal`). Shows the title (player,
  or "Away @ Home"), a subtitle ("Rush+Rec Yds · Over 94.5", "Run Line · Yankees
  -1.5"), and one row per book with the full name and price, best first and
  tagged "Best". The footnote matches the web: "Your books posting 94.5. Books on
  a different line aren't listed." It closes on tapping outside, the X, or
  Android back. Light haptic on open, which the app already uses elsewhere.
- Tap targets: the price chip opens the sheet and the rest of the row still
  opens the player profile, using a nested `Pressable` (the inner one wins).
  `hitSlop` brings the chip to Apple's 44pt minimum.

### A2. Book lists and Book Preferences

- `lib/sportsbooks.ts` fallback lists: remove the six dead books, fold Hard
  Rock's state keys into `hardrockbet` (match the server's
  `hard_rock_state_books`), and set `PROP_BOOK_KEYS` to the S1 list.
- Pass `profile?.sportsbook_preferences` into `PropsList` and `MLBPropsTable`
  (`index.tsx:2779-2780`), then into every `eligiblePropBookKeys(...)` call.
  Props then follow Book Preferences exactly like Game Props.
- `BOOK_SHORT`: read server `short_names` (S3), falling back to a local table
  that includes FAN / PRX / BAL.

### A3. Show the book on player props, tap to compare

Portrait and landscape are laid out separately (phone layout rules, not iPad polish).

- **Portrait** (Player | AVG | L10 | L5 | Edge): the player's second line
  becomes "94.5 ▾ R+R Yds · **−113 FD**". The price and book are a tappable gold
  chip that opens the compare sheet, and the line (with ▾ when alts exist) opens
  the line picker (A6). No new column. Brian confirmed from today's screenshot
  that it fits ("0.5 TD +110" already lives there).
- **Landscape** (Player | Line | Odds | AVG | …): add a **Book** column after
  Odds (web order), and make the Odds cell the tappable chip.
- **MLB** (`MLBPropsTable`): same treatment. The portrait subline gets the book,
  and landscape gets a Book column after Line.
- Doubled-number law: the price appears once per row (subline in portrait,
  Odds cell in landscape), never both.

### A4. Over / Under toggle

- Segmented **Over | Under** control under the market rail, in the same style as
  the NFL "Standard / Alt" variant buttons. Hidden on Yes-only markets: Anytime
  TD, 1st TD, Last TD, NHL Anytime Goal and First Goal. Starts on Over every
  visit.
- `flattenProps` keeps Under prices per book at the same point (MLB already
  stores `.under`; match it to the Over's point the way the web fixed in
  `80598bf`). An Under row = the consensus line, the best Under there, and every
  book's Under in the sheet. Drop the row if no book has an Under.
- On the Under side:
  - L5/L10 hit counts and the stat colors flip to "stayed under".
  - **Edge is hidden**, or the S4 server field is shown if present.
    Portrait's Edge column becomes **L10 U** (Under hit count) so the width
    doesn't change. Landscape just drops Edge.
  - Default order is L10 Under hit rate, ties to the better price. Logged-out
    preview keeps the normal order so the hit-rate order can't leak.
  - The line dropdown (A6) hides and the row uses the standard line, because
    alt rungs are Over only. MLB's VS SP column stays.
- Sorting by Edge while on Under falls back to L10 Under hit.

### A5. Game Props: tap any price

- `GamePropsTable`: `PriceCell`, `PairedPriceCell`, `SpreadCell`, and the
  NCAAF card-mode `price()` text become tappable and open the sheet via
  `gameLinePrices`. That covers Moneyline (and soccer Draw), Spread / Run Line /
  Puck Line, and Total Over / Under. No Under toggle here, since Total already
  has an Under column.
- The phone already compares the customer's own books here (`gameMarkets` takes
  preferences). The sheet uses the same list, so "Best" in the sheet always
  matches the cell. That's better than the web, which uses a fixed list.
- Doubled-number law: leans and verdict tiles stay price-free. Only market cells
  open the sheet.

### A6. Alt lines as a per-row dropdown (NFL, NHL)

The web pattern Brian designed (2026-09-27): one row per player at the standard
line, and the Line is a dropdown of alt rungs. Picking a rung updates that row's
price, book, hit counts and Edge in place, and the board order stays on the
standard line.

- **Data:** request `?alts=board` for NFL and NHL (`index.tsx:1483`). The server
  then sends only in-band rungs (-250..+250, no TD/INT ladders) and scores each
  one as `altScores`, so alt Edge is server-computed, not app math. Same Odds
  API cost: it's the same cached pull, just trimmed. Other sports have no alt
  ladders on the web either, so none here.
- **Phone "dropdown":** tapping the line (portrait subline "94.5 ▾", landscape
  Line cell) opens a small picker sheet listing each rung with its best price
  and book. Picking one closes the sheet and updates the row. It's the phone
  version of a select menu. iOS has no native inline dropdown, so a sheet is the
  standard pattern.
- **Remove** the NFL Standard/Alt variant toggle row. Anytime TD keeps the 0.5
  / 2+ TDs pair as its dropdown, like the web.
- **With Over/Under:** on the Under side the line is fixed to the standard line,
  because the board payload carries Over alts only (same as the web).
- The compare sheet (A1) follows the picked rung: all books at that alt line.

### A7. Game Lines tool and Value Finder: tap any price

Brian: include if it helps customers. It does. A price that opens the sheet on
one screen but not another feels broken, and both reuse the A5 sheet with no new
data.

- **Game Lines** (`GameLineCard.tsx`): the Moneyline / Spread / Total / BTTS
  market sections (lines ~1063-1150) become tappable. The verdict tiles
  (`LeanBox`) stay price-free per the doubled-number law.
- **Value Finder** (`app/value-finder.tsx:93`): the market price taps open.

### A8. Remove the +700 cap on NFL props

Drop the `outcome.price > 700` filter in `flattenProps`, matching the web
(longshot 1st TD / Last TD / 2+ TD rows return). The row-count trim still keeps
the board short.

---

## Order of work

1. ~~S1–S3 server changes~~ done (`0901b95`). S4 field name agreed:
   `underBoardScores`, not sent yet.
2. **A1 + A2** helpers, sheet, book lists, preferences. Unit tests pass.
3. **A3 + A8** book shown, props sheet, +700 cap removed.
4. **A6** alt-line dropdown (NFL, NHL).
5. **A4** Over / Under (built on top of A6, so the Under side's fixed line is
   handled once).
6. **A5 + A7** Game Props, Game Lines and Value Finder sheets.
7. Typecheck (`tsc --noEmit` alone), unit tests, then Brian reviews on a device
   or in the Simulator. Under the browser/UI law, any Simulator driving needs
   Brian's go-ahead first.
8. Log each change in `APP_STORE_CHANGELOG.md` under "Next build (after
   1.1.2)". Ship it in the same build as the pending KingFish AI rename. Bump
   `app.json` to **1.1.3**, iOS and Android together.
9. Archive with the standard store flags (`SENTRY_DISABLE_AUTO_UPLOAD=true`,
   `ENABLE_USER_SCRIPT_SANDBOXING=NO`), submit both stores, set HQ
   `latest_version` after approval.

## What the reviewer sees (draft for App Store "What's New")

- Tap any price to compare odds at every sportsbook you use.
- Player props now show which sportsbook has the best price.
- New Over / Under switch on player props.
- Alternate lines: tap a player's line to pick another (NFL, NHL).
- Player props follow your Book Preferences.
- Chat renamed KingFish AI (already queued).

## Test checklist

- Props: the book shows in portrait and landscape. Tapping the price opens the
  sheet, and "Best" matches the row's book. Tapping elsewhere on the row still
  opens the player profile.
- Turn Fanatics on in Book Preferences: it appears in props and Game Props
  sheets once S2 data exists. Turn DraftKings off: it disappears from both tabs.
- Over/Under: hidden on Anytime/1st/Last TD and NHL goal markets. Under rows show
  the Under price and the sheet shows Under prices. Hit counts flip. Edge is
  hidden (or the server Under Edge shows if S4 is live). Under order is by L10
  Under hit rate.
- Free/logged-out preview: locks unchanged, and the Under order doesn't leak hit
  rates.
- Alts (NFL, NHL): the line shows ▾ only when alts exist. Picking a rung
  updates price, book, hits and Edge (server `altScores`) in place, and the
  board order doesn't move. No Standard/Alt row. Anytime TD offers 0.5 / 2+.
- NFL 1st TD / Last TD longshots over +700 now appear.
- Game Lines tool and Value Finder prices open the sheet. Verdict tiles show no
  price.
- Game Props: every price taps open. Spread and total sheets list only books on
  the same number. NCAAF card mode works.
- Android back closes the sheet. VoiceOver reads "odds at every book."
- A Florida customer sees Hard Rock (main feed), and nobody sees bet365.

## Decided (Brian, 2026-10-15)

1. Portrait book display: on the player's second line. It fits, per the
   screenshot.
2. Portrait Under: Edge is replaced by "L10 U".
3. Value Finder and the Game Lines tool: included (A7).
4. +700 NFL props cap: removed (A8).
5. Ships with the KingFish AI rename as 1.1.3, iOS and Android.
6. Added by Brian: alt lines as a per-row dropdown on the phone (A6).
