import { useMemo, useState } from 'react'
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { PlayerProfileModal, type PlayerProfileMarketContext } from '@/components/dashboard/PlayerProfileModal'
import { AppText } from '@/components/Text'
import { fmtOdds, fmtTime, normalizeName } from '@/lib/format'
import { kingfishFetch } from '@/lib/api'
import { getBestOverAtLine, getDisplayLine } from '@/lib/propLines'
import { BOOK_DISPLAY_NAMES, PROP_BOOK_KEYS } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game } from '@/types'

const BATTER_MARKETS = [
  { key: 'batter_hits', label: 'Hits', statField: 'hits_per_game', isPitcher: false },
  { key: 'batter_runs_scored', label: 'Runs', statField: 'runs_per_game', isPitcher: false },
  { key: 'batter_rbis', label: 'RBI', statField: 'rbi_per_game', isPitcher: false },
  { key: 'batter_hits_runs_rbis', label: 'H+R+RBI', statField: 'hrr_per_game', isPitcher: false },
  { key: 'batter_total_bases', label: 'Total Bases', statField: 'tb_per_game', isPitcher: false },
  { key: 'batter_home_runs', label: 'Home Runs', statField: 'hr_per_game', isPitcher: false },
  { key: 'batter_singles', label: 'Singles', statField: 'singles_per_game', isPitcher: false },
  { key: 'batter_doubles', label: 'Doubles', statField: 'doubles_per_game', isPitcher: false },
  { key: 'batter_walks', label: 'Walks', statField: 'walks_per_game', isPitcher: false },
  { key: 'batter_stolen_bases', label: 'Stolen Bases', statField: 'stolen_bases_per_game', isPitcher: false },
]

const PITCHER_MARKETS = [
  { key: 'pitcher_strikeouts', label: 'Strikeouts', statField: 'strikeouts_per_game', isPitcher: true },
  { key: 'pitcher_hits_allowed', label: 'Hits Allowed', statField: 'hits_allowed_per_game', isPitcher: true },
  { key: 'pitcher_earned_runs', label: 'Earned Runs', statField: 'earned_runs_per_game', isPitcher: true },
  { key: 'pitcher_walks', label: 'Walks Allowed', statField: 'pitcher_walks_per_game', isPitcher: true },
  { key: 'pitcher_outs', label: 'Outs Recorded', statField: 'outs_per_game', isPitcher: true },
]

const ALL_MARKETS = [...BATTER_MARKETS, ...PITCHER_MARKETS]

const STAT_TO_RAW: Record<string, string> = {
  hits_per_game: 'hits',
  hr_per_game: 'hr',
  tb_per_game: 'tb',
  runs_per_game: 'runs',
  rbi_per_game: 'rbi',
  hrr_per_game: 'hrr',
  singles_per_game: 'singles',
  doubles_per_game: 'doubles',
  walks_per_game: 'walks',
  stolen_bases_per_game: 'sb',
  strikeouts_per_game: 'strikeouts',
  hits_allowed_per_game: 'hits_allowed',
  earned_runs_per_game: 'earned_runs',
  pitcher_walks_per_game: 'walks',
  outs_per_game: 'outs',
}

interface LineupPlayer {
  id: number
  name: string
}

interface PlayerRow {
  player: string
  line: number
  bestOdds?: number
  bestBook?: string
  stats?: Record<string, any>
}

type SortKey = 'player' | 'line' | 'season' | 'l20' | 'l10' | 'l5' | 'l20hit' | 'l10hit' | 'l5hit' | 'best' | 'book' | 'edge'
type SortDir = 'asc' | 'desc'

const MLB_STATS_BATCH_SIZE = 90

function chunkPlayers(players: LineupPlayer[]) {
  const chunks: LineupPlayer[][] = []
  for (let index = 0; index < players.length; index += MLB_STATS_BATCH_SIZE) {
    chunks.push(players.slice(index, index + MLB_STATS_BATCH_SIZE))
  }
  return chunks
}

async function fetchMlbStatsInBatches(batters: LineupPlayer[], pitchers: LineupPlayer[]) {
  const requests = [
    ...chunkPlayers(batters).map((batch) => ({ batters: batch, pitchers: [] as LineupPlayer[] })),
    ...chunkPlayers(pitchers).map((batch) => ({ batters: [] as LineupPlayer[], pitchers: batch })),
  ]

  const results = await Promise.all(
    requests.map((body) =>
      kingfishFetch<{ stats: Record<number, any> }>('/api/mlb-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    ),
  )

  return results.reduce<Record<number, any>>((merged, result) => ({ ...merged, ...(result.stats || {}) }), {})
}

function edgeLabel(line: number, season: number, l10: number, l5: number, odds?: number, isHR = false) {
  if (!season) return { label: '-', color: colors.textMuted, score: 0 }
  if (isHR && line <= 0.5) {
    const score = Math.min(season * 100, 100) * 0.4 + Math.min(l10 * 100, 100) * 0.35 + Math.min(l5 * 100, 100) * 0.25
    if (score >= 35) return { label: 'Strong', color: colors.gold, score }
    if (score >= 25) return { label: 'Lean', color: colors.green, score }
    if (score >= 15) return { label: 'Neutral', color: colors.textSecondary, score }
    return { label: 'Fade', color: colors.red, score }
  }

  const safeLine = Math.max(line || 0, 0.5)
  const composite = (season / safeLine) * 0.5 + ((l10 || season) / safeLine) * 0.3 + ((l5 || season) / safeLine) * 0.2
  const implied = odds && odds > 0 ? 100 / (odds + 100) : odds ? Math.abs(odds) / (Math.abs(odds) + 100) : 0.5
  const oddsBonus = implied <= 0.52 ? 18 : implied <= 0.6 ? 11 : implied <= 0.7 ? 5 : 0
  const score = Math.round(Math.max(0, Math.min(100, ((composite - 0.7) / 1.55) * 82 + oddsBonus)))
  if (score >= 80) return { label: 'Strong', color: colors.gold, score }
  if (score >= 55) return { label: 'Lean', color: colors.green, score }
  if (score >= 35) return { label: 'Neutral', color: colors.textSecondary, score }
  return { label: 'Fade', color: colors.red, score }
}

function statColor(value: number, line: number) {
  if (!value) return colors.textMuted
  if (value > line * 1.2) return colors.green
  if (value > line) return colors.yellow
  return colors.red
}

function hitRate(stats: Record<string, any> | undefined, statField: string, line: number, count: number) {
  const rawKey = STAT_TO_RAW[statField]
  const raw = stats?.raw_games
  if (!rawKey || !Array.isArray(raw) || raw.length === 0) return '-'
  const sample = raw.slice(0, count)
  const hits = sample.filter((game: any) => (game[rawKey] || 0) > line).length
  return `${hits}/${sample.length}`
}

function hitRateValue(stats: Record<string, any> | undefined, statField: string, line: number, count: number) {
  const rawKey = STAT_TO_RAW[statField]
  const raw = stats?.raw_games
  if (!rawKey || !Array.isArray(raw) || raw.length === 0) return -1
  const sample = raw.slice(0, count)
  if (sample.length === 0) return -1
  return sample.filter((game: any) => (game[rawKey] || 0) > line).length / sample.length
}

function fmtRate(value: number | undefined) {
  return value ? value.toFixed(2) : '-'
}

function findLineupPlayer(lineupMap: Record<string, LineupPlayer>, playerName?: string) {
  if (!playerName) return undefined
  const normalized = normalizeName(playerName)
  const direct = lineupMap[normalized]
  if (direct) return direct

  const compact = normalized.replace(/\s/g, '')
  return Object.entries(lineupMap).find(([key]) => {
    const keyCompact = key.replace(/\s/g, '')
    return key === normalized || keyCompact === compact || key.includes(normalized) || normalized.includes(key)
  })?.[1]
}

function buildRows(game: Game, marketKey: string, lineupMap: Record<string, LineupPlayer>, stats: Record<number, any>, search: string): PlayerRow[] {
  const playerMap: Record<string, Record<string, { over?: number; point?: number }>> = {}

  game.bookmakers?.forEach((bookmaker) => {
    if (!PROP_BOOK_KEYS.includes(bookmaker.key)) return
    bookmaker.markets?.forEach((market) => {
      if (market.key !== marketKey) return
      market.outcomes?.forEach((outcome) => {
        if (!outcome.description || outcome.name !== 'Over') return
        if (typeof outcome.price !== 'number' || outcome.price > 700 || outcome.price < -10000) return
        playerMap[outcome.description] ||= {}
        playerMap[outcome.description][bookmaker.key] = {
          over: outcome.price,
          point: outcome.point,
        }
      })
    })
  })

  return Object.keys(playerMap)
    .filter((player) => !search || player.toLowerCase().includes(search.toLowerCase()))
    .map((player) => {
      const bookData = playerMap[player]
      const line = getDisplayLine(bookData, PROP_BOOK_KEYS)
      const best = getBestOverAtLine(bookData, PROP_BOOK_KEYS, line)
      const lineup = findLineupPlayer(lineupMap, player)
      return {
        player,
        line,
        bestOdds: best?.odds,
        bestBook: best?.book,
        stats: lineup ? stats[lineup.id] : undefined,
      }
    })
    .filter((row) => row.line || row.bestOdds)
}

function upcomingGames(games: Game[]) {
  const now = Date.now()
  return games
    .filter((game) => new Date(game.commence_time).getTime() > now)
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
}

function gameId(game: Game) {
  return String(game.game_id || game.id || `${game.away_team}-${game.home_team}-${game.commence_time}`)
}

export function MLBPropsTable({ games }: { games: Game[] }) {
  const [marketKey, setMarketKey] = useState('batter_hits')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('edge')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [selectedMarketContext, setSelectedMarketContext] = useState<PlayerProfileMarketContext | null>(null)
  const [selectedGame, setSelectedGame] = useState('all')
  const market = ALL_MARKETS.find((item) => item.key === marketKey) || ALL_MARKETS[0]
  const gameOptions = upcomingGames(games)
  const activeGameFilter = selectedGame === 'all' || gameOptions.some((game) => gameId(game) === selectedGame)
    ? selectedGame
    : 'all'
  const filteredGames = activeGameFilter === 'all'
    ? gameOptions
    : gameOptions.filter((game) => gameId(game) === activeGameFilter)

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(nextKey)
      setSortDir(nextKey === 'player' || nextKey === 'book' ? 'asc' : 'desc')
    }
  }

  function sortValue(row: PlayerRow, key: SortKey) {
    const season = row.stats?.[`season_${market.statField}`] || 0
    const l20 = row.stats?.[`l20_${market.statField}`] || 0
    const l10 = row.stats?.[`l10_${market.statField}`] || 0
    const l5 = row.stats?.[`l5_${market.statField}`] || 0
    const edge = edgeLabel(row.line, season, l10, l5, row.bestOdds, marketKey === 'batter_home_runs')

    if (key === 'player') return row.player
    if (key === 'line') return row.line
    if (key === 'season') return season
    if (key === 'l20') return l20
    if (key === 'l10') return l10
    if (key === 'l5') return l5
    if (key === 'l20hit') return hitRateValue(row.stats, market.statField, row.line, 20)
    if (key === 'l10hit') return hitRateValue(row.stats, market.statField, row.line, 10)
    if (key === 'l5hit') return hitRateValue(row.stats, market.statField, row.line, 5)
    if (key === 'best') return row.bestOdds || -100000
    if (key === 'book') return row.bestBook || ''
    return edge.score
  }

  function sortRows(rows: PlayerRow[]) {
    return [...rows].sort((a, b) => {
      const aValue = sortValue(a, sortKey)
      const bValue = sortValue(b, sortKey)
      const direction = sortDir === 'asc' ? 1 : -1

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        return String(aValue).localeCompare(String(bValue)) * direction
      }
      return ((aValue || 0) - (bValue || 0)) * direction
    })
  }

  const lineupsQuery = useQuery({
    queryKey: ['mlb-lineups'],
    queryFn: () => kingfishFetch<{ players: Record<string, LineupPlayer> }>('/api/mlb-lineups'),
    staleTime: 12 * 60 * 60 * 1000,
  })

  const playersToFetch = useMemo(() => {
    const lineupMap = lineupsQuery.data?.players || {}
    const seen = new Set<number>()
    const batters: LineupPlayer[] = []
    const pitchers: LineupPlayer[] = []

    filteredGames.forEach((game) => {
      game.bookmakers?.forEach((bookmaker) => {
        bookmaker.markets?.forEach((m) => {
          if (m.key !== marketKey) return
          m.outcomes?.forEach((outcome) => {
            if (!outcome.description) return
            const lineup = findLineupPlayer(lineupMap, outcome.description)
            if (!lineup || seen.has(lineup.id)) return
            seen.add(lineup.id)
            if (market.isPitcher) pitchers.push(lineup)
            else batters.push(lineup)
          })
        })
      })
    })

    return { batters, pitchers }
  }, [filteredGames, lineupsQuery.data?.players, market.isPitcher, marketKey])

  const statsQuery = useQuery({
    queryKey: ['mlb-stats', marketKey, playersToFetch.batters.map((item) => item.id).join(','), playersToFetch.pitchers.map((item) => item.id).join(',')],
    queryFn: () => fetchMlbStatsInBatches(playersToFetch.batters, playersToFetch.pitchers),
    enabled: !!lineupsQuery.data && (playersToFetch.batters.length > 0 || playersToFetch.pitchers.length > 0),
    staleTime: 12 * 60 * 60 * 1000,
  })

  const lineupMap = lineupsQuery.data?.players || {}
  const stats = statsQuery.data || {}

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marketRail}>
        {ALL_MARKETS.map((item) => (
          <MarketButton key={item.key} active={marketKey === item.key} label={item.label} onPress={() => setMarketKey(item.key)} />
        ))}
      </ScrollView>

      <View style={styles.searchRow}>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          blurOnSubmit
          placeholder="Search player..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => Keyboard.dismiss()}
          style={styles.search}
        />
      </View>
      {search ? <AppText onPress={() => setSearch('')} style={styles.clearText}>Clear search</AppText> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gameFilterRow}>
        <Pressable
          onPress={() => setSelectedGame('all')}
          style={[styles.gameFilterButton, activeGameFilter === 'all' && styles.gameFilterButtonActive]}
        >
          <AppText style={[styles.gameFilterText, activeGameFilter === 'all' && styles.gameFilterTextActive]}>All Games</AppText>
        </Pressable>
        {gameOptions.map((game) => {
          const id = gameId(game)
          const awayShort = game.away_team.split(' ').pop()
          const homeShort = game.home_team.split(' ').pop()
          return (
            <Pressable
              key={id}
              onPress={() => setSelectedGame(id)}
              style={[styles.gameFilterButton, activeGameFilter === id && styles.gameFilterButtonActive]}
            >
              <AppText style={[styles.gameFilterText, activeGameFilter === id && styles.gameFilterTextActive]}>
                {awayShort} @ {homeShort}
              </AppText>
            </Pressable>
          )
        })}
      </ScrollView>

      {(lineupsQuery.isLoading || statsQuery.isLoading) && (
        <AppText variant="muted" style={styles.loading}>Loading stat columns...</AppText>
      )}

      {filteredGames.map((game) => {
        const rows = sortRows(buildRows(game, marketKey, lineupMap, stats, search))
        if (rows.length === 0) return null
        const awayShort = game.away_team.split(' ').pop()
        const homeShort = game.home_team.split(' ').pop()

        return (
          <View key={game.game_id || game.id || `${game.away_team}-${game.home_team}`} style={styles.gameBlock}>
            <View style={styles.gameHeader}>
              <AppText style={styles.gameTitle}>{awayShort} @ {homeShort}</AppText>
              <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRail}>
              {[
                { key: 'edge' as SortKey, label: 'Edge' },
                { key: 'l10' as SortKey, label: 'L10' },
                { key: 'l5' as SortKey, label: 'L5' },
              ].map((item) => (
                <Pressable key={item.key} onPress={() => toggleSort(item.key)} style={[styles.sortChip, sortKey === item.key && styles.sortChipActive]}>
                  <AppText style={[styles.sortChipText, sortKey === item.key && styles.sortChipTextActive]}>
                    {item.label}{sortKey === item.key ? (sortDir === 'desc' ? ' v' : ' ^') : ''}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.compactHeader}>
              <AppText variant="eyebrow" style={[styles.compactCell, styles.playerColumn]}>Player</AppText>
              <AppText variant="eyebrow" style={styles.compactCell}>Line</AppText>
              <AppText variant="eyebrow" style={styles.compactCell}>L10</AppText>
              <AppText variant="eyebrow" style={[styles.compactCell, styles.edgeColumn]}>Edge</AppText>
            </View>
            {rows.map((row) => {
              const season = row.stats?.[`season_${market.statField}`] || 0
              const l10 = row.stats?.[`l10_${market.statField}`] || 0
              const l5 = row.stats?.[`l5_${market.statField}`] || 0
              const edge = edgeLabel(row.line, season, l10, l5, row.bestOdds, marketKey === 'batter_home_runs')
              return (
                <Pressable
                  key={row.player}
                  onPress={() => {
                    setSelectedPlayer(row.player)
                    setSelectedMarketContext({
                      marketKey,
                      marketLabel: market.label,
                      commonLine: row.line,
                    })
                  }}
                  style={styles.playerRow}
                >
                  <View style={[styles.compactCell, styles.playerColumn]}>
                    <AppText style={styles.playerName} numberOfLines={2}>{row.player}</AppText>
                    <AppText variant="mono" style={styles.bookName} numberOfLines={1}>
                      {row.bestOdds ? `${fmtOdds(row.bestOdds)} ${row.bestBook ? BOOK_DISPLAY_NAMES[row.bestBook] || row.bestBook : ''}` : '-'}
                    </AppText>
                  </View>
                  <View style={styles.compactCell}>
                    <AppText style={styles.lineValue}>{row.line || '-'}</AppText>
                    <AppText variant="mono" style={styles.marketName} numberOfLines={1}>{market.label}</AppText>
                  </View>
                  <View style={styles.compactCell}>
                    <AppText style={[styles.statValue, { color: statColor(l10, row.line) }]}>{fmtRate(l10)}</AppText>
                    <AppText variant="mono" style={styles.marketName}>{hitRate(row.stats, market.statField, row.line, 5)}</AppText>
                  </View>
                  <View style={[styles.compactCell, styles.edgeColumn]}>
                    <AppText style={[styles.edgeScore, { color: edge.color }]}>{edge.score ? Math.round(edge.score) : '-'}</AppText>
                    <AppText style={[styles.edgeLabel, { color: edge.color }]}>{edge.label}</AppText>
                  </View>
                </Pressable>
              )
            })}
          </View>
        )
      })}
      <PlayerProfileModal
        playerName={selectedPlayer}
        sport="mlb"
        marketContext={selectedMarketContext}
        onClose={() => {
          setSelectedPlayer(null)
          setSelectedMarketContext(null)
        }}
      />
    </View>
  )
}

function MarketButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <AppText onPress={onPress} style={[styles.marketButton, active && styles.marketButtonActive, active && styles.marketButtonTextActive]}>
      {label}
    </AppText>
  )
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  marketRail: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  marketButton: {
    minWidth: 96,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  marketButtonActive: {
    backgroundColor: colors.gold,
  },
  marketButtonTextActive: {
    color: colors.bgPrimary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  search: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  gameFilterRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  gameFilterButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  gameFilterButtonActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.16)',
  },
  gameFilterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  gameFilterTextActive: {
    color: colors.gold,
  },
  clearText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
  },
  loading: {
    marginTop: spacing.sm,
  },
  gameBlock: {
    marginTop: spacing.lg,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gameTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: 14,
    textTransform: 'uppercase',
    color: colors.gold,
    fontWeight: '900',
  },
  sortedCell: {
    color: colors.gold,
  },
  sortRail: {
    gap: spacing.sm,
    paddingRight: spacing.md,
    marginBottom: spacing.sm,
  },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.bgCard,
  },
  sortChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.16)',
  },
  sortChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  sortChipTextActive: {
    color: colors.gold,
  },
  compactHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  compactCell: {
    width: 72,
    paddingRight: spacing.sm,
  },
  playerColumn: {
    flex: 1,
    minWidth: 0,
  },
  edgeColumn: {
    width: 70,
    alignItems: 'flex-end',
    paddingRight: 0,
  },
  lineValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  marketName: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 10,
  },
  edgeScore: {
    fontSize: 22,
    fontWeight: '900',
  },
  edgeLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '900',
  },
  bookName: {
    marginTop: 4,
    color: colors.textSecondary,
  },
})
