import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { GameLineCard } from '@/components/dashboard/GameLineCard'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtOdds, normalizeName } from '@/lib/format'
import { useMobileConfig } from '@/lib/mobileConfig'
import { BOOK_DISPLAY_NAMES, PROP_BOOK_KEYS } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, WeatherInfo } from '@/types'

type SheetKey = 'hits' | 'hr' | 'tb' | 'k' | 'hot' | 'bvp' | 'lines'

const SHEETS: Array<{
  key: SheetKey
  label: string
  desc: string
  type: 'props' | 'k' | 'lines'
  market?: string
  statField?: string
  trend?: boolean
}> = [
  { key: 'hits', label: 'Hits Bet/Fade', desc: 'Hit props ranked by form, hit rate, price, and edge.', type: 'props', market: 'batter_hits', statField: 'hits_per_game' },
  { key: 'hr', label: 'HR Targets', desc: 'Home run targets with power form and playable prices.', type: 'props', market: 'batter_home_runs', statField: 'hr_per_game' },
  { key: 'tb', label: 'Hot Total Bases', desc: 'Total bases targets with season and recent production.', type: 'props', market: 'batter_total_bases', statField: 'tb_per_game' },
  { key: 'k', label: 'Safe Alt K', desc: 'Pitcher strikeout looks ranked by recent K form.', type: 'k', market: 'pitcher_strikeouts', statField: 'strikeouts_per_game' },
  { key: 'hot', label: 'Hot Hitters', desc: 'Players whose recent hit form is running above their season baseline.', type: 'props', market: 'batter_hits', statField: 'hits_per_game', trend: true },
  { key: 'bvp', label: 'Batter vs Pitcher', desc: "Head-to-head batter history against today's starting pitcher.", type: 'props' },
  { key: 'lines', label: 'Game Lines & Edge', desc: "Today's MLB moneylines, totals, and weather context.", type: 'lines' },
]

const STAT_TO_RAW: Record<string, string> = {
  hits_per_game: 'hits',
  hr_per_game: 'hr',
  tb_per_game: 'tb',
  strikeouts_per_game: 'strikeouts',
}

const SHEET_BOOK_NAMES: Record<string, string> = {
  betmgm: 'BetMGM',
  betrivers: 'BetRivers',
  caesars: 'Caesars',
  draftkings: 'DraftKings',
  espnbet: 'ESPN BET',
  fanduel: 'FanDuel',
  fanatics: 'Fanatics',
  hardrockbet: 'Hard Rock Bet',
  pointsbetus: 'PointsBet',
  williamhill_us: 'Caesars',
}

interface LineupPlayer {
  id: number
  name: string
}

interface SheetRow {
  player: string
  matchup: string
  line: number
  odds?: number
  book?: string
  season: number
  l10: number
  l5: number
  hitRate: string
  reason: string
  edge: { label: string; color: string; score: number }
}

function getStat(stats: Record<string, any> | undefined, field: string, prefix: 'season' | 'l10' | 'l5') {
  return stats?.[`${prefix}_${field}`] || 0
}

function hitRate(stats: Record<string, any> | undefined, field: string, line: number, count: number) {
  const rawKey = STAT_TO_RAW[field]
  const raw = stats?.raw_games
  if (!rawKey || !Array.isArray(raw) || raw.length === 0) return { label: '-', value: 0 }
  const sample = raw.slice(0, count)
  const hits = sample.filter((game: any) => (game[rawKey] || 0) > line).length
  return { label: `${hits}/${sample.length}`, value: sample.length ? hits / sample.length : 0 }
}

function edgeLabel(line: number, season: number, l10: number, l5: number, hitValue: number, odds?: number) {
  const safeLine = Math.max(line || 0, 0.5)
  const avgRatio = (season / safeLine) * 0.4 + ((l10 || season) / safeLine) * 0.25 + ((l5 || season) / safeLine) * 0.35
  const implied = odds && odds > 0 ? 100 / (odds + 100) : odds ? Math.abs(odds) / (Math.abs(odds) + 100) : 0.58
  const avgScore = Math.max(0, Math.min(45, ((avgRatio - 0.75) / 0.65) * 45))
  const hitScore = hitValue * 35
  const priceScore = implied <= 0.52 ? 20 : implied <= 0.58 ? 15 : implied <= 0.65 ? 9 : implied <= 0.72 ? 4 : 0
  const score = Math.round(avgScore + hitScore + priceScore)

  if (score >= 78) return { label: `Strong ${score}`, color: colors.gold, score }
  if (score >= 64) return { label: `Lean ${score}`, color: colors.green, score }
  if (score >= 45) return { label: `Neutral ${score}`, color: colors.textSecondary, score }
  return { label: `Fade ${score}`, color: colors.red, score }
}

function fmt(value: number) {
  return value ? value.toFixed(2) : '-'
}

function statColor(value: number, line: number) {
  if (!value) return colors.textMuted
  if (value > line * 1.15) return colors.green
  if (value >= line) return colors.yellow
  return colors.red
}

function sheetReason(sheetKey: SheetKey, row: { line: number; season: number; l10: number; l5: number; hitRate: string; odds?: number }) {
  const recent = row.l5 > row.season ? `L5 form (${fmt(row.l5)}) is above season pace (${fmt(row.season)})` : `season pace (${fmt(row.season)}) supports the line`
  const l5Hot = row.l5 > row.line
  const l10Hot = row.l10 > row.line
  const surge = row.l5 > row.l10 && row.l10 > row.season

  if (sheetKey === 'hr') {
    return row.l5 > row.season
      ? `Power trend is up, with recent form above season pace.`
      : `Power profile fits the card, with season form supporting the look.`
  }
  if (sheetKey === 'k') {
    return row.l10 > row.line
      ? `Recent K form clears this number.`
      : `Strikeout profile fits this number.`
  }
  if (sheetKey === 'hot') {
    if (surge) return `Heating up now: L5 (${fmt(row.l5)}) is ahead of L10 (${fmt(row.l10)}) and season pace.`
    if (l5Hot && l10Hot) return `Hot in both windows: L5 ${fmt(row.l5)} and L10 ${fmt(row.l10)} clear this line.`
    return `Recent form jump: ${recent}.`
  }
  if (sheetKey === 'tb') {
    return l5Hot
      ? `Last 5 total-base pace (${fmt(row.l5)}) clears this line.`
      : l10Hot
        ? `Last 10 total-base pace (${fmt(row.l10)}) clears this line.`
      : `Total-base profile fits this number.`
  }
  return row.hitRate !== '-'
    ? `L10 hit rate ${row.hitRate}; ${recent}.`
    : `${recent}.`
}

function bestOutcomes(game: Game, marketKey: string) {
  const map: Record<string, { player: string; line: number; odds?: number; book?: string }> = {}

  game.bookmakers?.forEach((bookmaker) => {
    if (!PROP_BOOK_KEYS.includes(bookmaker.key)) return
    const market = bookmaker.markets?.find((item) => item.key === marketKey)
    market?.outcomes?.forEach((outcome) => {
      if (!outcome.description || outcome.name !== 'Over') return
      if (typeof outcome.price !== 'number' || outcome.price > 700 || outcome.price < -10000) return
      const line = outcome.point || 0.5
      const key = `${outcome.description}-${line}`
      if (!map[key] || outcome.price > (map[key].odds || -10000)) {
        map[key] = {
          player: outcome.description,
          line,
          odds: outcome.price,
          book: SHEET_BOOK_NAMES[bookmaker.key] || BOOK_DISPLAY_NAMES[bookmaker.key] || bookmaker.key,
        }
      }
    })
  })

  return Object.values(map)
}

function buildRows(games: Game[], marketKey: string, statField: string, lineupMap: Record<string, LineupPlayer>, stats: Record<number, any>, sheetKey: SheetKey, trend = false) {
  const rows: SheetRow[] = []

  games.forEach((game) => {
    bestOutcomes(game, marketKey).forEach((outcome) => {
      const lineup = lineupMap[normalizeName(outcome.player)]
      const playerStats = lineup ? stats[lineup.id] : undefined
      const season = getStat(playerStats, statField, 'season')
      const l10 = getStat(playerStats, statField, 'l10')
      const l5 = getStat(playerStats, statField, 'l5')
      const hr = hitRate(playerStats, statField, outcome.line, 10)
      const edge = edgeLabel(outcome.line, season, l10, l5, hr.value, outcome.odds)
      const trendBoost = trend ? Math.max(0, l5 - season) * 12 : 0
      const boostedScore = Math.min(100, Math.round(edge.score + trendBoost))
      const boostedEdge = trend
        ? {
            score: boostedScore,
            label: boostedScore >= 78 ? `Strong ${boostedScore}` : boostedScore >= 64 ? `Lean ${boostedScore}` : boostedScore >= 45 ? `Neutral ${boostedScore}` : `Fade ${boostedScore}`,
            color: boostedScore >= 78 ? colors.gold : boostedScore >= 64 ? colors.green : boostedScore >= 45 ? colors.textSecondary : colors.red,
          }
        : edge

      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.odds,
        book: outcome.book,
        season,
        l10,
        l5,
        hitRate: hr.label,
        reason: sheetReason(sheetKey, { line: outcome.line, season, l10, l5, hitRate: hr.label, odds: outcome.odds }),
        edge: boostedEdge,
      })
    })
  })

  return rows
    .sort((a, b) => b.edge.score - a.edge.score)
    .slice(0, 30)
}

export default function CheatSheetsScreen() {
  const { profile } = useAuth()
  const mobileConfig = useMobileConfig()
  const isPremium = profile?.is_premium === true
  const [selectedKey, setSelectedKey] = useState<SheetKey | null>(null)
  const [generatedKey, setGeneratedKey] = useState<SheetKey | null>(null)
  const activeKey = generatedKey || selectedKey || 'hits'
  const activeSheet = SHEETS.find((sheet) => sheet.key === activeKey) || SHEETS[0]
  const hasGenerated = generatedKey !== null
  const canLoadData = isPremium && hasGenerated && activeKey !== 'bvp'

  const sheetQuery = useQuery({
    queryKey: ['cheat-sheet', activeSheet.type],
    queryFn: () => kingfishFetch<{ data: Game[] }>(`/api/statsheet-data?type=${activeSheet.type}`),
    enabled: canLoadData,
    staleTime: 30 * 60 * 1000,
  })
  const lineupsQuery = useQuery({
    queryKey: ['mlb-lineups-cheat-sheets'],
    queryFn: () => kingfishFetch<{ players: Record<string, LineupPlayer> }>('/api/mlb-lineups'),
    enabled: canLoadData && activeSheet.type !== 'lines',
    staleTime: 12 * 60 * 60 * 1000,
  })

  const playersToFetch = useMemo(() => {
    if (!activeSheet.market || !lineupsQuery.data?.players || !sheetQuery.data?.data) return { batters: [], pitchers: [] }
    const lineupMap = lineupsQuery.data.players
    const seen = new Set<number>()
    const batters: LineupPlayer[] = []
    const pitchers: LineupPlayer[] = []
    sheetQuery.data.data.forEach((game) => {
      bestOutcomes(game, activeSheet.market || '').forEach((outcome) => {
        const lineup = lineupMap[normalizeName(outcome.player)]
        if (!lineup || seen.has(lineup.id)) return
        seen.add(lineup.id)
        if (activeSheet.market?.startsWith('pitcher_')) pitchers.push(lineup)
        else batters.push(lineup)
      })
    })
    return { batters, pitchers }
  }, [activeSheet.market, lineupsQuery.data?.players, sheetQuery.data?.data])

  const statsQuery = useQuery({
    queryKey: ['cheat-sheet-stats', activeKey, playersToFetch.batters.map((item) => item.id).join(','), playersToFetch.pitchers.map((item) => item.id).join(',')],
    queryFn: () =>
      kingfishFetch<{ stats: Record<number, any> }>('/api/mlb-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playersToFetch),
      }),
    enabled: canLoadData && activeSheet.type !== 'lines' && (playersToFetch.batters.length > 0 || playersToFetch.pitchers.length > 0),
    staleTime: 12 * 60 * 60 * 1000,
  })

  const weatherQuery = useQuery({
    queryKey: ['cheat-sheet-weather', sheetQuery.data?.data?.map((game) => game.id || game.game_id).join(',')],
    queryFn: () =>
      kingfishFetch<Record<string, WeatherInfo>>('/api/mlb-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: sheetQuery.data?.data || [] }),
      }),
    enabled: canLoadData && activeKey === 'lines' && !!sheetQuery.data?.data?.length,
    staleTime: 60 * 60 * 1000,
  })

  const rows = activeSheet.market && activeSheet.statField && lineupsQuery.data?.players && statsQuery.data?.stats && sheetQuery.data?.data
    ? buildRows(sheetQuery.data.data, activeSheet.market, activeSheet.statField, lineupsQuery.data.players, statsQuery.data.stats, activeKey, activeSheet.trend)
    : []

  return (
    <Screen>
      <AppText variant="eyebrow">// MLB Reports</AppText>
      <AppText variant="title" style={styles.title}>Cheat Sheets</AppText>
      <AppText variant="muted" style={styles.copy}>
        Premium reports built for quick reads: top props, hot trends, strikeout targets, and game-line context.
      </AppText>

      {!isPremium ? (
        <Card>
          <AppText variant="eyebrow">// Premium</AppText>
          <AppText style={styles.cardTitle}>Unlock Cheat Sheets</AppText>
          <AppText variant="muted" style={styles.cardCopy}>
            Cheat Sheets, player props, Edge Scores, and unlimited Ask KingFish access are part of KingFish Bets Pro.
          </AppText>
          <View style={styles.action}>
            {mobileConfig.flags.mobile_paywall ? (
              <Button onPress={() => router.push('/modals/paywall')}>View Premium</Button>
            ) : null}
          </View>
        </Card>
      ) : !hasGenerated ? (
        <>
          {selectedKey && (
            <Card>
              <AppText variant="eyebrow">// Selected Report</AppText>
              <AppText style={styles.cardTitle}>{activeSheet.label}</AppText>
              <AppText variant="muted" style={styles.cardCopy}>{activeSheet.desc}</AppText>
              <View style={styles.action}>
                <Button onPress={() => setGeneratedKey(selectedKey)}>Generate Sheet</Button>
              </View>
            </Card>
          )}

          <View style={styles.sheetGrid}>
            {SHEETS.map((sheet) => (
              <Pressable
                key={sheet.key}
                onPress={() => setSelectedKey(sheet.key)}
                style={[styles.sheetTile, selectedKey === sheet.key && styles.sheetTileActive]}
              >
                <AppText variant="eyebrow">// MLB</AppText>
                <AppText style={[styles.sheetTileTitle, selectedKey === sheet.key && styles.sheetTileTitleActive]}>{sheet.label}</AppText>
                <AppText variant="muted" style={styles.sheetTileCopy} numberOfLines={3}>{sheet.desc}</AppText>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.reportHeader}>
            <Pressable
              onPress={() => {
                setGeneratedKey(null)
                setSelectedKey(null)
              }}
              style={styles.backButton}
            >
              <AppText style={styles.backButtonText}>All Sheets</AppText>
            </Pressable>
            <AppText variant="eyebrow">// Generated</AppText>
          </View>

          <Card>
            <View style={styles.reportTitleRow}>
              <View style={styles.reportTitleWrap}>
                <AppText variant="eyebrow">// {activeSheet.label}</AppText>
                <AppText style={styles.reportTitle}>{activeSheet.label}</AppText>
              </View>
              <AppText style={styles.reportDate}>
                {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </AppText>
            </View>
            <AppText variant="muted" style={styles.reportCopy}>{activeSheet.desc}</AppText>

          {(sheetQuery.isLoading || lineupsQuery.isLoading || statsQuery.isLoading) && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted">Building cheat sheet...</AppText>
            </View>
          )}

          {sheetQuery.isError && (
            <Card>
              <AppText variant="eyebrow">// Error</AppText>
              <AppText variant="muted" style={styles.errorText}>
                {sheetQuery.error instanceof Error ? sheetQuery.error.message : 'Could not load this sheet.'}
              </AppText>
            </Card>
          )}

          {activeKey === 'bvp' && (
              <AppText variant="muted" style={styles.cardCopy}>
                This report needs today's confirmed starters and head-to-head history. It is next in the cheat-sheet build.
              </AppText>
          )}

          {activeKey === 'lines' && (
            <View style={styles.linePreview}>
              {sheetQuery.data?.data?.slice(0, 3).map((game) => (
                <GameLineCard
                  key={game.id || game.game_id || `${game.away_team}-${game.home_team}`}
                  game={game}
                  weather={weatherQuery.data?.[game.id || game.game_id || '']}
                />
              ))}
            </View>
          )}

          {activeKey !== 'lines' && activeKey !== 'bvp' && rows.length > 0 && (
            <View style={styles.reportRows}>
              {rows.slice(0, 6).map((row, index) => (
                <View key={`${row.player}-${row.line}-${index}`} style={styles.reportRow}>
                  <View style={styles.rankBadge}>
                    <AppText style={styles.rankText}>{index + 1}</AppText>
                  </View>
                  <View style={styles.rowMain}>
                    <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
                    <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                      {row.matchup}
                    </AppText>
                    {activeKey === 'k' && (
                      <AppText style={styles.pickLine}>Over {row.line} Strikeouts</AppText>
                    )}
                    <AppText style={styles.reasonText}>
                      {row.reason}
                    </AppText>
                  </View>
                  <View style={styles.rowNumbers}>
                    <AppText style={styles.compactOdds}>{row.odds ? fmtOdds(row.odds) : '-'} {row.book || ''}</AppText>
                  </View>
                </View>
              ))}
            </View>
          )}
          </Card>
        </>
      )}
    </Screen>
  )
}

function Metric({ label, value, color = colors.textPrimary }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="eyebrow">{label}</AppText>
      <AppText style={[styles.metricValue, { color }]}>{value}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  copy: { marginTop: 10, marginBottom: spacing.xl },
  cardTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  cardCopy: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sheetTile: {
    width: '47%',
    minHeight: 154,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  sheetTileActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.14)',
  },
  sheetTileTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 20, lineHeight: 24 },
  sheetTileTitleActive: { color: colors.gold },
  sheetTileCopy: { marginTop: spacing.sm, fontSize: 13, lineHeight: 18 },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.bgCardAlt,
  },
  backButtonText: { color: colors.gold, fontWeight: '900' },
  reportTitleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  reportTitleWrap: { flex: 1 },
  reportTitle: { marginTop: 4, fontSize: 30, lineHeight: 34, fontWeight: '900' },
  reportDate: { color: colors.textSecondary, fontWeight: '900' },
  reportCopy: { marginTop: spacing.sm, marginBottom: spacing.md },
  loading: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  errorText: { color: colors.red, marginTop: spacing.sm },
  linePreview: { gap: spacing.md, marginTop: spacing.md },
  reportRows: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(198,145,50,.18)',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.55)',
  },
  rankText: { color: colors.gold, fontWeight: '900' },
  rowMain: { flex: 1, minWidth: 0 },
  compactPlayer: { fontSize: 17, lineHeight: 21, fontWeight: '900' },
  compactMeta: { marginTop: 3, color: colors.textSecondary, fontSize: 11 },
  pickLine: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.55)',
    borderRadius: 999,
    backgroundColor: 'rgba(198,145,50,.12)',
    color: colors.gold,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  reasonText: { marginTop: 6, color: colors.textPrimary, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  rowNumbers: { alignItems: 'flex-end', minWidth: 72 },
  compactEdge: { fontSize: 22, lineHeight: 26, fontWeight: '900' },
  compactOdds: { marginTop: 2, color: colors.gold, fontSize: 12, fontWeight: '900' },
  rows: { gap: spacing.md, marginTop: spacing.lg },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  edgeText: { fontSize: 15, fontWeight: '900' },
  player: { marginTop: spacing.sm, fontSize: 22, fontWeight: '900' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  metric: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  metricValue: { marginTop: 4, fontSize: 17, fontWeight: '900' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  bestOdds: { color: colors.gold, fontWeight: '900' },
})
