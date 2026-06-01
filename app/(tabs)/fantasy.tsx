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

type FantasyMode = 'home' | 'bestball' | 'planner' | 'sleeper'
type Position = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DST'
type PlannerLeague = 'home' | 'bestball'
type BoardMode = 'home' | 'bestball'
type BestBallView = 'players' | 'stacks'
type StackBuild = 'small' | 'full'

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
const BOARD_ORDER_STORAGE_KEY = 'kingfish_fantasy_board_order_v1'
const PLANNER_STORAGE_KEY = 'kingfish_fantasy_planner_v1'
const POSITIONS: Position[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST']
const FLEX = new Set(['RB', 'WR', 'TE'])
const PLANNER_TARGETS: Record<PlannerLeague, Record<string, number>> = {
  home: { QB: 2, RB: 5, WR: 6, TE: 2, K: 1, DST: 1 },
  bestball: { QB: 3, RB: 7, WR: 8, TE: 3 },
}
const NFL_TEAM_NAMES: Record<string, string> = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB: 'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAC: 'Jacksonville Jaguars',
  JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs',
  LAC: 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',
  LV: 'Las Vegas Raiders',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE: 'New England Patriots',
  NO: 'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks',
  SF: 'San Francisco 49ers',
  TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington Commanders',
  WSH: 'Washington Commanders',
}

function teamDisplayName(team: string) {
  return team === 'ALL' ? 'Best available stack' : NFL_TEAM_NAMES[team] || team
}

function roundLabel(rank: number) {
  return rank > 0 ? `R${Math.ceil(rank / 12)}` : 'NR'
}

function snakePick(round: number, teams: number, slot: number) {
  return round % 2 === 1
    ? (round - 1) * teams + slot
    : (round - 1) * teams + (teams - slot + 1)
}

function positionNeed(position: string, counts: Record<string, number>, targets: Record<string, number>) {
  const target = targets[position] || 0
  if (!target) return -99
  return target - (counts[position] || 0)
}

function applySavedOrder(players: DraftPlayer[], orderedIds: string[]) {
  if (!orderedIds.length) return players
  const byId = new Map(players.map(player => [player.id, player]))
  const used = new Set<string>()
  const ordered = orderedIds
    .map(id => byId.get(id))
    .filter((player): player is DraftPlayer => {
      if (!player || used.has(player.id)) return false
      used.add(player.id)
      return true
    })
  return [...ordered, ...players.filter(player => !used.has(player.id))]
}

function moveId(ids: string[], playerId: string, direction: -1 | 1) {
  const index = ids.indexOf(playerId)
  if (index < 0) return ids
  const target = index + direction
  if (target < 0 || target >= ids.length) return ids
  const next = [...ids]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

function getStackTeams(players: DraftPlayer[]) {
  return Array.from(new Set(players.map(player => player.team).filter(Boolean)))
    .filter(team => {
      const teamPlayers = players.filter(player => player.team === team)
      return teamPlayers.some(player => player.position === 'QB')
        && teamPlayers.some(player => ['WR', 'TE'].includes(player.position))
    })
    .sort((a, b) => {
      const bestA = Math.min(...players.filter(player => player.team === a).map(player => player.rank || 9999))
      const bestB = Math.min(...players.filter(player => player.team === b).map(player => player.rank || 9999))
      return bestA - bestB
    })
}

function getStackPieces(players: DraftPlayer[], team: string, build: StackBuild) {
  if (team === 'ALL') return []
  const teamPlayers = players.filter(player => player.team === team)
  const qb = [...teamPlayers].filter(player => player.position === 'QB').sort((a, b) => a.rank - b.rank)[0]
  const passCatchers = [...teamPlayers]
    .filter(player => ['WR', 'TE'].includes(player.position))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, build === 'full' ? 2 : 1)
  return [qb, ...passCatchers].filter((player): player is DraftPlayer => Boolean(player))
}

export default function FantasyToolScreen() {
  const [mode, setMode] = useState<FantasyMode>('home')
  const [position, setPosition] = useState<Position>('ALL')
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [sleeperUsername, setSleeperUsername] = useState('')
  const [activeSleeper, setActiveSleeper] = useState<{ username: string; leagueId?: string; rosterId?: string } | null>(null)
  const [profilePlayer, setProfilePlayer] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Record<BoardMode, string[]>>({ home: [], bestball: [] })
  const [boardOrder, setBoardOrder] = useState<Record<BoardMode, string[]>>({ home: [], bestball: [] })
  const [savedBoardOrder, setSavedBoardOrder] = useState<Record<BoardMode, string[]>>({ home: [], bestball: [] })
  const [boardMessage, setBoardMessage] = useState('')
  const [bestBallView, setBestBallView] = useState<BestBallView>('players')
  const [plannerLeague, setPlannerLeague] = useState<PlannerLeague>('home')
  const [plannerTeams, setPlannerTeams] = useState('12')
  const [plannerSlot, setPlannerSlot] = useState('6')
  const [plannerTaken, setPlannerTaken] = useState<string[]>([])
  const [plannerStackTeam, setPlannerStackTeam] = useState('ALL')
  const [plannerStackBuild, setPlannerStackBuild] = useState<StackBuild>('small')
  const [bestBallStackTeam, setBestBallStackTeam] = useState('ALL')

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

  useEffect(() => {
    AsyncStorage.getItem(BOARD_ORDER_STORAGE_KEY)
      .then(value => {
        if (!value) return
        const parsed = JSON.parse(value)
        const next = {
          home: Array.isArray(parsed?.home) ? parsed.home : [],
          bestball: Array.isArray(parsed?.bestball) ? parsed.bestball : [],
        }
        setBoardOrder(next)
        setSavedBoardOrder(next)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    AsyncStorage.getItem(PLANNER_STORAGE_KEY)
      .then(value => {
        if (!value) return
        const parsed = JSON.parse(value)
        if (parsed?.league === 'home' || parsed?.league === 'bestball') setPlannerLeague(parsed.league)
        if (parsed?.teams) setPlannerTeams(String(parsed.teams))
        if (parsed?.slot) setPlannerSlot(String(parsed.slot))
        if (Array.isArray(parsed?.taken)) setPlannerTaken(parsed.taken)
        if (typeof parsed?.stackTeam === 'string') setPlannerStackTeam(parsed.stackTeam)
        if (parsed?.stackBuild === 'small' || parsed?.stackBuild === 'full') setPlannerStackBuild(parsed.stackBuild)
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
  const orderedHomePlayers = useMemo(() => applySavedOrder(players, boardOrder.home), [boardOrder.home, players])
  const orderedBestBallPlayers = useMemo(
    () => applySavedOrder(bestBallPlayers.filter(player => player.position !== 'K' && player.position !== 'DST'), boardOrder.bestball),
    [bestBallPlayers, boardOrder.bestball],
  )
  useEffect(() => {
    if (!players.length && !bestBallPlayers.length) return
    const defaultOrder = {
      home: players.map(player => player.id),
      bestball: bestBallPlayers.filter(player => player.position !== 'K' && player.position !== 'DST').map(player => player.id),
    }
    setBoardOrder(current => ({
      home: current.home.length ? current.home : defaultOrder.home,
      bestball: current.bestball.length ? current.bestball : defaultOrder.bestball,
    }))
    setSavedBoardOrder(current => ({
      home: current.home.length ? current.home : defaultOrder.home,
      bestball: current.bestball.length ? current.bestball : defaultOrder.bestball,
    }))
  }, [bestBallPlayers, players])

  const boardPlayers = useMemo(() => {
    const sourcePlayers = mode === 'bestball' ? orderedBestBallPlayers : orderedHomePlayers
    const hidden = new Set(mode === 'bestball' ? hiddenIds.bestball : hiddenIds.home)
    return sourcePlayers
      .filter(player => !hidden.has(player.id))
      .filter(player => position === 'ALL' || (position === 'FLEX' ? FLEX.has(player.position) : player.position === position))
      .filter(player => {
        const needle = search.trim().toLowerCase()
        if (!needle) return true
        return player.name.toLowerCase().includes(needle) || player.team.toLowerCase().includes(needle)
      })
      .slice(0, 80)
  }, [hiddenIds.bestball, hiddenIds.home, mode, orderedBestBallPlayers, orderedHomePlayers, position, search])

  const activeHiddenCount = mode === 'bestball' ? hiddenIds.bestball.length : hiddenIds.home.length
  const activeBoardMode: BoardMode = mode === 'bestball' ? 'bestball' : 'home'
  const boardDirty = (mode === 'home' || mode === 'bestball') && boardOrder[activeBoardMode].join('|') !== savedBoardOrder[activeBoardMode].join('|')
  const plannerTeamsNum = Math.max(8, Math.min(14, Number(plannerTeams) || 12))
  const plannerSlotNum = Math.max(1, Math.min(plannerTeamsNum, Number(plannerSlot) || 1))
  const plannerRounds = plannerLeague === 'bestball' ? 18 : 16
  const plannerSourcePlayers = plannerLeague === 'bestball' ? orderedBestBallPlayers : orderedHomePlayers
  const plannerStackTeams = useMemo(() => getStackTeams(plannerSourcePlayers), [plannerSourcePlayers])
  const plannerStackPieces = useMemo(
    () => getStackPieces(plannerSourcePlayers, plannerStackTeam, plannerStackBuild),
    [plannerSourcePlayers, plannerStackBuild, plannerStackTeam],
  )
  const bestBallStackTeams = useMemo(() => getStackTeams(orderedBestBallPlayers), [orderedBestBallPlayers])
  const plannerTakenPlayers = useMemo(() => {
    const byId = new Map(plannerSourcePlayers.map(player => [player.id, player]))
    return plannerTaken.map(id => byId.get(id)).filter((player): player is DraftPlayer => Boolean(player))
  }, [plannerSourcePlayers, plannerTaken])
  const plannerPath = useMemo(() => {
    const taken = new Set(plannerTaken)
    const used = new Set<string>()
    const counts: Record<string, number> = {}
    const targets = PLANNER_TARGETS[plannerLeague]
    const stackTargets = plannerStackPieces.filter(player => !taken.has(player.id))

    return Array.from({ length: plannerRounds }, (_, index) => {
      const round = index + 1
      const pick = snakePick(round, plannerTeamsNum, plannerSlotNum)
      const candidates = plannerSourcePlayers.filter(player => !taken.has(player.id) && !used.has(player.id))
      const nearPick = candidates.filter(player => (player.rank || 9999) >= Math.max(1, pick - 10))
      const stackPick = stackTargets.find(player => {
        if (used.has(player.id)) return false
        const rank = player.rank || 9999
        return rank <= pick + 30 || round >= 10
      })
      const preferred = stackPick
        || nearPick.find(player => positionNeed(player.position, counts, targets) > 0)
        || candidates.find(player => positionNeed(player.position, counts, targets) > 0)
        || nearPick[0]
        || candidates[0]
        || null

      if (preferred) {
        used.add(preferred.id)
        counts[preferred.position] = (counts[preferred.position] || 0) + 1
      }

      return { round, pick, player: preferred }
    })
  }, [plannerLeague, plannerRounds, plannerSlotNum, plannerSourcePlayers, plannerStackPieces, plannerTaken, plannerTeamsNum])
  const plannerCounts = useMemo(() => {
    return plannerPath.reduce<Record<string, number>>((counts, item) => {
      if (item.player?.position) counts[item.player.position] = (counts[item.player.position] || 0) + 1
      return counts
    }, {})
  }, [plannerPath])

  useEffect(() => {
    AsyncStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({
      league: plannerLeague,
      teams: plannerTeams,
      slot: plannerSlot,
      taken: plannerTaken,
      stackTeam: plannerStackTeam,
      stackBuild: plannerStackBuild,
    })).catch(() => {})
  }, [plannerLeague, plannerSlot, plannerStackBuild, plannerStackTeam, plannerTaken, plannerTeams])

  useEffect(() => {
    if (plannerStackTeam !== 'ALL' && !plannerStackTeams.includes(plannerStackTeam)) {
      setPlannerStackTeam('ALL')
    }
  }, [plannerStackTeam, plannerStackTeams])

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

  function moveBoardPlayer(playerId: string, direction: -1 | 1) {
    if (mode !== 'home' && mode !== 'bestball') return
    const sourcePlayers = mode === 'bestball' ? orderedBestBallPlayers : orderedHomePlayers
    const completeOrder = boardOrder[mode].length ? boardOrder[mode] : sourcePlayers.map(player => player.id)
    setBoardMessage('')
    setBoardOrder(current => ({
      ...current,
      [mode]: moveId(completeOrder, playerId, direction),
    }))
  }

  async function saveBoard() {
    if (mode !== 'home' && mode !== 'bestball') return
    const next = { ...savedBoardOrder, [mode]: boardOrder[mode] }
    setSavedBoardOrder(next)
    await AsyncStorage.setItem(BOARD_ORDER_STORAGE_KEY, JSON.stringify(next))
    setBoardMessage('Board saved.')
  }

  async function resetBoardOrder() {
    if (mode !== 'home' && mode !== 'bestball') return
    const sourcePlayers = mode === 'bestball'
      ? bestBallPlayers.filter(player => player.position !== 'K' && player.position !== 'DST')
      : players
    const nextOrder = sourcePlayers.map(player => player.id)
    const next = { ...boardOrder, [mode]: nextOrder }
    const nextSaved = { ...savedBoardOrder, [mode]: nextOrder }
    setBoardOrder(next)
    setSavedBoardOrder(nextSaved)
    setBoardMessage('Board reset.')
    await AsyncStorage.setItem(BOARD_ORDER_STORAGE_KEY, JSON.stringify(nextSaved))
  }

  async function savePlannerState(nextTaken = plannerTaken) {
    await AsyncStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({
      league: plannerLeague,
      teams: plannerTeams,
      slot: plannerSlot,
      taken: nextTaken,
      stackTeam: plannerStackTeam,
      stackBuild: plannerStackBuild,
    }))
  }

  async function markPlannerTaken(playerId?: string) {
    if (!playerId) return
    const next = Array.from(new Set([...plannerTaken, playerId]))
    setPlannerTaken(next)
    await savePlannerState(next)
  }

  async function clearPlannerTaken() {
    setPlannerTaken([])
    await savePlannerState([])
  }

  async function removePlannerTaken(playerId: string) {
    const next = plannerTaken.filter(id => id !== playerId)
    setPlannerTaken(next)
    await savePlannerState(next)
  }

  const selectedSleeper = fantasyQuery.data?.sleeper?.selected
  const rosterPlayers = selectedSleeper?.playerDetails || []
  const starters = new Set((selectedSleeper?.roster?.starters || []).map(String))

  return (
    <Screen>
      <Pressable onPress={() => router.push('/cheat-sheets')} style={styles.backButton}>
        <AppText style={styles.backText}>Tools</AppText>
      </Pressable>

      <AppText variant="title" style={styles.title}>Fantasy Hub</AppText>
      <AppText variant="muted" style={styles.copy}>
        Draft boards and team tracking for football season.
      </AppText>

      <View style={styles.segmentRow}>
        {([
          { key: 'home', label: 'Home' },
          { key: 'bestball', label: 'Best Ball' },
          { key: 'planner', label: 'Planner' },
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
              <AppText variant="muted" style={styles.cardCopy}>Week {selectedSleeper.week}</AppText>
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
      ) : mode === 'planner' ? (
        <>
          <Card style={styles.metaCard}>
            <AppText style={[styles.cardTitle, styles.cardTitleFirst]}>Draft Path</AppText>
            <AppText variant="muted" style={styles.cardCopy}>Uses your saved Home or Best Ball board order.</AppText>

            <View style={styles.plannerToggleRow}>
              {(['home', 'bestball'] as PlannerLeague[]).map(item => (
                <Pressable key={item} onPress={() => {
                  setPlannerLeague(item)
                  setPlannerTaken([])
                }} style={[styles.plannerToggle, plannerLeague === item && styles.plannerToggleActive]}>
                  <AppText style={[styles.plannerToggleText, plannerLeague === item && styles.plannerToggleTextActive]}>
                    {item === 'home' ? 'Home League' : 'Best Ball'}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View style={styles.plannerInputs}>
              <View style={styles.plannerInputBlock}>
                <AppText variant="eyebrow">Teams</AppText>
                <TextInput
                  value={plannerTeams}
                  onChangeText={setPlannerTeams}
                  keyboardType="number-pad"
                  placeholder="12"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={styles.plannerInputBlock}>
                <AppText variant="eyebrow">Slot</AppText>
                <TextInput
                  value={plannerSlot}
                  onChangeText={setPlannerSlot}
                  keyboardType="number-pad"
                  placeholder="6"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.plannerStackBlock}>
              <TeamDropdown
                label="Stack Team"
                value={plannerStackTeam}
                teams={plannerStackTeams}
                onChange={team => {
                  setPlannerStackTeam(team)
                  setPlannerTaken([])
                }}
              />
              <View style={styles.stackBuildRow}>
                {([
                  { key: 'small', label: 'QB + 1' },
                  { key: 'full', label: 'QB + 2' },
                ] as Array<{ key: StackBuild; label: string }>).map(item => (
                  <Pressable key={item.key} onPress={() => setPlannerStackBuild(item.key)} style={[styles.stackBuildButton, plannerStackBuild === item.key && styles.stackBuildButtonActive]}>
                    <AppText style={[styles.stackBuildText, plannerStackBuild === item.key && styles.stackBuildTextActive]}>{item.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>

            {plannerStackPieces.length ? (
              <View style={styles.stackPlan}>
                <AppText variant="eyebrow">{teamDisplayName(plannerStackTeam)} Stack Plan</AppText>
                {plannerStackPieces.map(player => (
                  <View key={player.id} style={styles.stackPlanRow}>
                    <AppText style={styles.stackPlanName}>{player.name}</AppText>
                    <AppText style={styles.stackPlanMeta}>{player.position} · #{player.rank}</AppText>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.plannerSummary}>
              {Object.entries(PLANNER_TARGETS[plannerLeague]).map(([pos, target]) => (
                <View key={pos} style={styles.plannerSummaryItem}>
                  <AppText style={styles.plannerSummaryPos}>{pos}</AppText>
                  <AppText style={styles.plannerSummaryCount}>{plannerCounts[pos] || 0}/{target}</AppText>
                </View>
              ))}
            </View>

            <View style={styles.boardButtonRow}>
              <Pressable onPress={clearPlannerTaken} disabled={!plannerTaken.length} style={[styles.clearButton, !plannerTaken.length && styles.disabledButton]}>
                <AppText style={styles.clearButtonText}>Clear Taken</AppText>
              </Pressable>
              <Pressable onPress={() => setMode(plannerLeague)} style={styles.clearButton}>
                <AppText style={styles.clearButtonText}>Open Board</AppText>
              </Pressable>
            </View>
            {plannerTakenPlayers.length ? (
              <View style={styles.takenList}>
                <AppText variant="eyebrow">Taken</AppText>
                <View style={styles.takenChipRow}>
                  {plannerTakenPlayers.slice(0, 8).map(player => (
                    <Pressable key={player.id} onPress={() => removePlannerTaken(player.id)} style={styles.takenChip}>
                      <AppText style={styles.takenChipText}>{player.name}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>

          <View style={styles.playerList}>
            {plannerPath.map(item => (
              <PlannerPickCard
                key={`${item.round}-${item.pick}`}
                round={item.round}
                pick={item.pick}
                player={item.player}
                onPress={() => item.player && setProfilePlayer(item.player.name)}
                onTaken={() => markPlannerTaken(item.player?.id)}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <Card style={styles.metaCard}>
            <AppText style={[styles.cardTitle, styles.cardTitleFirst]}>{mode === 'bestball' ? 'Best Ball Board' : 'Home League Board'}</AppText>
            <AppText variant="muted" style={styles.cardCopy}>
              Move players into your order, then save the board for draft day.
            </AppText>
            {mode === 'bestball' ? (
              <View style={styles.boardToggleRow}>
                {([
                  { key: 'players', label: 'Players' },
                  { key: 'stacks', label: 'Stacks' },
                ] as Array<{ key: BestBallView; label: string }>).map(item => (
                  <Pressable key={item.key} onPress={() => setBestBallView(item.key)} style={[styles.boardToggle, bestBallView === item.key && styles.boardToggleActive]}>
                    <AppText style={[styles.boardToggleText, bestBallView === item.key && styles.boardToggleTextActive]}>{item.label}</AppText>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.metaActions}>
              <View style={styles.boardButtonRow}>
                <Pressable onPress={saveBoard} disabled={!boardDirty} style={[styles.clearButton, !boardDirty && styles.disabledButton]}>
                  <AppText style={styles.clearButtonText}>Save Board</AppText>
                </Pressable>
                <Pressable onPress={resetBoardOrder} style={styles.clearButton}>
                  <AppText style={styles.clearButtonText}>Reset</AppText>
                </Pressable>
              </View>
              {activeHiddenCount ? (
                <Pressable onPress={resetHiddenPlayers} style={styles.clearButton}>
                  <AppText style={styles.clearButtonText}>Show {activeHiddenCount}</AppText>
                </Pressable>
              ) : null}
            </View>
            {boardMessage ? <AppText style={styles.savedMessage}>{boardMessage}</AppText> : null}
          </Card>

          {mode === 'bestball' && bestBallView === 'stacks' ? (
            <StackBoard
              players={orderedBestBallPlayers}
              selectedTeam={bestBallStackTeam}
              teams={bestBallStackTeams}
              onSelectTeam={setBestBallStackTeam}
              onPressPlayer={setProfilePlayer}
            />
          ) : (
            <>
              <View style={styles.positionGrid}>
                <Pressable
                  onPress={() => setSearchOpen(open => !open)}
                  style={[styles.positionButton, (searchOpen || !!search) && styles.positionButtonActive]}
                >
                  <AppText style={[styles.positionText, (searchOpen || !!search) && styles.positionTextActive]}>Search</AppText>
                </Pressable>
                {POSITIONS.filter(pos => mode !== 'bestball' || (pos !== 'K' && pos !== 'DST')).map(pos => (
                  <Pressable key={pos} onPress={() => setPosition(pos)} style={[styles.positionButton, position === pos && styles.positionButtonActive]}>
                    <AppText style={[styles.positionText, position === pos && styles.positionTextActive]}>{pos}</AppText>
                  </Pressable>
                ))}
              </View>

              {searchOpen ? (
                <View style={styles.searchRow}>
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search player or team"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    autoCorrect={false}
                    style={styles.searchInput}
                  />
                  {search ? <AppText onPress={() => setSearch('')} style={styles.clearText}>Clear</AppText> : null}
                </View>
              ) : null}

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
                    onMoveUp={() => moveBoardPlayer(player.id, -1)}
                    onMoveDown={() => moveBoardPlayer(player.id, 1)}
                  />
                ))}
              </View>
            </>
          )}
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
  onMoveUp,
  onMoveDown,
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
  onMoveUp?: () => void
  onMoveDown?: () => void
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
        {onMoveUp || onMoveDown ? (
          <View style={styles.moveRow}>
            {onMoveUp ? (
              <Pressable onPress={event => {
                event.stopPropagation()
                onMoveUp()
              }} style={styles.moveButton}>
                <AppText style={styles.moveText}>↑</AppText>
              </Pressable>
            ) : null}
            {onMoveDown ? (
              <Pressable onPress={event => {
                event.stopPropagation()
                onMoveDown()
              }} style={styles.moveButton}>
                <AppText style={styles.moveText}>↓</AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
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

function TeamDropdown({
  label,
  value,
  teams,
  onChange,
}: {
  label: string
  value: string
  teams: string[]
  onChange: (team: string) => void
}) {
  const [open, setOpen] = useState(false)
  const options = ['ALL', ...teams]

  return (
    <View style={styles.dropdownWrap}>
      <AppText variant="eyebrow">{label}</AppText>
      <Pressable onPress={() => setOpen(current => !current)} style={styles.dropdownButton}>
        <AppText style={styles.dropdownText}>{teamDisplayName(value)}</AppText>
        <AppText style={styles.dropdownChevron}>{open ? '↑' : '↓'}</AppText>
      </Pressable>
      {open ? (
        <View style={styles.dropdownMenu}>
          {options.map(team => (
            <Pressable key={team} onPress={() => {
              onChange(team)
              setOpen(false)
            }} style={[styles.dropdownOption, value === team && styles.dropdownOptionActive]}>
              <AppText style={[styles.dropdownOptionText, value === team && styles.dropdownOptionTextActive]}>
                {teamDisplayName(team)}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function StackBoard({
  players,
  selectedTeam,
  teams,
  onSelectTeam,
  onPressPlayer,
}: {
  players: DraftPlayer[]
  selectedTeam: string
  teams: string[]
  onSelectTeam: (team: string) => void
  onPressPlayer: (name: string) => void
}) {
  const visiblePlayers = selectedTeam === 'ALL' ? players : players.filter(player => player.team === selectedTeam)
  const stacks = players
    .filter(player => player.position === 'QB')
    .filter(player => selectedTeam === 'ALL' || player.team === selectedTeam)
    .slice(0, 18)
    .map(qb => {
      const partners = players
        .filter(player => player.team === qb.team && ['WR', 'TE', 'RB'].includes(player.position) && player.id !== qb.id)
        .slice(0, 4)
      const score = partners.reduce((total, player) => total + Math.max(0, 220 - (player.rank || 220)), Math.max(0, 220 - (qb.rank || 220)))
      return { qb, partners, score }
    })
    .filter(stack => stack.partners.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
  const selectedTeamPlayers = selectedTeam === 'ALL'
    ? null
    : {
        quarterbacks: visiblePlayers.filter(player => player.position === 'QB').sort((a, b) => a.rank - b.rank),
        passCatchers: visiblePlayers.filter(player => ['WR', 'TE'].includes(player.position)).sort((a, b) => a.rank - b.rank),
        backs: visiblePlayers.filter(player => player.position === 'RB').sort((a, b) => a.rank - b.rank),
      }

  return (
    <View style={styles.playerList}>
      <Card style={styles.stackFilterCard}>
        <TeamDropdown label="Team Stack" value={selectedTeam} teams={teams} onChange={onSelectTeam} />
      </Card>
      {selectedTeamPlayers ? (
        <Card style={styles.stackCard}>
          <AppText variant="eyebrow">{teamDisplayName(selectedTeam)} Stack Board</AppText>
          <StackSection title="QB" players={selectedTeamPlayers.quarterbacks} onPressPlayer={onPressPlayer} />
          <StackSection title="WR / TE" players={selectedTeamPlayers.passCatchers} onPressPlayer={onPressPlayer} />
          <StackSection title="RB Adds" players={selectedTeamPlayers.backs} onPressPlayer={onPressPlayer} />
        </Card>
      ) : null}
      {stacks.map(stack => (
        <Card key={stack.qb.id} style={styles.stackCard}>
          <View style={styles.stackHead}>
            <View>
              <AppText variant="eyebrow">{teamDisplayName(stack.qb.team)} Stack</AppText>
              <Pressable onPress={() => onPressPlayer(stack.qb.name)}>
                <AppText style={styles.stackTitle}>{stack.qb.name}</AppText>
              </Pressable>
            </View>
            <AppText style={styles.positionBox}>QB</AppText>
          </View>
          <View style={styles.stackPartnerList}>
            {stack.partners.map(player => (
              <Pressable key={player.id} onPress={() => onPressPlayer(player.name)} style={styles.stackPartner}>
                <View style={styles.stackPartnerMain}>
                  <AppText style={styles.stackPartnerName}>{player.name}</AppText>
                  <AppText variant="muted" style={styles.stackPartnerMeta}>#{player.rank} · {roundLabel(player.rank)}</AppText>
                </View>
                <AppText style={styles.positionBox}>{player.position}</AppText>
              </Pressable>
            ))}
          </View>
        </Card>
      ))}
    </View>
  )
}

function StackSection({
  title,
  players,
  onPressPlayer,
}: {
  title: string
  players: DraftPlayer[]
  onPressPlayer: (name: string) => void
}) {
  if (!players.length) return null
  return (
    <View style={styles.stackSection}>
      <AppText style={styles.stackSectionTitle}>{title}</AppText>
      {players.slice(0, 8).map(player => (
        <Pressable key={player.id} onPress={() => onPressPlayer(player.name)} style={styles.stackPartner}>
          <View style={styles.stackPartnerMain}>
            <AppText style={styles.stackPartnerName}>{player.name}</AppText>
            <AppText variant="muted" style={styles.stackPartnerMeta}>#{player.rank} · {roundLabel(player.rank)}</AppText>
          </View>
          <AppText style={styles.positionBox}>{player.position}</AppText>
        </Pressable>
      ))}
    </View>
  )
}

function PlannerPickCard({
  round,
  pick,
  player,
  onPress,
  onTaken,
}: {
  round: number
  pick: number
  player: DraftPlayer | null
  onPress: () => void
  onTaken: () => void
}) {
  return (
    <Pressable onPress={onPress} disabled={!player} style={styles.plannerPickCard}>
      <View style={styles.plannerPickHead}>
        <AppText style={styles.plannerRound}>R{round}</AppText>
        <AppText style={styles.plannerPick}>Pick {pick}</AppText>
      </View>
      {player ? (
        <>
          <View style={styles.playerTitleRow}>
            <AppText style={styles.playerName}>{player.name}</AppText>
            <AppText style={styles.positionBox}>{player.position}</AppText>
          </View>
          <AppText variant="muted" style={styles.playerMeta}>
            {player.team || '-'} · Rank #{player.rank}
          </AppText>
          <View style={styles.plannerActions}>
            <AppText style={styles.grade}>{player.grade || '-'}</AppText>
            <Pressable onPress={event => {
              event.stopPropagation()
              onTaken()
            }} style={styles.plannerTakenButton}>
              <AppText style={styles.plannerTakenText}>Taken</AppText>
            </Pressable>
          </View>
        </>
      ) : (
        <AppText variant="muted" style={styles.cardCopy}>No player found.</AppText>
      )}
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
  cardTitleFirst: { marginTop: 0 },
  cardCopy: { marginTop: spacing.sm, lineHeight: 20 },
  metaActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md },
  boardButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  boardToggleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  boardToggle: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCardAlt },
  boardToggleActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.14)' },
  boardToggleText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  boardToggleTextActive: { color: colors.gold },
  clearButton: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.32)',
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disabledButton: { opacity: 0.45 },
  clearButtonText: { color: colors.gold, fontSize: 11, fontWeight: '900' },
  savedMessage: { color: colors.green, fontSize: 12, fontWeight: '800', marginTop: spacing.sm },
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
  plannerToggleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  plannerToggle: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCardAlt },
  plannerToggleActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.14)' },
  plannerToggleText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  plannerToggleTextActive: { color: colors.gold },
  plannerInputs: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
  plannerInputBlock: { flex: 1, gap: spacing.xs },
  plannerStackBlock: { gap: spacing.md, marginBottom: spacing.md },
  stackBuildRow: { flexDirection: 'row', gap: spacing.sm },
  stackBuildButton: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCardAlt },
  stackBuildButtonActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.14)' },
  stackBuildText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900' },
  stackBuildTextActive: { color: colors.gold },
  stackPlan: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.bgCardAlt },
  stackPlanRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  stackPlanName: { flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '900' },
  stackPlanMeta: { color: colors.gold, fontSize: 11, fontWeight: '900' },
  plannerSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  plannerSummaryItem: { minWidth: 58, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, backgroundColor: colors.bgCardAlt },
  plannerSummaryPos: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  plannerSummaryCount: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 2 },
  plannerPickCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.bgCardAlt, padding: spacing.md },
  plannerPickHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.md },
  plannerRound: { color: colors.gold, fontSize: 14, fontWeight: '900' },
  plannerPick: { color: colors.textSecondary, fontSize: 14, fontWeight: '900' },
  plannerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  plannerTakenButton: { borderWidth: 1, borderColor: colors.borderActive, borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  plannerTakenText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  takenList: { gap: spacing.sm, marginTop: spacing.md },
  takenChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  takenChip: { borderWidth: 1, borderColor: colors.borderActive, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.bgCardAlt },
  takenChipText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  leagueList: { gap: spacing.md, marginBottom: spacing.md },
  leagueCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.bgCardAlt, padding: spacing.md },
  leagueCardActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.12)' },
  leagueName: { color: colors.textPrimary, fontSize: 18, fontWeight: '900' },
  leagueMeta: { marginTop: 4, fontSize: 12 },
  rosterCard: { marginTop: spacing.md },
  metaCard: { marginBottom: spacing.md },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.borderActive,
    borderRadius: 8,
    backgroundColor: colors.bgCard,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '800',
  },
  clearText: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
  },
  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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
  moveRow: { flexDirection: 'row', gap: spacing.xs },
  moveButton: { width: 34, height: 34, borderWidth: 1, borderColor: colors.borderActive, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard },
  moveText: { color: colors.textSecondary, fontSize: 16, fontWeight: '900' },
  hideButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  hideText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  dropdownWrap: { gap: spacing.xs },
  dropdownButton: { minHeight: 44, borderWidth: 1, borderColor: colors.borderActive, borderRadius: 8, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, backgroundColor: colors.bgCard },
  dropdownText: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  dropdownChevron: { color: colors.textSecondary, fontSize: 14, fontWeight: '900' },
  dropdownMenu: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.bgCardAlt },
  dropdownOption: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownOptionActive: { backgroundColor: 'rgba(198,145,50,.14)' },
  dropdownOptionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '900' },
  dropdownOptionTextActive: { color: colors.gold },
  stackFilterCard: { padding: spacing.md },
  stackCard: { gap: spacing.md },
  stackHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start' },
  stackTitle: { color: colors.textPrimary, fontSize: 22, lineHeight: 26, fontWeight: '900', marginTop: 4 },
  stackSection: { gap: spacing.sm, paddingTop: spacing.sm },
  stackSectionTitle: { color: colors.gold, fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  stackPartnerList: { gap: spacing.sm },
  stackPartner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  stackPartnerMain: { flex: 1, minWidth: 0 },
  stackPartnerName: { color: colors.textPrimary, fontSize: 16, fontWeight: '900' },
  stackPartnerMeta: { marginTop: 2, fontSize: 11 },
})
