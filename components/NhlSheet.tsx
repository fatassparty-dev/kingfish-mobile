import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { colors } from '@/lib/theme'

// NHL cheat sheets (Premium). Every row is built server-side in kingfish-bets
// (lib/nhl/hotStreaksSheet.ts, /api/nhl-hot-streaks) and rendered here as-is,
// same as the web /statsheet. Records and the posted line only: no model.
export const NHL_SHEETS = [
  { key: 'nhl_hot', label: 'NHL Hot Streaks', desc: "Players who cleared today's points or assists line in at least 4 of their last 5 games, at -175 or better.", type: 'nhl', endpoint: '/api/nhl-hot-streaks' },
] as const
export type NhlSheetKey = typeof NHL_SHEETS[number]['key']

type HotRow = {
  player: string; matchup: string; tipoff: string; marketLabel: string; line: number
  odds: number; bookName: string; overL5: number; overL10: number; gamesL10: number
  streak: number; seasonAvg: number | null; lastFive: number[]
}
type Payload = { generated_at?: string; games?: number; rows?: HotRow[] }

const NOTE = "Main points and assists lines only. Shots on goal are left off on purpose: in KingFish's graded NHL props, hot shot streaks did not hold up. Records and today's best price only, not a prediction."

const tipTime = (iso: string) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT' : ''
const price = (odds: number) => odds > 0 ? `+${odds}` : String(odds)

export function NhlSheet({ sheetKey }: { sheetKey: NhlSheetKey }) {
  const sheet = NHL_SHEETS.find(item => item.key === sheetKey)!
  const query = useQuery({
    queryKey: ['nhl-cheat-sheet', sheetKey],
    queryFn: () => kingfishFetch<Payload>(sheet.endpoint),
    staleTime: 5 * 60000,
  })
  const rows = query.data?.rows || []
  const saved = query.data?.generated_at ? new Date(query.data.generated_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' CT' : ''
  const lines = rows.map((row, i) => `${i + 1}. ${row.player} O ${row.line} ${row.marketLabel} · L5 ${row.overL5}/5 · L10 ${row.overL10}/${row.gamesL10} · streak ${row.streak} · ${price(row.odds)} ${row.bookName}`)

  async function share() {
    await Share.share({ message: [sheet.label, saved && 'Saved ' + saved, ...lines, 'KingFish Bets · kingfishbets.com'].filter(Boolean).join('\n') })
  }

  return <Card>
    <View style={styles.titleRow}>
      <AppText style={styles.title}>{sheet.label}</AppText>
      {lines.length > 0 && <Pressable accessibilityRole="button" onPress={() => { void share() }}><AppText style={styles.action}>Share</AppText></Pressable>}
    </View>
    {saved ? <AppText variant="muted" style={styles.meta}>Saved {saved}</AppText> : null}
    <AppText variant="muted" style={styles.meta}>{sheet.desc}</AppText>
    {query.isLoading && <ActivityIndicator color={colors.gold} />}
    {query.isError && <Pressable accessibilityRole="button" onPress={() => { void query.refetch() }}><AppText style={styles.action}>Could not load {sheet.label}. Tap to retry.</AppText></Pressable>}

    {query.data && (rows.length === 0
      ? <AppText variant="muted" style={styles.meta}>{query.data.games ? 'No points or assists lines qualify today' : 'No NHL lines posted for today yet'}</AppText>
      : <>
        <View style={styles.header}>
          <AppText style={[styles.player, styles.column, styles.left]}>Player</AppText>
          {['L5', 'L10', 'Run', 'Avg', 'Best'].map(column => <AppText key={column} style={[column === 'Best' ? styles.priceCell : styles.cell, styles.column]}>{column}</AppText>)}
        </View>
        {rows.map((row, i) => <View key={`${row.player}-${row.marketLabel}-${i}`} style={styles.row}>
          <View style={styles.numbers}>
            <View style={styles.player}>
              <AppText style={[styles.name, styles.strong]} numberOfLines={1}><AppText style={styles.rank}>{i + 1}. </AppText>{row.player}</AppText>
              <AppText style={styles.prop} numberOfLines={1}>O {row.line} {row.marketLabel}</AppText>
            </View>
            <AppText style={[styles.cell, styles.value, styles.strong, row.overL5 === 5 && styles.green]}>{row.overL5}/5</AppText>
            <AppText style={[styles.cell, styles.value]}>{row.overL10}/{row.gamesL10}</AppText>
            <AppText style={[styles.cell, styles.value, styles.strong]}>{row.streak}</AppText>
            <AppText style={[styles.cell, styles.value]}>{row.seasonAvg != null ? row.seasonAvg.toFixed(2) : '—'}</AppText>
            <AppText style={[styles.priceCell, styles.value, styles.strong]}>{price(row.odds)}</AppText>
          </View>
          <AppText variant="muted" style={styles.detail} numberOfLines={2}>
            {row.matchup} · {tipTime(row.tipoff)} · Last 5: {row.lastFive.join(', ')} · {row.bookName}
          </AppText>
        </View>)}
      </>)}

    <AppText variant="muted" style={styles.meta}>{NOTE}</AppText>
  </Card>
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 23, lineHeight: 26, fontWeight: '900', textTransform: 'uppercase' },
  action: { color: colors.gold, fontSize: 12, paddingVertical: 8 },
  meta: { fontSize: 11, lineHeight: 17, marginVertical: 8 },
  strong: { color: colors.textPrimary, fontWeight: '700' },
  green: { color: colors.green },
  rank: { color: colors.gold, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 8 },
  column: { fontSize: 10, lineHeight: 13, color: colors.gold, textAlign: 'right' },
  left: { textAlign: 'left' },
  row: { borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  numbers: { flexDirection: 'row', alignItems: 'center' },
  player: { flex: 1, paddingRight: 6 },
  name: { fontSize: 12, lineHeight: 16 },
  prop: { fontSize: 11, lineHeight: 15, color: colors.gold, fontWeight: '700' },
  cell: { width: 36, textAlign: 'right' },
  priceCell: { width: 46, textAlign: 'right' },
  value: { fontSize: 11, lineHeight: 16, color: colors.textPrimary },
  detail: { fontSize: 10, lineHeight: 15, marginTop: 4 },
})
