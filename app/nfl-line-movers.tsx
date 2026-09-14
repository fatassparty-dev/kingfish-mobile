import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { Button } from '@/components/Button'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, spacing } from '@/lib/theme'

type LineMoversResponse = {
  status: 'collecting' | 'no_games' | 'no_comparison' | 'ready'
  earlierAt: string | null
  latestAt: string | null
  stale: boolean
  comparedMarkets: number
  movers: {
    gameId: string; homeTeam: string; awayTeam: string; kickoff: string
    market: 'spreads' | 'totals'; book: string; bookName: string
    earlier: number; latest: number; change: number; direction: string
  }[]
}
function time(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}
function line(value: number, spread: boolean) { return spread && value > 0 ? `+${value}` : String(value) }

export default function NflLineMoversScreen() {
  const { session } = useAuth()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['nfl-line-movers', session?.user.id],
    queryFn: () => kingfishFetch<LineMoversResponse>('/api/nfl-line-movers', { cache: 'no-store' }),
    enabled: Boolean(session), staleTime: 0, retry: false,
  })
  const premiumRequired = error?.message === 'Premium required'
  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><AppText style={styles.secondary}>← Tools</AppText></Pressable>
    <AppText variant="eyebrow" style={styles.gold}>NFL · 24-hour comparison</AppText>
    <AppText variant="title" style={styles.title}>Top 5 Line Movers</AppText>
    <AppText style={styles.intro}>The biggest spread and total changes across your sportsbooks.</AppText>
    {!session ? <View style={styles.message}><AppText>Sign in to view NFL line movements.</AppText><Button onPress={() => router.push('/(auth)/sign-in')}>Sign in</Button></View>
      : isLoading ? <ActivityIndicator color={colors.gold} accessibilityLabel="Loading line movements" />
      : error ? <View style={styles.message}>
        <AppText>{premiumRequired ? 'NFL Line Movers is part of KingFish Premium.' : error.message}</AppText>
        <Button onPress={() => premiumRequired ? router.push('/modals/paywall') : void refetch()}>{premiumRequired ? 'View Premium' : 'Try again'}</Button>
      </View> : data && <>
        <View style={styles.times}>
          {data.earlierAt && <AppText style={styles.small}>Earlier: {time(data.earlierAt)}</AppText>}
          {data.latestAt && <AppText style={styles.small}>Latest snapshot: {time(data.latestAt)}</AppText>}
        </View>
        {data.stale && <AppText style={styles.notice}>The latest snapshot is over 8 hours old. These are recorded lines, not current quotes.</AppText>}
        {data.status === 'collecting' && <AppText style={styles.messageText}>Building the 24-hour comparison. Results appear once two suitable snapshots are available, usually after about a day of regular updates.</AppText>}
        {data.status === 'no_games' && <AppText style={styles.messageText}>No upcoming NFL games in the latest snapshot.</AppText>}
        {data.status === 'no_comparison' && <AppText style={styles.messageText}>No matching lines across your selected sportsbooks in these snapshots.</AppText>}
        {data.status === 'ready' && !data.movers.length && <AppText style={styles.messageText}>No point changes across the {data.comparedMarkets} comparable markets.</AppText>}
        {data.movers.map((row, index) => <View key={`${row.gameId}-${row.market}`} style={styles.row}>
          <AppText style={styles.rank}>{String(index + 1).padStart(2, '0')}</AppText>
          <AppText style={styles.game}>{row.awayTeam} at {row.homeTeam}</AppText>
          <AppText style={styles.small}>{row.market === 'spreads' ? `${row.homeTeam} spread` : 'Game total'} · {row.bookName}</AppText>
          <AppText style={styles.small}>{time(row.kickoff)}</AppText>
          <View style={styles.numbers}>
            <View><AppText style={styles.small}>Earlier → Latest</AppText><AppText style={styles.price}>{line(row.earlier, row.market === 'spreads')} → {line(row.latest, row.market === 'spreads')}</AppText></View>
            <View style={styles.move}><AppText style={styles.change}>{Math.abs(row.change)} {Math.abs(row.change) === 1 ? 'point' : 'points'}</AppText><AppText style={styles.direction}>{row.direction}</AppText></View>
          </View>
        </View>)}
        <AppText style={styles.footnote}>Net point changes between recorded snapshots, approximately 24 hours apart. Each game and market appears once, using its largest same-book change. Only matching, recently updated quotes are compared. Movement is not a betting recommendation.</AppText>
      </>}
  </Screen>
}
const styles = StyleSheet.create({
  back: { paddingVertical: spacing.md, alignSelf: 'flex-start' },
  secondary: { color: colors.textSecondary }, gold: { color: colors.gold },
  title: { marginTop: spacing.sm, marginBottom: spacing.md },
  intro: { color: colors.textSecondary, marginBottom: spacing.xl },
  times: { gap: 6, marginBottom: spacing.lg },
  small: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  notice: { color: colors.gold, borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: 12, marginBottom: spacing.lg, fontSize: 13 },
  message: { gap: spacing.lg, paddingVertical: spacing.xl },
  messageText: { color: colors.textSecondary, paddingVertical: spacing.xl },
  row: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.lg, gap: 5 },
  rank: { color: colors.gold, fontSize: 12 },
  game: { fontSize: 17, fontWeight: '600', marginBottom: 3 },
  numbers: { flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'space-between', marginTop: spacing.md },
  price: { fontSize: 24, fontVariant: ['tabular-nums'] },
  move: { flex: 1, alignItems: 'flex-end' },
  change: { color: colors.gold, fontSize: 20, fontWeight: '600' },
  direction: { color: colors.textSecondary, fontSize: 12, textAlign: 'right' },
  footnote: { fontSize: 12, lineHeight: 19, color: colors.textSecondary, marginTop: spacing.lg },
})
