import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
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
import { BOOK_DISPLAY_NAMES, PROP_BOOK_KEYS, supportedBookmakers } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, Sport, WeatherInfo } from '@/types'
import { router } from 'expo-router'

type SoccerTeamInfo = {
  team: string
  group?: string
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

type SoccerTeamProfileResponse = {
  news?: Array<{
    headline: string
    description?: string | null
    published?: string | null
    url?: string | null
    source?: string | null
  }>
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
  seasonPhase?: 'regular' | 'playoff'
  playoffPicture?: PlayoffPicture | null
}

type PlayoffTeam = {
  teamName: string
  teamAbbr: string
  record?: string
  seriesWins: number
  alive: boolean
}

type PlayoffSeries = {
  conference: string
  round: number
  roundLabel: string
  status: string
  teams: PlayoffTeam[]
}

type PlayoffPicture = {
  conferences: Array<{ name: string; series: PlayoffSeries[] }>
  updatedAt?: string
}

type MLBSchedulePayload = {
  teamRecords?: Record<string, { wins: number; losses: number; pct: number }>
  pitcherNameMap?: Record<string, string>
  pitcherEraMap?: Record<string, number>
  seasonPhase?: 'regular' | 'postseason'
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

type NFLTeamStats = {
  team: string
  games?: number
  pass_yds_g?: number
  rush_yds_g?: number
  total_yds_g?: number
  offensive_tds_g?: number
  turnovers_g?: number
  penalties_g?: number
  penalty_yds_g?: number
  pass_epa_g?: number
  rush_epa_g?: number
  powerScore?: number
}

type NFLCommandData = {
  team_stats?: {
    teams?: NFLTeamStats[]
  }
  depth_charts?: {
    updated_at?: string | null
    uploaded_at?: string | null
    teams?: Array<{
      team: string
      depth_chart?: Record<string, Array<{ name: string; rank?: number | null; role?: string | null }>>
    }>
  }
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
    currentRecord?: string
    conferenceRecord?: string
    pointsForPerGame?: number
    pointsAllowedPerGame?: number
    recentForm?: string
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

const NCAAF_MAJOR_CONFERENCES = [
  'All',
  'ACC',
  'Big 12',
  'Big Ten',
  'SEC',
  'American',
  'Conference USA',
  'MAC',
  'Mountain West',
  'Pac-12',
  'Sun Belt',
  'Independent',
]

const NCAAB_MAJOR_CONFERENCES = [
  'All',
  'ACC',
  'Big 12',
  'Big East',
  'Big Ten',
  'SEC',
  'American',
  'Atlantic 10',
  'Mountain West',
  'WCC',
]

const SOCCER_LEAGUES = [
  { key: 'soccer_fifa_world_cup', label: 'World Cup' },
  { key: 'soccer_epl', label: 'Premier League' },
  { key: 'soccer_usa_mls', label: 'MLS' },
  { key: 'soccer_spain_la_liga', label: 'La Liga' },
  { key: 'soccer_italy_serie_a', label: 'Serie A' },
  { key: 'soccer_germany_bundesliga', label: 'Bundesliga' },
  { key: 'soccer_france_ligue_one', label: 'Ligue 1' },
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
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
  status: 'Live' | 'Markets'
  description: string
  inactiveTitle: string
  inactiveDescription: string
}> = [
  {
    key: 'MLB',
    flag: 'dashboard_mlb',
    visibilityFlag: 'dashboard_tab_mlb',
    status: 'Live',
    description: 'MLB lines, props, weather, trends, and stat sheets.',
    inactiveTitle: 'MLB Lines Unavailable',
    inactiveDescription: 'Game lines, props, and stat context appear when markets are active.',
  },
  {
    key: 'NFL',
    flag: 'nfl_props',
    visibilityFlag: 'dashboard_tab_nfl',
    status: 'Markets',
    description: 'NFL lines, matchups, props, and fantasy tools.',
    inactiveTitle: 'NFL Not In Season',
    inactiveDescription: 'Fantasy, draft research, injuries, futures, and offseason notes.',
  },
  {
    key: 'NBA',
    flag: 'dashboard_nba',
    visibilityFlag: 'dashboard_tab_nba',
    status: 'Live',
    description: 'NBA lines, props, recent form, and Edge.',
    inactiveTitle: 'NBA Lines Unavailable',
    inactiveDescription: 'Game lines, props, and stat context appear when markets are active.',
  },
  {
    key: 'NHL',
    flag: 'dashboard_nhl',
    visibilityFlag: 'dashboard_tab_nhl',
    status: 'Live',
    description: 'NHL lines, props, shot volume, and scoring trends.',
    inactiveTitle: 'NHL Lines Unavailable',
    inactiveDescription: 'Game lines, props, and stat context appear when markets are active.',
  },
  {
    key: 'WNBA',
    flag: 'dashboard_wnba',
    visibilityFlag: 'dashboard_tab_wnba',
    status: 'Live',
    description: 'WNBA lines, props, recent form, and hit rates.',
    inactiveTitle: 'WNBA Lines Unavailable',
    inactiveDescription: 'Game lines, props, and stat context appear when markets are active.',
  },
  {
    key: 'KBO',
    flag: 'dashboard_kbo',
    visibilityFlag: 'dashboard_tab_kbo',
    status: 'Live',
    description: 'KBO lines, market movement, and team context.',
    inactiveTitle: 'KBO Lines Unavailable',
    inactiveDescription: 'Game lines appear when the next slate is active.',
  },
  {
    key: 'NCAAB',
    flag: 'dashboard_ncaab',
    visibilityFlag: 'dashboard_tab_ncaab',
    status: 'Markets',
    description: 'College basketball lines, team trends, and matchups.',
    inactiveTitle: 'College Basketball Not In Season',
    inactiveDescription: 'Game lines and matchup context return in season.',
  },
  {
    key: 'NCAAF',
    flag: 'dashboard_ncaaf',
    visibilityFlag: 'dashboard_tab_ncaaf',
    status: 'Markets',
    description: 'College football lines, team stats, and matchups.',
    inactiveTitle: 'College Football Lines Awaiting Markets',
    inactiveDescription: 'Game lines and matchup context appear when sportsbooks post active markets.',
  },
  {
    key: 'SOCCER',
    flag: 'dashboard_soccer',
    visibilityFlag: 'dashboard_tab_soccer',
    status: 'Markets',
    description: 'Soccer lines, league context, and team form.',
    inactiveTitle: 'Soccer Markets Unavailable',
    inactiveDescription: 'Game lines appear when league markets are active.',
  },
]

function orderedDashboardSports(order: string[] = []) {
  const rank = new Map(
    order.map((item, index) => [item === 'Soccer' ? 'SOCCER' : item, index]),
  )
  return [...SPORTS].sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999))
}

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

function mlbPlayoffRace(
  records: Record<string, { wins: number; losses: number; pct: number }> = {},
  l10Map: Record<string, { wins: number; losses: number; winPct: number; avgTotal: number }> = {}
) {
  const standings = mlbDivisionStandings(records, l10Map)
  return [
    { name: 'American League', prefix: 'AL' },
    { name: 'National League', prefix: 'NL' },
  ].map((league) => {
    const divisions = standings.filter((division) => division.name.startsWith(league.prefix))
    const leaders = divisions
      .map((division) => ({ ...division.entries[0], path: `${division.name} leader`, status: 'Division' }))
      .filter((entry) => entry?.record)
      .sort((a, b) => Number(b.record?.pct || 0) - Number(a.record?.pct || 0))
    const leaderAbbrs = new Set(leaders.map((entry) => entry.team.abbr))
    const wildCards = divisions
      .flatMap((division) => division.entries.filter((entry) => !leaderAbbrs.has(entry.team.abbr)))
      .sort((a, b) => Number(b.record?.pct || 0) - Number(a.record?.pct || 0))
    const cutline = wildCards[2]?.record
    const wildCardRows = wildCards.map((entry, index) => ({
      ...entry,
      path: index < 3 ? `Wild Card ${index + 1}` : 'Chasing',
      status: index < 3 ? 'In' : formatGamesBack(entry.record, cutline),
    }))
    return { name: league.name, entries: [...leaders, ...wildCardRows] }
  }).filter((league) => league.entries.length)
}

function shortTeamName(team: string) {
  return team.replace(/ University$/i, '').replace(/ College$/i, '')
}

const WORLD_CUP_COUNTRY_CODES: Record<string, string> = {
  Algeria: 'DZ', Argentina: 'AR', Australia: 'AU', Austria: 'AT', Belgium: 'BE',
  'Bosnia & Herzegovina': 'BA', 'Bosnia and Herzegovina': 'BA', 'Bosnia-H.': 'BA', Brazil: 'BR',
  Cameroon: 'CM', Canada: 'CA', 'Cape Verde': 'CV', Colombia: 'CO',
  'Costa Rica': 'CR', Croatia: 'HR', Curacao: 'CW', Curaçao: 'CW',
  Czechia: 'CZ', 'Czech Republic': 'CZ', Denmark: 'DK', 'Congo DR': 'CD', 'DR Congo': 'CD', Ecuador: 'EC',
  Egypt: 'EG', England: 'GB', France: 'FR', Germany: 'DE', Ghana: 'GH',
  Haiti: 'HT', Iran: 'IR', Iraq: 'IQ', Italy: 'IT', 'Ivory Coast': 'CI',
  Jamaica: 'JM', Japan: 'JP', Jordan: 'JO', Mexico: 'MX', Morocco: 'MA',
  Netherlands: 'NL', 'New Zealand': 'NZ', Nigeria: 'NG', Norway: 'NO',
  Panama: 'PA', Paraguay: 'PY', Poland: 'PL',
  Portugal: 'PT', Qatar: 'QA', 'Saudi Arabia': 'SA', Scotland: 'GB', Senegal: 'SN',
  Serbia: 'RS', 'South Africa': 'ZA', 'South Korea': 'KR', Spain: 'ES',
  Sweden: 'SE', Switzerland: 'CH', Tunisia: 'TN', Turkey: 'TR', Ukraine: 'UA',
  Uzbekistan: 'UZ',
  'United States': 'US', USA: 'US', Uruguay: 'UY', Wales: 'GB',
}

function countryFlag(country: string) {
  const code = WORLD_CUP_COUNTRY_CODES[country]
  if (!code) return ''
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

function countryLabel(country: string) {
  const flag = countryFlag(country)
  return flag ? `${flag} ${country}` : country
}

function countryStandingLabel(team: SoccerTeamInfo) {
  const label = team.shortName || team.team
  const flag = countryFlag(team.team) || countryFlag(label)
  return flag ? `${flag} ${label}` : label
}

function soccerGoalDiffLabel(team: SoccerTeamInfo) {
  const diff = Number(team.goalDifference || 0)
  return `${diff >= 0 ? '+' : ''}${diff}`
}

function soccerRecordCompact(team: SoccerTeamInfo) {
  if (!team.played) return '-'
  return `${team.won || 0}-${team.drawn || 0}-${team.lost || 0}`
}

function worldCupStandingGroups(teams: SoccerTeamInfo[]) {
  const rows = teams.filter((team) =>
    team.team &&
    (team.group || typeof team.position === 'number' || typeof team.points === 'number' || typeof team.played === 'number')
  )
  const groups = new Map<string, SoccerTeamInfo[]>()
  rows.forEach((team) => {
    const group = team.group || 'Standings'
    groups.set(group, [...(groups.get(group) || []), team])
  })
  return Array.from(groups.entries())
    .map(([name, entries]) => ({
      name,
      entries: entries.sort((a, b) =>
        Number(a.position || 999) - Number(b.position || 999) ||
        Number(b.points || 0) - Number(a.points || 0) ||
        Number(b.goalDifference || 0) - Number(a.goalDifference || 0) ||
        String(a.team).localeCompare(String(b.team))
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function profileTeamFromName(teams: SoccerTeamInfo[], teamName: string) {
  return findSoccerTeam(teams, teamName) || { team: teamName, shortName: teamName }
}

const NFL_TEAM_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
}

function nflTeamCode(team: string) {
  return NFL_TEAM_ABBR[team] || team
}

function nflPowerScore(team: NFLTeamStats) {
  return (
    Number(team.total_yds_g || 0) / 10 +
    Number(team.offensive_tds_g || 0) * 18 +
    Number(team.pass_epa_g || 0) * 2 +
    Number(team.rush_epa_g || 0) * 2 -
    Number(team.turnovers_g || 0) * 15 -
    Number(team.penalties_g || 0) * 2
  )
}

function nflTeamStatsMap(commandData: NFLCommandData | undefined) {
  return (commandData?.team_stats?.teams || []).reduce<Record<string, { powerScore?: number }>>((acc, team) => {
    acc[team.team] = { powerScore: nflPowerScore(team) }
    return acc
  }, {})
}

function nflDepthSummary(commandData: NFLCommandData | undefined, team: string, limit = 4) {
  const teamCode = nflTeamCode(team)
  const row = commandData?.depth_charts?.teams?.find((item) => item.team === teamCode)
  const chart = row?.depth_chart || {}
  return ['QB', 'RB', 'WR', 'TE']
    .map((position) => {
      const players = Array.isArray(chart[position]) ? chart[position] : []
      const starter = players.find((player) => player.rank === 1) || players[0]
      return starter ? `${position} ${starter.name}` : ''
    })
    .filter(Boolean)
    .slice(0, limit)
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

function basketballRecordParts(team: any) {
  const wins = Number(team?.wins ?? team?.currentWins ?? 0)
  const losses = Number(team?.losses ?? team?.currentLosses ?? 0)
  const previousWins = Number(team?.previousWins ?? 0)
  const previousLosses = Number(team?.previousLosses ?? 0)
  const usePrevious = wins + losses === 0 && previousWins + previousLosses > 0
  return {
    wins: usePrevious ? previousWins : wins,
    losses: usePrevious ? previousLosses : losses,
  }
}

function basketballPctLabel(team: any) {
  const record = basketballRecordParts(team)
  const games = record.wins + record.losses
  return games > 0 ? (record.wins / games).toFixed(3).replace(/^0/, '') : '-'
}

function basketballGamesBackLabel(team: any, cutline?: { wins: number; losses: number }) {
  if (!cutline) return '-'
  const record = basketballRecordParts(team)
  const gb = ((cutline.wins - record.wins) + (record.losses - cutline.losses)) / 2
  if (gb <= 0) return 'In'
  return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`
}

function wnbaPlayoffRaceTeams(teams: any[] = []) {
  const sorted = [...teams].sort((a, b) => {
    const ar = basketballRecordParts(a)
    const br = basketballRecordParts(b)
    const ag = ar.wins + ar.losses
    const bg = br.wins + br.losses
    const ap = ag > 0 ? ar.wins / ag : 0
    const bp = bg > 0 ? br.wins / bg : 0
    return bp - ap || br.wins - ar.wins || String(a.teamName || '').localeCompare(String(b.teamName || ''))
  })
  const cutline = sorted[7] ? basketballRecordParts(sorted[7]) : undefined
  return sorted.map((team, index) => ({
    ...team,
    seed: index + 1,
    path: index < 8 ? `Playoff ${index + 1}` : 'Chasing',
    status: index < 8 ? 'In' : basketballGamesBackLabel(team, cutline),
  }))
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

function recentPointsFor(team: any) {
  if (!team) return '-'
  return Number(team.l10For || 0).toFixed(1)
}

function recentPointsAgainst(team: any) {
  if (!team) return '-'
  return Number(team.l10Against || 0).toFixed(1)
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

function soccerProfileRead(team: SoccerTeamInfo) {
  if (!team.played) return 'Tournament table data is pending.'
  const ppg = pointsPerGame(team)
  const drawPct = Math.round(drawRate(team) * 100)
  if (ppg >= 2) return `Strong table profile at ${ppg.toFixed(2)} points per match with a ${drawPct}% draw rate.`
  if (ppg >= 1.4) return `Competitive table profile at ${ppg.toFixed(2)} points per match with a ${drawPct}% draw rate.`
  return `Thin table profile at ${ppg.toFixed(2)} points per match with a ${drawPct}% draw rate.`
}

function findSoccerTeam(teams: SoccerTeamInfo[] = [], teamName: string) {
  const normalized = normalizeTeamKey(teamName)
  const lastWord = normalizeTeamKey(teamName.split(' ').pop() || teamName)
  return teams.find((team) => {
    const candidates = [team.team, team.shortName].map((value) => normalizeTeamKey(value || ''))
    return candidates.some((candidate) => candidate && (candidate === normalized || normalized.includes(candidate) || candidate.includes(lastWord)))
  })
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
      ? `${ppgGap.toFixed(2)} points/game gap with a draw profile on both sides.`
      : `${ppgEdge} points/game edge and ${gdEdge >= 0 ? '+' : ''}${gdEdge} goal-difference edge.`,
    best,
  }
}

function MatchupTeamBox({
  title,
  grade,
  rows,
  onPress,
}: {
  title: string
  grade?: string | null
  rows: Array<{ label: string; value: string }>
  onPress?: () => void
}) {
  const titleContent = (
    <AppText style={styles.matchupTeamTitle}>{title}</AppText>
  )
  return (
    <View style={styles.matchupTeamBox}>
      <View style={styles.matchupTeamTop}>
        {onPress ? <Pressable onPress={onPress} style={styles.matchupTeamTitlePress}>{titleContent}</Pressable> : titleContent}
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

function SoccerTeamProfileModal({
  team,
  league,
  onClose,
}: {
  team: SoccerTeamInfo | null
  league: string
  onClose: () => void
}) {
  const query = useQuery({
    queryKey: ['soccer-team-profile', league, team?.team],
    queryFn: () => {
      const params = new URLSearchParams({
        league,
        team: team?.team || '',
      })
      if (team?.shortName) params.set('shortName', team.shortName)
      return kingfishFetch<SoccerTeamProfileResponse>(`/api/soccer-team-profile?${params.toString()}`)
    },
    enabled: !!team,
    staleTime: 15 * 60 * 1000,
  })

  return (
    <Modal
      visible={!!team}
      animationType="slide"
      transparent
      supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
    >
      <View style={styles.teamProfileOverlay}>
        <Pressable style={styles.teamProfileBackdrop} onPress={onClose} />
        {team ? (
          <View style={styles.teamProfileSheet}>
            <View style={styles.teamProfileHeader}>
              <View style={styles.teamProfileTitleBlock}>
                <AppText variant="eyebrow">// Team Profile</AppText>
                <AppText variant="title" style={styles.teamProfileTitle}>{countryStandingLabel(team)}</AppText>
                <AppText variant="muted" style={styles.teamInfoMeta}>{soccerProfileRead(team)}</AppText>
              </View>
              <Pressable onPress={onClose} style={styles.closeTeamProfile}>
                <AppText style={styles.closeTeamProfileText}>x</AppText>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.teamProfileBody} showsVerticalScrollIndicator={false}>
              <View style={styles.teamProfileGrid}>
                <View style={styles.teamProfileStat}>
                  <AppText variant="mono">Record</AppText>
                  <AppText style={styles.teamProfileValue}>{soccerRecordCompact(team)}</AppText>
                </View>
                <View style={styles.teamProfileStat}>
                  <AppText variant="mono">Table</AppText>
                  <AppText style={styles.teamProfileValue}>{team.position ? `#${team.position}` : '-'}</AppText>
                </View>
                <View style={styles.teamProfileStat}>
                  <AppText variant="mono">Points</AppText>
                  <AppText style={styles.teamProfileValue}>{team.points ?? '-'}</AppText>
                </View>
                <View style={styles.teamProfileStat}>
                  <AppText variant="mono">Goal Diff</AppText>
                  <AppText style={styles.teamProfileValue}>{team.goalDifference != null ? soccerGoalDiffLabel(team) : '-'}</AppText>
                </View>
                <View style={styles.teamProfileStat}>
                  <AppText variant="mono">GF-GA</AppText>
                  <AppText style={styles.teamProfileValue}>{team.played ? `${team.goalsFor || 0}-${team.goalsAgainst || 0}` : '-'}</AppText>
                </View>
                <View style={styles.teamProfileStat}>
                  <AppText variant="mono">Draw Rate</AppText>
                  <AppText style={styles.teamProfileValue}>{team.played ? `${Math.round(drawRate(team) * 100)}%` : '-'}</AppText>
                </View>
              </View>

              {team.form ? (
                <Card>
                  <AppText variant="eyebrow">// Recent Form</AppText>
                  <AppText style={styles.teamProfileForm}>{team.form}</AppText>
                </Card>
              ) : null}

              <Card>
                <AppText variant="eyebrow">// News</AppText>
                {query.isLoading ? (
                  <View style={styles.compactLoadingRow}>
                    <ActivityIndicator color={colors.gold} />
                    <AppText variant="muted">Checking news...</AppText>
                  </View>
                ) : query.data?.news?.length ? (
                  <View style={styles.teamProfileNewsList}>
                    {query.data.news.slice(0, 2).map((item, index) => (
                      <Pressable
                        key={`${item.headline}-${index}`}
                        disabled={!item.url}
                        onPress={() => item.url && Linking.openURL(item.url).catch(() => {})}
                        style={styles.teamProfileNewsItem}
                      >
                        <AppText style={styles.teamProfileNewsHeadline}>{item.headline}</AppText>
                        {item.description ? (
                          <AppText variant="muted" style={styles.teamProfileNewsDescription}>{item.description}</AppText>
                        ) : null}
                        {(item.source || item.published) ? (
                          <AppText variant="mono" style={styles.teamProfileNewsMeta}>
                            {[item.source, item.published ? new Date(item.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null].filter(Boolean).join(' · ')}
                          </AppText>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <AppText variant="muted" style={styles.stateText}>No matching team news right now.</AppText>
                )}
              </Card>

              <Button variant="secondary" onPress={onClose}>Close</Button>
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

export default function DashboardScreen() {
  const { profile } = useAuth()
  const mobileConfig = useMobileConfig()
  const [sport, setSport] = useState<Sport>('MLB')
  const [view, setView] = useState<DashboardView>('lines')
  const [selectedLineWeek, setSelectedLineWeek] = useState('')
  const [selectedMatchupWeek, setSelectedMatchupWeek] = useState('')
  const [leagueScope, setLeagueScope] = useState<'playoff' | 'season'>('playoff')
  const [expandedMlbTeam, setExpandedMlbTeam] = useState<string | null>(null)
  const [expandedNflTeam, setExpandedNflTeam] = useState<string | null>(null)
  const [soccerLeague, setSoccerLeague] = useState('soccer_epl')
  const [selectedSoccerTeam, setSelectedSoccerTeam] = useState<SoccerTeamInfo | null>(null)
  const [collegeScope, setCollegeScope] = useState<'top25' | 'all'>('top25')
  const [collegeScopeOpen, setCollegeScopeOpen] = useState(false)
  const [collegeConference, setCollegeConference] = useState('All')
  const [collegeConferenceOpen, setCollegeConferenceOpen] = useState(false)
  const [ncaabScope, setNcaabScope] = useState<'top25' | 'all'>('top25')
  const [ncaabScopeOpen, setNcaabScopeOpen] = useState(false)
  const [ncaabConference, setNcaabConference] = useState('All')
  const [ncaabConferenceOpen, setNcaabConferenceOpen] = useState(false)
  const selectedSoccerLeague = SOCCER_LEAGUES.find((item) => item.key === soccerLeague) || SOCCER_LEAGUES[0]
  const mobileFlag = (key: string, fallback = false) => mobileConfig.flags[key] ?? fallback
  const visibleSports = orderedDashboardSports(mobileConfig.dashboard_sport_order).filter((item) => mobileFlag(item.visibilityFlag, true))
  const selectedSport = visibleSports.find((item) => item.key === sport) || visibleSports[0] || SPORTS[0]
  const isSelectedSportActive = mobileFlag(selectedSport.flag, selectedSport.status === 'Live')
  const getSportActive = (item: (typeof SPORTS)[number]) => mobileFlag(item.flag, item.status === 'Live')
  const tabVisibleForSport = (sportKey: Sport, tab: DashboardView) => {
    const prefix = sportApiKey(sportKey)
    if (sportKey === 'MLB' || sportKey === 'NBA' || sportKey === 'NHL' || sportKey === 'WNBA') return mobileFlag(`${prefix}_tab_${tab}`, true)
    if (sportKey === 'NFL') {
      if (tab === 'props') return true
      return mobileFlag(`nfl_dashboard_tab_${tab}`, true)
    }
    return true
  }
  const rawDashboardViewsForSport = (sportKey: Sport): DashboardView[] =>
    sportKey === 'NFL'
      ? ['league', 'matchups', 'lines', 'props']
    : sportKey === 'NCAAF'
        ? ['league', 'matchups', 'lines']
    : sportKey === 'NCAAB'
        ? ['league', 'matchups', 'lines']
      : sportKey === 'MLB' || sportKey === 'NBA' || sportKey === 'NHL' || sportKey === 'WNBA'
        ? ['league', 'matchups', 'lines', 'props']
        : sportKey === 'SOCCER'
          ? ['league', 'matchups', 'lines']
          : ['lines', 'props']
  const firstDashboardViewForSport = (sportKey: Sport) => rawDashboardViewsForSport(sportKey).find((tab) => tabVisibleForSport(sportKey, tab)) || 'lines'
  const tabVisible = (tab: DashboardView) => tabVisibleForSport(sport, tab)
  const rawDashboardViews = rawDashboardViewsForSport(sport)
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
  const isWorldCupSoccer = sport === 'SOCCER' && soccerLeague === 'soccer_fifa_world_cup'
  const dashboardViewLabel = (item: DashboardView) =>
    item === 'league'
      ? isWorldCupSoccer ? 'Tournament View' : 'League View'
    : item === 'matchups'
      ? 'Game Matchups'
    : item === 'lines'
      ? 'Game Lines'
    : secondaryViewLabel
  const canFetchWorldCupTournament = isSelectedSportActive && isWorldCupSoccer && view === 'league' && canViewLines && !linesMaintenance
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
    enabled: canFetchLines || canFetchWorldCupTournament || (canFetchMatchups && ['MLB', 'NBA', 'NHL', 'WNBA', 'SOCCER'].includes(sport)),
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
  const nflCommandQuery = useQuery({
    queryKey: ['nfl-mobile-command-data'],
    queryFn: () => kingfishFetch<NFLCommandData>('/api/nfl-command-data'),
    enabled: isSelectedSportActive && sport === 'NFL' && (view === 'league' || view === 'matchups' || view === 'lines'),
    staleTime: 10 * 60 * 1000,
  })
  const ncaafOutlookQuery = useQuery({
    queryKey: ['ncaaf-mobile-league-view'],
    queryFn: () => kingfishFetch<NCAAFOutlookData>('/data/ncaaf/team-outlook-2026.json'),
    enabled: isSelectedSportActive && sport === 'NCAAF' && (view === 'league' || view === 'matchups' || view === 'lines'),
    staleTime: 24 * 60 * 60 * 1000,
  })
  const ncaabBaselineQuery = useQuery({
    queryKey: ['ncaab-mobile-team-board'],
    queryFn: () => kingfishFetch<NCAABBaselineData>('/data/ncaab/team-baseline-2026.json'),
    enabled: isSelectedSportActive && sport === 'NCAAB' && (view === 'league' || view === 'matchups'),
    staleTime: 24 * 60 * 60 * 1000,
  })
  const ncaafMatchupsQuery = useQuery({
    queryKey: ['ncaaf-mobile-matchups'],
    queryFn: () => kingfishFetch<NCAAFMatchup[]>('/api/ncaaf-matchups'),
    enabled: isSelectedSportActive && sport === 'NCAAF' && view === 'matchups',
    staleTime: 10 * 60 * 1000,
  })
  const ncaabMatchupsQuery = useQuery({
    queryKey: ['ncaab-mobile-matchups'],
    queryFn: () => kingfishFetch<NCAAFMatchup[]>('/api/ncaab-matchups'),
    enabled: isSelectedSportActive && sport === 'NCAAB' && view === 'matchups',
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
    enabled: isSelectedSportActive && sport === 'SOCCER' && (view === 'league' || view === 'matchups' || view === 'lines'),
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
    enabled: isSelectedSportActive && (sport === 'NBA' || sport === 'NHL' || sport === 'WNBA') && (view === 'league' || view === 'matchups' || view === 'lines'),
    staleTime: 30 * 60 * 1000,
  })
  const mlbScheduleQuery = useQuery({
    queryKey: ['mlb-schedule-context'],
    queryFn: () => kingfishFetch<MLBSchedulePayload>('/api/mlb-schedule'),
    enabled: isSelectedSportActive && sport === 'MLB' && (view === 'league' || view === 'matchups' || view === 'lines'),
    staleTime: 5 * 60 * 1000,
  })
  const mlbL10Query = useQuery({
    queryKey: ['mlb-team-l10'],
    queryFn: () => kingfishFetch<MLBL10Payload>('/api/mlb-team-l10'),
    enabled: isSelectedSportActive && sport === 'MLB' && (view === 'league' || view === 'matchups' || view === 'lines'),
    staleTime: 60 * 60 * 1000,
  })
  const kboTeams = [...(kboTeamQuery.data?.teams || [])].sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999))
  const soccerTeams = [...(soccerTeamQuery.data?.teams || [])].sort((a, b) => {
    const aPos = Number(a.position || 999)
    const bPos = Number(b.position || 999)
    return aPos - bPos || String(a.team).localeCompare(String(b.team))
  })
  const mlbStandings = mlbDivisionStandings(mlbScheduleQuery.data?.teamRecords, mlbL10Query.data?.teamL10Map)
  const mlbRace = mlbPlayoffRace(mlbScheduleQuery.data?.teamRecords, mlbL10Query.data?.teamL10Map)
  const isMlbRaceScope = sport === 'MLB' && leagueScope === 'playoff'
  const upcomingLineGames = upcomingGames(lineQuery.data || [])
  const lineWeeks = sport === 'NFL' || sport === 'NCAAF' ? weekOptions(upcomingLineGames) : []
  const activeLineWeek = lineWeeks.find((week) => week.key === selectedLineWeek) || lineWeeks[0]
  const visibleLineGames = (sport === 'NFL' || sport === 'NCAAF') && activeLineWeek ? activeLineWeek.games : upcomingLineGames
  const visibleLineGroups = groupGamesByDate(visibleLineGames)
  const worldCupTeams = Array.from(new Set(upcomingLineGames.flatMap((game) => [game.away_team, game.home_team]).filter(Boolean))).sort()
  const worldCupGroups = groupGamesByDate(upcomingLineGames)
  const worldCupStandings = worldCupStandingGroups(soccerTeams)
  const isPlayoffLeagueScope = (sport === 'NBA' || sport === 'NHL') && teamFormQuery.data?.seasonPhase === 'playoff' && leagueScope === 'playoff'
  const isWnbaRaceScope = sport === 'WNBA' && leagueScope === 'playoff'
  const playoffConferences = teamFormQuery.data?.playoffPicture?.conferences || []
  const visibleLeagueTeams = uniqueTeamForms(teamFormQuery.data?.teams)
  const wnbaRaceTeams = wnbaPlayoffRaceTeams(visibleLeagueTeams)
  const nflMatchupGames = upcomingGames(nflMatchupsQuery.data || [])
  const nflMatchupWeeks = sport === 'NFL' ? weekOptions(nflMatchupGames) : []
  const activeNflMatchupWeek = nflMatchupWeeks.find((week) => week.key === selectedMatchupWeek) || nflMatchupWeeks[0]
  const visibleNflMatchups = activeNflMatchupWeek ? activeNflMatchupWeek.games : nflMatchupGames
  const visibleNflMatchupGroups = groupGamesByDate(visibleNflMatchups)
  const ncaafTeams = ncaafOutlookQuery.data?.teams || []
  const hasLiveNcaafTeamData = ncaafTeams.some((team) =>
    Boolean(
      team.currentRecord ||
      team.conferenceRecord ||
      team.recentForm ||
      typeof team.pointsForPerGame === 'number' ||
      typeof team.pointsAllowedPerGame === 'number',
    ),
  )
  const ncaafConferences = Array.from(new Set([...NCAAF_MAJOR_CONFERENCES, ...ncaafTeams.map((team) => team.conference).filter(Boolean)]))
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
  const ncaabTeams = ncaabBaselineQuery.data?.teams || []
  const ncaabConferences = Array.from(new Set([...NCAAB_MAJOR_CONFERENCES, ...ncaabTeams.map((team) => team.conference).filter(Boolean)]))
  const filteredNcaabTeams = ncaabTeams.filter((team) => {
    const scopeMatch = ncaabScope === 'all' || team.rank <= 25
    const conferenceMatch = ncaabConference === 'All' || team.conference === ncaabConference
    return scopeMatch && conferenceMatch
  })
  const ncaabTeamForName = (teamName: string) => ncaabTeams.find((team) => {
    const posted = teamName.toLowerCase()
    const known = team.team.toLowerCase()
    return posted === known || posted.includes(known) || known.includes(posted)
  })
  const filteredNcaabMatchups = (ncaabMatchupsQuery.data || []).filter((game) => {
    if (ncaabScope === 'top25') {
      const awayRank = ncaabTeamForName(game.away_team)?.rank
      const homeRank = ncaabTeamForName(game.home_team)?.rank
      if (!awayRank && !homeRank) return false
      if ((awayRank || 999) > 25 && (homeRank || 999) > 25) return false
    }
    if (ncaabConference === 'All') return true
    return ncaabTeamForName(game.away_team)?.conference === ncaabConference || ncaabTeamForName(game.home_team)?.conference === ncaabConference
  })
  const ncaabMatchupGroups = groupGamesByDate(filteredNcaabMatchups)
  const propsGames = Array.isArray(propsQuery.data) ? propsQuery.data : propsQuery.data?.props || []
  const bundledPlayerStats = Array.isArray(propsQuery.data) ? undefined : propsQuery.data?.playerStats

  return (
    <Screen>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll} contentContainerStyle={styles.row}>
        {visibleSports.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => {
              setSport(item.key)
              setView(firstDashboardViewForSport(item.key))
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
      </ScrollView>

      <View style={styles.segment}>
        {dashboardViews.map((item) => (
          <Pressable
            key={item}
            onPress={() => setView(item)}
            style={[styles.segmentButton, view === item && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, view === item && styles.segmentTextActive]}>
              {dashboardViewLabel(item)}
            </AppText>
          </Pressable>
        ))}
      </View>

      {sport === 'SOCCER' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.soccerLeagueRow}
          style={styles.soccerLeagueScroll}
        >
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
        </ScrollView>
      )}

      {sport === 'NCAAF' && (
        <View style={styles.collegeFilterWrap}>
          <Pressable
            onPress={() => setCollegeScopeOpen((open) => !open)}
            style={styles.collegeSelect}
          >
            <AppText variant="mono">Show</AppText>
            <AppText style={styles.collegeSelectValue}>{collegeScope === 'top25' ? 'Top 25' : 'All Teams'}</AppText>
          </Pressable>
          {collegeScopeOpen && (
            <View style={styles.collegeSelectMenu}>
              {(['top25', 'all'] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setCollegeScope(item)
                    setCollegeScopeOpen(false)
                  }}
                  style={[styles.collegeSelectOption, collegeScope === item && styles.collegeSelectOptionActive]}
                >
                  <AppText style={[styles.collegeSelectOptionText, collegeScope === item && styles.collegeSelectOptionTextActive]}>
                    {item === 'top25' ? 'Top 25' : 'All Teams'}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            onPress={() => setCollegeConferenceOpen((open) => !open)}
            style={styles.collegeSelect}
          >
            <AppText variant="mono">Conference</AppText>
            <AppText style={styles.collegeSelectValue}>{collegeConference}</AppText>
          </Pressable>
          {collegeConferenceOpen && (
            <View style={styles.collegeSelectMenu}>
              {ncaafConferences.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setCollegeConference(item)
                    setCollegeConferenceOpen(false)
                  }}
                  style={[styles.collegeSelectOption, collegeConference === item && styles.collegeSelectOptionActive]}
                >
                  <AppText style={[styles.collegeSelectOptionText, collegeConference === item && styles.collegeSelectOptionTextActive]}>
                    {item}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {sport === 'NCAAB' && (
        <View style={styles.collegeFilterWrap}>
          <Pressable
            onPress={() => setNcaabScopeOpen((open) => !open)}
            style={styles.collegeSelect}
          >
            <AppText variant="mono">Show</AppText>
            <AppText style={styles.collegeSelectValue}>{ncaabScope === 'top25' ? 'Top 25' : 'All Teams'}</AppText>
          </Pressable>
          {ncaabScopeOpen && (
            <View style={styles.collegeSelectMenu}>
              {(['top25', 'all'] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setNcaabScope(item)
                    setNcaabScopeOpen(false)
                  }}
                  style={[styles.collegeSelectOption, ncaabScope === item && styles.collegeSelectOptionActive]}
                >
                  <AppText style={[styles.collegeSelectOptionText, ncaabScope === item && styles.collegeSelectOptionTextActive]}>
                    {item === 'top25' ? 'Top 25' : 'All Teams'}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            onPress={() => setNcaabConferenceOpen((open) => !open)}
            style={styles.collegeSelect}
          >
            <AppText variant="mono">Conference</AppText>
            <AppText style={styles.collegeSelectValue}>{ncaabConference}</AppText>
          </Pressable>
          {ncaabConferenceOpen && (
            <View style={styles.collegeSelectMenu}>
              {ncaabConferences.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    setNcaabConference(item)
                    setNcaabConferenceOpen(false)
                  }}
                  style={[styles.collegeSelectOption, ncaabConference === item && styles.collegeSelectOptionActive]}
                >
                  <AppText style={[styles.collegeSelectOptionText, ncaabConference === item && styles.collegeSelectOptionTextActive]}>
                    {item}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {view !== 'props' && !isSelectedSportActive && (
        <Card>
          <AppText variant="eyebrow">// {sport} {isSelectedSportActive ? 'Active' : selectedSport.status}</AppText>
          <AppText variant="title" style={styles.cardTitle}>
            {isSelectedSportActive ? dashboardViewLabel(view) : selectedSport.inactiveTitle}
          </AppText>
            <AppText variant="muted">
              {isSelectedSportActive && sport === 'SOCCER'
              ? `${selectedSoccerLeague.label} lines and team context.`
              : isSelectedSportActive ? selectedSport.description : selectedSport.inactiveDescription}
          </AppText>
          {!isSelectedSportActive && (
            <View style={styles.roadmapBox}>
              <AppText variant="eyebrow">// Market Watch</AppText>
              <AppText variant="muted" style={styles.roadmapText}>
                Lines appear when sportsbooks post active markets.
              </AppText>
            </View>
          )}
        </Card>
      )}

      {isSelectedSportActive && view === 'league' && (sport === 'MLB' || sport === 'NBA' || sport === 'NHL' || sport === 'WNBA') && (
        <View style={styles.liveSection}>
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

              <View style={styles.scopeRow}>
                {(['playoff', 'season'] as const).map((scope) => (
                  <Pressable
                    key={scope}
                    onPress={() => setLeagueScope(scope)}
                    style={[styles.scopePill, leagueScope === scope && styles.scopePillActive]}
                  >
                    <AppText style={[styles.scopePillText, leagueScope === scope && styles.scopePillTextActive]}>
                      {scope === 'playoff' ? 'Playoff' : 'Season'}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              {isMlbRaceScope ? (
                mlbRace.map((league) => (
                  <Card key={league.name}>
                    <AppText variant="eyebrow">// {league.name}</AppText>
                    <View style={styles.standingsHeader}>
                      <AppText style={[styles.standingsHeaderText, styles.standingsRankCell]}>#</AppText>
                      <AppText style={[styles.standingsHeaderText, styles.standingsTeamCell]}>Team</AppText>
                      <AppText style={styles.standingsHeaderText}>Path</AppText>
                      <AppText style={styles.standingsHeaderText}>GB</AppText>
                      <AppText style={styles.standingsHeaderText}>L10</AppText>
                    </View>
                    {league.entries.map((entry, index) => (
                      <View key={`${league.name}-${entry.team.abbr}`} style={styles.standingsRow}>
                        <AppText style={[styles.standingsRank, styles.standingsRankCell]}>{index + 1}</AppText>
                        <View style={styles.standingsTeamCell}>
                          <AppText style={styles.standingsTeam}>{entry.team.name}</AppText>
                          <AppText variant="mono">{entry.team.abbr} · {entry.record ? `${entry.record.wins}-${entry.record.losses}` : '-'} · {formatMlbPct(entry.record?.pct)} pct</AppText>
                        </View>
                        <AppText style={styles.standingsValue}>{entry.path}</AppText>
                        <AppText style={styles.standingsValue}>{entry.status}</AppText>
                        <AppText style={styles.standingsValue}>{entry.l10 ? `${entry.l10.wins}-${entry.l10.losses}` : '-'}</AppText>
                      </View>
                    ))}
                  </Card>
                ))
              ) : mlbStandings.map((division) => (
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
              {(((sport === 'NBA' || sport === 'NHL') && teamFormQuery.data?.seasonPhase === 'playoff') || sport === 'WNBA') && (
                <View style={styles.scopeRow}>
                  {(['playoff', 'season'] as const).map((scope) => (
                    <Pressable
                      key={scope}
                      onPress={() => setLeagueScope(scope)}
                      style={[styles.scopePill, leagueScope === scope && styles.scopePillActive]}
                    >
                      <AppText style={[styles.scopePillText, leagueScope === scope && styles.scopePillTextActive]}>
                        {scope === 'playoff' ? 'Playoff' : 'Season'}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              )}
              {isPlayoffLeagueScope && playoffConferences.length === 0 && (
                <Card>
                  <AppText variant="eyebrow">// Playoff Picture</AppText>
                  <AppText variant="muted" style={styles.stateText}>
                    Series context is not available right now. Season still shows broader team context.
                  </AppText>
                </Card>
              )}
              {isWnbaRaceScope ? (
                <Card>
                  <AppText variant="eyebrow">// WNBA Playoff Race</AppText>
                  {wnbaRaceTeams.map((team: any) => (
                    <View key={`wnba-race-${team.teamAbbr}-${team.teamName}`} style={styles.playoffTeamRow}>
                      <View style={styles.teamInfoRank}>
                        <AppText style={styles.teamInfoRankText}>{team.seed}</AppText>
                      </View>
                      <View style={styles.teamInfoBody}>
                        <AppText style={styles.teamInfoName}>{team.teamName || team.commonName}</AppText>
                        <AppText variant="muted" style={styles.teamInfoMeta}>
                          {team.teamAbbr || '-'} · {team.path}
                        </AppText>
                        <View style={styles.teamInfoStats}>
                          <View style={styles.teamInfoStat}>
                            <AppText variant="mono">Record</AppText>
                            <AppText style={styles.teamInfoValue}>{teamRecordLabel(team, sport)}</AppText>
                          </View>
                          <View style={styles.teamInfoStat}>
                            <AppText variant="mono">GB</AppText>
                            <AppText style={styles.teamInfoValue}>{team.status}</AppText>
                          </View>
                          <View style={styles.teamInfoStat}>
                            <AppText variant="mono">Pct</AppText>
                            <AppText style={styles.teamInfoValue}>{basketballPctLabel(team)}</AppText>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              ) : isPlayoffLeagueScope ? (
                playoffConferences.map((conference) => (
                  <Card key={conference.name}>
                    <AppText variant="eyebrow">// {conference.name}</AppText>
                    {conference.series.flatMap((series) =>
                      series.teams.filter((team) => team.alive !== false).map((team) => {
                        const form = findTeamForm(teamFormQuery.data?.teams, team.teamName) || findTeamForm(teamFormQuery.data?.teams, team.teamAbbr)
                        return (
                          <View key={`${conference.name}-${series.status}-${team.teamAbbr}`} style={styles.playoffSeriesTeamRow}>
                            <View style={styles.playoffTeamHeader}>
                              <View style={styles.teamInfoRank}>
                                <AppText style={styles.teamInfoRankText}>{team.teamAbbr}</AppText>
                              </View>
                              <View style={styles.teamInfoBody}>
                                <AppText style={styles.teamInfoName}>{team.teamName}</AppText>
                                <AppText variant="muted" style={styles.teamInfoMeta}>{series.status}</AppText>
                              </View>
                            </View>
                            <View style={[styles.teamInfoStats, styles.playoffTeamStats]}>
                              <View style={styles.teamInfoStat}>
                                <AppText variant="mono">Record</AppText>
                                <AppText style={[styles.teamInfoValue, styles.playoffTeamInfoValue]}>{team.record || teamRecordLabel(form, sport)}</AppText>
                              </View>
                              <View style={styles.teamInfoStat}>
                                <AppText variant="mono">Series W</AppText>
                                <AppText style={[styles.teamInfoValue, styles.playoffTeamInfoValue]}>{team.seriesWins}</AppText>
                              </View>
                              {sport === 'NBA' ? (
                                <>
                                  <View style={styles.teamInfoStat}>
                                    <AppText variant="mono">Recent PF</AppText>
                                    <AppText style={[styles.teamInfoValue, styles.playoffTeamInfoValue]}>{recentPointsFor(form)}</AppText>
                                  </View>
                                  <View style={styles.teamInfoStat}>
                                    <AppText variant="mono">Recent PA</AppText>
                                    <AppText style={[styles.teamInfoValue, styles.playoffTeamInfoValue]}>{recentPointsAgainst(form)}</AppText>
                                  </View>
                                </>
                              ) : (
                                <View style={styles.teamInfoStat}>
                                  <AppText variant="mono">Recent</AppText>
                                  <AppText style={[styles.teamInfoValue, styles.playoffTeamInfoValue]}>{formLabel(form, sport)}</AppText>
                                </View>
                              )}
                            </View>
                          </View>
                        )
                      })
                    )}
                  </Card>
                ))
              ) : (
                visibleLeagueTeams.map((team: any) => (
                  <Card key={`${team.teamAbbr}-${team.teamName}`}>
                    <View style={styles.teamInfoHeader}>
                      <View style={styles.teamInfoRank}>
                        <AppText style={styles.teamInfoRankText}>{team.teamAbbr || '-'}</AppText>
                      </View>
                      <View style={styles.teamInfoBody}>
                        <AppText style={styles.teamInfoName}>{team.teamName || team.commonName}</AppText>
                        <AppText variant="muted" style={styles.teamInfoMeta}>
                          {teamRecordLabel(team, sport)}{sport === 'NHL' ? ` · ${team.points || 0} pts` : ''}
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
                ))
              )}
            </>
          )}
        </View>
      )}

      {isSelectedSportActive && view === 'matchups' && (sport === 'MLB' || sport === 'NBA' || sport === 'NHL' || sport === 'WNBA' || sport === 'SOCCER') && canViewMatchups && (
        <View style={styles.liveSection}>
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
            const awayPct = sport === 'MLB' ? Number(awayRecord?.pct || 0) : 0
            const homePct = sport === 'MLB' ? Number(homeRecord?.pct || 0) : 0
            const stronger = sport === 'MLB' && awayPct !== homePct ? (awayPct > homePct ? shortTeamName(game.away_team) : shortTeamName(game.home_team)) : null
            const awayPitcherEra = sport === 'MLB' ? mlbScheduleQuery.data?.pitcherEraMap?.[awayAbbr] : undefined
            const homePitcherEra = sport === 'MLB' ? mlbScheduleQuery.data?.pitcherEraMap?.[homeAbbr] : undefined
            const pitcherEraNote = typeof awayPitcherEra === 'number' && typeof homePitcherEra === 'number' && Math.abs(awayPitcherEra - homePitcherEra) >= 0.5
              ? `${awayPitcherEra < homePitcherEra ? shortTeamName(game.away_team) : shortTeamName(game.home_team)} has the probable-starter ERA edge (${awayPitcherEra.toFixed(2)} vs ${homePitcherEra.toFixed(2)}).`
              : null
            const note = sport === 'MLB'
              ? [stronger
                  ? `${stronger} owns the better season win rate by ${(Math.abs(awayPct - homePct) * 100).toFixed(1)} percentage points.`
                  : 'Season records are close.',
                pitcherEraNote || 'Use probable pitchers, recent form, and the best posted line before making the call.'].join(' ')
                : 'Use team form and posted market prices together before making the call.'
            const awayRows = sport === 'MLB'
              ? [
                  { label: 'Record', value: awayRecord ? `${awayRecord.wins}-${awayRecord.losses}` : '-' },
                  { label: 'Win Pct', value: awayRecord ? `${(Number(awayRecord.pct || 0) * 100).toFixed(1)}%` : '-' },
                  { label: 'Last 10', value: awayForm ? `${awayForm.wins}-${awayForm.losses}` : '-' },
                  { label: 'Probable SP', value: mlbScheduleQuery.data?.pitcherNameMap?.[awayAbbr] || 'TBD' },
                  { label: 'SP ERA', value: typeof awayPitcherEra === 'number' ? awayPitcherEra.toFixed(2) : '-' },
                ]
              : sport === 'SOCCER'
                ? [
                    { label: 'Record', value: soccerRecordLine(soccerAway) },
                    { label: 'Table', value: soccerAway?.position ? `#${soccerAway.position} · ${soccerAway.points || 0} pts` : '-' },
                    { label: 'Goals', value: soccerStatLine(soccerAway) },
                    { label: 'Draw Rate', value: soccerAway?.played ? `${Math.round(drawRate(soccerAway) * 100)}%` : '-' },
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
                  { label: 'SP ERA', value: typeof homePitcherEra === 'number' ? homePitcherEra.toFixed(2) : '-' },
                ]
              : sport === 'SOCCER'
                ? [
                    { label: 'Record', value: soccerRecordLine(soccerHome) },
                    { label: 'Table', value: soccerHome?.position ? `#${soccerHome.position} · ${soccerHome.points || 0} pts` : '-' },
                    { label: 'Goals', value: soccerStatLine(soccerHome) },
                    { label: 'Draw Rate', value: soccerHome?.played ? `${Math.round(drawRate(soccerHome) * 100)}%` : '-' },
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
                <View style={styles.matchupTeamGrid}>
                  <MatchupTeamBox
                    title={sport === 'SOCCER' && isWorldCupSoccer ? countryLabel(game.away_team) : shortTeamName(game.away_team)}
                    grade={sport === 'MLB' ? recordGrade(awayPct) : null}
                    rows={awayRows}
                    onPress={sport === 'SOCCER' ? () => setSelectedSoccerTeam(profileTeamFromName(soccerTeams, game.away_team)) : undefined}
                  />
                  <MatchupTeamBox
                    title={sport === 'SOCCER' && isWorldCupSoccer ? countryLabel(game.home_team) : shortTeamName(game.home_team)}
                    grade={sport === 'MLB' ? recordGrade(homePct) : null}
                    rows={homeRows}
                    onPress={sport === 'SOCCER' ? () => setSelectedSoccerTeam(profileTeamFromName(soccerTeams, game.home_team)) : undefined}
                  />
                </View>
                {sport !== 'SOCCER' && (
                  <View style={styles.matchupNote}>
                    <AppText variant="eyebrow">KingFish Matchup Note</AppText>
                    <AppText variant="muted" style={styles.matchupNoteText}>{note}</AppText>
                  </View>
                )}
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
                const depthStarters = nflDepthSummary(nflCommandQuery.data, entry.team)
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
                        </View>
                        {depthStarters.length ? (
                          <View style={styles.matchupNote}>
                            <AppText variant="eyebrow">Depth Starters</AppText>
                            <AppText variant="muted" style={styles.matchupNoteText}>{depthStarters.join(' · ')}</AppText>
                          </View>
                        ) : null}
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
              <AppText variant="muted">Matchups appear when the next slate is active.</AppText>
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
                const awayDepth = nflDepthSummary(nflCommandQuery.data, game.away_team, 2)
                const homeDepth = nflDepthSummary(nflCommandQuery.data, game.home_team, 2)
                const awayRows = [
                  { label: 'Side', value: 'Away' },
                  { label: 'Market', value: awayFavored ? marketDetail : homeFavored ? 'Plus side' : 'Pending' },
                  { label: 'Total', value: totalLabel },
                  { label: 'Depth', value: awayDepth.length ? awayDepth.join(' · ') : '-' },
                ]
                const homeRows = [
                  { label: 'Side', value: 'Home' },
                  { label: 'Market', value: homeFavored ? marketDetail : awayFavored ? 'Plus side' : 'Pending' },
                  { label: 'Total', value: totalLabel },
                  { label: 'Depth', value: homeDepth.length ? homeDepth.join(' · ') : '-' },
                ]
                const note = favorite === 'Pending'
                  ? 'Market pending.'
                  : `Market favorite: ${favorite} (${marketDetail}).`

                return (
                  <Card key={game.id}>
                    <View style={styles.gameHeader}>
                      <AppText style={styles.gameTitle}>{awayShort} @ {homeShort}</AppText>
                      <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
                    </View>
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
            <AppText variant="mono">
              {hasLiveNcaafTeamData ? '2026 college football team context' : 'College football team outlook for league context'}
            </AppText>
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

          {filteredNcaafTeams.map((team) => {
            const hasLiveTeamData = Boolean(
              team.currentRecord ||
              team.conferenceRecord ||
              team.recentForm ||
              typeof team.pointsForPerGame === 'number' ||
              typeof team.pointsAllowedPerGame === 'number',
            )
            const recordLabel = hasLiveTeamData ? '2026 Record' : '2025 Record'
            const recordValue = team.currentRecord || team.lastRecord
            const contextLine = hasLiveTeamData
              ? [team.conference, team.currentRecord, team.conferenceRecord ? `${team.conferenceRecord} conf` : null].filter(Boolean).join(' · ')
              : `${team.conference} · ${team.lastRecord} · ${team.schedule} schedule`
            return (
              <Card key={`${team.rank}-${team.team}`}>
                <View style={styles.teamInfoHeader}>
                  <View style={styles.teamInfoRank}>
                    <AppText style={styles.teamInfoRankText}>{team.rank}</AppText>
                  </View>
                  <View style={styles.teamInfoBody}>
                    <AppText style={styles.teamInfoName}>{team.team}</AppText>
                    <AppText variant="muted" style={styles.teamInfoMeta}>
                      {contextLine}
                    </AppText>
                  </View>
                  <View style={styles.teamInfoGrade}>
                    <AppText style={styles.teamInfoGradeText}>{team.power}</AppText>
                  </View>
                </View>
                <AppText variant="muted" style={styles.roadmapText}>{team.recentForm || team.profile}</AppText>
                <View style={styles.teamInfoStats}>
                  <View style={styles.teamInfoStat}>
                    <AppText variant="mono">{recordLabel}</AppText>
                    <AppText style={styles.teamInfoValue}>{recordValue}</AppText>
                  </View>
                  <View style={styles.teamInfoStat}>
                    <AppText variant="mono">{hasLiveTeamData ? 'Form' : 'Lean'}</AppText>
                    <AppText style={styles.teamInfoValue}>{team.recentForm || team.lean}</AppText>
                  </View>
                  <View style={styles.teamInfoStat}>
                    <AppText variant="mono">{team.pointsForPerGame || team.pointsAllowedPerGame ? 'Scoring' : 'Conference'}</AppText>
                    <AppText style={styles.teamInfoValue}>
                      {team.pointsForPerGame || team.pointsAllowedPerGame
                        ? `${team.pointsForPerGame ?? '-'} PF / ${team.pointsAllowedPerGame ?? '-'} PA`
                        : team.conference}
                    </AppText>
                  </View>
                </View>
              </Card>
            )
          })}
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

          {filteredNcaabTeams.map((team) => (
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
                  sport={sport}
                  weather={sport === 'MLB' ? weatherQuery.data?.[game.id || game.game_id || ''] : undefined}
                  mlbContext={sport === 'MLB' ? {
                    teamAbbrMap: MLB_TEAM_NAME_TO_ABBR,
                    records: mlbScheduleQuery.data?.teamRecords,
                    l10Map: mlbL10Query.data?.teamL10Map,
                    pitcherEraMap: mlbScheduleQuery.data?.pitcherEraMap,
                  } : undefined}
                  teamFormContext={sport === 'NBA' || sport === 'NHL' || sport === 'WNBA' ? {
                    awayForm: findTeamForm(teamFormQuery.data?.teams, game.away_team),
                    homeForm: findTeamForm(teamFormQuery.data?.teams, game.home_team),
                  } : undefined}
                  nflContext={sport === 'NFL' ? {
                    teamAbbrMap: NFL_TEAM_ABBR,
                    teamStatsMap: nflTeamStatsMap(nflCommandQuery.data),
                  } : undefined}
                  ncaafContext={sport === 'NCAAF' ? {
                    teams: ncaafOutlookQuery.data?.teams,
                  } : undefined}
                  soccerContext={sport === 'SOCCER' ? {
                    awayInfo: findSoccerTeam(soccerTeamQuery.data?.teams, game.away_team),
                    homeInfo: findSoccerTeam(soccerTeamQuery.data?.teams, game.home_team),
                    isTournament: soccerLeague === 'soccer_fifa_world_cup',
                  } : undefined}
                  onPressSoccerTeam={sport === 'SOCCER' ? (team) => setSelectedSoccerTeam(profileTeamFromName(soccerTeams, team)) : undefined}
                  userState={profile?.state}
                  showNeutralTotalWatch={sport !== 'NFL'}
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

          {sport === 'MLB' && propsGames.length > 0 && <MLBPropsTable games={propsGames} userState={profile?.state} />}
          {sport !== 'MLB' && (propsGames.length > 0 || sport === 'NFL') && <PropsList games={propsGames} sport={sport} initialStats={bundledPlayerStats} userState={profile?.state} />}
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
              <AppText variant="muted">Team context appears when standings are available.</AppText>
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
              {sport} props appear when markets are active.
            </AppText>
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'matchups' && sport === 'NCAAF' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">Latest NCAAF matchup context</AppText>
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
              <AppText variant="muted">Matchups appear when the next slate is active.</AppText>
            </Card>
          )}

          {ncaafMatchupGroups.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <DateDivider label={group.date} />
              {group.games.map((game) => {
                const awayTeam = ncaafTeamForName(game.away_team)
                const homeTeam = ncaafTeamForName(game.home_team)
                const awayRank = awayTeam?.rank
                const homeRank = homeTeam?.rank
                const awayShort = shortTeamName(game.away_team)
                const homeShort = shortTeamName(game.home_team)
                const favorite = game.favorite || 'Pending'
                const awayFavored = favorite === awayShort
                const homeFavored = favorite === homeShort
                const marketDetail = game.favoriteDetail || 'Market not posted yet'
                const totalLabel = game.total == null ? '-' : String(game.total)
                const rankValue = (rank?: number) => rank && rank <= 25 ? `AP #${rank}` : 'Unranked'
                const recordValue = (team?: typeof ncaafTeams[number]) => team?.currentRecord || team?.lastRecord || '-'
                const formValue = (team?: typeof ncaafTeams[number]) => team?.recentForm || team?.lean || team?.conference || '-'
                const awayRows = [
                  { label: '2025 Rank', value: rankValue(awayRank) },
                  { label: '2025 Record', value: recordValue(awayTeam) },
                  { label: awayTeam?.recentForm ? 'Form' : 'Baseline', value: formValue(awayTeam) },
                  { label: 'Market', value: awayFavored ? marketDetail : homeFavored ? 'Plus side' : 'Pending' },
                ]
                const homeRows = [
                  { label: '2025 Rank', value: rankValue(homeRank) },
                  { label: '2025 Record', value: recordValue(homeTeam) },
                  { label: homeTeam?.recentForm ? 'Form' : 'Baseline', value: formValue(homeTeam) },
                  { label: 'Market', value: homeFavored ? marketDetail : awayFavored ? 'Plus side' : 'Pending' },
                ]
                const baselineLeader = awayRank && homeRank
                  ? awayRank < homeRank ? awayShort : homeRank < awayRank ? homeShort : null
                  : awayRank ? awayShort : homeRank ? homeShort : null
                const baselineDetail = awayRank && homeRank
                  ? `2025 AP baseline: ${awayShort} #${awayRank}, ${homeShort} #${homeRank}.`
                  : awayRank
                    ? `${awayShort} carries a 2025 AP Top 25 baseline at #${awayRank}.`
                    : homeRank
                      ? `${homeShort} carries a 2025 AP Top 25 baseline at #${homeRank}.`
                      : 'No 2025 AP Top 25 baseline is available for either team.'
                const note = favorite === 'Pending'
                  ? baselineDetail
                  : baselineLeader
                    ? `${baselineDetail} ${favorite} is the market favorite (${marketDetail}); compare that price against the ${baselineLeader} baseline before treating it as an edge.`
                    : `${baselineDetail} ${favorite} is the market favorite (${marketDetail}); use the Game Lines tab to compare books.`
                return (
                  <Card key={game.id}>
                    <View style={styles.gameHeader}>
                      <AppText style={styles.gameTitle}>
                        {awayShort} @ {homeShort}
                      </AppText>
                      <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
                    </View>
                    <AppText variant="muted" style={styles.teamInfoMeta}>
                      {awayRank && awayRank <= 25 ? `#${awayRank} ${shortTeamName(game.away_team)} · ` : ''}
                      {homeRank && homeRank <= 25 ? `#${homeRank} ${shortTeamName(game.home_team)} · ` : ''}
                      {game.status}
                    </AppText>
                    <View style={styles.matchupTeamGrid}>
                      <MatchupTeamBox title={awayShort} grade={awayFavored ? 'Fav' : awayRank && awayRank <= 25 ? `#${awayRank}` : null} rows={awayRows} />
                      <MatchupTeamBox title={homeShort} grade={homeFavored ? 'Fav' : homeRank && homeRank <= 25 ? `#${homeRank}` : null} rows={homeRows} />
                    </View>
                    <View style={styles.teamInfoStats}>
                      <View style={styles.teamInfoStat}>
                        <AppText variant="mono">Spread</AppText>
                        <AppText style={styles.teamInfoValue}>{game.spread == null ? '-' : `${game.spread > 0 ? '+' : ''}${game.spread}`}</AppText>
                      </View>
                      <View style={styles.teamInfoStat}>
                        <AppText variant="mono">Total</AppText>
                        <AppText style={styles.teamInfoValue}>{totalLabel}</AppText>
                      </View>
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

      {isSelectedSportActive && view === 'matchups' && sport === 'NCAAB' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">Latest NCAAB matchup context</AppText>
          </View>

          {ncaabMatchupsQuery.isLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>Loading NCAAB matchups...</AppText>
            </View>
          )}

          {ncaabMatchupsQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Game Matchups</AppText>
              <AppText variant="muted" style={styles.stateText}>Could not load NCAAB matchups.</AppText>
            </Card>
          )}

          {!ncaabMatchupsQuery.isLoading && !ncaabMatchupsQuery.isError && filteredNcaabMatchups.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Game Matchups</AppText>
              <AppText variant="title" style={styles.cardTitle}>No Matchups Yet</AppText>
              <AppText variant="muted">Matchups appear when the next slate is active.</AppText>
            </Card>
          )}

          {ncaabMatchupGroups.map((group) => (
            <View key={group.date} style={styles.dateGroup}>
              <DateDivider label={group.date} />
              {group.games.map((game) => (
                <Card key={game.id}>
                  <View style={styles.gameHeader}>
                    <AppText style={styles.gameTitle}>
                      {shortTeamName(game.away_team)} @ {shortTeamName(game.home_team)}
                    </AppText>
                    <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
                  </View>
                  <AppText variant="muted" style={styles.teamInfoMeta}>{game.favoriteDetail}</AppText>
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
              ))}
            </View>
          ))}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && isCollegeSport(sport) && sport !== 'NCAAF' && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Team Stats</AppText>
            <AppText variant="muted">Team stats and matchup context.</AppText>
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'league' && sport === 'SOCCER' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">
              {isWorldCupSoccer
                ? 'World Cup fixtures and market coverage'
                : `${selectedSoccerLeague.label} team table, goal context, and matchup context`}
            </AppText>
          </View>

          {(isWorldCupSoccer ? lineQuery.isLoading : soccerTeamQuery.isLoading) && (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={styles.stateText}>
                {isWorldCupSoccer ? 'Loading tournament view...' : 'Loading team info...'}
              </AppText>
            </View>
          )}

          {(isWorldCupSoccer ? lineQuery.isError : soccerTeamQuery.isError) && (
            <Card>
              <AppText variant="eyebrow">{isWorldCupSoccer ? '// Tournament View' : '// Team Info'}</AppText>
              <AppText variant="muted" style={styles.stateText}>
                {isWorldCupSoccer ? 'Could not load World Cup fixtures.' : 'Could not load soccer team info.'}
              </AppText>
            </Card>
          )}

          {isWorldCupSoccer && !lineQuery.isLoading && !lineQuery.isError && (
            <>
              <Card>
                <AppText variant="eyebrow">// Tournament View</AppText>
                <AppText variant="title" style={styles.cardTitle}>World Cup Board</AppText>
                <View style={styles.tournamentStats}>
                  <View style={styles.tournamentStat}>
                    <AppText variant="mono">Fixtures</AppText>
                    <AppText style={styles.teamInfoValue}>{upcomingLineGames.length}</AppText>
                  </View>
                  <View style={styles.tournamentStat}>
                    <AppText variant="mono">Countries</AppText>
                    <AppText style={styles.teamInfoValue}>{worldCupTeams.length}</AppText>
                  </View>
                  <View style={styles.tournamentStat}>
                    <AppText variant="mono">Next Window</AppText>
                    <AppText style={styles.teamInfoValue}>{worldCupGroups[0]?.date || '-'}</AppText>
                  </View>
                </View>
              </Card>

              <Card>
                <AppText variant="eyebrow">// Standings</AppText>
                {soccerTeamQuery.isLoading ? (
                  <View style={styles.compactLoadingRow}>
                    <ActivityIndicator color={colors.gold} />
                    <AppText variant="muted">Loading table data...</AppText>
                  </View>
                ) : worldCupStandings.length > 0 ? (
                  <View style={styles.tournamentStandings}>
                    {worldCupStandings.map((group) => (
                      <View key={group.name} style={styles.tournamentStandingGroup}>
                        <AppText variant="mono">{group.name}</AppText>
                        <View style={styles.tournamentStandingHeader}>
                          <AppText style={[styles.tournamentStandingHeadText, styles.tournamentStandingTeamCell]}>Country</AppText>
                          <AppText style={styles.tournamentStandingHeadText}>W-D-L</AppText>
                          <AppText style={styles.tournamentStandingHeadText}>GD</AppText>
                          <AppText style={styles.tournamentStandingHeadText}>Pts</AppText>
                        </View>
                        {group.entries.map((team) => (
                          <Pressable
                            key={`${group.name}-${team.team}`}
                            onPress={() => setSelectedSoccerTeam(team)}
                            style={styles.tournamentStandingRow}
                          >
                            <AppText style={[styles.tournamentStandingTeam, styles.tournamentStandingTeamCell]} numberOfLines={1}>
                              {countryStandingLabel(team)}
                            </AppText>
                            <AppText style={styles.tournamentStandingValue}>{soccerRecordCompact(team)}</AppText>
                            <AppText style={styles.tournamentStandingValue}>{soccerGoalDiffLabel(team)}</AppText>
                            <AppText style={[styles.tournamentStandingValue, styles.tournamentStandingPoints]}>{team.points ?? '-'}</AppText>
                          </Pressable>
                        ))}
                      </View>
                    ))}
                  </View>
                ) : (
                  <AppText variant="muted" style={styles.stateText}>
                    Group standings will appear when the tournament table is available.
                  </AppText>
                )}
              </Card>

              {worldCupGroups.map((group) => (
                <Card key={group.date}>
                  <AppText variant="eyebrow">// {group.date}</AppText>
                  <View style={styles.tournamentFixtures}>
                    {group.games.map((game) => (
                      <View key={game.id || game.game_id || `${game.away_team}-${game.home_team}`} style={styles.tournamentFixture}>
                        <View style={styles.tournamentFixtureTeams}>
                          <Pressable onPress={() => setSelectedSoccerTeam(profileTeamFromName(soccerTeams, game.away_team))}>
                            <AppText style={styles.tournamentTeam}>{countryLabel(game.away_team)}</AppText>
                          </Pressable>
                          <AppText variant="mono">vs</AppText>
                          <Pressable onPress={() => setSelectedSoccerTeam(profileTeamFromName(soccerTeams, game.home_team))}>
                            <AppText style={styles.tournamentTeam}>{countryLabel(game.home_team)}</AppText>
                          </Pressable>
                        </View>
                        <View style={styles.tournamentFixtureMeta}>
                          <AppText variant="mono">{fmtTime(game.commence_time)}</AppText>
                          <AppText variant="mono">{supportedBookmakers(game.bookmakers, profile?.state).length} books</AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>
              ))}
            </>
          )}

          {!isWorldCupSoccer && !soccerTeamQuery.isLoading && !soccerTeamQuery.isError && soccerTeams.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Team Info</AppText>
              <AppText variant="title" style={styles.cardTitle}>No Team Table Yet</AppText>
              <AppText variant="muted">
                Team records and goal context appear here for {selectedSoccerLeague.label}.
              </AppText>
            </Card>
          )}

          {!isWorldCupSoccer && soccerTeams.map((team) => (
            <Pressable key={`${team.team}-${team.position}`} onPress={() => setSelectedSoccerTeam(team)}>
              <Card>
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
                    <AppText variant="mono">PPG</AppText>
                    <AppText style={styles.teamInfoValue}>{team.played ? pointsPerGame(team).toFixed(2) : '-'}</AppText>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
      {sport === 'NFL' && (
        <Card>
          <AppText variant="eyebrow">// More Research</AppText>
          <AppText variant="muted" style={styles.roadmapText}>
            Futures, injuries, fantasy, depth charts, and team research.
          </AppText>
          <View style={styles.upgradeAction}>
            <Button variant="secondary" onPress={() => Linking.openURL(mobileConfig.links.nfl_command_center)}>
              Open NFL Command Center
            </Button>
          </View>
        </Card>
      )}
      <SoccerTeamProfileModal
        team={selectedSoccerTeam}
        league={soccerLeague}
        onClose={() => setSelectedSoccerTeam(null)}
      />
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
    marginBottom: spacing.md,
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
    alignItems: 'flex-start',
    gap: 8,
    paddingRight: spacing.lg,
    marginBottom: spacing.lg,
  },
  sportScroll: {
    flexGrow: 0,
  },
  pill: {
    height: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
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
    gap: 8,
    paddingRight: spacing.lg,
  },
  soccerLeagueScroll: {
    flexGrow: 0,
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
  collegeFilterWrap: {
    marginBottom: spacing.lg,
  },
  collegeSelect: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  collegeSelectValue: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  collegeSelectMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  collegeSelectOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  collegeSelectOptionActive: {
    backgroundColor: colors.gold,
  },
  collegeSelectOptionText: {
    color: colors.textSecondary,
    fontWeight: '800',
  },
  collegeSelectOptionTextActive: {
    color: colors.bgPrimary,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scopePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  scopePillActive: {
    borderColor: colors.gold,
    backgroundColor: colors.gold,
  },
  scopePillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  scopePillTextActive: {
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
  tournamentStats: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tournamentStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.sm,
  },
  compactLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tournamentStandings: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  tournamentStandingGroup: {
    gap: spacing.xs,
  },
  tournamentStandingHeader: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  tournamentStandingHeadText: {
    flex: 0.58,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  tournamentStandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  tournamentStandingTeamCell: {
    flex: 1.65,
    minWidth: 0,
    textAlign: 'left',
  },
  tournamentStandingTeam: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  tournamentStandingValue: {
    flex: 0.58,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'right',
  },
  tournamentStandingPoints: {
    color: colors.gold,
  },
  teamProfileOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,.62)',
  },
  teamProfileBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  teamProfileSheet: {
    maxHeight: '82%',
    borderTopWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  teamProfileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.lg,
  },
  teamProfileTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  teamProfileTitle: {
    marginTop: spacing.xs,
  },
  closeTeamProfile: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTeamProfileText: {
    color: colors.textMuted,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '900',
  },
  teamProfileBody: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  teamProfileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  teamProfileStat: {
    width: '31.5%',
    minHeight: 78,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.sm,
  },
  teamProfileValue: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  teamProfileForm: {
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: spacing.sm,
  },
  teamProfileNewsList: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  teamProfileNewsItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  teamProfileNewsHeadline: {
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '900',
  },
  teamProfileNewsDescription: {
    marginTop: spacing.xs,
  },
  teamProfileNewsMeta: {
    color: colors.gold,
    marginTop: spacing.sm,
  },
  tournamentFixtures: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tournamentFixture: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tournamentFixtureTeams: {
    gap: spacing.xs,
  },
  tournamentTeam: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
  },
  tournamentFixtureMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
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
  playoffTeamRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playoffSeriesTeamRow: {
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playoffTeamHeader: {
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
    borderRadius: 6,
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
  playoffTeamStats: {
    marginTop: 0,
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
  playoffTeamInfoValue: {
    fontSize: 16,
    lineHeight: 20,
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
  matchupTeamTitlePress: {
    flex: 1,
    minWidth: 0,
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
