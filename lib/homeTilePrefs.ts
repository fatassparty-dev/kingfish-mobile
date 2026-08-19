import type { HomeTile } from '@/lib/mobileConfig'

export type HomeTilePreferences = {
  keys?: string[]
  updated_at?: string
} | null | undefined

export const HOME_TILE_PREFS_STORAGE_PREFIX = 'kfb.homeTilePrefs.'

export function homeTilePrefsStorageKey(userId?: string | null) {
  return userId ? `${HOME_TILE_PREFS_STORAGE_PREFIX}${userId}` : null
}

/**
 * The single decision point for what the Home screen shows.
 *
 * The server list (`/api/mobile-config` home_tiles) stays the source of truth for
 * which tiles EXIST — a user's saved list is always filtered against it. Without
 * that filter, retiring a tile server-side would leave it stranded on a
 * customized home screen, routing nowhere. That is exactly how The Ref Report
 * shipped broken in build 21, and it is not a mistake worth repeating.
 *
 * No saved list means today's behaviour, untouched: the server order, as picked
 * in HQ.
 */
export function resolveHomeTiles(
  serverTiles: HomeTile[],
  preferences: HomeTilePreferences,
  catalog?: HomeTile[],
): HomeTile[] {
  const defaults = Array.isArray(serverTiles) ? serverTiles : []
  // A user can pick from the whole catalogue, so resolution has to look there
  // too — otherwise choosing The Ref Report would save and then vanish, because
  // it is not one of the default tiles.
  const available = Array.isArray(catalog) && catalog.length
    ? [...defaults, ...catalog.filter((tile) => !defaults.some((d) => d.key === tile.key))]
    : defaults
  const savedKeys = preferences?.keys

  if (!Array.isArray(savedKeys) || savedKeys.length === 0) return defaults

  const byKey = new Map(available.map((tile) => [tile.key, tile]))
  const chosen: HomeTile[] = []
  const seen = new Set<string>()
  for (const key of savedKeys) {
    const tile = byKey.get(key)
    if (tile && !seen.has(key)) {
      chosen.push(tile)
      seen.add(key)
    }
  }

  // Every saved tile has since been retired server-side — fall back rather than
  // render an empty Home.
  return chosen.length ? chosen : defaults
}

/** True when the user has actively chosen a set, as opposed to inheriting ours. */
export function hasCustomHomeTiles(preferences: HomeTilePreferences) {
  return Array.isArray(preferences?.keys) && preferences!.keys!.length > 0
}
