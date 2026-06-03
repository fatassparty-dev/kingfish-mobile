import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Card } from '@/components/Card'
import { PlayerProfileModal } from '@/components/dashboard/PlayerProfileModal'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { kingfishFetch } from '@/lib/api'
import { colors, spacing } from '@/lib/theme'

type FantasyMode = 'home' | 'bestball' | 'planner' | 'teams'
type Position = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DST'
type PlannerLeague = 'home' | 'bestball'
type BoardMode = 'home' | 'bestball'
type BestBallView = 'players' | 'stacks'
type StackBuild = 'small' | 'full'
type DraftFormat = 'PPR' | 'Half PPR' | 'Standard'
type PlannerRoundFilter = 'ALL' | 'EARLY' | 'MIDDLE' | 'LATE' | 'END'

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

type ManualTeam = {
  id: string
  name: string
  format: DraftFormat
  playerIds: string[]
  createdAt: string
}

type FantasyPayload = {
  generated_at?: string | null
  latest_season?: number | null
  players: DraftPlayer[]
  bestBallPlayers?: DraftPlayer[]
  sleeper?: {
    user?: { user_id: string; username: string; display_name?: string } | null
    leagues?: SleeperLeague[]
    leaguesTotal?: number
    leaguesLimit?: number
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
const MANUAL_TEAMS_STORAGE_KEY = 'kingfish_fantasy_manual_teams_v1'
const HIDDEN_STORAGE_KEY = 'kingfish_fantasy_hidden_v1'
const BOARD_ORDER_STORAGE_KEY = 'kingfish_fantasy_board_order_v1'
const PLANNER_STORAGE_KEY = 'kingfish_fantasy_planner_v1'
const POSITIONS: Position[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST']
const FLEX = new Set(['RB', 'WR', 'TE'])
const DRAFT_SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'FLEX', 'BENCH']
const DRAFT_SLOT_LABELS: Record<string, string> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'Tight End',
  K: 'Kicker',
  DST: 'Defense',
  FLEX: 'Flex',
  BENCH: 'Bench',
}
const DEFAULT_DRAFT_TARGETS: Record<PlannerLeague, Record<string, number>> = {
  home: { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1, FLEX: 1, BENCH: 7 },
  bestball: { QB: 2, RB: 2, WR: 3, TE: 1, FLEX: 2, BENCH: 8 },
}
const PLANNER_ROUND_FILTERS: Array<{ key: PlannerRoundFilter; label: string }> = [
  { key: 'ALL', label: 'All Rounds' },
  { key: 'EARLY', label: 'R1-4' },
  { key: 'MIDDLE', label: 'R5-8' },
  { key: 'LATE', label: 'R9-12' },
  { key: 'END', label: 'R13+' },
]
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

function positionCounts(players: Array<{ position?: string | null }>) {
  return players.reduce<Record<string, number>>((counts, player) => {
    const position = player.position || 'UNK'
    counts[position] = (counts[position] || 0) + 1
    return counts
  }, {})
}

function rosterRead(players: Array<{ position?: string | null; risk?: string | null; injury_status?: string | null }>) {
  const counts = positionCounts(players)
  const skillDepth = (counts.RB || 0) + (counts.WR || 0) + (counts.TE || 0)
  const riskCount = players.filter(player => player.risk && player.risk !== 'Low').length
  const injuryCount = players.filter(player => player.injury_status).length
  const strength = counts.WR >= 5 ? 'WR depth' : counts.RB >= 4 ? 'RB depth' : counts.QB >= 2 ? 'QB depth' : skillDepth >= 8 ? 'Skill depth' : 'Core starters'
  const watch = counts.RB < 3
    ? 'RB depth'
    : counts.WR < 4
      ? 'WR depth'
      : counts.TE < 1
        ? 'TE depth'
        : injuryCount
          ? 'Injury tags'
          : riskCount
            ? 'Role risk'
            : 'Waiver upgrades'
  return { counts, strength, watch, riskCount, injuryCount }
}

function makeDefaultDraftTargets() {
  return {
    home: { ...DEFAULT_DRAFT_TARGETS.home },
    bestball: { ...DEFAULT_DRAFT_TARGETS.bestball },
  }
}

function rosterSlotSummary(players: Array<{ position?: string | null }>, slots: Record<string, number>) {
  const counts = positionCounts(players)
  const used: Record<string, number> = {}
  const directPositions = DRAFT_SLOT_ORDER.filter(position => position !== 'FLEX' && position !== 'BENCH' && position in slots)
  const entries = directPositions.map(position => {
    const count = Math.min(counts[position] || 0, slots[position] || 0)
    used[position] = count
    return { position, count, target: slots[position] || 0 }
  })
  const flexAvailable = ['RB', 'WR', 'TE'].reduce((total, position) => total + Math.max(0, (counts[position] || 0) - (used[position] || 0)), 0)
  const flexTarget = slots.FLEX || 0
  const flexCount = Math.min(flexAvailable, flexTarget)
  const starterCount = entries.reduce((total, entry) => total + entry.count, 0) + flexCount
  const benchCount = Math.max(0, players.length - starterCount)
  return [
    ...entries,
    ...(flexTarget ? [{ position: 'FLEX', count: flexCount, target: flexTarget }] : []),
    { position: 'BENCH', count: benchCount, target: slots.BENCH || 0 },
  ]
}

function matchesRoundFilter(round: number, filter: PlannerRoundFilter) {
  if (filter === 'EARLY') return round <= 4
  if (filter === 'MIDDLE') return round >= 5 && round <= 8
  if (filter === 'LATE') return round >= 9 && round <= 12
  if (filter === 'END') return round >= 13
  return true
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
  const [plannerSearch, setPlannerSearch] = useState('')
  const [plannerSearchOpen, setPlannerSearchOpen] = useState(false)
  const [plannerPositionFilter, setPlannerPositionFilter] = useState<Position>('ALL')
  const [plannerRoundFilter, setPlannerRoundFilter] = useState<PlannerRoundFilter>('ALL')
  const [bestBallStackTeam, setBestBallStackTeam] = useState('ALL')
  const [manualTeams, setManualTeams] = useState<ManualTeam[]>([])
  const [draftModalOpen, setDraftModalOpen] = useState(false)
  const [leagueSettingsOpen, setLeagueSettingsOpen] = useState(false)
  const [teamEditOpen, setTeamEditOpen] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState('')
  const [editingTeamFormat, setEditingTeamFormat] = useState<DraftFormat>('PPR')
  const [draftName, setDraftName] = useState('')
  const [draftFormat, setDraftFormat] = useState<DraftFormat>('PPR')
  const [draftTargets, setDraftTargets] = useState<Record<PlannerLeague, Record<string, number>>>(() => makeDefaultDraftTargets())
  const [draftPlayerIds, setDraftPlayerIds] = useState<string[]>([])

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
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    AsyncStorage.getItem(MANUAL_TEAMS_STORAGE_KEY)
      .then(value => {
        if (!value) return
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) setManualTeams(parsed)
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
  const plannerSourcePlayers = plannerLeague === 'bestball' ? orderedBestBallPlayers : orderedHomePlayers
  const currentDraftTargets = draftTargets[plannerLeague]
  const bestBallStackTeams = useMemo(() => getStackTeams(orderedBestBallPlayers), [orderedBestBallPlayers])
  const allRankedPlayers = useMemo(() => {
    const byId = new Map<string, DraftPlayer>()
    ;[...orderedHomePlayers, ...orderedBestBallPlayers].forEach(player => {
      if (!byId.has(player.id)) byId.set(player.id, player)
    })
    return Array.from(byId.values()).sort((a, b) => a.rank - b.rank)
  }, [orderedBestBallPlayers, orderedHomePlayers])
  const draftSelectedPlayers = useMemo(() => {
    const byId = new Map(allRankedPlayers.map(player => [player.id, player]))
    return draftPlayerIds.map(id => byId.get(id)).filter((player): player is DraftPlayer => Boolean(player))
  }, [allRankedPlayers, draftPlayerIds])
  const manualTeamCards = useMemo(() => {
    const byId = new Map(allRankedPlayers.map(player => [player.id, player]))
    return manualTeams.map(team => {
      const teamPlayers = team.playerIds.map(id => byId.get(id)).filter((player): player is DraftPlayer => Boolean(player))
      return {
        team,
        players: teamPlayers,
        read: rosterRead(teamPlayers),
      }
    })
  }, [allRankedPlayers, manualTeams])
  const currentDraftRead = useMemo(() => rosterRead(draftSelectedPlayers), [draftSelectedPlayers])
  const currentDraftSlots = useMemo(() => rosterSlotSummary(draftSelectedPlayers, currentDraftTargets), [currentDraftTargets, draftSelectedPlayers])
  const plannerPickerPlayers = useMemo(() => {
    const selected = new Set(draftPlayerIds)
    const needle = plannerSearch.trim().toLowerCase()
    return plannerSourcePlayers
      .filter(player => !selected.has(player.id))
      .filter(player => matchesRoundFilter(Math.ceil((player.rank || 9999) / 12), plannerRoundFilter))
      .filter(player => {
        if (plannerPositionFilter === 'ALL') return true
        if (plannerPositionFilter === 'FLEX') return FLEX.has(player.position)
        return player.position === plannerPositionFilter
      })
      .filter(player => {
        if (!needle) return true
        return player.name.toLowerCase().includes(needle) || player.team.toLowerCase().includes(needle) || player.position.toLowerCase().includes(needle)
      })
      .slice(0, 120)
  }, [draftPlayerIds, plannerPositionFilter, plannerRoundFilter, plannerSearch, plannerSourcePlayers])
  const plannerPositionOptions = POSITIONS.filter(pos => plannerLeague !== 'bestball' || (pos !== 'K' && pos !== 'DST'))

  useEffect(() => {
    AsyncStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify({
      league: plannerLeague,
    })).catch(() => {})
  }, [plannerLeague])

  async function connectSleeper() {
    const username = sleeperUsername.trim()
    if (!username) return
    const next = { username }
    setActiveSleeper(next)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setMode('teams')
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

  function pickPlannerPlayer(player?: DraftPlayer | null) {
    if (!player) return
    setDraftPlayerIds(ids => Array.from(new Set([...ids, player.id])))
    if (!draftName.trim()) setDraftName('My Draft')
  }

  function clearCurrentDraft() {
    setDraftPlayerIds([])
    setDraftName('')
    setPlannerSearch('')
  }

  function openDraftModal(reset = true) {
    if (reset) {
      setDraftName('')
      setDraftFormat('PPR')
      setDraftPlayerIds([])
    }
    setDraftModalOpen(true)
  }

  function updateDraftTarget(position: string, delta: -1 | 1) {
    setDraftTargets(current => {
      const leagueTargets = current[plannerLeague]
      const nextValue = Math.max(0, Math.min(20, (leagueTargets[position] || 0) + delta))
      return {
        ...current,
        [plannerLeague]: {
          ...leagueTargets,
          [position]: nextValue,
        },
      }
    })
  }

  async function saveManualTeam() {
    const name = draftName.trim()
    if (!name) {
      Alert.alert('Team Name Needed', 'Add a name for this saved draft.')
      return
    }
    if (draftPlayerIds.length < 5) {
      Alert.alert('Add More Players', 'Save at least 5 drafted players so KingFish can monitor the roster.')
      return
    }
    const nextTeam: ManualTeam = {
      id: `${Date.now()}`,
      name,
      format: draftFormat,
      playerIds: draftPlayerIds,
      createdAt: new Date().toISOString(),
    }
    const next = [nextTeam, ...manualTeams]
    setManualTeams(next)
    await AsyncStorage.setItem(MANUAL_TEAMS_STORAGE_KEY, JSON.stringify(next))
    setDraftModalOpen(false)
    setDraftName('')
    setDraftPlayerIds([])
    setMode('teams')
  }

  async function deleteManualTeam(teamId: string) {
    const next = manualTeams.filter(team => team.id !== teamId)
    setManualTeams(next)
    await AsyncStorage.setItem(MANUAL_TEAMS_STORAGE_KEY, JSON.stringify(next))
  }

  function openEditManualTeam(team: ManualTeam) {
    setEditingTeamId(team.id)
    setEditingTeamName(team.name)
    setEditingTeamFormat(team.format)
    setTeamEditOpen(true)
  }

  async function saveEditedManualTeam() {
    const name = editingTeamName.trim()
    if (!editingTeamId) return
    if (!name) {
      Alert.alert('Team Name Needed', 'Add a name for this saved draft.')
      return
    }
    const next = manualTeams.map(team => (
      team.id === editingTeamId ? { ...team, name, format: editingTeamFormat } : team
    ))
    setManualTeams(next)
    await AsyncStorage.setItem(MANUAL_TEAMS_STORAGE_KEY, JSON.stringify(next))
    setTeamEditOpen(false)
    setEditingTeamId(null)
    setEditingTeamName('')
    setEditingTeamFormat('PPR')
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
        A roster monitoring and fast decision support tool for draft season.
      </AppText>

      <View style={styles.segmentRow}>
        {([
          { key: 'home', label: 'Home' },
          { key: 'bestball', label: 'Best Ball' },
          { key: 'planner', label: 'Planner' },
          { key: 'teams', label: 'My Teams' },
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
      ) : mode === 'teams' ? (
        <>
          <Card style={styles.metaCard}>
            <AppText variant="eyebrow">// My Teams</AppText>
            <AppText style={styles.cardTitle}>Roster Watch</AppText>
            <AppText variant="muted" style={styles.cardCopy}>
              View saved draft rosters and Sleeper teams for player news, role changes, waiver planning, and roster monitoring.
            </AppText>
            <View style={styles.boardButtonRow}>
              <Pressable onPress={() => setMode('planner')} style={styles.actionButtonWide}>
                <AppText style={styles.actionText}>Draft Picker</AppText>
              </Pressable>
            </View>
          </Card>

          <Card style={styles.metaCard}>
            <AppText variant="eyebrow">// Saved Drafts</AppText>
            {manualTeamCards.length ? (
              <View style={styles.manualTeamList}>
                {manualTeamCards.map(({ team, players: teamPlayers, read }) => (
                  <View key={team.id} style={styles.manualTeamCard}>
                    <View style={styles.manualTeamHeader}>
                      <View style={styles.playerMain}>
                        <AppText style={styles.leagueName}>{team.name}</AppText>
                        <AppText variant="muted" style={styles.leagueMeta}>{team.format} · {teamPlayers.length} players</AppText>
                      </View>
                      <View style={styles.manualTeamActions}>
                        <Pressable onPress={() => openEditManualTeam(team)} style={styles.hideButton}>
                          <AppText style={styles.hideText}>Edit</AppText>
                        </Pressable>
                        <Pressable onPress={() => deleteManualTeam(team.id)} style={styles.hideButton}>
                          <AppText style={styles.hideText}>Delete</AppText>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.teamReadGrid}>
                      <View style={styles.teamReadItem}>
                        <AppText variant="eyebrow">Strength</AppText>
                        <AppText style={styles.teamReadValue}>{read.strength}</AppText>
                      </View>
                      <View style={styles.teamReadItem}>
                        <AppText variant="eyebrow">Watch</AppText>
                        <AppText style={styles.teamReadValue}>{read.watch}</AppText>
                      </View>
                    </View>
                    <View style={styles.plannerSummary}>
                      {(['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const).map(pos => (
                        <View key={pos} style={styles.plannerSummaryItem}>
                          <AppText style={styles.plannerSummaryPos}>{pos}</AppText>
                          <AppText style={styles.plannerSummaryCount}>{read.counts[pos] || 0}</AppText>
                        </View>
                      ))}
                    </View>
                    <View style={styles.takenChipRow}>
                      {teamPlayers.slice(0, 8).map(player => (
                        <Pressable key={player.id} onPress={() => setProfilePlayer(player.name)} style={styles.takenChip}>
                          <AppText style={styles.takenChipText}>{player.name}</AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="muted" style={styles.cardCopy}>
                No saved drafts yet. Use Draft Picker to build and save a roster.
              </AppText>
            )}
          </Card>

          <Card style={styles.connectCard}>
            <AppText variant="eyebrow">// Sleeper Synced Teams</AppText>
            <AppText variant="muted" style={styles.cardCopy}>
              Import Sleeper rosters for monitoring only. Live points, standings, and matchup scoring stay in Sleeper.
            </AppText>
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
              {(fantasyQuery.data.sleeper.leaguesTotal || 0) > (fantasyQuery.data.sleeper.leagues?.length || 0) ? (
                <AppText variant="muted" style={styles.cardCopy}>
                  Showing the first {fantasyQuery.data.sleeper.leaguesLimit || fantasyQuery.data.sleeper.leagues.length} Sleeper teams.
                </AppText>
              ) : null}
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
            <AppText style={[styles.cardTitle, styles.cardTitleFirst]}>Draft Picker</AppText>
            <AppText variant="muted" style={styles.cardCopy}>
              Use the research boards during the draft. After each pick, add the players you actually drafted here and save the team for roster monitoring.
            </AppText>

            <View style={styles.plannerToggleRow}>
              {(['home', 'bestball'] as PlannerLeague[]).map(item => (
                <Pressable key={item} onPress={() => {
                  setPlannerLeague(item)
                  setPlannerPositionFilter('ALL')
                  setPlannerRoundFilter('ALL')
                }} style={[styles.plannerToggle, plannerLeague === item && styles.plannerToggleActive]}>
                  <AppText style={[styles.plannerToggleText, plannerLeague === item && styles.plannerToggleTextActive]}>
                    {item === 'home' ? 'Home League' : 'Best Ball'}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View style={styles.plannerActionGrid}>
              <Pressable onPress={() => setDraftModalOpen(true)} style={[styles.clearButton, styles.plannerActionButton]}>
                <AppText style={styles.clearButtonText}>Team Details</AppText>
              </Pressable>
              <Pressable onPress={() => setLeagueSettingsOpen(true)} style={[styles.clearButton, styles.plannerActionButton]}>
                <AppText style={styles.clearButtonText}>League Settings</AppText>
              </Pressable>
              <Pressable onPress={clearCurrentDraft} disabled={!draftPlayerIds.length} style={[styles.clearButton, styles.plannerActionButton, !draftPlayerIds.length && styles.disabledButton]}>
                <AppText style={styles.clearButtonText}>Clear Draft</AppText>
              </Pressable>
            </View>
            {draftPlayerIds.length ? (
              <View style={styles.currentDraftCard}>
                <View style={styles.manualTeamHeader}>
                  <View style={styles.playerMain}>
                    <AppText variant="eyebrow">Current Draft</AppText>
                    <AppText style={styles.currentDraftTitle}>{draftName.trim() || 'My Draft'}</AppText>
                    <AppText variant="muted" style={styles.leagueMeta}>{draftFormat} · {draftSelectedPlayers.length} picked</AppText>
                  </View>
                  <Pressable onPress={() => setDraftModalOpen(true)} style={styles.clearButton}>
                    <AppText style={styles.clearButtonText}>Save Team</AppText>
                  </Pressable>
                </View>
                <View style={styles.currentDraftDetails}>
                  <AppText variant="eyebrow">Team Name</AppText>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder={plannerLeague === 'bestball' ? 'Best Ball Draft' : 'Home League Draft'}
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>
                <View style={styles.plannerSummary}>
                  {currentDraftSlots.map(slot => (
                    <View key={slot.position} style={styles.plannerSummaryItem}>
                      <AppText style={styles.plannerSummaryPos}>{slot.position}</AppText>
                      <AppText style={styles.plannerSummaryCount}>{slot.count}/{slot.target}</AppText>
                    </View>
                  ))}
                </View>
                <View style={styles.currentDraftPlayers}>
                  <AppText variant="eyebrow">Selected Players</AppText>
                  <View style={styles.currentDraftPlayerList}>
                    {draftSelectedPlayers.map(player => (
                      <Pressable
                        key={player.id}
                        onPress={() => setDraftPlayerIds(ids => ids.filter(id => id !== player.id))}
                        style={styles.currentDraftPlayerChip}
                      >
                        <View style={styles.playerMain}>
                          <AppText style={styles.currentDraftPlayerName} numberOfLines={1}>{player.name}</AppText>
                          <AppText variant="muted" style={styles.currentDraftPlayerMeta}>{player.position} · {player.team || '-'}</AppText>
                        </View>
                        <AppText style={styles.currentDraftRemove}>Remove</AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <AppText variant="muted" style={styles.cardCopy}>
                  Strength: {currentDraftRead.strength}. Watch: {currentDraftRead.watch}.
                </AppText>
              </View>
            ) : null}
            <View style={styles.plannerFilters}>
              <View style={styles.filterHeaderRow}>
                <Pressable
                  onPress={() => setPlannerSearchOpen(open => !open)}
                  style={[styles.filterButton, (plannerSearchOpen || !!plannerSearch) && styles.filterButtonActive]}
                >
                  <AppText style={[styles.filterButtonText, (plannerSearchOpen || !!plannerSearch) && styles.filterButtonTextActive]}>
                    {plannerSearch ? 'Search On' : 'Search'}
                  </AppText>
                </Pressable>
                {plannerSearch ? (
                  <Pressable onPress={() => setPlannerSearch('')} style={styles.filterButton}>
                    <AppText style={styles.filterButtonText}>Clear</AppText>
                  </Pressable>
                ) : null}
              </View>
              {plannerSearchOpen ? (
                <TextInput
                  value={plannerSearch}
                  onChangeText={setPlannerSearch}
                  placeholder="Search drafted player, team, or position"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.input}
                />
              ) : null}
              <AppText variant="eyebrow">Position</AppText>
              <View style={styles.filterRow}>
                {plannerPositionOptions.map(pos => (
                  <Pressable
                    key={pos}
                    onPress={() => setPlannerPositionFilter(pos)}
                    style={[styles.filterButton, plannerPositionFilter === pos && styles.filterButtonActive]}
                  >
                    <AppText style={[styles.filterButtonText, plannerPositionFilter === pos && styles.filterButtonTextActive]}>{pos}</AppText>
                  </Pressable>
                ))}
              </View>
              <AppText variant="eyebrow">Rounds</AppText>
              <View style={styles.filterRow}>
                {PLANNER_ROUND_FILTERS.map(filter => (
                  <Pressable
                    key={filter.key}
                    onPress={() => setPlannerRoundFilter(filter.key)}
                    style={[styles.filterButton, plannerRoundFilter === filter.key && styles.filterButtonActive]}
                  >
                    <AppText style={[styles.filterButtonText, plannerRoundFilter === filter.key && styles.filterButtonTextActive]}>{filter.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          <View style={styles.playerList}>
            {plannerPickerPlayers.map(player => (
              <PlannerPickCard
                key={player.id}
                player={player}
                onPress={() => setProfilePlayer(player.name)}
                onPick={() => pickPlannerPlayer(player)}
              />
            ))}
            {!plannerPickerPlayers.length ? (
              <Card>
                <AppText style={styles.cardTitle}>No Players Found</AppText>
                <AppText variant="muted" style={styles.cardCopy}>Try clearing the search, position, or round filter.</AppText>
              </Card>
            ) : null}
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

      <Modal visible={draftModalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDraftModalOpen(false)}>
        <Screen>
          <AppText variant="eyebrow">// Draft Picker</AppText>
          <AppText variant="title" style={styles.title}>Team Details</AppText>
          <AppText variant="muted" style={styles.copy}>
            Name this roster and set the scoring format so it is easy to tell your leagues apart.
          </AppText>

          <Card style={styles.metaCard}>
            <View style={styles.draftField}>
              <AppText variant="eyebrow">Team Name</AppText>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Brian Home League"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.draftField}>
              <AppText variant="eyebrow">Scoring</AppText>
              <View style={styles.plannerToggleRow}>
                {(['PPR', 'Half PPR', 'Standard'] as DraftFormat[]).map(format => (
                  <Pressable key={format} onPress={() => setDraftFormat(format)} style={[styles.plannerToggle, draftFormat === format && styles.plannerToggleActive]}>
                    <AppText style={[styles.plannerToggleText, draftFormat === format && styles.plannerToggleTextActive]}>{format}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          {draftSelectedPlayers.length ? (
            <Card style={styles.metaCard}>
              <AppText variant="eyebrow">Selected · {draftSelectedPlayers.length}</AppText>
              <View style={styles.takenChipRow}>
                {draftSelectedPlayers.map(player => (
                  <Pressable
                    key={player.id}
                    onPress={() => setDraftPlayerIds(ids => ids.filter(id => id !== player.id))}
                    style={styles.takenChip}
                  >
                    <AppText style={styles.takenChipText}>{player.name}</AppText>
                  </Pressable>
                ))}
              </View>
            </Card>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable onPress={() => setDraftModalOpen(false)} style={styles.clearButton}>
              <AppText style={styles.clearButtonText}>Cancel</AppText>
            </Pressable>
            <Pressable onPress={draftPlayerIds.length ? saveManualTeam : () => setDraftModalOpen(false)} style={styles.actionButtonWide}>
              <AppText style={styles.actionText}>{draftPlayerIds.length ? 'Save Draft' : 'Done'}</AppText>
            </Pressable>
          </View>
        </Screen>
      </Modal>

      <Modal visible={leagueSettingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLeagueSettingsOpen(false)}>
        <Screen>
          <AppText variant="eyebrow">// Draft Picker</AppText>
          <AppText variant="title" style={styles.title}>League Settings</AppText>
          <AppText variant="muted" style={styles.copy}>
            Match your league roster spots so the Current Draft counts line up with your format.
          </AppText>

          <Card style={styles.metaCard}>
            <View style={styles.plannerToggleRow}>
              {(['home', 'bestball'] as PlannerLeague[]).map(item => (
                <Pressable key={item} onPress={() => setPlannerLeague(item)} style={[styles.plannerToggle, plannerLeague === item && styles.plannerToggleActive]}>
                  <AppText style={[styles.plannerToggleText, plannerLeague === item && styles.plannerToggleTextActive]}>
                    {item === 'home' ? 'Home League' : 'Best Ball'}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View style={styles.settingsSlotGrid}>
              {DRAFT_SLOT_ORDER.filter(position => currentDraftTargets[position] !== undefined).map(position => (
                <View key={position} style={styles.settingsSlotCard}>
                  <AppText style={styles.settingsSlotLabel} numberOfLines={2}>{DRAFT_SLOT_LABELS[position] || position}</AppText>
                  <AppText style={styles.settingsSlotCount}>{currentDraftTargets[position] || 0}</AppText>
                  <View style={styles.settingsStepper}>
                    <Pressable onPress={() => updateDraftTarget(position, -1)} style={styles.settingsStepButton}>
                      <AppText style={styles.settingsStepText}>-</AppText>
                    </Pressable>
                    <Pressable onPress={() => updateDraftTarget(position, 1)} style={styles.settingsStepButton}>
                      <AppText style={styles.settingsStepText}>+</AppText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          <View style={styles.modalActions}>
            <Pressable
              onPress={() => setDraftTargets(current => ({ ...current, [plannerLeague]: { ...DEFAULT_DRAFT_TARGETS[plannerLeague] } }))}
              style={styles.clearButton}
            >
              <AppText style={styles.clearButtonText}>Reset</AppText>
            </Pressable>
            <Pressable onPress={() => setLeagueSettingsOpen(false)} style={styles.actionButtonWide}>
              <AppText style={styles.actionText}>Done</AppText>
            </Pressable>
          </View>
        </Screen>
      </Modal>

      <Modal visible={teamEditOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTeamEditOpen(false)}>
        <Screen>
          <AppText variant="eyebrow">// Saved Drafts</AppText>
          <AppText variant="title" style={styles.title}>Edit Team</AppText>
          <AppText variant="muted" style={styles.copy}>
            Update the saved roster name and scoring format.
          </AppText>

          <Card style={styles.metaCard}>
            <View style={styles.draftField}>
              <AppText variant="eyebrow">Team Name</AppText>
              <TextInput
                value={editingTeamName}
                onChangeText={setEditingTeamName}
                placeholder="Brian Home League"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.draftField}>
              <AppText variant="eyebrow">Scoring</AppText>
              <View style={styles.plannerToggleRow}>
                {(['PPR', 'Half PPR', 'Standard'] as DraftFormat[]).map(format => (
                  <Pressable key={format} onPress={() => setEditingTeamFormat(format)} style={[styles.plannerToggle, editingTeamFormat === format && styles.plannerToggleActive]}>
                    <AppText style={[styles.plannerToggleText, editingTeamFormat === format && styles.plannerToggleTextActive]}>{format}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>

          <View style={styles.modalActions}>
            <Pressable onPress={() => setTeamEditOpen(false)} style={styles.clearButton}>
              <AppText style={styles.clearButtonText}>Cancel</AppText>
            </Pressable>
            <Pressable onPress={saveEditedManualTeam} style={styles.actionButtonWide}>
              <AppText style={styles.actionText}>Save Changes</AppText>
            </Pressable>
          </View>
        </Screen>
      </Modal>

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
  player,
  onPress,
  onPick,
}: {
  player: DraftPlayer
  onPress: () => void
  onPick: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.plannerPickCard}>
      <View style={styles.plannerPickHead}>
        <AppText style={styles.plannerRound}>#{player.rank}</AppText>
        <AppText style={styles.plannerPick}>{roundLabel(player.rank)}</AppText>
      </View>
      <View style={styles.plannerPlayerCell}>
        <AppText style={styles.plannerPlayerName} numberOfLines={1}>{player.name}</AppText>
        <AppText variant="muted" style={styles.plannerPlayerMeta} numberOfLines={1}>
          {player.position} · {player.team || '-'}
        </AppText>
      </View>
      <View style={styles.plannerActions}>
        <Pressable onPress={event => {
          event.stopPropagation()
          onPick()
        }} style={styles.plannerPickButton}>
          <AppText style={styles.plannerPickButtonText}>Pick</AppText>
        </Pressable>
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
  cardTitleFirst: { marginTop: 0 },
  cardCopy: { marginTop: spacing.sm, lineHeight: 20 },
  metaActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md },
  boardButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  plannerActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  plannerActionButton: { flexGrow: 1, alignItems: 'center' },
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
  actionButtonWide: { minHeight: 42, borderRadius: 8, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  actionText: { color: colors.bgPrimary, fontWeight: '900' },
  textButton: { marginTop: spacing.md },
  textButtonLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '800' },
  plannerToggleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  plannerToggle: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCardAlt },
  plannerToggleActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.14)' },
  plannerToggleText: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  plannerToggleTextActive: { color: colors.gold },
  plannerSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  plannerSummaryItem: { minWidth: 76, minHeight: 74, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, backgroundColor: colors.bgCardAlt, justifyContent: 'space-between' },
  plannerSummaryPos: { color: colors.textSecondary, fontSize: 10, fontWeight: '900' },
  plannerSummaryCount: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', marginTop: 2 },
  plannerFilters: { gap: spacing.sm, marginTop: spacing.md },
  filterHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  filterButton: { minHeight: 34, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCardAlt },
  filterButtonActive: { borderColor: colors.gold, backgroundColor: 'rgba(198,145,50,.14)' },
  filterButtonText: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  filterButtonTextActive: { color: colors.gold },
  plannerPickCard: { minHeight: 68, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.bgCardAlt, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  plannerPickHead: { width: 46, gap: 1 },
  plannerRound: { color: colors.gold, fontSize: 13, fontWeight: '900' },
  plannerPick: { color: colors.textSecondary, fontSize: 11, fontWeight: '900' },
  plannerPlayerCell: { flex: 1, minWidth: 0 },
  plannerPlayerName: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  plannerPlayerMeta: { marginTop: 1, fontSize: 11, lineHeight: 15 },
  plannerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  plannerPickButton: { borderWidth: 1, borderColor: 'rgba(198,145,50,.45)', borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: 'rgba(198,145,50,.13)' },
  plannerPickButtonText: { color: colors.gold, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  currentDraftCard: { marginTop: spacing.md, borderWidth: 1, borderColor: 'rgba(198,145,50,.32)', borderRadius: 8, padding: spacing.md, backgroundColor: colors.bgCardAlt },
  currentDraftTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', marginTop: 3 },
  currentDraftDetails: { gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  currentDraftPlayers: { gap: spacing.sm, marginBottom: spacing.sm },
  currentDraftPlayerList: { gap: spacing.sm },
  currentDraftPlayerChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, backgroundColor: colors.bgCard },
  currentDraftPlayerName: { color: colors.textPrimary, fontSize: 14, fontWeight: '900' },
  currentDraftPlayerMeta: { marginTop: 2, fontSize: 11 },
  currentDraftRemove: { color: colors.gold, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  settingsSlotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  settingsSlotCard: { width: '31%', minHeight: 126, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, backgroundColor: colors.bgCardAlt, justifyContent: 'space-between' },
  settingsSlotLabel: { color: colors.textSecondary, fontSize: 10, lineHeight: 13, fontWeight: '900', textTransform: 'uppercase' },
  settingsSlotCount: { color: colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '900', marginVertical: 4 },
  settingsStepper: { flexDirection: 'row', gap: spacing.xs },
  settingsStepButton: { flex: 1, height: 32, borderWidth: 1, borderColor: 'rgba(198,145,50,.35)', borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(198,145,50,.08)' },
  settingsStepText: { color: colors.gold, fontSize: 18, lineHeight: 20, fontWeight: '900' },
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
  manualTeamList: { gap: spacing.md, marginTop: spacing.md },
  manualTeamCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, backgroundColor: colors.bgCardAlt, gap: spacing.md },
  manualTeamHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  manualTeamActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  teamReadGrid: { flexDirection: 'row', gap: spacing.sm },
  teamReadItem: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, backgroundColor: colors.bgCard },
  teamReadValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '900', marginTop: 4 },
  draftField: { gap: spacing.sm, marginBottom: spacing.lg },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl },
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
