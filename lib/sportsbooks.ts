import type { Bookmaker } from '@/types'
import { isOutsideUsLocation, normalizeLocation } from '@/lib/locations'

const SUPPORTED_BOOK_KEYS = new Set([
  'barstool',
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

const HARD_ROCK_BOOK_KEYS = new Set(['hardrockbet', 'hardrockbet_az', 'hardrockbet_fl', 'hardrockbet_oh'])
const HARD_ROCK_STATE_BOOKS: Record<string, string[]> = {
  IN: ['hardrockbet'],
  AZ: ['hardrockbet_az'],
  FL: ['hardrockbet_fl'],
  OH: ['hardrockbet_oh'],
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
  bet365: 'bet365',
  betmgm: 'BetMGM',
  betparx: 'BetPARX',
  betrivers: 'BetRivers',
  caesars: 'Caesars',
  draftkings: 'DraftKings',
  espnbet: 'ESPN BET',
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

export function isSportsbookVisibleForState(bookmaker: Pick<Bookmaker, 'key'>, userState?: string | null) {
  if (!isSupportedSportsbook(bookmaker)) return false
  if (!HARD_ROCK_BOOK_KEYS.has(bookmaker.key)) return true
  if (isOutsideUsLocation(userState)) return true
  const state = normalizeLocation(userState)
  return Boolean(HARD_ROCK_STATE_BOOKS[state]?.includes(bookmaker.key))
}

export function supportedBookmakers(bookmakers: Bookmaker[] = [], userState?: string | null) {
  return bookmakers.filter((bookmaker) => isSportsbookVisibleForState(bookmaker, userState))
}

export function eligiblePropBookKeys(userState?: string | null) {
  return PROP_BOOK_KEYS.filter((key) => isSportsbookVisibleForState({ key }, userState))
}

export function displayBookName(key: string, fallback?: string) {
  return BOOK_DISPLAY_NAMES[key] || fallback || key
}
