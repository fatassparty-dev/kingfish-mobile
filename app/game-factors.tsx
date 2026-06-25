import { useMemo, useState } from 'react'
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, spacing } from '@/lib/theme'
import type { Game } from '@/types'
import {
  FactorMeta,
  FactorMetric,
  FactorWeatherVisual,
  WindArrow,
  buildFactorCheatRows,
  buildFactorRows,
  factorImpactTone,
  isNeutralFactorText,
  shortSurface,
  stadiumProfileForRow,
  type BallparkProfilePayload,
  type FactorOfficial,
  type FactorSport,
  type FactorView,
  type FootballStadiumProfilePayload,
  type StadiumProfile,
} from './(tabs)/cheat-sheets'

export default function GameFactorsScreen() {
  const { profile } = useAuth()
  const isPremium = profile?.is_premium === true

  // Opened from the Cheat Sheets tab's "Stadium Cheat Sheet" tile with ?view=cheat,
  // which lands directly on the MLB cheat-sheet view.
  const params = useLocalSearchParams<{ view?: string }>()
  const [factorSport, setFactorSport] = useState<FactorSport>('MLB')
  const [factorView, setFactorView] = useState<FactorView>(params.view === 'cheat' ? 'cheat' : 'board')
  const [stadiumProfile, setStadiumProfile] = useState<StadiumProfile | null>(null)

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
    enabled: isPremium,
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
    enabled: isPremium && factorGames.length > 0,
    staleTime: 60 * 60 * 1000,
  })

  const factorOfficialQuery = useQuery({
    queryKey: ['mobile-game-factors-officials', factorSport, factorGames.map((game: Game) => game.id || game.game_id).join(',')],
    queryFn: () =>
      kingfishFetch<Record<string, FactorOfficial>>(factorSport === 'MLB' ? '/api/mlb-officials' : '/api/nfl-officials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: factorGames }),
      }),
    enabled: isPremium && factorGames.length > 0,
    staleTime: 60 * 60 * 1000,
  })

  const ballparkProfileQuery = useQuery({
    queryKey: ['mobile-mlb-ballpark-profiles'],
    queryFn: () => kingfishFetch<BallparkProfilePayload>('/api/mlb-ballpark-profiles'),
    enabled: isPremium && factorSport === 'MLB',
    staleTime: 30 * 60 * 1000,
  })

  const footballStadiumProfileQuery = useQuery({
    queryKey: ['mobile-nfl-stadium-profiles'],
    queryFn: () => kingfishFetch<FootballStadiumProfilePayload>('/api/nfl-stadium-profiles'),
    enabled: isPremium && factorSport === 'NFL',
    staleTime: 30 * 60 * 1000,
  })

  const factorRows = buildFactorRows(factorGames, factorWeatherQuery.data, factorSport, factorOfficialQuery.data)
  const factorCheatRows = factorSport === 'MLB' ? buildFactorCheatRows(factorGames, factorWeatherQuery.data) : []

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <AppText style={styles.backText}>‹ Back</AppText>
      </Pressable>

      <AppText variant="title" style={styles.title}>Game Factors</AppText>
      <AppText variant="muted" style={styles.copy}>
        Factoring stadium, weather, officials, and matchup context into a scoring volume grade.
      </AppText>

      {!isPremium ? (
        <Card>
          <AppText style={styles.cardTitle}>Unlock KingFish Tools</AppText>
          <AppText variant="muted" style={styles.cardCopy}>
            Cheat Sheets, player props, Edge Scores, game factors, and unlimited Ask KingFish access are part of KingFish Bets Pro.
          </AppText>
          <View style={styles.action}>
            <Button onPress={() => router.push('/modals/paywall')}>Get Access</Button>
          </View>
        </Card>
      ) : (
        <>
          <View style={styles.factorToggle}>
            {(['MLB', 'NFL'] as FactorSport[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setFactorSport(item)
                  if (item === 'NFL') setFactorView('board')
                }}
                style={[styles.factorToggleButton, factorSport === item && styles.factorToggleButtonActive]}
              >
                <AppText style={[styles.segmentText, factorSport === item && styles.segmentTextActive]}>{item}</AppText>
              </Pressable>
            ))}
          </View>

          {factorSport === 'MLB' ? (
            <View style={styles.factorViewToggle}>
              {([
                { key: 'board', label: 'Board' },
                { key: 'cheat', label: 'Cheat Sheet' },
              ] as Array<{ key: FactorView; label: string }>).map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setFactorView(item.key)}
                  style={[styles.factorViewButton, factorView === item.key && styles.factorViewButtonActive]}
                >
                  <AppText style={[styles.factorViewText, factorView === item.key && styles.factorViewTextActive]}>{item.label}</AppText>
                </Pressable>
              ))}
            </View>
          ) : null}

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

          {factorView === 'cheat' && factorSport === 'MLB' ? (
            <Card style={styles.factorCheatSheet}>
              <View style={styles.cheatSheetHeader}>
                <AppText variant="mono" style={[styles.cheatSheetHeadCell, styles.cheatSheetGameHead]}>Game</AppText>
                <AppText variant="mono" style={styles.cheatSheetHeadCell}>Total</AppText>
                <AppText variant="mono" style={styles.cheatSheetHeadCell}>HR</AppText>
                <AppText variant="mono" style={styles.cheatSheetHeadCell}>Read</AppText>
              </View>
              {factorCheatRows.map((row) => (
                <View key={row.id} style={styles.cheatSheetRow}>
                  <View style={styles.cheatSheetGameCell}>
                    <AppText style={styles.cheatSheetMatchup}>{row.matchup}</AppText>
                    <AppText variant="muted" style={styles.cheatSheetMeta}>{row.time}</AppText>
                    <AppText variant="muted" style={styles.cheatSheetMeta}>{row.venue}</AppText>
                    <AppText variant="muted" style={styles.cheatSheetWeather}>{row.weather}</AppText>
                  </View>
                  <AppText style={[styles.cheatSheetMetric, { color: factorImpactTone(row.gameTotalPct) }]}>
                    {row.gameTotalPct > 0 ? '+' : ''}{row.gameTotalPct}%
                  </AppText>
                  <AppText style={[styles.cheatSheetMetric, { color: factorImpactTone(row.hrPct) }]}>
                    {row.hrPct > 0 ? '+' : ''}{row.hrPct}%
                  </AppText>
                  <AppText style={[styles.cheatSheetRead, { color: row.tone }]}>{row.read}</AppText>
                </View>
              ))}
            </Card>
          ) : (
            <View style={styles.factorRows}>
              {factorRows.map((row) => (
                <Card key={row.id} style={styles.factorCard}>
                  <View style={styles.factorHeader}>
                    <View style={styles.factorTitleWrap}>
                      <AppText style={styles.factorMatchup}>{row.matchup}</AppText>
                      <AppText variant="mono" style={styles.compactMeta}>{row.time}</AppText>
                    </View>
                    <View style={styles.factorScore}>
                      <AppText style={styles.factorScoreLabel}>Score</AppText>
                      <AppText style={[styles.factorScoreValue, { color: row.tone }]}>{row.score}</AppText>
                      <AppText style={[styles.factorLean, { color: row.tone }]}>{row.lean}</AppText>
                    </View>
                  </View>
                  <View style={styles.factorMetaGrid}>
                    <FactorMeta
                      label="Venue"
                      value={row.venue}
                      sub={row.environment}
                      onPress={() => setStadiumProfile(stadiumProfileForRow(row, factorSport, ballparkProfileQuery.data, footballStadiumProfileQuery.data))}
                    />
                    <FactorMeta label="Weather" value={row.weather || 'Weather pending'} visual={<FactorWeatherVisual weather={row.weatherRaw} />} />
                    {row.official ? <FactorMeta label={factorSport === 'MLB' ? 'Umpire' : 'Referee'} value={row.official} /> : null}
                    <FactorMeta label="Market Read" value={row.tags.find((tag) => !isNeutralFactorText(tag)) || 'Watch board'} />
                  </View>
                  {row.tags.filter((tag) => !isNeutralFactorText(tag)).length ? (
                    <View style={styles.factorTags}>
                      {row.tags.filter((tag) => !isNeutralFactorText(tag)).map((tag) => (
                        <View key={tag} style={styles.factorTag}>
                          <AppText style={styles.factorTagText}>{tag}</AppText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              ))}
            </View>
          )}
        </>
      )}

      <Modal visible={Boolean(stadiumProfile)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStadiumProfile(null)}>
        <View style={styles.stadiumModal}>
          <Card style={styles.stadiumCard}>
            <AppText variant="eyebrow">// Stadium Profile</AppText>
            <AppText style={styles.stadiumTitle}>{stadiumProfile?.venue}</AppText>
            <AppText variant="muted" style={styles.stadiumTeam}>{stadiumProfile?.teamLabel || stadiumProfile?.homeTeam}</AppText>
            {stadiumProfile?.city ? <AppText variant="muted" style={styles.stadiumCity}>{stadiumProfile.city}</AppText> : null}
            {stadiumProfile?.sport === 'MLB' ? (
              <AppText variant="muted" style={styles.stadiumRecord}>Home record: {stadiumProfile?.homeRecord || 'Pending'}</AppText>
            ) : null}
            <View style={styles.stadiumGrid}>
              <FactorMetric label={stadiumProfile?.sport === 'NFL' ? 'Stadium Grade' : 'Park Grade'} value={String(stadiumProfile?.score || '-')} tone={colors.gold} large />
              <FactorMetric label="Surface" value={shortSurface(stadiumProfile?.surface)} />
              <FactorMetric label="Market" value={stadiumProfile?.market || '-'} />
              <FactorMetric label="Capacity" value={stadiumProfile?.capacity || '-'} />
              <FactorMetric label="Altitude" value={stadiumProfile?.altitudeFt ? `${stadiumProfile.altitudeFt} ft` : '-'} />
              <FactorMetric label={stadiumProfile?.sport === 'NFL' ? 'Roof Status' : 'Roof'} value={stadiumProfile?.roofStatus || stadiumProfile?.roof || '-'} />
              {stadiumProfile?.sport === 'NFL' ? (
                <>
                  <FactorMetric label="Wind Impact" value={stadiumProfile?.windImpact || '-'} />
                  <FactorMetric label="Weather Exposure" value={stadiumProfile?.weatherExposure || '-'} />
                </>
              ) : (
                <FactorMetric label="Wind Today" value={stadiumProfile?.wind || 'Pending'} wide visual={<WindArrow value={stadiumProfile?.wind || ''} />} />
              )}
            </View>
            {stadiumProfile?.weather ? <AppText variant="muted" style={styles.stadiumWeather}>{stadiumProfile.weather}</AppText> : null}
            <AppText style={styles.stadiumBlurb}>{stadiumProfile?.blurb}</AppText>
            <Button onPress={() => setStadiumProfile(null)}>Close</Button>
          </Card>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { paddingVertical: spacing.sm, marginBottom: spacing.xs },
  backText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  title: { marginTop: 6 },
  copy: { marginTop: 10, marginBottom: spacing.xl },
  cardTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  cardCopy: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.bgPrimary,
  },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  compactMeta: { marginTop: 3, color: colors.textSecondary, fontSize: 11 },
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
  factorViewToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  factorViewButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  factorViewButtonActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.14)',
  },
  factorViewText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  factorViewTextActive: {
    color: colors.textPrimary,
  },
  factorCheatSheet: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cheatSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  cheatSheetHeadCell: {
    width: 54,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'right',
  },
  cheatSheetGameHead: {
    flex: 1,
    width: undefined,
    textAlign: 'left',
  },
  cheatSheetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,35,56,.75)',
    paddingVertical: spacing.md,
  },
  cheatSheetGameCell: {
    flex: 1,
    minWidth: 0,
  },
  cheatSheetMatchup: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  cheatSheetMeta: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
  cheatSheetWeather: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 13,
  },
  cheatSheetMetric: {
    width: 54,
    textAlign: 'right',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
  },
  cheatSheetRead: {
    width: 54,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  factorRows: {
    gap: spacing.md,
  },
  factorCard: {
    gap: spacing.sm,
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
  factorMatchup: {
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  factorScore: {
    alignItems: 'flex-end',
    minWidth: 86,
  },
  factorScoreLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  factorScoreValue: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '900',
  },
  factorLean: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  factorMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  stadiumModal: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  stadiumCard: {
    gap: spacing.md,
  },
  stadiumTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stadiumTeam: {
    marginTop: -spacing.sm,
  },
  stadiumCity: {
    marginTop: -spacing.md,
  },
  stadiumRecord: {
    marginTop: -spacing.md,
    color: colors.gold,
  },
  stadiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stadiumWeather: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  stadiumBlurb: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
})
