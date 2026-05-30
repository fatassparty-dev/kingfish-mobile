import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { fmtOdds } from '@/lib/format'
import { kingfishFetch } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

interface PlayerProfileResponse {
  team: string | null
  position: string | null
  matchup?: string | null
  searchHint?: string | null
  injury_status: string | null
  depthRole?: {
    team?: string | null
    position?: string | null
    rank?: number | null
    slot?: number | null
    role?: string | null
    updated_at?: string | null
    uploaded_at?: string | null
  } | null
  stats: Record<string, any> | null
  statDisplay: Array<{ label: string; value: string }>
  statsUpdatedAt?: string | null
  oddsStatus?: string | null
  props: Array<{
    marketKey: string
    market: string
    line: number
    odds: number
    book: string
  }>
}

type RawGame = Record<string, any>

type PropFocus = PlayerProfileMarketContext & {
  games: Array<{ label: string; value: number; hit: boolean }>
  hits: number
  misses: number
  average: number
}

export interface PlayerProfileMarketContext {
  marketKey: string
  marketLabel: string
  commonLine: number
}

interface PlayerProfileModalProps {
  playerName: string | null
  sport: 'mlb' | 'nba' | 'nfl' | 'nhl' | 'wnba'
  marketContext?: PlayerProfileMarketContext | null
  context?: 'fantasy' | 'props'
  onClose: () => void
}

function buildFormNote(sport: PlayerProfileModalProps['sport'], data?: PlayerProfileResponse) {
  const stats = data?.stats
  if (!stats) return null

  const primary =
    sport === 'mlb' && stats.season_strikeouts_per_game
      ? { season: stats.season_strikeouts_per_game, l5: stats.l5_strikeouts_per_game, label: 'strikeouts' }
      : sport === 'mlb'
        ? { season: stats.season_hits_per_game, l5: stats.l5_hits_per_game, label: 'hits' }
        : sport === 'nba' || sport === 'wnba'
          ? { season: stats.season_pts, l5: stats.l5_pts, label: 'points' }
          : sport === 'nfl'
            ? { season: stats.fantasy_points_ppr_per_game, l5: stats.fantasy_points_ppr_per_game, label: 'fantasy points' }
          : sport === 'nhl'
            ? { season: stats.season_pts, l5: stats.l5_pts, label: 'points' }
            : null

  if (!primary?.season || typeof primary.l5 !== 'number') return null
  const diff = ((primary.l5 - primary.season) / primary.season) * 100
  if (Math.abs(diff) < 8) return `Steady ${primary.label} - L5 in line with season average.`
  if (diff >= 8) return `Trending up - L5 ${primary.label} ${diff.toFixed(0)}% above season average.`
  return `Cooling off - L5 ${primary.label} ${Math.abs(diff).toFixed(0)}% below season average.`
}

function formatGameDate(game: RawGame) {
  const raw = game.date || game.game_date || game.gameDate || game.officialDate
  if (!raw) return ''
  const date = new Date(raw)
  if (!Number.isFinite(date.getTime())) return String(raw)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatStatsFreshness(value?: string | null) {
  if (!value) return 'Player stats updated by KingFish manual NFL sheet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Player stats updated by KingFish manual NFL sheet'
  return `Player stats updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function formatOpponent(game: RawGame) {
  const opponent = String(game.opponent || game.opponentAbbrev || game.opponentName || '').toUpperCase()
  if (!opponent) return ''
  if (typeof game.is_home === 'boolean') return `${game.is_home ? 'vs' : '@'} ${opponent}`
  return opponent
}

function formatGameLabel(game: RawGame, index: number) {
  return [formatGameDate(game), formatOpponent(game)].filter(Boolean).join(' ') || String(game.label || '') || `Recent ${index + 1}`
}

function nflDepthRoleLabel(depthRole?: PlayerProfileResponse['depthRole'], fallbackPosition?: string | null) {
  const rank = Number(depthRole?.rank)
  const position = String(depthRole?.position || fallbackPosition || '').toUpperCase()
  if (!Number.isFinite(rank) || rank <= 0) return depthRole?.role || 'Depth'
  if (rank === 1) return 'Starter'
  if (rank === 2) return position === 'QB' ? 'Backup QB' : `${position}2`
  if (rank === 3) return position === 'QB' ? 'Third QB' : `${position}3`
  return `${position || 'Depth'}${rank}`
}

function valueAt(values: unknown, index: number) {
  if (!Array.isArray(values)) return undefined
  const value = Number(values[index])
  return Number.isFinite(value) ? value : undefined
}

function sumValues(game: RawGame, keys: string[]) {
  let found = false
  const sum = keys.reduce((total, key) => {
    const value = Number(game[key])
    if (Number.isFinite(value)) {
      found = true
      return total + value
    }
    return total
  }, 0)
  return found ? sum : undefined
}

function recentGameStats(sport: PlayerProfileModalProps['sport'], game: RawGame) {
  if (sport === 'mlb') {
    if (typeof game.strikeouts === 'number' || typeof game.outs === 'number') {
      return [
        { label: 'K', value: game.strikeouts },
        { label: 'HA', value: game.hits_allowed },
        { label: 'ER', value: game.earned_runs },
        { label: 'Outs', value: game.outs },
      ]
    }
    return [
      { label: 'H', value: game.hits },
      { label: 'TB', value: game.tb },
      { label: 'R', value: game.runs },
      { label: 'RBI', value: game.rbi },
      { label: 'HR', value: game.hr },
    ]
  }

  if (sport === 'nhl') {
    return [
      { label: 'G', value: game.goals },
      { label: 'A', value: game.assists },
      { label: 'PTS', value: game.points },
      { label: 'SOG', value: game.shots },
    ]
  }

  if (sport === 'nfl') {
    return [
      { label: 'PASS', value: game.passing_yards },
      { label: 'RUSH', value: game.rushing_yards },
      { label: 'REC', value: game.receiving_yards },
      { label: 'CATCH', value: game.receptions },
      { label: 'TD', value: game.total_tds },
    ]
  }

  return [
    { label: 'PTS', value: game.pts ?? game.points },
    { label: 'REB', value: game.reb ?? game.rebounds },
    { label: 'AST', value: game.ast ?? game.assists },
    { label: '3PM', value: game.fg3m ?? game.threes },
    { label: 'MIN', value: game.min ?? game.minutes },
  ]
}

function recentGames(data?: PlayerProfileResponse) {
  const stats = data?.stats
  if (!stats) return []
  if (Array.isArray(stats.raw_games)) return stats.raw_games.slice(0, 10)
  if (!Array.isArray(stats.raw10_games)) return []

  return stats.raw10_games.slice(0, 10).map((game: RawGame | string, index: number) => {
    const base = typeof game === 'string' ? { label: game } : { ...game }
    const pts = valueAt(stats.raw10_pts, index)
    const reb = valueAt(stats.raw10_reb, index)
    const ast = valueAt(stats.raw10_ast, index)
    const fg3m = valueAt(stats.raw10_fg3m, index)
    const blk = valueAt(stats.raw10_blk, index)
    const stl = valueAt(stats.raw10_stl, index)
    const min = valueAt(stats.raw10_min, index) ?? valueAt(stats.raw10_minutes, index)

    return {
      ...base,
      pts,
      points: pts,
      reb,
      rebounds: reb,
      ast,
      assists: ast,
      fg3m,
      threes: fg3m,
      blk,
      blocks: blk,
      stl,
      steals: stl,
      min,
      minutes: min,
    }
  })
}

function propStatKey(sport: PlayerProfileModalProps['sport'], marketKey: string) {
  const baseMarketKey = marketKey.replace(/_alternate$/, '')
  const mlb: Record<string, string> = {
    batter_hits: 'hits',
    batter_runs_scored: 'runs',
    batter_rbis: 'rbi',
    batter_hits_runs_rbis: 'hrr',
    batter_total_bases: 'tb',
    batter_home_runs: 'hr',
    batter_singles: 'singles',
    batter_doubles: 'doubles',
    batter_walks: 'walks',
    batter_stolen_bases: 'sb',
    pitcher_strikeouts: 'strikeouts',
    pitcher_hits_allowed: 'hits_allowed',
    pitcher_earned_runs: 'earned_runs',
    pitcher_walks: 'walks',
    pitcher_outs: 'outs',
  }
  const nba: Record<string, string | string[]> = {
    player_points: 'pts',
    player_rebounds: 'reb',
    player_assists: 'ast',
    player_threes: 'fg3m',
    player_blocks: 'blk',
    player_steals: 'stl',
    player_points_rebounds_assists: ['pts', 'reb', 'ast'],
    player_points_rebounds: ['pts', 'reb'],
    player_points_assists: ['pts', 'ast'],
    player_rebounds_assists: ['reb', 'ast'],
  }
  const nhl: Record<string, string> = {
    player_goal_scorer_anytime: 'goals',
    player_assists: 'assists',
    player_points: 'points',
    player_shots_on_goal: 'shots',
    player_blocked_shots: 'blocks',
    player_power_play_points: 'ppp',
  }
  const nfl: Record<string, string> = {
    player_pass_yds: 'passing_yards',
    player_pass_tds: 'passing_tds',
    player_pass_attempts: 'passing_attempts',
    player_pass_completions: 'completions',
    player_pass_interceptions: 'interceptions',
    player_pass_rush_yds: 'pass_rush_yards',
    player_pass_rush_reception_tds: 'pass_rush_reception_tds',
    player_pass_rush_reception_yds: 'pass_rush_reception_yards',
    player_rush_yds: 'rushing_yards',
    player_rush_attempts: 'carries',
    player_rush_tds: 'rushing_tds',
    player_rush_reception_tds: 'rush_reception_tds',
    player_rush_reception_yds: 'rush_reception_yards',
    player_receptions: 'receptions',
    player_reception_yds: 'receiving_yards',
    player_reception_tds: 'receiving_tds',
    player_anytime_td: 'total_tds',
    player_tds_over: 'total_tds',
    player_1st_td: 'total_tds',
    player_last_td: 'total_tds',
    player_field_goals: 'field_goals_made',
    player_kicking_points: 'kicking_points',
    player_pats: 'extra_points_made',
    player_assists: 'def_tackle_assists',
    player_defensive_interceptions: 'def_interceptions',
    player_sacks: 'def_sacks',
    player_solo_tackles: 'def_tackles_solo',
    player_tackles_assists: 'def_tackles_assists',
  }

  if (sport === 'mlb') return mlb[baseMarketKey]
  if (sport === 'nhl') return nhl[baseMarketKey]
  if (sport === 'nfl') return nfl[baseMarketKey]
  if (sport === 'nba' || sport === 'wnba') return nba[baseMarketKey]
  return undefined
}

function statValue(game: RawGame, keys: string | string[]) {
  const parts = Array.isArray(keys) ? keys : [keys]
  let found = false
  const total = parts.reduce((sum, key) => {
    const combo =
      key === 'hrr'
        ? sumValues(game, ['hits', 'runs', 'rbi'])
        : key === 'pass_rush_yards'
          ? sumValues(game, ['passing_yards', 'rushing_yards'])
          : key === 'pass_rush_reception_yards'
            ? sumValues(game, ['passing_yards', 'rushing_yards', 'receiving_yards'])
            : key === 'pass_rush_reception_tds'
              ? sumValues(game, ['passing_tds', 'rushing_tds', 'receiving_tds'])
              : key === 'rush_reception_yards'
                ? sumValues(game, ['rushing_yards', 'receiving_yards'])
                : key === 'rush_reception_tds'
                  ? sumValues(game, ['rushing_tds', 'receiving_tds'])
                  : undefined
    if (combo !== undefined) {
      found = true
      return sum + combo
    }
    const direct = Number(game[key])
    if (Number.isFinite(direct)) {
      found = true
      return sum + direct
    }
    const fallback = key === 'pts' ? Number(game.points) : key === 'reb' ? Number(game.rebounds) : key === 'ast' ? Number(game.assists) : NaN
    if (Number.isFinite(fallback)) {
      found = true
      return sum + fallback
    }
    return sum
  }, 0)
  return found ? total : undefined
}

function buildPropFocus(sport: PlayerProfileModalProps['sport'], data?: PlayerProfileResponse, context?: PlayerProfileMarketContext | null) {
  if (!data?.stats || !context) return null
  const keys = propStatKey(sport, context.marketKey)
  const games = recentGames(data)
  if (!keys || games.length === 0) return null
  const rows = games.map((game, index) => {
    const value = statValue(game, keys)
    if (value === undefined) return null
    return {
      label: formatGameLabel(game, index),
      value,
      hit: value > context.commonLine,
    }
  }).filter((game): game is { label: string; value: number; hit: boolean } => Boolean(game))
  if (rows.length === 0) return null
  const hits = rows.filter((game) => game.hit).length
  const average = rows.reduce((sum, game) => sum + game.value, 0) / rows.length
  return { ...context, games: rows, hits, misses: rows.length - hits, average }
}

function formatShareNumber(value: number) {
  if (!Number.isFinite(value)) return '--'
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(value < 10 ? 1 : 0)
}

function compactShareText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1))}.`
}

export function PlayerProfileModal({ playerName, sport, marketContext, context = 'props', onClose }: PlayerProfileModalProps) {
  const [shareCardOpen, setShareCardOpen] = useState(false)
  const isFantasyProfile = context === 'fantasy'
  const query = useQuery({
    queryKey: ['player-profile', sport, playerName, context],
    queryFn: () => {
      const params = new URLSearchParams({ sport, name: playerName || '', context })
      return kingfishFetch<PlayerProfileResponse>(`/api/player-profile?${params.toString()}`)
    },
    enabled: !!playerName,
    staleTime: 5 * 60 * 1000,
  })
  const formNote = buildFormNote(sport, query.data)
  const propFocus = buildPropFocus(sport, query.data, marketContext)

  return (
    <Modal visible={!!playerName} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="eyebrow">// Player Profile</AppText>
              <AppText variant="title" style={styles.name}>{playerName}</AppText>
              <View style={styles.metaRow}>
                {query.data?.team ? <Badge label={query.data.team} /> : null}
                {query.data?.position ? <Badge label={query.data.position} muted /> : null}
                {query.data?.matchup ? <Badge label={query.data.matchup} muted /> : null}
                {query.data?.injury_status ? <Badge label={query.data.injury_status} danger /> : null}
              </View>
            </View>
            <View style={styles.headerActions}>
              {propFocus && query.data && !isFantasyProfile ? (
                <Pressable onPress={() => setShareCardOpen(true)} style={styles.shareButton}>
                  <AppText variant="mono" style={styles.shareButtonText}>Copy</AppText>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} style={styles.closeButton}>
                <AppText style={styles.closeText}>x</AppText>
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {query.isLoading && <AppText variant="muted">Loading player profile...</AppText>}

            {query.isError && (
              <Card>
                <AppText variant="eyebrow">// Error</AppText>
                <AppText variant="muted" style={styles.error}>
                  {query.error instanceof Error ? query.error.message : 'Failed to load player profile.'}
                </AppText>
              </Card>
            )}

            {formNote && (
              <Card>
                <AppText variant="eyebrow">// Recent Form</AppText>
                <AppText style={styles.formNote}>{formNote}</AppText>
              </Card>
            )}

            {sport === 'nfl' && query.data && !isFantasyProfile ? (
              <Card>
                <AppText variant="eyebrow">// Data Status</AppText>
                <AppText style={styles.formNote}>{query.data.oddsStatus || 'Odds live when NFL prop markets are posted'}</AppText>
                <AppText variant="muted" style={styles.statusText}>{formatStatsFreshness(query.data.statsUpdatedAt)}</AppText>
              </Card>
            ) : null}

            {sport === 'nfl' && query.data?.depthRole ? (
              <Card>
                <AppText variant="eyebrow">// Depth Chart Role</AppText>
                <View style={styles.roleGrid}>
                  {[
                    ['Role', nflDepthRoleLabel(query.data.depthRole, query.data.position)],
                    ['Team', query.data.depthRole.team || query.data.team || '-'],
                    ['Depth', query.data.depthRole.rank ? `#${query.data.depthRole.rank}` : '-'],
                    ['Position', query.data.depthRole.position || query.data.position || '-'],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.roleItem}>
                      <AppText variant="mono">{label}</AppText>
                      <AppText style={styles.roleValue}>{value}</AppText>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {propFocus && !isFantasyProfile && (
              <Card>
                <View style={styles.focusHeader}>
                  <View style={styles.focusTitleWrap}>
                    <AppText variant="eyebrow">// Prop Focus</AppText>
                    <AppText style={styles.focusTitle}>{propFocus.marketLabel}</AppText>
                    <AppText variant="mono" style={styles.focusLine}>Line {propFocus.commonLine}</AppText>
                  </View>
                  <View style={styles.focusSummary}>
                    <AppText style={styles.focusSummaryValue}>{propFocus.average.toFixed(2)}</AppText>
                    <AppText variant="mono">L10 AVG</AppText>
                    <AppText style={styles.focusSummaryValue}>{propFocus.hits}-{propFocus.misses}</AppText>
                    <AppText variant="mono">vs line</AppText>
                  </View>
                </View>
                <View style={styles.focusGames}>
                  {propFocus.games.map((game, index) => (
                    <View key={`${game.label}-${index}`} style={[styles.focusGame, game.hit ? styles.focusGameHit : styles.focusGameMiss]}>
                      <AppText variant="mono" style={styles.focusGameLabel} numberOfLines={1}>{game.label}</AppText>
                      <AppText style={styles.focusGameValue}>{game.value}</AppText>
                      <AppText variant="mono" style={[styles.focusGameResult, game.hit ? styles.focusGameResultHit : styles.focusGameResultMiss]}>
                        {game.hit ? 'Hit' : 'Miss'}
                      </AppText>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {query.data?.statDisplay?.length ? (
              <View>
                <AppText variant="eyebrow" style={styles.sectionLabel}>// Averages</AppText>
                <View style={styles.statGrid}>
                  {query.data.statDisplay.map((stat) => (
                    <View key={stat.label} style={styles.statCard}>
                      <AppText variant="eyebrow" style={styles.statLabel}>{stat.label}</AppText>
                      <AppText style={styles.statValue}>{stat.value}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {recentGames(query.data).length ? (
              <View>
                <AppText variant="eyebrow" style={styles.sectionLabel}>// Last 10 Games</AppText>
                <View style={styles.recentList}>
                  {recentGames(query.data).map((game, index) => (
                    <View key={`${formatGameLabel(game, index)}-${index}`} style={styles.recentRow}>
                      <View style={styles.recentGameMeta}>
                        <AppText style={styles.recentDate}>{formatGameDate(game) || String(game.label || '') || `Game ${index + 1}`}</AppText>
                        <AppText variant="mono" style={styles.recentOpponent}>{formatOpponent(game)}</AppText>
                      </View>
                      <View style={styles.recentStats}>
                        {recentGameStats(sport, game)
                          .filter((stat) => stat.value !== undefined && stat.value !== null && stat.value !== '')
                          .slice(0, 5)
                          .map((stat) => (
                            <View key={stat.label} style={styles.recentStat}>
                              <AppText variant="mono" style={styles.recentStatLabel}>{stat.label}</AppText>
                              <AppText style={styles.recentStatValue}>{String(stat.value)}</AppText>
                            </View>
                          ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {!isFantasyProfile ? (
              <View>
                <AppText variant="eyebrow" style={styles.sectionLabel}>// Today's Props</AppText>
                {query.data?.props?.length ? (
                  <View style={styles.propsList}>
                    {query.data.props.map((prop) => (
                      <View key={`${prop.marketKey}-${prop.book}-${prop.line}`} style={styles.propRow}>
                        <View style={styles.propInfo}>
                          <AppText style={styles.propMarket}>{prop.market}</AppText>
                          <AppText variant="mono">Line {prop.line} · {prop.book}</AppText>
                        </View>
                        <View style={styles.oddsBadge}>
                          <AppText style={styles.oddsText}>{fmtOdds(prop.odds)}</AppText>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Card>
                    <AppText variant="muted">No props available for this player today.</AppText>
                  </Card>
                )}
              </View>
            ) : null}

            <Button variant="secondary" onPress={onClose}>Close</Button>
          </ScrollView>
        </View>
        <Modal visible={shareCardOpen && !!propFocus && !!query.data && !!playerName} animationType="fade" transparent onRequestClose={() => setShareCardOpen(false)}>
          <View style={styles.sharePreviewOverlay}>
            <ShareCard
              playerName={playerName || ''}
              sport={sport}
              team={query.data?.team || null}
              position={query.data?.position || null}
              propFocus={propFocus as PropFocus}
            />
            <View style={styles.sharePreviewActions}>
              <AppText variant="mono" style={styles.sharePreviewHint}>Screenshot this card</AppText>
              <Pressable onPress={() => setShareCardOpen(false)} style={styles.sharePreviewClose}>
                <AppText style={styles.sharePreviewCloseText}>Close</AppText>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  )
}

function ShareCard({
  playerName,
  sport,
  team,
  position,
  propFocus,
}: {
  playerName: string
  sport: PlayerProfileModalProps['sport']
  team: string | null
  position: string | null
  propFocus: PropFocus
}) {
  const l5Games = propFocus.games.slice(0, 5)
  const l5Average = l5Games.length
    ? l5Games.reduce((sum, game) => sum + game.value, 0) / l5Games.length
    : propFocus.average
  const hitRate = `${Math.round((propFocus.hits / propFocus.games.length) * 100)}%`
  const meta = [team, position].filter(Boolean).join(' / ') || 'PLAYER SNAPSHOT'

  return (
    <View style={styles.shareCard}>
      <Ticker />
      <View style={styles.shareInner}>
        <View style={styles.shareTopRow}>
          <View>
            <AppText variant="mono" style={styles.shareBrand}>KINGFISH BETS</AppText>
            <AppText variant="mono" style={styles.shareSubtitle}>{sport.toUpperCase()} PROP PROFILE</AppText>
          </View>
          <AppText style={styles.shareMark}>KFB</AppText>
        </View>

        <AppText style={styles.shareName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}>
          {playerName.toUpperCase()}
        </AppText>
        <AppText variant="mono" style={styles.shareMeta} numberOfLines={1}>{meta.toUpperCase()}</AppText>

        <View style={styles.shareFocus}>
          <View style={styles.shareFocusCopy}>
            <AppText style={styles.shareMarket} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {propFocus.marketLabel.toUpperCase()}
            </AppText>
            <AppText variant="mono" style={styles.shareLine}>LINE {propFocus.commonLine}</AppText>
          </View>
          <View style={styles.shareVsLine}>
            <AppText style={styles.shareVsValue}>{propFocus.hits}-{propFocus.misses}</AppText>
            <AppText variant="mono" style={styles.shareVsLabel}>LAST 10 VS LINE</AppText>
          </View>
        </View>

        <View style={styles.shareMetricRow}>
          <ShareMetric label="L10 AVG" value={formatShareNumber(propFocus.average)} />
          <ShareMetric label="L5 AVG" value={formatShareNumber(l5Average)} />
          <ShareMetric label="HIT RATE" value={hitRate} accent={propFocus.hits >= propFocus.misses ? colors.green : colors.red} />
        </View>

        <AppText variant="mono" style={styles.shareSection}>LAST 10 GAMES</AppText>
        <View style={styles.shareGames}>
          {propFocus.games.slice(0, 10).map((game, index) => (
            <View key={`${game.label}-${index}`} style={[styles.shareGame, game.hit ? styles.shareGameHit : styles.shareGameMiss]}>
              <AppText variant="mono" style={styles.shareGameLabel} numberOfLines={1}>
                {compactShareText(game.label.toUpperCase(), 14)}
              </AppText>
              <AppText style={styles.shareGameValue}>{formatShareNumber(game.value)}</AppText>
              <AppText variant="mono" style={[styles.shareGameResult, game.hit ? styles.shareGameResultHit : styles.shareGameResultMiss]}>
                {game.hit ? 'HIT' : 'MISS'}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.shareFooter}>
          <AppText variant="mono" style={styles.shareFooterMuted}>Analytics snapshot. Lines move.</AppText>
          <AppText variant="mono" style={styles.shareFooterBrand}>KINGFISHBETS.COM</AppText>
        </View>
      </View>
      <Ticker bottom />
    </View>
  )
}

function Ticker({ bottom }: { bottom?: boolean }) {
  return (
    <View style={[styles.shareTicker, bottom && styles.shareTickerBottom]}>
      {Array.from({ length: 5 }).map((_, index) => (
        <AppText key={index} style={styles.shareTickerText}>KINGFISH BETS</AppText>
      ))}
    </View>
  )
}

function ShareMetric({ label, value, accent = colors.textPrimary }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.shareMetric}>
      <AppText variant="mono" style={styles.shareMetricLabel}>{label}</AppText>
      <AppText style={[styles.shareMetricValue, { color: accent }]}>{value}</AppText>
    </View>
  )
}

function Badge({ label, muted, danger }: { label: string; muted?: boolean; danger?: boolean }) {
  return (
    <View style={[styles.badge, muted && styles.badgeMuted, danger && styles.badgeDanger]}>
      <AppText style={[styles.badgeText, muted && styles.badgeTextMuted, danger && styles.badgeTextDanger]}>{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(8,9,14,.82)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '84%',
    backgroundColor: colors.bgCardAlt,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 30,
    lineHeight: 32,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  shareButton: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.32)',
    borderRadius: 10,
    backgroundColor: 'rgba(198,145,50,.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  shareButtonText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 22,
    fontWeight: '900',
  },
  body: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  error: {
    color: colors.red,
    marginTop: spacing.sm,
  },
  formNote: {
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  statusText: {
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  roleItem: {
    width: '48%',
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    justifyContent: 'center',
  },
  roleValue: {
    marginTop: 5,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  focusTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  focusTitle: {
    marginTop: spacing.xs,
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  focusLine: {
    marginTop: 4,
    color: colors.gold,
  },
  focusSummary: {
    alignItems: 'flex-end',
  },
  focusSummaryValue: {
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '900',
  },
  focusGames: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  focusGame: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 9,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.sm,
  },
  focusGameHit: {
    borderColor: 'rgba(34,197,94,.45)',
  },
  focusGameMiss: {
    borderColor: 'rgba(239,68,68,.4)',
  },
  focusGameLabel: {
    color: colors.textSecondary,
    fontSize: 9,
  },
  focusGameValue: {
    marginTop: 5,
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '900',
  },
  focusGameResult: {
    marginTop: 3,
    fontSize: 9,
  },
  focusGameResultHit: {
    color: colors.green,
  },
  focusGameResultMiss: {
    color: colors.red,
  },
  sectionLabel: {
    marginBottom: spacing.md,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '31%',
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.sm,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 9,
  },
  statValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  propsList: {
    gap: spacing.sm,
  },
  recentList: {
    gap: spacing.sm,
  },
  recentRow: {
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
  },
  recentGameMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recentDate: {
    color: colors.textPrimary,
    fontWeight: '900',
  },
  recentOpponent: {
    color: colors.textSecondary,
  },
  recentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentStat: {
    minWidth: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recentStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  recentStatValue: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
  },
  propInfo: {
    flex: 1,
    minWidth: 0,
  },
  propMarket: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  oddsBadge: {
    minWidth: 72,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(198,145,50,.1)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  oddsText: {
    color: colors.gold,
    fontWeight: '900',
  },
  badge: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.25)',
    backgroundColor: 'rgba(198,145,50,.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeMuted: {
    borderColor: 'rgba(122,128,153,.25)',
    backgroundColor: 'rgba(122,128,153,.1)',
  },
  badgeDanger: {
    borderColor: 'rgba(239,68,68,.25)',
    backgroundColor: 'rgba(239,68,68,.1)',
  },
  badgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  badgeTextMuted: {
    color: colors.textSecondary,
  },
  badgeTextDanger: {
    color: colors.red,
  },
  sharePreviewOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(8,9,14,.94)',
    paddingHorizontal: spacing.md,
  },
  sharePreviewActions: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  sharePreviewHint: {
    color: colors.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  sharePreviewClose: {
    minWidth: 120,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.35)',
    borderRadius: 10,
    backgroundColor: 'rgba(198,145,50,.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sharePreviewCloseText: {
    color: colors.gold,
    fontWeight: '900',
  },
  shareCard: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 0.8,
    backgroundColor: '#080A0F',
    overflow: 'hidden',
  },
  shareTicker: {
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.gold,
  },
  shareTickerBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  shareTickerText: {
    color: '#080A0F',
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  shareInner: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 34,
    bottom: 34,
    borderWidth: 1,
    borderColor: colors.gold,
    padding: 14,
  },
  shareTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shareBrand: {
    color: colors.gold,
    fontSize: 8,
    fontWeight: '900',
  },
  shareSubtitle: {
    marginTop: 3,
    color: colors.textSecondary,
    fontSize: 8,
  },
  shareMark: {
    color: colors.gold,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  shareName: {
    marginTop: 14,
    color: colors.textPrimary,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
  },
  shareMeta: {
    marginTop: 4,
    color: colors.gold,
    fontSize: 8,
  },
  shareFocus: {
    marginTop: 14,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.42)',
    borderRadius: 12,
    backgroundColor: '#10141E',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  shareFocusCopy: {
    flex: 1,
    minWidth: 0,
  },
  shareMarket: {
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 21,
    fontWeight: '900',
  },
  shareLine: {
    marginTop: 4,
    color: colors.gold,
    fontSize: 9,
  },
  shareVsLine: {
    alignItems: 'flex-end',
  },
  shareVsValue: {
    color: colors.textPrimary,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: '900',
  },
  shareVsLabel: {
    color: colors.textSecondary,
    fontSize: 7,
  },
  shareMetricRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  shareMetric: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: '#10141E',
  },
  shareMetricLabel: {
    color: colors.textSecondary,
    fontSize: 7,
  },
  shareMetricValue: {
    marginTop: 3,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
  },
  shareSection: {
    marginTop: 18,
    color: colors.gold,
    fontSize: 8,
    fontWeight: '900',
  },
  shareGames: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  shareGame: {
    width: 57,
    height: 52,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  shareGameHit: {
    borderColor: 'rgba(34,197,94,.7)',
    backgroundColor: '#071813',
  },
  shareGameMiss: {
    borderColor: 'rgba(239,68,68,.64)',
    backgroundColor: '#190D13',
  },
  shareGameLabel: {
    color: colors.textSecondary,
    fontSize: 6,
  },
  shareGameValue: {
    marginTop: 3,
    color: colors.textPrimary,
    fontSize: 18,
    lineHeight: 19,
    fontWeight: '900',
  },
  shareGameResult: {
    marginTop: 1,
    fontSize: 6,
    fontWeight: '900',
  },
  shareGameResultHit: {
    color: colors.green,
  },
  shareGameResultMiss: {
    color: colors.red,
  },
  shareFooter: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  shareFooterMuted: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 7,
  },
  shareFooterBrand: {
    color: colors.gold,
    fontSize: 7,
    fontWeight: '900',
  },
})
