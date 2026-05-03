import type { Bookmaker } from '@/types'

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
  'pointsbetus',
  'superbook',
  'unibet_us',
  'williamhill_us',
  'wynnbet',
])

export const PROP_BOOK_KEYS = ['fanduel', 'draftkings', 'betmgm', 'betrivers', 'williamhill_us']

export const BOOK_DISPLAY_NAMES: Record<string, string> = {
  betmgm: 'MGM',
  betrivers: 'BR',
  caesars: 'CZR',
  draftkings: 'DK',
  espnbet: 'ESPN',
  fanduel: 'FD',
  fanatics: 'Fanatics',
  hardrockbet: 'Hard Rock',
  pointsbetus: 'PointsBet',
  williamhill_us: 'CZR',
}

export function isSupportedSportsbook(bookmaker: Pick<Bookmaker, 'key'>) {
  return SUPPORTED_BOOK_KEYS.has(bookmaker.key)
}

export function supportedBookmakers(bookmakers: Bookmaker[] = []) {
  return bookmakers.filter(isSupportedSportsbook)
}

export function displayBookName(key: string, fallback?: string) {
  return BOOK_DISPLAY_NAMES[key] || fallback || key
}
