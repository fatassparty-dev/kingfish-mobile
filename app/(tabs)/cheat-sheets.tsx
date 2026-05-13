import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { GameLineCard } from '@/components/dashboard/GameLineCard'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtOdds, normalizeName } from '@/lib/format'
import { useMobileConfig } from '@/lib/mobileConfig'
import { BOOK_DISPLAY_NAMES, PROP_BOOK_KEYS } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, WeatherInfo } from '@/types'

type SheetKey = 'hits' | 'hr' | 'tb' | 'k' | 'hot' | 'bvp' | 'lines'
type ToolMode = 'sheets' | 'calculators'
type CalculatorKey = 'ev' | 'novig' | 'kelly' | 'parlay' | 'hedge'

const SHEETS: Array<{
  key: SheetKey
  label: string
  desc: string
  type: 'props' | 'k' | 'bvp' | 'lines'
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
]

const CALCULATORS: Array<{ key: CalculatorKey; label: string; desc: string }> = [
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
      const lineup = lineups[normalizeName(outcome.player)]
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

function formatSavedAt(value?: string) {
  if (!value) return 'Saved daily board'
  return `Saved ${new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`
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

function buildRows(games: Game[], marketKey: string, statField: string, lineupMap: Record<string, LineupPlayer>, stats: Record<number, any>, sheetKey: SheetKey, trend = false) {
  const rows: SheetRow[] = []

  games.forEach((game) => {
    bestOutcomes(game, marketKey).forEach((outcome) => {
      const lineup = lineupMap[normalizeName(outcome.player)]
      const playerStats = lineup ? stats[lineup.id] : undefined
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
  const [calculatorKey, setCalculatorKey] = useState<CalculatorKey>('ev')
  const [calcInputs, setCalcInputs] = useState<Record<string, string>>({
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

  const sheetQuery = useQuery({
    queryKey: ['cheat-sheet', activeSheet.type],
    queryFn: () => kingfishFetch<{ data: Game[]; updated_at?: string }>(`/api/statsheet-data?type=${activeSheet.type}`),
    enabled: canLoadData,
    staleTime: 12 * 60 * 60 * 1000,
  })
  const lineupsQuery = useQuery({
    queryKey: ['mlb-lineups-cheat-sheets'],
    queryFn: () => kingfishFetch<{ players: Record<string, LineupPlayer> }>('/api/mlb-lineups'),
    enabled: canLoadData && activeSheet.type !== 'lines',
    staleTime: 12 * 60 * 60 * 1000,
  })

  const scheduleQuery = useQuery({
    queryKey: ['mlb-schedule-cheat-sheets'],
    queryFn: () => kingfishFetch<{
      pitcherMap?: Record<string, string>
      pitcherNameMap?: Record<string, string>
      pitcherIdNameMap?: Record<string, string>
    }>('/api/mlb-schedule'),
    enabled: canLoadData && activeKey === 'bvp',
    staleTime: 60 * 60 * 1000,
  })

  const sheetGames = useMemo(() => sheetQuery.data?.data || [], [sheetQuery.data?.data])

  const playersToFetch = useMemo(() => {
    if (!activeSheet.market || !lineupsQuery.data?.players || !sheetQuery.data?.data) return { batters: [], pitchers: [] }
    const lineupMap = lineupsQuery.data.players
    const seen = new Set<number>()
    const batters: LineupPlayer[] = []
    const pitchers: LineupPlayer[] = []
    sheetGames.forEach((game) => {
      bestOutcomes(game, activeSheet.market || '').forEach((outcome) => {
        const lineup = lineupMap[normalizeName(outcome.player)]
        if (!lineup || seen.has(lineup.id)) return
        seen.add(lineup.id)
        if (activeSheet.market?.startsWith('pitcher_')) pitchers.push(lineup)
        else batters.push(lineup)
      })
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
    enabled: canLoadData && activeSheet.type !== 'lines' && (playersToFetch.batters.length > 0 || playersToFetch.pitchers.length > 0),
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
    enabled: canLoadData && activeKey === 'lines' && sheetGames.length > 0,
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
    queryKey: ['cheat-sheet-bvp', bvpMatchups.map((matchup) => `${matchup.batterID}_${matchup.pitcherID}`).join(',')],
    queryFn: () =>
      kingfishFetch<{ bvp: Record<string, any> }>('/api/mlb-bvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchups: bvpMatchups.map(({ batterID, pitcherID }) => ({ batterID, pitcherID })) }),
      }),
    enabled: canLoadData && activeKey === 'bvp' && bvpMatchups.length > 0,
    staleTime: 12 * 60 * 60 * 1000,
  })

  const rows = activeSheet.market && activeSheet.statField && lineupsQuery.data?.players && statsQuery.data?.stats && sheetGames.length > 0
    ? buildRows(sheetGames, activeSheet.market, activeSheet.statField, lineupsQuery.data.players, statsQuery.data.stats, activeKey, activeSheet.trend)
    : []

  const bvpRows = activeKey === 'bvp' ? buildBvpRows(bvpQuery.data?.bvp, bvpMatchups) : []

  const updateCalc = (key: string, value: string) => setCalcInputs((current) => ({ ...current, [key]: value }))

  const calculatorResult = useMemo(() => {
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
        Cheat sheets and calculators in one clean workspace.
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
                <AppText variant="eyebrow">// MLB</AppText>
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
                <AppText variant="eyebrow">// {activeSheet.label}</AppText>
                <AppText style={styles.reportTitle}>{activeSheet.label}</AppText>
              </View>
              <AppText style={styles.reportDate}>{formatSavedAt(sheetQuery.data?.updated_at)}</AppText>
            </View>
            <AppText variant="muted" style={styles.reportCopy}>{activeSheet.desc}</AppText>

          {(sheetQuery.isLoading || lineupsQuery.isLoading || statsQuery.isLoading || scheduleQuery.isLoading || bvpQuery.isLoading) && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted">Loading daily board...</AppText>
            </View>
          )}

          {sheetQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Error</AppText>
              <AppText variant="muted" style={styles.errorText}>
                {sheetQuery.error instanceof Error ? sheetQuery.error.message : 'Could not load this sheet.'}
              </AppText>
            </Card>
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
                    <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
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

          {activeKey !== 'lines' && activeKey !== 'bvp' && rows.length > 0 && (
            <View style={styles.reportRows}>
              {rows.slice(0, 6).map((row, index) => (
                <View key={`${row.player}-${row.line}-${index}`} style={styles.reportRow}>
                  <View style={styles.rankBadge}>
                    <AppText style={styles.rankText}>{index + 1}</AppText>
                  </View>
                  <View style={styles.rowMain}>
                    <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
                    <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                      {row.matchup}
                    </AppText>
                    {activeKey === 'k' && (
                      <AppText style={styles.pickLine}>Over {row.line} Strikeouts</AppText>
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

          {!sheetQuery.isLoading && sheetGames.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No MLB markets were available when this daily board was saved.
            </AppText>
          )}
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
  reportTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  reportTitleWrap: { flex: 1 },
  reportTitle: { marginTop: 4, fontSize: 30, lineHeight: 34, fontWeight: '900' },
  reportDate: { color: colors.textSecondary, fontWeight: '900' },
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
  compactOdds: { marginTop: 2, color: colors.gold, fontSize: 12, fontWeight: '900' },
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
