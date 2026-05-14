import { useEffect, useMemo, useState } from 'react'
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { PlayerProfileModal, type PlayerProfileMarketContext } from '@/components/dashboard/PlayerProfileModal'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { fmtOdds, fmtTime, normalizeName } from '@/lib/format'
import { getBestOverAtLine, getDisplayLine } from '@/lib/propLines'
import { displayBookName, PROP_BOOK_KEYS } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, Market, Outcome, Sport } from '@/types'

const MARKET_LABELS: Record<string, string> = {
  batter_hits: 'Hits',
  batter_runs_scored: 'Runs',
  batter_rbis: 'RBI',
  batter_hits_runs_rbis: 'H+R+RBI',
  batter_total_bases: 'Total Bases',
  batter_home_runs: 'Home Runs',
  batter_singles: 'Singles',
  batter_doubles: 'Doubles',
  batter_walks: 'Walks',
  batter_stolen_bases: 'Stolen Bases',
  pitcher_strikeouts: 'Strikeouts',
  pitcher_hits_allowed: 'Hits Allowed',
  pitcher_earned_runs: 'Earned Runs',
  pitcher_walks: 'Walks Allowed',
  pitcher_outs: 'Outs Recorded',
  player_points: 'Points',
  player_rebounds: 'Rebounds',
  player_assists: 'Assists',
  player_threes: 'Threes',
  player_blocks: 'Blocks',
  player_steals: 'Steals',
  player_points_rebounds_assists: 'Pts + Reb + Ast',
  player_points_rebounds: 'Pts + Reb',
  player_points_assists: 'Pts + Ast',
  player_rebounds_assists: 'Reb + Ast',
  player_goal_scorer_anytime: 'Anytime Goal',
  player_shots_on_goal: 'Shots on Goal',
  player_blocked_shots: 'Blocked Shots',
  player_power_play_points: 'Power Play Points',
  player_pass_yds: 'Pass Yards',
  player_pass_tds: 'Pass TDs',
  player_pass_attempts: 'Pass Attempts',
  player_pass_completions: 'Completions',
  player_pass_interceptions: 'Interceptions',
  player_pass_rush_yds: 'Pass+Rush Yds',
  player_pass_rush_reception_tds: 'Pass+Rush+Rec TD',
  player_pass_rush_reception_yds: 'Pass+Rush+Rec Yds',
  player_rush_yds: 'Rush Yards',
  player_rush_attempts: 'Rush Attempts',
  player_rush_tds: 'Rush TDs',
  player_rush_reception_tds: 'Rush+Rec TD',
  player_rush_reception_yds: 'Rush+Rec Yds',
  player_receptions: 'Receptions',
  player_reception_yds: 'Rec Yards',
  player_reception_tds: 'Rec TDs',
  player_anytime_td: 'Anytime TD',
  player_tds_over: 'TDs Over',
  player_1st_td: '1st TD',
  player_last_td: 'Last TD',
  player_field_goals: 'Field Goals',
  player_kicking_points: 'Kicking Points',
  player_pats: 'PATs',
  player_defensive_interceptions: 'Def INTs',
  player_sacks: 'Sacks',
  player_solo_tackles: 'Solo Tackles',
  player_tackles_assists: 'Tackles+Ast',
}

const BASKETBALL_MARKETS = [
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_blocks',
  'player_steals',
  'player_points_rebounds_assists',
  'player_points_rebounds',
  'player_points_assists',
  'player_rebounds_assists',
]

const NHL_MARKETS = [
  'player_goal_scorer_anytime',
  'player_assists',
  'player_points',
  'player_shots_on_goal',
  'player_blocked_shots',
  'player_power_play_points',
]

const NFL_MARKETS = [
  'player_anytime_td',
  'player_tds_over',
  'player_1st_td',
  'player_last_td',
  'player_pass_yds',
  'player_pass_tds',
  'player_pass_attempts',
  'player_pass_completions',
  'player_pass_interceptions',
  'player_pass_rush_yds',
  'player_pass_rush_reception_yds',
  'player_pass_rush_reception_tds',
  'player_rush_yds',
  'player_rush_attempts',
  'player_rush_tds',
  'player_rush_reception_yds',
  'player_rush_reception_tds',
  'player_receptions',
  'player_reception_yds',
  'player_reception_tds',
  'player_field_goals',
  'player_kicking_points',
  'player_pats',
  'player_assists',
  'player_defensive_interceptions',
  'player_sacks',
  'player_solo_tackles',
  'player_tackles_assists',
  'player_pass_yds_alternate',
  'player_pass_tds_alternate',
  'player_pass_attempts_alternate',
  'player_pass_completions_alternate',
  'player_pass_interceptions_alternate',
  'player_pass_rush_yds_alternate',
  'player_pass_rush_reception_yds_alternate',
  'player_pass_rush_reception_tds_alternate',
  'player_rush_yds_alternate',
  'player_rush_attempts_alternate',
  'player_rush_tds_alternate',
  'player_rush_reception_yds_alternate',
  'player_rush_reception_tds_alternate',
  'player_receptions_alternate',
  'player_reception_yds_alternate',
  'player_reception_tds_alternate',
  'player_field_goals_alternate',
  'player_kicking_points_alternate',
  'player_pats_alternate',
  'player_assists_alternate',
  'player_sacks_alternate',
  'player_solo_tackles_alternate',
  'player_tackles_assists_alternate',
]

type NflMarketGroup = 'passing' | 'rushing' | 'receiving' | 'touchdowns' | 'kicking' | 'defense'

const NFL_MARKET_GROUPS: Array<{ key: NflMarketGroup; label: string }> = [
  { key: 'passing', label: 'Passing' },
  { key: 'rushing', label: 'Rushing' },
  { key: 'receiving', label: 'Receiving' },
  { key: 'touchdowns', label: 'TDs' },
  { key: 'kicking', label: 'Kicking' },
  { key: 'defense', label: 'Defense' },
]

const NFL_MARKET_GROUP_BY_BASE: Record<string, NflMarketGroup> = {
  player_pass_yds: 'passing',
  player_pass_tds: 'passing',
  player_pass_attempts: 'passing',
  player_pass_completions: 'passing',
  player_pass_interceptions: 'passing',
  player_pass_rush_yds: 'rushing',
  player_pass_rush_reception_yds: 'rushing',
  player_pass_rush_reception_tds: 'rushing',
  player_rush_yds: 'rushing',
  player_rush_attempts: 'rushing',
  player_rush_tds: 'rushing',
  player_rush_reception_yds: 'rushing',
  player_rush_reception_tds: 'rushing',
  player_receptions: 'receiving',
  player_reception_yds: 'receiving',
  player_reception_tds: 'receiving',
  player_tds_over: 'touchdowns',
  player_1st_td: 'touchdowns',
  player_anytime_td: 'touchdowns',
  player_last_td: 'touchdowns',
  player_field_goals: 'kicking',
  player_kicking_points: 'kicking',
  player_pats: 'kicking',
  player_assists: 'defense',
  player_defensive_interceptions: 'defense',
  player_sacks: 'defense',
  player_solo_tackles: 'defense',
  player_tackles_assists: 'defense',
}

const NFL_TD_MARKETS = new Set(['player_anytime_td', 'player_1st_td', 'player_last_td', 'player_tds_over'])

interface FlattenedProp {
  game: Game
  market: Market
  outcome: Outcome
  book: string
}

type PlayerBookData = Record<string, { over?: number; point?: number }>

type SortKey = 'player' | 'line' | 'season' | 'l10' | 'l5' | 'l10hit' | 'best' | 'book' | 'edge'
type SortDir = 'asc' | 'desc'

const STAT_KEY_BY_MARKET: Record<string, string | string[]> = {
  player_points: 'pts',
  player_rebounds: 'reb',
  player_assists: 'ast',
  player_threes: 'fg3m',
  player_blocks: 'blk',
  player_steals: 'stl',
  player_points_rebounds_assists: ['pts', 'reb', 'ast'],
  player_points_rebounds: ['pts', 'reb'],
  player_points_assists: ['pts', 'ast'],
  player_rebounds_assists: ['reb', 'ast'],
  player_goal_scorer_anytime: 'goals',
  player_shots_on_goal: 'shots',
  player_blocked_shots: 'blk',
  player_power_play_points: 'ppp',
  player_pass_yds: 'passing_yards_per_game',
  player_pass_tds: 'passing_tds_per_game',
  player_pass_attempts: 'passing_attempts_per_game',
  player_pass_completions: 'completions_per_game',
  player_pass_interceptions: 'interceptions_per_game',
  player_pass_rush_yds: 'pass_rush_yards_per_game',
  player_pass_rush_reception_tds: 'pass_rush_reception_tds_per_game',
  player_pass_rush_reception_yds: 'pass_rush_reception_yards_per_game',
  player_rush_yds: 'rushing_yards_per_game',
  player_rush_attempts: 'carries_per_game',
  player_rush_tds: 'rushing_tds_per_game',
  player_rush_reception_tds: 'rush_reception_tds_per_game',
  player_rush_reception_yds: 'rush_reception_yards_per_game',
  player_receptions: 'receptions_per_game',
  player_reception_yds: 'receiving_yards_per_game',
  player_reception_tds: 'receiving_tds_per_game',
  player_anytime_td: 'total_tds_per_game',
  player_tds_over: 'total_tds_per_game',
  player_1st_td: 'total_tds_per_game',
  player_last_td: 'total_tds_per_game',
  player_field_goals: 'field_goals_made_per_game',
  player_kicking_points: 'kicking_points_per_game',
  player_pats: 'extra_points_made_per_game',
  player_defensive_interceptions: 'def_interceptions_per_game',
  player_sacks: 'def_sacks_per_game',
  player_solo_tackles: 'def_tackles_solo_per_game',
  player_tackles_assists: 'def_tackles_assists_per_game',
}

function baseMarketKey(marketKey: string) {
  return marketKey.replace(/_alternate$/, '')
}

function isAlternateMarket(marketKey: string) {
  return marketKey.endsWith('_alternate')
}

function isNflTouchdownMarket(marketKey: string) {
  return NFL_TD_MARKETS.has(baseMarketKey(marketKey))
}

function nflMarketGroup(marketKey: string) {
  return NFL_MARKET_GROUP_BY_BASE[baseMarketKey(marketKey)] || 'passing'
}

function standardMarketLabel(marketKey: string) {
  const label = marketLabel(marketKey)
  return isAlternateMarket(marketKey) ? label.replace(/^Alt\s+/, '') : label
}

const NFL_MARKET_LABELS: Record<string, string> = {
  player_assists: 'Tackle Assists',
  player_assists_alternate: 'Alt Tackle Assists',
}

function marketLabel(marketKey: string) {
  if (NFL_MARKET_LABELS[marketKey]) return NFL_MARKET_LABELS[marketKey]
  if (MARKET_LABELS[marketKey]) return MARKET_LABELS[marketKey]
  const baseLabel = MARKET_LABELS[baseMarketKey(marketKey)]
  if (baseLabel && marketKey.endsWith('_alternate')) return `Alt ${baseLabel}`
  return marketKey.replaceAll('_', ' ')
}

function getStat(stats: Record<string, any> | undefined, marketKey: string, prefix: 'season' | 'l10' | 'l5') {
  if (!stats) return 0
  const statKey = (baseMarketKey(marketKey) === 'player_assists' && stats.def_tackle_assists_per_game !== undefined)
    ? 'def_tackle_assists_per_game'
    : STAT_KEY_BY_MARKET[marketKey] || STAT_KEY_BY_MARKET[baseMarketKey(marketKey)]
  if (!statKey) return 0
  if (Array.isArray(statKey)) {
    return statKey.reduce((total, key) => total + (stats[`${prefix}_${key}`] || 0), 0)
  }
  if (prefix === 'season' && typeof stats[statKey] === 'number') return stats[statKey]
  return stats[`${prefix}_${statKey}`] || 0
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

function recentValues(stats: Record<string, any> | undefined, marketKey: string, count: 5 | 10) {
  if (!stats) return []
  const statKey = (baseMarketKey(marketKey) === 'player_assists' && stats.def_tackle_assists_per_game !== undefined)
    ? 'def_tackle_assists_per_game'
    : STAT_KEY_BY_MARKET[marketKey] || STAT_KEY_BY_MARKET[baseMarketKey(marketKey)]
  if (!statKey) return []

  if (Array.isArray(stats.raw_games)) {
    const keys = Array.isArray(statKey) ? statKey : [statKey]
    return stats.raw_games.slice(0, count).map((game: Record<string, any>) =>
      keys.reduce((total, key) => total + (Number(game[key]) || 0), 0)
    )
  }

  if (Array.isArray(statKey)) {
    const arrays = statKey
      .map((key) => stats[`raw${count}_${key}`])
      .filter((value) => Array.isArray(value))
    const length = Math.min(...arrays.map((value) => value.length))
    if (!Number.isFinite(length) || length <= 0) return []
    return Array.from({ length }, (_, index) =>
      arrays.reduce((total, value) => total + (Number(value[index]) || 0), 0)
    )
  }

  const values = stats[`raw${count}_${statKey}`]
  return Array.isArray(values) ? values.map((value) => Number(value) || 0) : []
}

function hitRate(values: number[], line: number) {
  if (values.length === 0) return null
  return values.filter((value) => value > line).length / values.length
}

function hitRateLabel(rate: number | null) {
  if (rate === null) return '-'
  return `${Math.round(rate * 100)}%`
}

function edgeLabel(
  line: number,
  season: number,
  l10: number,
  l5: number,
  odds: number | undefined,
  stats: Record<string, any> | undefined,
  marketKey: string
) {
  if (!season) return { label: 'No Stats', color: colors.textMuted, score: 0 }
  const safeLine = Math.max(line || 0, 0.5)
  const seasonRatio = season / safeLine
  const l10Ratio = (l10 || season) / safeLine
  const l5Ratio = (l5 || season) / safeLine
  const composite = seasonRatio * 0.5 + l10Ratio * 0.3 + l5Ratio * 0.2
  const implied = odds && odds > 0 ? 100 / (odds + 100) : odds ? Math.abs(odds) / (Math.abs(odds) + 100) : 0.5
  const l10Hit = hitRate(recentValues(stats, marketKey, 10), safeLine)
  const l5Hit = hitRate(recentValues(stats, marketKey, 5), safeLine)
  const avgScore = clamp((composite - 0.82) / 0.55) * 35
  const l10Score = (l10Hit ?? clamp((l10Ratio - 0.75) / 0.55)) * 25
  const l5Score = (l5Hit ?? clamp((l5Ratio - 0.75) / 0.55)) * 20
  const priceScore = implied <= 0.52 ? 12 : implied <= 0.58 ? 9 : implied <= 0.65 ? 5 : implied <= 0.72 ? 2 : 0
  const trendScore = l5 >= l10 && l10 >= season * 0.92 ? 8 : l5 >= l10 ? 4 : 0
  const score = Math.round(avgScore + l10Score + l5Score + priceScore + trendScore)

  if (score >= 75) return { label: `Strong ${score}`, color: colors.gold, score }
  if (score >= 62) return { label: `Lean ${score}`, color: colors.green, score }
  if (score >= 45) return { label: `Neutral ${score}`, color: colors.textSecondary, score }
  return { label: `Fade ${score}`, color: colors.red, score }
}

function implied(price: number) {
  return price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100)
}

function nflEdgeLabel(line: number, stat: number, odds: number | undefined, marketKey: string) {
  const base = baseMarketKey(marketKey)
  const anytime = isNflTouchdownMarket(base)
  const lowerIsBetter = base === 'player_pass_interceptions'
  if (!stat && !anytime) return { label: 'N/A', color: colors.textMuted, score: 0 }

  if (anytime) {
    const priceBoost = odds && odds > 0 ? Math.min(22, odds / 35) : 0
    const tdScore = Math.max(0, Math.min(70, (stat / 0.75) * 70))
    const score = Math.round(tdScore + priceBoost)
    if (score >= 78) return { label: 'Strong', color: colors.gold, score }
    if (score >= 62) return { label: 'Lean', color: colors.green, score }
    if (score >= 45) return { label: 'Neutral', color: colors.textSecondary, score }
    return { label: 'Fade', color: colors.red, score }
  }

  const safeLine = Math.max(line, 0.5)
  const ratio = lowerIsBetter ? safeLine / Math.max(stat, 0.1) : stat / safeLine
  const pricePenalty = odds && implied(odds) > 0.68 ? 10 : odds && implied(odds) > 0.6 ? 5 : 0
  const score = Math.round(Math.max(0, Math.min(100, ((ratio - 0.72) / 0.58) * 82 + 14 - pricePenalty)))
  if (score >= 78) return { label: 'Strong', color: colors.gold, score }
  if (score >= 62) return { label: 'Lean', color: colors.green, score }
  if (score >= 45) return { label: 'Neutral', color: colors.textSecondary, score }
  return { label: 'Fade', color: colors.red, score }
}

function statColor(value: number, line: number) {
  if (!value) return colors.textMuted
  if (value > line * 1.15) return colors.green
  if (value >= line) return colors.yellow
  return colors.red
}

function fmtStat(value: number) {
  return value ? value.toFixed(1) : '-'
}

function sportParam(sport: Sport): 'nba' | 'nfl' | 'nhl' | 'wnba' {
  return sport.toLowerCase() as 'nba' | 'nfl' | 'nhl' | 'wnba'
}

function marketKeysForSport(sport: Sport) {
  if (sport === 'NFL') return NFL_MARKETS
  if (sport === 'NHL') return NHL_MARKETS
  if (sport === 'NBA' || sport === 'WNBA') return BASKETBALL_MARKETS
  return []
}

function availableMarkets(games: Game[], sport: Sport) {
  const available = new Set<string>()
  games.forEach((game) => {
    game.bookmakers?.forEach((bookmaker) => {
      if (!PROP_BOOK_KEYS.includes(bookmaker.key)) return
      bookmaker.markets?.forEach((market) => {
          if (market.outcomes?.some((outcome) => {
            const isTouchdown = sport === 'NFL' && isNflTouchdownMarket(market.key)
            return isTouchdown ? Boolean(outcome.description || outcome.name) : Boolean(outcome.description && (outcome.name === 'Over' || outcome.name === 'Yes'))
          })) {
            available.add(market.key)
          }
        })
    })
  })

  return marketKeysForSport(sport).filter((marketKey) => available.has(marketKey))
}

function upcomingGames(games: Game[]) {
  const now = Date.now()
  return games
    .filter((game) => new Date(game.commence_time).getTime() > now)
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
}

export function flattenProps(games: Game[], limit?: number, marketKey?: string): FlattenedProp[] {
  const propMap = new Map<string, FlattenedProp>()

  for (const game of upcomingGames(games)) {
    const players = new Map<string, { market: Market; playerName: string; bookData: PlayerBookData; anytime: Record<string, number>; bookTitles: Record<string, string> }>()

    for (const bookmaker of game.bookmakers || []) {
      if (!PROP_BOOK_KEYS.includes(bookmaker.key)) continue
      for (const market of bookmaker.markets || []) {
        if (marketKey && market.key !== marketKey) continue
        for (const outcome of market.outcomes || []) {
          const isTouchdown = isNflTouchdownMarket(market.key) || market.key === 'player_goal_scorer_anytime'
          const playerName = isTouchdown ? (outcome.description || outcome.name) : outcome.description
          if (!playerName) continue
          if (!isTouchdown && outcome.name !== 'Over' && outcome.name !== 'Yes') continue
          if (typeof outcome.price !== 'number') continue
          if (outcome.price > 700 || outcome.price < -10000) continue

          const playerKey = `${market.key}-${playerName}`
          const entry = players.get(playerKey) || { market, playerName, bookData: {}, anytime: {}, bookTitles: {} }
          entry.bookTitles[bookmaker.key] = bookmaker.title

          if (isTouchdown) {
            entry.anytime[bookmaker.key] = outcome.price
          } else {
            const bookLine = entry.bookData[bookmaker.key] || {}
            bookLine.over = outcome.price
            if (typeof outcome.point === 'number') bookLine.point = outcome.point
            entry.bookData[bookmaker.key] = bookLine
          }
          players.set(playerKey, entry)
        }
      }
    }

    players.forEach((entry) => {
      const isTouchdown = isNflTouchdownMarket(entry.market.key) || entry.market.key === 'player_goal_scorer_anytime'
      if (isTouchdown) {
        const options = PROP_BOOK_KEYS
          .map((book) => ({ book, odds: entry.anytime[book] }))
          .filter((item): item is { book: string; odds: number } => typeof item.odds === 'number')
        if (!options.length) return
        const best = options.reduce((current, item) => (item.odds > current.odds ? item : current))
        propMap.set(`${game.game_id || game.id}-${entry.market.key}-${entry.playerName}`, {
          game,
          market: entry.market,
          outcome: { name: 'Yes', description: entry.playerName, price: best.odds, point: 0.5 },
          book: displayBookName(best.book, entry.bookTitles[best.book]),
        })
        return
      }

      const line = getDisplayLine(entry.bookData, PROP_BOOK_KEYS)
      const best = getBestOverAtLine(entry.bookData, PROP_BOOK_KEYS, line)
      if (!best) return
      propMap.set(`${game.game_id || game.id}-${entry.market.key}-${entry.playerName}`, {
        game,
        market: entry.market,
        outcome: { name: 'Over', description: entry.playerName, price: best.odds, point: line },
        book: displayBookName(best.book, entry.bookTitles[best.book]),
      })
    })
  }

  const props = Array.from(propMap.values())
  return typeof limit === 'number' ? props.slice(0, limit) : props
}

export function PropsList({ games, sport, limit, initialStats }: { games: Game[]; sport: Sport; limit?: number; initialStats?: Record<string, any> }) {
  const availableMarketKeys = useMemo(() => availableMarkets(games, sport), [games, sport])
  const markets = useMemo(() => {
    if (availableMarketKeys.length || sport !== 'NFL') return availableMarketKeys
    return NFL_MARKETS.filter((marketKey) => !isAlternateMarket(marketKey))
  }, [availableMarketKeys, sport])
  const [activeMarket, setActiveMarket] = useState(markets[0])
  const [nflGroup, setNflGroup] = useState<NflMarketGroup>('passing')
  const [sortKey, setSortKey] = useState<SortKey>('edge')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [selectedMarketContext, setSelectedMarketContext] = useState<PlayerProfileMarketContext | null>(null)
  const [selectedGame, setSelectedGame] = useState('all')
  const [search, setSearch] = useState('')
  const availableNflGroups = useMemo(() => (
    NFL_MARKET_GROUPS.filter((group) =>
      markets.some((marketKey) => !isAlternateMarket(marketKey) && nflMarketGroup(marketKey) === group.key)
    )
  ), [markets])
  const activeNflGroup = availableNflGroups.some((group) => group.key === nflGroup)
    ? nflGroup
    : availableNflGroups[0]?.key || nflGroup
  const visibleMarkets = useMemo(() => {
    if (sport !== 'NFL') return markets
    return markets.filter((marketKey) => !isAlternateMarket(marketKey) && nflMarketGroup(marketKey) === activeNflGroup)
  }, [markets, activeNflGroup, sport])
  const selectedMarket = markets.includes(activeMarket) ? activeMarket : visibleMarkets[0] || markets[0]
  const selectedBaseMarket = selectedMarket ? baseMarketKey(selectedMarket) : ''
  const selectedAltMarket = sport === 'NFL' && availableMarketKeys.length
    ? availableMarketKeys.find((marketKey) => marketKey === `${selectedBaseMarket}_alternate`)
    : undefined
  const gameOptions = upcomingGames(games)
  const activeGameFilter = selectedGame === 'all' || gameOptions.some((game) => String(game.game_id || game.id) === selectedGame)
    ? selectedGame
    : 'all'
  const allProps = flattenProps(
    activeGameFilter === 'all'
      ? games
      : games.filter((game) => String(game.game_id || game.id) === activeGameFilter),
    limit,
    selectedMarket
  )
  const props = allProps.filter((prop) => !search || String(prop.outcome.description || '').toLowerCase().includes(search.toLowerCase()))
  const playerNames = [...new Set(props.map((prop) => prop.outcome.description).filter(Boolean))]
  const propsByGame = gameOptions
    .filter((game) => activeGameFilter === 'all' || String(game.game_id || game.id) === activeGameFilter)
    .map((game) => ({
      game,
      props: props.filter((prop) => (prop.game.game_id || prop.game.id) === (game.game_id || game.id)),
    }))
    .filter((group) => group.props.length > 0)

  useEffect(() => {
    const nextMarket = sport === 'NFL' ? visibleMarkets[0] : markets[0]
    if (nextMarket) setActiveMarket(nextMarket)
  }, [markets[0], sport, visibleMarkets[0]])

  const statsQuery = useQuery({
    queryKey: ['prop-stats', sport, selectedMarket, playerNames.join('|')],
    queryFn: async () => {
      if (sport === 'NFL') {
        const data = await kingfishFetch<{ players?: Record<string, any>[] }>('/data/nfl/player-fantasy-summary.json')
        const stats: Record<string, any> = {}
        ;(data.players || []).forEach((player) => {
          stats[normalizeName(player.player_name)] = player
        })
        return { stats }
      }
      return kingfishFetch<{ stats: Record<string, any> }>(`/api/${sport.toLowerCase()}-stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames }),
      })
    },
    enabled: sport !== 'MLB' && playerNames.length > 0 && !initialStats,
    staleTime: 12 * 60 * 60 * 1000,
  })
  const statsByPlayer = initialStats || statsQuery.data?.stats || {}

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(nextKey)
      setSortDir(nextKey === 'player' || nextKey === 'book' ? 'asc' : 'desc')
    }
  }

  function sortProps(gameProps: FlattenedProp[]) {
    return [...gameProps].sort((a, b) => {
      const aStats = statsByPlayer[normalizeName(a.outcome.description || '')]
      const bStats = statsByPlayer[normalizeName(b.outcome.description || '')]
      const aValue = sortValue(a, aStats, sortKey, sport)
      const bValue = sortValue(b, bStats, sortKey, sport)
      const direction = sortDir === 'asc' ? 1 : -1

      if (typeof aValue === 'string' || typeof bValue === 'string') {
        return String(aValue).localeCompare(String(bValue)) * direction
      }
      return ((aValue || 0) - (bValue || 0)) * direction
    })
  }

  return (
    <View style={styles.list}>
      <AppText variant="eyebrow">Prop Type</AppText>
      {sport === 'NFL' && (
        <View style={styles.marketGroupGrid}>
          {availableNflGroups.map((group) => (
            <Pressable
              key={group.key}
              onPress={() => setNflGroup(group.key)}
              style={[styles.marketGroupButton, activeNflGroup === group.key && styles.marketGroupButtonActive]}
            >
              <AppText style={[styles.marketGroupText, activeNflGroup === group.key && styles.marketGroupTextActive]}>
                {group.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={styles.marketGrid}>
        {visibleMarkets.map((marketKey) => (
          <Pressable
            key={marketKey}
            onPress={() => setActiveMarket(marketKey)}
            style={[styles.marketButton, selectedBaseMarket === marketKey && styles.marketButtonActive]}
          >
            <AppText style={[styles.marketText, selectedBaseMarket === marketKey && styles.marketTextActive]}>
              {standardMarketLabel(marketKey)}
            </AppText>
          </Pressable>
        ))}
      </View>
      {sport === 'NFL' && selectedAltMarket && (
        <View style={styles.variantRow}>
          <Pressable
            onPress={() => setActiveMarket(selectedBaseMarket)}
            style={[styles.variantButton, !isAlternateMarket(selectedMarket) && styles.variantButtonActive]}
          >
            <AppText style={[styles.variantText, !isAlternateMarket(selectedMarket) && styles.variantTextActive]}>
              Standard
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setActiveMarket(selectedAltMarket)}
            style={[styles.variantButton, isAlternateMarket(selectedMarket) && styles.variantButtonActive]}
          >
            <AppText style={[styles.variantText, isAlternateMarket(selectedMarket) && styles.variantTextActive]}>
              {marketLabel(selectedAltMarket)}
            </AppText>
          </Pressable>
        </View>
      )}

      <View style={styles.filterStack}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search player..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gameFilterRow}>
          <Pressable
            onPress={() => setSelectedGame('all')}
            style={[styles.gameFilterButton, activeGameFilter === 'all' && styles.gameFilterButtonActive]}
          >
            <AppText style={[styles.gameFilterText, activeGameFilter === 'all' && styles.gameFilterTextActive]}>All Games</AppText>
          </Pressable>
          {gameOptions.map((game) => {
            const id = String(game.game_id || game.id)
            return (
              <Pressable
                key={id}
                onPress={() => setSelectedGame(id)}
                style={[styles.gameFilterButton, activeGameFilter === id && styles.gameFilterButtonActive]}
              >
                <AppText style={[styles.gameFilterText, activeGameFilter === id && styles.gameFilterTextActive]}>
                  {game.away_team.split(' ').pop()} @ {game.home_team.split(' ').pop()}
                </AppText>
              </Pressable>
            )
          })}
        </ScrollView>
        {search ? (
          <Pressable onPress={() => { setSearch(''); Keyboard.dismiss() }} style={styles.clearButton}>
            <AppText style={styles.clearButtonText}>Clear Search</AppText>
          </Pressable>
        ) : null}
      </View>

      {statsQuery.isLoading && !initialStats && (
        <Card>
          <AppText variant="eyebrow">// Stats</AppText>
          <AppText variant="muted" style={styles.emptyText}>Loading player stat trends...</AppText>
        </Card>
      )}
      {allProps.length === 0 ? (
        <Card>
          <AppText variant="eyebrow">{sport === 'NFL' ? '// NFL Props' : '// Empty'}</AppText>
          <AppText variant="muted" style={styles.emptyText}>
            {sport === 'NFL'
              ? 'NFL player prop markets will appear here when sportsbooks post them for the selected slate.'
              : 'No player props are available right now.'}
          </AppText>
        </Card>
      ) : props.length === 0 ? (
        <Card>
          <AppText variant="eyebrow">// Empty</AppText>
          <AppText variant="muted" style={styles.emptyText}>No player props match these filters.</AppText>
        </Card>
      ) : null}
      {propsByGame.map(({ game, props: gameProps }) => (
        <View key={game.game_id || game.id || `${game.away_team}-${game.home_team}`} style={styles.gameBlock}>
          <View style={styles.gameHeader}>
            <AppText style={styles.gameTitle}>{game.away_team.split(' ').pop()} @ {game.home_team.split(' ').pop()}</AppText>
            <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHeader}>
                {(sport === 'NFL' ? NFL_TABLE_HEADERS : TABLE_HEADERS).map((header) => (
                  <Pressable key={header.label} onPress={() => header.key !== 'risk' && toggleSort(header.key)}>
                    <AppText variant="eyebrow" style={[styles.cell, header.key === 'player' && styles.playerCell]}>
                      {header.label}{sortKey === header.key ? (sortDir === 'desc' ? ' v' : ' ^') : ''}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {sortProps(gameProps).map((prop) => (
                <PropTableRow
                  key={`${prop.market.key}-${prop.outcome.description}-${prop.outcome.point}-${prop.book}`}
                  prop={prop}
                  stats={statsByPlayer[normalizeName(prop.outcome.description || '')]}
                  sport={sport}
                  onSelectPlayer={(playerName, context) => {
                    setSelectedPlayer(playerName)
                    setSelectedMarketContext(context)
                  }}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
      <PlayerProfileModal
        playerName={selectedPlayer}
        sport={sportParam(sport)}
        marketContext={selectedMarketContext}
        onClose={() => {
          setSelectedPlayer(null)
          setSelectedMarketContext(null)
        }}
      />
    </View>
  )
}

const TABLE_HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: 'player', label: 'Player' },
  { key: 'line', label: 'Line' },
  { key: 'season', label: 'Avg' },
  { key: 'l10', label: 'L10' },
  { key: 'l5', label: 'L5' },
  { key: 'l10hit', label: 'L10 Hit' },
  { key: 'best', label: 'Best' },
  { key: 'book', label: 'Book' },
  { key: 'edge', label: 'Edge' },
]

const NFL_TABLE_HEADERS: Array<{ key: SortKey | 'risk'; label: string }> = [
  { key: 'player', label: 'Player' },
  { key: 'line', label: 'Line' },
  { key: 'season', label: 'Avg' },
  { key: 'risk', label: 'Risk' },
  { key: 'best', label: 'Best' },
  { key: 'book', label: 'Book' },
  { key: 'edge', label: 'Edge' },
]

function sortValue(prop: FlattenedProp, stats: Record<string, any> | undefined, key: SortKey, sport: Sport) {
  const line = prop.outcome.point ?? (prop.market.key === 'player_goal_scorer_anytime' || prop.market.key === 'player_anytime_td' ? 0.5 : 0)
  const season = getStat(stats, prop.market.key, 'season')
  const l10 = getStat(stats, prop.market.key, 'l10')
  const l5 = getStat(stats, prop.market.key, 'l5')
  const l10Hit = hitRate(recentValues(stats, prop.market.key, 10), line)
  const edge = sport === 'NFL'
    ? nflEdgeLabel(line, season, prop.outcome.price, prop.market.key)
    : edgeLabel(line, season, l10, l5, prop.outcome.price, stats, prop.market.key)

  if (key === 'player') return prop.outcome.description || ''
  if (key === 'line') return line
  if (key === 'season') return season
  if (key === 'l10') return l10
  if (key === 'l5') return l5
  if (key === 'l10hit') return l10Hit ?? -1
  if (key === 'best') return prop.outcome.price
  if (key === 'book') return prop.book
  return edge.score
}

function PropTableRow({
  prop,
  stats,
  sport,
  onSelectPlayer,
}: {
  prop: FlattenedProp
  stats?: Record<string, any>
  sport: Sport
  onSelectPlayer: (playerName: string, context: PlayerProfileMarketContext) => void
}) {
  const line = prop.outcome.point ?? (prop.market.key === 'player_goal_scorer_anytime' || prop.market.key === 'player_anytime_td' ? 0.5 : 0)
  const season = getStat(stats, prop.market.key, 'season')
  const l10 = getStat(stats, prop.market.key, 'l10')
  const l5 = getStat(stats, prop.market.key, 'l5')
  const l10Hit = hitRate(recentValues(stats, prop.market.key, 10), line)
  const edge = sport === 'NFL'
    ? nflEdgeLabel(line, season, prop.outcome.price, prop.market.key)
    : edgeLabel(line, season, l10, l5, prop.outcome.price, stats, prop.market.key)

  return (
    <View style={styles.tableRow}>
      <AppText
        onPress={() => prop.outcome.description && onSelectPlayer(prop.outcome.description, {
          marketKey: prop.market.key,
          marketLabel: marketLabel(prop.market.key),
          commonLine: line,
        })}
        style={[styles.cell, styles.playerCell, styles.playerName]}
        numberOfLines={2}
      >
        {prop.outcome.description}
      </AppText>
      <AppText style={styles.cell}>{line || '-'}</AppText>
      <StatTableCell value={fmtStat(season)} color={statColor(season, line)} />
      {sport === 'NFL' ? (
        <AppText style={styles.cell}>{stats?.risk?.label || '-'}</AppText>
      ) : (
        <>
          <StatTableCell value={fmtStat(l10)} color={statColor(l10, line)} />
          <StatTableCell value={fmtStat(l5)} color={statColor(l5, line)} />
          <AppText style={styles.cell}>{hitRateLabel(l10Hit)}</AppText>
        </>
      )}
      <AppText style={[styles.cell, styles.best]}>{fmtOdds(prop.outcome.price)}</AppText>
      <AppText style={styles.cell}>{prop.book}</AppText>
      <AppText style={[styles.cell, { color: edge.color }]}>{edge.label}</AppText>
    </View>
  )
}

function StatTableCell({ value, color }: { value: string; color: string }) {
  return <AppText style={[styles.cell, { color }]}>{value}</AppText>
}

export function PropCard({ prop, stats }: { prop: FlattenedProp; stats?: Record<string, any> }) {
  const label = marketLabel(prop.market.key)
  const line = prop.outcome.point ?? (prop.market.key === 'player_goal_scorer_anytime' || prop.market.key === 'player_anytime_td' ? 0.5 : 0)
  const season = getStat(stats, prop.market.key, 'season')
  const l10 = getStat(stats, prop.market.key, 'l10')
  const l5 = getStat(stats, prop.market.key, 'l5')
  const l10Hit = hitRate(recentValues(stats, prop.market.key, 10), line)
  const edge = edgeLabel(line, season, l10, l5, prop.outcome.price, stats, prop.market.key)

  return (
    <Card>
      <View style={styles.header}>
        <AppText variant="eyebrow">// {label}</AppText>
        <AppText variant="mono">{fmtTime(prop.game.commence_time)}</AppText>
      </View>

      <AppText style={styles.player}>{prop.outcome.description}</AppText>
      <AppText variant="muted" style={styles.matchup}>
        {prop.game.away_team} @ {prop.game.home_team}
      </AppText>

      <View style={styles.footer}>
        <View>
          <AppText variant="eyebrow">{prop.outcome.name}</AppText>
          <AppText style={styles.line}>{line || '-'}</AppText>
        </View>
        <View style={styles.oddsBadge}>
          <AppText style={styles.oddsText}>{fmtOdds(prop.outcome.price)}</AppText>
          <AppText variant="mono">{prop.book}</AppText>
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <StatPill label="Avg" value={fmtStat(season)} color={statColor(season, line)} />
          <StatPill label="L10" value={fmtStat(l10)} color={statColor(l10, line)} />
          <StatPill label="L5" value={fmtStat(l5)} color={statColor(l5, line)} />
          <StatPill
            label="L10 Hit"
            value={hitRateLabel(l10Hit)}
            color={l10Hit === null ? colors.textMuted : l10Hit >= 0.6 ? colors.green : l10Hit >= 0.5 ? colors.yellow : colors.red}
          />
          <View style={styles.edgePill}>
            <AppText variant="eyebrow">Edge</AppText>
            <AppText style={[styles.edgeText, { color: edge.color }]}>{edge.label}</AppText>
          </View>
        </View>
      )}
    </Card>
  )
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statPill}>
      <AppText variant="eyebrow">{label}</AppText>
      <AppText style={[styles.statValue, { color }]}>{value}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  player: {
    fontSize: 20,
    fontWeight: '900',
  },
  matchup: {
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  line: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
  },
  oddsBadge: {
    minWidth: 94,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(198,145,50,.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  oddsText: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  gameBlock: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  gameTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cell: {
    width: 82,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  playerCell: {
    width: 170,
  },
  playerName: {
    color: colors.gold,
    textTransform: 'uppercase',
  },
  best: {
    color: colors.gold,
  },
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.sm,
  },
  marketGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.bgCardAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.sm,
  },
  marketGroupButton: {
    minWidth: '30%',
    flexGrow: 1,
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  marketGroupButtonActive: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
  },
  marketGroupText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  marketGroupTextActive: {
    color: colors.textPrimary,
  },
  marketButton: {
    minWidth: '30%',
    flexGrow: 1,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  marketButtonActive: {
    backgroundColor: colors.gold,
  },
  marketText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '900',
  },
  marketTextActive: {
    color: colors.bgPrimary,
  },
  variantRow: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
    padding: 4,
  },
  variantButton: {
    borderRadius: 9,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  variantButtonActive: {
    backgroundColor: colors.gold,
  },
  variantText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  variantTextActive: {
    color: colors.bgPrimary,
  },
  filterStack: {
    gap: spacing.sm,
  },
  search: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontWeight: '700',
  },
  gameFilterRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  gameFilterButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  gameFilterButtonActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  gameFilterText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  gameFilterTextActive: {
    color: colors.bgPrimary,
  },
  clearButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  clearButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  statPill: {
    minWidth: 78,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '900',
  },
  edgePill: {
    minWidth: '48%',
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.28)',
    borderRadius: 8,
    backgroundColor: 'rgba(198,145,50,.08)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  edgeText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '900',
  },
})
