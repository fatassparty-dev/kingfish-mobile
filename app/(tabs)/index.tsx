import { useState } from 'react'
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native'
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

const SPORTS: Array<{
  key: Sport
  flag: FeatureFlagKey
  status: 'Live' | 'Offseason' | 'Coming'
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
    inactiveDescription: 'MLB lines are temporarily unavailable. Check back soon for game lines, props, and stat context.',
  },
  {
    key: 'NBA',
    flag: 'dashboard_nba',
    status: 'Live',
    description: 'Compare live NBA lines, player props, recent form, hit rates, and Edge Scores by matchup.',
    inactiveTitle: 'NBA Lines Unavailable',
    inactiveDescription: 'NBA lines are temporarily unavailable. Check back soon for game lines, props, and stat context.',
  },
  {
    key: 'NFL',
    flag: 'nfl_props',
    status: 'Offseason',
    description: 'NFL is year-round in KingFish. Game lines appear when books post regular-season markets, with player props and deeper research built around the NFL Command Center.',
    inactiveTitle: 'NFL Lines Coming Soon',
    inactiveDescription: 'NFL lives year-round in KingFish. Check the Command Center for fantasy tools, draft research, injuries, and offseason notes.',
  },
  {
    key: 'NHL',
    flag: 'dashboard_nhl',
    status: 'Live',
    description: 'Track NHL lines, player props, shot volume, scoring trends, and Edge Scores in one board.',
    inactiveTitle: 'NHL Lines Unavailable',
    inactiveDescription: 'NHL lines are temporarily unavailable. Check back soon for game lines, props, and stat context.',
  },
  {
    key: 'WNBA',
    flag: 'dashboard_wnba',
    status: 'Live',
    description: 'Follow WNBA lines and player props with recent stat trends, hit rates, and best available odds.',
    inactiveTitle: 'WNBA Lines Unavailable',
    inactiveDescription: 'WNBA lines are temporarily unavailable. Check back soon for game lines, props, and stat context.',
  },
  {
    key: 'KBO',
    flag: 'dashboard_kbo',
    status: 'Live',
    description: 'Follow KBO game lines and market movement from supported books.',
    inactiveTitle: 'KBO Lines Unavailable',
    inactiveDescription: 'KBO game lines are temporarily unavailable. Check back soon for the next posted slate.',
  },
  {
    key: 'NCAAB',
    flag: 'dashboard_ncaab',
    status: 'Offseason',
    description: 'College basketball will focus on team stats, team trends, points for, points against, and matchup context.',
    inactiveTitle: 'College Basketball Lines Coming Soon',
    inactiveDescription: 'College basketball will focus on team lines, totals, and matchup context when markets are available.',
  },
  {
    key: 'NCAAF',
    flag: 'dashboard_ncaaf',
    status: 'Offseason',
    description: 'College football will focus on game lines, team stats, matchup grades, and team leans instead of player props.',
    inactiveTitle: 'College Football Lines Coming Soon',
    inactiveDescription: 'College football will focus on team lines, market leans, and matchup context when markets are available.',
  },
  {
    key: 'SOCCER',
    flag: 'dashboard_soccer',
    status: 'Offseason',
    description: 'Follow soccer game lines for supported leagues when US sportsbooks post them.',
    inactiveTitle: 'Soccer Lines Coming Soon',
    inactiveDescription: 'Soccer will feature game lines for supported leagues when those markets are available.',
  },
]

function isCollegeSport(sport: Sport) {
  return sport === 'NCAAB' || sport === 'NCAAF'
}

function hasLiveProps(sport: Sport) {
  return sport === 'MLB' || sport === 'NBA' || sport === 'NHL' || sport === 'WNBA'
}

function sportApiKey(sport: Sport) {
  return sport.toLowerCase()
}

export default function DashboardScreen() {
  const { profile } = useAuth()
  const mobileConfig = useMobileConfig()
  const [sport, setSport] = useState<Sport>('MLB')
  const [view, setView] = useState<'lines' | 'props'>('lines')
  const selectedSport = SPORTS.find((item) => item.key === sport) || SPORTS[0]
  const flagsQuery = useQuery({
    queryKey: ['feature-flags'],
    queryFn: fetchFeatureFlags,
    staleTime: 60 * 1000,
  })
  const isSelectedSportActive = flagsQuery.data?.[selectedSport.flag] ?? selectedSport.status === 'Live'
  const getSportActive = (item: (typeof SPORTS)[number]) => flagsQuery.data?.[item.flag] ?? item.status === 'Live'
  const secondaryViewLabel = isCollegeSport(sport) ? 'Team Stats' : 'Player Props'
  const isPremium = profile?.is_premium === true
  const canFetchLines = isSelectedSportActive && view === 'lines'
  const canFetchProps = isSelectedSportActive && view === 'props' && isPremium && !isCollegeSport(sport) && hasLiveProps(sport)
  const lineQuery = useQuery({
    queryKey: ['game-lines', sport],
    queryFn: () => kingfishFetch<Game[]>(`/api/${sportApiKey(sport)}-odds`),
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
                  !getSportActive(item) && item.status === 'Coming' && styles.comingDot,
                ]}
              />
            </View>
          </Pressable>
        ))}
      </View>

      <View style={styles.segment}>
        {(['lines', 'props'] as const).map((item) => (
          <Pressable
            key={item}
            onPress={() => setView(item)}
            style={[styles.segmentButton, view === item && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, view === item && styles.segmentTextActive]}>
              {item === 'lines' ? 'Game Lines' : secondaryViewLabel}
            </AppText>
          </Pressable>
        ))}
      </View>

      <Card>
        <AppText variant="eyebrow">// {sport} {isSelectedSportActive ? 'Active' : selectedSport.status}</AppText>
        <AppText variant="title" style={styles.cardTitle}>
          {isSelectedSportActive
            ? (view === 'lines' ? 'Game Lines' : secondaryViewLabel)
            : selectedSport.inactiveTitle}
        </AppText>
        <AppText variant="muted">
          {isSelectedSportActive ? selectedSport.description : selectedSport.inactiveDescription}
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
            <Button variant="outline" onPress={() => Linking.openURL(mobileConfig.links.fantasy_hub)}>
              Open Fantasy Hub
            </Button>
          </View>
        )}
      </Card>

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

          {lineQuery.data?.map((game) => (
            <GameLineCard
              key={game.id || game.game_id || `${game.away_team}-${game.home_team}`}
              game={game}
              weather={sport === 'MLB' ? weatherQuery.data?.[game.id || game.game_id || ''] : undefined}
            />
          ))}
        </View>
      )}

      {isSelectedSportActive && view === 'props' && !isCollegeSport(sport) && !isPremium && (
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

      {isSelectedSportActive && view === 'props' && isPremium && !isCollegeSport(sport) && !hasLiveProps(sport) && (
        <View style={styles.liveSection}>
          <Card>
            <AppText variant="eyebrow">// Player Props</AppText>
            <AppText variant="muted">
              {sport} player props will appear here when supported books post regular-season markets.
            </AppText>
          </Card>
        </View>
      )}

      {isSelectedSportActive && view === 'props' && isCollegeSport(sport) && (
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
  comingDot: {
    backgroundColor: colors.textMuted,
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
})
