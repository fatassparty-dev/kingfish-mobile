import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { Button } from '@/components/Button'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { colors, spacing } from '@/lib/theme'

// +EV Finder (Premium Pro Tool). Every number — best price, fair price, EV % —
// is computed server-side in kingfish-bets (lib/evFinder.ts, /api/ev-finder)
// from the member's own Book Preferences, and rendered here as-is.
type EvSport = 'NFL' | 'NBA' | 'NHL'
type EvFinderResponse = {
  rows: {
    sport: EvSport; gameId: string; matchup: string; commenceTime: string
    player: string; market: string; marketLabel: string; side: 'Over' | 'Under'; line: number
    book: string; bookName: string; odds: number; fairOdds: number; evPct: number; booksCompared: number
  }[]
  sports: { sport: EvSport; updatedAt: string | null; stale: boolean; count: number }[]
  minEvPct: number
  minBooks: number
}

function time(value: string) {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
}
const american = (odds: number) => (odds > 0 ? `+${odds}` : String(odds))

export default function EvFinderScreen() {
  const { session } = useAuth()
  const [sport, setSport] = useState<EvSport | 'All'>('All')
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['ev-finder', session?.user.id],
    queryFn: () => kingfishFetch<EvFinderResponse>('/api/ev-finder', { cache: 'no-store' }),
    enabled: Boolean(session), staleTime: 0, retry: false,
  })
  const premiumRequired = error?.message === 'Premium required'
  const sports = data?.sports || []
  const rows = useMemo(() => (data?.rows || []).filter((row) => sport === 'All' || row.sport === sport), [data, sport])

  return <Screen>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><AppText style={styles.secondary}>← Tools</AppText></Pressable>
    <AppText variant="eyebrow" style={styles.gold}>All Sports · Player Props</AppText>
    <AppText variant="title" style={styles.title}>+EV Finder</AppText>
    <AppText style={styles.intro}>Player props where one of your sportsbooks pays more than the fair price the other books agree on.</AppText>
    {!session ? <View style={styles.message}><AppText>Sign in to view the +EV Finder.</AppText><Button onPress={() => router.push('/(auth)/sign-in')}>Sign in</Button></View>
      : isLoading ? <ActivityIndicator color={colors.gold} accessibilityLabel="Loading +EV prices" />
      : error ? <View style={styles.message}>
        <AppText>{premiumRequired ? 'The +EV Finder is part of KingFish Premium.' : error.message || '+EV prices are temporarily unavailable.'}</AppText>
        <Button onPress={() => premiumRequired ? router.push('/modals/paywall') : void refetch()}>{premiumRequired ? 'View Premium' : 'Try again'}</Button>
      </View> : data && <>
        {sports.length > 1 && <View style={styles.chips} accessibilityRole="tablist">
          {(['All', ...sports.map((item) => item.sport)] as const).map((item) => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: sport === item }} onPress={() => setSport(item)} style={[styles.chip, sport === item && styles.chipActive]}>
            <AppText style={[styles.chipText, sport === item && styles.chipTextActive]}>{item}</AppText>
          </Pressable>)}
        </View>}
        {sports.some((item) => item.updatedAt) && <View style={styles.times}>
          {sports.filter((item) => item.updatedAt).map((item) => <AppText key={item.sport} style={styles.small}>{item.sport} prices: {time(item.updatedAt as string)}</AppText>)}
        </View>}
        {sports.some((item) => item.stale) && <AppText style={styles.notice}>Some prices are more than 6 hours old. Check the price at your sportsbook before you bet.</AppText>}
        {sports.length === 0 && <AppText style={styles.messageText}>No sports with player props are in season right now.</AppText>}
        {sports.length > 0 && rows.length === 0 && <AppText style={styles.messageText}>No props are {data.minEvPct}% or more above the fair price right now. Prices move through the day, so check back closer to game time.</AppText>}
        {rows.map((row) => <View key={`${row.gameId}-${row.market}-${row.player}-${row.side}-${row.line}`} style={styles.row}>
          <AppText style={styles.player}>{row.player} · {row.side} {row.line} {row.marketLabel}</AppText>
          <AppText style={styles.small}>{row.sport} · {row.matchup}</AppText>
          <AppText style={styles.small}>{time(row.commenceTime)}</AppText>
          <View style={styles.numbers}>
            <View style={styles.numberCol}><AppText style={styles.label}>Best price</AppText><AppText style={styles.price}>{american(row.odds)}</AppText><AppText style={styles.small}>{row.bookName}</AppText></View>
            <View style={styles.numberCol}><AppText style={styles.label}>Fair price</AppText><AppText style={styles.fair}>{american(row.fairOdds)}</AppText></View>
            <View style={styles.numberCol}><AppText style={styles.label}>EV</AppText><AppText style={styles.ev}>+{row.evPct.toFixed(1)}%</AppText></View>
          </View>
        </View>)}
        <AppText style={styles.footnote}>The fair price is the middle price of the other sportsbooks on the same line with their margin removed. A prop needs at least {data.minBooks} sportsbooks posting both sides to appear, and only books in your Book Preferences are shown as the best price. EV is a price comparison, not a prediction: a +EV bet can lose, and prices change quickly.</AppText>
        <Button onPress={() => void refetch()}>{isRefetching ? 'Refreshing…' : 'Refresh'}</Button>
      </>}
  </Screen>
}

const styles = StyleSheet.create({
  back: { paddingVertical: spacing.md, alignSelf: 'flex-start' },
  secondary: { color: colors.textSecondary }, gold: { color: colors.gold },
  title: { marginTop: spacing.sm, marginBottom: spacing.md },
  intro: { color: colors.textSecondary, marginBottom: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.lg },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.bgPrimary },
  times: { gap: 6, marginBottom: spacing.lg },
  small: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  label: { fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  notice: { color: colors.gold, borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: 12, marginBottom: spacing.lg, fontSize: 13 },
  message: { gap: spacing.lg, paddingVertical: spacing.xl },
  messageText: { color: colors.textSecondary, paddingVertical: spacing.xl },
  row: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.lg, gap: 4 },
  player: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  numbers: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.lg },
  numberCol: { flex: 1, gap: 2 },
  price: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  fair: { color: colors.textSecondary, fontSize: 18, fontWeight: '700' },
  ev: { color: colors.green, fontSize: 18, fontWeight: '800' },
  footnote: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginVertical: spacing.xl },
})
