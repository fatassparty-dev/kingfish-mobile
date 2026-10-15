/**
 * Odds-compare helpers for the "tap a price, see every book" sheet. Ports of
 * the web's kingfish-bets app/dashboard/components/OddsCompare.tsx and
 * PropSideToggle.tsx so the phone lists books exactly the way the web does.
 *
 * Raw market prices only (passthrough data). No derived scores live here: Edge
 * and leans come from the server (CLAUDE.md "Calculated scores live on the web").
 * Hit counts are descriptive stats, so sideHit / sideHitRate are fine here.
 *
 * Pure and import-free so tests/oddsCompare.test.mjs can load it directly.
 */

export type BookPrice = { book: string; odds: number }
export type PropSide = 'over' | 'under'
export type PropBookLine = { over?: number; under?: number; point?: number }

/**
 * Every book's price, best first. Ties keep input order, so the first entry is
 * the same book the row's best-price pick shows (both keep the first max).
 */
export function priceList(prices: Record<string, number>): BookPrice[] {
  return Object.entries(prices)
    .map(([book, odds]) => ({ book, odds }))
    .sort((a, b) => b.odds - a.odds)
}

/** One side's prices for every book posting exactly `line`, best first, in `books` order on ties. */
export function sidePricesAtLine(
  bookData: Record<string, { over?: number | null; under?: number | null; point?: number | null } | undefined>,
  books: string[],
  line: number,
  side: PropSide,
): BookPrice[] {
  const prices: Record<string, number> = {}
  for (const book of books) {
    const entry = bookData[book]
    const price = entry?.[side]
    if (typeof price === 'number' && entry?.point === line) prices[book] = price
  }
  return priceList(prices)
}

/** A Yes-only market's price per book (Anytime TD, NHL goal scorer), best first. */
export function yesPrices(prices: Record<string, number>, books: string[]): BookPrice[] {
  const ordered: Record<string, number> = {}
  for (const book of books) if (typeof prices[book] === 'number') ordered[book] = prices[book]
  return priceList(ordered)
}

type GameLike = {
  bookmakers?: Array<{
    key: string
    markets?: Array<{ key: string; outcomes?: Array<{ name: string; price?: number; point?: number }> }>
  }>
}

/**
 * Every book's price for one game-line outcome (moneyline team, spread team,
 * Over/Under, Draw, BTTS Yes/No), in `books` order so ties keep the same best
 * book as the table. Spreads and totals only list books posting `point`.
 */
export function gameLinePrices(game: GameLike | null | undefined, books: string[], market: string, outcome: string, point?: number): BookPrice[] {
  const prices: Record<string, number> = {}
  for (const book of books) {
    const bookmaker = (game?.bookmakers || []).find((bm) => bm.key === book)
    const found = bookmaker?.markets?.find((m) => m.key === market)?.outcomes
      ?.find((o) => o.name === outcome && (point === undefined || o.point === point))
    if (typeof found?.price === 'number') prices[book] = found.price
  }
  return priceList(prices)
}

/** Which game-line outcome a price cell shows, for its compare sheet. */
export type GameLinePick = { market: string; outcome: string; label: string }

/**
 * The compare sheet for one game-line price (Game Props, Game Lines, Value
 * Finder). `books` is the list the cell picked its best price from, in the
 * same order, so the sheet's "Best" matches the cell. Spreads and totals list
 * only books posting the cell's number.
 */
export function gameLineCompare(
  game: GameLike & { away_team: string; home_team: string },
  books: string[],
  line: { book: string; price: number; point?: number | null },
  pick: GameLinePick,
) {
  const point = typeof line.point === 'number' && pick.market !== 'h2h' ? line.point : undefined
  const prices = gameLinePrices(game, books, pick.market, pick.outcome, point)
  return {
    title: `${game.away_team} @ ${game.home_team}`,
    subtitle: point === undefined ? pick.label : `${pick.label} ${pick.market === 'spreads' && point > 0 ? '+' : ''}${point}`,
    prices: prices.length ? prices : [{ book: line.book, odds: line.price }],
    note: point === undefined ? 'Your books with this market posted.' : `Your books posting ${point}. Books on a different line aren't listed.`,
  }
}

/**
 * Per-book Over/Under at one point from a player's raw outcomes. The book's
 * point is its (last) Over point, and its Under is the Under posted at that
 * same point: a market can carry several points, and the last Under seen may
 * be on a different one (the web fixed this in kingfish-bets 80598bf).
 */
export function propBookLines(outcomes: Array<{ book: string; name: string; price?: number; point?: number }>): Record<string, PropBookLine> {
  const lines: Record<string, PropBookLine> = {}
  const underAt: Record<string, Record<number, number>> = {}
  for (const outcome of outcomes) {
    if (typeof outcome.price !== 'number') continue
    if (outcome.name === 'Over') {
      const entry = lines[outcome.book] || {}
      entry.over = outcome.price
      if (typeof outcome.point === 'number') entry.point = outcome.point
      lines[outcome.book] = entry
    } else if (outcome.name === 'Under' && typeof outcome.point === 'number') {
      (underAt[outcome.book] ||= {})[outcome.point] = outcome.price
    }
  }
  for (const [book, entry] of Object.entries(lines)) {
    const under = typeof entry.point === 'number' ? underAt[book]?.[entry.point] : undefined
    if (typeof under === 'number') entry.under = under
  }
  return lines
}

export type LineOption = { line: number; prices: BookPrice[] }

/**
 * A row's line choices: the standard line first in value order with every alt
 * rung that has a price. A rung equal to the standard line never replaces it.
 */
export function lineOptions(standardLine: number, standardPrices: BookPrice[], altRungs: Record<string, Record<string, number>> = {}): LineOption[] {
  const options = new Map<number, BookPrice[]>([[standardLine, standardPrices]])
  for (const [point, rung] of Object.entries(altRungs)) {
    const prices = priceList(rung)
    if (!options.has(Number(point)) && prices.length) options.set(Number(point), prices)
  }
  return Array.from(options.entries())
    .map(([line, prices]) => ({ line, prices }))
    .sort((a, b) => a.line - b.line)
}

// A game "hits" when it cleared the line on the side being shown.
export function sideHit(value: number, line: number, side: PropSide) {
  return side === 'under' ? value < line : value > line
}

/** Share of `values` that hit on `side`, or null with no games. */
export function sideHitRate(values: number[] | null | undefined, line: number, side: PropSide) {
  if (!values || !values.length) return null
  return values.filter((value) => sideHit(value, line, side)).length / values.length
}

/** "7/10" style count of games that hit on `side`, or "-" with no games. */
export function sideHitCount(values: number[] | null | undefined, line: number, side: PropSide) {
  if (!values || !values.length) return '-'
  return `${values.filter((value) => sideHit(value, line, side)).length}/${values.length}`
}
