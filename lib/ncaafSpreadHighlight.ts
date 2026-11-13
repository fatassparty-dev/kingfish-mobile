// Presentation only: the server supplies the selected side and thresholds.
export type SpreadHighlightRead = {
  side: 'home' | 'away'
  minimumPoint: number
  minimumStrongPoint: number | null
  detail?: string
}

export function ncaafSpreadHighlight(
  read: SpreadHighlightRead | null | undefined,
  side: 'home' | 'away',
  line: { point?: number; price: number } | null | undefined,
): 'Lean' | 'Strong' | null {
  if (
    !read
    || read.side !== side
    || !line
    || typeof line.point !== 'number'
    || !Number.isFinite(line.point)
    || !Number.isFinite(read.minimumPoint)
    || !Number.isFinite(line.price)
    || line.price < -125
    || line.price > 125
    || line.price === 0
    || line.point < read.minimumPoint
  ) return null

  return typeof read.minimumStrongPoint === 'number'
    && Number.isFinite(read.minimumStrongPoint)
    && line.point >= read.minimumStrongPoint
    ? 'Strong'
    : 'Lean'
}

// Normalizes any sport's server spread lean into the highlight shape above.
// NCAAF/NCAAB already ship { side: 'home'|'away', minimumPoint, ... }. NFL
// ships { side: <team name>, point, type: 'Spread Lean' | 'Strong Spread
// Lean' | 'Spread Watch' } (kingfish-bets lib/scoring/nflLean.ts): its call
// holds at the posted point or better, and "Spread Watch" is No Lean.
// Presentation only — the side, the point and the tier all come from the server.
export function spreadLeanRead(game: { home_team: string; away_team: string; kingfishSpreadLean?: unknown }): SpreadHighlightRead | null {
  const lean = (game as any).kingfishSpreadLean
  if (!lean || typeof lean !== 'object') return null
  if (typeof lean.minimumPoint === 'number') return lean as SpreadHighlightRead
  if (lean.type === 'Spread Watch' || typeof lean.point !== 'number') return null
  const side = lean.side === game.home_team ? 'home' : lean.side === game.away_team ? 'away' : null
  if (!side) return null
  return {
    side,
    minimumPoint: lean.point,
    minimumStrongPoint: lean.type === 'Strong Spread Lean' ? lean.point : null,
    detail: lean.detail,
  }
}
