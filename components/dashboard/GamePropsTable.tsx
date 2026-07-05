/**
 * Game Props — the dense per-sport game-lines table, mirroring the web
 * dashboard's 2026-07-02 swap (dashboard "Game Lines" cards → "Game Props"
 * table; the card-based value view now lives in the Game Lines tool).
 *
 * Every derived number here is SERVER-COMPUTED and read off the odds payload
 * (CLAUDE.md "Calculated scores live on the web"): kingfishLean (ML lean +
 * grade split), kingfishEdge (edge label/score), kingfishTotalLean. This
 * component only extracts best-book PRICES (raw market data, passthrough)
 * and renders — it computes no verdicts of its own.
 *
 * Layout is per-device (iPhone no iPad polish): `compact` drops the price
 * columns down to the decision set (Matchup / Lean / Edge / Grade / Total)
 * for phone portrait; full mode carries the whole board for iPad/Mac and
 * phone landscape.
 */
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/Text'
import { fmtOdds } from '@/lib/format'
import { supportedBookmakers, type SportsbookPreferences } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, Sport, WeatherInfo } from '@/types'

type BestLine = { book: string; price: number; point?: number } | null
type SortKey = 'time' | 'edge' | 'grade' | 'total'

const BOOK_SHORT: Record<string, string> = {
  fanduel: 'FD', draftkings: 'DK', betmgm: 'MGM', betrivers: 'BR',
  williamhill_us: 'CZR', espnbet: 'ESPN', hardrockbet: 'HR',
  hardrockbet_az: 'HR', hardrockbet_fl: 'HR', hardrockbet_oh: 'HR',
}

function spreadLabel(sport: Sport) {
  if (sport === 'MLB' || sport === 'KBO') return 'Run Line'
  if (sport === 'NHL') return 'Puck Line'
  return 'Spread'
}

function fmtPoint(point?: number) {
  if (point === undefined || point === null || Number.isNaN(Number(point))) return ''
  const n = Number(point)
  return `${n > 0 ? '+' : ''}${n}`
}

function fmtTimeCT(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' })
}

function pickBest<T extends { price: number }>(items: T[]): T | null {
  return items.reduce<T | null>((best, item) => (!best || item.price > best.price ? item : best), null)
}

// Best available ML / spread / total per side across the user's eligible
// books — same extraction as the web Game Props table / Value Finder.
export function gameMarkets(game: Game, userState?: string | null, preferences?: SportsbookPreferences | null) {
  const ml: Array<{ book: string; home: number; away: number; draw?: number }> = []
  const spread: Array<{ book: string; home: number; away: number; homePoint?: number; awayPoint?: number }> = []
  const tot: Array<{ book: string; over: number; under: number; point: number }> = []
  supportedBookmakers(game.bookmakers, userState, preferences).forEach((bm) => {
    bm.markets?.forEach((m) => {
      if (m.key === 'h2h') {
        const home = m.outcomes.find((o) => o.name === game.home_team)?.price
        const away = m.outcomes.find((o) => o.name === game.away_team)?.price
        const draw = m.outcomes.find((o) => o.name === 'Draw')?.price
        if (home && away) ml.push({ book: bm.key, home, away, draw })
      }
      if (m.key === 'totals') {
        const ov = m.outcomes.find((o) => o.name === 'Over')
        const un = m.outcomes.find((o) => o.name === 'Under')
        if (ov && un && typeof ov.point === 'number') tot.push({ book: bm.key, over: ov.price, under: un.price, point: ov.point })
      }
      if (m.key === 'spreads') {
        const home = m.outcomes.find((o) => o.name === game.home_team)
        const away = m.outcomes.find((o) => o.name === game.away_team)
        if (home && away) spread.push({ book: bm.key, home: home.price, away: away.price, homePoint: home.point, awayPoint: away.point })
      }
    })
  })
  return {
    bestAwayMoneyline: pickBest(ml.map((l) => ({ book: l.book, price: l.away }))) as BestLine,
    bestHomeMoneyline: pickBest(ml.map((l) => ({ book: l.book, price: l.home }))) as BestLine,
    bestDraw: pickBest(ml.filter((l) => typeof l.draw === 'number').map((l) => ({ book: l.book, price: l.draw as number }))) as BestLine,
    bestAwaySpread: pickBest(spread.map((l) => ({ book: l.book, price: l.away, point: l.awayPoint }))) as BestLine,
    bestHomeSpread: pickBest(spread.map((l) => ({ book: l.book, price: l.home, point: l.homePoint }))) as BestLine,
    bestOverTotal: pickBest(tot.map((l) => ({ book: l.book, price: l.over, point: l.point }))) as BestLine,
    bestUnderTotal: pickBest(tot.map((l) => ({ book: l.book, price: l.under, point: l.point }))) as BestLine,
  }
}

function serverLean(game: Game) {
  return (game as any).kingfishLean as { side?: string; type?: string; detail?: string; grade_for?: number; grade_against?: number } | undefined
}
function serverEdge(game: Game) {
  return (game as any).kingfishEdge as { score?: number; label?: string; drivers?: string[] } | undefined
}
function serverTotalLean(game: Game) {
  return (game as any).kingfishTotalLean as { label?: string; type?: string; detail?: string } | undefined
}

function edgeColor(score?: number) {
  const n = Number(score)
  if (!Number.isFinite(n)) return colors.textSecondary
  return n >= 75 ? colors.green : n >= 60 ? colors.gold : colors.textSecondary
}

function PriceCell({ line, flex = 1 }: { line: BestLine; flex?: number }) {
  return (
    <View style={[styles.cell, { flex }]}>
      {line ? (
        <View style={styles.priceWrap}>
          <AppText variant="mono" style={styles.priceText}>{fmtOdds(line.price)}</AppText>
          <AppText style={styles.bookText}>{BOOK_SHORT[line.book] || line.book}</AppText>
        </View>
      ) : (
        <AppText variant="mono" style={styles.emptyText}>—</AppText>
      )}
    </View>
  )
}

function SpreadCell({ awayAbbr, homeAbbr, away, home, flex = 1.6 }: { awayAbbr: string; homeAbbr: string; away: BestLine; home: BestLine; flex?: number }) {
  const half = (abbr: string, line: BestLine) => (
    <View style={styles.spreadHalf}>
      <AppText variant="mono" style={styles.spreadAbbr}>{abbr}</AppText>
      {line ? (
        <AppText variant="mono" style={styles.spreadText} numberOfLines={1}>
          {fmtPoint(line.point)} <AppText variant="mono" style={styles.priceText}>{fmtOdds(line.price)}</AppText>
        </AppText>
      ) : (
        <AppText variant="mono" style={styles.emptyText}>—</AppText>
      )}
    </View>
  )
  return (
    <View style={[styles.cell, { flex }]}>
      {half(awayAbbr, away)}
      {half(homeAbbr, home)}
    </View>
  )
}

function shortName(team: string) {
  return String(team || '').split(' ').pop() || team
}

export function GamePropsTable({
  games,
  sport,
  userState,
  sportsbookPreferences,
  weather,
  compact = false,
  onPressMatchup,
}: {
  games: Game[]
  sport: Sport
  userState?: string | null
  sportsbookPreferences?: SportsbookPreferences | null
  weather?: Record<string, WeatherInfo | undefined>
  compact?: boolean
  onPressMatchup?: (game: Game) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('time')
  const [sortDesc, setSortDesc] = useState(false)

  const rows = useMemo(() => {
    const mapped = games.map((game) => ({ game, mk: gameMarkets(game, userState, sportsbookPreferences) }))
    const val = ({ game, mk }: (typeof mapped)[number]) => {
      if (sortKey === 'edge') return Number(serverEdge(game)?.score ?? -1)
      if (sortKey === 'grade') return Number(serverLean(game)?.grade_for ?? -1)
      if (sortKey === 'total') return Number(mk.bestOverTotal?.point ?? mk.bestUnderTotal?.point ?? -1)
      return new Date(game.commence_time).getTime()
    }
    mapped.sort((a, b) => (sortDesc ? val(b) - val(a) : val(a) - val(b)))
    return mapped
  }, [games, sortKey, sortDesc, userState, sportsbookPreferences])

  function toggleSort(next: SortKey) {
    if (sortKey === next) setSortDesc((d) => !d)
    else { setSortKey(next); setSortDesc(next !== 'time') }
  }

  const showWeather = !compact && (sport === 'MLB' || sport === 'NFL') && !!weather

  const Header = ({ label, target, flex, align = 'center' }: { label: string; target?: SortKey; flex: number; align?: 'left' | 'center' }) => (
    <Pressable disabled={!target} onPress={() => target && toggleSort(target)} style={[styles.cell, { flex, alignItems: align === 'left' ? 'flex-start' : 'center' }]}>
      <AppText variant="eyebrow" style={[styles.headerText, target && sortKey === target && styles.headerActive]} numberOfLines={1}>
        {label}{target && sortKey === target ? (sortDesc ? ' ↓' : ' ↑') : ''}
      </AppText>
    </Pressable>
  )

  return (
    <View style={styles.table}>
      <View style={styles.headerRow}>
        <Header label="Matchup" flex={compact ? 2.6 : 2.4} align="left" />
        {!compact && <Header label="Time CT" target="time" flex={1} />}
        {showWeather && <Header label="Weather" flex={1.1} />}
        <Header label="ML Lean" flex={compact ? 1.4 : 1.3} />
        <Header label="Edge" target="edge" flex={1.1} />
        <Header label="Grade" target="grade" flex={1} />
        {!compact && <Header label="Away ML" flex={1} />}
        {!compact && <Header label="Home ML" flex={1} />}
        {!compact && <Header label={spreadLabel(sport)} flex={1.6} />}
        <Header label="O/U" target="total" flex={0.8} />
        <Header label="Total Lean" flex={compact ? 1.4 : 1.3} />
        {!compact && <Header label="Over" flex={1} />}
        {!compact && <Header label="Under" flex={1} />}
      </View>

      {rows.map(({ game, mk }) => {
        const lean = serverLean(game)
        const edge = serverEdge(game)
        const totalLean = serverTotalLean(game)
        const wx = weather?.[String((game as any).id || (game as any).game_id || '')]
        const noTotalLean = String(totalLean?.label || '').startsWith('Near')
        return (
          <Pressable
            key={(game as any).id || (game as any).game_id || `${game.away_team}-${game.home_team}`}
            onPress={onPressMatchup ? () => onPressMatchup(game) : undefined}
            style={styles.row}
          >
            <View style={[styles.cell, { flex: compact ? 2.6 : 2.4, alignItems: 'flex-start' }]}>
              <AppText style={styles.matchupText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {shortName(game.away_team)} @ {shortName(game.home_team)}
              </AppText>
              {compact && <AppText variant="mono" style={styles.subText}>{fmtTimeCT(game.commence_time)} CT</AppText>}
            </View>
            {!compact && (
              <View style={[styles.cell, { flex: 1 }]}>
                <AppText variant="mono" style={styles.subText}>{fmtTimeCT(game.commence_time)}</AppText>
              </View>
            )}
            {showWeather && (
              <View style={[styles.cell, { flex: 1.1 }]}>
                <AppText variant="mono" style={styles.subText} numberOfLines={1}>
                  {wx ? `${wx.tempF}°F ${wx.windStr || ''}`.trim() : '—'}
                </AppText>
              </View>
            )}
            <View style={[styles.cell, { flex: compact ? 1.4 : 1.3 }]}>
              {lean?.side
                ? <AppText style={styles.leanText} numberOfLines={2}>{lean.side}</AppText>
                : <AppText variant="mono" style={styles.emptyText}>—</AppText>}
            </View>
            <View style={[styles.cell, { flex: 1.1 }]}>
              <AppText variant="mono" style={[styles.edgeText, { color: edgeColor(edge?.score) }]} numberOfLines={1}>
                {edge?.label || '—'}
              </AppText>
            </View>
            <View style={[styles.cell, { flex: 1 }]}>
              {lean && lean.grade_for != null && lean.grade_against != null
                ? <AppText variant="mono" style={styles.gradeText}>{lean.grade_for}-{lean.grade_against}</AppText>
                : <AppText variant="mono" style={styles.emptyText}>—</AppText>}
            </View>
            {!compact && <PriceCell line={mk.bestAwayMoneyline} />}
            {!compact && <PriceCell line={mk.bestHomeMoneyline} />}
            {!compact && (
              <SpreadCell
                awayAbbr={shortName(game.away_team).slice(0, 3).toUpperCase()}
                homeAbbr={shortName(game.home_team).slice(0, 3).toUpperCase()}
                away={mk.bestAwaySpread}
                home={mk.bestHomeSpread}
              />
            )}
            <View style={[styles.cell, { flex: 0.8 }]}>
              <AppText variant="mono" style={styles.totalText}>{mk.bestOverTotal?.point ?? mk.bestUnderTotal?.point ?? '—'}</AppText>
            </View>
            <View style={[styles.cell, { flex: compact ? 1.4 : 1.3 }]}>
              {totalLean?.label && !noTotalLean
                ? <AppText style={styles.leanText} numberOfLines={2}>{totalLean.label}</AppText>
                : <AppText variant="mono" style={styles.emptyText}>{totalLean ? 'No Lean' : '—'}</AppText>}
            </View>
            {!compact && <PriceCell line={mk.bestOverTotal} />}
            {!compact && <PriceCell line={mk.bestUnderTotal} />}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
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
  cell: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  headerText: { fontSize: 9 },
  headerActive: { color: colors.gold },
  matchupText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  subText: { fontSize: 11, color: colors.textSecondary },
  leanText: { fontSize: 12, fontWeight: '600', color: colors.gold, textAlign: 'center' },
  edgeText: { fontSize: 12, fontWeight: '700' },
  gradeText: { fontSize: 12, fontWeight: '700', color: colors.gold },
  totalText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  priceWrap: { alignItems: 'center' },
  priceText: { fontSize: 12, fontWeight: '700', color: colors.gold },
  bookText: { fontSize: 8, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  spreadHalf: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 1 },
  spreadAbbr: { fontSize: 10, color: colors.textSecondary, width: 30 },
  spreadText: { fontSize: 11, color: colors.textPrimary },
  emptyText: { fontSize: 12, color: colors.textMuted },
})
