import { useState, useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { useAuth } from '@/lib/auth'
import { kingfishFetch } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

type Tab = 'qb' | 'wr' | 'rb'

const TEAM_NAMES: Record<string, string> = {
  ARI: 'Arizona Cardinals',   ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',    BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',   CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',      DEN: 'Denver Broncos',
  DET: 'Detroit Lions',       GB:  'Green Bay Packers',
  HOU: 'Houston Texans',      IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars', KC: 'Kansas City Chiefs',
  LAC: 'L.A. Chargers',       LAR: 'L.A. Rams',
  LV:  'Las Vegas Raiders',   MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',   NE:  'New England Patriots',
  NO:  'New Orleans Saints',  NYG: 'New York Giants',
  NYJ: 'New York Jets',       PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers', SEA: 'Seattle Seahawks',
  SF:  'San Francisco 49ers', TB:  'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',    WAS: 'Washington Commanders',
}

// Fixed pixel widths (NOT flex): the table lives inside a horizontal ScrollView,
// where flex collapses to content width and columns drift. Fixed widths make it a
// true aligned grid, with the Player column hard-bounded so the longest name stops
// at a consistent line.
const PHYSICAL_COLS = [
  { key: 'height',     label: 'Ht',   width: 46, align: 'right' as const },
  { key: 'weight',     label: 'Wt',   width: 44, align: 'right' as const },
  { key: 'forty',      label: '40yd', width: 52, align: 'right' as const },
  { key: 'age',        label: 'Age',  width: 40, align: 'right' as const },
]

const QB_COLS = [
  { key: 'name',                   label: 'Player',  width: 104, align: 'left'  as const },
  { key: 'team',                   label: 'Team',    width: 48,  align: 'left'  as const },
  ...PHYSICAL_COLS,
  { key: 'cpoe',                   label: 'CPOE',    width: 60, align: 'right' as const },
  { key: 'avg_intended_air_yards', label: 'Air Yds', width: 58, align: 'right' as const },
  { key: 'avg_time_to_throw',      label: 'TT',      width: 56, align: 'right' as const },
  { key: 'aggressiveness',         label: 'Aggr%',   width: 58, align: 'right' as const },
]
const WR_COLS = [
  { key: 'name',                      label: 'Player',  width: 104, align: 'left'  as const },
  { key: 'team',                      label: 'Team',    width: 48,  align: 'left'  as const },
  ...PHYSICAL_COLS,
  { key: 'avg_separation',            label: 'Sep',     width: 48, align: 'right' as const },
  { key: 'avg_cushion',               label: 'Cush',    width: 48, align: 'right' as const },
  { key: 'avg_yac_above_expectation', label: 'YAC+',    width: 52, align: 'right' as const },
  { key: 'catch_pct',                 label: 'Catch%',  width: 60, align: 'right' as const },
]
const RB_COLS = [
  { key: 'name',                             label: 'Player',   width: 104, align: 'left'  as const },
  { key: 'team',                             label: 'Team',     width: 48,  align: 'left'  as const },
  ...PHYSICAL_COLS,
  { key: 'efficiency',                       label: 'Eff',      width: 48, align: 'right' as const },
  { key: 'rush_yards_over_expected_per_att', label: 'RYOE/att', width: 72, align: 'right' as const },
  { key: 'stacked_box_pct',                 label: 'Box%',     width: 52, align: 'right' as const },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function parseBirthDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

function calcAge(bd: Date): number {
  const today = new Date()
  let age = today.getFullYear() - bd.getFullYear()
  const m = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
  return age
}

function isBirthdayToday(bd: Date): boolean {
  const today = new Date()
  return today.getMonth() === bd.getMonth() && today.getDate() === bd.getDate()
}

function formatBorn(raw: string | null | undefined): string {
  const bd = parseBirthDate(raw)
  if (!bd) return '—'
  return `${MONTHS[bd.getMonth()]} ${bd.getDate()}, ${bd.getFullYear()}`
}

function fmt(val: any, decimals = 1, suffix = ''): string {
  if (val == null || val === '' || isNaN(Number(val))) return '—'
  const s = Number(val).toFixed(decimals)
  return suffix ? s + suffix : s
}

function signedColor(val: number | undefined, positiveGood = true): string {
  if (val == null) return colors.textMuted
  const abs = Math.abs(val)
  if (abs < 0.5) return colors.textMuted
  const good = positiveGood ? val > 0 : val < 0
  return good ? colors.gold : '#E05C5C'
}

// "Jameis Winston" -> "J. Winston" so the name column stays narrow on iPhone.
function shortPlayerName(name?: string): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

function cellValue(row: any, key: string): string {
  const v = row[key]
  if (key === 'name') return shortPlayerName(row.name)
  // Show the team abbreviation (e.g. NYG, KC) instead of the full name to keep the
  // table from overflowing on iPhone.
  if (key === 'team') return row.team || '—'
  if (key === 'height')     return typeof v === 'string' ? v : '—'
  if (key === 'weight')     return v != null ? `${Math.round(v)}` : '—'
  if (key === 'forty')      return fmt(v, 2)
  if (key === 'birth_date') return formatBorn(v)
  if (key === 'age') {
    const bd = parseBirthDate(row.birth_date)
    return bd ? String(calcAge(bd)) : '—'
  }
  if (key === 'cpoe')                          return fmt(v, 1, '%')
  if (key === 'avg_intended_air_yards')        return fmt(v, 1)
  if (key === 'avg_time_to_throw')             return fmt(v, 2, 's')
  if (key === 'aggressiveness')                return fmt(v, 1, '%')
  if (key === 'avg_separation')                return fmt(v, 1)
  if (key === 'avg_cushion')                   return fmt(v, 1)
  if (key === 'avg_yac_above_expectation')     return fmt(v, 1)
  if (key === 'catch_pct')                     return fmt(v, 1, '%')
  if (key === 'efficiency')                    return fmt(v, 2)
  if (key === 'rush_yards_over_expected_per_att') return fmt(v, 2)
  if (key === 'stacked_box_pct')               return fmt(v, 1, '%')
  return '—'
}

function cellColor(key: string, val: any): string {
  if (key === 'team')                             return colors.textSecondary
  if (key === 'cpoe')                             return signedColor(val)
  if (key === 'avg_yac_above_expectation')        return signedColor(val)
  if (key === 'rush_yards_over_expected_per_att') return signedColor(val)
  return colors.textPrimary
}

function TableHeader({
  cols, sortKey, sortAsc, onSort,
}: { cols: typeof QB_COLS; sortKey: string; sortAsc: boolean; onSort: (k: string) => void }) {
  return (
    <View style={styles.headerRow}>
      {cols.map(c => (
        <Pressable
          key={c.key}
          onPress={() => onSort(c.key)}
          style={[styles.headerCell, { width: c.width, alignItems: c.align === 'left' ? 'flex-start' : 'flex-end' }]}
        >
          <AppText style={[styles.headerText, sortKey === c.key && styles.headerActive]} numberOfLines={1}>
            {c.label}{sortKey === c.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
          </AppText>
        </Pressable>
      ))}
    </View>
  )
}

function TableRow({ row, cols, index }: { row: any; cols: typeof QB_COLS; index: number }) {
  const bd = parseBirthDate(row.birth_date)
  const birthday = bd ? isBirthdayToday(bd) : false
  return (
    <View style={[styles.dataRow, index % 2 === 1 && styles.dataRowAlt]}>
      {cols.map(c => (
        <View key={c.key} style={[styles.dataCell, { width: c.width, alignItems: c.align === 'left' ? 'flex-start' : 'flex-end' }]}>
          {c.key === 'name' ? (
            <AppText style={[styles.cellText, { color: colors.textPrimary }]} numberOfLines={1}>
              {birthday ? '🎂 ' : ''}{cellValue(row, c.key)}
            </AppText>
          ) : c.key === 'team' ? (
            <AppText style={[styles.cellText, { color: colors.textSecondary }]}>
              {cellValue(row, c.key)}
            </AppText>
          ) : (
            <AppText style={[styles.cellText, { color: cellColor(c.key, row[c.key]) }]} numberOfLines={1}>
              {cellValue(row, c.key)}
            </AppText>
          )}
        </View>
      ))}
    </View>
  )
}

function NGSTable({ rows, cols }: { rows: any[]; cols: typeof QB_COLS }) {
  const [sortKey, setSortKey] = useState(cols[4]?.key ?? cols[2].key)
  const [sortAsc, setSortAsc] = useState(false)

  function onSort(key: string) {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string')
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    const an = (av != null ? Number(av) : -Infinity)
    const bn = (bv != null ? Number(bv) : -Infinity)
    return sortAsc ? an - bn : bn - an
  })

  return (
    <View>
      <TableHeader cols={cols} sortKey={sortKey} sortAsc={sortAsc} onSort={onSort} />
      {sorted.map((row, i) => <TableRow key={row.name} row={row} cols={cols} index={i} />)}
    </View>
  )
}

export default function ScoutScreen() {
  const { profile } = useAuth()
  const isPremium = profile?.is_premium === true
  const [tab, setTab] = useState<Tab>('qb')
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const { data: ngs, isLoading, isError } = useQuery<any>({
    queryKey: ['scout-ngs'],
    queryFn: async () => {
      const d = await kingfishFetch<any>('/api/nfl-command-data')
      return d?.next_gen ?? null
    },
    enabled: isPremium,
    staleTime: 1000 * 60 * 30,
  })

  const allQBs  = useMemo(() => ngs?.passing?.players   ? Object.values(ngs.passing.players)   : [], [ngs])
  const allWRs  = useMemo(() => ngs?.receiving?.players ? Object.values(ngs.receiving.players) : [], [ngs])
  const allRBs  = useMemo(() => ngs?.rushing?.players   ? Object.values(ngs.rushing.players)   : [], [ngs])

  const activeRows = tab === 'qb' ? allQBs : tab === 'wr' ? allWRs : allRBs

  const teams = useMemo(() => {
    const set = new Set<string>()
    activeRows.forEach((r: any) => { if (r.team) set.add(r.team) })
    return Array.from(set).sort()
  }, [activeRows])

  const filtered = useMemo(() => {
    let rows = activeRows as any[]
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r: any) => r.name?.toLowerCase().includes(q))
    }
    if (teamFilter) rows = rows.filter((r: any) => r.team === teamFilter)
    return rows
  }, [activeRows, search, teamFilter])

  const hasData = allQBs.length > 0 || allWRs.length > 0 || allRBs.length > 0

  function switchTab(t: Tab) {
    setTab(t)
    setTeamFilter(null)
    setSearch('')
    setDropdownOpen(false)
  }

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <AppText style={styles.backText}>‹ Back</AppText>
      </Pressable>

      <AppText variant="eyebrow">// NFL Tracking Data</AppText>
      <AppText variant="title" style={styles.title}>The Scout</AppText>

      {!isPremium ? (
        <Card style={styles.gateCard}>
          <AppText variant="title" style={{ marginTop: 6, marginBottom: 4 }}>A KingFish Premium tool</AppText>
          <AppText variant="muted" style={{ marginTop: 10, marginBottom: spacing.md, lineHeight: 20 }}>
            The Scout is part of KingFish Premium — tracking data for the serious bettor.
          </AppText>
          <Button onPress={() => router.push('/modals/paywall')}>Get Access</Button>
        </Card>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
          <AppText variant="muted" style={{ marginTop: 12 }}>Loading tracking data…</AppText>
        </View>
      ) : isError || !hasData ? (
        <Card>
          <AppText variant="muted" style={{ lineHeight: 20 }}>
            No NGS data loaded yet. Upload the NFL Next Gen Stats CSVs via HQ → NFL Data Library.
          </AppText>
        </Card>
      ) : (
        <>
          <View style={styles.tabs}>
            {([['qb', 'QBs'], ['wr', 'Receivers'], ['rb', 'Rushers']] as [Tab, string][]).map(([t, label]) => (
              <Pressable key={t} onPress={() => switchTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
                <AppText style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.filterRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search player…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              clearButtonMode="while-editing"
            />
            <View style={styles.dropdownWrap}>
              <Pressable onPress={() => setDropdownOpen(o => !o)} style={styles.dropdown}>
                <AppText style={styles.dropdownText} numberOfLines={1}>
                  {teamFilter ? TEAM_NAMES[teamFilter] || teamFilter : 'All Teams'}
                </AppText>
                <AppText style={styles.dropdownChevron}>{dropdownOpen ? '▴' : '▾'}</AppText>
              </Pressable>
              {dropdownOpen && (
                <View style={styles.dropdownList}>
                  <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
                    <Pressable style={[styles.dropdownOption, !teamFilter && styles.dropdownOptionActive]}
                      onPress={() => { setTeamFilter(null); setDropdownOpen(false) }}>
                      <AppText style={[styles.dropdownOptionText, !teamFilter && styles.dropdownOptionTextActive]}>All Teams</AppText>
                    </Pressable>
                    {teams.map(t => (
                      <Pressable key={t} style={[styles.dropdownOption, teamFilter === t && styles.dropdownOptionActive]}
                        onPress={() => { setTeamFilter(t); setDropdownOpen(false) }}>
                        <AppText style={[styles.dropdownOptionText, teamFilter === t && styles.dropdownOptionTextActive]}>
                          {TEAM_NAMES[t] || t}
                        </AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View style={styles.legendRow}>
            <AppText variant="muted" style={styles.legend}>Ht/Wt/40 from NFL combine · </AppText>
            {tab === 'qb' && <AppText variant="muted" style={styles.legend}>CPOE: completion% above expected · TT: time to throw</AppText>}
            {tab === 'wr' && <AppText variant="muted" style={styles.legend}>Sep: avg separation (ft) · YAC+: yards after catch above expected</AppText>}
            {tab === 'rb' && <AppText variant="muted" style={styles.legend}>RYOE/att: rush yards over expected · Box%: % vs 8+ defenders</AppText>}
          </View>

          <ScrollView style={styles.tableWrap} showsVerticalScrollIndicator={false} horizontal>
            <View>
              {tab === 'qb' && <NGSTable rows={filtered} cols={QB_COLS} />}
              {tab === 'wr' && <NGSTable rows={filtered} cols={WR_COLS} />}
              {tab === 'rb' && <NGSTable rows={filtered} cols={RB_COLS} />}
            </View>
          </ScrollView>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back:     { paddingVertical: spacing.sm, marginBottom: spacing.xs },
  backText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  title:    { marginTop: 4, marginBottom: 4 },
  gateCard: { marginTop: spacing.sm },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  tabs: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    padding: 3,
    marginBottom: spacing.sm,
    gap: 2,
  },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive:     { backgroundColor: colors.gold },
  tabText:       { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: '#000' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  dropdownWrap: { width: 160, position: 'relative', zIndex: 100 },
  dropdown: {
    height: 42,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText:    { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  dropdownChevron: { fontSize: 12, color: colors.textMuted, marginLeft: 6 },
  dropdownList: {
    position: 'absolute',
    top: 44,
    right: 0,
    minWidth: 200,
    backgroundColor: '#1A1D2E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  dropdownOption:           { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#151515' },
  dropdownOptionActive:     { backgroundColor: 'rgba(198,145,50,0.12)' },
  dropdownOptionText:       { fontSize: 14, color: colors.textPrimary },
  dropdownOptionTextActive: { color: colors.gold, fontWeight: '700' },

  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xs },
  legend:    { fontSize: 11, lineHeight: 16 },

  tableWrap: { flex: 1 },

  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    paddingBottom: 6,
    marginBottom: 2,
  },
  headerCell:   { paddingHorizontal: 4, paddingVertical: 4 },
  headerText:   { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 },
  headerActive: { color: colors.gold },

  dataRow:    { flexDirection: 'row', paddingVertical: 10 },
  dataRowAlt: { backgroundColor: '#0F0F0F' },
  dataCell:   { paddingHorizontal: 4 },
  cellText:   { fontSize: 13, fontWeight: '500' },
})
