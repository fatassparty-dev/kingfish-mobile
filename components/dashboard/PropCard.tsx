import { useEffect, useMemo, useState } from 'react'
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { LinePickerSheet, OddsCompareSheet, PriceChip, type LinePickerData, type OddsCompareData } from '@/components/dashboard/OddsCompareSheet'
import { PlayerProfileModal, type PlayerProfileMarketContext } from '@/components/dashboard/PlayerProfileModal'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { fmtOdds, fmtTime, normalizeName } from '@/lib/format'
import { MOBILE_FREE_PREVIEW_ROWS } from '@/lib/freePreview'
import { inNflWindow, nflWindows } from '@/lib/nflBoardWindow'
import { lineOptions, propBookLines, sideHitCount, sideHitRate, sidePricesAtLine, yesPrices, type BookPrice, type LineOption, type PropSide } from '@/lib/oddsCompare'
import { getBestOverAtLine, getDisplayLine } from '@/lib/propLines'
import { displayBookName, eligiblePropBookKeys, shortBookName, type SportsbookPreferences } from '@/lib/sportsbooks'
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
  player_goal_scorer_first: 'First Goal',
  player_shots_on_goal: 'Shots on Goal',
  player_blocked_shots: 'Blocked Shots',
  player_power_play_points: 'Power Play Points',
  player_total_saves: 'Saves',
  player_pass_yds: 'Pass Yards',
  player_pass_tds: 'Pass TDs',
  player_pass_attempts: 'Pass Attempts',
  player_pass_completions: 'Completions',
  player_pass_interceptions: 'Interceptions',
  player_rush_yds: 'Rush Yards',
  player_rush_attempts: 'Rush Attempts',
  player_rush_tds: 'Rush TDs',
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
  'player_goal_scorer_first',
  'player_assists',
  'player_points',
  'player_shots_on_goal',
  'player_blocked_shots',
  'player_power_play_points',
  'player_total_saves',
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
  'player_rush_yds',
  'player_rush_attempts',
  'player_rush_tds',
  'player_rush_reception_yds',
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
  'player_rush_yds_alternate',
  'player_rush_attempts_alternate',
  'player_rush_tds_alternate',
  'player_rush_reception_yds_alternate',
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

const NFL_TD_MARKETS = new Set(['player_anytime_td', 'player_1st_td', 'player_last_td', 'player_tds_over'])

// Markets with only a Yes price: no Under side, so the Over / Under switch hides.
const YES_ONLY_MARKETS = new Set([...NFL_TD_MARKETS, 'player_goal_scorer_anytime', 'player_goal_scorer_first'])

interface FlattenedProp {
  game: Game
  market: Market
  outcome: Outcome
  book: string
  bookKey: string
  // Every book's Over (or Yes) price at the standard line, best first.
  prices: BookPrice[]
  // Every book's Under price at the standard line, best first.
  underPrices: BookPrice[]
  // Alt rungs from the `alts=board` payload: point -> book -> Over price.
  altRungs: Record<string, Record<string, number>>
}

type SortKey = 'player' | 'line' | 'odds' | 'book' | 'season' | 'l10' | 'l10hit' | 'l5' | 'l5hit' | 'edge'
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
  player_goal_scorer_first: 'goals',
  player_shots_on_goal: 'shots',
  player_blocked_shots: 'blk',
  player_power_play_points: 'ppp',
  player_total_saves: 'saves',
  player_pass_yds: 'passing_yards_per_game',
  player_pass_tds: 'passing_tds_per_game',
  player_pass_attempts: 'passing_attempts_per_game',
  player_pass_completions: 'completions_per_game',
  player_pass_interceptions: 'interceptions_per_game',
  player_rush_yds: 'rushing_yards_per_game',
  player_rush_attempts: 'carries_per_game',
  player_rush_tds: 'rushing_tds_per_game',
  player_rush_reception_yds: 'rush_reception_yards_per_game',
  player_receptions: 'receptions_per_game',
  player_reception_yds: 'receiving_yards_per_game',
  player_reception_tds: 'receiving_tds_per_game',
  player_anytime_td: 'rush_reception_tds_per_game',
  player_tds_over: 'rush_reception_tds_per_game',
  player_1st_td: 'rush_reception_tds_per_game',
  player_last_td: 'rush_reception_tds_per_game',
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

function isYesOnlyMarket(marketKey: string) {
  return YES_ONLY_MARKETS.has(baseMarketKey(marketKey))
}

// Where a row's alt rungs come from on the `alts=board` payload (NFL and NHL;
// other sports have no alt ladders on the web either). Anytime TD / Anytime
// Goal offer their 2+ rung, like the web board.
function altSource(marketKey: string, sport: Sport): { key: string; point?: number } | null {
  if (sport !== 'NFL' && sport !== 'NHL') return null
  if (marketKey === 'player_anytime_td') return { key: 'player_tds_over', point: 1.5 }
  if (marketKey === 'player_goal_scorer_anytime') return { key: 'player_goals_alternate', point: 1.5 }
  if (isYesOnlyMarket(marketKey) || isAlternateMarket(marketKey)) return null
  return { key: `${marketKey}_alternate` }
}

// The line as the row reads it: Yes-only markets show their 2+ rung as "2+".
function rungText(marketKey: string, line: number) {
  if (isYesOnlyMarket(marketKey) && line === 1.5) return '2+'
  return line ? String(line) : '-'
}

function pickerLabel(marketKey: string, line: number, sport: Sport) {
  if (isYesOnlyMarket(marketKey)) return line === 1.5 ? `2+ ${sport === 'NHL' ? 'Goals' : 'TDs'}` : marketLabel(marketKey, sport)
  return `Over ${line}`
}

function standardMarketLabel(marketKey: string, sport?: Sport) {
  const label = marketLabel(marketKey, sport)
  return isAlternateMarket(marketKey) ? label.replace(/^Alt\s+/, '') : label
}

const NFL_MARKET_LABELS: Record<string, string> = {
  player_assists: 'Tackle Assists',
  player_assists_alternate: 'Alt Tackle Assists',
}

// NFL names only for NFL: `player_assists` is tackle assists in football but
// assists in hockey and basketball (NHL showed "Tackle Assists", 2026-10-03).
function marketLabel(marketKey: string, sport?: Sport) {
  if ((!sport || sport === 'NFL') && NFL_MARKET_LABELS[marketKey]) return NFL_MARKET_LABELS[marketKey]
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
  if (typeof stats[`${prefix}_${statKey}`] === 'number') return stats[`${prefix}_${statKey}`]
  const count = prefix === 'l10' ? 10 : 5
  const recent = recentValues(stats, marketKey, count)
  if (recent.length) return recent.reduce((total, value) => total + value, 0) / recent.length
  return 0
}

function rawKeysForStatKey(statKey: string) {
  const rawMap: Record<string, string[]> = {
    pass_rush_yards_per_game: ['passing_yards', 'rushing_yards'],
    pass_rush_reception_yards_per_game: ['passing_yards', 'rushing_yards', 'receiving_yards'],
    pass_rush_reception_tds_per_game: ['passing_tds', 'rushing_tds', 'receiving_tds'],
    rush_reception_yards_per_game: ['rushing_yards', 'receiving_yards'],
    rush_reception_tds_per_game: ['rushing_tds', 'receiving_tds'],
  }
  if (rawMap[statKey]) return rawMap[statKey]
  return [statKey.replace(/_per_game$/, '')]
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

// NHL goal-scorer markets are Yes-only at an implied 0.5, like anytime TD.
function isNhlGoalScorerMarket(marketKey: string) {
  return marketKey === 'player_goal_scorer_anytime' || marketKey === 'player_goal_scorer_first'
}

// First Goal reads the server's actual first-scorer history (nhl-stats
// `first_goal_history`), mirroring lib/nhl/firstGoalHistory.ts on the web.
// Goal averages say nothing about scoring FIRST.
const FIRST_GOAL_MARKET = 'player_goal_scorer_first'

function firstGoalRecord(stats: Record<string, any> | undefined, recentCount?: 5 | 10) {
  const history = stats?.first_goal_history
  if (!history) return null
  const recent: Array<{ firstGoal: number }> = Array.isArray(history.recent) ? history.recent : []
  const games = recentCount ? recent.slice(0, recentCount) : null
  const played = games ? games.length : Number(history.gamesPlayed) || 0
  if (!played) return null
  const hits = games ? games.reduce((sum, game) => sum + (game.firstGoal === 1 ? 1 : 0), 0) : Number(history.seasonHits) || 0
  return { hits, games: played, rate: hits / played }
}

function firstGoalLabel(record: ReturnType<typeof firstGoalRecord>) {
  return record ? `${record.hits}/${record.games}` : '-'
}

function recentValues(stats: Record<string, any> | undefined, marketKey: string, count: 5 | 10) {
  if (!stats) return []
  // No "scored first" history exists; a goal-game rate would overstate it.
  if (marketKey === 'player_goal_scorer_first') return []
  const statKey = (baseMarketKey(marketKey) === 'player_assists' && stats.def_tackle_assists_per_game !== undefined)
    ? 'def_tackle_assists_per_game'
    : STAT_KEY_BY_MARKET[marketKey] || STAT_KEY_BY_MARKET[baseMarketKey(marketKey)]
  if (!statKey) return []

  if (Array.isArray(stats.raw_games)) {
    const keys = Array.isArray(statKey)
      ? statKey.flatMap((key) => rawKeysForStatKey(key))
      : rawKeysForStatKey(statKey)
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

function hitRateColor(rate: number | null) {
  if (rate === null) return colors.textMuted
  if (rate >= 0.6) return colors.green
  if (rate >= 0.5) return colors.gold
  return colors.red
}

function edgeLabel(
  line: number,
  season: number,
  l10: number,
  l5: number,
  odds: number | undefined,
  sport?: Sport
) {
  if (!season) return { label: 'No Stats', color: colors.textMuted, score: 0 }
  const safeLine = Math.max(line || 0, sport === 'NHL' ? 0.1 : 0.5)
  const seasonRatio = season / safeLine
  const l10Ratio = (l10 || season) / safeLine
  const l5Ratio = (l5 || season) / safeLine
  const composite = seasonRatio * 0.5 + l10Ratio * 0.3 + l5Ratio * 0.2
  const implied = odds && odds > 0 ? 100 / (odds + 100) : odds ? Math.abs(odds) / (Math.abs(odds) + 100) : 0.5
  const avgScore = clamp((composite - 0.82) / 0.55) * 35
  const l10Score = clamp((l10Ratio - 0.75) / 0.55) * 25
  const l5Score = clamp((l5Ratio - 0.75) / 0.55) * 20
  const priceScore = implied <= 0.52 ? 12 : implied <= 0.58 ? 9 : implied <= 0.65 ? 5 : implied <= 0.72 ? 2 : 0
  const trendScore = l5 >= l10 && l10 >= season * 0.92 ? 8 : l5 >= l10 ? 4 : 0
  const score = Math.round(avgScore + l10Score + l5Score + priceScore + trendScore)

  if (score >= 80) return { label: `Strong ${score}`, color: colors.green, score }
  if (score >= 65) return { label: `Lean ${score}`, color: colors.gold, score }
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
    if (score >= 80) return { label: 'Strong', color: colors.green, score }
    if (score >= 65) return { label: 'Lean', color: colors.gold, score }
    if (score >= 45) return { label: 'Neutral', color: colors.textSecondary, score }
    return { label: 'Fade', color: colors.red, score }
  }

  const safeLine = Math.max(line, 0.5)
  const ratio = lowerIsBetter ? safeLine / Math.max(stat, 0.1) : stat / safeLine
  const pricePenalty = odds && implied(odds) > 0.68 ? 10 : odds && implied(odds) > 0.6 ? 5 : 0
  const score = Math.round(Math.max(0, Math.min(100, ((ratio - 0.72) / 0.58) * 82 + 14 - pricePenalty)))
  if (score >= 80) return { label: 'Strong', color: colors.green, score }
  if (score >= 65) return { label: 'Lean', color: colors.gold, score }
  if (score >= 45) return { label: 'Neutral', color: colors.textSecondary, score }
  return { label: 'Fade', color: colors.red, score }
}

function statColor(value: number, line: number, side: PropSide = 'over') {
  if (!value) return colors.textMuted
  if (side === 'under') {
    if (value * 1.15 < line) return colors.green
    if (value <= line) return colors.yellow
    return colors.red
  }
  if (value > line * 1.15) return colors.green
  if (value >= line) return colors.yellow
  return colors.red
}

// Triple-digit stats (QB pass yards) drop the decimal so "229" fits the
// 54px column instead of truncating to "22…".
function fmtStat(value: number, hasStats = value !== 0) {
  if (!hasStats) return '-'
  return Math.abs(value) >= 100 ? String(Math.round(value)) : value.toFixed(1)
}

function displayPlayerName(name?: string) {
  const clean = String(name || '').trim()
  // Team defense rows ("Denver Broncos Defense") read as the team, never as a
  // person ("D. Defense"): nickname + D, e.g. "Broncos D".
  const defense = clean.match(/^(.*\S)\s+(?:D\/ST|DST|Defense|Defence)$/i)
  if (defense) return `${defense[1].split(/\s+/).pop()} D`
  const pieces = clean.split(/\s+/).filter(Boolean)
  if (pieces.length < 2) return clean
  const suffixes = new Set(['jr.', 'sr.', 'ii', 'iii', 'iv', 'v'])
  const last = suffixes.has(pieces[pieces.length - 1].toLowerCase()) && pieces.length > 2
    ? `${pieces[pieces.length - 2]} ${pieces[pieces.length - 1]}`
    : pieces[pieces.length - 1]
  return `${pieces[0][0]}. ${last}`
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

function availableMarkets(games: Game[], sport: Sport, userState?: string | null, preferences?: SportsbookPreferences | null) {
  const available = new Set<string>()
  const bookKeys = eligiblePropBookKeys(userState, preferences)
  games.forEach((game) => {
    game.bookmakers?.forEach((bookmaker) => {
      if (!bookKeys.includes(bookmaker.key)) return
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

export function flattenProps(
  games: Game[],
  limit?: number,
  marketKey?: string,
  userState?: string | null,
  preferences?: SportsbookPreferences | null,
  sport?: Sport,
): FlattenedProp[] {
  const propMap = new Map<string, FlattenedProp>()
  // Book Preferences apply here exactly as they do on Game Props.
  const bookKeys = eligiblePropBookKeys(userState, preferences)
  const alts = marketKey && sport ? altSource(marketKey, sport) : null

  for (const game of upcomingGames(games)) {
    const players = new Map<string, {
      market: Market
      playerName: string
      outcomes: Array<{ book: string; name: string; price: number; point?: number }>
      anytime: Record<string, number>
      bookTitles: Record<string, string>
    }>()
    const altRungs: Record<string, Record<string, Record<string, number>>> = {}

    for (const bookmaker of game.bookmakers || []) {
      if (!bookKeys.includes(bookmaker.key)) continue
      for (const market of bookmaker.markets || []) {
        if (alts && market.key === alts.key) {
          for (const outcome of market.outcomes || []) {
            if (outcome.name !== 'Over' || !outcome.description) continue
            if (typeof outcome.price !== 'number' || typeof outcome.point !== 'number') continue
            if (alts.point !== undefined && outcome.point !== alts.point) continue
            ((altRungs[outcome.description] ||= {})[String(outcome.point)] ||= {})[bookmaker.key] = outcome.price
          }
          continue
        }
        if (marketKey && market.key !== marketKey) continue
        const yesOnly = isYesOnlyMarket(market.key)
        for (const outcome of market.outcomes || []) {
          const playerName = yesOnly ? (outcome.description || outcome.name) : outcome.description
          if (!playerName) continue
          if (yesOnly ? outcome.name === 'No' : outcome.name !== 'Over' && outcome.name !== 'Yes' && outcome.name !== 'Under') continue
          // No upper price cap: the old +700 ceiling hid NFL 1st / Last TD and
          // 2+ TD longshots (removed on the web in September). The row-count
          // trim keeps the board short.
          if (typeof outcome.price !== 'number' || outcome.price < -10000) continue

          const playerKey = `${market.key}-${playerName}`
          const entry = players.get(playerKey) || { market, playerName, outcomes: [], anytime: {}, bookTitles: {} }
          entry.bookTitles[bookmaker.key] = bookmaker.title

          if (yesOnly) {
            entry.anytime[bookmaker.key] = outcome.price
          } else {
            entry.outcomes.push({ book: bookmaker.key, name: outcome.name === 'Yes' ? 'Over' : outcome.name, price: outcome.price, point: outcome.point })
          }
          players.set(playerKey, entry)
        }
      }
    }

    players.forEach((entry) => {
      const rowKey = `${game.game_id || game.id}-${entry.market.key}-${entry.playerName}`
      const rungs = altRungs[entry.playerName] || {}
      if (isYesOnlyMarket(entry.market.key)) {
        const prices = yesPrices(entry.anytime, bookKeys)
        if (!prices.length) return
        propMap.set(rowKey, {
          game,
          market: entry.market,
          outcome: { name: 'Yes', description: entry.playerName, price: prices[0].odds, point: 0.5 },
          book: displayBookName(prices[0].book, entry.bookTitles[prices[0].book]),
          bookKey: prices[0].book,
          prices,
          underPrices: [],
          altRungs: rungs,
        })
        return
      }

      const bookData = propBookLines(entry.outcomes)
      const line = getDisplayLine(bookData, bookKeys)
      const best = getBestOverAtLine(bookData, bookKeys, line)
      if (!best) return
      propMap.set(rowKey, {
        game,
        market: entry.market,
        outcome: { name: 'Over', description: entry.playerName, price: best.odds, point: line },
        book: displayBookName(best.book, entry.bookTitles[best.book]),
        bookKey: best.book,
        prices: sidePricesAtLine(bookData, bookKeys, line, 'over'),
        underPrices: sidePricesAtLine(bookData, bookKeys, line, 'under'),
        altRungs: rungs,
      })
    })
  }

  const props = Array.from(propMap.values())
  return typeof limit === 'number' ? props.slice(0, limit) : props
}

export function PropsList({
  games,
  sport,
  limit,
  initialStats,
  userState,
  sportsbookPreferences,
  boardScores,
  altScores,
  underBoardScores,
  preview = false,
}: {
  games: Game[]
  sport: Sport
  limit?: number
  initialStats?: Record<string, any>
  userState?: string | null
  sportsbookPreferences?: SportsbookPreferences | null
  boardScores?: Record<string, any>
  altScores?: Record<string, Record<string, any>>
  underBoardScores?: Record<string, any>
  preview?: boolean
}) {
  const { width, height } = useWindowDimensions()
  const landscapeTable = width > height
  const compactTable = sport === 'NFL' && landscapeTable
  const availableMarketKeys = useMemo(() => availableMarkets(games, sport, userState, sportsbookPreferences), [games, sport, userState, sportsbookPreferences])
  // NFL alt markets and TDs Over aren't tabs: their rungs live in each row's
  // line picker (Anytime TD offers 2+ TDs there), like the web board.
  const markets = useMemo(() => {
    const keys = availableMarketKeys.length || sport !== 'NFL' ? availableMarketKeys : NFL_MARKETS
    return sport === 'NFL' ? keys.filter((marketKey) => !isAlternateMarket(marketKey) && marketKey !== 'player_tds_over') : keys
  }, [availableMarketKeys, sport])
  const [activeMarket, setActiveMarket] = useState(markets[0])
  const [sortKey, setSortKey] = useState<SortKey>('edge')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [selectedMarketContext, setSelectedMarketContext] = useState<PlayerProfileMarketContext | null>(null)
  const [selectedGame, setSelectedGame] = useState('auto')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  // Starts on Over every visit, like the web.
  const [side, setSide] = useState<PropSide>('over')
  const [linePicks, setLinePicks] = useState<Record<string, number>>({})
  const [compare, setCompare] = useState<OddsCompareData | null>(null)
  const [picker, setPicker] = useState<LinePickerData | null>(null)
  const selectedMarket = markets.includes(activeMarket) ? activeMarket : markets[0]
  const yesOnly = selectedMarket ? isYesOnlyMarket(selectedMarket) : false
  const activeSide: PropSide = side === 'under' && !yesOnly ? 'under' : 'over'
  // The server's future Under Edge (`underBoardScores`); until it ships, the
  // Under side shows no Edge.
  const underEdge = activeSide === 'under' && Boolean(underBoardScores && Object.keys(underBoardScores).length)
  const gameOptions = upcomingGames(games)
  const nflBoard = nflWindows(gameOptions, Date.now())
  const nflWindowKeys = new Set(nflBoard.options.map(option => option.key))
  const activeGameFilter = sport === 'NFL'
    ? selectedGame === 'auto'
      ? nflBoard.defaultKey
      : nflWindowKeys.has(selectedGame) || gameOptions.some(game => String(game.game_id || game.id) === selectedGame)
        ? selectedGame
        : nflBoard.defaultKey
    : selectedGame === 'all' || gameOptions.some(game => String(game.game_id || game.id) === selectedGame)
      ? selectedGame
      : 'all'
  const filteredGames = activeGameFilter === 'all'
    ? games
    : sport === 'NFL' && nflWindowKeys.has(activeGameFilter)
      ? games.filter(game => inNflWindow(game, activeGameFilter, Date.now()))
      : games.filter(game => String(game.game_id || game.id) === activeGameFilter)
  const allProps = flattenProps(
    filteredGames,
    limit,
    selectedMarket,
    userState,
    sportsbookPreferences,
    sport
  )
  // An Under row needs at least one book's Under at the standard line.
  const sideProps = activeSide === 'under' ? allProps.filter((prop) => prop.underPrices.length > 0) : allProps
  const props = sideProps.filter((prop) => !search || String(prop.outcome.description || '').toLowerCase().includes(search.toLowerCase()))
  const playerNames = [...new Set(allProps.map((prop) => prop.outcome.description).filter(Boolean))]
  const propsByGame = activeGameFilter === 'all' || (sport === 'NFL' && nflWindowKeys.has(activeGameFilter))
    ? [{ game: null, props }]
    : gameOptions
      .filter((game) => String(game.game_id || game.id) === activeGameFilter)
      .map((game) => ({
        game,
        props: props.filter((prop) => (prop.game.game_id || prop.game.id) === (game.game_id || game.id)),
      }))
      .filter((group) => group.props.length > 0)

  useEffect(() => {
    if (markets[0]) setActiveMarket(markets[0])
  }, [markets[0], sport])

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
  const rowContext: RowContext = { sport, side: activeSide, preview, linePicks, boardScores, altScores, underBoardScores }

  function toggleSort(nextKey: SortKey) {
    if (preview) return
    if (sortKey === nextKey) {
      setSortDir((current) => (current === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(nextKey)
      setSortDir(nextKey === 'player' || nextKey === 'book' ? 'asc' : 'desc')
    }
  }

  function sortProps(gameProps: FlattenedProp[]) {
    return gameProps
      .map((prop) => {
        const stats = statsByPlayer[normalizeName(prop.outcome.description || '')]
        return { prop, stats, view: rowView(prop, stats, rowContext) }
      })
      .sort((a, b) => {
        const aValue = sortValue(a.prop, a.view, a.stats, sortKey, activeSide, landscapeTable)
        const bValue = sortValue(b.prop, b.view, b.stats, sortKey, activeSide, landscapeTable)
        const direction = sortDir === 'asc' ? 1 : -1

        if (typeof aValue === 'string' || typeof bValue === 'string') {
          return String(aValue).localeCompare(String(bValue)) * direction
        }
        // Under ties (same hit rate) go to the better price.
        return ((aValue || 0) - (bValue || 0)) * direction || (activeSide === 'under' ? b.view.standardOdds - a.view.standardOdds : 0)
      })
  }

  return (
    <View style={styles.list}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marketRail}>
        {markets.map((marketKey) => (
          <Pressable
            key={marketKey}
            onPress={() => setActiveMarket(marketKey)}
            style={[styles.marketButton, sport === 'NFL' && styles.nflMarketButton, selectedMarket === marketKey && styles.marketButtonActive]}
          >
            <AppText style={[styles.marketText, selectedMarket === marketKey && styles.marketTextActive]}>
              {standardMarketLabel(marketKey, sport)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
      {!yesOnly && (
        <View style={styles.variantRow}>
          {(['over', 'under'] as PropSide[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => setSide(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: activeSide === option }}
              style={[styles.variantButton, activeSide === option && styles.variantButtonActive]}
            >
              <AppText style={[styles.variantText, activeSide === option && styles.variantTextActive]}>
                {option === 'over' ? 'Over' : 'Under'}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.filterStack}>
        {(searchOpen || search) && (
          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search player..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.search}
            />
            <Pressable
              onPress={() => {
                setSearchOpen(false)
                Keyboard.dismiss()
              }}
              style={styles.doneButton}
            >
              <AppText style={styles.doneButtonText}>Done</AppText>
            </Pressable>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gameFilterRow}>
          <Pressable
            onPress={() => setSearchOpen(true)}
            style={[styles.gameFilterButton, searchOpen && styles.gameFilterButtonActive]}
          >
            <AppText style={[styles.gameFilterText, searchOpen && styles.gameFilterTextActive]}>Search</AppText>
          </Pressable>
          {sport === 'NFL' ? nflBoard.options.map(option => (
            <Pressable
              key={option.key}
              onPress={() => setSelectedGame(option.key)}
              style={[styles.gameFilterButton, activeGameFilter === option.key && styles.gameFilterButtonActive]}
            >
              <AppText style={[styles.gameFilterText, activeGameFilter === option.key && styles.gameFilterTextActive]}>{option.label}</AppText>
            </Pressable>
          )) : (
            <Pressable
              onPress={() => setSelectedGame('all')}
              style={[styles.gameFilterButton, activeGameFilter === 'all' && styles.gameFilterButtonActive]}
            >
              <AppText style={[styles.gameFilterText, activeGameFilter === 'all' && styles.gameFilterTextActive]}>All Games</AppText>
            </Pressable>
          )}
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
        <View key={game ? game.game_id || game.id || `${game.away_team}-${game.home_team}` : 'all-games'} style={styles.gameBlock}>
          <View style={styles.gameHeader}>
            <AppText style={[styles.gameTitle, compactTable && styles.gameTitleCompact]}>
              {game ? `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}` : sport === 'NFL' ? nflBoard.options.find(option => option.key === activeGameFilter)?.label || 'All Games' : 'All Games'}
            </AppText>
            {game ? <AppText variant="mono">{fmtTime(game.commence_time)}</AppText> : null}
          </View>
          <View>
            <View style={landscapeTable && styles.landscapeTable}>
              <View style={styles.tableHeader}>
                {tableHeaders(landscapeTable, selectedMarket === FIRST_GOAL_MARKET, activeSide, underEdge).map((header) => (
                  <Pressable
                    key={header.label}
                    onPress={() => toggleSort(header.key)}
                    style={[
                      styles.cell,
                      landscapeTable && styles.landscapeCell,
                      header.key === 'book' && styles.bookCell,
                      header.key === 'player' && styles.playerCell,
                      header.key === 'player' && landscapeTable && styles.landscapePlayerCell,
                      header.key === 'edge' && styles.edgeCell,
                      header.key === 'edge' && landscapeTable && styles.landscapeEdgeCell,
                    ]}
                  >
                    <AppText
                      variant="eyebrow"
                      style={[
                        styles.headerText,
                        landscapeTable && styles.landscapeHeaderText,
                        sortKey === header.key && styles.headerTextActive,
                      ]}
                    >
                      {header.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {sortProps(gameProps).slice(0, preview ? MOBILE_FREE_PREVIEW_ROWS : undefined).map(({ prop, stats, view }) => (
                <PropTableRow
                  key={`${prop.market.key}-${prop.outcome.description}-${prop.outcome.point}-${prop.book}`}
                  prop={prop}
                  view={view}
                  stats={stats}
                  sport={sport}
                  landscape={landscapeTable}
                  side={activeSide}
                  underEdge={underEdge}
                  preview={preview}
                  onSelectPlayer={(playerName, context) => {
                    setSelectedPlayer(playerName)
                    setSelectedMarketContext(context)
                  }}
                  onCompare={() => setCompare(compareData(prop, view, sport, activeSide))}
                  onPickLine={() => setPicker({
                    title: prop.outcome.description || '',
                    subtitle: marketLabel(prop.market.key, sport),
                    options: view.options.map((option) => ({
                      line: option.line,
                      label: pickerLabel(prop.market.key, option.line, sport),
                      best: option.prices[0],
                    })),
                    selected: view.line,
                    onPick: (line) => setLinePicks((current) => ({ ...current, [view.pickKey]: line })),
                  })}
                />
              ))}
            </View>
          </View>
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
      <OddsCompareSheet data={compare} onClose={() => setCompare(null)} />
      <LinePickerSheet data={picker} onClose={() => setPicker(null)} />
    </View>
  )
}

const PORTRAIT_TABLE_HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: 'player', label: 'Player' },
  { key: 'season', label: 'AVG' },
  { key: 'l10', label: 'L10' },
  { key: 'l5', label: 'L5' },
  { key: 'edge', label: 'Edge' },
]

// Book follows Odds, the web board's order.
const LANDSCAPE_TABLE_HEADERS: Array<{ key: SortKey; label: string }> = [
  { key: 'player', label: 'Player' },
  { key: 'line', label: 'Line' },
  { key: 'odds', label: 'Odds' },
  { key: 'book', label: 'Book' },
  { key: 'season', label: 'AVG' },
  { key: 'l5', label: 'L5' },
  { key: 'l10', label: 'L10' },
  { key: 'l5hit', label: 'L5 Hit' },
  { key: 'l10hit', label: 'L10 Hit' },
  { key: 'edge', label: 'Edge' },
]

const FIRST_GOAL_HEADER_LABELS: Record<string, { portrait: string; landscape: string }> = {
  season: { portrait: '1st Szn', landscape: '1st Szn' },
  l10: { portrait: '1st L10', landscape: 'L10 G' },
  l5: { portrait: '1st L5', landscape: 'L5 G' },
  l5hit: { portrait: '1st L5', landscape: '1st L5' },
  l10hit: { portrait: '1st L10', landscape: '1st L10' },
}

// Under with no server Under Edge: portrait's Edge column becomes "L5 U" (the
// L5 Under hit rate; L5 since early-season L10 is mostly L5) so the width
// holds; landscape drops Edge.
function tableHeaders(landscape: boolean, firstGoal: boolean, side: PropSide, underEdge: boolean) {
  let headers = landscape ? LANDSCAPE_TABLE_HEADERS : PORTRAIT_TABLE_HEADERS
  if (side === 'under' && !underEdge) {
    headers = landscape
      ? headers.filter((header) => header.key !== 'edge')
      : headers.map((header) => (header.key === 'edge' ? { ...header, label: 'L5 U' } : header))
  }
  if (!firstGoal) return headers
  return headers.map((header) => {
    const relabel = FIRST_GOAL_HEADER_LABELS[header.key]
    return relabel ? { ...header, label: landscape ? relabel.landscape : relabel.portrait } : header
  })
}

// Maps a server edge label ("Strong 82", "Lean 61", ...) to this table's
// existing tier colors, so a server-sourced score renders identically to a
// locally-computed one.
function edgeColorFromLabel(label: string): string {
  if (label.startsWith('Strong')) return colors.green
  if (label.startsWith('Lean')) return colors.gold
  if (label.startsWith('Neutral')) return colors.textSecondary
  if (label.startsWith('Fade')) return colors.red
  return colors.textMuted
}

type Edge = { score: number; label: string; color: string }

// Server-computed EDGE (CLAUDE.md "Calculated scores live on the web" — the
// client renders it, never recomputes it as primary). boardScores, altScores
// and underBoardScores are keyed like lib/scoring/propScoring.ts's secondary
// output key, `${marketKey}-${player}`. Guarded on line match; null when
// unresolved so Over rows fall back to the local calc (a backup only, per that
// law). Under rows have no local fallback: no Under math in the app.
function scoreEntry(entry: any, line: number): Edge | null {
  if (!entry || entry.line !== line) return null
  return { score: entry.edgeScore as number, label: entry.edgeLabel as string, color: edgeColorFromLabel(entry.edgeLabel) }
}

function localEdge(prop: FlattenedProp, line: number, odds: number, stats: Record<string, any> | undefined, sport: Sport): Edge {
  const season = getStat(stats, prop.market.key, 'season')
  if (sport === 'NFL') return nflEdgeLabel(line, season, odds, prop.market.key)
  return edgeLabel(line, season, getStat(stats, prop.market.key, 'l10'), getStat(stats, prop.market.key, 'l5'), odds, sport)
}

type RowContext = {
  sport: Sport
  side: PropSide
  preview: boolean
  linePicks: Record<string, number>
  boardScores?: Record<string, any>
  altScores?: Record<string, Record<string, any>>
  underBoardScores?: Record<string, any>
}

// What a row shows after the Over / Under switch and its line pick. The board
// order (rankScore) always comes from the standard line, so picking a rung
// never reshuffles the board (web board, 2026-09-27).
type RowView = {
  standardLine: number
  line: number
  best: BookPrice | null
  prices: BookPrice[]
  options: LineOption[]
  edge: Edge | null
  rankScore: number
  standardOdds: number
  pickKey: string
}

function rowView(prop: FlattenedProp, stats: Record<string, any> | undefined, ctx: RowContext): RowView {
  const player = prop.outcome.description || ''
  const standardLine = prop.outcome.point ?? (isYesOnlyMarket(prop.market.key) ? 0.5 : 0)
  const pickKey = `${prop.game.game_id || prop.game.id}|${prop.market.key}|${player}`
  const standardEdge = scoreEntry(ctx.boardScores?.[`${prop.market.key}-${player}`], standardLine)
    || (!ctx.preview ? localEdge(prop, standardLine, prop.outcome.price, stats, ctx.sport) : null)

  if (ctx.side === 'under') {
    // The standard line only: the board payload carries Over alts only.
    const best = prop.underPrices[0] || null
    const edge = scoreEntry(ctx.underBoardScores?.[`${prop.market.key}-${player}`], standardLine)
    const l5Under = sideHitRate(recentValues(stats, prop.market.key, 5), standardLine, 'under')
    return {
      standardLine,
      line: standardLine,
      best,
      prices: prop.underPrices,
      options: [{ line: standardLine, prices: prop.underPrices }],
      edge,
      // The free preview keeps the Over order, so the rows it surfaces don't
      // leak the Under hit-rate ranking.
      rankScore: ctx.preview ? standardEdge?.score ?? -1 : edge ? edge.score : l5Under ?? -1,
      standardOdds: best?.odds ?? -100000,
      pickKey,
    }
  }

  const alts = ctx.preview ? null : altSource(prop.market.key, ctx.sport)
  const options = lineOptions(standardLine, prop.prices, alts ? prop.altRungs : {})
  const picked = ctx.linePicks[pickKey]
  const line = picked !== undefined && options.some((option) => option.line === picked) ? picked : standardLine
  const prices = options.find((option) => option.line === line)?.prices || prop.prices
  const best = line === standardLine ? { book: prop.bookKey, odds: prop.outcome.price } : prices[0] || null
  const edge = line === standardLine || !alts
    ? standardEdge
    : scoreEntry(ctx.altScores?.[`${alts.key}-${player}`]?.[String(line)] || ctx.boardScores?.[`${alts.key}-${player}`], line)
      || (best ? localEdge(prop, line, best.odds, stats, ctx.sport) : null)
  return { standardLine, line, best, prices, options, edge, rankScore: standardEdge?.score ?? -1, standardOdds: prop.outcome.price, pickKey }
}

function compareData(prop: FlattenedProp, view: RowView, sport: Sport, side: PropSide): OddsCompareData {
  const label = marketLabel(prop.market.key, sport)
  const yesStandard = isYesOnlyMarket(prop.market.key) && view.line === view.standardLine
  return {
    title: prop.outcome.description || '',
    subtitle: yesStandard ? label : `${label} · ${side === 'under' ? 'Under' : 'Over'} ${view.line}`,
    prices: view.prices.length ? view.prices : view.best ? [view.best] : [],
    note: yesStandard ? 'Your books with this market posted.' : `Your books posting ${view.line}. Books on a different line aren't listed.`,
  }
}

// Sorts read the standard line, so a picked rung never moves its row.
function sortValue(prop: FlattenedProp, view: RowView, stats: Record<string, any> | undefined, key: SortKey, side: PropSide, landscape: boolean) {
  const line = view.standardLine
  if (key === 'player') return prop.outcome.description || ''
  if (prop.market.key === FIRST_GOAL_MARKET) {
    if (key === 'season') return firstGoalRecord(stats)?.rate ?? -1
    if (key === 'l5hit' || (key === 'l5' && !landscape)) return firstGoalRecord(stats, 5)?.rate ?? -1
    if (key === 'l10hit' || (key === 'l10' && !landscape)) return firstGoalRecord(stats, 10)?.rate ?? -1
  }
  if (key === 'line') return line
  if (key === 'odds') return view.standardOdds
  if (key === 'book') return shortBookName((side === 'under' ? prop.underPrices[0]?.book : prop.bookKey) || '')
  if (key === 'season') return getStat(stats, prop.market.key, 'season')
  if (key === 'l10') return getStat(stats, prop.market.key, 'l10')
  if (key === 'l10hit') return sideHitRate(recentValues(stats, prop.market.key, 10), line, side) ?? -1
  if (key === 'l5') return getStat(stats, prop.market.key, 'l5')
  if (key === 'l5hit') return sideHitRate(recentValues(stats, prop.market.key, 5), line, side) ?? -1
  return view.rankScore
}

const LINE_HIT_SLOP = { top: 14, bottom: 14, left: 8, right: 8 }

function PropTableRow({
  prop,
  view,
  stats,
  sport,
  landscape,
  side,
  underEdge,
  preview = false,
  onSelectPlayer,
  onCompare,
  onPickLine,
}: {
  prop: FlattenedProp
  view: RowView
  stats?: Record<string, any>
  sport: Sport
  landscape: boolean
  side: PropSide
  underEdge: boolean
  preview?: boolean
  onSelectPlayer: (playerName: string, context: PlayerProfileMarketContext) => void
  onCompare: () => void
  onPickLine: () => void
}) {
  const line = view.line
  const season = getStat(stats, prop.market.key, 'season')
  const l10 = getStat(stats, prop.market.key, 'l10')
  const l5 = getStat(stats, prop.market.key, 'l5')
  const l10Values = recentValues(stats, prop.market.key, 10)
  const l5Values = recentValues(stats, prop.market.key, 5)
  // Server-first (CLAUDE.md "Calculated scores live on the web"): rowView's
  // local calc is kept only as the offline/mismatch fallback, never primary.
  const edge = view.edge
  const edgeLabelText = edge ? String(edge.label).replace(/\s*\d+$/, '') : preview ? 'Premium' : '-'
  const showL10Under = side === 'under' && !underEdge
  const rung = rungText(prop.market.key, line)
  const playerName = prop.outcome.description || ''
  const canPickLine = view.options.length > 1
  const openProfile = () => prop.outcome.description && onSelectPlayer(prop.outcome.description, {
    marketKey: prop.market.key,
    marketLabel: marketLabel(prop.market.key, sport),
    commonLine: line,
  })
  // The line opens the picker when the row has alt rungs ("94.5 ▾").
  const lineControl = (text: string, style: any) => canPickLine ? (
    <Pressable
      onPress={onPickLine}
      hitSlop={LINE_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${playerName} line ${text}. Choose another line`}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <AppText variant="mono" style={[style, styles.lineLink]} numberOfLines={1}>{text} ▾</AppText>
    </Pressable>
  ) : (
    <AppText variant="mono" style={style} numberOfLines={1}>{text}</AppText>
  )
  const l5UnderRate = sideHitRate(l5Values, line, 'under')

  return (
    <Pressable onPress={openProfile} style={styles.tableRow}>
      <View style={[styles.cell, landscape && styles.landscapeCell, styles.playerCell, landscape && styles.landscapePlayerCell]}>
        {/* No shrink-to-fit: the RN new-architecture bug that drew random
            rows in tiny text (1.1.1 hotfix, 3612b20) also hits names. */}
        <AppText style={styles.playerName} numberOfLines={1}>
          {landscape ? prop.outcome.description : displayPlayerName(prop.outcome.description)}
        </AppText>
        {landscape ? (
          <AppText variant="mono" style={styles.playerSubline} numberOfLines={1}>
            {marketLabel(prop.market.key, sport)}
          </AppText>
        ) : (
          // Portrait: "94.5 ▾  -113 FD". The price lives here only. No market
          // label: the selected tab already names it, and at phone width it
          // was squeezed to "T…" (Brian, 2026-10-15 device review).
          <View style={styles.sublineRow}>
            {lineControl(rung, styles.playerSublineText)}
            {view.best ? (
              <PriceChip title={playerName} onPress={onCompare} style={styles.sublineChip}>
                {fmtOdds(view.best.odds)} {shortBookName(view.best.book)}
              </PriceChip>
            ) : (
              <AppText variant="mono" style={styles.playerSublineText}>-</AppText>
            )}
          </View>
        )}
      </View>
      {landscape ? (
        <>
          <View style={[styles.cell, styles.landscapeCell]}>
            {lineControl(line ? String(line) : '-', [styles.statCellValue, styles.landscapeStatCellValue, { color: colors.textPrimary }])}
          </View>
          <View style={[styles.cell, styles.landscapeCell]}>
            {view.best ? (
              <PriceChip title={playerName} onPress={onCompare} style={[styles.statCellValue, styles.landscapeStatCellValue]}>
                {fmtOdds(view.best.odds)}
              </PriceChip>
            ) : (
              <AppText style={[styles.statCellValue, styles.landscapeStatCellValue, { color: colors.textMuted }]}>-</AppText>
            )}
          </View>
          <View style={[styles.cell, styles.landscapeCell, styles.bookCell]}>
            <AppText variant="mono" style={styles.bookCellText} numberOfLines={1}>{view.best ? shortBookName(view.best.book) : '-'}</AppText>
          </View>
        </>
      ) : null}
      {prop.market.key === FIRST_GOAL_MARKET ? (
        // First Goal: season / recent first-scorer records (neutral, like web).
        // Landscape keeps L5/L10 goal averages as context; the hit columns
        // carry the first-goal records, so no number appears twice.
        <>
          <StatTableCell value={firstGoalLabel(firstGoalRecord(stats))} color={colors.textSecondary} landscape={landscape} />
          {landscape ? (
            <>
              <StatTableCell value={fmtStat(l5, Boolean(stats))} color={colors.textSecondary} landscape />
              <StatTableCell value={fmtStat(l10, Boolean(stats))} color={colors.textSecondary} landscape />
              <StatTableCell value={firstGoalLabel(firstGoalRecord(stats, 5))} color={colors.textSecondary} landscape />
              <StatTableCell value={firstGoalLabel(firstGoalRecord(stats, 10))} color={colors.textSecondary} landscape />
            </>
          ) : (
            <>
              <StatTableCell value={firstGoalLabel(firstGoalRecord(stats, 10))} color={colors.textSecondary} />
              <StatTableCell value={firstGoalLabel(firstGoalRecord(stats, 5))} color={colors.textSecondary} />
            </>
          )}
        </>
      ) : (
        <>
          <StatTableCell value={fmtStat(season, Boolean(stats))} color={statColor(season, line, side)} landscape={landscape} />
          <StatTableCell value={fmtStat(landscape ? l5 : l10, Boolean(stats))} color={statColor(landscape ? l5 : l10, line, side)} landscape={landscape} />
          <StatTableCell value={fmtStat(landscape ? l10 : l5, Boolean(stats))} color={statColor(landscape ? l10 : l5, line, side)} landscape={landscape} />
          {landscape ? (
            <StatTableCell value={sideHitCount(l5Values, line, side)} color={hitRateColor(sideHitRate(l5Values, line, side))} landscape />
          ) : null}
          {landscape ? (
            <StatTableCell value={sideHitCount(l10Values, line, side)} color={hitRateColor(sideHitRate(l10Values, line, side))} landscape />
          ) : null}
        </>
      )}
      {showL10Under ? (
        landscape ? null : (
          <View style={[styles.cell, styles.edgeCell]}>
            <AppText style={[styles.edgeScore, { color: hitRateColor(l5UnderRate) }]} numberOfLines={1}>
              {hitRateLabel(l5UnderRate)}
            </AppText>
          </View>
        )
      ) : (
        <View style={[styles.cell, landscape && styles.landscapeCell, styles.edgeCell, landscape && styles.landscapeEdgeCell]}>
          <AppText style={[styles.edgeScore, { color: edge?.color || colors.gold }]} numberOfLines={1}>{edge ? (edge.score ? Math.round(edge.score) : '-') : preview ? 'PRO' : '-'}</AppText>
          <AppText style={[styles.edgeLabel, { color: edge?.color || colors.gold }]} numberOfLines={1}>{edgeLabelText}</AppText>
        </View>
      )}
    </Pressable>
  )
}

function StatTableCell({ value, color, landscape = false }: { value: string; color: string; landscape?: boolean }) {
  return (
    <View style={[styles.cell, landscape && styles.landscapeCell]}>
      <AppText style={[styles.statCellValue, landscape && styles.landscapeStatCellValue, { color }]} numberOfLines={1}>{value}</AppText>
    </View>
  )
}

export function PropCard({ prop, stats }: { prop: FlattenedProp; stats?: Record<string, any> }) {
  const label = marketLabel(prop.market.key)
  const line = prop.outcome.point ?? (isNhlGoalScorerMarket(prop.market.key) || prop.market.key === 'player_anytime_td' ? 0.5 : 0)
  const season = getStat(stats, prop.market.key, 'season')
  const l10 = getStat(stats, prop.market.key, 'l10')
  const l5 = getStat(stats, prop.market.key, 'l5')
  const l10Hit = hitRate(recentValues(stats, prop.market.key, 10), line)
  const edge = edgeLabel(line, season, l10, l5, prop.outcome.price)

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
          <StatPill label="Avg" value={fmtStat(season, Boolean(stats))} color={statColor(season, line)} />
          <StatPill label="L10" value={fmtStat(l10, Boolean(stats))} color={statColor(l10, line)} />
          <StatPill label="L5" value={fmtStat(l5, Boolean(stats))} color={statColor(l5, line)} />
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
  gameTitleCompact: {
    fontSize: 20,
    lineHeight: 23,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  landscapeTable: {
    width: '100%',
  },
  cell: {
    width: 54,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingRight: 5,
  },
  landscapeCell: {
    width: 64,
  },
  playerCell: {
    flex: 1.65,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  landscapePlayerCell: {
    flex: 1.9,
  },
  playerName: {
    color: colors.gold,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  playerSubline: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 15,
  },
  sublineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minWidth: 0,
  },
  playerSublineText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 15,
  },
  sublineChip: {
    marginLeft: 10,
    fontSize: 12,
    lineHeight: 15,
  },
  lineLink: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.6,
  },
  bookCell: {
    width: 50,
  },
  bookCellText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  edgeCell: {
    width: 58,
    alignItems: 'flex-end',
    paddingRight: 0,
  },
  landscapeEdgeCell: {
    width: 60,
  },
  headerText: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3,
  },
  landscapeHeaderText: {
    fontSize: 10,
    letterSpacing: 1.5,
  },
  headerTextActive: {
    color: colors.gold,
  },
  statCellValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  landscapeStatCellValue: {
    fontSize: 16,
    lineHeight: 20,
  },
  edgeScore: {
    fontSize: 21,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'right',
  },
  edgeLabel: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  marketRail: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  marketButton: {
    minWidth: 106,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  nflMarketButton: {
    minWidth: 86,
  },
  marketButtonActive: {
    borderColor: colors.gold,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  search: {
    flex: 1,
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
  doneButton: {
    minHeight: 46,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 10,
    backgroundColor: 'rgba(198,145,50,.12)',
    paddingHorizontal: spacing.md,
  },
  doneButtonText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  gameFilterRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  gameFilterButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
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
