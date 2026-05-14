import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { fmtOdds } from '@/lib/format'
import { kingfishFetch } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

interface PlayerProfileResponse {
  team: string | null
  position: string | null
  matchup?: string | null
  searchHint?: string | null
  injury_status: string | null
  stats: Record<string, any> | null
  statDisplay: Array<{ label: string; value: string }>
  props: Array<{
    marketKey: string
    market: string
    line: number
    odds: number
    book: string
  }>
}

type RawGame = Record<string, any>

interface PlayerProfileModalProps {
  playerName: string | null
  sport: 'mlb' | 'nba' | 'nfl' | 'nhl' | 'wnba'
  onClose: () => void
}

function buildFormNote(sport: PlayerProfileModalProps['sport'], data?: PlayerProfileResponse) {
  const stats = data?.stats
  if (!stats) return null

  const primary =
    sport === 'mlb' && stats.season_strikeouts_per_game
      ? { season: stats.season_strikeouts_per_game, l5: stats.l5_strikeouts_per_game, label: 'strikeouts' }
      : sport === 'mlb'
        ? { season: stats.season_hits_per_game, l5: stats.l5_hits_per_game, label: 'hits' }
        : sport === 'nba' || sport === 'wnba'
          ? { season: stats.season_pts, l5: stats.l5_pts, label: 'points' }
          : sport === 'nfl'
            ? { season: stats.fantasy_points_ppr_per_game, l5: stats.fantasy_points_ppr_per_game, label: 'fantasy points' }
          : sport === 'nhl'
            ? { season: stats.season_pts, l5: stats.l5_pts, label: 'points' }
            : null

  if (!primary?.season || typeof primary.l5 !== 'number') return null
  const diff = ((primary.l5 - primary.season) / primary.season) * 100
  if (Math.abs(diff) < 8) return `Steady ${primary.label} - L5 in line with season average.`
  if (diff >= 8) return `Trending up - L5 ${primary.label} ${diff.toFixed(0)}% above season average.`
  return `Cooling off - L5 ${primary.label} ${Math.abs(diff).toFixed(0)}% below season average.`
}

function formatGameDate(game: RawGame) {
  const raw = game.date || game.game_date || game.gameDate || game.officialDate
  if (!raw) return ''
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) return String(raw)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatOpponent(game: RawGame) {
  const opponent = String(game.opponent || game.opponentAbbrev || game.opponentName || '').toUpperCase()
  if (!opponent) return ''
  if (typeof game.is_home === 'boolean') return `${game.is_home ? 'vs' : '@'} ${opponent}`
  return opponent
}

function recentGameStats(sport: PlayerProfileModalProps['sport'], game: RawGame) {
  if (sport === 'mlb') {
    if (typeof game.strikeouts === 'number' || typeof game.outs === 'number') {
      return [
        { label: 'K', value: game.strikeouts },
        { label: 'HA', value: game.hits_allowed },
        { label: 'ER', value: game.earned_runs },
        { label: 'Outs', value: game.outs },
      ]
    }
    return [
      { label: 'H', value: game.hits },
      { label: 'TB', value: game.tb },
      { label: 'R', value: game.runs },
      { label: 'RBI', value: game.rbi },
      { label: 'HR', value: game.hr },
    ]
  }

  if (sport === 'nhl') {
    return [
      { label: 'G', value: game.goals },
      { label: 'A', value: game.assists },
      { label: 'PTS', value: game.points },
      { label: 'SOG', value: game.shots },
    ]
  }

  return [
    { label: 'PTS', value: game.pts ?? game.points },
    { label: 'REB', value: game.reb ?? game.rebounds },
    { label: 'AST', value: game.ast ?? game.assists },
    { label: 'MIN', value: game.min ?? game.minutes },
  ]
}

function recentGames(data?: PlayerProfileResponse) {
  return Array.isArray(data?.stats?.raw_games) ? data?.stats?.raw_games.slice(0, 10) : []
}

export function PlayerProfileModal({ playerName, sport, onClose }: PlayerProfileModalProps) {
  const query = useQuery({
    queryKey: ['player-profile', sport, playerName],
    queryFn: () => kingfishFetch<PlayerProfileResponse>(`/api/player-profile?sport=${sport}&name=${encodeURIComponent(playerName || '')}`),
    enabled: !!playerName,
    staleTime: 5 * 60 * 1000,
  })
  const formNote = buildFormNote(sport, query.data)

  return (
    <Modal visible={!!playerName} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="eyebrow">// Player Profile</AppText>
              <AppText variant="title" style={styles.name}>{playerName}</AppText>
              <View style={styles.metaRow}>
                {query.data?.team ? <Badge label={query.data.team} /> : null}
                {query.data?.position ? <Badge label={query.data.position} muted /> : null}
                {query.data?.matchup ? <Badge label={query.data.matchup} muted /> : null}
                {query.data?.injury_status ? <Badge label={query.data.injury_status} danger /> : null}
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <AppText style={styles.closeText}>x</AppText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {query.isLoading && <AppText variant="muted">Loading player profile...</AppText>}

            {query.isError && (
              <Card>
                <AppText variant="eyebrow">// Error</AppText>
                <AppText variant="muted" style={styles.error}>
                  {query.error instanceof Error ? query.error.message : 'Failed to load player profile.'}
                </AppText>
              </Card>
            )}

            {formNote && (
              <Card>
                <AppText variant="eyebrow">// Recent Form</AppText>
                <AppText style={styles.formNote}>{formNote}</AppText>
              </Card>
            )}

            {query.data?.statDisplay?.length ? (
              <View>
                <AppText variant="eyebrow" style={styles.sectionLabel}>// Averages</AppText>
                <View style={styles.statGrid}>
                  {query.data.statDisplay.map((stat) => (
                    <View key={stat.label} style={styles.statCard}>
                      <AppText variant="eyebrow" style={styles.statLabel}>{stat.label}</AppText>
                      <AppText style={styles.statValue}>{stat.value}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {recentGames(query.data).length ? (
              <View>
                <AppText variant="eyebrow" style={styles.sectionLabel}>// Last 10 Games</AppText>
                <View style={styles.recentList}>
                  {recentGames(query.data).map((game, index) => (
                    <View key={`${formatGameDate(game)}-${formatOpponent(game)}-${index}`} style={styles.recentRow}>
                      <View style={styles.recentGameMeta}>
                        <AppText style={styles.recentDate}>{formatGameDate(game) || `Game ${index + 1}`}</AppText>
                        <AppText variant="mono" style={styles.recentOpponent}>{formatOpponent(game)}</AppText>
                      </View>
                      <View style={styles.recentStats}>
                        {recentGameStats(sport, game)
                          .filter((stat) => stat.value !== undefined && stat.value !== null && stat.value !== '')
                          .slice(0, 5)
                          .map((stat) => (
                            <View key={stat.label} style={styles.recentStat}>
                              <AppText variant="mono" style={styles.recentStatLabel}>{stat.label}</AppText>
                              <AppText style={styles.recentStatValue}>{String(stat.value)}</AppText>
                            </View>
                          ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View>
              <AppText variant="eyebrow" style={styles.sectionLabel}>// Today's Props</AppText>
              {query.data?.props?.length ? (
                <View style={styles.propsList}>
                  {query.data.props.map((prop) => (
                    <View key={`${prop.marketKey}-${prop.book}-${prop.line}`} style={styles.propRow}>
                      <View style={styles.propInfo}>
                        <AppText style={styles.propMarket}>{prop.market}</AppText>
                        <AppText variant="mono">Line {prop.line} · {prop.book}</AppText>
                      </View>
                      <View style={styles.oddsBadge}>
                        <AppText style={styles.oddsText}>{fmtOdds(prop.odds)}</AppText>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Card>
                  <AppText variant="muted">No props available for this player today.</AppText>
                </Card>
              )}
            </View>

            <Button variant="secondary" onPress={onClose}>Close</Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

function Badge({ label, muted, danger }: { label: string; muted?: boolean; danger?: boolean }) {
  return (
    <View style={[styles.badge, muted && styles.badgeMuted, danger && styles.badgeDanger]}>
      <AppText style={[styles.badgeText, muted && styles.badgeTextMuted, danger && styles.badgeTextDanger]}>{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8,9,14,.82)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '84%',
    backgroundColor: colors.bgCardAlt,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 30,
    lineHeight: 32,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 22,
    fontWeight: '900',
  },
  body: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  error: {
    color: colors.red,
    marginTop: spacing.sm,
  },
  formNote: {
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  sectionLabel: {
    marginBottom: spacing.md,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '31%',
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 9,
  },
  statValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  propsList: {
    gap: spacing.sm,
  },
  recentList: {
    gap: spacing.sm,
  },
  recentRow: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
  },
  recentGameMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recentDate: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  recentOpponent: {
    color: colors.textSecondary,
  },
  recentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentStat: {
    minWidth: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recentStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  recentStatValue: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
  },
  propInfo: {
    flex: 1,
    minWidth: 0,
  },
  propMarket: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  oddsBadge: {
    minWidth: 72,
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
    fontWeight: '900',
  },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.25)',
    backgroundColor: 'rgba(198,145,50,.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeMuted: {
    borderColor: 'rgba(122,128,153,.25)',
    backgroundColor: 'rgba(122,128,153,.1)',
  },
  badgeDanger: {
    borderColor: 'rgba(239,68,68,.25)',
    backgroundColor: 'rgba(239,68,68,.1)',
  },
  badgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeTextMuted: {
    color: colors.textSecondary,
  },
  badgeTextDanger: {
    color: colors.red,
  },
})
