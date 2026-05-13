import { useState } from 'react'
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
import { fetchFeatureFlags, type FeatureFlagKey } from '@/lib/featureFlags'
import { useMobileConfig } from '@/lib/mobileConfig'
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

type DashboardView = 'league' | 'lines' | 'props'

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

type NCAAFMatchup = {
  id: string
  commence_time: string
  home_team: string
  away_team: string
  favorite: string
  favoriteDetail: string
  spread: number | null
  total: number | null
  status: string
}

type WeekOption<T extends { commence_time: string }> = {
  key: string
  label: string
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

const SPORTS: Array<{
  key: Sport
  flag: FeatureFlagKey
  status: 'Live' | 'Offseason'
  description: string
  inactiveTitle: string
  inactiveDescription: string
}> = [
  {
    key: 'MLB',
    flag: 'dashboard_mlb',
    status: 'Live',
    description: 'Track live MLB lines, player props, weather, stat trends, and cheat-sheet support in one place.',
    inactiveTitle: 'MLB Lines Unavailable',
    inactiveDescription: 'No MLB markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'NBA',
    flag: 'dashboard_nba',
    status: 'Live',
    description: 'Compare live NBA lines, player props, recent form, hit rates, and Edge Scores by matchup.',
    inactiveTitle: 'NBA Lines Unavailable',
    inactiveDescription: 'No NBA markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'NFL',
    flag: 'nfl_props',
    status: 'Offseason',
    description: 'NFL is year-round in KingFish. Game lines appear when books post regular-season markets, with player props and deeper research built around the NFL Command Center.',
    inactiveTitle: 'NFL Not In Season',
    inactiveDescription: 'NFL lives year-round in KingFish. Use the Command Center for fantasy tools, draft research, injuries, futures, and offseason notes while regular-season markets are off the board.',
  },
  {
    key: 'NHL',
    flag: 'dashboard_nhl',
    status: 'Live',
    description: 'Track NHL lines, player props, shot volume, scoring trends, and Edge Scores in one board.',
    inactiveTitle: 'NHL Lines Unavailable',
    inactiveDescription: 'No NHL markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'WNBA',
    flag: 'dashboard_wnba',
    status: 'Live',
    description: 'Follow WNBA lines and player props with recent stat trends, hit rates, and best available odds.',
    inactiveTitle: 'WNBA Lines Unavailable',
    inactiveDescription: 'No WNBA markets are posted right now. When books post lines, KingFish will show game lines, props, and stat context.',
  },
  {
    key: 'KBO',
    flag: 'dashboard_kbo',
    status: 'Live',
    description: 'Follow KBO game lines and market movement from supported books.',
    inactiveTitle: 'KBO Lines Unavailable',
    inactiveDescription: 'No KBO markets are posted right now. When books post the next slate, KingFish will show game lines.',
  },
  {
    key: 'NCAAB',
    flag: 'dashboard_ncaab',
    status: 'Offseason',
    description: 'College basketball will focus on team stats, team trends, points for, points against, and matchup context.',
    inactiveTitle: 'College Basketball Not In Season',
    inactiveDescription: 'College basketball game lines and matchup context return when the season is active and sportsbooks have posted markets.',
  },
  {
    key: 'NCAAF',
    flag: 'dashboard_ncaaf',
    status: 'Offseason',
    description: 'College football will focus on game lines, team stats, matchup grades, and team leans instead of player props.',
    inactiveTitle: 'College Football Not In Season',
    inactiveDescription: 'College football game lines, market leans, and matchup context return when the season is active and sportsbooks have posted markets.',
  },
  {
    key: 'SOCCER',
    flag: 'dashboard_soccer',
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

function shortTeamName(team: string) {
  return team.replace(/ University$/i, '').replace(/ College$/i, '')
}

function nflWinTotal(data: NFLFuturesData | undefined, team: string) {
  const lines = data?.wins?.find((item) => item.team === team)?.lines || []
  if (!lines.length) return '-'
  return String(lines[Math.floor(lines.length / 2)].line)
}

export default function DashboardScreen() {
  const { profile } = useAuth()
  const mobileConfig = useMobileConfig()
  const [sport, setSport] = useState<Sport>('MLB')
  const [view, setView] = useState<DashboardView>('lines')
  const [selectedLineWeek, setSelectedLineWeek] = useState('')
  const [soccerLeague, setSoccerLeague] = useState('soccer_epl')
  const [collegeScope, setCollegeScope] = useState<'top25' | 'all'>('top25')
  const [collegeConference, setCollegeConference] = useState('All')
  const selectedSport = SPORTS.find((item) => item.key === sport) || SPORTS[0]
  const selectedSoccerLeague = SOCCER_LEAGUES.find((item) => item.key === soccerLeague) || SOCCER_LEAGUES[0]
  const flagsQuery = useQuery({
    queryKey: ['feature-flags'],
    queryFn: fetchFeatureFlags,
    staleTime: 60 * 1000,
  })
  const isSelectedSportActive = selectedSport.key === 'NFL' || (flagsQuery.data?.[selectedSport.flag] ?? selectedSport.status === 'Live')
  const getSportActive = (item: (typeof SPORTS)[number]) => item.key === 'NFL' || (flagsQuery.data?.[item.flag] ?? item.status === 'Live')
  const dashboardViews: DashboardView[] = sport === 'NFL' || sport === 'NCAAF' ? ['league', 'props', 'lines'] : ['lines', 'props']
  const secondaryViewLabel = sport === 'NCAAF' ? 'Game Matchups' : isCollegeSport(sport) || sport === 'SOCCER' ? 'Team Info' : 'Player Props'
  const isPremium = profile?.is_premium === true
  const canFetchLines = isSelectedSportActive && view === 'lines' && isPremium
  const canFetchProps = isSelectedSportActive && view === 'props' && isPremium && !isCollegeSport(sport) && hasLiveProps(sport)
  const lineQuery = useQuery({
    queryKey: ['game-lines', sport, sport === 'SOCCER' ? soccerLeague : 'default'],
    queryFn: () => kingfishFetch<Game[]>(
      sport === 'SOCCER'
        ? `/api/soccer-odds?league=${soccerLeague}`
        : `/api/${sportApiKey(sport)}-odds`
    ),
    enabled: canFetchLines,
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
    queryFn: () => kingfishFetch<Game[]>(`/api/${sportApiKey(sport)}-props`),
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
    enabled: isSelectedSportActive && sport === 'NCAAF' && (view === 'league' || view === 'props'),
    staleTime: 24 * 60 * 60 * 1000,
  })
  const ncaafMatchupsQuery = useQuery({
    queryKey: ['ncaaf-mobile-matchups'],
    queryFn: () => kingfishFetch<NCAAFMatchup[]>('/api/ncaaf-matchups'),
    enabled: isSelectedSportActive && sport === 'NCAAF' && view === 'props',
    staleTime: 10 * 60 * 1000,
  })
  const soccerTeamQuery = useQuery({
    queryKey: ['soccer-team-info', soccerLeague],
    queryFn: () => kingfishFetch<{ teams: SoccerTeamInfo[]; updated_at?: string | null }>(`/api/soccer-team-info?league=${soccerLeague}`),
    enabled: isSelectedSportActive && sport === 'SOCCER' && view === 'props',
    staleTime: 24 * 60 * 60 * 1000,
  })
  const soccerTeams = [...(soccerTeamQuery.data?.teams || [])].sort((a, b) => {
    const aPos = Number(a.position || 999)
    const bPos = Number(b.position || 999)
    return aPos - bPos || String(a.team).localeCompare(String(b.team))
  })
  const lineWeeks = sport === 'NFL' || sport === 'NCAAF' ? weekOptions(upcomingGames(lineQuery.data || [])) : []
  const activeLineWeek = lineWeeks.find((week) => week.key === selectedLineWeek) || lineWeeks[0]
  const visibleLineGames = (sport === 'NFL' || sport === 'NCAAF') && activeLineWeek ? activeLineWeek.games : (lineQuery.data || [])
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

  return (
    <Screen>
      <AppText variant="eyebrow">// Live Board</AppText>
      <AppText variant="title" style={styles.title}>Dashboard</AppText>
        <AppText variant="muted" style={styles.copy}>
        Live odds, props, weather, and betting intelligence across the sports KingFish supports.
      </AppText>

      <View style={styles.row}>
        {SPORTS.map((item) => (
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
              <View
                style={[
                  styles.statusDot,
                  getSportActive(item) && styles.liveDot,
                  !getSportActive(item) && item.status === 'Offseason' && styles.offseasonDot,
                ]}
              />
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
              {item === 'league' ? 'League View' : item === 'lines' ? 'Game Lines' : secondaryViewLabel}
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
            ? (view === 'league' ? 'League View' : view === 'lines' ? 'Game Lines' : secondaryViewLabel)
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
        {sport === 'NFL' && (
          <View style={styles.nflActions}>
            <Button variant="secondary" onPress={() => Linking.openURL(mobileConfig.links.nfl_command_center)}>
              Open Command Center
            </Button>
            {mobileConfig.flags.fantasy_hub ? (
              <Button variant="outline" onPress={() => Linking.openURL(mobileConfig.links.fantasy_hub)}>
                Open Fantasy Hub
              </Button>
            ) : null}
          </View>
        )}
      </Card>

      {isSelectedSportActive && sport === 'NFL' && view === 'league' && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">
              Division baseline built from 2025 results and 2026 win-total context
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
                <AppText style={styles.leagueHeaderText}>2025</AppText>
                <AppText style={styles.leagueHeaderText}>L5</AppText>
                <AppText style={styles.leagueHeaderText}>Win Total</AppText>
              </View>
              {division.entries.map((entry) => {
                const context = nflFuturesQuery.data?.divisionContext[entry.team]
                return (
                  <View key={`${division.division}-${entry.team}`} style={styles.leagueRow}>
                    <AppText style={[styles.leagueTeam, styles.leagueTeamCell]}>{entry.team}</AppText>
                    <AppText style={styles.leagueValue}>{context ? `${context.wins}W / ${context.rank}` : '-'}</AppText>
                    <AppText style={styles.leagueValue}>{context ? `${context.last5Wins}-${5 - context.last5Wins}` : '-'}</AppText>
                    <AppText style={styles.leagueValue}>{nflWinTotal(nflFuturesQuery.data, entry.team)}</AppText>
                  </View>
                )
              })}
            </Card>
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

      {isSelectedSportActive && view === 'lines' && !isPremium && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Premium</AppText>
            <AppText variant="title" style={styles.cardTitle}>Unlock Game Lines</AppText>
            <AppText variant="muted">
              Live moneylines, spreads, totals, best available prices, and KingFish matchup context
              are part of KingFish Bets Pro.
            </AppText>
            <View style={styles.upgradeAction}>
              <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
            </View>
          </Card>
        </View>
      )}

      {canFetchLines && (
        <View style={styles.liveSection}>
          <View style={styles.dataNote}>
            <AppText variant="mono">
              Live lines refresh throughout the day · best available odds are highlighted in gold
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

          {visibleLineGames.map((game) => (
            <GameLineCard
              key={game.id || game.game_id || `${game.away_team}-${game.home_team}`}
              game={game}
              weather={sport === 'MLB' ? weatherQuery.data?.[game.id || game.game_id || ''] : undefined}
            />
          ))}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && !isCollegeSport(sport) && sport !== 'SOCCER' && !isPremium && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Premium</AppText>
            <AppText variant="title" style={styles.cardTitle}>Unlock Player Props</AppText>
            <AppText variant="muted">
              Player props, cheat sheets, Edge Scores, and unlimited Ask KingFish access are part
              of KingFish Bets Pro.
            </AppText>
            <View style={styles.upgradeAction}>
              <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
            </View>
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

          {propsQuery.data?.length === 0 && (
            <Card>
              <AppText variant="eyebrow">// Empty</AppText>
              <AppText variant="muted" style={styles.stateText}>No player props found for {sport} right now.</AppText>
            </Card>
          )}

          {sport === 'MLB' && propsQuery.data && <MLBPropsTable games={propsQuery.data} />}
          {sport !== 'MLB' && propsQuery.data && <PropsList games={propsQuery.data} sport={sport} />}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && isPremium && !isCollegeSport(sport) && sport !== 'SOCCER' && !hasLiveProps(sport) && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Player Props</AppText>
            <AppText variant="muted">
              {sport} player props will appear here when supported books post regular-season markets.
            </AppText>
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'props' && sport === 'NCAAF' && (
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

          {filteredNcaafMatchups.map((game) => {
            const awayRank = ncaafTeamForName(game.away_team)?.rank
            const homeRank = ncaafTeamForName(game.home_team)?.rank
            return (
              <Card key={game.id}>
                <View style={styles.gameHeader}>
                  <AppText style={styles.gameTitle}>
                    {shortTeamName(game.away_team)} @ {shortTeamName(game.home_team)}
                  </AppText>
                  <AppText variant="mono">{shortDate(new Date(game.commence_time))}</AppText>
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

      {isSelectedSportActive && view === 'props' && sport === 'SOCCER' && (
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
    </Screen>
  )
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 7,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: colors.gold,
  },
  segmentText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 13,
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
  nflActions: {
    gap: spacing.md,
    marginTop: spacing.lg,
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
})
