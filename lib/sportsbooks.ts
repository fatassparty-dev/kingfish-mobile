import type { Bookmaker } from '@/types'
import { isOutsideUsLocation, normalizeLocation } from '@/lib/locations'

// Bundled fallbacks only: mobile-config's `sportsbooks` block replaces these at
// launch (configureSportsbooks). Kept in step with kingfish-bets
// lib/sportsbooks.ts, which dropped bet365, PointsBet, Unibet, Barstool, WynnBET
// and SuperBook on 2026-10-15 (no US data) and folded Hard Rock's state feeds
// into the main feed.
let SUPPORTED_BOOK_KEYS = new Set([
  'ballybet',
  'betmgm',
  'betparx',
  'betrivers',
  'draftkings',
  'espnbet',
  'fanduel',
  'fanatics',
  'hardrockbet',
  'hardrockbet_az',
  'hardrockbet_fl',
  'hardrockbet_oh',
  'williamhill_us',
])

let CORE_BOOK_KEYS = new Set(['fanduel', 'draftkings', 'betmgm', 'betrivers', 'williamhill_us', 'espnbet'])
export const OPTIONAL_BOOK_KEYS = ['betparx', 'fanatics', 'ballybet']
const HARD_ROCK_BOOK_KEYS = new Set(['hardrockbet', 'hardrockbet_az', 'hardrockbet_fl', 'hardrockbet_oh'])
let NEVADA_REGIONAL_BOOK_KEYS = new Set<string>()
let REGIONAL_BOOK_KEYS = new Set([...HARD_ROCK_BOOK_KEYS, ...NEVADA_REGIONAL_BOOK_KEYS])
let HARD_ROCK_STATE_BOOKS: Record<string, string[]> = {
  IN: ['hardrockbet'],
  AZ: ['hardrockbet'],
  FL: ['hardrockbet'],
  OH: ['hardrockbet'],
}

export type SportsbookPreferences = {
  extraBookKeys?: string[]
  disabledBookKeys?: string[]
  overrideRegional?: boolean
}

// The books every player-props feed carries (server `prop_keys`). Props show
// the subset the customer's state and Book Preferences allow.
export const PROP_BOOK_KEYS = [
  'fanduel',
  'draftkings',
  'betmgm',
  'betrivers',
  'williamhill_us',
  'espnbet',
  'hardrockbet',
  'betparx',
  'fanatics',
  'ballybet',
]

export const BOOK_DISPLAY_NAMES: Record<string, string> = {
  ballybet: 'Bally Bet',
  betmgm: 'BetMGM',
  betparx: 'BetPARX',
  betrivers: 'BetRivers',
  caesars: 'Caesars',
  draftkings: 'DraftKings',
  espnbet: 'theScore Bet',
  fanduel: 'FanDuel',
  fanatics: 'Fanatics',
  hardrockbet: 'Hard Rock Bet',
  hardrockbet_az: 'Hard Rock Bet',
  hardrockbet_fl: 'Hard Rock Bet',
  hardrockbet_oh: 'Hard Rock Bet',
  williamhill_us: 'Caesars',
}

// Short labels for tight cells ("−113 FD"). Server `short_names` replaces
// these, so a new book never needs an app update just for its label.
export const BOOK_SHORT_NAMES: Record<string, string> = {
  fanduel: 'FD',
  draftkings: 'DK',
  betmgm: 'MGM',
  betrivers: 'BR',
  williamhill_us: 'CZR',
  espnbet: 'TSB',
  hardrockbet: 'HR',
  hardrockbet_az: 'HR',
  hardrockbet_fl: 'HR',
  hardrockbet_oh: 'HR',
  fanatics: 'FAN',
  betparx: 'PRX',
  ballybet: 'BAL',
}

export const SPORTSBOOK_PREFERENCE_OPTIONS: Array<{ key: string; label: string; bookKeys: string[] }> = [
  { key: 'fanduel', label: 'FanDuel', bookKeys: ['fanduel'] },
  { key: 'draftkings', label: 'DraftKings', bookKeys: ['draftkings'] },
  { key: 'betmgm', label: 'BetMGM', bookKeys: ['betmgm'] },
  { key: 'betrivers', label: 'BetRivers', bookKeys: ['betrivers'] },
  { key: 'williamhill_us', label: 'Caesars', bookKeys: ['williamhill_us'] },
  { key: 'espnbet', label: 'theScore Bet', bookKeys: ['espnbet'] },
  { key: 'betparx', label: 'BetPARX', bookKeys: ['betparx'] },
  { key: 'fanatics', label: 'Fanatics', bookKeys: ['fanatics'] },
  { key: 'ballybet', label: 'Bally Bet', bookKeys: ['ballybet'] },
  { key: 'hardrockbet', label: 'Hard Rock Bet', bookKeys: ['hardrockbet', 'hardrockbet_az', 'hardrockbet_fl', 'hardrockbet_oh'] },
]

export type SportsbookServerConfig = {
  preference_options: Array<{ key: string; label: string; bookKeys: string[] }>
  display_names: Record<string, string>
  short_names?: Record<string, string>
  core_keys: string[]
  regional_keys: string[]
  hard_rock_state_books: Record<string, string[]>
  nevada_regional_keys?: string[]
  prop_keys?: string[]
}

export function configureSportsbooks(config?: SportsbookServerConfig) {
  if (!config?.preference_options?.length) return
  SPORTSBOOK_PREFERENCE_OPTIONS.splice(0, SPORTSBOOK_PREFERENCE_OPTIONS.length, ...config.preference_options)
  Object.keys(BOOK_DISPLAY_NAMES).forEach((key) => delete BOOK_DISPLAY_NAMES[key])
  Object.assign(BOOK_DISPLAY_NAMES, config.display_names)
  if (config.short_names && Object.keys(config.short_names).length) Object.assign(BOOK_SHORT_NAMES, config.short_names)
  SUPPORTED_BOOK_KEYS = new Set(config.preference_options.flatMap((option) => option.bookKeys))
  CORE_BOOK_KEYS = new Set(config.core_keys)
  REGIONAL_BOOK_KEYS = new Set(config.regional_keys)
  HARD_ROCK_STATE_BOOKS = config.hard_rock_state_books
  if (config.nevada_regional_keys) NEVADA_REGIONAL_BOOK_KEYS = new Set(config.nevada_regional_keys)
  if (config.prop_keys?.length) PROP_BOOK_KEYS.splice(0, PROP_BOOK_KEYS.length, ...config.prop_keys)
}

export function isSupportedSportsbook(bookmaker: Pick<Bookmaker, 'key'>) {
  return SUPPORTED_BOOK_KEYS.has(bookmaker.key)
}

export function isSportsbookVisibleForState(bookmaker: Pick<Bookmaker, 'key'>, userState?: string | null, preferences?: SportsbookPreferences | null) {
  if (!isSupportedSportsbook(bookmaker)) return false
  const disabledBookKeys = new Set(preferences?.disabledBookKeys || [])
  if (disabledBookKeys.has(bookmaker.key)) return false
  const extraBookKeys = new Set(preferences?.extraBookKeys || [])
  if (CORE_BOOK_KEYS.has(bookmaker.key)) return true
  if (extraBookKeys.has(bookmaker.key)) return true
  if (!REGIONAL_BOOK_KEYS.has(bookmaker.key)) return false
  if (isOutsideUsLocation(userState)) return true
  const state = normalizeLocation(userState)
  if (preferences?.overrideRegional) return true
  if (HARD_ROCK_STATE_BOOKS[state]?.includes(bookmaker.key)) return true
  return state === 'NV' && NEVADA_REGIONAL_BOOK_KEYS.has(bookmaker.key)
}

export function supportedBookmakers(bookmakers: Bookmaker[] = [], userState?: string | null, preferences?: SportsbookPreferences | null) {
  return bookmakers.filter((bookmaker) => isSportsbookVisibleForState(bookmaker, userState, preferences))
}

export function eligiblePropBookKeys(userState?: string | null, preferences?: SportsbookPreferences | null) {
  return PROP_BOOK_KEYS.filter((key) => isSportsbookVisibleForState({ key }, userState, preferences))
}

export function displayBookName(key: string, fallback?: string) {
  return BOOK_DISPLAY_NAMES[key] || fallback || key
}

export function shortBookName(key: string) {
  return BOOK_SHORT_NAMES[key] || displayBookName(key)
}
