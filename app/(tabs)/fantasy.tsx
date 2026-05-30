import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Card } from '@/components/Card'
import { PlayerProfileModal } from '@/components/dashboard/PlayerProfileModal'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

type FantasyMode = 'home' | 'bestball' | 'sleeper'
type Position = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DST'

type DraftPlayer = {
  id: string
  name: string
  position: string
  team: string
  adp: number | null
  rank: number
  fpts?: number | null
  grade?: string | null
  volume?: string | null
  risk?: string | null
  depthRole?: { rank?: number | null; role?: string | null } | null
}

type SleeperLeague = {
  league_id: string
  name: string
  season: string
  status?: string
  total_rosters?: number
}

type SleeperPlayer = {
  sleeper_id: string
  full_name: string
  team?: string | null
  position?: string | null
  injury_status?: string | null
  fpts?: number | null
  grade?: string | null
  volume?: string | null
  risk?: string | null
  depthRole?: { rank?: number | null; role?: string | null } | null
}

type FantasyPayload = {
  generated_at?: string | null
  latest_season?: number | null
  players: DraftPlayer[]
  bestBallPlayers?: DraftPlayer[]
  sleeper?: {
    user?: { user_id: string; username: string; display_name?: string } | null
    leagues?: SleeperLeague[]
    selected?: {
      league: SleeperLeague
      roster?: { roster_id: number; starters?: string[]; players?: string[]; settings?: Record<string, number> } | null
      playerDetails?: SleeperPlayer[]
      matchups?: Array<{ roster_id: number; points?: number; matchup_id?: number; starters?: string[]; players?: string[] }>
      week: number
    } | null
  } | null
}

const STORAGE_KEY = 'kingfish_sleeper_connect_v1'
const HIDDEN_STORAGE_KEY = 'kingfish_fantasy_hidden_v1'
const POSITIONS: Position[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST']
const FLEX = new Set(['RB', 'WR', 'TE'])

function freshness(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `Player stats updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function roundLabel(rank: number) {
  return rank > 0 ? `R${Math.ceil(rank / 12)}` : 'NR'
}

export default function FantasyToolScreen() {
  const [mode, setMode] = useState<FantasyMode>('home')
  const [position, setPosition] = useState<Position>('ALL')
  const [search, setSearch] = useState('')
  const [sleeperUsername, setSleeperUsername] = useState('')
  const [activeSleeper, setActiveSleeper] = useState<{ username: string; leagueId?: string; rosterId?: string } | null>(null)
  const [profilePlayer, setProfilePlayer] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Record<'home' | 'bestball', string[]>>({ home: [], bestball: [] })

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!value) return
        const parsed = JSON.parse(value)
        if (parsed?.username) {
          setSleeperUsername(parsed.username)
          setActiveSleeper(parsed)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_STORAGE_KEY)
      .then(value => {
        if (!value) return
        const parsed = JSON.parse(value)
        setHiddenIds({
          home: Array.isArray(parsed?.home) ? parsed.home : [],
          bestball: Array.isArray(parsed?.bestball) ? parsed.bestball : [],
        })
      })
      .catch(() => {})
  }, [])

  const fantasyQuery = useQuery({
    queryKey: ['fantasy-hub-mobile', activeSleeper?.username, activeSleeper?.leagueId, activeSleeper?.rosterId],
    queryFn: () => {
      const params = new URLSearchParams()
      if (activeSleeper?.username) params.set('sleeperUsername', activeSleeper.username)
      if (activeSleeper?.leagueId) params.set('leagueId', activeSleeper.leagueId)
      if (activeSleeper?.rosterId) params.set('rosterId', activeSleeper.rosterId)
      const qs = params.toString()
      return kingfishFetch<FantasyPayload>(`/api/fantasy-hub${qs ? `?${qs}` : ''}`)
    },
  })

  const players = fantasyQuery.data?.players || []
  const bestBallPlayers = fantasyQuery.data?.bestBallPlayers || []
  const boardPlayers = useMemo(() => {
    const sourcePlayers = mode === 'bestball' ? bestBallPlayers : players
    const hidden = new Set(mode === 'bestball' ? hiddenIds.bestball : hiddenIds.home)
    return sourcePlayers
      .filter(player => !hidden.has(player.id))
      .filter(player => mode !== 'bestball' || (player.position !== 'K' && player.position !== 'DST'))
      .filter(player => position === 'ALL' || (position === 'FLEX' ? FLEX.has(player.position) : player.position === position))
      .filter(player => {
        const needle = search.trim().toLowerCase()
        if (!needle) return true
        return player.name.toLowerCase().includes(needle) || player.team.toLowerCase().includes(needle)
      })
      .slice(0, 80)
  }, [bestBallPlayers, hiddenIds.bestball, hiddenIds.home, mode, players, position, search])

  const activeHiddenCount = mode === 'bestball' ? hiddenIds.bestball.length : hiddenIds.home.length

  async function connectSleeper() {
    const username = sleeperUsername.trim()
    if (!username) return
    const next = { username }
    setActiveSleeper(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setMode('sleeper')
  }

  async function selectLeague(leagueId: string, rosterId?: string) {
    if (!activeSleeper?.username) return
    const next = { username: activeSleeper.username, leagueId, rosterId }
    setActiveSleeper(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  async function disconnectSleeper() {
    setActiveSleeper(null)
    setSleeperUsername('')
    await AsyncStorage.removeItem(STORAGE_KEY)
  }

  async function hidePlayer(playerId: string) {
    if (mode !== 'home' && mode !== 'bestball') return
    const next = {
      ...hiddenIds,
      [mode]: Array.from(new Set([...hiddenIds[mode], playerId])),
    }
    setHiddenIds(next)
    await AsyncStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(next))
  }

  async function resetHiddenPlayers() {
    if (mode !== 'home' && mode !== 'bestball') return
    const next = { ...hiddenIds, [mode]: [] }
    setHiddenIds(next)
    await AsyncStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(next))
  }

  const selectedSleeper = fantasyQuery.data?.sleeper?.selected
  const rosterPlayers = selectedSleeper?.playerDetails || []
  const starters = new Set((selectedSleeper?.roster?.starters || []).map(String))
  const statsFreshness = freshness(fantasyQuery.data?.generated_at)

  return (
    <Screen>
      <Pressable onPress={() => router.push('/cheat-sheets')} style={styles.backButton}>
        <AppText style={styles.backText}>Tools</AppText>
      </Pressable>

      <AppText variant="eyebrow">// Fantasy Draft Room</AppText>
      <AppText variant="title" style={styles.title}>Fantasy Hub</AppText>
      <AppText variant="muted" style={styles.copy}>
        Draft boards and team tracking for football season.
      </AppText>

      <View style={styles.segmentRow}>
        {([
          { key: 'home', label: 'Home' },
          { key: 'bestball', label: 'Best Ball' },
          { key: 'sleeper', label: 'Sleeper' },
        ] as Array<{ key: FantasyMode; label: string }>).map(item => (
          <Pressable key={item.key} onPress={() => setMode(item.key)} style={[styles.segmentButton, mode === item.key && styles.segmentButtonActive]}>
            <AppText style={[styles.segmentText, mode === item.key && styles.segmentTextActive]}>{item.label}</AppText>
          </Pressable>
        ))}
      </View>

      {fantasyQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} />
          <AppText variant="muted">Loading fantasy room...</AppText>
        </View>
      ) : fantasyQuery.isError ? (
        <Card>
          <AppText variant="eyebrow">// Fantasy</AppText>
          <AppText style={styles.cardTitle}>Could Not Load</AppText>
          <AppText variant="muted" style={styles.cardCopy}>{fantasyQuery.error instanceof Error ? fantasyQuery.error.message : 'Fantasy Hub is unavailable right now.'}</AppText>
        </Card>
      ) : mode === 'sleeper' ? (
        <>
          <Card style={styles.connectCard}>
            <AppText variant="eyebrow">// Connect Sleeper</AppText>
            <View style={styles.inputRow}>
              <TextInput
                value={sleeperUsername}
                onChangeText={setSleeperUsername}
                placeholder="Sleeper username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                style={styles.input}
              />
              <Pressable onPress={connectSleeper} style={styles.actionButton}>
                <AppText style={styles.actionText}>Load</AppText>
              </Pressable>
            </View>
            {activeSleeper?.username ? (
              <Pressable onPress={disconnectSleeper} style={styles.textButton}>
                <AppText style={styles.textButtonLabel}>Disconnect {activeSleeper.username}</AppText>
              </Pressable>
            ) : null}
          </Card>

          {fantasyQuery.data?.sleeper?.leagues?.length ? (
            <View style={styles.leagueList}>
              {fantasyQuery.data.sleeper.leagues.map(league => (
                <Pressable key={league.league_id} onPress={() => selectLeague(league.league_id)} style={[styles.leagueCard, activeSleeper?.leagueId === league.league_id && styles.leagueCardActive]}>
                  <AppText style={styles.leagueName}>{league.name}</AppText>
                  <AppText variant="muted" style={styles.leagueMeta}>{league.total_rosters || '-'} teams · {league.status || 'draft'}</AppText>
                </Pressable>
              ))}
            </View>
          ) : activeSleeper?.username ? (
            <Card>
              <AppText style={styles.cardTitle}>No 2026 Sleeper Leagues</AppText>
              <AppText variant="muted" style={styles.cardCopy}>If your league has not rolled over yet, try again once Sleeper lists it for the 2026 NFL season.</AppText>
            </Card>
          ) : null}

          {selectedSleeper?.league ? (
            <Card style={styles.rosterCard}>
              <AppText variant="eyebrow">// {selectedSleeper.league.name}</AppText>
              <AppText style={styles.cardTitle}>Roster Watch</AppText>
              <AppText variant="muted" style={styles.cardCopy}>
                {statsFreshness ? `Week ${selectedSleeper.week} · ${statsFreshness}` : `Week ${selectedSleeper.week}`}
              </AppText>
              <View style={styles.playerList}>
                {rosterPlayers.map(player => (
                  <PlayerRow
                    key={player.sleeper_id}
                    name={player.full_name}
                    team={player.team || ''}
                    position={player.position || ''}
                    grade={player.grade}
                    fpts={player.fpts}
                    volume={player.volume}
                    risk={player.risk}
                    starter={starters.has(String(player.sleeper_id))}
                    onPress={() => setProfilePlayer(player.full_name)}
                  />
                ))}
              </View>
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <Card style={styles.metaCard}>
            <AppText variant="eyebrow">// Draft Board</AppText>
            <AppText style={styles.cardTitle}>{mode === 'bestball' ? 'Best Ball Board' : 'Home League Board'}</AppText>
            <View style={styles.metaActions}>
              {statsFreshness ? <AppText variant="muted" style={styles.cardCopy}>{statsFreshness}</AppText> : <View />}
              {activeHiddenCount ? (
                <Pressable onPress={resetHiddenPlayers} style={styles.clearButton}>
                  <AppText style={styles.clearButtonText}>Show {activeHiddenCount}</AppText>
                </Pressable>
              ) : null}
            </View>
          </Card>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search player or team"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />

          <View style={styles.positionGrid}>
            {POSITIONS.filter(pos => mode !== 'bestball' || (pos !== 'K' && pos !== 'DST')).map(pos => (
              <Pressable key={pos} onPress={() => setPosition(pos)} style={[styles.positionButton, position === pos && styles.positionButtonActive]}>
                <AppText style={[styles.positionText, position === pos && styles.positionTextActive]}>{pos}</AppText>
              </Pressable>
            ))}
          </View>

          <View style={styles.playerList}>
            {boardPlayers.map(player => (
              <PlayerRow
                key={player.id}
                name={player.name}
                team={player.team}
                position={player.position}
                grade={player.grade}
                fpts={player.fpts}
                volume={player.volume}
                risk={player.risk}
                rank={player.rank}
                rankLabel={`${roundLabel(player.rank)} · ${player.adp ? player.adp.toFixed(1) : 'NR'}`}
                onPress={() => setProfilePlayer(player.name)}
                onHide={() => hidePlayer(player.id)}
              />
            ))}
          </View>
        </>
      )}

      <PlayerProfileModal playerName={profilePlayer} sport="nfl" context="fantasy" onClose={() => setProfilePlayer(null)} />
    </Screen>
  )
}

function PlayerRow({
  name,
  team,
  position,
  grade,
  fpts,
  volume,
  risk,
  rank,
  rankLabel,
  starter,
  onPress,
  onHide,
}: {
  name: string
  team: string
  position: string
  grade?: string | null
  fpts?: number | null
  volume?: string | null
  risk?: string | null
  rank?: number
  rankLabel?: string
  starter?: boolean
  onPress: () => void
  onHide?: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.playerRow}>
      <View style={styles.playerMain}>
        {rank ? <AppText style={styles.rankText}>#{rank}</AppText> : null}
        <View style={styles.playerTitleRow}>
          <AppText style={styles.playerName}>{name}</AppText>
          {position ? <AppText style={styles.positionBox}>{position}</AppText> : null}
          {starter ? <AppText style={styles.starterTag}>START</AppText> : null}
        </View>
        <AppText variant="muted" style={styles.playerMeta}>
          {team || '-'}{rankLabel ? ` · ${rankLabel}` : ''}
        </AppText>
        <View style={styles.tagRow}>
          {volume ? <AppText style={styles.smallTag}>Vol {volume}</AppText> : null}
          {risk ? <AppText style={styles.smallTag}>Risk {risk}</AppText> : null}
          {typeof fpts === 'number' ? <AppText style={styles.smallTag}>{fpts.toFixed(1)} PPR/G</AppText> : null}
        </View>
      </View>
      <View style={styles.rowActions}>
        <AppText style={styles.grade}>{grade || '-'}</AppText>
        {onHide ? (
          <Pressable onPress={event => {
            event.stopPropagation()
            onHide()
          }} style={styles.hideButton}>
            <AppText style={styles.hideText}>Hide</AppText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  backText: { color: colors.gold, fontSize: 12, fontWeight: '900' },
  title: { marginTop: 6 },
  copy: { marginTop: spacing.sm, marginBottom: spacing.lg, lineHeight: 22 },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  segmentButtonActive: { backgroundColor: colors.gold },
  segmentText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  segmentTextActive: { color: colors.bgPrimary },
  loading: { gap: spacing.md, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  cardTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  cardCopy: { marginTop: spacing.sm, lineHeight: 20 },
  metaActions: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  clearButton: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.32)',
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearButtonText: { color: colors.gold, fontSize: 11, fontWeight: '900' },
  connectCard: { marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '800',
  },
  actionButton: { minWidth: 76, minHeight: 44, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.bgPrimary, fontWeight: '900' },
  textButton: { marginTop: spacing.md },
  textButtonLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  leagueList: { gap: spacing.md, marginBottom: spacing.md },
  leagueCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.bgCardAlt, padding: spacing.md },
  leagueCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.12)' },
  leagueName: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  leagueMeta: { marginTop: 4, fontSize: 12 },
  rosterCard: { marginTop: spacing.md },
  metaCard: { marginBottom: spacing.md },
  searchInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  positionButton: { minWidth: 54, minHeight: 38, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCardAlt },
  positionButtonActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.13)' },
  positionText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
  positionTextActive: { color: colors.gold },
  playerList: { gap: spacing.md },
  playerRow: { flexDirection: 'row', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.bgCardAlt, padding: spacing.md, alignItems: 'center' },
  playerMain: { flex: 1, minWidth: 0 },
  rankText: { color: colors.gold, fontSize: 13, fontWeight: '900', marginBottom: 5 },
  playerTitleRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  playerName: { flex: 1, color: colors.textPrimary, fontSize: 20, lineHeight: 23, fontWeight: '900' },
  positionBox: {
    minWidth: 34,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.28)',
    borderRadius: 6,
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  playerMeta: { marginTop: 4, fontSize: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  smallTag: { color: colors.textSecondary, borderWidth: 1, borderColor: colors.borderActive, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 3, fontSize: 10, fontWeight: '900' },
  starterTag: { color: colors.green, borderWidth: 1, borderColor: 'rgba(34,197,94,.35)', borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 3, fontSize: 10, fontWeight: '900' },
  rowActions: { alignItems: 'flex-end', gap: spacing.md },
  grade: { minWidth: 42, textAlign: 'right', color: colors.gold, fontSize: 24, fontWeight: '900' },
  hideButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  hideText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
})
