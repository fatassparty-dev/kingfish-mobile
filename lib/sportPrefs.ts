import type { Sport } from '@/types'

export type SportPreferences = {
  sports?: string[]
  updated_at?: string
} | null | undefined

/**
 * Narrow a list of sports to the ones the user follows.
 *
 * Applied AFTER the server's dashboard_tab_* flags, never instead of them — so a
 * user preference can only ever hide a sport KingFish already offers, and can
 * never switch on one we have turned off.
 *
 * DECISION (Brian, 2026-08-19): this narrows the sport TAB ROW and the
 * cheat-sheet TILES only. It deliberately does NOT filter the rows inside
 * cross-sport boards — Top 5 Leans and 100% Hit Rate keep meaning "the best
 * plays anywhere", and filtering them would leave a football-only user staring
 * at an empty board through the whole baseball season.
 *
 * An empty or unrecognised selection falls back to everything visible. Someone
 * who unticks every sport should see the normal app, not an empty dashboard.
 */
export function applySportPreferences<T extends { key: Sport }>(
  visible: T[],
  preferences: SportPreferences,
): T[] {
  const chosen = preferences?.sports
  if (!Array.isArray(chosen) || chosen.length === 0) return visible
  const wanted = new Set(chosen)
  const narrowed = visible.filter((item) => wanted.has(item.key))
  return narrowed.length ? narrowed : visible
}

export function hasSportPreferences(preferences: SportPreferences) {
  return Array.isArray(preferences?.sports) && preferences!.sports!.length > 0
}

/**
 * The sports a user can choose between, with the server flag that decides
 * whether KingFish offers each one at all. Keys must match the dashboard's
 * SPORTS list.
 */
export const SPORT_OPTIONS: Array<{ key: Sport; label: string; visibilityFlag: string }> = [
  { key: 'MLB', label: 'MLB', visibilityFlag: 'dashboard_tab_mlb' },
  { key: 'NFL', label: 'NFL', visibilityFlag: 'dashboard_tab_nfl' },
  { key: 'NBA', label: 'NBA', visibilityFlag: 'dashboard_tab_nba' },
  { key: 'NHL', label: 'NHL', visibilityFlag: 'dashboard_tab_nhl' },
  { key: 'WNBA', label: 'WNBA', visibilityFlag: 'dashboard_tab_wnba' },
  { key: 'KBO', label: 'KBO', visibilityFlag: 'dashboard_tab_kbo' },
  { key: 'NCAAB', label: 'College Basketball', visibilityFlag: 'dashboard_tab_ncaab' },
  { key: 'NCAAF', label: 'College Football', visibilityFlag: 'dashboard_tab_ncaaf' },
  { key: 'SOCCER', label: 'Soccer', visibilityFlag: 'dashboard_tab_soccer' },
]

/**
 * Cheat-sheet tiles carry a sport tag ('ALL' | 'MLB' | 'WNBA' | 'NFL'). Tagged
 * ALL always shows — those boards are cross-sport.
 */
export function tileMatchesSportPreferences(
  tileSport: string | undefined,
  preferences: SportPreferences,
): boolean {
  const chosen = preferences?.sports
  if (!Array.isArray(chosen) || chosen.length === 0) return true
  if (!tileSport || tileSport === 'ALL') return true
  return chosen.includes(tileSport)
}
