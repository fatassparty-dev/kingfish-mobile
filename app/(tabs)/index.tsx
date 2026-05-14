import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { GameLineCard } from '@/components/dashboard/GameLineCard'
import { MLBPropsTable } from '@/components/dashboard/MLBPropsTable'
import { PropsList } from '@/components/dashboard/PropCard'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth'
import { kingfishFetch } from '@/lib/api'
import type { FeatureFlagKey } from '@/lib/featureFlags'
import { fmtTime } from '@/lib/format'
import { useMobileConfig } from '@/lib/mobileConfig'
import { BOOK_DISPLAY_NAMES, PROP_BOOK_KEYS } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, Sport, WeatherInfo } from '@/types'
import { router } from 'expo-router'

type SoccerTeamInfo = {
  team: string
  shortName?: string
  position?: number
  played?: number
  won?: number
  drawn?: number
  lost?: number
  points?: number
  goalsFor?: number
  goalsAgainst?: number
  goalDifference?: number
  form?: string
}

type KBOTeamStats = {
  teams: Array<{
    rank?: number
    team: string
    wins?: number
    losses?: number
    draws?: number
    pct?: number
    runsPerGame?: number
    runsAllowedPerGame?: number
    last10?: { wins?: number; losses?: number; draws?: number }
  }>
  updated_at?: string | null
}

type PropsResponse = Game[] | { props: Game[]; playerStats?: Record<string, any>; cacheMode?: string }

type DashboardView = 'league' | 'matchups' | 'lines' | 'props'

type TeamFormPayload = {
  teams: Record<string, any>
  updatedAt?: string
}

type MLBSchedulePayload = {
  teamRecords?: Record<string, { wins: number; losses: number; pct: number }>
  pitcherNameMap?: Record<string, string>
  pitcherEraMap?: Record<string, number>
}

type MLBL10Payload = {
  teamL10Map?: Record<string, { wins: number; losses: number; winPct: number; avgTotal: number }>
}

type NFLFuturesData = {
  division: Array<{
    division: string
    entries: Array<{ team: string }>
  }>
  divisionContext: Record<string, { rank: number; wins: number; last5Wins: number }>
  wins?: Array<{
    team: string
    lines: Array<{ line: number }>
  }>
}

type NCAAFOutlookData = {
  season: string
  teams: Array<{
    rank: number
    team: string
    conference: string
    lastRecord: string
    power: string
    schedule: string
    profile: string
    lean: string
  }>
}

type NCAABBaselineData = {
  season: string
  teams: Array<{
    rank: number
    team: string
    record: string
    conference: string
    offense: string
    defense: string
    tempo: string
    profile: string
    lean: string
  }>
}

type NCAAFMatchup = {
  id: string
  commence_time: string
  home_team: string
  away_team: string
  favorite: string
  favoriteDetail: string
  spread?: number | null
  total: number | null
  status: string
}

type WeekOption<T extends { commence_time: string }> = {
  key: string
  label: string
  games: T[]
}

type DateGroup<T extends { commence_time: string }> = {
  date: string
  games: T[]
}

const SOCCER_LEAGUES = [
  { key: 'soccer_epl', label: 'Premier League' },
  { key: 'soccer_spain_la_liga', label: 'La Liga' },
  { key: 'soccer_italy_serie_a', label: 'Serie A' },
  { key: 'soccer_germany_bundesliga', label: 'Bundesliga' },
  { key: 'soccer_france_ligue_one', label: 'Ligue 1' },
  { key: 'soccer_usa_mls', label: 'MLS' },
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
  { key: 'soccer_fifa_world_cup', label: 'World Cup' },
]

const MLB_TEAM_NAME_TO_ABBR: Record<string, string> = {
  'New York Yankees': 'NYY', 'Boston Red Sox': 'BOS', 'Toronto Blue Jays': 'TOR',
  'Baltimore Orioles': 'BAL', 'Tampa Bay Rays': 'TB', 'Chicago White Sox': 'CWS',
  'Cleveland Guardians': 'CLE', 'Detroit Tigers': 'DET', 'Kansas City Royals': 'KC',
  'Minnesota Twins': 'MIN', 'Houston Astros': 'HOU', 'Los Angeles Angels': 'LAA',
  'Athletics': 'OAK', 'Oakland Athletics': 'OAK', 'Seattle Mariners': 'SEA', 'Texas Rangers': 'TEX',
  'Atlanta Braves': 'ATL', 'Miami Marlins': 'MIA', 'New York Mets': 'NYM',
  'Philadelphia Phillies': 'PHI', 'Washington Nationals': 'WAS', 'Chicago Cubs': 'CHC',
  'Cincinnati Reds': 'CIN', 'Milwaukee Brewers': 'MIL', 'Pittsburgh Pirates': 'PIT',
  'St. Louis Cardinals': 'STL', 'Los Angeles Dodgers': 'LAD', 'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF', 'Colorado Rockies': 'COL', 'Arizona Diamondbacks': 'ARI',
}


const MLB_DIVISIONS = [
  {
    name: 'AL East',
    teams: [
      { abbr: 'NYY', name: 'Yankees' },
      { abbr: 'BOS', name: 'Red Sox' },
      { abbr: 'TOR', name: 'Blue Jays' },
      { abbr: 'BAL', name: 'Orioles' },
      { abbr: 'TB', name: 'Rays' },
    ],
  },
  {
    name: 'AL Central',
    teams: [
      { abbr: 'CLE', name: 'Guardians' },
      { abbr: 'DET', name: 'Tigers' },
      { abbr: 'KC', name: 'Royals' },
      { abbr: 'MIN', name: 'Twins' },
      { abbr: 'CWS', name: 'White Sox' },
    ],
  },
  {
    name: 'AL West',
    teams: [
      { abbr: 'TEX', name: 'Rangers' },
      { abbr: 'HOU', name: 'Astros' },
      { abbr: 'SEA', name: 'Mariners' },
      { abbr: 'LAA', name: 'Angels' },
      { abbr: 'OAK', name: 'Athletics' },
    ],
  },
  {
    name: 'NL East',
    teams: [
      { abbr: 'ATL', name: 'Braves' },
      { abbr: 'PHI', name: 'Phillies' },
      { abbr: 'NYM', name: 'Mets' },
      { abbr: 'MIA', name: 'Marlins' },
      { abbr: 'WAS', name: 'Nationals' },
    ],
  },
  {
    name: 'NL Central',
    teams: [
      { abbr: 'CHC', name: 'Cubs' },
      { abbr: 'MIL', name: 'Brewers' },
      { abbr: 'STL', name: 'Cardinals' },
      { abbr: 'CIN', name: 'Reds' },
      { abbr: 'PIT', name: 'Pirates' },
    ],
  },
  {
    name: 'NL West',
    teams: [
      { abbr: 'LAD', name: 'Dodgers' },
      { abbr: 'SD', name: 'Padres' },
      { abbr: 'SF', name: 'Giants' },
      { abbr: 'ARI', name: 'Diamondbacks' },
      { abbr: 'COL', name: 'Rockies' },
    ],
  },
]

const SPORTS: Array<{
  key: Sport
  flag: FeatureFlagKey
  visibilityFlag: string
  status: 'Live' | 'Offseason'
  description: string
  inactiveTitle: string
  inactiveDescription: string
}> = [
  {
    key: 'MLB',
    flag: 'dashboard_mlb',
    visibilityFlag: 'dashboard_tab_mlb',
    status: 'Live',
    description: 'Track live MLB lines, player props, weather, stat trends, and cheat-sheet support in one place.',
    inactiveTitle: 'MLB Lines Unavailable',
    inactiveDescription: 'No MLB markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'NBA',
    flag: 'dashboard_nba',
    visibilityFlag: 'dashboard_tab_nba',
    status: 'Live',
    description: 'Compare live NBA lines, player props, recent form, hit rates, and Edge Scores by matchup.',
    inactiveTitle: 'NBA Lines Unavailable',
    inactiveDescription: 'No NBA markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'NFL',
    flag: 'nfl_props',
    visibilityFlag: 'dashboard_tab_nfl',
    status: 'Offseason',
    description: 'NFL is year-round in KingFish. Game lines appear when books post regular-season markets, with player props and deeper research built around the NFL Command Center.',
    inactiveTitle: 'NFL Not In Season',
    inactiveDescription: 'NFL lives year-round in KingFish. Use the Command Center for fantasy tools, draft research, injuries, futures, and offseason notes while regular-season markets are off the board.',
  },
  {
    key: 'NHL',
    flag: 'dashboard_nhl',
    visibilityFlag: 'dashboard_tab_nhl',
    status: 'Live',
    description: 'Track NHL lines, player props, shot volume, scoring trends, and Edge Scores in one board.',
    inactiveTitle: 'NHL Lines Unavailable',
    inactiveDescription: 'No NHL markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'WNBA',
    flag: 'dashboard_wnba',
    visibilityFlag: 'dashboard_tab_wnba',
    status: 'Live',
    description: 'Follow WNBA lines and player props with recent stat trends, hit rates, and best available odds.',
    inactiveTitle: 'WNBA Lines Unavailable',
    inactiveDescription: 'No WNBA markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'KBO',
    flag: 'dashboard_kbo',
    visibilityFlag: 'dashboard_tab_kbo',
    status: 'Live',
    description: 'Follow KBO game lines and market movement from supported books.',
    inactiveTitle: 'KBO Lines Unavailable',
    inactiveDescription: 'No KBO markets are posted right now. When books post the next slate, KingFish will show game lines.',
  },
  {
    key: 'NCAAB',
    flag: 'dashboard_ncaab',
    visibilityFlag: 'dashboard_tab_ncaab',
    status: 'Offseason',
    description: 'College basketball will focus on team stats, team trends, points for, points against, and matchup context.',
    inactiveTitle: 'College Basketball Not In Season',
    inactiveDescription: 'College basketball game lines and matchup context return when the season is active and sportsbooks have posted markets.',
  },
  {
    key: 'NCAAF',
    flag: 'dashboard_ncaaf',
    visibilityFlag: 'dashboard_tab_ncaaf',
    status: 'Offseason',
    description: 'College football will focus on game lines, team stats, matchup grades, and team leans instead of player props.',
    inactiveTitle: 'College Football Not In Season',
    inactiveDescription: 'College football game lines, market leans, and matchup context return when the season is active and sportsbooks have posted markets.',
  },
  {
    key: 'SOCCER',
    flag: 'dashboard_soccer',
    visibilityFlag: 'dashboard_tab_soccer',
    status: 'Offseason',
    description: 'Follow soccer game lines for supported leagues when US sportsbooks post them.',
    inactiveTitle: 'Soccer Markets Unavailable',
    inactiveDescription: 'Supported soccer game lines appear when US sportsbooks have active markets for the selected leagues.',
  },
]

function isCollegeSport(sport: Sport) {
  return sport === 'NCAAB' || sport === 'NCAAF'
}

function hasLiveProps(sport: Sport) {
  return sport === 'MLB' || sport === 'NBA' || sport === 'NFL' || sport === 'NHL' || sport === 'WNBA'
}

function sportApiKey(sport: Sport) {
  return sport.toLowerCase()
}

function soccerTeamGrade(team: SoccerTeamInfo) {
  if (!team.position) return 'Pending'
  if (team.position <= 3) return 'A'
  if (team.position <= 6) return 'B+'
  if (team.position <= 10) return 'B'
  if (team.position <= 14) return 'C'
  if (team.position <= 17) return 'C-'
  return 'D'
}

function shortDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Chicago',
  })
}

function upcomingGames<T extends { commence_time: string }>(games: T[] = []) {
  const now = Date.now()
  return games
    .filter((game) => new Date(game.commence_time).getTime() > now)
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
}

function weekOptions<T extends { commence_time: string }>(games: T[]): WeekOption<T>[] {
  if (!games.length) return []
  const firstStart = new Date(games[0].commence_time)
  firstStart.setHours(0, 0, 0, 0)
  const weeks: WeekOption<T>[] = []

  games.forEach((game) => {
    const gameDate = new Date(game.commence_time)
    const diffDays = Math.max(0, Math.floor((gameDate.getTime() - firstStart.getTime()) / 86400000))
    const index = Math.floor(diffDays / 7)
    if (!weeks[index]) {
      const start = new Date(firstStart)
      start.setDate(firstStart.getDate() + index * 7)
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      weeks[index] = {
        key: `week-${index + 1}`,
        label: `Week ${index + 1}: ${shortDate(start)}-${shortDate(end)}`,
        games: [],
      }
    }
    weeks[index].games.push(game)
  })

  return weeks.filter(Boolean)
}

function groupGamesByDate<T extends { commence_time: string }>(games: T[]): DateGroup<T>[] {
  const groups: DateGroup<T>[] = []
  const indexByDate = new Map<string, number>()

  games.forEach((game) => {
    const date = fullDate(game.commence_time)
    const index = indexByDate.get(date)
    if (index == null) {
      indexByDate.set(date, groups.length)
      groups.push({ date, games: [game] })
    } else {
      groups[index].games.push(game)
    }
  })

  return groups
}


function formatMlbPct(pct?: number) {
  if (typeof pct !== 'number') return '-'
  return Number(pct).toFixed(3).replace(/^0/, '')
}

function formatGamesBack(record?: { wins: number; losses: number }, leader?: { wins: number; losses: number }) {
  if (!record || !leader) return '-'
  const gb = ((leader.wins - record.wins) + (record.losses - leader.losses)) / 2
  if (gb <= 0) return '-'
  return Number.isInteger(gb) ? String(gb) : gb.toFixed(1)
}

function mlbDivisionStandings(
  records: Record<string, { wins: number; losses: number; pct: number }> = {},
  l10Map: Record<string, { wins: number; losses: number; winPct: number; avgTotal: number }> = {}
) {
  return MLB_DIVISIONS.map((division) => {
    const entries = division.teams
      .map((team) => ({ team, record: records[team.abbr], l10: l10Map[team.abbr] }))
      .filter((entry) => entry.record)
      .sort((a, b) => Number(b.record?.pct || 0) - Number(a.record?.pct || 0))
    const leader = entries[0]?.record
    return {
      name: division.name,
      entries: entries.map((entry, index) => ({
        ...entry,
        rank: index + 1,
        gb: formatGamesBack(entry.record, leader),
      })),
    }
  }).filter((division) => division.entries.length)
}

function shortTeamName(team: string) {
  return team.replace(/ University$/i, '').replace(/ College$/i, '')
}

function normalizeTeamKey(name: string) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function uniqueTeamForms(teams: Record<string, any> = {}) {
  const seen = new Set<string>()
  return Object.values(teams)
    .filter((team: any) => {
      const key = team.teamAbbr || team.teamName || team.commonName || team.placeName
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a: any, b: any) => String(a.teamName || a.commonName || '').localeCompare(String(b.teamName || b.commonName || '')))
}

function findTeamForm(teams: Record<string, any> = {}, teamName: string) {
  const normalized = normalizeTeamKey(teamName)
  const lastWord = normalizeTeamKey(teamName.split(' ').pop() || teamName)
  return teams[normalized] || teams[lastWord] || Object.values(teams).find((team: any) => {
    const candidates = [team.teamName, team.commonName, team.placeName, team.teamAbbr].map(normalizeTeamKey)
    return candidates.some((candidate) => candidate && (candidate === normalized || normalized.includes(candidate) || candidate.includes(lastWord)))
  })
}

function teamRecordLabel(team: any, sport: Sport) {
  if (!team) return '-'
  if (sport === 'NHL') return `${team.wins || 0}-${team.losses || 0}-${team.otLosses || 0}`
  return `${team.wins || team.currentWins || 0}-${team.losses || team.currentLosses || 0}`
}

function formLabel(team: any, sport: Sport) {
  if (!team) return '-'
  if (sport === 'NHL') return `${team.l10Wins || 0}-${team.l10Losses || 0}-${team.l10OtLosses || 0}`
  return `${Number(team.l10For || 0).toFixed(1)} PF / ${Number(team.l10Against || 0).toFixed(1)} PA`
}

function mlbAbbr(teamName: string) {
  return MLB_TEAM_NAME_TO_ABBR[teamName] || teamName.split(' ').pop()?.slice(0, 3).toUpperCase() || teamName
}

function recordGrade(pct: number) {
  if (pct >= 0.620) return 'A'
  if (pct >= 0.560) return 'B'
  if (pct >= 0.500) return 'C'
  if (pct >= 0.440) return 'D'
  return 'F'
}

function soccerRecordLine(team: SoccerTeamInfo | undefined) {
  if (!team?.played) return 'No table data yet'
  return `${team.won || 0}W-${team.drawn || 0}D-${team.lost || 0}L · ${team.points || 0} pts`
}

function soccerStatLine(team: SoccerTeamInfo | undefined) {
  if (!team?.played) return 'Standings pending'
  const diff = Number(team.goalDifference || 0)
  return `${team.goalsFor || 0} GF / ${team.goalsAgainst || 0} GA · ${diff >= 0 ? '+' : ''}${diff}`
}

function pointsPerGame(team: SoccerTeamInfo | undefined) {
  const played = Number(team?.played || 0)
  if (!played) return 0
  return Number(team?.points || 0) / played
}

function drawRate(team: SoccerTeamInfo | undefined) {
  const played = Number(team?.played || 0)
  if (!played) return 0
  return Number(team?.drawn || 0) / played
}

function recentDrawCount(team: SoccerTeamInfo | undefined) {
  return String(team?.form || '').toUpperCase().split('').filter((result) => result === 'D').length
}

function goalsForPerGame(team: SoccerTeamInfo | undefined) {
  const played = Number(team?.played || 0)
  if (!played) return 0
  return Number(team?.goalsFor || 0) / played
}

function soccerPower(team: SoccerTeamInfo | undefined) {
  if (!team?.played) return 50
  const played = Number(team.played || 1)
  const ppg = pointsPerGame(team)
  const gdPerGame = Number(team.goalDifference || 0) / played
  const scoringRate = goalsForPerGame(team)
  const againstRate = Number(team.goalsAgainst || 0) / played
  const tableBonus = Math.max(0, 22 - Number(team.position || 20)) * 1.1
  return 35 + (ppg * 12) + (gdPerGame * 8) + (scoringRate * 3) - (againstRate * 2) + tableBonus
}

function bestMoneylineFor(game: Game, side: 'away' | 'home' | 'draw') {
  const target = side === 'away' ? game.away_team : side === 'home' ? game.home_team : 'Draw'
  const options: Array<{ book: string; price: number }> = []
  game.bookmakers?.forEach((bookmaker) => {
    if (!PROP_BOOK_KEYS.includes(bookmaker.key)) return
    const market = bookmaker.markets?.find((item) => item.key === 'h2h')
    const outcome = market?.outcomes?.find((item) => item.name === target)
    if (typeof outcome?.price === 'number') options.push({ book: bookmaker.key, price: outcome.price })
  })
  return options.reduce<typeof options[number] | null>((best, item) => (!best || item.price > best.price ? item : best), null)
}

function soccerMatchupLean(awayInfo: SoccerTeamInfo | undefined, homeInfo: SoccerTeamInfo | undefined, game: Game) {
  if (!awayInfo || !homeInfo) return null
  const awayPower = soccerPower(awayInfo)
  const homePower = soccerPower(homeInfo) + 3
  const diff = homePower - awayPower
  const ppgGap = Math.abs(pointsPerGame(homeInfo) - pointsPerGame(awayInfo))
  const drawProfile =
    (recentDrawCount(awayInfo) > 0 && recentDrawCount(homeInfo) > 0) ||
    (drawRate(awayInfo) >= 0.24 && drawRate(homeInfo) >= 0.24) ||
    ((drawRate(awayInfo) + drawRate(homeInfo)) / 2 >= 0.28)
  const isDrawWatch = (Math.abs(diff) < 5 || ppgGap <= 0.15) && drawProfile
  const stronger = diff > 0 ? homeInfo : awayInfo
  const weaker = diff > 0 ? awayInfo : homeInfo
  const best = bestMoneylineFor(game, isDrawWatch ? 'draw' : diff > 0 ? 'home' : 'away')
  const ppgEdge = (pointsPerGame(stronger) - pointsPerGame(weaker)).toFixed(2)
  const gdEdge = Number(stronger.goalDifference || 0) - Number(weaker.goalDifference || 0)
  return {
    type: isDrawWatch ? 'Draw Lean' : Math.abs(diff) >= 10 ? 'Strong Lean' : 'Lean',
    side: isDrawWatch ? 'Draw' : (stronger.shortName || stronger.team),
    detail: isDrawWatch
      ? `${ppgGap.toFixed(2)} points/game gap with draw form on both sides.`
      : `${ppgEdge} points/game edge and ${gdEdge >= 0 ? '+' : ''}${gdEdge} goal-difference edge.`,
    best,
  }
}

function MatchupTeamBox({ title, grade, rows }: { title: string; grade?: string | null; rows: Array<{ label: string; value: string }> }) {
  return (
    <View style={styles.matchupTeamBox}>
      <View style={styles.matchupTeamTop}>
        <AppText style={styles.matchupTeamTitle}>{title}</AppText>
        {grade ? <AppText style={styles.matchupGrade}>{grade}</AppText> : null}
      </View>
      {rows.map((row) => (
        <View key={`${title}-${row.label}`} style={styles.matchupStatRow}>
          <AppText variant="muted" style={styles.matchupStatLabel}>{row.label}</AppText>
          <AppText style={styles.matchupStatValue}>{row.value}</AppText>
        </View>
      ))}
    </View>
  )
}

export default function DashboardScreen() {
  const { profile } = useAuth()
  const mobileConfig = useMobileConfig()
  const [sport, setSport] = useState<Sport>('MLB')
  const [view, setView] = useState<DashboardView>('lines')
  const [selectedLineWeek, setSelectedLineWeek] = useState('')
  const [selectedMatchupWeek, setSelectedMatchupWeek] = useState('')
  const [expandedMlbTeam, setExpandedMlbTeam] = useState<string | null>(null)
  const [expandedNflTeam, setExpandedNflTeam] = useState<string | null>(null)
  const [soccerLeague, setSoccerLeague] = useState('soccer_epl')
  const [collegeScope, setCollegeScope] = useState<'top25' | 'all'>('top25')
  const [collegeConference, setCollegeConference] = useState('All')
  const selectedSoccerLeague = SOCCER_LEAGUES.find((item) => item.key === soccerLeague) || SOCCER_LEAGUES[0]
  const mobileFlag = (key: string, fallback = false) => mobileConfig.flags[key] ?? fallback
  const visibleSports = SPORTS.filter((item) => mobileFlag(item.visibilityFlag, true))
  const selectedSport = visibleSports.find((item) => item.key === sport) || visibleSports[0] || SPORTS[0]
  const isSelectedSportActive = mobileFlag(selectedSport.flag, selectedSport.status === 'Live')
  const getSportActive = (item: (typeof SPORTS)[number]) => mobileFlag(item.flag, item.status === 'Live')
  const tabVisible = (tab: DashboardView) => {
    const prefix = sportApiKey(sport)
    if (sport === 'MLB' || sport === 'NBA' || sport === 'NHL' || sport === 'WNBA') return mobileFlag(`${prefix}_tab_${tab}`, true)
    if (sport === 'NFL') {
      if (tab === 'props') return true
      return mobileFlag(`nfl_dashboard_tab_${tab}`, true)
    }
    return true
  }
  const rawDashboardViews: DashboardView[] =
    sport === 'NFL'
      ? ['league', 'matchups', 'lines', 'props']
    : sport === 'NCAAF'
        ? ['league', 'matchups', 'lines']
    : sport === 'NCAAB'
        ? ['league', 'lines']
      : sport === 'MLB' || sport === 'NBA' || sport === 'NHL' || sport === 'WNBA'
        ? ['league', 'matchups', 'lines', 'props']
        : sport === 'SOCCER'
          ? ['league', 'matchups', 'lines']
          : ['lines', 'props']
  const dashboardViews = rawDashboardViews.filter(tabVisible)
  const secondaryViewLabel = sport === 'NCAAF' ? 'Game Matchups' : sport === 'KBO' ? 'Team Stats' : isCollegeSport(sport) || sport === 'SOCCER' ? 'Team Info' : 'Player Props'
  const isPremium = profile?.is_premium === true
  const sportFlagPrefix = sportApiKey(sport)
  const viewVisible = dashboardViews.includes(view)
  const linesFree = mobileFlag(`${sportFlagPrefix}_access_lines_free`, false)
  const propsFree = mobileFlag(`${sportFlagPrefix}_access_props_free`, false)
  const linesMaintenance = mobileFlag(`${sportFlagPrefix}_maintenance_lines`, false)
  const propsMaintenance = mobileFlag(`${sportFlagPrefix}_maintenance_props`, false)
  const canViewLines = isPremium || linesFree
  const canViewProps = isPremium || propsFree
  const canViewMatchups = true
  const canFetchLines = isSelectedSportActive && viewVisible && view === 'lines' && canViewLines && !linesMaintenance
  const canFetchMatchups = isSelectedSportActive && viewVisible && view === 'matchups' && canViewMatchups
  const canFetchProps = isSelectedSportActive && viewVisible && view === 'props' && canViewProps && !propsMaintenance && !isCollegeSport(sport) && hasLiveProps(sport)

  useEffect(() => {
    if (dashboardViews.length && !dashboardViews.includes(view)) setView(dashboardViews[0])
  }, [dashboardViews.join('|'), view])

  useEffect(() => {
    if (visibleSports.length && !visibleSports.some((item) => item.key === sport)) {
      setSport(visibleSports[0].key)
    }
  }, [sport, visibleSports.map((item) => item.key).join('|')])
  const lineQuery = useQuery({
    queryKey: ['game-lines', sport, view, sport === 'SOCCER' ? soccerLeague : 'default'],
    queryFn: () => kingfishFetch<Game[]>(
      sport === 'SOCCER'
        ? `/api/soccer-odds?league=${soccerLeague}${view === 'matchups' ? '&scope=matchups' : ''}`
        : `/api/${sportApiKey(sport)}-odds${view === 'matchups' && (sport === 'NBA' || sport === 'NHL' || sport === 'WNBA') ? '?scope=matchups' : ''}`
    ),
    enabled: canFetchLines || (canFetchMatchups && ['MLB', 'NBA', 'NHL', 'WNBA', 'SOCCER'].includes(sport)),
    staleTime: 5 * 60 * 1000,
  })
  const weatherQuery = useQuery({
    queryKey: ['mlb-weather', lineQuery.data?.map((game) => game.id || game.game_id).join(',')],
    queryFn: () =>
      kingfishFetch<Record<string, WeatherInfo>>('/api/mlb-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: lineQuery.data || [] }),
      }),
    enabled: sport === 'MLB' && canFetchLines && !!lineQuery.data?.length,
    staleTime: 60 * 60 * 1000,
  })
  const propsQuery = useQuery({
    queryKey: ['player-props', sport],
    queryFn: () => kingfishFetch<PropsResponse>(
      sport === 'NBA' || sport === 'NHL' || sport === 'WNBA'
        ? `/api/${sportApiKey(sport)}-props?includeStats=1`
        : `/api/${sportApiKey(sport)}-props`
    ),
    enabled: canFetchProps,
    staleTime: 5 * 60 * 1000,
  })
  const nflFuturesQuery = useQuery({
    queryKey: ['nfl-mobile-league-view'],
    queryFn: () => kingfishFetch<NFLFuturesData>('/data/nfl/futures-2026.json'),
    enabled: isSelectedSportActive && sport === 'NFL' && view === 'league',
    staleTime: 24 * 60 * 60 * 1000,
  })
  const ncaafOutlookQuery = useQuery({
    queryKey: ['ncaaf-mobile-league-view'],
    queryFn: () => kingfishFetch<NCAAFOutlookData>('/data/ncaaf/team-outlook-2026.json'),
    enabled: isSelectedSportActive && sport === 'NCAAF' && view === 'league',
    staleTime: 24 * 60 * 60 * 1000,
  })
  const ncaabBaselineQuery = useQuery({
    queryKey: ['ncaab-mobile-team-board'],
    queryFn: () => kingfishFetch<NCAABBaselineData>('/data/ncaab/team-baseline-2026.json'),
    enabled: isSelectedSportActive && sport === 'NCAAB' && view === 'league',
    staleTime: 24 * 60 * 60 * 1000,
  })
  const ncaafMatchupsQuery = useQuery({
    queryKey: ['ncaaf-mobile-matchups'],
    queryFn: () => kingfishFetch<NCAAFMatchup[]>('/api/ncaaf-matchups'),
    enabled: isSelectedSportActive && sport === 'NCAAF' && view === 'matchups',
    staleTime: 10 * 60 * 1000,
  })
  const nflMatchupsQuery = useQuery({
    queryKey: ['nfl-mobile-matchups'],
    queryFn: () => kingfishFetch<NCAAFMatchup[]>('/api/nfl-matchups'),
    enabled: isSelectedSportActive && sport === 'NFL' && view === 'matchups',
    staleTime: 10 * 60 * 1000,
  })
  const soccerTeamQuery = useQuery({
    queryKey: ['soccer-team-info', soccerLeague],
    queryFn: () => kingfishFetch<{ teams: SoccerTeamInfo[]; updated_at?: string | null }>(`/api/soccer-team-info?league=${soccerLeague}`),
    enabled: isSelectedSportActive && sport === 'SOCCER' && view === 'league',
    staleTime: 24 * 60 * 60 * 1000,
  })
  const kboTeamQuery = useQuery({
    queryKey: ['kbo-team-stats'],
    queryFn: () => kingfishFetch<KBOTeamStats>('/api/kbo-team-stats'),
    enabled: isSelectedSportActive && sport === 'KBO' && (view === 'props' || view === 'lines'),
    staleTime: 18 * 60 * 60 * 1000,
  })
  const teamFormQuery = useQuery({
    queryKey: ['team-form', sport],
    queryFn: () => kingfishFetch<TeamFormPayload>(`/api/${sportApiKey(sport)}-team-form`),
    enabled: isSelectedSportActive && (sport === 'NBA' || sport === 'NHL' || sport === 'WNBA') && (view === 'league' || view === 'matchups'),
    staleTime: 30 * 60 * 1000,
  })
  const mlbScheduleQuery = useQuery({
    queryKey: ['mlb-schedule-context'],
    queryFn: () => kingfishFetch<MLBSchedulePayload>('/api/mlb-schedule'),
    enabled: isSelectedSportActive && sport === 'MLB' && (view === 'league' || view === 'matchups'),
    staleTime: 60 * 60 * 1000,
  })
  const mlbL10Query = useQuery({
    queryKey: ['mlb-team-l10'],
    queryFn: () => kingfishFetch<MLBL10Payload>('/api/mlb-team-l10'),
    enabled: isSelectedSportActive && sport === 'MLB' && (view === 'league' || view === 'matchups'),
    staleTime: 60 * 60 * 1000,
  })
  const kboTeams = [...(kboTeamQuery.data?.teams || [])].sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999))
  const soccerTeams = [...(soccerTeamQuery.data?.teams || [])].sort((a, b) => {
    const aPos = Number(a.position || 999)
    const bPos = Number(b.position || 999)
    return aPos - bPos || String(a.team).localeCompare(String(b.team))
  })
  const mlbStandings = mlbDivisionStandings(mlbScheduleQuery.data?.teamRecords, mlbL10Query.data?.teamL10Map)
  const upcomingLineGames = upcomingGames(lineQuery.data || [])
  const lineWeeks = sport === 'NFL' || sport === 'NCAAF' ? weekOptions(upcomingLineGames) : []
  const activeLineWeek = lineWeeks.find((week) => week.key === selectedLineWeek) || lineWeeks[0]
  const visibleLineGames = (sport === 'NFL' || sport === 'NCAAF') && activeLineWeek ? activeLineWeek.games : upcomingLineGames
  const visibleLineGroups = groupGamesByDate(visibleLineGames)
  const nflMatchupGames = upcomingGames(nflMatchupsQuery.data || [])
  const nflMatchupWeeks = sport === 'NFL' ? weekOptions(nflMatchupGames) : []
  const activeNflMatchupWeek = nflMatchupWeeks.find((week) => week.key === selectedMatchupWeek) || nflMatchupWeeks[0]
  const visibleNflMatchups = activeNflMatchupWeek ? activeNflMatchupWeek.games : nflMatchupGames
  const visibleNflMatchupGroups = groupGamesByDate(visibleNflMatchups)
  const ncaafTeams = ncaafOutlookQuery.data?.teams || []
  const ncaafConferences = ['All', ...Array.from(new Set(ncaafTeams.map((team) => team.conference))).sort()]
  const filteredNcaafTeams = ncaafTeams.filter((team) => {
    const scopeMatch = collegeScope === 'all' || team.rank <= 25
    const conferenceMatch = collegeConference === 'All' || team.conference === collegeConference
    return scopeMatch && conferenceMatch
  })
  const ncaafTeamForName = (teamName: string) => ncaafTeams.find((team) => {
    const posted = teamName.toLowerCase()
    const known = team.team.toLowerCase()
    return posted === known || posted.includes(known) || known.includes(posted)
  })
  const filteredNcaafMatchups = (ncaafMatchupsQuery.data || []).filter((game) => {
    if (collegeScope === 'top25') {
      const awayRank = ncaafTeamForName(game.away_team)?.rank
      const homeRank = ncaafTeamForName(game.home_team)?.rank
      if (!awayRank && !homeRank) return false
      if ((awayRank || 999) > 25 && (homeRank || 999) > 25) return false
    }
    if (collegeConference !== 'All') {
      const awayConf = ncaafTeamForName(game.away_team)?.conference
      const homeConf = ncaafTeamForName(game.home_team)?.conference
      if (awayConf !== collegeConference && homeConf !== collegeConference) return false
    }
    return true
  })
  const ncaafMatchupGroups = groupGamesByDate(filteredNcaafMatchups)
  const propsGames = Array.isArray(propsQuery.data) ? propsQuery.data : propsQuery.data?.props || []
  const bundledPlayerStats = Array.isArray(propsQuery.data) ? undefined : propsQuery.data?.playerStats

  return (
    <Screen>
      <View style={styles.boardIntro}>
        <AppText variant="eyebrow">// Live Board</AppText>
        <AppText variant="title" style={styles.title}>Dashboard</AppText>
        <AppText variant="muted" style={styles.copy}>
        Live odds, props, weather, and betting intelligence across the sports KingFish supports.
        </AppText>
      </View>

      <View style={styles.row}>
        {visibleSports.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => {
              setSport(item.key)
              if (item.key === 'NFL') setView('league')
              else if (item.key === 'NCAAF') setView('league')
              else if (view === 'league') setView('lines')
              if (isCollegeSport(item.key) && view === 'props') setView('props')
            }}
            style={[styles.pill, sport === item.key && styles.activePill]}
          >
            <View style={styles.pillInner}>
              <AppText style={[styles.pillText, sport === item.key && styles.activePillText]}>
                {item.key}
              </AppText>
              {getSportActive(item) && <View style={[styles.statusDot, styles.liveDot]} />}
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.segment}>
        {dashboardViews.map((item) => (
          <Pressable
            key={item}
            onPress={() => setView(item)}
            style={[styles.segmentButton, view === item && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, view === item && styles.segmentTextActive]}>
              {item === 'league' ? 'League View' : item === 'matchups' ? 'Game Matchups' : item === 'lines' ? 'Game Lines' : secondaryViewLabel}
            </AppText>
          </Pressable>
        ))}
      </View>

      {sport === 'SOCCER' && (
        <View style={styles.soccerLeagueRow}>
          {SOCCER_LEAGUES.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setSoccerLeague(item.key)}
              style={[styles.soccerLeaguePill, soccerLeague === item.key && styles.soccerLeaguePillActive]}
            >
              <AppText style={[styles.soccerLeagueText, soccerLeague === item.key && styles.soccerLeagueTextActive]}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      {sport === 'NCAAF' && (
        <View style={styles.soccerLeagueRow}>
          {(['top25', 'all'] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => setCollegeScope(item)}
              style={[styles.soccerLeaguePill, collegeScope === item && styles.soccerLeaguePillActive]}
            >
              <AppText style={[styles.soccerLeagueText, collegeScope === item && styles.soccerLeagueTextActive]}>
                {item === 'top25' ? 'Top 25' : 'All Teams'}
              </AppText>
            </Pressable>
          ))}
          {ncaafConferences.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCollegeConference(item)}
              style={[styles.soccerLeaguePill, collegeConference === item && styles.soccerLeaguePillActive]}
            >
              <AppText style={[styles.soccerLeagueText, collegeConference === item && styles.soccerLeagueTextActive]}>
                {item}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}

      <Card>
        <AppText variant="eyebrow">// {sport} {isSelectedSportActive ? 'Active' : selectedSport.status}</AppText>
        <AppText variant="title" style={styles.cardTitle}>
          {isSelectedSportActive
            ? (view === 'league' ? 'League View' : view === 'matchups' ? 'Game Matchups' : view === 'lines' ? 'Game Lines' : secondaryViewLabel)
            : selectedSport.inactiveTitle}
        </AppText>
        <AppText variant="muted">
          {isSelectedSportActive && sport === 'SOCCER'
            ? `${selectedSoccerLeague.label} game lines and team context when supported markets are available.`
            : isSelectedSportActive ? selectedSport.description : selectedSport.inactiveDescription}
        </AppText>
        {!isSelectedSportActive && (
          <View style={styles.roadmapBox}>
            <AppText variant="eyebrow">// Season Watch</AppText>
            <AppText variant="muted" style={styles.roadmapText}>
              Check back here when supported markets are available.
            </AppText>
          </View>
        )}
    </Card>

      {isSelectedSportActive && view === 'league' && (sport === 'MLB' || sport === 'NBA' || sport === 'NHL' || sport === 'WNBA') && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">
              {sport === 'MLB' ? 'Team records and recent form from today’s posted MLB slate' : `${sport} team record and recent-form context`}
            </AppText>
          </View>

          {sport === 'MLB' ? (
            <>
              {(mlbScheduleQuery.isLoading || mlbL10Query.isLoading) && (
                <View style={styles.centerState}>
                  <ActivityIndicator color={colors.gold} />
                  <AppText variant="muted" style={styles.stateText}>Loading MLB league view...</AppText>
                </View>
              )}
              {!mlbScheduleQuery.isLoading && !mlbL10Query.isLoading && mlbStandings.length === 0 && (
                <Card>
                  <AppText variant="eyebrow">// MLB Standings</AppText>
                  <AppText variant="muted" style={styles.stateText}>No MLB standings are available right now.</AppText>
                </Card>
              )}

              {mlbStandings.map((division) => (
                <Card key={division.name}>
                  <AppText variant="eyebrow">// {division.name}</AppText>
                  <View style={styles.standingsHeader}>
                    <AppText style={[styles.standingsHeaderText, styles.standingsRankCell]}>#</AppText>
                    <AppText style={[styles.standingsHeaderText, styles.standingsTeamCell]}>Team</AppText>
                    <AppText style={styles.standingsHeaderText}>W-L</AppText>
                    <AppText style={styles.standingsHeaderText}>GB</AppText>
                    <AppText style={styles.standingsHeaderText}>L10</AppText>
                  </View>
                  {division.entries.map((entry) => {
                    const isExpanded = expandedMlbTeam === entry.team.abbr
                    return (
                      <View key={entry.team.abbr}>
                        <Pressable
                          onPress={() => setExpandedMlbTeam(isExpanded ? null : entry.team.abbr)}
                          style={styles.standingsRow}
                        >
                          <AppText style={[styles.standingsRank, styles.standingsRankCell]}>{entry.rank}</AppText>
                          <View style={styles.standingsTeamCell}>
                            <AppText style={styles.standingsTeam}>{entry.team.name}</AppText>
                            <AppText variant="mono">{entry.team.abbr} · {formatMlbPct(entry.record?.pct)} pct</AppText>
                          </View>
                          <AppText style={styles.standingsValue}>{entry.record ? `${entry.record.wins}-${entry.record.losses}` : '-'}</AppText>
                          <AppText style={styles.standingsValue}>{entry.gb}</AppText>
                          <AppText style={styles.standingsValue}>{entry.l10 ? `${entry.l10.wins}-${entry.l10.losses}` : '-'}</AppText>
                        </Pressable>
                        {isExpanded && (
                          <View style={styles.standingsDetail}>
                            <View style={styles.teamInfoStats}>
                              <View style={styles.teamInfoStat}>
                                <AppText variant="mono">Record</AppText>
                                <AppText style={styles.teamInfoValue}>{entry.record ? `${entry.record.wins}-${entry.record.losses}` : '-'}</AppText>
                              </View>
                              <View style={styles.teamInfoStat}>
                                <AppText variant="mono">Win Pct</AppText>
                                <AppText style={styles.teamInfoValue}>{formatMlbPct(entry.record?.pct)}</AppText>
                              </View>
                              <View style={styles.teamInfoStat}>
                                <AppText variant="mono">L10 Total</AppText>
                                <AppText style={styles.teamInfoValue}>{entry.l10 ? Number(entry.l10.avgTotal).toFixed(1) : '-'}</AppText>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    )
                  })}
                </Card>
              ))}
            </>
          ) : (
            <>
              {teamFormQuery.isLoading && (
                <View style={styles.centerState}>
                  <ActivityIndicator color={colors.gold} />
                  <AppText variant="muted" style={styles.stateText}>Loading {sport} league view...</AppText>
                </View>
              )}
              {uniqueTeamForms(teamFormQuery.data?.teams).map((team: any) => (
                <Card key={`${team.teamAbbr}-${team.teamName}`}>
                  <View style={styles.teamInfoHeader}>
                    <View style={styles.teamInfoRank}>
                      <AppText style={styles.teamInfoRankText}>{team.teamAbbr || '-'}</AppText>
                    </View>
                    <View style={styles.teamInfoBody}>
                      <AppText style={styles.teamInfoName}>{team.teamName || team.commonName}</AppText>
                      <AppText variant="muted" style={styles.teamInfoMeta}>
                        {teamRecordLabel(team, sport)} · {sport === 'NHL' ? `${team.points || 0} pts` : `${team.games || 0} recent games`}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.teamInfoStats}>
                    <View style={styles.teamInfoStat}>
                      <AppText variant="mono">Recent</AppText>
                      <AppText style={styles.teamInfoValue}>{formLabel(team, sport)}</AppText>
                    </View>
                    <View style={styles.teamInfoStat}>
                      <AppText variant="mono">Total</AppText>
                      <AppText style={styles.teamInfoValue}>{team.l10Total ? Number(team.l10Total).toFixed(1) : team.goalsForPerGame ? `${Number(team.goalsForPerGame).toFixed(1)} GF` : '-'}</AppText>
                    </View>
                  </View>
                </Card>
              ))}
            </>
          )}
        </View>
      )}

      {isSelectedSportActive && view === 'matchups' && (sport === 'MLB' || sport === 'NBA' || sport === 'NHL' || sport === 'WNBA' || sport === 'SOCCER') && canViewMatchups && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">Game matchup context using posted lines and team form</AppText>
          </View>
          {lineQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading matchups...</AppText>
            </View>
          )}
          {lineQuery.data?.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Empty</AppText>
              <AppText variant="muted" style={styles.stateText}>No matchups found for {sport} right now.</AppText>
            </Card>
          )}
          {upcomingLineGames.map((game) => {
            const awayAbbr = mlbAbbr(game.away_team)
            const homeAbbr = mlbAbbr(game.home_team)
            const awayForm = sport === 'MLB'
              ? mlbL10Query.data?.teamL10Map?.[awayAbbr]
              : findTeamForm(teamFormQuery.data?.teams, game.away_team)
            const homeForm = sport === 'MLB'
              ? mlbL10Query.data?.teamL10Map?.[homeAbbr]
              : findTeamForm(teamFormQuery.data?.teams, game.home_team)
            const awayRecord = sport === 'MLB' ? mlbScheduleQuery.data?.teamRecords?.[awayAbbr] : awayForm
            const homeRecord = sport === 'MLB' ? mlbScheduleQuery.data?.teamRecords?.[homeAbbr] : homeForm
            const soccerAway = sport === 'SOCCER' ? soccerTeams.find((team) => {
              const full = normalizeTeamKey(team.team)
              const short = normalizeTeamKey(team.shortName || '')
              const posted = normalizeTeamKey(game.away_team)
              return full === posted || short === posted || full.includes(posted) || posted.includes(full)
            }) : undefined
            const soccerHome = sport === 'SOCCER' ? soccerTeams.find((team) => {
              const full = normalizeTeamKey(team.team)
              const short = normalizeTeamKey(team.shortName || '')
              const posted = normalizeTeamKey(game.home_team)
              return full === posted || short === posted || full.includes(posted) || posted.includes(full)
            }) : undefined
            const soccerLean = sport === 'SOCCER' ? soccerMatchupLean(soccerAway, soccerHome, game) : null
            const awayPct = sport === 'MLB' ? Number(awayRecord?.pct || 0) : 0
            const homePct = sport === 'MLB' ? Number(homeRecord?.pct || 0) : 0
            const stronger = sport === 'MLB' && awayPct !== homePct ? (awayPct > homePct ? shortTeamName(game.away_team) : shortTeamName(game.home_team)) : null
            const note = sport === 'MLB'
              ? stronger
                ? `${stronger} owns the better season win rate by ${(Math.abs(awayPct - homePct) * 100).toFixed(1)} percentage points. Use the lines tab to compare that edge against the best available price.`
                : 'Season records are close. Use probable pitchers, recent form, and the best posted line before making the call.'
              : sport === 'SOCCER' && soccerLean
                ? `${soccerLean.detail} Use posted moneylines to compare the table edge against the best available price.`
                : 'Use team form and posted market prices together before making the call.'
            const awayRows = sport === 'MLB'
              ? [
                  { label: 'Record', value: awayRecord ? `${awayRecord.wins}-${awayRecord.losses}` : '-' },
                  { label: 'Win Pct', value: awayRecord ? `${(Number(awayRecord.pct || 0) * 100).toFixed(1)}%` : '-' },
                  { label: 'Last 10', value: awayForm ? `${awayForm.wins}-${awayForm.losses}` : '-' },
                  { label: 'Probable SP', value: mlbScheduleQuery.data?.pitcherNameMap?.[awayAbbr] || 'TBD' },
                ]
              : sport === 'SOCCER'
                ? [
                    { label: 'Record', value: soccerRecordLine(soccerAway) },
                    { label: 'Table', value: soccerAway?.position ? `#${soccerAway.position} · ${soccerAway.points || 0} pts` : '-' },
                    { label: 'Goals', value: soccerStatLine(soccerAway) },
                    { label: 'Form', value: soccerAway?.form || '-' },
                  ]
                : [
                    { label: 'Record', value: teamRecordLabel(awayRecord, sport) },
                    { label: 'Recent', value: formLabel(awayRecord, sport) },
                    { label: sport === 'NHL' ? 'Points' : 'Games', value: sport === 'NHL' ? String(awayRecord?.points || 0) : String(awayRecord?.games || 0) },
                  ]
            const homeRows = sport === 'MLB'
              ? [
                  { label: 'Record', value: homeRecord ? `${homeRecord.wins}-${homeRecord.losses}` : '-' },
                  { label: 'Win Pct', value: homeRecord ? `${(Number(homeRecord.pct || 0) * 100).toFixed(1)}%` : '-' },
                  { label: 'Last 10', value: homeForm ? `${homeForm.wins}-${homeForm.losses}` : '-' },
                  { label: 'Probable SP', value: mlbScheduleQuery.data?.pitcherNameMap?.[homeAbbr] || 'TBD' },
                ]
              : sport === 'SOCCER'
                ? [
                    { label: 'Record', value: soccerRecordLine(soccerHome) },
                    { label: 'Table', value: soccerHome?.position ? `#${soccerHome.position} · ${soccerHome.points || 0} pts` : '-' },
                    { label: 'Goals', value: soccerStatLine(soccerHome) },
                    { label: 'Form', value: soccerHome?.form || '-' },
                  ]
                : [
                    { label: 'Record', value: teamRecordLabel(homeRecord, sport) },
                    { label: 'Recent', value: formLabel(homeRecord, sport) },
                    { label: sport === 'NHL' ? 'Points' : 'Games', value: sport === 'NHL' ? String(homeRecord?.points || 0) : String(homeRecord?.games || 0) },
                  ]
            return (
              <Card key={game.id || game.game_id || `${game.away_team}-${game.home_team}`}>
                <View style={styles.gameHeader}>
                  <AppText style={styles.gameTitle}>{shortTeamName(game.away_team)} @ {shortTeamName(game.home_team)}</AppText>
                  <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
                </View>
                {sport === 'SOCCER' && soccerLean && (
                  <View style={styles.leanBox}>
                    <View style={styles.leanCopy}>
                      <AppText variant="mono">KingFish {soccerLean.type}</AppText>
                      <AppText style={styles.leanMain}>{soccerLean.side}</AppText>
                      <AppText variant="muted" style={styles.leanDetail}>{soccerLean.detail}</AppText>
                    </View>
                    {soccerLean.best && (
                      <View style={styles.leanPrice}>
                        <AppText style={styles.leanPriceText}>{soccerLean.best.price > 0 ? `+${soccerLean.best.price}` : soccerLean.best.price}</AppText>
                        <AppText variant="mono">{BOOK_DISPLAY_NAMES[soccerLean.best.book] || soccerLean.best.book}</AppText>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.matchupTeamGrid}>
                  <MatchupTeamBox title={shortTeamName(game.away_team)} grade={sport === 'MLB' ? recordGrade(awayPct) : null} rows={awayRows} />
                  <MatchupTeamBox title={shortTeamName(game.home_team)} grade={sport === 'MLB' ? recordGrade(homePct) : null} rows={homeRows} />
                </View>
                <View style={styles.matchupNote}>
                  <AppText variant="eyebrow">KingFish Matchup Note</AppText>
                  <AppText variant="muted" style={styles.matchupNoteText}>{note}</AppText>
                </View>
              </Card>
            )
          })}
        </View>
      )}

      {isSelectedSportActive && view === 'matchups' && !canViewMatchups && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Premium</AppText>
            <AppText variant="title" style={styles.cardTitle}>Unlock Game Matchups</AppText>
            <AppText variant="muted">Team form, matchup context, and market notes are part of KingFish Bets Pro.</AppText>
            {mobileConfig.flags.mobile_paywall ? (
              <View style={styles.upgradeAction}>
                <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
              </View>
            ) : null}
          </Card>
        </View>
      )}

          {isSelectedSportActive && sport === 'NFL' && view === 'league' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">
              Division baseline from 2025 results until live 2026 standings are available
            </AppText>
          </View>

          {nflFuturesQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading NFL league view...</AppText>
            </View>
          )}

          {nflFuturesQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// NFL League View</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load NFL league context.</AppText>
            </Card>
          )}

          {nflFuturesQuery.data?.division.map((division) => (
            <Card key={division.division}>
              <AppText variant="eyebrow">// {division.division}</AppText>
              <View style={styles.leagueHeader}>
                <AppText style={[styles.leagueHeaderText, styles.leagueTeamCell]}>Team</AppText>
                <AppText style={styles.leagueHeaderText}>2025 Wins</AppText>
                <AppText style={styles.leagueHeaderText}>Div Rank</AppText>
                <AppText style={styles.leagueHeaderText}>L5</AppText>
                <AppText style={styles.leagueHeaderText}>Info</AppText>
              </View>
              {division.entries.map((entry) => {
                const context = nflFuturesQuery.data?.divisionContext[entry.team]
                const isExpanded = expandedNflTeam === entry.team
                return (
                  <View key={`${division.division}-${entry.team}`}>
                    <Pressable
                      onPress={() => setExpandedNflTeam(isExpanded ? null : entry.team)}
                      style={styles.leagueRow}
                    >
                      <AppText style={[styles.leagueTeam, styles.leagueTeamCell]}>{entry.team}</AppText>
                      <AppText style={styles.leagueValue}>{context ? `${context.wins}W` : '-'}</AppText>
                      <AppText style={styles.leagueValue}>{context ? `#${context.rank}` : '-'}</AppText>
                      <AppText style={styles.leagueValue}>{context ? `${context.last5Wins}-${5 - context.last5Wins}` : '-'}</AppText>
                      <AppText style={styles.leagueInfo}>{isExpanded ? 'Hide' : 'View'}</AppText>
                    </Pressable>
                    {isExpanded && (
                      <View style={styles.leagueDetail}>
                        <AppText variant="eyebrow">{entry.team} Snapshot</AppText>
                        <AppText variant="muted" style={styles.leagueDetailText}>
                          Showing prior-season division context until live 2026 records, standings, and recent form are available.
                        </AppText>
                        <View style={styles.leagueDetailGrid}>
                          <View style={styles.leagueDetailItem}>
                            <AppText variant="mono">2025 Wins</AppText>
                            <AppText style={styles.leagueDetailValue}>{context ? `${context.wins} wins` : '-'}</AppText>
                          </View>
                          <View style={styles.leagueDetailItem}>
                            <AppText variant="mono">Division Finish</AppText>
                            <AppText style={styles.leagueDetailValue}>{context ? `#${context.rank}` : '-'}</AppText>
                          </View>
                          <View style={styles.leagueDetailItem}>
                            <AppText variant="mono">Last 5</AppText>
                            <AppText style={styles.leagueDetailValue}>{context ? `${context.last5Wins}-${5 - context.last5Wins}` : '-'}</AppText>
                          </View>
                          <View style={styles.leagueDetailItem}>
                            <AppText variant="mono">2026 Live Record</AppText>
                            <AppText style={styles.leagueDetailValue}>Pending schedule/results</AppText>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )
              })}
            </Card>
          ))}
        </View>
      )}

      {isSelectedSportActive && sport === 'NFL' && view === 'matchups' && canViewMatchups && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">Free weekly matchup cards from posted NFL game lines</AppText>
          </View>

          {nflMatchupsQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading NFL matchups...</AppText>
            </View>
          )}

          {nflMatchupsQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Game Matchups</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load NFL matchups.</AppText>
            </Card>
          )}

          {!nflMatchupsQuery.isLoading && !nflMatchupsQuery.isError && nflMatchupGames.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Game Matchups</AppText>
              <AppText variant="title" style={styles.cardTitle}>No Matchups Yet</AppText>
              <AppText variant="muted">NFL matchup context appears after sportsbooks post the next slate.</AppText>
            </Card>
          )}

          {nflMatchupWeeks.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
              {nflMatchupWeeks.map((week) => (
                <Pressable
                  key={week.key}
                  onPress={() => setSelectedMatchupWeek(week.key)}
                  style={[styles.weekPill, activeNflMatchupWeek?.key === week.key && styles.weekPillActive]}
                >
                  <AppText style={[styles.weekPillText, activeNflMatchupWeek?.key === week.key && styles.weekPillTextActive]}>
                    {week.label}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {visibleNflMatchupGroups.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <DateDivider label={group.date} />
              {group.games.map((game) => {
                const awayShort = shortTeamName(game.away_team)
                const homeShort = shortTeamName(game.home_team)
                const favorite = game.favorite || 'Pending'
                const awayFavored = favorite === awayShort
                const homeFavored = favorite === homeShort
                const marketDetail = game.favoriteDetail || 'Market not posted yet'
                const totalLabel = game.total == null ? '-' : String(game.total)
                const awayRows = [
                  { label: 'Side', value: 'Away' },
                  { label: 'Market', value: awayFavored ? marketDetail : homeFavored ? 'Plus side' : 'Pending' },
                  { label: 'Total', value: totalLabel },
                ]
                const homeRows = [
                  { label: 'Side', value: 'Home' },
                  { label: 'Market', value: homeFavored ? marketDetail : awayFavored ? 'Plus side' : 'Pending' },
                  { label: 'Total', value: totalLabel },
                ]
                const note = favorite === 'Pending'
                  ? 'Schedule is loaded. Market context appears here when sportsbooks post moneyline, spread, or total prices.'
                  : `${favorite} is the current market favorite (${marketDetail}). Use the Game Lines tab to compare that edge against the best available price.`

                return (
                  <Card key={game.id}>
                    <View style={styles.gameHeader}>
                      <AppText style={styles.gameTitle}>{awayShort} @ {homeShort}</AppText>
                      <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
                    </View>
                    <AppText variant="muted" style={styles.teamInfoMeta}>{game.status}</AppText>
                    <View style={styles.matchupTeamGrid}>
                      <MatchupTeamBox title={awayShort} grade={awayFavored ? 'Fav' : null} rows={awayRows} />
                      <MatchupTeamBox title={homeShort} grade={homeFavored ? 'Fav' : null} rows={homeRows} />
                    </View>
                    <View style={styles.matchupNote}>
                      <AppText variant="eyebrow">KingFish Matchup Note</AppText>
                      <AppText variant="muted" style={styles.matchupNoteText}>{note}</AppText>
                    </View>
                  </Card>
                )
              })}
            </View>
          ))}
        </View>
      )}

      {isSelectedSportActive && sport === 'NCAAF' && view === 'league' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">College football team outlook for league context</AppText>
          </View>

          {ncaafOutlookQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading NCAAF league view...</AppText>
            </View>
          )}

          {ncaafOutlookQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// NCAAF League View</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load college football context.</AppText>
            </Card>
          )}

          {filteredNcaafTeams.map((team) => (
            <Card key={`${team.rank}-${team.team}`}>
              <View style={styles.teamInfoHeader}>
                <View style={styles.teamInfoRank}>
                  <AppText style={styles.teamInfoRankText}>{team.rank}</AppText>
                </View>
                <View style={styles.teamInfoBody}>
                  <AppText style={styles.teamInfoName}>{team.team}</AppText>
                  <AppText variant="muted" style={styles.teamInfoMeta}>
                    {team.conference} · {team.lastRecord} · {team.schedule} schedule
                  </AppText>
                </View>
                <View style={styles.teamInfoGrade}>
                  <AppText style={styles.teamInfoGradeText}>{team.power}</AppText>
                </View>
              </View>
              <AppText variant="muted" style={styles.roadmapText}>{team.profile}</AppText>
              <View style={styles.teamInfoStats}>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Lean</AppText>
                  <AppText style={styles.teamInfoValue}>{team.lean}</AppText>
                </View>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Conference</AppText>
                  <AppText style={styles.teamInfoValue}>{team.conference}</AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {isSelectedSportActive && sport === 'NCAAB' && view === 'league' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">College basketball team baseline for offseason and pregame context</AppText>
          </View>

          {ncaabBaselineQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading NCAAB team board...</AppText>
            </View>
          )}

          {ncaabBaselineQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Team Board</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load college basketball baseline.</AppText>
            </Card>
          )}

          {ncaabBaselineQuery.data?.teams.map((team) => (
            <Card key={`${team.rank}-${team.team}`}>
              <View style={styles.teamInfoHeader}>
                <View style={styles.teamInfoRank}>
                  <AppText style={styles.teamInfoRankText}>{team.rank}</AppText>
                </View>
                <View style={styles.teamInfoBody}>
                  <AppText style={styles.teamInfoName}>{team.team}</AppText>
                  <AppText variant="muted" style={styles.teamInfoMeta}>
                    {team.record} · {team.conference} · {team.tempo}
                  </AppText>
                </View>
                <View style={styles.teamInfoGrade}>
                  <AppText style={styles.teamInfoGradeText}>{team.lean}</AppText>
                </View>
              </View>
              <AppText variant="muted" style={styles.roadmapText}>{team.profile}</AppText>
              <View style={styles.teamInfoStats}>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Offense</AppText>
                  <AppText style={styles.teamInfoValue}>{team.offense}</AppText>
                </View>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Defense</AppText>
                  <AppText style={styles.teamInfoValue}>{team.defense}</AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {isSelectedSportActive && view === 'lines' && !canViewLines && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Premium</AppText>
            <AppText variant="title" style={styles.cardTitle}>Unlock Game Lines</AppText>
            <AppText variant="muted">
              Live moneylines, spreads, totals, best available prices, and KingFish matchup context
              are part of KingFish Bets Pro.
            </AppText>
            {mobileConfig.flags.mobile_paywall ? (
              <View style={styles.upgradeAction}>
                <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
              </View>
            ) : null}
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'lines' && canViewLines && linesMaintenance && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Maintenance</AppText>
            <AppText variant="title" style={styles.cardTitle}>Game Lines Paused</AppText>
            <AppText variant="muted">This board is temporarily paused while KingFish refreshes the market data.</AppText>
          </Card>
        </View>
      )}

      {canFetchLines && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">
              {sport === 'KBO' && kboTeams.length
                ? `Live KBO lines with ${kboTeams.length} team records loaded for context`
                : 'Live lines refresh throughout the day · best available odds are highlighted in gold'}
            </AppText>
          </View>
          {lineQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading live lines...</AppText>
            </View>
          )}

          {lineQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Error</AppText>
              <AppText variant="muted" style={styles.stateText}>
                Could not load live lines.
              </AppText>
              <AppText variant="muted" style={styles.errorDetail}>
                {lineQuery.error instanceof Error ? lineQuery.error.message : 'Unknown request error'}
              </AppText>
            </Card>
          )}

          {lineQuery.data?.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Empty</AppText>
              <AppText variant="muted" style={styles.stateText}>No games found for {sport} right now.</AppText>
            </Card>
          )}

          {(sport === 'NFL' || sport === 'NCAAF') && lineWeeks.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
              {lineWeeks.map((week) => (
                <Pressable
                  key={week.key}
                  onPress={() => setSelectedLineWeek(week.key)}
                  style={[styles.weekPill, activeLineWeek?.key === week.key && styles.weekPillActive]}
                >
                  <AppText style={[styles.weekPillText, activeLineWeek?.key === week.key && styles.weekPillTextActive]}>
                    {week.label}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {lineQuery.data && lineQuery.data.length > 0 && visibleLineGames.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Empty</AppText>
              <AppText variant="muted" style={styles.stateText}>No upcoming games found for {sport} right now.</AppText>
            </Card>
          )}

          {visibleLineGroups.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <DateDivider label={group.date} />
              {group.games.map((game) => (
                <GameLineCard
                  key={game.id || game.game_id || `${game.away_team}-${game.home_team}`}
                  game={game}
                  weather={sport === 'MLB' ? weatherQuery.data?.[game.id || game.game_id || ''] : undefined}
                />
              ))}
            </View>
          ))}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && !isCollegeSport(sport) && sport !== 'SOCCER' && sport !== 'KBO' && !canViewProps && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Premium</AppText>
            <AppText variant="title" style={styles.cardTitle}>Unlock Player Props</AppText>
            <AppText variant="muted">
              Player props, cheat sheets, Edge Scores, and unlimited Ask KingFish access are part
              of KingFish Bets Pro.
            </AppText>
            {mobileConfig.flags.mobile_paywall ? (
              <View style={styles.upgradeAction}>
                <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
              </View>
            ) : null}
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'props' && !isCollegeSport(sport) && sport !== 'SOCCER' && sport !== 'KBO' && canViewProps && propsMaintenance && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Maintenance</AppText>
            <AppText variant="title" style={styles.cardTitle}>Player Props Paused</AppText>
            <AppText variant="muted">This board is temporarily paused while KingFish refreshes the prop data.</AppText>
          </Card>
        </View>
      )}

      {canFetchProps && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">
              {sport === 'MLB'
                ? 'Live props with player trends, hit rates, best odds, and Edge Scores'
                : 'Player props with recent form, hit rates, best odds, and Edge Scores'}
            </AppText>
          </View>
          {propsQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading player props...</AppText>
            </View>
          )}

          {propsQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Error</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load player props.</AppText>
              <AppText variant="muted" style={styles.errorDetail}>
                {propsQuery.error instanceof Error ? propsQuery.error.message : 'Unknown request error'}
              </AppText>
            </Card>
          )}

          {propsQuery.data && propsGames.length === 0 && sport !== 'NFL' && (
            <Card>
              <AppText variant="eyebrow">// Empty</AppText>
              <AppText variant="muted" style={styles.stateText}>No player props found for {sport} right now.</AppText>
            </Card>
          )}

          {sport === 'MLB' && propsGames.length > 0 && <MLBPropsTable games={propsGames} />}
          {sport !== 'MLB' && (propsGames.length > 0 || sport === 'NFL') && <PropsList games={propsGames} sport={sport} initialStats={bundledPlayerStats} />}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && sport === 'KBO' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">KBO team records, scoring form, and run prevention context</AppText>
          </View>

          {kboTeamQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading KBO team stats...</AppText>
            </View>
          )}

          {kboTeamQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Team Stats</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load KBO team stats.</AppText>
            </Card>
          )}

          {!kboTeamQuery.isLoading && !kboTeamQuery.isError && kboTeams.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Team Stats</AppText>
              <AppText variant="title" style={styles.cardTitle}>No Team Stats Yet</AppText>
              <AppText variant="muted">KBO team context will appear when standings are available.</AppText>
            </Card>
          )}

          {kboTeams.map((team) => (
            <Card key={`${team.rank}-${team.team}`}>
              <View style={styles.teamInfoHeader}>
                <View style={styles.teamInfoRank}>
                  <AppText style={styles.teamInfoRankText}>{team.rank || '-'}</AppText>
                </View>
                <View style={styles.teamInfoBody}>
                  <AppText style={styles.teamInfoName}>{team.team}</AppText>
                  <AppText variant="muted" style={styles.teamInfoMeta}>
                    {team.wins ?? 0}W-{team.losses ?? 0}L{team.draws ? `-${team.draws}D` : ''} · {team.pct ? `${Number(team.pct).toFixed(3)} pct` : 'pct pending'}
                  </AppText>
                </View>
                <View style={styles.teamInfoGrade}>
                  <AppText style={styles.teamInfoGradeText}>{team.rank && team.rank <= 2 ? 'A' : team.rank && team.rank <= 4 ? 'B+' : team.rank && team.rank <= 7 ? 'B' : team.rank ? 'C' : '-'}</AppText>
                </View>
              </View>
              <View style={styles.teamInfoStats}>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Runs/G</AppText>
                  <AppText style={styles.teamInfoValue}>{team.runsPerGame ? Number(team.runsPerGame).toFixed(1) : '-'}</AppText>
                </View>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Allowed/G</AppText>
                  <AppText style={styles.teamInfoValue}>{team.runsAllowedPerGame ? Number(team.runsAllowedPerGame).toFixed(1) : '-'}</AppText>
                </View>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Last 10</AppText>
                  <AppText style={styles.teamInfoValue}>{team.last10 ? `${team.last10.wins || 0}-${team.last10.losses || 0}` : '-'}</AppText>
                </View>
              </View>
            </Card>
          ))}
          {kboTeamQuery.data?.updated_at && (
            <View style={styles.dataNote}>
              <AppText variant="mono">
                Updated {new Date(kboTeamQuery.data.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </AppText>
            </View>
          )}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && isPremium && !isCollegeSport(sport) && sport !== 'SOCCER' && sport !== 'KBO' && !hasLiveProps(sport) && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Player Props</AppText>
            <AppText variant="muted">
              {sport} player props will appear here when supported books post regular-season markets.
            </AppText>
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'matchups' && sport === 'NCAAF' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">Cached matchup context from the latest NCAAF odds board</AppText>
          </View>

          {ncaafMatchupsQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading NCAAF matchups...</AppText>
            </View>
          )}

          {ncaafMatchupsQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Game Matchups</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load NCAAF matchups.</AppText>
            </Card>
          )}

          {!ncaafMatchupsQuery.isLoading && !ncaafMatchupsQuery.isError && filteredNcaafMatchups.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Game Matchups</AppText>
              <AppText variant="title" style={styles.cardTitle}>No Matchups Yet</AppText>
              <AppText variant="muted">NCAAF matchup context appears after sportsbooks post the next slate.</AppText>
            </Card>
          )}

          {ncaafMatchupGroups.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <DateDivider label={group.date} />
              {group.games.map((game) => {
                const awayRank = ncaafTeamForName(game.away_team)?.rank
                const homeRank = ncaafTeamForName(game.home_team)?.rank
                return (
                  <Card key={game.id}>
                    <View style={styles.gameHeader}>
                      <AppText style={styles.gameTitle}>
                        {shortTeamName(game.away_team)} @ {shortTeamName(game.home_team)}
                      </AppText>
                      <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
                    </View>
                    <AppText variant="muted" style={styles.teamInfoMeta}>
                      {awayRank && awayRank <= 25 ? `#${awayRank} ${shortTeamName(game.away_team)} · ` : ''}
                      {homeRank && homeRank <= 25 ? `#${homeRank} ${shortTeamName(game.home_team)} · ` : ''}
                      {game.status}
                    </AppText>
                    <View style={styles.teamInfoStats}>
                      <View style={styles.teamInfoStat}>
                        <AppText variant="mono">Favorite</AppText>
                        <AppText style={styles.teamInfoValue}>{game.favorite}</AppText>
                      </View>
                      <View style={styles.teamInfoStat}>
                        <AppText variant="mono">Spread</AppText>
                        <AppText style={styles.teamInfoValue}>{game.spread == null ? '-' : `${game.spread > 0 ? '+' : ''}${game.spread}`}</AppText>
                      </View>
                      <View style={styles.teamInfoStat}>
                        <AppText variant="mono">Total</AppText>
                        <AppText style={styles.teamInfoValue}>{game.total ?? '-'}</AppText>
                      </View>
                    </View>
                  </Card>
                )
              })}
            </View>
          ))}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && isCollegeSport(sport) && sport !== 'NCAAF' && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Team Stats</AppText>
            <AppText variant="muted">
              College sports will focus on team stats and matchup context, including points for,
              points against, pace, form, and team trends.
            </AppText>
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'league' && sport === 'SOCCER' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">{selectedSoccerLeague.label} team table, goal form, and matchup context</AppText>
          </View>

          {soccerTeamQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading team info...</AppText>
            </View>
          )}

          {soccerTeamQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Team Info</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load soccer team info.</AppText>
            </Card>
          )}

          {!soccerTeamQuery.isLoading && !soccerTeamQuery.isError && soccerTeams.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Team Info</AppText>
              <AppText variant="title" style={styles.cardTitle}>No Team Table Yet</AppText>
              <AppText variant="muted">
                Team records and goal context will appear here when standings are available for {selectedSoccerLeague.label}.
              </AppText>
            </Card>
          )}

          {soccerTeams.map((team) => (
            <Card key={`${team.team}-${team.position}`}>
              <View style={styles.teamInfoHeader}>
                <View style={styles.teamInfoRank}>
                  <AppText style={styles.teamInfoRankText}>{team.position || '-'}</AppText>
                </View>
                <View style={styles.teamInfoBody}>
                  <AppText style={styles.teamInfoName}>{team.shortName || team.team}</AppText>
                  <AppText variant="muted" style={styles.teamInfoMeta}>
                    {team.played ? `${team.won || 0}W-${team.drawn || 0}D-${team.lost || 0}L · ${team.points || 0} pts` : 'Record pending'}
                  </AppText>
                </View>
                <View style={styles.teamInfoGrade}>
                  <AppText style={styles.teamInfoGradeText}>{soccerTeamGrade(team)}</AppText>
                </View>
              </View>
              <View style={styles.teamInfoStats}>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">GF-GA</AppText>
                  <AppText style={styles.teamInfoValue}>
                    {team.played ? `${team.goalsFor || 0}-${team.goalsAgainst || 0}` : '-'}
                  </AppText>
                </View>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Goal Diff</AppText>
                  <AppText style={styles.teamInfoValue}>{team.goalDifference != null ? `${Number(team.goalDifference) >= 0 ? '+' : ''}${team.goalDifference}` : '-'}</AppText>
                </View>
                <View style={styles.teamInfoStat}>
                  <AppText variant="mono">Form</AppText>
                  <AppText style={styles.teamInfoValue}>{team.form || '-'}</AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
      {sport === 'NFL' && (
        <Card>
          <AppText variant="eyebrow">// More Research</AppText>
          <AppText variant="muted" style={styles.roadmapText}>
            Go deeper with futures, injuries, fantasy context, depth charts, and team research in the NFL Command Center.
          </AppText>
          <View style={styles.upgradeAction}>
            <Button variant="secondary" onPress={() => Linking.openURL(mobileConfig.links.nfl_command_center)}>
              Open NFL Command Center
            </Button>
          </View>
        </Card>
      )}
    </Screen>
  )
}

function DateDivider({ label }: { label: string }) {
  return (
    <View style={styles.dateDivider}>
      <AppText style={styles.dateDividerText}>{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  boardIntro: {
    marginBottom: spacing.lg,
  },
  title: {
    marginTop: 8,
  },
  copy: {
    marginTop: 10,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.bgCardAlt,
  },
  activePill: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.12)',
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  activePillText: {
    color: colors.gold,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveDot: {
    backgroundColor: colors.green,
  },
  offseasonDot: {
    backgroundColor: colors.yellow,
  },
  segment: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentButton: {
    flexBasis: '48%',
    flexGrow: 1,
    alignItems: 'center',
    borderRadius: 7,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  segmentActive: {
    backgroundColor: colors.gold,
  },
  segmentText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.bgPrimary,
  },
  soccerLeagueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  soccerLeaguePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.bgCardAlt,
  },
  soccerLeaguePillActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  soccerLeagueText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  soccerLeagueTextActive: {
    color: colors.bgPrimary,
  },
  weekRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  weekPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  weekPillActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  weekPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  weekPillTextActive: {
    color: colors.bgPrimary,
  },
  dateGroup: {
    gap: spacing.md,
  },
  dateDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  dateDividerText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 26,
    lineHeight: 28,
    marginVertical: 8,
  },
  roadmapBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  roadmapText: {
    marginTop: 6,
  },
  liveSection: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  gameTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dataNote: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  stateText: {
    marginTop: spacing.sm,
  },
  errorDetail: {
    marginTop: spacing.sm,
    color: colors.red,
  },
  upgradeAction: {
    marginTop: spacing.lg,
  },

  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  standingsHeaderText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
  },
  standingsRankCell: {
    flex: 0.35,
  },
  standingsTeamCell: {
    flex: 1.7,
    minWidth: 0,
  },
  standingsRank: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
  },
  standingsTeam: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  standingsValue: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },
  standingsDetail: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.md,
  },
  leagueHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  leagueHeaderText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  leagueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
  },
  leagueTeamCell: {
    flex: 1.2,
  },
  leagueTeam: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
  },
  leagueValue: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '900',
  },
  leagueInfo: {
    flex: 1,
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  leagueDetail: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  leagueDetailText: {
    marginTop: 6,
  },
  leagueDetailGrid: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  leagueDetailItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
  },
  leagueDetailValue: {
    color: colors.textPrimary,
    fontWeight: '900',
    marginTop: 6,
  },
  teamInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  teamInfoRank: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198,145,50,.10)',
  },
  teamInfoRankText: {
    color: colors.gold,
    fontWeight: '900',
  },
  teamInfoBody: {
    flex: 1,
  },
  teamInfoName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  teamInfoMeta: {
    marginTop: 4,
  },
  teamInfoGrade: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: colors.bgCardAlt,
  },
  teamInfoGradeText: {
    color: colors.gold,
    fontWeight: '900',
  },
  teamInfoStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  teamInfoStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.bgCardAlt,
  },
  teamInfoValue: {
    color: colors.textPrimary,
    fontWeight: '900',
    marginTop: 6,
  },
  miniMeta: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
  },
  matchupTeamGrid: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  matchupTeamBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.bgCardAlt,
  },
  matchupTeamTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  matchupTeamTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  matchupGrade: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  matchupStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  matchupStatLabel: {
    flex: 1,
    fontSize: 13,
  },
  matchupStatValue: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  matchupNote: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.28)',
    borderRadius: 10,
    backgroundColor: 'rgba(198,145,50,.08)',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  matchupNoteText: {
    marginTop: 6,
  },
  leanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.28)',
    borderRadius: 12,
    backgroundColor: 'rgba(198,145,50,.08)',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  leanCopy: {
    flex: 1,
    minWidth: 0,
  },
  leanMain: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  leanDetail: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  leanPrice: {
    minWidth: 74,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.35)',
    borderRadius: 10,
    backgroundColor: 'rgba(198,145,50,.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  leanPriceText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '900',
  },
})
