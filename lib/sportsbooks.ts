import type { Bookmaker } from '@/types'
import { isOutsideUsLocation, normalizeLocation } from '@/lib/locations'

const SUPPORTED_BOOK_KEYS = new Set([
  'barstool',
  'ballybet',
  'bet365',
  'betmgm',
  'betparx',
  'betrivers',
  'caesars',
  'draftkings',
  'espnbet',
  'fanduel',
  'fanatics',
  'hardrockbet',
  'hardrockbet_az',
  'hardrockbet_fl',
  'hardrockbet_oh',
  'pointsbetus',
  'superbook',
  'unibet_us',
  'williamhill_us',
  'wynnbet',
])

const CORE_BOOK_KEYS = new Set(['fanduel', 'draftkings', 'betmgm', 'betrivers', 'williamhill_us', 'espnbet'])
export const OPTIONAL_BOOK_KEYS = ['betparx', 'fanatics', 'bet365', 'pointsbetus', 'unibet_us', 'barstool', 'ballybet']
const HARD_ROCK_BOOK_KEYS = new Set(['hardrockbet', 'hardrockbet_az', 'hardrockbet_fl', 'hardrockbet_oh'])
const NEVADA_REGIONAL_BOOK_KEYS = new Set(['superbook', 'wynnbet'])
const REGIONAL_BOOK_KEYS = new Set([...HARD_ROCK_BOOK_KEYS, ...NEVADA_REGIONAL_BOOK_KEYS])
const HARD_ROCK_STATE_BOOKS: Record<string, string[]> = {
  IN: ['hardrockbet'],
  AZ: ['hardrockbet_az'],
  FL: ['hardrockbet_fl'],
  OH: ['hardrockbet_oh'],
}

export type SportsbookPreferences = {
  extraBookKeys?: string[]
  overrideRegional?: boolean
}

export const PROP_BOOK_KEYS = [
  'fanduel',
  'draftkings',
  'betmgm',
  'betrivers',
  'williamhill_us',
  'espnbet',
  'hardrockbet',
  'hardrockbet_az',
  'hardrockbet_fl',
  'hardrockbet_oh',
]

export const BOOK_DISPLAY_NAMES: Record<string, string> = {
  barstool: 'Barstool',
  ballybet: 'Bally Bet',
  bet365: 'bet365',
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
  pointsbetus: 'PointsBet',
  superbook: 'SuperBook',
  unibet_us: 'Unibet',
  williamhill_us: 'Caesars',
  wynnbet: 'WynnBET',
}

export function isSupportedSportsbook(bookmaker: Pick<Bookmaker, 'key'>) {
  return SUPPORTED_BOOK_KEYS.has(bookmaker.key)
}

export function isSportsbookVisibleForState(bookmaker: Pick<Bookmaker, 'key'>, userState?: string | null, preferences?: SportsbookPreferences | null) {
  if (!isSupportedSportsbook(bookmaker)) return false
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
