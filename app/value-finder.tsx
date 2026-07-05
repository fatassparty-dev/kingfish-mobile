/**
 * Game Lines — the Value Finder Pro Tool (mirrors web /value-finder, added to
 * web 2026-07-02 when the dashboard tab became the Game Props table).
 *
 * Finds the mispriced side of every game: each card shows the server-computed
 * KingFish lean(s) plus the best available Moneyline / Spread / Total across
 * the user's eligible books. All verdicts (kingfishLean / kingfishTotalLean)
 * are SERVER-COMPUTED on the odds payload (CLAUDE.md "Calculated scores live
 * on the web") — this screen renders them, never recomputes. Lean tiles show
 * the verdict ONLY (no price/book — the no-doubled-data rule); odds live
 * solely in the market sections.
 *
 * Phone layout: single-column cards (a dense table never works at phone
 * width); iPad/Mac get the two-column grid in kingfish-studio's copy.
 * Gated like the other Pro Tools: premium OR the pro_tools_free promo flag.
 */
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { gameMarkets } from '@/components/dashboard/GamePropsTable'
import { useAuth } from '@/lib/auth'
import { useMobileConfig } from '@/lib/mobileConfig'
import { kingfishFetch } from '@/lib/api'
import { fmtOdds } from '@/lib/format'
import { displayBookName } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game } from '@/types'

// Same order as the web tool's sport tab row.
const SPORT_TABS = [
  { key: 'MLB', path: '/api/mlb-odds' },
  { key: 'NFL', path: '/api/nfl-odds' },
  { key: 'Soccer', path: '/api/soccer-odds' },
  { key: 'WNBA', path: '/api/wnba-odds' },
  { key: 'KBO', path: '/api/kbo-odds' },
  { key: 'NCAAF', path: '/api/ncaaf-odds' },
  { key: 'NCAAB', path: '/api/ncaab-odds' },
  { key: 'NBA', path: '/api/nba-odds' },
  { key: 'NHL', path: '/api/nhl-odds' },
] as const
type SportTabKey = (typeof SPORT_TABS)[number]['key']

const SOCCER_LEAGUES = [
  { key: 'soccer_fifa_world_cup', label: 'World Cup' },
  { key: 'soccer_epl', label: 'Premier League' },
  { key: 'soccer_usa_mls', label: 'MLS' },
  { key: 'soccer_spain_la_liga', label: 'La Liga' },
  { key: 'soccer_italy_serie_a', label: 'Serie A' },
  { key: 'soccer_germany_bundesliga', label: 'Bundesliga' },
  { key: 'soccer_france_ligue_one', label: 'Ligue 1' },
  { key: 'soccer_uefa_champs_league', label: 'Champions League' },
]

// Strongest lean first, then start time — same ordering as the web tool.
const LEAN_ORDER: Record<string, number> = { 'Strong Lean': 0, 'Lean': 1, 'Slight Lean': 2, 'Tossup': 3 }

function spreadTitle(sport: SportTabKey) {
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

function shortName(team: string) {
  return String(team || '').split(' ').pop() || team
}

type BestLine = { book: string; price: number; point?: number } | null

function MarketRow({ label, point, line }: { label: string; point?: number; line: BestLine }) {
  return (
    <View style={styles.marketRow}>
      <View style={styles.marketLabelWrap}>
        <AppText style={styles.marketTeam} numberOfLines={1}>{label}</AppText>
        {point !== undefined && point !== null && <AppText variant="mono" style={styles.marketPoint}>{fmtPoint(point)}</AppText>}
      </View>
      {line ? (
        <View style={styles.marketValueWrap}>
          <AppText variant="mono" style={styles.marketPrice}>{fmtOdds(line.price)}</AppText>
          <AppText style={styles.marketBook}>{displayBookName(line.book)}</AppText>
        </View>
      ) : (
        <AppText variant="mono" style={styles.marketEmpty}>—</AppText>
      )}
    </View>
  )
}

function LeanTile({ label, side, detail }: { label: string; side: string; detail?: string }) {
  return (
    <View style={styles.leanTile}>
      <AppText style={styles.leanLabel}>{label}</AppText>
      <AppText style={styles.leanSide}>{side}</AppText>
      {detail ? <AppText style={styles.leanDetail}>{detail}</AppText> : null}
      {/* Verdict only — no price/book on a lean tile (no-doubled-data rule);
          odds live solely in the market sections below. */}
    </View>
  )
}

function ValueCard({ game, sport, userState, sportsbookPreferences }: {
  game: Game
  sport: SportTabKey
  userState?: string | null
  sportsbookPreferences?: any
}) {
  const mk = gameMarkets(game, userState, sportsbookPreferences)
  const lean = (game as any).kingfishLean as { side?: string; type?: string; detail?: string } | undefined
  const totalLean = (game as any).kingfishTotalLean as { label?: string; type?: string; detail?: string } | undefined
  const away = shortName(game.away_team)
  const home = shortName(game.home_team)
  const noTotalLean = String(totalLean?.label || '').startsWith('Near')
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <AppText variant="mono" style={styles.cardTime}>🕐 {fmtTimeCT(game.commence_time)} CT</AppText>
        <View style={styles.matchupRow}>
          <AppText style={styles.teamName} numberOfLines={1}>{away}</AppText>
          <AppText variant="mono" style={styles.atText}>@</AppText>
          <AppText style={[styles.teamName, styles.teamHome]} numberOfLines={1}>{home}</AppText>
        </View>
      </View>

      {lean?.side ? <LeanTile label={`KingFish ${lean.type || 'Lean'}`} side={lean.side} detail={lean.detail} /> : null}
      {totalLean?.label && !noTotalLean ? <LeanTile label={`KingFish ${totalLean.type || 'Lean'}`} side={totalLean.label} detail={totalLean.detail} /> : null}

      <View style={styles.markets}>
        <View style={styles.marketCard}>
          <AppText style={styles.marketTitle}>Moneyline</AppText>
          <MarketRow label={away} line={mk.bestAwayMoneyline} />
          <MarketRow label={home} line={mk.bestHomeMoneyline} />
          {mk.bestDraw ? <MarketRow label="Draw" line={mk.bestDraw} /> : null}
        </View>
        <View style={styles.marketCard}>
          <AppText style={styles.marketTitle}>{spreadTitle(sport)}</AppText>
          <MarketRow label={away} point={mk.bestAwaySpread?.point} line={mk.bestAwaySpread} />
          <MarketRow label={home} point={mk.bestHomeSpread?.point} line={mk.bestHomeSpread} />
        </View>
        <View style={styles.marketCard}>
          <AppText style={styles.marketTitle}>Total</AppText>
          <MarketRow label={`Over ${mk.bestOverTotal?.point ?? ''}`.trim()} line={mk.bestOverTotal} />
          <MarketRow label={`Under ${mk.bestUnderTotal?.point ?? ''}`.trim()} line={mk.bestUnderTotal} />
        </View>
      </View>
    </View>
  )
}

export default function ValueFinderScreen() {
  const { profile, session } = useAuth()
  const mobileConfig = useMobileConfig()
  const isLoggedIn = Boolean(session)
  // Premium OR the "Free Access: Pro Tools" promo unlocks the tool — same
  // gate as web's pro_tools_free. Promo only applies signed-in (a guest has
  // no token, so the odds fetch would 401 — they see the gate instead).
  const isPremium = profile?.is_premium === true || (mobileConfig.flags.pro_tools_free === true && isLoggedIn)
  const [sport, setSport] = useState<SportTabKey>('MLB')
  const [soccerLeague, setSoccerLeague] = useState(SOCCER_LEAGUES[0].key)

  const tab = SPORT_TABS.find((t) => t.key === sport) || SPORT_TABS[0]
  const path = sport === 'Soccer' ? `${tab.path}?league=${soccerLeague}` : tab.path

  const oddsQuery = useQuery({
    queryKey: ['value-finder-odds', sport, sport === 'Soccer' ? soccerLeague : ''],
    queryFn: () => kingfishFetch<Game[]>(path),
    enabled: isPremium,
    staleTime: 5 * 60 * 1000,
  })

  const now = Date.now()
  const games = (Array.isArray(oddsQuery.data) ? oddsQuery.data : [])
    .filter((g) => new Date(g.commence_time).getTime() > now)
    .sort((a, b) => {
      const ao = LEAN_ORDER[(a as any).kingfishLean?.type] ?? 4
      const bo = LEAN_ORDER[(b as any).kingfishLean?.type] ?? 4
      if (ao !== bo) return ao - bo
      return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime()
    })

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <AppText style={styles.backText}>‹ Back</AppText>
      </Pressable>

      <AppText variant="eyebrow">// {sport.toUpperCase()}</AppText>
      <AppText variant="title" style={styles.title}>Game Lines</AppText>
      <AppText variant="muted" style={styles.subtitle}>
        Finds the mispriced side of every game — value against the price, not just who&apos;s favored.
      </AppText>

      {!isPremium ? (
        <Card>
          <AppText variant="title" style={styles.gateTitle}>A KingFish Premium tool</AppText>
          <AppText variant="muted" style={styles.gateCopy}>
            Game Lines is part of KingFish Premium — the mispriced side of every game, graded.
          </AppText>
          <Button onPress={() => router.push('/modals/paywall' as any)}>Get Access</Button>
        </Card>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {SPORT_TABS.map((t) => (
              <Pressable key={t.key} onPress={() => setSport(t.key)} style={[styles.tab, sport === t.key && styles.tabActive]}>
                <AppText style={[styles.tabText, sport === t.key && styles.tabTextActive]}>{t.key}</AppText>
              </Pressable>
            ))}
          </ScrollView>

          {sport === 'Soccer' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
              {SOCCER_LEAGUES.map((l) => (
                <Pressable key={l.key} onPress={() => setSoccerLeague(l.key)} style={[styles.leaguePill, soccerLeague === l.key && styles.leaguePillActive]}>
                  <AppText style={[styles.leaguePillText, soccerLeague === l.key && styles.tabTextActive]}>{l.label}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {oddsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted" style={{ marginTop: 12 }}>Loading live odds…</AppText>
            </View>
          ) : oddsQuery.isError ? (
            <Card>
              <AppText variant="muted" style={{ lineHeight: 20 }}>Could not load live odds. Please try again.</AppText>
            </Card>
          ) : games.length === 0 ? (
            <Card>
              <AppText variant="muted" style={{ lineHeight: 20 }}>
                No upcoming games on the board right now — check back closer to game time.
              </AppText>
            </Card>
          ) : (
            games.map((game) => (
              <View key={(game as any).id || (game as any).game_id || `${game.away_team}-${game.home_team}`} style={styles.cardWrap}>
                <ValueCard game={game} sport={sport} userState={profile?.state} sportsbookPreferences={profile?.sportsbook_preferences} />
              </View>
            ))
          )}
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  back: { marginBottom: spacing.md },
  backText: { color: colors.gold, fontWeight: '700', fontSize: 14 },
  title: { marginTop: 4, marginBottom: 6 },
  subtitle: { marginBottom: spacing.md, lineHeight: 20 },
  gateTitle: { marginBottom: 6 },
  gateCopy: { marginBottom: spacing.md, lineHeight: 20 },
  center: { alignItems: 'center', paddingVertical: 48 },
  tabRow: { flexDirection: 'row', gap: 6, paddingBottom: spacing.sm },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: 'rgba(198,145,50,.08)', borderColor: 'rgba(198,145,50,.5)' },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  tabTextActive: { color: colors.goldLight },
  leaguePill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  leaguePillActive: { backgroundColor: 'rgba(198,145,50,.08)', borderColor: 'rgba(198,145,50,.5)' },
  leaguePillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  cardWrap: { marginBottom: spacing.md },
  card: { backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardHead: { padding: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  cardTime: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  matchupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  teamName: { fontSize: 19, fontWeight: '800', textTransform: 'uppercase', color: colors.textPrimary, flex: 1 },
  teamHome: { textAlign: 'right' },
  atText: { fontSize: 11, color: colors.textMuted },
  leanTile: { marginHorizontal: 14, marginTop: 12, backgroundColor: 'rgba(198,145,50,.07)', borderWidth: 1, borderColor: 'rgba(198,145,50,.22)', borderRadius: 10, padding: 11 },
  leanLabel: { fontSize: 9, color: colors.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3, fontWeight: '700' },
  leanSide: { fontSize: 20, fontWeight: '900', textTransform: 'uppercase', color: colors.textPrimary, lineHeight: 24 },
  leanDetail: { fontSize: 11, color: colors.textSecondary, lineHeight: 15, marginTop: 5 },
  markets: { padding: 14, paddingTop: 12, gap: 10 },
  marketCard: { backgroundColor: colors.bgCardAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  marketTitle: { fontSize: 10, color: colors.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border, fontWeight: '700' },
  marketRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 7 },
  marketLabelWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flex: 1, minWidth: 0 },
  marketTeam: { fontSize: 13, color: colors.textSecondary, flexShrink: 1 },
  marketPoint: { fontSize: 13, fontWeight: '900', color: colors.textPrimary },
  marketValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  marketPrice: { fontSize: 15, fontWeight: '900', color: colors.textPrimary },
  marketBook: { fontSize: 8, fontWeight: '800', color: colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  marketEmpty: { fontSize: 13, color: colors.textMuted },
})
