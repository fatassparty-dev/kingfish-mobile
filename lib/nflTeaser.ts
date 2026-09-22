// Response contract only: qualifying lines, rankings and pairs come from the API.
export type TeaserPoints = 6 | 6.5 | 7
export type TeaserLeg = {
  id: string; gameId: string; team: string; opponent: string; kickoff: string
  originalLine: number; teasedLine: number; explanation: string
}
export type TeaserBook = {
  key: string; name: string; legs: TeaserLeg[]
  pairs: { id: string; legIds: [string, string] }[]
}
export type NflTeaserResponse = {
  status: 'ready' | 'no_games' | 'no_qualifiers'; points: TeaserPoints
  books: TeaserBook[]; updatedAt: string | null; stale: boolean
  // Every team's spread per book (server 2026-09-22). The app lists these
  // instead of suggested pairs; absent on an older server → falls back to books.
  allBooks?: { key: string; name: string; legs: TeaserLeg[] }[]
}

export function toggleTeaserLeg(ids: string[], leg: TeaserLeg, legs: TeaserLeg[]): string[] {
  if (ids.includes(leg.id)) return ids.filter(id => id !== leg.id)
  if (ids.length >= 4 || legs.some(other => ids.includes(other.id) && other.gameId === leg.gameId)) return ids
  return [...ids, leg.id]
}

// User-entered ticket payout only; never infer sportsbook teaser pricing.
export function teaserTicketMath(oddsText: string, stakeText: string) {
  if (!/^[+-]?\d+(\.\d+)?$/.test(oddsText.trim()) || !/^\d+(\.\d{1,2})?$/.test(stakeText.trim())) return null
  const odds = Number(oddsText), stake = Number(stakeText)
  if (!Number.isFinite(odds) || Math.abs(odds) < 100 || !Number.isFinite(stake) || stake <= 0) return null
  const decimal = odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds)
  const profit = stake * (decimal - 1), total = stake * decimal
  return Number.isFinite(total) ? { profit, total, breakEven: 100 / decimal } : null
}
