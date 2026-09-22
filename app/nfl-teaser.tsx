import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { Button } from '@/components/Button'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useMobileConfig } from '@/lib/mobileConfig'
import { colors, spacing } from '@/lib/theme'
import { teaserTicketMath, toggleTeaserLeg, type NflTeaserResponse, type TeaserPoints } from '@/lib/nflTeaser'

const line = (value: number) => value > 0 ? `+${value}` : String(value)
const time = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function NflTeaserScreen() {
  const { session, profile, loading } = useAuth()
  const config = useMobileConfig()
  const [points, setPoints] = useState<TeaserPoints>(6)
  const [bookKey, setBookKey] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [odds, setOdds] = useState('')
  const [stake, setStake] = useState('')
  const scroll = useRef<ScrollView>(null)
  const ticketY = useRef(0)
  const showTicket = () => { Keyboard.dismiss(); scroll.current?.scrollTo({ y: ticketY.current, animated: true }) }
  // The endpoint is authoritative, including promo access and refreshed entitlements.
  const query = useQuery({
    queryKey: ['nfl-teaser', session?.user.id, points, profile?.is_premium, config.flags.pro_tools_free, profile?.sportsbook_preferences],
    queryFn: () => kingfishFetch<NflTeaserResponse>(`/api/nfl-teaser?points=${points}`, { cache: 'no-store' }),
    enabled: !!session && !loading, staleTime: 0, gcTime: 0, retry: false,
  })
  useEffect(() => { setIds([]); setOdds('') }, [points, bookKey, query.dataUpdatedAt, session?.user.id])
  const data = query.data
  const boards = data?.allBooks?.length ? data.allBooks : data?.books ?? []
  const book = boards.find(item => item.key === bookKey) ?? boards[0]
  const legs = book?.legs ?? []
  const selected = legs.filter(leg => ids.includes(leg.id))
  const payout = teaserTicketMath(odds, stake)
  const premium = query.error?.message === 'Premium required'
  const login = !session || /unauthorized|authentication|not authenticated|sign in/i.test(query.error?.message ?? '')
  const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/cheat-sheets')
  return <Screen scrollRef={scroll}>
    <Pressable accessibilityRole="button" onPress={back} style={styles.control}><AppText style={styles.muted}>← Tools</AppText></Pressable>
    <AppText variant="eyebrow" style={styles.gold}>NFL · Game spreads</AppText>
    <AppText variant="title">Teaser Builder</AppText>
    <AppText style={styles.intro}>Find key-margin crossings. Build a two-to-four-leg ticket.</AppText>
    <AppText style={styles.label}>Teaser points</AppText>
    <View style={styles.choices}>{([6, 6.5, 7] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: points === value }} onPress={() => { Keyboard.dismiss(); setIds([]); setPoints(value) }} style={[styles.choice, points === value && styles.active]}><AppText>{value}</AppText></Pressable>)}</View>
    {loading ? <ActivityIndicator color={colors.gold} accessibilityLabel="Restoring sign in" />
      : login ? <View style={styles.section}><AppText>Sign in to use the NFL Teaser Builder.</AppText><Button onPress={() => router.push('/(auth)/sign-in')}>Sign in</Button></View>
      : query.isFetching ? <ActivityIndicator color={colors.gold} accessibilityLabel="Finding teaser legs" />
      : query.error ? <View style={styles.section}><AppText accessibilityRole="alert">{premium ? 'NFL Teaser Builder is part of KingFish Premium.' : query.error.message}</AppText><Button onPress={() => premium ? router.push('/modals/paywall') : void query.refetch()}>{premium ? 'View Premium' : 'Try again'}</Button></View>
      : data && <>
        <View style={styles.section}>
          {data.updatedAt && <AppText style={styles.small}>Saved lines · {time(data.updatedAt)}</AppText>}
          {data.stale && <AppText style={styles.gold}>These saved lines are older than usual. Confirm current spreads at your sportsbook.</AppText>}
          <Button variant="secondary" onPress={() => { setIds([]); void query.refetch() }}>Refresh lines</Button>
        </View>
        {data.status === 'no_games' && <AppText style={styles.intro}>No upcoming NFL games are available in the saved lines.</AppText>}
        {data.status === 'no_qualifiers' && !data.allBooks?.length && <AppText style={styles.intro}>No spreads from your selected sportsbooks qualify for a {points}-point adjustment.</AppText>}
        {(data.status === 'ready' || !!data.allBooks?.length) && book && <>
          <AppText style={styles.label}>Sportsbook</AppText>
          <View style={styles.choices}>{boards.map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityState={{ selected: book.key === option.key }} onPress={() => { setIds([]); setBookKey(option.key) }} style={[styles.choice, book.key === option.key && styles.active]}><AppText>{option.name}</AppText></Pressable>)}</View>
          <View onLayout={event => { ticketY.current = event.nativeEvent.layout.y }} style={styles.section}>
            <AppText style={styles.heading}>Your teaser · {selected.length} of 4 legs</AppText>
            <AppText style={styles.small}>{book.name} · {points} points</AppText>
            {selected.length < 2 && <AppText style={styles.muted}>{selected.length ? 'Add one more leg.' : 'Add legs from the list below.'}</AppText>}
            {selected.map(leg => <Pressable key={leg.id} accessibilityRole="button" accessibilityLabel={`Remove ${leg.team}`} onPress={() => setIds(current => current.filter(id => id !== leg.id))} style={styles.ticketLeg}><AppText style={styles.flex}>{leg.team} {line(leg.teasedLine)}</AppText><AppText style={styles.gold}>×</AppText></Pressable>)}
            {selected.length >= 2 && <>
              <AppText style={styles.label}>Sportsbook ticket odds (American)</AppText>
              <TextInput accessibilityLabel="Sportsbook ticket odds" value={odds} onChangeText={setOdds} placeholder="e.g. -120" placeholderTextColor={colors.textSecondary} keyboardType="numbers-and-punctuation" autoCorrect={false} maxLength={12} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
              <AppText style={styles.label}>Stake ($)</AppText>
              <TextInput accessibilityLabel="Stake in dollars" value={stake} onChangeText={setStake} placeholder="e.g. 100" placeholderTextColor={colors.textSecondary} keyboardType="decimal-pad" maxLength={12} style={styles.input} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
              <Button variant="secondary" onPress={Keyboard.dismiss}>Done</Button>
              {payout ? <View accessibilityLiveRegion="polite" style={styles.section}><AppText>Potential profit · ${payout.profit.toFixed(2)}</AppText><AppText>Total return · ${payout.total.toFixed(2)}</AppText><AppText style={styles.small}>Break-even rate · {payout.breakEven.toFixed(1)}%</AppText></View> : <AppText style={styles.small}>Enter ticket odds of −100 or lower, or +100 or higher, and a positive stake.</AppText>}
            </>}
          </View>
          <AppText style={styles.heading}>All teams</AppText>
          <AppText style={styles.small}>Every spread at {book.name}, teased {points} points. Pick two to four teams from different games. Your ticket is above.</AppText>
          {legs.map(leg => {
            const added = ids.includes(leg.id)
            const disabled = !added && (ids.length >= 4 || selected.some(other => other.gameId === leg.gameId))
            return <View key={leg.id} style={styles.legRow}>
              <View style={styles.flex}>
                <AppText style={styles.heading}>{leg.team}</AppText>
                <AppText style={styles.small}>vs. {leg.opponent} · {time(leg.kickoff)}</AppText>
                <AppText style={styles.line}>{line(leg.originalLine)} → {line(leg.teasedLine)}</AppText>
                <AppText style={styles.small}>{leg.explanation}</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${added ? 'Remove' : 'Add'} ${leg.team}`} accessibilityState={{ selected: added, disabled }} disabled={disabled} onPress={() => { setIds(current => toggleTeaserLeg(current, leg, legs)); setOdds('') }} style={[styles.choice, added && styles.active, disabled && styles.disabled]}><AppText>{added ? 'Remove' : disabled ? 'Limit' : 'Add'}</AppText></Pressable>
            </View>
          })}
          {selected.length > 0 && <Button variant="secondary" onPress={showTicket}>View your teaser ({selected.length} legs)</Button>}
        </>}
      </>}
    <AppText style={styles.footnote}>Line structure, not win probability. Pricing and push rules vary by sportsbook. Confirm final lines and ticket odds. KingFish does not accept wagers.</AppText>
  </Screen>
}

const styles = StyleSheet.create({
  control: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 12 },
  gold: { color: colors.gold }, muted: { color: colors.textSecondary },
  intro: { color: colors.textSecondary, marginVertical: spacing.lg },
  label: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  choice: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  active: { borderColor: colors.gold, backgroundColor: colors.bgCard },
  disabled: { opacity: 0.45 },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 20, gap: 12 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 14 },
  heading: { fontSize: 18, fontWeight: '600' }, small: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  ticketLeg: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, flex: { flex: 1 },
  input: { color: colors.textPrimary, fontSize: 18, minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.borderActive, backgroundColor: colors.bgCard },
  line: { fontSize: 24, color: colors.gold, fontVariant: ['tabular-nums'] },
  footnote: { fontSize: 12, lineHeight: 19, color: colors.textSecondary, marginVertical: 24 },
})
