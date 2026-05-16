import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { GameLineCard } from '@/components/dashboard/GameLineCard'
import { PlayerProfileModal, type PlayerProfileMarketContext } from '@/components/dashboard/PlayerProfileModal'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { API_BASE_URL, kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtOdds, normalizeName } from '@/lib/format'
import { useMobileConfig } from '@/lib/mobileConfig'
import { BOOK_DISPLAY_NAMES, PROP_BOOK_KEYS } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, WeatherInfo } from '@/types'

type SheetKey = 'hits' | 'hr' | 'tb' | 'k' | 'hot' | 'bvp' | 'lines' | 'td' | 'qbtd'
type ToolMode = 'sheets' | 'calculators' | 'factors'
type CalculatorKey = 'unit' | 'ev' | 'novig' | 'kelly' | 'parlay' | 'hedge'
type FactorSport = 'MLB' | 'NFL'

const SHEETS: Array<{
  key: SheetKey
  label: string
  desc: string
  type: 'props' | 'k' | 'bvp' | 'lines' | 'td'
  market?: string
  statField?: string
  trend?: boolean
}> = [
  { key: 'hits', label: 'Hits Bet/Fade', desc: 'Hit props ranked by form, hit rate, price, and edge.', type: 'props', market: 'batter_hits', statField: 'hits_per_game' },
  { key: 'hr', label: 'HR Targets', desc: 'Home run targets with power form and playable prices.', type: 'props', market: 'batter_home_runs', statField: 'hr_per_game' },
  { key: 'tb', label: 'Hot Total Bases', desc: 'Total bases targets with season and recent production.', type: 'props', market: 'batter_total_bases', statField: 'tb_per_game' },
  { key: 'k', label: 'Safe Alt K', desc: 'Pitcher strikeout looks ranked by recent K form.', type: 'k', market: 'pitcher_strikeouts', statField: 'strikeouts_per_game' },
  { key: 'hot', label: 'Hot Hitters', desc: 'Players whose recent hit form is running above their season baseline.', type: 'props', market: 'batter_hits', statField: 'hits_per_game', trend: true },
  { key: 'bvp', label: 'Batter vs Pitcher', desc: "Career batter history against today's probable starter.", type: 'bvp' },
  { key: 'lines', label: 'Game Lines & Edge', desc: "Today's MLB moneylines, totals, and weather context.", type: 'lines' },
  { key: 'td', label: 'NFL TD Streaks', desc: 'Regular-season touchdown scoring streaks by player.', type: 'td' },
  { key: 'qbtd', label: 'NFL QB 2+ TD Streaks', desc: 'Quarterbacks on recent streaks of 2+ passing touchdown games.', type: 'td' },
]

const TEAM_NAME_TO_ABBR: Record<string, string> = {
  'New York Yankees': 'NYY', 'Boston Red Sox': 'BOS', 'Toronto Blue Jays': 'TOR',
  'Baltimore Orioles': 'BAL', 'Tampa Bay Rays': 'TB', 'Chicago White Sox': 'CWS',
  'Cleveland Guardians': 'CLE', 'Detroit Tigers': 'DET', 'Kansas City Royals': 'KC',
  'Minnesota Twins': 'MIN', 'Houston Astros': 'HOU', 'Los Angeles Angels': 'LAA',
  'Oakland Athletics': 'OAK', 'Athletics': 'OAK', 'Seattle Mariners': 'SEA', 'Texas Rangers': 'TEX',
  'Atlanta Braves': 'ATL', 'Miami Marlins': 'MIA', 'New York Mets': 'NYM',
  'Philadelphia Phillies': 'PHI', 'Washington Nationals': 'WAS', 'Chicago Cubs': 'CHC',
  'Cincinnati Reds': 'CIN', 'Milwaukee Brewers': 'MIL', 'Pittsburgh Pirates': 'PIT',
  'St. Louis Cardinals': 'STL', 'Los Angeles Dodgers': 'LAD', 'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF', 'Colorado Rockies': 'COL', 'Arizona Diamondbacks': 'ARI',
}

const MLB_FACTOR_BASELINES: Record<string, { venue: string; score: number; environment: string; market: string }> = {
  'Colorado Rockies': { venue: 'Coors Field', score: 92, environment: 'Elite hitter park', market: 'Totals / HR props' },
  'Cincinnati Reds': { venue: 'Great American Ball Park', score: 84, environment: 'Power-friendly', market: 'HR props' },
  'New York Yankees': { venue: 'Yankee Stadium', score: 80, environment: 'Short porch', market: 'Lefty power' },
  'Philadelphia Phillies': { venue: 'Citizens Bank Park', score: 76, environment: 'Hitter lean', market: 'Totals / HR props' },
  'Chicago Cubs': { venue: 'Wrigley Field', score: 62, environment: 'Weather sensitive', market: 'Totals' },
  'Boston Red Sox': { venue: 'Fenway Park', score: 64, environment: 'Contact-friendly', market: 'Doubles / total bases' },
  'Atlanta Braves': { venue: 'Truist Park', score: 64, environment: 'Balanced hitter lean', market: 'Totals / HR props' },
  'Houston Astros': { venue: 'Daikin Park', score: 58, environment: 'Controlled roof', market: 'Contact / power' },
  'San Francisco Giants': { venue: 'Oracle Park', score: 34, environment: 'Run suppression', market: 'Unders / pitching props' },
  'San Diego Padres': { venue: 'Petco Park', score: 38, environment: 'Pitcher-friendly', market: 'Unders / pitching props' },
  'Seattle Mariners': { venue: 'T-Mobile Park', score: 40, environment: 'Pitcher-friendly', market: 'Unders / pitching props' },
  'Detroit Tigers': { venue: 'Comerica Park', score: 42, environment: 'Deep power alleys', market: 'Unders / extra bases fade' },
}

const NFL_FACTOR_BASELINES: Record<string, { venue: string; score: number; environment: string; market: string }> = {
  'Arizona Cardinals': { venue: 'State Farm Stadium', score: 73, environment: 'Controlled roof', market: 'Passing / kicking' },
  'Atlanta Falcons': { venue: 'Mercedes-Benz Stadium', score: 76, environment: 'Controlled dome', market: 'Passing / overs' },
  'Baltimore Ravens': { venue: 'M&T Bank Stadium', score: 54, environment: 'Outdoor balanced', market: 'Rushing / totals' },
  'Buffalo Bills': { venue: 'Highmark Stadium', score: 38, environment: 'Outdoor wind risk', market: 'Totals / passing / kicking' },
  'Carolina Panthers': { venue: 'Bank of America Stadium', score: 58, environment: 'Outdoor balanced', market: 'Totals / passing' },
  'Cleveland Browns': { venue: 'Cleveland Browns Stadium', score: 40, environment: 'Lake weather', market: 'Totals / kicking' },
  'Chicago Bears': { venue: 'Soldier Field', score: 42, environment: 'Outdoor wind risk', market: 'Totals / passing' },
  'Cincinnati Bengals': { venue: 'Paycor Stadium', score: 52, environment: 'Outdoor riverfront', market: 'Totals / passing' },
  'Denver Broncos': { venue: 'Empower Field at Mile High', score: 64, environment: 'Altitude edge', market: 'Kicking / deep passing' },
  'Green Bay Packers': { venue: 'Lambeau Field', score: 46, environment: 'Cold weather', market: 'Totals / rushing' },
  'Houston Texans': { venue: 'NRG Stadium', score: 72, environment: 'Controlled roof', market: 'Passing / kicking' },
  'Indianapolis Colts': { venue: 'Lucas Oil Stadium', score: 73, environment: 'Controlled roof', market: 'Passing / kicking' },
  'Jacksonville Jaguars': { venue: 'EverBank Stadium', score: 60, environment: 'Florida heat', market: 'Conditioning / totals' },
  'Kansas City Chiefs': { venue: 'Arrowhead Stadium', score: 51, environment: 'Outdoor weather', market: 'Totals / passing' },
  'Pittsburgh Steelers': { venue: 'Acrisure Stadium', score: 48, environment: 'Outdoor weather', market: 'Totals / kicking' },
  'Miami Dolphins': { venue: 'Hard Rock Stadium', score: 62, environment: 'Heat edge', market: 'Conditioning / totals' },
  'New England Patriots': { venue: 'Gillette Stadium', score: 45, environment: 'Cold / wind risk', market: 'Totals / kicking' },
  'New York Giants': { venue: 'MetLife Stadium', score: 49, environment: 'Outdoor wind risk', market: 'Totals / passing' },
  'New York Jets': { venue: 'MetLife Stadium', score: 49, environment: 'Outdoor wind risk', market: 'Totals / passing' },
  'Philadelphia Eagles': { venue: 'Lincoln Financial Field', score: 51, environment: 'Outdoor balanced', market: 'Rushing / totals' },
  'San Francisco 49ers': { venue: 'Levi\'s Stadium', score: 58, environment: 'Mild outdoor', market: 'Efficiency / totals' },
  'Seattle Seahawks': { venue: 'Lumen Field', score: 47, environment: 'Rain / wind risk', market: 'Totals / passing' },
  'Tampa Bay Buccaneers': { venue: 'Raymond James Stadium', score: 61, environment: 'Florida heat', market: 'Conditioning / totals' },
  'Tennessee Titans': { venue: 'Nissan Stadium', score: 56, environment: 'Outdoor balanced', market: 'Rushing / totals' },
  'Washington Commanders': { venue: 'Northwest Stadium', score: 52, environment: 'Outdoor balanced', market: 'Totals / passing' },
  'Dallas Cowboys': { venue: 'AT&T Stadium', score: 74, environment: 'Controlled dome', market: 'Passing / kicking' },
  'Detroit Lions': { venue: 'Ford Field', score: 78, environment: 'Dome track', market: 'Passing / overs' },
  'Minnesota Vikings': { venue: 'U.S. Bank Stadium', score: 74, environment: 'Controlled dome', market: 'Passing / kicking' },
  'New Orleans Saints': { venue: 'Caesars Superdome', score: 77, environment: 'Dome track', market: 'Passing / overs' },
  'Las Vegas Raiders': { venue: 'Allegiant Stadium', score: 73, environment: 'Controlled dome', market: 'Passing / kicking' },
  'Los Angeles Rams': { venue: 'SoFi Stadium', score: 75, environment: 'Indoor-style', market: 'Passing / overs' },
  'Los Angeles Chargers': { venue: 'SoFi Stadium', score: 75, environment: 'Indoor-style', market: 'Passing / overs' },
}

const STAT_TO_RAW: Record<string, string> = {
  hits_per_game: 'hits',
  hr_per_game: 'hr',
  tb_per_game: 'tb',
  strikeouts_per_game: 'strikeouts',
}

const SHEET_BOOK_NAMES: Record<string, string> = {
  betmgm: 'BetMGM',
  betrivers: 'BetRivers',
  caesars: 'Caesars',
  draftkings: 'DraftKings',
  espnbet: 'ESPN BET',
  fanduel: 'FanDuel',
  fanatics: 'Fanatics',
  hardrockbet: 'Hard Rock Bet',
  pointsbetus: 'PointsBet',
  williamhill_us: 'Caesars',
}

const TOOL_MODES: Array<{ key: ToolMode; label: string }> = [
  { key: 'sheets', label: 'Cheat Sheets' },
  { key: 'calculators', label: 'Calculators' },
  { key: 'factors', label: 'Game Factors' },
]

const MAX_CHEAT_SHEET_STAT_PLAYERS = 110

const CALCULATORS: Array<{ key: CalculatorKey; label: string; desc: string }> = [
  { key: 'unit', label: 'Unit Plan', desc: 'Turn bankroll and risk percent into unit sizes and daily guardrails.' },
  { key: 'ev', label: 'EV', desc: 'Compare your true probability against the book price.' },
  { key: 'novig', label: 'No-Vig', desc: 'Strip the book margin from a two-way market.' },
  { key: 'kelly', label: 'Kelly', desc: 'Turn bankroll, price, and edge into a stake guide.' },
  { key: 'parlay', label: 'Parlay', desc: 'Combine American odds into payout and profit.' },
  { key: 'hedge', label: 'Hedge', desc: 'Estimate the other-side stake for a guaranteed result.' },
]

interface LineupPlayer {
  id: number
  name: string
  team?: string
  position?: string
}

interface SheetRow {
  divider?: boolean
  label?: string
  player: string
  matchup: string
  line: number
  odds?: number
  book?: string
  season: number
  l10: number
  l5: number
  hitRate: string
  reason: string
  edge: { label: string; color: string; score: number }
  pickLabel?: string
}

interface BvpMatchup {
  batterID: string
  pitcherID: string
  batterName: string
  pitcherName: string
  gameLabel: string
}

interface BvpRow {
  key: string
  player: string
  pitcher: string
  gameLabel: string
  ab: number
  avg: string
  hr: number
  rbi: number
  ops: string
}

interface FactorRow {
  id: string
  matchup: string
  time: string
  venue: string
  environment: string
  weather: string
  score: number
  lean: string
  tone: string
  tags: string[]
}

interface TdStreakRow {
  player: string
  team: string
  position: string
  streak_games: number
  two_td_games?: number
  games?: number
  two_td_rate?: string
}

function getStat(stats: Record<string, any> | undefined, field: string, prefix: 'season' | 'l10' | 'l5') {
  return stats?.[`${prefix}_${field}`] || 0
}

function hitRate(stats: Record<string, any> | undefined, field: string, line: number, count: number) {
  const rawKey = STAT_TO_RAW[field]
  const raw = stats?.raw_games
  if (!rawKey || !Array.isArray(raw) || raw.length === 0) return { label: '-', value: 0 }
  const sample = raw.slice(0, count)
  const hits = sample.filter((game: any) => (game[rawKey] || 0) > line).length
  return { label: `${hits}/${sample.length}`, value: sample.length ? hits / sample.length : 0 }
}

function edgeLabel(line: number, season: number, l10: number, l5: number, hitValue: number, odds?: number) {
  const safeLine = Math.max(line || 0, 0.5)
  const avgRatio = (season / safeLine) * 0.4 + ((l10 || season) / safeLine) * 0.25 + ((l5 || season) / safeLine) * 0.35
  const implied = odds && odds > 0 ? 100 / (odds + 100) : odds ? Math.abs(odds) / (Math.abs(odds) + 100) : 0.58
  const avgScore = Math.max(0, Math.min(45, ((avgRatio - 0.75) / 0.65) * 45))
  const hitScore = hitValue * 35
  const priceScore = implied <= 0.52 ? 20 : implied <= 0.58 ? 15 : implied <= 0.65 ? 9 : implied <= 0.72 ? 4 : 0
  const score = Math.round(avgScore + hitScore + priceScore)

  if (score >= 78) return { label: `Strong ${score}`, color: colors.gold, score }
  if (score >= 64) return { label: `Lean ${score}`, color: colors.green, score }
  if (score >= 45) return { label: `Neutral ${score}`, color: colors.textSecondary, score }
  return { label: `Fade ${score}`, color: colors.red, score }
}

function fmt(value: number) {
  return value ? value.toFixed(2) : '-'
}

function teamAbbr(name?: string) {
  return TEAM_NAME_TO_ABBR[name || ''] || name || ''
}

function findLineupPlayer(lineupMap: Record<string, LineupPlayer> | undefined, playerName?: string) {
  if (!lineupMap || !playerName) return undefined
  const normalized = normalizeName(playerName)
  const direct = lineupMap[normalized]
  if (direct) return direct

  const compact = normalized.replace(/\s/g, '')
  return Object.entries(lineupMap).find(([key]) => {
    if (!key) return false
    const keyCompact = key.replace(/\s/g, '')
    return key === normalized || keyCompact === compact || key.includes(normalized) || normalized.includes(key)
  })?.[1]
}

function getBestBatterOutcomes(game: Game) {
  const outcomes: Array<{ player: string }> = []
  const seen = new Set<string>()

  game.bookmakers?.forEach((book) => {
    book.markets?.forEach((market) => {
      if (!market.key || market.key.startsWith('pitcher_')) return
      market.outcomes?.forEach((outcome) => {
        if (!outcome.description) return
        const key = normalizeName(outcome.description)
        if (seen.has(key)) return
        seen.add(key)
        outcomes.push({ player: outcome.description })
      })
    })
  })

  return outcomes
}

function buildBvpMatchups(
  games: Game[],
  lineups: Record<string, LineupPlayer> | undefined,
  pitcherMap: Record<string, string> = {},
  pitcherNameMap: Record<string, string> = {},
) {
  if (!lineups) return []

  const seen = new Set<string>()
  const matchups: BvpMatchup[] = []

  games.forEach((game) => {
    const awayAbbr = teamAbbr(game.away_team)
    const homeAbbr = teamAbbr(game.home_team)
    const awayPitcherId = pitcherMap[awayAbbr]
    const homePitcherId = pitcherMap[homeAbbr]
    const awayPitcherName = pitcherNameMap[awayAbbr] || 'probable starter'
    const homePitcherName = pitcherNameMap[homeAbbr] || 'probable starter'

    getBestBatterOutcomes(game).forEach((outcome) => {
      const lineup = findLineupPlayer(lineups, outcome.player)
      if (!lineup?.id) return

      const batterTeam = teamAbbr(lineup.team)
      const pitcherID = batterTeam === awayAbbr ? homePitcherId : batterTeam === homeAbbr ? awayPitcherId : ''
      const pitcherName = batterTeam === awayAbbr ? homePitcherName : batterTeam === homeAbbr ? awayPitcherName : ''
      if (!pitcherID) return

      const key = `${lineup.id}_${pitcherID}`
      if (seen.has(key)) return
      seen.add(key)

      matchups.push({
        batterID: String(lineup.id),
        pitcherID,
        batterName: lineup.name,
        pitcherName,
        gameLabel: `${awayAbbr || game.away_team} @ ${homeAbbr || game.home_team}`,
      })
    })
  })

  return matchups
}

function buildBvpRows(bvp: Record<string, any> = {}, matchups: BvpMatchup[] = []) {
  const matchupMeta = new Map(matchups.map((matchup) => [`${matchup.batterID}_${matchup.pitcherID}`, matchup]))

  return Object.entries(bvp)
    .map(([key, value]) => {
      const meta = matchupMeta.get(key)
      if (!meta) return null
      return {
        key,
        player: meta.batterName,
        pitcher: meta.pitcherName,
        gameLabel: meta.gameLabel,
        ab: Number(value?.ab || 0),
        avg: value?.avg || '.000',
        hr: Number(value?.hr || 0),
        rbi: Number(value?.rbi || 0),
        ops: value?.ops || '-',
      }
    })
    .filter((row): row is BvpRow => row !== null && row.ab > 0)
    .sort((a, b) => b.ab - a.ab)
}

function factorBaseline(homeTeam: string, sport: FactorSport) {
  const baseline = sport === 'MLB' ? MLB_FACTOR_BASELINES[homeTeam] : NFL_FACTOR_BASELINES[homeTeam]
  return baseline || {
    venue: sport === 'MLB' ? 'Home ballpark' : 'Home stadium',
    score: 55,
    environment: 'Neutral baseline',
    market: 'Neutral setup',
  }
}

function cleanSkyLabel(sky?: string) {
  const value = String(sky || '').toLowerCase()
  if (value.includes('storm')) return 'Storms'
  if (value.includes('rain')) return 'Rain'
  if (value.includes('drizzle')) return 'Drizzle'
  if (value.includes('cloud')) return 'Cloudy'
  if (value.includes('partly')) return 'Partly cloudy'
  if (value.includes('clear')) return 'Clear'
  return sky || ''
}

function weatherFactor(weather: any, sport: FactorSport) {
  if (!weather) return { delta: 0, label: 'Weather pending', tags: ['Weather pending'] }
  if (weather.indoor) return { delta: 6, label: weather.windStr || 'Controlled', tags: ['Controlled conditions'] }

  let delta = 0
  const tags: string[] = []
  const temp = typeof weather.tempF === 'number' ? weather.tempF : null
  const precip = Number(weather.precipPct || 0)

  if (sport === 'MLB') {
    if (temp !== null && temp >= 80) { delta += 8; tags.push('Warm carry') }
    if (temp !== null && temp <= 55) { delta -= 8; tags.push('Cold suppress') }
    if (weather.windImpact === 'boost') { delta += 9; tags.push('Wind boost') }
    if (weather.windImpact === 'suppress') { delta -= 9; tags.push('Wind suppress') }
    if (precip >= 35) { delta -= 4; tags.push('Rain risk') }
  } else {
    if (weather.windImpact === 'suppress') { delta -= 14; tags.push('Wind risk') }
    if (temp !== null && temp <= 32) { delta -= 6; tags.push('Cold risk') }
    if (temp !== null && temp >= 82) { delta += 4; tags.push('Heat edge') }
    if (precip >= 35) { delta -= 7; tags.push('Rain risk') }
  }

  const tempText = temp === null ? '' : `${temp}F`
  const rainText = precip >= 25 ? `, ${precip}% rain` : ''
  const label = [cleanSkyLabel(weather.sky), tempText, weather.windStr].filter(Boolean).join(' · ') + rainText
  return { delta, label: label || 'Weather neutral', tags: tags.length ? tags : ['Weather neutral'] }
}

function factorTone(score: number) {
  if (score >= 72) return { tone: colors.green, lean: 'Boost' }
  if (score <= 43) return { tone: colors.red, lean: 'Suppress' }
  return { tone: colors.gold, lean: 'Watch' }
}

function buildFactorRows(games: Game[] = [], weatherData: Record<string, any> = {}, sport: FactorSport) {
  return games
    .filter((game) => new Date(game.commence_time).getTime() > Date.now() - 3 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
    .map((game) => {
      const id = game.id || game.game_id || `${game.away_team}-${game.home_team}`
      const baseline = factorBaseline(game.home_team, sport)
      const weather = weatherFactor(weatherData[id], sport)
      const score = Math.max(1, Math.min(100, Math.round(baseline.score + weather.delta)))
      const tone = factorTone(score)
      return {
        id,
        matchup: `${game.away_team} @ ${game.home_team}`,
        time: new Date(game.commence_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }),
        venue: weatherData[id]?.park || weatherData[id]?.stadium || baseline.venue,
        environment: baseline.environment,
        weather: weather.label,
        score,
        lean: tone.lean,
        tone: tone.tone,
        tags: [baseline.market, ...weather.tags],
      }
    })
}

function parseTdStreakCsv(csv: string): TdStreakRow[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [player, team, position, streakGames] = line.split(',').map((value) => value.trim())
      return {
        player,
        team,
        position,
        streak_games: Number(streakGames) || 0,
      }
    })
    .filter((row) => row.player && row.team && row.position && row.streak_games > 0)
    .sort((a, b) => b.streak_games - a.streak_games || a.player.localeCompare(b.player))
}

function parseQbTdCsv(csv: string): TdStreakRow[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [player, team, position, streakGames, twoTdGames, games, twoTdRate] = line.split(',').map((value) => value.trim())
      return {
        player,
        team,
        position,
        streak_games: Number(streakGames) || 0,
        two_td_games: Number(twoTdGames) || 0,
        games: Number(games) || 0,
        two_td_rate: twoTdRate,
      }
    })
    .filter((row) => row.player && row.team && row.position && row.streak_games >= 2)
    .sort((a, b) => b.streak_games - a.streak_games || (b.two_td_games || 0) - (a.two_td_games || 0) || a.player.localeCompare(b.player))
}

function fmtMoney(value: number) {
  if (!Number.isFinite(value)) return '-'
  return `$${value.toFixed(2)}`
}

function americanToDecimal(odds: number) {
  if (odds > 0) return odds / 100 + 1
  return 100 / Math.abs(odds) + 1
}

function decimalToAmerican(decimal: number) {
  if (!Number.isFinite(decimal) || decimal <= 1) return 0
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

function impliedProbability(odds: number) {
  if (!Number.isFinite(odds) || odds === 0) return 0
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(/[$,%]/g, '').trim())
  return Number.isFinite(parsed) ? parsed : NaN
}

function formatSavedAt(value?: string, sheetDate?: string) {
  if (!sheetDate && !value) return 'Locks daily at 9:05 AM CT'
  const dateLabel = new Date(sheetDate ? `${sheetDate}T12:00:00` : value || '').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const publishedAt = value ? new Date(value) : null
  const timeLabel = publishedAt && Number.isFinite(publishedAt.getTime())
    ? publishedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : '9:05 AM CT'
  return `For ${dateLabel}, locks ${timeLabel} daily`
}

function sheetReason(sheetKey: SheetKey, row: { line: number; season: number; l10: number; l5: number; hitRate: string; odds?: number }) {
  const recent = row.l5 > row.season ? `L5 form (${fmt(row.l5)}) is above season pace (${fmt(row.season)})` : `season pace (${fmt(row.season)}) supports the line`
  const l5Hot = row.l5 > row.line
  const l10Hot = row.l10 > row.line
  const surge = row.l5 > row.l10 && row.l10 > row.season

  if (sheetKey === 'hr') {
    return row.l5 > row.season
      ? `Power trend is up, with recent form above season pace.`
      : `Power profile fits the card, with season form supporting the look.`
  }
  if (sheetKey === 'k') {
    return row.l10 > row.line
      ? `Recent K form clears this number.`
      : `Strikeout profile fits this number.`
  }
  if (sheetKey === 'hot') {
    if (surge) return `Heating up now: L5 (${fmt(row.l5)}) is ahead of L10 (${fmt(row.l10)}) and season pace.`
    if (l5Hot && l10Hot) return `Hot in both windows: L5 ${fmt(row.l5)} and L10 ${fmt(row.l10)} clear this line.`
    return `Recent form jump: ${recent}.`
  }
  if (sheetKey === 'tb') {
    return l5Hot
      ? `Last 5 total-base pace (${fmt(row.l5)}) clears this line.`
      : l10Hot
        ? `Last 10 total-base pace (${fmt(row.l10)}) clears this line.`
      : `Total-base profile fits this number.`
  }
  return row.hitRate !== '-'
    ? `L10 hit rate ${row.hitRate}; ${recent}.`
    : `${recent}.`
}

function bestOutcomes(game: Game, marketKey: string) {
  const map: Record<string, { player: string; line: number; odds?: number; book?: string }> = {}

  game.bookmakers?.forEach((bookmaker) => {
    if (!PROP_BOOK_KEYS.includes(bookmaker.key)) return
    const market = bookmaker.markets?.find((item) => item.key === marketKey)
    market?.outcomes?.forEach((outcome) => {
      if (!outcome.description || outcome.name !== 'Over') return
      if (typeof outcome.price !== 'number' || outcome.price > 700 || outcome.price < -10000) return
      const line = outcome.point || 0.5
      const key = `${outcome.description}-${line}`
      if (!map[key] || outcome.price > (map[key].odds || -10000)) {
        map[key] = {
          player: outcome.description,
          line,
          odds: outcome.price,
          book: SHEET_BOOK_NAMES[bookmaker.key] || BOOK_DISPLAY_NAMES[bookmaker.key] || bookmaker.key,
        }
      }
    })
  })

  return Object.values(map)
}

function bestHitFadeOutcomes(game: Game) {
  const map: Record<string, {
    player: string
    line: number
    overOdds?: number
    overBook?: string
    underOdds?: number
    underBook?: string
  }> = {}

  game.bookmakers?.forEach((bookmaker) => {
    if (!PROP_BOOK_KEYS.includes(bookmaker.key)) return
    const market = bookmaker.markets?.find((item) => item.key === 'batter_hits')
    market?.outcomes?.forEach((outcome) => {
      if (!outcome.description) return
      if (typeof outcome.price !== 'number' || outcome.price > 700 || outcome.price < -10000) return
      const line = outcome.point || 0.5
      if (line !== 0.5) return
      const key = `${outcome.description}-${line}`
      map[key] ||= { player: outcome.description, line }
      const book = SHEET_BOOK_NAMES[bookmaker.key] || BOOK_DISPLAY_NAMES[bookmaker.key] || bookmaker.key

      if (outcome.name === 'Over' && (!map[key].overOdds || outcome.price > (map[key].overOdds || -10000))) {
        map[key].overOdds = outcome.price
        map[key].overBook = book
      }

      if (outcome.name === 'Under' && (!map[key].underOdds || outcome.price > (map[key].underOdds || -10000))) {
        map[key].underOdds = outcome.price
        map[key].underBook = book
      }
    })
  })

  return Object.values(map)
}

function buildHitFadeRows(
  games: Game[],
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  bvp: Record<string, any> = {},
  matchups: BvpMatchup[] = [],
) {
  const rows: Array<SheetRow & { fadeScore: number; underOdds?: number; underBook?: string }> = []
  const bvpByBatter = new Map(matchups.map((matchup) => [matchup.batterID, bvp[`${matchup.batterID}_${matchup.pitcherID}`]]))

  games.forEach((game) => {
    bestHitFadeOutcomes(game).forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return

      const season = getStat(playerStats, 'hits_per_game', 'season')
      const l10 = getStat(playerStats, 'hits_per_game', 'l10')
      const l5 = getStat(playerStats, 'hits_per_game', 'l5')
      if (!season && !l10 && !l5) return

      const matchupBvp = lineup ? bvpByBatter.get(String(lineup.id)) : null
      const vsSpAb = Number(matchupBvp?.ab || 0)
      const vsSpHits = Number(matchupBvp?.hits || 0)
      const vsSpHitRate = vsSpAb > 0 ? vsSpHits / vsSpAb : 0
      const hr = hitRate(playerStats, 'hits_per_game', outcome.line, 10)
      const overMarket = impliedProbability(outcome.overOdds || 0)
      const underMarket = impliedProbability(outcome.underOdds || 0)
      const starterZeroScore =
        vsSpAb >= 8 && vsSpHits === 0 ? 62 :
        vsSpAb >= 5 && vsSpHits === 0 ? 48 :
        vsSpAb >= 3 && vsSpHits === 0 ? 34 :
        vsSpAb >= 6 && vsSpHitRate <= 0.167 ? 32 :
        vsSpAb >= 3 && vsSpHitRate <= 0.200 ? 20 :
        vsSpAb >= 3 ? Math.max(0, 18 - vsSpHitRate * 60) :
        6
      const hitScore = Math.round(
        Math.min(l5 / 1.0, 1.5) * 34 +
        Math.min(l10 / 1.0, 1.4) * 18 +
        (vsSpAb >= 3 ? Math.min(vsSpHitRate / 0.34, 1.6) * 32 : 8) +
        overMarket * 16
      )
      const fadeScore = Math.round(
        starterZeroScore +
        Math.max(0, 1 - Math.min(l5 / 0.70, 1)) * 28 +
        Math.max(0, 1 - Math.min(l10 / 0.80, 1)) * 14 +
        underMarket * 12
      )
      const overEdge = hitScore >= 78
        ? { label: `Strong ${hitScore}`, color: colors.gold, score: hitScore }
        : hitScore >= 64
          ? { label: `Lean ${hitScore}`, color: colors.green, score: hitScore }
          : hitScore >= 48
            ? { label: `Neutral ${hitScore}`, color: colors.textSecondary, score: hitScore }
            : { label: `Fade ${hitScore}`, color: colors.red, score: hitScore }

      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.overOdds,
        book: outcome.overBook,
        underOdds: outcome.underOdds,
        underBook: outcome.underBook,
        season,
        l10,
        l5,
        hitRate: hr.label,
        reason: sheetReason('hits', { line: outcome.line, season, l10, l5, hitRate: hr.label, odds: outcome.overOdds }),
        edge: overEdge,
        fadeScore,
        pickLabel: `Over ${outcome.line} Hits`,
      })
    })
  })

  const bets = rows
    .filter((row) => row.odds !== undefined && row.edge.score >= 60)
    .sort((a, b) => {
      if (b.edge.score !== a.edge.score) return b.edge.score - a.edge.score
      return b.l5 - a.l5
    })
    .slice(0, 5)

  const used = new Set(bets.map((row) => `${row.player}_${row.line}`))
  const fades = rows
    .filter((row) => !used.has(`${row.player}_${row.line}`) && row.underOdds !== undefined)
    .map((row) => ({
      ...row,
      odds: row.underOdds,
      book: row.underBook,
      reason: row.hitRate !== '-'
        ? `Fade profile: L10 hit rate ${row.hitRate}, with L5 ${fmt(row.l5)} and season ${fmt(row.season)}.`
        : `Fade profile: L5 ${fmt(row.l5)} and season ${fmt(row.season)} sit below the 0.5-hit line.`,
      edge: { label: `Under ${row.fadeScore}`, color: colors.red, score: row.fadeScore },
      pickLabel: `Under ${row.line} Hits`,
    }))
    .sort((a, b) => {
      if (b.fadeScore !== a.fadeScore) return b.fadeScore - a.fadeScore
      return a.l5 - b.l5
    })
    .slice(0, 5)

  return fades.length > 0
    ? [...bets, { divider: true, label: 'FADES - UNDER LEANS' } as SheetRow, ...fades]
    : bets
}

function buildRows(
  games: Game[],
  marketKey: string,
  statField: string,
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  sheetKey: SheetKey,
  trend = false,
  bvp: Record<string, any> = {},
  matchups: BvpMatchup[] = [],
) {
  if (sheetKey === 'hits') return buildHitFadeRows(games, lineupMap, stats, bvp, matchups)

  const rows: SheetRow[] = []

  games.forEach((game) => {
    bestOutcomes(game, marketKey).forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return
      const season = getStat(playerStats, statField, 'season')
      const l10 = getStat(playerStats, statField, 'l10')
      const l5 = getStat(playerStats, statField, 'l5')
      const hr = hitRate(playerStats, statField, outcome.line, 10)
      const edge = edgeLabel(outcome.line, season, l10, l5, hr.value, outcome.odds)
      const trendBoost = trend ? Math.max(0, l5 - season) * 12 : 0
      const boostedScore = Math.min(100, Math.round(edge.score + trendBoost))
      const boostedEdge = trend
        ? {
            score: boostedScore,
            label: boostedScore >= 78 ? `Strong ${boostedScore}` : boostedScore >= 64 ? `Lean ${boostedScore}` : boostedScore >= 45 ? `Neutral ${boostedScore}` : `Fade ${boostedScore}`,
            color: boostedScore >= 78 ? colors.gold : boostedScore >= 64 ? colors.green : boostedScore >= 45 ? colors.textSecondary : colors.red,
          }
        : edge

      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.odds,
        book: outcome.book,
        season,
        l10,
        l5,
        hitRate: hr.label,
        reason: sheetReason(sheetKey, { line: outcome.line, season, l10, l5, hitRate: hr.label, odds: outcome.odds }),
        edge: boostedEdge,
      })
    })
  })

  return rows
    .sort((a, b) => b.edge.score - a.edge.score)
    .slice(0, 30)
}

export default function CheatSheetsScreen() {
  const { profile } = useAuth()
  const mobileConfig = useMobileConfig()
  const isPremium = profile?.is_premium === true
  const [toolMode, setToolMode] = useState<ToolMode>('sheets')
  const [selectedKey, setSelectedKey] = useState<SheetKey | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [selectedMarketContext, setSelectedMarketContext] = useState<PlayerProfileMarketContext | null>(null)
  const [calculatorKey, setCalculatorKey] = useState<CalculatorKey>('unit')
  const [factorSport, setFactorSport] = useState<FactorSport>('MLB')
  const [calcInputs, setCalcInputs] = useState<Record<string, string>>({
    unitBankroll: '1000',
    unitPct: '1.5',
    evOdds: '-110',
    evProb: '55',
    evStake: '100',
    novigA: '-110',
    novigB: '-110',
    kellyBankroll: '1000',
    kellyOdds: '-110',
    kellyProb: '55',
    parlayLegs: '-110, +135, -105',
    parlayStake: '25',
    hedgeStake: '100',
    hedgeOdds: '+220',
    hedgeOppOdds: '-140',
  })
  const activeKey = selectedKey || 'hits'
  const activeSheet = SHEETS.find((sheet) => sheet.key === activeKey) || SHEETS[0]
  const hasOpenSheet = selectedKey !== null
  const canLoadData = isPremium && toolMode === 'sheets' && hasOpenSheet
  const isTdSheet = activeSheet.type === 'td'
  const canLoadMlbSheetData = canLoadData && !isTdSheet
  const canLoadFactors = isPremium && toolMode === 'factors'

  const sheetQuery = useQuery({
    queryKey: ['cheat-sheet', activeSheet.type],
    queryFn: () => kingfishFetch<{ data: Game[]; updated_at?: string; published_at?: string; sheet_date?: string }>(`/api/statsheet-data?type=${activeSheet.type}`),
    enabled: canLoadMlbSheetData,
    staleTime: 12 * 60 * 60 * 1000,
  })
  const lineupsQuery = useQuery({
    queryKey: ['mlb-lineups-cheat-sheets'],
    queryFn: () => kingfishFetch<{ players: Record<string, LineupPlayer> }>('/api/mlb-lineups'),
    enabled: canLoadMlbSheetData && activeSheet.type !== 'lines',
    staleTime: 12 * 60 * 60 * 1000,
  })

  const scheduleQuery = useQuery({
    queryKey: ['mlb-schedule-cheat-sheets'],
    queryFn: () => kingfishFetch<{
      pitcherMap?: Record<string, string>
      pitcherNameMap?: Record<string, string>
      pitcherIdNameMap?: Record<string, string>
    }>('/api/mlb-schedule'),
    enabled: canLoadMlbSheetData && (activeKey === 'bvp' || activeKey === 'hits'),
    staleTime: 60 * 60 * 1000,
  })

  const tdStreaksQuery = useQuery({
    queryKey: ['nfl-td-streaks-2026'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/data/nfl/td-streaks-2026.csv`)
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      return parseTdStreakCsv(await response.text())
    },
    enabled: canLoadData && isTdSheet,
    staleTime: 24 * 60 * 60 * 1000,
  })

  const qbTdStreaksQuery = useQuery({
    queryKey: ['nfl-qb-2td-streaks-2026'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/data/nfl/qb-2td-streaks-2026.csv`)
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      return parseQbTdCsv(await response.text())
    },
    enabled: canLoadData && activeKey === 'qbtd',
    staleTime: 24 * 60 * 60 * 1000,
  })

  const sheetGames = useMemo(() => sheetQuery.data?.data || [], [sheetQuery.data?.data])

  const playersToFetch = useMemo(() => {
    if (!activeSheet.market || !lineupsQuery.data?.players || !sheetQuery.data?.data) return { batters: [], pitchers: [] }
    const lineupMap = lineupsQuery.data.players
    const seen = new Set<number>()
    const batters: LineupPlayer[] = []
    const pitchers: LineupPlayer[] = []
    const candidates = sheetGames
      .flatMap((game) => bestOutcomes(game, activeSheet.market || ''))
      .sort((a, b) => (b.odds || -10000) - (a.odds || -10000))

    candidates.forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      if (!lineup || seen.has(lineup.id)) return
      seen.add(lineup.id)
      if (activeSheet.market?.startsWith('pitcher_')) {
        if (pitchers.length < MAX_CHEAT_SHEET_STAT_PLAYERS) pitchers.push(lineup)
      } else if (batters.length < MAX_CHEAT_SHEET_STAT_PLAYERS) {
        batters.push(lineup)
      }
    })
    return { batters, pitchers }
  }, [activeSheet.market, lineupsQuery.data?.players, sheetGames])

  const statsQuery = useQuery({
    queryKey: ['cheat-sheet-stats', activeKey, playersToFetch.batters.map((item) => item.id).join(','), playersToFetch.pitchers.map((item) => item.id).join(',')],
    queryFn: () =>
      kingfishFetch<{ stats: Record<number, any> }>('/api/mlb-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playersToFetch),
      }),
    enabled: canLoadMlbSheetData && activeSheet.type !== 'lines' && (playersToFetch.batters.length > 0 || playersToFetch.pitchers.length > 0),
    staleTime: 12 * 60 * 60 * 1000,
  })

  const weatherQuery = useQuery({
    queryKey: ['cheat-sheet-weather', sheetGames.map((game) => game.id || game.game_id).join(',')],
    queryFn: () =>
      kingfishFetch<Record<string, WeatherInfo>>('/api/mlb-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: sheetGames }),
      }),
    enabled: canLoadMlbSheetData && activeKey === 'lines' && sheetGames.length > 0,
    staleTime: 60 * 60 * 1000,
  })

  const bvpMatchups = useMemo(
    () => buildBvpMatchups(
      sheetGames,
      lineupsQuery.data?.players,
      scheduleQuery.data?.pitcherMap,
      scheduleQuery.data?.pitcherNameMap,
    ),
    [lineupsQuery.data?.players, scheduleQuery.data?.pitcherMap, scheduleQuery.data?.pitcherNameMap, sheetGames],
  )

  const bvpQuery = useQuery({
    queryKey: ['cheat-sheet-bvp-career-v2', bvpMatchups.map((matchup) => `${matchup.batterID}_${matchup.pitcherID}`).join(',')],
    queryFn: () =>
      kingfishFetch<{ bvp: Record<string, any> }>('/api/mlb-bvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchups: bvpMatchups.map(({ batterID, pitcherID }) => ({ batterID, pitcherID })) }),
      }),
    enabled: canLoadMlbSheetData && (activeKey === 'bvp' || activeKey === 'hits') && bvpMatchups.length > 0,
    staleTime: 12 * 60 * 60 * 1000,
  })

  const factorGamesQuery = useQuery({
    queryKey: ['mobile-game-factors-games', factorSport],
    queryFn: async () => {
      if (factorSport === 'MLB') {
        const schedule = await kingfishFetch<{ games?: any[] }>('/api/mlb-schedule')
        return (schedule.games || []).map((game: any) => ({
          id: String(game.gamePk),
          commence_time: game.gameDate,
          away_team: game?.teams?.away?.team?.name || '',
          home_team: game?.teams?.home?.team?.name || '',
          dayNight: game.dayNight,
          doubleHeader: game.doubleHeader,
          status: game?.status?.detailedState || game?.status?.abstractGameState,
          statusReason: game?.status?.reason || '',
          neutralSite: game.neutralSite === true,
          venueName: game?.venue?.name || '',
          gameNumber: Number(game.gameNumber) || undefined,
          bookmakers: [],
        })).filter((game: Game) => game.away_team && game.home_team)
      }

      const nflGames = await kingfishFetch<Game[]>('/api/nfl-odds')
      return nflGames.filter((game) => game.away_team && game.home_team)
    },
    enabled: canLoadFactors,
    staleTime: 60 * 60 * 1000,
  })

  const factorGames = useMemo(() => factorGamesQuery.data || [], [factorGamesQuery.data])

  const factorWeatherQuery = useQuery({
    queryKey: ['mobile-game-factors-weather', factorSport, factorGames.map((game: Game) => game.id || game.game_id).join(',')],
    queryFn: () =>
      kingfishFetch<Record<string, any>>(factorSport === 'MLB' ? '/api/mlb-weather' : '/api/nfl-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: factorGames }),
      }),
    enabled: canLoadFactors && factorGames.length > 0,
    staleTime: 60 * 60 * 1000,
  })

  const rows = activeSheet.market && activeSheet.statField && lineupsQuery.data?.players && statsQuery.data?.stats && sheetGames.length > 0
    ? buildRows(sheetGames, activeSheet.market, activeSheet.statField, lineupsQuery.data.players, statsQuery.data.stats, activeKey, activeSheet.trend, bvpQuery.data?.bvp, bvpMatchups)
    : []

  const bvpRows = activeKey === 'bvp' ? buildBvpRows(bvpQuery.data?.bvp, bvpMatchups) : []
  const tdStreakRows = activeKey === 'td' ? tdStreaksQuery.data || [] : []
  const qbTdRows = activeKey === 'qbtd' ? qbTdStreaksQuery.data || [] : []
  const factorRows = toolMode === 'factors' ? buildFactorRows(factorGames, factorWeatherQuery.data, factorSport) : []

  function openPlayerProfile(player: string, row?: SheetRow) {
    setSelectedPlayer(player)
    if (!row || activeKey === 'bvp') {
      setSelectedMarketContext(null)
      return
    }
    const marketKey =
      activeKey === 'hits' || activeKey === 'hot' ? 'batter_hits' :
      activeKey === 'hr' ? 'batter_home_runs' :
      activeKey === 'tb' ? 'batter_total_bases' :
      activeKey === 'k' ? 'pitcher_strikeouts' :
      undefined
    const marketLabel =
      activeKey === 'hits' || activeKey === 'hot' ? 'Hits' :
      activeKey === 'hr' ? 'Home Runs' :
      activeKey === 'tb' ? 'Total Bases' :
      activeKey === 'k' ? 'Strikeouts' :
      ''
    setSelectedMarketContext(marketKey ? { marketKey, marketLabel, commonLine: row.line } : null)
  }

  const updateCalc = (key: string, value: string) => setCalcInputs((current) => ({ ...current, [key]: value }))

  const calculatorResult = useMemo(() => {
    if (calculatorKey === 'unit') {
      const bankroll = parseNumber(calcInputs.unitBankroll)
      const pct = parseNumber(calcInputs.unitPct)
      if (!Number.isFinite(bankroll) || !Number.isFinite(pct) || bankroll <= 0 || pct <= 0) return null
      const oneUnit = bankroll * (pct / 100)
      return [
        { label: '0.5 Unit', value: fmtMoney(oneUnit * 0.5) },
        { label: '1 Unit', value: fmtMoney(oneUnit), tone: colors.gold },
        { label: '2 Units', value: fmtMoney(oneUnit * 2) },
        { label: 'Daily Stop-Loss', value: fmtMoney(oneUnit * 3), tone: colors.red },
        { label: 'Max Daily Exposure', value: fmtMoney(oneUnit * 5) },
      ]
    }

    if (calculatorKey === 'ev') {
      const odds = parseNumber(calcInputs.evOdds)
      const probability = parseNumber(calcInputs.evProb) / 100
      const stake = parseNumber(calcInputs.evStake) || 100
      if (!Number.isFinite(odds) || !Number.isFinite(probability) || probability <= 0) return null
      const decimal = americanToDecimal(odds)
      const profit = (decimal - 1) * stake
      const ev = probability * profit - (1 - probability) * stake
      const bookProb = impliedProbability(odds) * 100
      return [
        { label: 'Expected Value', value: fmtMoney(ev), tone: ev >= 0 ? colors.green : colors.red },
        { label: 'Your Edge', value: `${((probability * 100) - bookProb).toFixed(1)}%`, tone: (probability * 100) >= bookProb ? colors.green : colors.red },
        { label: 'Book Implied', value: `${bookProb.toFixed(1)}%` },
      ]
    }

    if (calculatorKey === 'novig') {
      const sideA = parseNumber(calcInputs.novigA)
      const sideB = parseNumber(calcInputs.novigB)
      if (!Number.isFinite(sideA) || !Number.isFinite(sideB)) return null
      const impA = impliedProbability(sideA)
      const impB = impliedProbability(sideB)
      const total = impA + impB
      if (!total) return null
      const fairA = impA / total
      const fairB = impB / total
      return [
        { label: 'No-Vig Side A', value: `${(fairA * 100).toFixed(1)}% / ${fmtOdds(decimalToAmerican(1 / fairA))}` },
        { label: 'No-Vig Side B', value: `${(fairB * 100).toFixed(1)}% / ${fmtOdds(decimalToAmerican(1 / fairB))}` },
        { label: 'Book Hold', value: `${((total - 1) * 100).toFixed(1)}%`, tone: colors.gold },
      ]
    }

    if (calculatorKey === 'kelly') {
      const bankroll = parseNumber(calcInputs.kellyBankroll)
      const odds = parseNumber(calcInputs.kellyOdds)
      const probability = parseNumber(calcInputs.kellyProb) / 100
      if (!Number.isFinite(bankroll) || !Number.isFinite(odds) || !Number.isFinite(probability)) return null
      const decimal = americanToDecimal(odds)
      const b = decimal - 1
      const kelly = (b * probability - (1 - probability)) / b
      const positiveKelly = Math.max(0, kelly)
      return [
        { label: 'Full Kelly', value: `${(kelly * 100).toFixed(1)}%`, tone: kelly > 0 ? colors.green : colors.red },
        { label: 'Half Kelly Stake', value: fmtMoney(bankroll * positiveKelly * 0.5) },
        { label: 'Quarter Kelly Stake', value: fmtMoney(bankroll * positiveKelly * 0.25) },
      ]
    }

    if (calculatorKey === 'parlay') {
      const odds = calcInputs.parlayLegs.split(',').map(parseNumber).filter((price) => Number.isFinite(price))
      const stake = parseNumber(calcInputs.parlayStake) || 100
      if (odds.length < 2) return null
      const decimal = odds.map(americanToDecimal).reduce((total, next) => total * next, 1)
      const payout = decimal * stake
      return [
        { label: 'Combined Odds', value: fmtOdds(decimalToAmerican(decimal)), tone: colors.gold },
        { label: 'Total Payout', value: fmtMoney(payout) },
        { label: 'Profit', value: fmtMoney(payout - stake), tone: colors.green },
      ]
    }

    const stake = parseNumber(calcInputs.hedgeStake)
    const originalOdds = parseNumber(calcInputs.hedgeOdds)
    const hedgeOdds = parseNumber(calcInputs.hedgeOppOdds)
    if (!Number.isFinite(stake) || !Number.isFinite(originalOdds) || !Number.isFinite(hedgeOdds)) return null
    const originalReturn = stake * americanToDecimal(originalOdds)
    const hedgeStake = originalReturn / americanToDecimal(hedgeOdds)
    return [
      { label: 'Hedge Stake', value: fmtMoney(hedgeStake), tone: colors.gold },
      { label: 'Win Either Side', value: fmtMoney(originalReturn - stake - hedgeStake) },
      { label: 'Total Outlay', value: fmtMoney(stake + hedgeStake) },
    ]
  }, [calcInputs, calculatorKey])

  return (
    <Screen>
      <AppText variant="eyebrow">// KingFish Workspace</AppText>
      <AppText variant="title" style={styles.title}>Tools</AppText>
      <AppText variant="muted" style={styles.copy}>
        Cheat sheets, calculators, and game factors in one clean workspace.
      </AppText>

      <View style={styles.segmentRow}>
        {TOOL_MODES.map((mode) => (
          <Pressable
            key={mode.key}
            onPress={() => {
              setToolMode(mode.key)
              setSelectedKey(null)
            }}
            style={[styles.segmentButton, toolMode === mode.key && styles.segmentButtonActive]}
          >
            <AppText style={[styles.segmentText, toolMode === mode.key && styles.segmentTextActive]}>{mode.label}</AppText>
          </Pressable>
        ))}
      </View>

      {!isPremium ? (
        <Card>
          <AppText variant="eyebrow">// Premium</AppText>
          <AppText style={styles.cardTitle}>Unlock KingFish Tools</AppText>
          <AppText variant="muted" style={styles.cardCopy}>
            Cheat Sheets, player props, Edge Scores, calculators, and unlimited Ask KingFish access are part of KingFish Bets Pro.
          </AppText>
          {mobileConfig.flags.mobile_paywall ? (
            <View style={styles.action}>
              <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
            </View>
          ) : null}
        </Card>
      ) : toolMode === 'factors' ? (
        <>
          <View style={styles.factorToggle}>
            {(['MLB', 'NFL'] as FactorSport[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setFactorSport(item)}
                style={[styles.factorToggleButton, factorSport === item && styles.factorToggleButtonActive]}
              >
                <AppText style={[styles.segmentText, factorSport === item && styles.segmentTextActive]}>{item}</AppText>
              </Pressable>
            ))}
          </View>

          {(factorGamesQuery.isLoading || factorWeatherQuery.isLoading) && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted">Loading game factors...</AppText>
            </View>
          )}

          {!factorGamesQuery.isLoading && factorRows.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Game Factors</AppText>
              <AppText style={styles.cardTitle}>No Games Posted</AppText>
              <AppText variant="muted" style={styles.cardCopy}>
                {factorSport === 'MLB' ? 'No MLB games are available for today yet.' : 'NFL factors will populate when game markets post.'}
              </AppText>
            </Card>
          )}

          <View style={styles.factorRows}>
            {factorRows.map((row) => (
              <Card key={row.id} style={styles.factorCard}>
                <View style={styles.factorHeader}>
                  <View style={styles.factorTitleWrap}>
                    <AppText style={styles.compactPlayer} numberOfLines={1}>{row.matchup}</AppText>
                    <AppText variant="mono" style={styles.compactMeta}>{row.time}</AppText>
                  </View>
                  <View style={styles.factorScore}>
                    <AppText style={[styles.factorScoreValue, { color: row.tone }]}>{row.score}</AppText>
                    <AppText style={[styles.factorLean, { color: row.tone }]}>{row.lean}</AppText>
                  </View>
                </View>
                <View style={styles.factorMetaGrid}>
                  <FactorMeta label="Venue" value={row.venue} sub={row.environment} />
                  <FactorMeta label="Weather" value={row.weather} />
                </View>
                <View style={styles.factorTags}>
                  {row.tags.map((tag) => (
                    <View key={tag} style={styles.factorTag}>
                      <AppText style={styles.factorTagText}>{tag}</AppText>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : toolMode === 'calculators' ? (
        <>
          <View style={styles.sheetGrid}>
            {CALCULATORS.map((calculator) => (
              <Pressable
                key={calculator.key}
                onPress={() => setCalculatorKey(calculator.key)}
                style={[styles.sheetTile, styles.calcTile, calculatorKey === calculator.key && styles.sheetTileActive]}
              >
                <AppText variant="eyebrow">// Tool</AppText>
                <AppText style={[styles.sheetTileTitle, calculatorKey === calculator.key && styles.sheetTileTitleActive]}>{calculator.label}</AppText>
                <AppText variant="muted" style={styles.sheetTileCopy} numberOfLines={3}>{calculator.desc}</AppText>
              </Pressable>
            ))}
          </View>
          <Card>
            <AppText variant="eyebrow">// Calculator</AppText>
            <AppText style={styles.cardTitle}>{CALCULATORS.find((item) => item.key === calculatorKey)?.label}</AppText>
            {calculatorKey === 'unit' && (
              <View style={styles.inputGrid}>
                <ToolInput label="Bankroll" value={calcInputs.unitBankroll} onChangeText={(value) => updateCalc('unitBankroll', value)} />
                <ToolInput label="Unit %" value={calcInputs.unitPct} onChangeText={(value) => updateCalc('unitPct', value)} />
              </View>
            )}
            {calculatorKey === 'ev' && (
              <View style={styles.inputGrid}>
                <ToolInput label="Book Odds" value={calcInputs.evOdds} onChangeText={(value) => updateCalc('evOdds', value)} />
                <ToolInput label="True Prob %" value={calcInputs.evProb} onChangeText={(value) => updateCalc('evProb', value)} />
                <ToolInput label="Stake" value={calcInputs.evStake} onChangeText={(value) => updateCalc('evStake', value)} />
              </View>
            )}
            {calculatorKey === 'novig' && (
              <View style={styles.inputGrid}>
                <ToolInput label="Side A Odds" value={calcInputs.novigA} onChangeText={(value) => updateCalc('novigA', value)} />
                <ToolInput label="Side B Odds" value={calcInputs.novigB} onChangeText={(value) => updateCalc('novigB', value)} />
              </View>
            )}
            {calculatorKey === 'kelly' && (
              <View style={styles.inputGrid}>
                <ToolInput label="Bankroll" value={calcInputs.kellyBankroll} onChangeText={(value) => updateCalc('kellyBankroll', value)} />
                <ToolInput label="Odds" value={calcInputs.kellyOdds} onChangeText={(value) => updateCalc('kellyOdds', value)} />
                <ToolInput label="True Prob %" value={calcInputs.kellyProb} onChangeText={(value) => updateCalc('kellyProb', value)} />
              </View>
            )}
            {calculatorKey === 'parlay' && (
              <View style={styles.inputGrid}>
                <ToolInput label="Leg Odds" value={calcInputs.parlayLegs} onChangeText={(value) => updateCalc('parlayLegs', value)} wide />
                <ToolInput label="Stake" value={calcInputs.parlayStake} onChangeText={(value) => updateCalc('parlayStake', value)} />
              </View>
            )}
            {calculatorKey === 'hedge' && (
              <View style={styles.inputGrid}>
                <ToolInput label="Original Stake" value={calcInputs.hedgeStake} onChangeText={(value) => updateCalc('hedgeStake', value)} />
                <ToolInput label="Original Odds" value={calcInputs.hedgeOdds} onChangeText={(value) => updateCalc('hedgeOdds', value)} />
                <ToolInput label="Hedge Odds" value={calcInputs.hedgeOppOdds} onChangeText={(value) => updateCalc('hedgeOppOdds', value)} />
              </View>
            )}
            <View style={styles.resultBox}>
              {calculatorResult ? calculatorResult.map((item) => (
                <View key={item.label} style={styles.resultRow}>
                  <AppText variant="muted">{item.label}</AppText>
                  <AppText style={[styles.resultValue, item.tone ? { color: item.tone } : null]}>{item.value}</AppText>
                </View>
              )) : (
                <AppText variant="muted">Enter values to see the result.</AppText>
              )}
            </View>
          </Card>
        </>
      ) : !hasOpenSheet ? (
        <>
          <View style={styles.sheetGrid}>
            {SHEETS.map((sheet) => (
              <Pressable
                key={sheet.key}
                onPress={() => setSelectedKey(sheet.key)}
                style={styles.sheetTile}
              >
                <AppText variant="eyebrow">// {sheet.type === 'td' ? 'NFL' : 'MLB'}</AppText>
                <AppText style={styles.sheetTileTitle}>{sheet.label}</AppText>
                <AppText variant="muted" style={styles.sheetTileCopy} numberOfLines={3}>{sheet.desc}</AppText>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.reportHeader}>
            <Pressable
              onPress={() => {
                setSelectedKey(null)
              }}
              style={styles.backButton}
            >
              <AppText style={styles.backButtonText}>All Sheets</AppText>
            </Pressable>
            <AppText variant="eyebrow">// Daily Board</AppText>
          </View>

          <Card>
            <View style={styles.reportTitleRow}>
              <View style={styles.reportTitleWrap}>
                <AppText variant="eyebrow">// {isTdSheet ? 'NFL' : activeSheet.label}</AppText>
                <AppText style={styles.reportTitle}>{activeSheet.label}</AppText>
              </View>
              {!isTdSheet ? (
                <AppText style={styles.reportDate}>
                  {formatSavedAt(sheetQuery.data?.published_at || sheetQuery.data?.updated_at, sheetQuery.data?.sheet_date)}
                </AppText>
              ) : null}
            </View>
            <AppText variant="muted" style={styles.reportCopy}>{activeSheet.desc}</AppText>

          {(sheetQuery.isLoading || lineupsQuery.isLoading || statsQuery.isLoading || scheduleQuery.isLoading || bvpQuery.isLoading || tdStreaksQuery.isLoading || qbTdStreaksQuery.isLoading) && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted">Loading daily board...</AppText>
            </View>
          )}

          {(sheetQuery.isError || tdStreaksQuery.isError || qbTdStreaksQuery.isError) && (
            <Card>
              <AppText variant="eyebrow">// Error</AppText>
              <AppText variant="muted" style={styles.errorText}>
                {sheetQuery.error instanceof Error
                  ? sheetQuery.error.message
                  : tdStreaksQuery.error instanceof Error
                    ? tdStreaksQuery.error.message
                    : qbTdStreaksQuery.error instanceof Error
                      ? qbTdStreaksQuery.error.message
                    : 'Could not load this sheet.'}
              </AppText>
            </Card>
          )}

          {activeKey === 'td' && tdStreakRows.length > 0 && (
            <>
              <View style={styles.reportRows}>
                {tdStreakRows.slice(0, 30).map((row, index) => (
                  <View key={`${row.player}-${row.team}-${index}`} style={styles.reportRow}>
                    <View style={styles.rankBadge}>
                      <AppText style={styles.rankText}>{index + 1}</AppText>
                    </View>
                    <View style={styles.rowMain}>
                      <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
                      <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                        {row.team} · {row.position}
                      </AppText>
                    </View>
                    <View style={styles.rowNumbers}>
                      <AppText style={styles.compactEdge}>{row.streak_games}</AppText>
                      <AppText style={styles.compactOdds}>games</AppText>
                    </View>
                  </View>
                ))}
              </View>
              <AppText variant="muted" style={styles.cardCopy}>
                Rushing, receiving, return, and fumble-recovery touchdowns only. Passing touchdowns are excluded.
              </AppText>
            </>
          )}

          {activeKey === 'qbtd' && qbTdRows.length > 0 && (
            <>
              <View style={styles.reportRows}>
                {qbTdRows.slice(0, 30).map((row, index) => (
                  <View key={`${row.player}-${row.team}-${index}`} style={styles.reportRow}>
                    <View style={styles.rankBadge}>
                      <AppText style={styles.rankText}>{index + 1}</AppText>
                    </View>
                    <View style={styles.rowMain}>
                      <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
                      <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                        {row.team} · QB · {row.two_td_games}/{row.games} games
                      </AppText>
                    </View>
                    <View style={styles.rowNumbers}>
                      <AppText style={styles.compactEdgeLarge}>{row.streak_games}</AppText>
                    </View>
                  </View>
                ))}
              </View>
              <AppText variant="muted" style={styles.cardCopy}>
                Passing touchdowns only. Streak is consecutive recent regular-season games with 2+ passing TDs.
              </AppText>
            </>
          )}

          {activeKey === 'lines' && (
            <View style={styles.linePreview}>
              {sheetGames.slice(0, 3).map((game) => (
                <GameLineCard
                  key={game.id || game.game_id || `${game.away_team}-${game.home_team}`}
                  game={game}
                  weather={weatherQuery.data?.[game.id || game.game_id || '']}
                />
              ))}
            </View>
          )}

          {activeKey === 'bvp' && bvpRows.length > 0 && (
            <View style={styles.reportRows}>
              {bvpRows.slice(0, 30).map((row) => (
                <View key={row.key} style={styles.reportRow}>
                  <View style={styles.rowMain}>
                    <AppText
                      onPress={() => openPlayerProfile(row.player)}
                      style={[styles.compactPlayer, styles.profileLink]}
                      numberOfLines={1}
                    >
                      {row.player}
                    </AppText>
                    <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                      {row.gameLabel} · vs {row.pitcher}
                    </AppText>
                    <View style={styles.bvpMetricRow}>
                      <BvpMetric label="AB" value={String(row.ab)} />
                      <BvpMetric label="AVG" value={row.avg} tone={Number(row.avg) >= 0.300 ? colors.green : Number(row.avg) >= 0.200 ? colors.gold : colors.red} />
                      <BvpMetric label="HR" value={String(row.hr)} />
                      <BvpMetric label="RBI" value={String(row.rbi)} />
                      <BvpMetric label="OPS" value={row.ops} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeKey !== 'lines' && activeKey !== 'bvp' && activeKey !== 'td' && rows.length > 0 && (
            <View style={styles.reportRows}>
              {(activeKey === 'hits' ? rows : rows.slice(0, 6)).map((row, index) => row.divider ? (
                <View key={`divider-${row.label}-${index}`} style={styles.reportDivider}>
                  <AppText variant="eyebrow" style={styles.reportDividerText}>{row.label}</AppText>
                </View>
              ) : (
                <View key={`${row.player}-${row.line}-${index}`} style={styles.reportRow}>
                  <View style={styles.rankBadge}>
                    <AppText style={styles.rankText}>{row.pickLabel?.startsWith('Under') ? 'F' : index + 1}</AppText>
                  </View>
                  <View style={styles.rowMain}>
                    <AppText
                      onPress={() => openPlayerProfile(row.player, row)}
                      style={[styles.compactPlayer, styles.profileLink]}
                      numberOfLines={1}
                    >
                      {row.player}
                    </AppText>
                    <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                      {row.matchup}
                    </AppText>
                    {(activeKey === 'k' || row.pickLabel) && (
                      <AppText style={styles.pickLine}>{row.pickLabel || `Over ${row.line} Strikeouts`}</AppText>
                    )}
                    <AppText style={styles.reasonText}>
                      {row.reason}
                    </AppText>
                  </View>
                  <View style={styles.rowNumbers}>
                    <AppText style={styles.compactOdds}>{row.odds ? fmtOdds(row.odds) : '-'} {row.book || ''}</AppText>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeKey === 'bvp' && !sheetQuery.isLoading && !lineupsQuery.isLoading && !scheduleQuery.isLoading && !bvpQuery.isLoading && sheetGames.length > 0 && bvpRows.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No Batter vs Pitcher matchups are available for today's probable starters yet.
            </AppText>
          )}

          {activeKey === 'td' && !tdStreaksQuery.isLoading && !tdStreaksQuery.isError && tdStreakRows.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No NFL touchdown streak rows are available yet.
            </AppText>
          )}

          {activeKey === 'qbtd' && !qbTdStreaksQuery.isLoading && !qbTdStreaksQuery.isError && qbTdRows.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No NFL QB 2+ TD streak rows are available yet.
            </AppText>
          )}

          {activeKey !== 'td' && activeKey !== 'qbtd' && !sheetQuery.isLoading && sheetGames.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No MLB markets were available when this daily board was saved.
            </AppText>
          )}

          <PlayerProfileModal
            playerName={selectedPlayer}
            sport="mlb"
            marketContext={selectedMarketContext}
            onClose={() => {
              setSelectedPlayer(null)
              setSelectedMarketContext(null)
            }}
          />
          </Card>
        </>
      )}
    </Screen>
  )
}

function ToolInput({ label, value, onChangeText, wide = false }: { label: string; value: string; onChangeText: (value: string) => void; wide?: boolean }) {
  return (
    <View style={[styles.toolInputWrap, wide && styles.toolInputWide]}>
      <AppText variant="eyebrow">{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numbers-and-punctuation"
        placeholderTextColor={colors.textMuted}
        style={styles.toolInput}
      />
    </View>
  )
}

function BvpMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.bvpMetric}>
      <AppText variant="mono" style={styles.bvpMetricLabel}>{label}</AppText>
      <AppText style={[styles.bvpMetricValue, tone ? { color: tone } : null]}>{value}</AppText>
    </View>
  )
}

function FactorMeta({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.factorMeta}>
      <AppText variant="mono" style={styles.factorMetaLabel}>{label}</AppText>
      <AppText style={styles.factorMetaValue}>{value}</AppText>
      {sub ? <AppText variant="muted" style={styles.factorMetaSub}>{sub}</AppText> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  copy: { marginTop: 10, marginBottom: spacing.xl },
  cardTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  cardCopy: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: 4,
    marginBottom: spacing.xl,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.gold,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.bgPrimary,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sheetTile: {
    width: '47%',
    minHeight: 154,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  sheetTileActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.14)',
  },
  sheetTileTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 20, lineHeight: 24 },
  sheetTileTitleActive: { color: colors.gold },
  sheetTileCopy: { marginTop: spacing.sm, fontSize: 13, lineHeight: 18 },
  calcTile: { minHeight: 134 },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  toolInputWrap: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  toolInputWide: { width: '100%' },
  toolInput: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 8,
  },
  resultBox: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  resultValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  factorToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  factorToggleButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCardAlt,
  },
  factorToggleButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  factorRows: {
    gap: spacing.md,
  },
  factorCard: {
    gap: spacing.md,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  factorTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  factorScore: {
    alignItems: 'flex-end',
    minWidth: 72,
  },
  factorScoreValue: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
  },
  factorLean: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  factorMetaGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  factorMeta: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  factorMetaLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  factorMetaValue: {
    marginTop: 5,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  factorMetaSub: {
    marginTop: 4,
    fontSize: 12,
  },
  factorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  factorTag: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.3)',
    borderRadius: 6,
    backgroundColor: 'rgba(198,145,50,.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  factorTagText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.bgCardAlt,
  },
  backButtonText: { color: colors.gold, fontWeight: '900' },
  reportTitleRow: { gap: spacing.sm },
  reportTitleWrap: { flex: 1 },
  reportTitle: { marginTop: 4, fontSize: 28, lineHeight: 31, fontWeight: '900' },
  reportDate: { color: colors.textSecondary, fontWeight: '900', lineHeight: 19 },
  reportCopy: { marginTop: spacing.sm, marginBottom: spacing.md },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  errorText: { color: colors.red, marginTop: spacing.sm },
  linePreview: { gap: spacing.md, marginTop: spacing.md },
  reportRows: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  reportDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  reportDividerText: {
    color: colors.gold,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198,145,50,.18)',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.55)',
  },
  rankText: { color: colors.gold, fontWeight: '900' },
  rowMain: { flex: 1, minWidth: 0 },
  compactPlayer: { fontSize: 17, lineHeight: 21, fontWeight: '900' },
  compactMeta: { marginTop: 3, color: colors.textSecondary, fontSize: 11 },
  pickLine: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(198,145,50,.12)',
    color: colors.gold,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reasonText: { marginTop: 6, color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  rowNumbers: { alignItems: 'flex-end', minWidth: 72 },
  compactEdge: { fontSize: 22, lineHeight: 26, fontWeight: '900' },
  compactEdgeLarge: { fontSize: 34, lineHeight: 38, fontWeight: '900' },
  compactOdds: { marginTop: 2, color: colors.gold, fontSize: 12, fontWeight: '900' },
  profileLink: { color: colors.gold },
  bvpMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bvpMetric: {
    minWidth: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bvpMetricLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  bvpMetricValue: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  rows: { gap: spacing.md, marginTop: spacing.lg },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  edgeText: { fontSize: 15, fontWeight: '900' },
  player: { marginTop: spacing.sm, fontSize: 22, fontWeight: '900' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  metric: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  metricValue: { marginTop: 4, fontSize: 17, fontWeight: '900' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  bestOdds: { color: colors.gold, fontWeight: '900' },
})
