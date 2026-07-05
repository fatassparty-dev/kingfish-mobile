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
  // PM is implied (nearly every US slate is afternoon/evening) — only the
  // rare morning start (European soccer) keeps its AM tag.
  // \s (not a literal space) — newer ICU separates "PM" with U+202F narrow
  // no-break space, which a plain ' PM' replace silently misses.
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' }).replace(/\s*PM$/i, '')
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

// A true yellow for the Edge tier / lopsided-grade highlight — theme's
// `yellow` (#E8AF3C) is literally the goldLight tone and reads as more gold
// next to the gold prices (Brian, 2026-07-05).
const EDGE_YELLOW = '#F5D04C'

function edgeColor(score?: number) {
  const n = Number(score)
  if (!Number.isFinite(n)) return colors.textSecondary
  return n >= 75 ? colors.green : n >= 60 ? EDGE_YELLOW : colors.textSecondary
}

// The column header already says "ML Lean" — the trailing " ML" is doubled
// context, and the city is implied by the matchup column, so "Atlanta Braves
// ML" renders as just "Braves" (same last-word rule as the matchup names).
function leanSideDisplay(side?: string) {
  const noMl = String(side || '').replace(/\s+ML$/i, '').trim()
  const nickname = noMl.split(' ').pop() || noMl
  // One line, no silly mid-word wraps ("Athletic\ns"): long nicknames fall
  // back to the same 3-letter code the Run Line column already uses (GUA/DIA).
  return nickname.length > 8 ? nickname.slice(0, 3).toUpperCase() : nickname
}

// Compact (phone-portrait) Edge shows just the tier word ("Lean", "Strong",
// "Fade", "Neutral") — actionable and fits; the precise score stays for the
// full landscape/iPad label. Strips the trailing number off "Lean 64.1".
function edgeTier(label: string) {
  return String(label || '').replace(/\s*[\d.]+\s*$/, '').trim() || label
}

// Grade renders neutral unless the split is lopsided by a ton — a 55-45 isn't
// a call worth color; a 65-35 is.
function gradeColor(gradeFor?: number, gradeAgainst?: number) {
  const f = Number(gradeFor)
  const a = Number(gradeAgainst)
  if (Number.isFinite(f) && Number.isFinite(a) && f - a >= 20) return EDGE_YELLOW
  return colors.textPrimary
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

function SpreadCell({ awayAbbr, homeAbbr, away, home, flex = 1.8 }: { awayAbbr: string; homeAbbr: string; away: BestLine; home: BestLine; flex?: number }) {
  const half = (abbr: string, line: BestLine) => (
    <View style={styles.spreadHalf}>
      <AppText variant="mono" style={styles.spreadAbbr} numberOfLines={1}>{abbr}</AppText>
      {line ? (
        <AppText variant="mono" style={styles.spreadText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {fmtPoint(line.point)} {fmtOdds(line.price)}
        </AppText>
      ) : (
        <AppText variant="mono" style={styles.emptyText}>—</AppText>
      )}
    </View>
  )
  return (
    <View style={[styles.cell, { flex, overflow: 'hidden' }]}>
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
      {/* Edge lives at the FAR RIGHT, player-props style — it's the verdict,
          the thing your eye should land on last. Matchup stacks away-over-home
          so the headers fit without truncating. */}
      <View style={styles.headerRow}>
        <Header label="Matchup" flex={compact ? 1.9 : 1.7} align="left" />
        {!compact && <Header label="Time" target="time" flex={0.9} />}
        {showWeather && <Header label="Wthr" flex={0.9} />}
        <Header label="ML Lean" flex={1.2} />
        {!compact && <Header label="Grade" target="grade" flex={0.9} />}
        {!compact && <Header label="Away" flex={1} />}
        {!compact && <Header label="Home" flex={1} />}
        {!compact && <Header label={spreadLabel(sport)} flex={1.8} />}
        <Header label="O/U" target="total" flex={0.8} />
        <Header label="Total" flex={compact ? 1 : 0.9} />
        {!compact && <Header label="Over" flex={1} />}
        {!compact && <Header label="Under" flex={1} />}
        <Header label="Edge" target="edge" flex={1.2} />
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
            <View style={[styles.cell, { flex: compact ? 1.9 : 1.7, alignItems: 'flex-start' }]}>
              {/* Away-over-home stack — buys back the width one long line ate. */}
              <AppText style={styles.matchupText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {shortName(game.away_team)} @
              </AppText>
              <AppText style={styles.matchupText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {shortName(game.home_team)}
              </AppText>
              {compact && <AppText variant="mono" style={styles.subText}>{fmtTimeCT(game.commence_time)} CT</AppText>}
            </View>
            {!compact && (
              <View style={[styles.cell, { flex: 0.9 }]}>
                <AppText variant="mono" style={styles.subText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{fmtTimeCT(game.commence_time)}</AppText>
              </View>
            )}
            {showWeather && (
              <View style={[styles.cell, { flex: 0.9 }]}>
                {/* Temp only — the wind string never fit this column (it's the
                    "100°…" dots); wind context lives on the matchup card. */}
                <AppText variant="mono" style={styles.subText} numberOfLines={1}>
                  {wx && wx.tempF != null ? `${wx.tempF}°` : '—'}
                </AppText>
              </View>
            )}
            <View style={[styles.cell, { flex: 1.2 }]}>
              {lean?.side
                ? <AppText style={styles.leanText} numberOfLines={1}>{leanSideDisplay(lean.side)}</AppText>
                : <AppText variant="mono" style={styles.emptyText}>—</AppText>}
            </View>
            {!compact && (
              <View style={[styles.cell, { flex: 0.9 }]}>
                {lean && lean.grade_for != null && lean.grade_against != null
                  ? <AppText variant="mono" style={[styles.gradeText, { color: gradeColor(lean.grade_for, lean.grade_against) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{lean.grade_for}-{lean.grade_against}</AppText>
                  : <AppText variant="mono" style={styles.emptyText}>—</AppText>}
              </View>
            )}
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
            <View style={[styles.cell, { flex: 0.8, overflow: 'hidden' }]}>
              <AppText variant="mono" style={styles.totalText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{mk.bestOverTotal?.point ?? mk.bestUnderTotal?.point ?? '—'}</AppText>
            </View>
            <View style={[styles.cell, { flex: compact ? 1 : 0.9 }]}>
              {/* Direction ONLY — the O/U column next door carries the number,
                  and a lean tile never doubles it (no-doubled-data rule). */}
              {totalLean?.label && !noTotalLean
                ? <AppText style={styles.leanText} numberOfLines={1}>{String(totalLean.label).split(' ')[0]}</AppText>
                : <AppText variant="mono" style={styles.emptyText}>{totalLean ? 'No Lean' : '—'}</AppText>}
            </View>
            {!compact && <PriceCell line={mk.bestOverTotal} />}
            {!compact && <PriceCell line={mk.bestUnderTotal} />}
            <View style={[styles.cell, { flex: 1.2 }]}>
              {edge?.label ? (
                // Player-props-style verdict cell: big bold score, tier under it.
                <>
                  <AppText variant="mono" style={[styles.edgeScoreBig, { color: edgeColor(edge.score) }]} numberOfLines={1}>
                    {Number.isFinite(Number(edge.score)) ? Math.round(Number(edge.score)) : '—'}
                  </AppText>
                  <AppText style={[styles.edgeTierSmall, { color: edgeColor(edge.score) }]} numberOfLines={1}>
                    {edgeTier(edge.label)}
                  </AppText>
                </>
              ) : (
                <AppText variant="mono" style={styles.emptyText}>—</AppText>
              )}
            </View>
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
  headerText: { fontSize: 9, letterSpacing: 0.4 },
  headerActive: { color: colors.gold },
  matchupText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  subText: { fontSize: 11, color: colors.textSecondary },
  leanText: { fontSize: 12, fontWeight: '600', color: colors.gold, textAlign: 'center' },
  edgeScoreBig: { fontSize: 17, fontWeight: '900' },
  edgeTierSmall: { fontSize: 10, fontWeight: '800' },
  gradeText: { fontSize: 12, fontWeight: '700' },
  totalText: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  priceWrap: { alignItems: 'center' },
  priceText: { fontSize: 12, fontWeight: '700', color: colors.gold },
  bookText: { fontSize: 8, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  spreadHalf: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 1, alignSelf: 'stretch', justifyContent: 'center' },
  spreadAbbr: { fontSize: 10, color: colors.textSecondary, width: 26 },
  spreadText: { fontSize: 10, color: colors.gold, fontWeight: '700', flexShrink: 1 },
  emptyText: { fontSize: 12, color: colors.textMuted },
})
