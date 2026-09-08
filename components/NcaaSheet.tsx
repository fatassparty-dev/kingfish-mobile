import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { colors } from '@/lib/theme'

export const NCAA_SHEETS = [
  { key: 'ncaaf_hot', label: 'NCAA Football — Hot Teams', desc: 'Longest active winning streaks, with each team’s last five results.', type: 'ncaaf' },
  { key: 'ncaaf_covers', label: 'NCAA Football — Cover Kings', desc: 'Best cover rates over the last 10 games. Minimum five graded spreads.', type: 'ncaaf' },
  { key: 'ncaaf_dogs', label: 'NCAA Football — Dogs of the Week', desc: 'Upcoming underdogs ranked by their recent underdog cover record.', type: 'ncaaf' },
  { key: 'ncaaf_weather', label: 'NCAA Football — Weather Watch', desc: 'Upcoming outdoor games with wind, gusts, or rain risk at kickoff.', type: 'ncaaf' },
] as const
export type NcaaSheetKey = typeof NCAA_SHEETS[number]['key']
function boardClock(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const part = (type: string) => parts.find(item => item.type === type)?.value || '0'
  return { date: part('year') + '-' + part('month') + '-' + part('day'), locked: Number(part('hour')) * 60 + Number(part('minute')) >= 545 }
}
type Row = { id: string; team: string; detail: string; metrics: string[]; values: (number | null)[]; kickoff?: string }
type Payload = {
  updated_at: string; odds_updated_at: string | null; week_label: string; locked: boolean; notices: string[]
  sheets: Record<NcaaSheetKey, { title: string; columns: string[]; rows: Row[]; note: string; emptyMessage: string }>
}

export function NcaaSheet({ sheetKey }: { sheetKey: NcaaSheetKey }) {
  const [sort, setSort] = useState<{ index: number; ascending: boolean } | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const clock = boardClock(new Date(now))
  const query = useQuery({
    queryKey: ['ncaaf-cheat-sheets', clock.date, clock.locked],
    queryFn: () => kingfishFetch<Payload>('/api/ncaaf-cheat-sheets'),
    staleTime: 30 * 60000,
    refetchInterval: query => query.state.data?.locked ? false : 30 * 60000,
  })
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 30000)
    return () => clearInterval(timer)
  }, [])
  const data = query.data
  const sheet = data?.sheets[sheetKey]
  const rows = (sheet?.rows || []).filter(row => !row.kickoff || Date.parse(row.kickoff) > now)
  if (sort) rows.sort((a, b) => {
    const av = a.values[sort.index], bv = b.values[sort.index]
    if (av === null) return 1
    if (bv === null) return -1
    return (av - bv) * (sort.ascending ? 1 : -1) || a.team.localeCompare(b.team)
  })
  const title = NCAA_SHEETS.find(item => item.key === sheetKey)!.label
  const saved = data ? new Date(data.updated_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' CT' : ''
  async function share() {
    if (!sheet || !data) return
    await Share.share({ message: [title, data.week_label, 'Saved ' + saved, sheet.columns.join(' · '),
      ...rows.map((row, index) => (index + 1) + '. ' + row.team + ' — ' + row.metrics.join(' · ') + '\n' + row.detail),
      sheet.note, ...data.notices, 'KingFish Bets · kingfishbets.com'].join('\n') })
  }
  return <Card>
    <View style={styles.titleRow}>
      <AppText style={styles.title}>{title}</AppText>
      {sheet && rows.length > 0 && <Pressable accessibilityRole="button" onPress={() => { void share() }}><AppText style={styles.action}>Share</AppText></Pressable>}
    </View>
    {data && <AppText variant="muted" style={styles.meta}>{data.week_label}{'\n'}{data.locked ? 'Daily board locked' : 'Updates until 9:05 AM CT'} · Saved {saved}</AppText>}
    {sheetKey === 'ncaaf_dogs' && data?.odds_updated_at && <AppText variant="muted" style={styles.detail}>Odds as of {new Date(data.odds_updated_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} CT</AppText>}
    {query.isLoading && <ActivityIndicator color={colors.gold} />}
    {query.isError && <Pressable accessibilityRole="button" onPress={() => { void query.refetch() }}><AppText style={styles.action}>Could not refresh NCAA Football. Tap to retry.</AppText></Pressable>}
    {data?.notices.map(notice => <AppText key={notice} style={styles.notice}>{notice}</AppText>)}
    {sheet && <>
      <View style={styles.header}>
        <AppText style={[styles.team, styles.column]}>{sheetKey === 'ncaaf_weather' ? 'Game' : 'Team'}</AppText>
        {sheet.columns.map((column, index) => <Pressable key={column} accessibilityRole="button" accessibilityLabel={'Sort by ' + column} style={styles.metric} onPress={() => setSort({ index, ascending: sort?.index === index ? !sort.ascending : false })}>
          <AppText style={styles.column}>{column}{sort?.index === index ? sort.ascending ? ' ↑' : ' ↓' : ''}</AppText>
        </Pressable>)}
      </View>
      {rows.map((row, index) => <View key={row.id} style={styles.row}>
        <View style={styles.numbers}><AppText style={styles.team}>{index + 1}. {row.team}</AppText>
          {row.metrics.map((metric, i) => <AppText key={i} style={[styles.metric, styles.value]}>{metric}</AppText>)}
        </View>
        <AppText variant="muted" style={styles.detail}>{row.detail}</AppText>
      </View>)}
      {!rows.length && <AppText variant="muted" style={styles.meta}>{sheet.emptyMessage}</AppText>}
      <AppText variant="muted" style={styles.meta}>{sheet.note}</AppText>
    </>}
  </Card>
}
const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 23, lineHeight: 26, fontWeight: '900', textTransform: 'uppercase' },
  action: { color: colors.gold, fontSize: 12, paddingVertical: 8 },
  meta: { fontSize: 11, lineHeight: 17, marginVertical: 10 },
  notice: { color: colors.gold, fontSize: 11, lineHeight: 17, marginVertical: 4 },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  column: { fontSize: 10, lineHeight: 13, color: colors.gold, textAlign: 'right' },
  row: { borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12 },
  numbers: { flexDirection: 'row', alignItems: 'center' },
  team: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '700', textAlign: 'left', paddingRight: 6 },
  metric: { width: 52, textAlign: 'right' },
  value: { fontSize: 11, lineHeight: 16, color: colors.textPrimary },
  detail: { fontSize: 10, lineHeight: 15, marginTop: 6 },
})
