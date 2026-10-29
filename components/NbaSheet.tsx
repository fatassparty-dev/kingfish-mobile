import { useState } from 'react'
import { ActivityIndicator, Pressable, Share, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { colors } from '@/lib/theme'

// NBA cheat sheets (Premium). Every number is built server-side in kingfish-bets
// (lib/nba/*Sheet.ts) and rendered here as-is, same as the web /statsheet.
// Records and posted lines only: no prices, no model.
export const NBA_SHEETS = [
  { key: 'nba_first_basket', label: 'NBA First Basket', desc: "Opening-tip records, who scores first, and each team's most frequent first-basket scorers for today's games.", type: 'nba', endpoint: '/api/nba-first-basket' },
  { key: 'nba_dvp', label: 'NBA Defense vs Position', desc: "What each defense in today's games allows to guards, forwards and centers, ranked across the league.", type: 'nba', endpoint: '/api/nba-defense-vs-position' },
  { key: 'nba_king', label: 'King of the Court', desc: "Tonight's top points + rebounds + assists candidates by posted PRA line, with form and nights each player led the slate.", type: 'nba', endpoint: '/api/nba-king-of-the-court' },
] as const
export type NbaSheetKey = typeof NBA_SHEETS[number]['key']

type FirstBasketSide = {
  team: string; games: number; tipWins: number; tipGames: number
  jumper: { player: string; wins: number; jumps: number } | null
  scoredFirst: number
  candidates: { player: string; teamFirsts: number; gameFirsts: number; games: number }[]
}
type FirstBasketPayload = { rows: { eventId: string; tipoff: string; matchup: string; away: FirstBasketSide; home: FirstBasketSide }[] }

type DvpStat = 'pts' | 'reb' | 'ast' | 'fg3m'
type DvpPosition = 'G' | 'F' | 'C'
type DvpDefense = { team: string; games: number; allowed: Record<DvpPosition, Record<DvpStat, { perGame: number; rank: number }>> | null }
type DvpPayload = {
  teams: number
  rows: { eventId: string; tipoff: string; matchup: string; away: DvpDefense; home: DvpDefense }[]
  softest: Record<DvpStat, { offense: string; position: DvpPosition; defense: string; perGame: number; rank: number }[]>
}

type KingPayload = {
  rows: { player: string; team: string | null; matchup: string; tipoff: string; line: number; praPerGame: number | null; l5Pra: number | null; bestPra: number | null; nightsLed: number }[]
  recentKings: { date: string; player: string; team: string; opponent: string; pra: number }[]
}

// One fetch shape for all three sheets; `rows` is cast per sheet below.
type Payload = { generated_at?: string; rows?: unknown[]; teams?: number; softest?: DvpPayload['softest']; recentKings?: KingPayload['recentKings'] }

const STAT_LABELS: Record<DvpStat, string> = { pts: 'Points', reb: 'Rebounds', ast: 'Assists', fg3m: '3-Pointers' }
const POSITION_LABELS: Record<DvpPosition, string> = { G: 'Guards', F: 'Forwards', C: 'Centers' }
const NOTES: Record<NbaSheetKey, string> = {
  nba_first_basket: "Regular-season games this season only. First basket means the first made field goal; free throws don't count. Records only, not a prediction. Check your sportsbook's own first-basket rules.",
  nba_dvp: 'Totals allowed to each position per game, regular season this season only. Positions are ESPN’s guard / forward / center listings, so a team that plays more listed guards gives up more guard totals. Records only, not a prediction.',
  nba_king: "Built for most-PRA promos like DraftKings' Tuesday King of the Court; check the promo's own terms. Ranked by the sportsbooks' posted PRA line, so players ruled out drop off. Season numbers are regular season only. Records only, not a prediction.",
}

const tipTime = (iso: string) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT' : ''
const record = (wins: number, total: number) => total > 0 ? `${wins}-${total - wins}` : '—'
const one = (n: number | null | undefined) => n != null ? n.toFixed(1) : '—'

export function NbaSheet({ sheetKey }: { sheetKey: NbaSheetKey }) {
  const sheet = NBA_SHEETS.find(item => item.key === sheetKey)!
  const [dvpStat, setDvpStat] = useState<DvpStat>('pts')
  const query = useQuery({
    queryKey: ['nba-cheat-sheet', sheetKey],
    queryFn: () => kingfishFetch<Payload>(sheet.endpoint),
    staleTime: 5 * 60000,
  })
  const data = query.data
  const teams = data?.teams || 30
  const rankColor = (rank: number) => rank <= 5 ? colors.green : rank > teams - 5 ? colors.red : colors.textSecondary
  const saved = data?.generated_at ? new Date(data.generated_at).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' CT' : ''

  function shareLines(): string[] {
    if (!data) return []
    if (sheetKey === 'nba_first_basket') return (data.rows as FirstBasketPayload['rows'] || []).flatMap(row => [
      `${row.matchup} · ${tipTime(row.tipoff)}`,
      ...[row.away, row.home].map(side => `  ${side.team}: tips ${record(side.tipWins, side.tipGames)} · scored first ${side.scoredFirst}/${side.games}${side.candidates.length ? ' · ' + side.candidates.map(c => `${c.player} ${c.teamFirsts}`).join(', ') : ''}`),
    ])
    if (sheetKey === 'nba_dvp') return (data.softest?.[dvpStat] || []).map((s, i) => `${i + 1}. ${s.offense} ${POSITION_LABELS[s.position]} vs ${s.defense}: ${s.perGame.toFixed(1)} ${STAT_LABELS[dvpStat].toLowerCase()} allowed/g (#${s.rank})`)
    return (data.rows as KingPayload['rows'] || []).map((row, i) => `${i + 1}. ${row.player} ${row.team || ''} · PRA line ${row.line} · ${one(row.praPerGame)}/g · L5 ${one(row.l5Pra)}`)
  }
  const lines = shareLines()
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

    {data && sheetKey === 'nba_first_basket' && <FirstBasket rows={data.rows as FirstBasketPayload['rows'] || []} />}

    {data && sheetKey === 'nba_dvp' && <>
      <View style={styles.chips}>
        {(Object.keys(STAT_LABELS) as DvpStat[]).map(stat => <Pressable key={stat} accessibilityRole="button" accessibilityState={{ selected: dvpStat === stat }} onPress={() => setDvpStat(stat)} style={[styles.chip, dvpStat === stat && styles.chipActive]}>
          <AppText style={[styles.chipText, dvpStat === stat && styles.chipTextActive]}>{STAT_LABELS[stat]}</AppText>
        </Pressable>)}
      </View>
      {(data.softest?.[dvpStat] || []).length > 0 && <View style={styles.block}>
        <AppText style={styles.eyebrow}>Softest matchups tonight · {STAT_LABELS[dvpStat]}</AppText>
        {data.softest![dvpStat].map((s, i) => <AppText key={`${s.offense}-${s.position}-${i}`} style={styles.line}>
          <AppText style={styles.strong}>{s.offense} {POSITION_LABELS[s.position]}</AppText>
          <AppText style={styles.dim}> vs {s.defense}: {s.perGame.toFixed(1)} allowed per game, </AppText>
          <AppText style={[styles.strong, { color: rankColor(s.rank) }]}>#{s.rank}</AppText>
        </AppText>)}
      </View>}
      {(data.rows as DvpPayload['rows'] || []).length === 0
        ? <AppText variant="muted" style={styles.meta}>No NBA games today</AppText>
        : <>
          <View style={styles.header}>
            <AppText style={[styles.cellWide, styles.column]}>Defense</AppText>
            {(['G', 'F', 'C'] as DvpPosition[]).map(position => <AppText key={position} style={[styles.cell, styles.column]}>vs {POSITION_LABELS[position]}</AppText>)}
          </View>
          {(data.rows as DvpPayload['rows']).map(row => <View key={row.eventId} style={styles.game}>
            <AppText style={styles.matchup}>{row.matchup} <AppText style={styles.dim}>· {tipTime(row.tipoff)}</AppText></AppText>
            {[row.away, row.home].map(side => <View key={side.team} style={styles.numbers}>
              <AppText style={[styles.cellWide, styles.strong]}>{side.team}</AppText>
              {(['G', 'F', 'C'] as DvpPosition[]).map(position => {
                const cell = side.allowed?.[position]?.[dvpStat]
                return <AppText key={position} style={[styles.cell, styles.value]}>
                  {cell ? <>{cell.perGame.toFixed(1)} <AppText style={[styles.value, styles.strong, { color: rankColor(cell.rank) }]}>#{cell.rank}</AppText></> : '—'}
                </AppText>
              })}
            </View>)}
          </View>)}
        </>}
    </>}

    {data && sheetKey === 'nba_king' && <>
      {(data.recentKings || []).length > 0 && <View style={styles.block}>
        <AppText style={styles.eyebrow}>Recent kings</AppText>
        {data.recentKings!.map((k, i) => <AppText key={`${k.date}-${k.player}-${i}`} style={styles.line}>
          <AppText style={styles.dim}>{new Date(`${k.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} </AppText>
          <AppText style={styles.strong}>{k.player}</AppText>
          <AppText style={styles.dim}> {k.pra} PRA</AppText>
        </AppText>)}
      </View>}
      {(data.rows as KingPayload['rows'] || []).length === 0
        ? <AppText variant="muted" style={styles.meta}>No PRA lines posted for today's NBA games yet</AppText>
        : <>
          <View style={styles.header}>
            <AppText style={[styles.player, styles.column, styles.left]}>Player</AppText>
            {['Line', 'PRA/G', 'L5', 'Best', 'Led'].map(column => <AppText key={column} style={[styles.kingCell, styles.column]}>{column}</AppText>)}
          </View>
          {(data.rows as KingPayload['rows']).map((row, i) => <View key={`${row.player}-${i}`} style={styles.game}>
            <View style={styles.numbers}>
              <AppText style={[styles.player, styles.strong]} numberOfLines={1}><AppText style={styles.rank}>{i + 1}. </AppText>{row.player}</AppText>
              <AppText style={[styles.kingCell, styles.value, styles.strong]}>{row.line}</AppText>
              <AppText style={[styles.kingCell, styles.value]}>{one(row.praPerGame)}</AppText>
              <AppText style={[styles.kingCell, styles.value]}>{one(row.l5Pra)}</AppText>
              <AppText style={[styles.kingCell, styles.value]}>{row.bestPra ?? '—'}</AppText>
              <AppText style={[styles.kingCell, styles.value, row.nightsLed > 0 && styles.rank]}>{row.nightsLed}</AppText>
            </View>
            <AppText variant="muted" style={styles.detail}>{row.team ? row.team + ' · ' : ''}{row.matchup} · {tipTime(row.tipoff)}</AppText>
          </View>)}
        </>}
    </>}

    <AppText variant="muted" style={styles.meta}>{NOTES[sheetKey]}</AppText>
  </Card>
}

function FirstBasket({ rows }: { rows: FirstBasketPayload['rows'] }) {
  if (rows.length === 0) return <AppText variant="muted" style={styles.meta}>No NBA games today</AppText>
  return <>
    {rows.map(row => <View key={row.eventId} style={styles.game}>
      <AppText style={styles.matchup}>{row.matchup} <AppText style={styles.dim}>· {tipTime(row.tipoff)}</AppText></AppText>
      {[row.away, row.home].map(side => <View key={side.team} style={styles.side}>
        <View style={styles.numbers}>
          <AppText style={[styles.cellWide, styles.strong]}>{side.team}</AppText>
          <AppText style={[styles.fbCell, styles.value]}><AppText style={styles.dim}>Tips </AppText>{record(side.tipWins, side.tipGames)}</AppText>
          <AppText style={[styles.fbCell, styles.value]}><AppText style={styles.dim}>Scored 1st </AppText>{side.games > 0 ? `${side.scoredFirst}/${side.games}` : '—'}</AppText>
        </View>
        <AppText variant="muted" style={styles.detail}>
          Jumper: {side.jumper ? `${side.jumper.player} (${record(side.jumper.wins, side.jumper.jumps)})` : '—'}
          {'\n'}First basket: {side.candidates.length === 0 ? '—' : side.candidates.map(c => `${c.player} ${c.teamFirsts}${c.gameFirsts > 0 ? ` (${c.gameFirsts})` : ''}`).join(' · ')}
        </AppText>
      </View>)}
    </View>)}
    <AppText variant="muted" style={styles.detail}>First basket counts are times he scored his team's first field goal; the game's first in parentheses.</AppText>
  </>
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, color: colors.textPrimary, fontSize: 23, lineHeight: 26, fontWeight: '900', textTransform: 'uppercase' },
  action: { color: colors.gold, fontSize: 12, paddingVertical: 8 },
  meta: { fontSize: 11, lineHeight: 17, marginVertical: 8 },
  eyebrow: { color: colors.gold, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  block: { borderTopWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  line: { fontSize: 12, lineHeight: 19 },
  strong: { color: colors.textPrimary, fontWeight: '700' },
  dim: { color: colors.textSecondary, fontWeight: '400' },
  rank: { color: colors.gold, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 8 },
  column: { fontSize: 10, lineHeight: 13, color: colors.gold, textAlign: 'right' },
  left: { textAlign: 'left' },
  game: { borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 10 },
  side: { marginTop: 6 },
  matchup: { color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  numbers: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cellWide: { width: 56, fontSize: 12, lineHeight: 16, textAlign: 'left' },
  cell: { flex: 1, textAlign: 'right' },
  fbCell: { flex: 1, textAlign: 'right' },
  player: { flex: 1, fontSize: 12, lineHeight: 16, paddingRight: 6 },
  kingCell: { width: 44, textAlign: 'right' },
  value: { fontSize: 11, lineHeight: 16, color: colors.textPrimary },
  detail: { fontSize: 10, lineHeight: 15, marginTop: 4 },
})
