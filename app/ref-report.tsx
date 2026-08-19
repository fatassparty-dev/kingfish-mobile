import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useMobileConfig } from '@/lib/mobileConfig'
import { colors, spacing } from '@/lib/theme'

type Ref = {
  name: string
  games: number
  avg_total: number
  over_pct: number | null
  overs: number | null
  unders: number | null
  home_win_pct: number | null
  hometown: string | null
  flags_pg: number | null
}

// Fixed pixel widths (NOT flex), same reason as The Scout: the table lives in a
// horizontal ScrollView, where flex collapses to content width and the columns
// drift out of alignment row to row.
const COLS = [
  { key: 'name',         label: 'Crew Chief', width: 150, align: 'left'  as const, sortable: true },
  { key: 'games',        label: 'G',          width: 38,  align: 'right' as const, sortable: true },
  { key: 'avg_total',    label: 'Avg Tot',    width: 62,  align: 'right' as const, sortable: true },
  { key: 'over_pct',     label: 'Over%',      width: 60,  align: 'right' as const, sortable: true },
  { key: 'overs',        label: 'O',          width: 34,  align: 'right' as const, sortable: false },
  { key: 'unders',       label: 'U',          width: 34,  align: 'right' as const, sortable: false },
  { key: 'home_win_pct', label: 'Home%',      width: 60,  align: 'right' as const, sortable: true },
  { key: 'flags_pg',     label: 'Flags/G',    width: 62,  align: 'right' as const, sortable: true },
  { key: 'hometown',     label: 'Hometown',   width: 140, align: 'left'  as const, sortable: false },
]

// Above slate average = lean over (warm), below = lean under (cool).
function totalColor(value: number, average: number) {
  if (value >= average + 2) return '#E05252'
  if (value >= average + 0.5) return colors.gold
  if (value <= average - 2) return '#5B9BD5'
  if (value <= average - 0.5) return '#7BA7C4'
  return colors.textPrimary
}

function overColor(pct: number | null) {
  if (pct === null) return colors.textSecondary
  if (pct >= 58) return '#E05252'
  if (pct >= 52) return colors.gold
  if (pct <= 38) return '#5B9BD5'
  if (pct <= 44) return '#7BA7C4'
  return colors.textPrimary
}

// Flag-happy crews run hot; "let them play" crews run cool.
function flagColor(value: number | null, average: number) {
  if (value === null) return colors.textSecondary
  if (value >= average + 1.5) return '#E05252'
  if (value >= average + 0.5) return colors.gold
  if (value <= average - 1.5) return '#5B9BD5'
  if (value <= average - 0.5) return '#7BA7C4'
  return colors.textPrimary
}

export default function RefReportScreen() {
  const { session, profile } = useAuth()
  const mobileConfig = useMobileConfig()
  const isLoggedIn = Boolean(session)
  // The Pro Tools promo only unlocks for a signed-in user — a guest has no
  // token, so the fetch would 401. Guests see the gate instead.
  const isPremium = profile?.is_premium === true || (mobileConfig.flags['pro_tools_free'] === true && isLoggedIn)

  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string>('avg_total')
  const [sortAsc, setSortAsc] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['nfl-command-data'],
    queryFn: () => kingfishFetch<{ ref_report?: { refs?: Ref[] } }>('/api/nfl-command-data'),
    staleTime: 30 * 60 * 1000,
    enabled: isPremium,
  })

  const refs: Ref[] = data?.ref_report?.refs || []
  const avgTotal = refs.length ? refs.reduce((sum, ref) => sum + ref.avg_total, 0) / refs.length : 44
  const flagRefs = refs.filter((ref) => ref.flags_pg !== null)
  const avgFlags = flagRefs.length ? flagRefs.reduce((sum, ref) => sum + (ref.flags_pg ?? 0), 0) / flagRefs.length : 12

  function onSort(key: string) {
    if (sortKey === key) setSortAsc((asc) => !asc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const list = query ? refs.filter((ref) => ref.name.toLowerCase().includes(query)) : refs.slice()
    list.sort((a, b) => {
      const av = (a as any)[sortKey]
      const bv = (b as any)[sortKey]
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const an = av != null ? Number(av) : -Infinity
      const bn = bv != null ? Number(bv) : -Infinity
      return sortAsc ? an - bn : bn - an
    })
    return list
  }, [refs, search, sortAsc, sortKey])

  function cellValue(key: string, ref: Ref) {
    const value = (ref as any)[key]
    if (value === null || value === undefined || value === '') return '—'
    if (key === 'avg_total') return Number(value).toFixed(1)
    if (key === 'over_pct' || key === 'home_win_pct') return `${Number(value).toFixed(1)}%`
    return String(value)
  }

  function cellColor(key: string, ref: Ref) {
    if (key === 'name') return colors.textPrimary
    if (key === 'avg_total') return totalColor(Number(ref.avg_total), avgTotal)
    if (key === 'over_pct') return overColor(ref.over_pct)
    if (key === 'flags_pg') return flagColor(ref.flags_pg, avgFlags)
    return colors.textSecondary
  }

  return (
    <Screen scroll={false}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <AppText style={styles.backText}>‹ Back</AppText>
      </Pressable>

      <AppText variant="eyebrow">// NFL Officials</AppText>
      <AppText variant="title" style={styles.title}>The Ref Report</AppText>

      {!isPremium ? (
        <Card style={styles.gateCard}>
          <AppText variant="title" style={{ marginTop: 6, marginBottom: 4 }}>A KingFish Premium tool</AppText>
          <AppText variant="muted" style={{ marginTop: 10, marginBottom: spacing.md, lineHeight: 20 }}>
            The Ref Report is part of KingFish Premium — NFL officiating tendencies for the serious bettor.
          </AppText>
          <Button onPress={() => router.push('/modals/paywall')}>Get Access</Button>
        </Card>
      ) : isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
          <AppText variant="muted" style={{ marginTop: 12 }}>Loading officiating data…</AppText>
        </View>
      ) : isError || !refs.length ? (
        <Card>
          <AppText variant="muted" style={{ lineHeight: 20 }}>
            No officiating data loaded yet. Upload the ref report CSV via HQ → NFL Data Library.
          </AppText>
        </Card>
      ) : (
        <>
          <TextInput
            style={styles.searchInput}
            placeholder="Search crew chief…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />

          <AppText variant="muted" style={styles.legend}>
            Avg Tot: average game total worked · Flags/G: flags per game · Warm runs over, cool runs under
          </AppText>

          <ScrollView style={styles.tableWrap} showsVerticalScrollIndicator={false} horizontal>
            <View>
              <View style={styles.headerRow}>
                {COLS.map((col) => (
                  <Pressable
                    key={col.key}
                    disabled={!col.sortable}
                    onPress={() => onSort(col.key)}
                    style={{ width: col.width }}
                  >
                    <AppText
                      variant="mono"
                      numberOfLines={1}
                      style={[
                        styles.headerCell,
                        { textAlign: col.align },
                        sortKey === col.key && styles.headerCellActive,
                      ]}
                    >
                      {col.label}{sortKey === col.key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {rows.map((ref, index) => (
                  <View key={ref.name} style={[styles.row, index % 2 === 1 && styles.rowAlt]}>
                    {COLS.map((col) => (
                      <AppText
                        key={col.key}
                        variant={col.key === 'name' || col.key === 'hometown' ? undefined : 'mono'}
                        numberOfLines={1}
                        style={[
                          styles.cell,
                          { width: col.width, textAlign: col.align, color: cellColor(col.key, ref) },
                          col.key === 'name' && styles.cellName,
                        ]}
                      >
                        {cellValue(col.key, ref)}
                      </AppText>
                    ))}
                  </View>
                ))}
              </ScrollView>
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

  searchInput: {
    height: 42,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  legend: { fontSize: 11, lineHeight: 16, marginTop: spacing.xs, marginBottom: spacing.xs },

  tableWrap: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell:       { fontSize: 10, letterSpacing: 0.6, color: colors.textMuted },
  headerCellActive: { color: colors.gold },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowAlt:   { backgroundColor: 'rgba(255,255,255,.02)' },
  cell:     { fontSize: 12 },
  cellName: { fontSize: 13, fontWeight: '700' },
})
