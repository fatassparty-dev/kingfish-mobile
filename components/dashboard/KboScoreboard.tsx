/**
 * KBO scoreboard — the fallback board for when no US sportsbook has KBO
 * posted (The Odds API drops `baseball_kbo` entirely on those days, which
 * left the tab reading "no games" on days that had games).
 *
 * Data is the server's /api/kbo-scores, scraped from the official league
 * scoreboard. Results and the next slate only: odds are exactly what's
 * missing here, so nothing on this board renders a price.
 */
import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/Text'
import { colors, spacing } from '@/lib/theme'

export type KboScoreGame = {
  date: string
  away: string
  home: string
  awayScore: number | null
  homeScore: number | null
  status: 'final' | 'postponed' | 'scheduled'
  venue: string | null
  startLocal: string | null
}

// Dates arrive as Korea-local calendar days; running them through a timezone
// would slide them a day, so they're formatted as plain dates.
function fmtDay(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, date))
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

function shortName(team: string) {
  const nickname = String(team || '').split(' ').pop() || team
  return nickname.length > 9 ? nickname.slice(0, 3).toUpperCase() : nickname
}

export function KboScoreboard({ games }: { games: KboScoreGame[] }) {
  const days = useMemo(() => {
    const grouped = new Map<string, KboScoreGame[]>()
    for (const game of [...games].sort((a, b) => a.date.localeCompare(b.date))) {
      const bucket = grouped.get(game.date)
      if (bucket) bucket.push(game)
      else grouped.set(game.date, [game])
    }
    return [...grouped.entries()]
  }, [games])

  return (
    <View>
      <AppText variant="eyebrow" style={styles.eyebrow}>// No Posted Lines</AppText>
      <AppText variant="muted" style={styles.intro}>
        No US sportsbook has KBO on the board right now. Latest results and the next slate, from the
        official league scoreboard.
      </AppText>

      {days.map(([date, dayGames]) => (
        <View key={date} style={styles.dayBlock}>
          <AppText variant="mono" style={styles.dayLabel}>{fmtDay(date)}</AppText>
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <AppText variant="eyebrow" style={[styles.headerText, styles.matchupCell]}>Matchup</AppText>
              <AppText variant="eyebrow" style={[styles.headerText, styles.scoreCell]}>Score</AppText>
              <AppText variant="eyebrow" style={[styles.headerText, styles.timeCell]}>KST</AppText>
              <AppText variant="eyebrow" style={[styles.headerText, styles.venueCell]}>Venue</AppText>
            </View>
            {dayGames.map((game, index) => (
              <View key={`${date}-${index}`} style={styles.row}>
                <AppText style={[styles.matchup, styles.matchupCell]} numberOfLines={2}>
                  {shortName(game.away)} at {shortName(game.home)}
                </AppText>
                <AppText variant="mono" style={[styles.score, styles.scoreCell, game.status === 'postponed' && styles.postponed]}>
                  {game.status === 'final'
                    ? `${game.awayScore}-${game.homeScore}`
                    : game.status === 'postponed' ? 'PPD' : '—'}
                </AppText>
                <AppText variant="mono" style={[styles.sub, styles.timeCell]}>
                  {game.status === 'scheduled' ? (game.startLocal || '—') : '—'}
                </AppText>
                <AppText style={[styles.sub, styles.venueCell]} numberOfLines={1}>{game.venue || '—'}</AppText>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.gold },
  intro: { marginTop: 6, marginBottom: spacing.md, lineHeight: 20 },
  dayBlock: { marginBottom: spacing.lg },
  dayLabel: {
    fontSize: 10,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  table: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgCardAlt,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: { fontSize: 9, letterSpacing: 0.4 },
  matchupCell: { flex: 2.2, paddingHorizontal: 3 },
  scoreCell: { flex: 0.9, paddingHorizontal: 3, textAlign: 'center' },
  timeCell: { flex: 0.8, paddingHorizontal: 3, textAlign: 'center' },
  venueCell: { flex: 1.2, paddingHorizontal: 3, textAlign: 'right' },
  matchup: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  score: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  postponed: { color: colors.gold },
  sub: { fontSize: 11, color: colors.textSecondary },
})
