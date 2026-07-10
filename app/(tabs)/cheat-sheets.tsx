import { Fragment, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ActivityIndicator, Modal, Pressable, Share, StyleSheet, TextInput, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { GameLineCard } from '@/components/dashboard/GameLineCard'
import { PlayerProfileModal, type PlayerProfileMarketContext } from '@/components/dashboard/PlayerProfileModal'
import { Screen } from '@/components/Screen'
import { AppText } from '@/components/Text'
import { API_BASE_URL, kingfishFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtOdds, normalizeName } from '@/lib/format'
import { useMobileConfig } from '@/lib/mobileConfig'
import { BOOK_DISPLAY_NAMES, eligiblePropBookKeys } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Game, WeatherInfo } from '@/types'

type SheetKey = 'topleans' | 'nrfi' | 'hits' | 'hr' | 'tb' | 'k' | 'hot' | 'bvp' | 'lines' | 'td' | 'qbtd' | 'qb200'

// One row of the NRFI/YRFI sheet — computed server-side by /api/mlb-nrfi and
// rendered identically on web, studio, and mobile.
type NrfiRow = {
  game_id: string
  commence_time: string
  home_team: string; away_team: string; home_abbr: string; away_abbr: string
  home_pitcher: string; away_pitcher: string
  away_offense_1st: { runs: number; games: number; rate: number } | null
  home_offense_1st: { runs: number; games: number; rate: number } | null
  away_pitcher_1st: { runs: number; starts: number; rate: number } | null
  home_pitcher_1st: { runs: number; starts: number; rate: number } | null
  nrfi: { price: number; book: string } | null
  yrfi: { price: number; book: string } | null
  market_nrfi_prob: number | null
  model_nrfi_prob: number
  park_read: string | null
  lean: { side: string; strength: string; label: string; color: string; edge: number | null; confidence: string; note?: string }
}
type ToolTile = {
  key: SheetKey
  label: string
  sport: 'ALL' | 'MLB' | 'NFL'
}
type ToolMode = 'sheets' | 'calculators' | 'more'
type CalculatorKey = 'unit' | 'ev' | 'novig' | 'kelly' | 'parlay' | 'hedge'
export type FactorSport = 'MLB' | 'NFL'
export type FactorView = 'board' | 'cheat'

type TopLeanProp = {
  sport: string
  player: string
  market_label: string
  line: number | null
  odds: number
  edge_score: number
  grade: string | null
  proj: number | null
  home_team: string | null
  away_team: string | null
}
type TopLeanGameLine = {
  sport: string
  side: string
  type: string
  detail: string
  odds: number
  home_team: string
  away_team: string
}
type TopLeansData = { props: TopLeanProp[]; game_line: TopLeanGameLine | null }

const SHEETS: Array<{
  key: SheetKey
  label: string
  desc: string
  type: 'props' | 'k' | 'bvp' | 'lines' | 'td' | 'nrfi' | 'topleans'
  market?: string
  statField?: string
  trend?: boolean
}> = [
  { key: 'topleans', label: 'Top 5 KingFish Leans', desc: "Today's five best prop edges across every sport, plus the top game-line lean. Locks 9:05 AM CT.", type: 'topleans' },
  { key: 'nrfi', label: 'NRFI / YRFI', desc: 'Our first-inning run / no-run model — a lean for every game today.', type: 'nrfi' },
  { key: 'hits', label: 'Hits Bet/Fade', desc: 'Hit props ranked by form, hit rate, price, and edge.', type: 'props', market: 'batter_hits', statField: 'hits_per_game' },
  { key: 'hr', label: 'HR Targets', desc: 'Home run targets with power form and playable prices.', type: 'props', market: 'batter_home_runs', statField: 'hr_per_game' },
  { key: 'tb', label: 'Hot Total Bases', desc: 'Total bases targets with season and recent production.', type: 'props', market: 'batter_total_bases', statField: 'tb_per_game' },
  { key: 'k', label: 'Safe Alt K', desc: 'Pitcher strikeout looks ranked by recent K form.', type: 'k', market: 'pitcher_strikeouts', statField: 'strikeouts_per_game' },
  { key: 'hot', label: 'Hot Hitters', desc: 'Players whose recent hit form is running above their season baseline.', type: 'props', market: 'batter_hits', statField: 'hits_per_game', trend: true },
  { key: 'bvp', label: 'Batter vs Pitcher', desc: "Career batter history against today's probable starter.", type: 'bvp' },
  { key: 'lines', label: 'Game Lines & Edge', desc: "Today's MLB moneylines, totals, and weather context.", type: 'lines' },
  { key: 'td', label: 'NFL TD Streaks', desc: 'Regular-season touchdown scoring streaks by player.', type: 'td' },
  { key: 'qbtd', label: 'NFL QB 2+ TD Streaks', desc: 'Quarterbacks on recent streaks of 2+ passing touchdown games.', type: 'td' },
  { key: 'qb200', label: 'QB 200+ Yard Games', desc: 'Quarterbacks clearing 200 passing yards by recent form and season rate.', type: 'td' },
]

const TOOL_TILES: ToolTile[] = [
  { key: 'topleans', label: 'Top 5 Leans', sport: 'ALL' },
  { key: 'nrfi', label: 'NRFI / YRFI', sport: 'MLB' },
  { key: 'hits', label: 'Hits Bet/Fade', sport: 'MLB' },
  { key: 'hr', label: 'HR Targets', sport: 'MLB' },
  { key: 'tb', label: 'Total Bases', sport: 'MLB' },
  { key: 'k', label: 'Safe Alt K', sport: 'MLB' },
  { key: 'hot', label: 'Hot Hitters', sport: 'MLB' },
  { key: 'bvp', label: 'Batter vs Pitcher', sport: 'MLB' },
  { key: 'lines', label: 'Game Lines', sport: 'MLB' },
  { key: 'td', label: 'NFL TD Streaks', sport: 'NFL' },
  { key: 'qbtd', label: 'QB 2+ TD Streaks', sport: 'NFL' },
  { key: 'qb200', label: 'QB 200+ Yards', sport: 'NFL' },
]

const TEAM_NAME_TO_ABBR: Record<string, string> = {
  'New York Yankees': 'NYY', 'Boston Red Sox': 'BOS', 'Toronto Blue Jays': 'TOR',
  'Baltimore Orioles': 'BAL', 'Tampa Bay Rays': 'TB', 'Chicago White Sox': 'CWS',
  'Cleveland Guardians': 'CLE', 'Detroit Tigers': 'DET', 'Kansas City Royals': 'KC',
  'Minnesota Twins': 'MIN', 'Houston Astros': 'HOU', 'Los Angeles Angels': 'LAA',
  'Oakland Athletics': 'OAK', 'Athletics': 'OAK', 'Seattle Mariners': 'SEA', 'Texas Rangers': 'TEX',
  'Atlanta Braves': 'ATL', 'Miami Marlins': 'MIA', 'New York Mets': 'NYM',
  'Philadelphia Phillies': 'PHI', 'Washington Nationals': 'WAS', 'Chicago Cubs': 'CHC',
  'Cincinnati Reds': 'CIN', 'Milwaukee Brewers': 'MIL', 'Pittsburgh Pirates': 'PIT',
  'St. Louis Cardinals': 'STL', 'Los Angeles Dodgers': 'LAD', 'San Diego Padres': 'SD',
  'San Francisco Giants': 'SF', 'Colorado Rockies': 'COL', 'Arizona Diamondbacks': 'ARI',
}

const NFL_TEAM_NAME_TO_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Las Vegas Raiders': 'LV', 'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF', 'Seattle Seahawks': 'SEA', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',
}

const TEAM_NAME_TO_SHORT: Record<string, string> = {
  'Arizona Diamondbacks': 'Arizona', 'Atlanta Braves': 'Atlanta', 'Baltimore Orioles': 'Baltimore',
  'Boston Red Sox': 'Boston', 'Chicago Cubs': 'Chicago Cubs', 'Chicago White Sox': 'White Sox',
  'Cincinnati Reds': 'Cincinnati', 'Cleveland Guardians': 'Cleveland', 'Colorado Rockies': 'Colorado',
  'Detroit Tigers': 'Detroit', 'Houston Astros': 'Houston', 'Kansas City Royals': 'Kansas City',
  'Los Angeles Angels': 'LA Angels', 'Los Angeles Dodgers': 'LA Dodgers', 'Miami Marlins': 'Miami',
  'Milwaukee Brewers': 'Milwaukee', 'Minnesota Twins': 'Minnesota', 'New York Mets': 'NY Mets',
  'New York Yankees': 'NY Yankees', 'Oakland Athletics': 'Athletics', 'Athletics': 'Athletics',
  'Philadelphia Phillies': 'Philadelphia', 'Pittsburgh Pirates': 'Pittsburgh', 'San Diego Padres': 'San Diego',
  'San Francisco Giants': 'San Francisco', 'Seattle Mariners': 'Seattle', 'St. Louis Cardinals': 'St. Louis',
  'Tampa Bay Rays': 'Tampa Bay', 'Texas Rangers': 'Texas', 'Toronto Blue Jays': 'Toronto',
  'Washington Nationals': 'Washington',
  'Arizona Cardinals': 'Arizona', 'Atlanta Falcons': 'Atlanta', 'Baltimore Ravens': 'Baltimore',
  'Buffalo Bills': 'Buffalo', 'Carolina Panthers': 'Carolina', 'Chicago Bears': 'Chicago',
  'Cincinnati Bengals': 'Cincinnati', 'Cleveland Browns': 'Cleveland', 'Dallas Cowboys': 'Dallas',
  'Denver Broncos': 'Denver', 'Detroit Lions': 'Detroit', 'Green Bay Packers': 'Green Bay',
  'Houston Texans': 'Houston', 'Indianapolis Colts': 'Indianapolis', 'Jacksonville Jaguars': 'Jacksonville',
  'Kansas City Chiefs': 'Kansas City', 'Las Vegas Raiders': 'Las Vegas', 'Los Angeles Chargers': 'LA Chargers',
  'Los Angeles Rams': 'LA Rams', 'Miami Dolphins': 'Miami', 'Minnesota Vikings': 'Minnesota',
  'New England Patriots': 'New England', 'New Orleans Saints': 'New Orleans', 'New York Giants': 'NY Giants',
  'New York Jets': 'NY Jets', 'Philadelphia Eagles': 'Philadelphia', 'Pittsburgh Steelers': 'Pittsburgh',
  'San Francisco 49ers': 'San Francisco', 'Seattle Seahawks': 'Seattle', 'Tampa Bay Buccaneers': 'Tampa Bay',
  'Tennessee Titans': 'Tennessee', 'Washington Commanders': 'Washington',
}

const MLB_FACTOR_BASELINES: Record<string, { venue: string; score: number; environment: string; market: string }> = {
  'Colorado Rockies': { venue: 'Coors Field', score: 92, environment: 'Elite hitter park', market: 'Totals / HR props' },
  'Cincinnati Reds': { venue: 'Great American Ball Park', score: 84, environment: 'Power-friendly', market: 'HR props' },
  'New York Yankees': { venue: 'Yankee Stadium', score: 80, environment: 'Short porch', market: 'Lefty power' },
  'Philadelphia Phillies': { venue: 'Citizens Bank Park', score: 76, environment: 'Hitter lean', market: 'Totals / HR props' },
  'Chicago Cubs': { venue: 'Wrigley Field', score: 62, environment: 'Weather sensitive', market: 'Totals' },
  'Boston Red Sox': { venue: 'Fenway Park', score: 64, environment: 'Contact-friendly', market: 'Doubles / total bases' },
  'Atlanta Braves': { venue: 'Truist Park', score: 64, environment: 'Balanced hitter lean', market: 'Totals / HR props' },
  'Houston Astros': { venue: 'Daikin Park', score: 58, environment: 'Controlled roof', market: 'Contact / power' },
  'San Francisco Giants': { venue: 'Oracle Park', score: 34, environment: 'Run suppression', market: 'Unders / pitching props' },
  'San Diego Padres': { venue: 'Petco Park', score: 38, environment: 'Pitcher-friendly', market: 'Unders / pitching props' },
  'Seattle Mariners': { venue: 'T-Mobile Park', score: 40, environment: 'Pitcher-friendly', market: 'Unders / pitching props' },
  'Detroit Tigers': { venue: 'Comerica Park', score: 42, environment: 'Deep power alleys', market: 'Unders / extra bases fade' },
}

const NFL_FACTOR_BASELINES: Record<string, { venue: string; score: number; environment: string; market: string }> = {
  'Arizona Cardinals': { venue: 'State Farm Stadium', score: 73, environment: 'Controlled roof', market: 'Passing / kicking' },
  'Atlanta Falcons': { venue: 'Mercedes-Benz Stadium', score: 76, environment: 'Controlled dome', market: 'Passing / overs' },
  'Baltimore Ravens': { venue: 'M&T Bank Stadium', score: 54, environment: 'Outdoor balanced', market: 'Rushing / totals' },
  'Buffalo Bills': { venue: 'Highmark Stadium', score: 38, environment: 'Outdoor wind risk', market: 'Totals / passing / kicking' },
  'Carolina Panthers': { venue: 'Bank of America Stadium', score: 58, environment: 'Outdoor balanced', market: 'Totals / passing' },
  'Cleveland Browns': { venue: 'Cleveland Browns Stadium', score: 40, environment: 'Lake weather', market: 'Totals / kicking' },
  'Chicago Bears': { venue: 'Soldier Field', score: 42, environment: 'Outdoor wind risk', market: 'Totals / passing' },
  'Cincinnati Bengals': { venue: 'Paycor Stadium', score: 52, environment: 'Outdoor riverfront', market: 'Totals / passing' },
  'Denver Broncos': { venue: 'Empower Field at Mile High', score: 64, environment: 'Altitude edge', market: 'Kicking / deep passing' },
  'Green Bay Packers': { venue: 'Lambeau Field', score: 46, environment: 'Cold weather', market: 'Totals / rushing' },
  'Houston Texans': { venue: 'NRG Stadium', score: 72, environment: 'Controlled roof', market: 'Passing / kicking' },
  'Indianapolis Colts': { venue: 'Lucas Oil Stadium', score: 73, environment: 'Controlled roof', market: 'Passing / kicking' },
  'Jacksonville Jaguars': { venue: 'EverBank Stadium', score: 60, environment: 'Florida heat', market: 'Conditioning / totals' },
  'Kansas City Chiefs': { venue: 'Arrowhead Stadium', score: 51, environment: 'Outdoor weather', market: 'Totals / passing' },
  'Pittsburgh Steelers': { venue: 'Acrisure Stadium', score: 48, environment: 'Outdoor weather', market: 'Totals / kicking' },
  'Miami Dolphins': { venue: 'Hard Rock Stadium', score: 62, environment: 'Heat edge', market: 'Conditioning / totals' },
  'New England Patriots': { venue: 'Gillette Stadium', score: 45, environment: 'Cold / wind risk', market: 'Totals / kicking' },
  'New York Giants': { venue: 'MetLife Stadium', score: 49, environment: 'Outdoor wind risk', market: 'Totals / passing' },
  'New York Jets': { venue: 'MetLife Stadium', score: 49, environment: 'Outdoor wind risk', market: 'Totals / passing' },
  'Philadelphia Eagles': { venue: 'Lincoln Financial Field', score: 51, environment: 'Outdoor balanced', market: 'Rushing / totals' },
  'San Francisco 49ers': { venue: 'Levi\'s Stadium', score: 58, environment: 'Mild outdoor', market: 'Efficiency / totals' },
  'Seattle Seahawks': { venue: 'Lumen Field', score: 47, environment: 'Rain / wind risk', market: 'Totals / passing' },
  'Tampa Bay Buccaneers': { venue: 'Raymond James Stadium', score: 61, environment: 'Florida heat', market: 'Conditioning / totals' },
  'Tennessee Titans': { venue: 'Nissan Stadium', score: 56, environment: 'Outdoor balanced', market: 'Rushing / totals' },
  'Washington Commanders': { venue: 'Northwest Stadium', score: 52, environment: 'Outdoor balanced', market: 'Totals / passing' },
  'Dallas Cowboys': { venue: 'AT&T Stadium', score: 74, environment: 'Controlled dome', market: 'Passing / kicking' },
  'Detroit Lions': { venue: 'Ford Field', score: 78, environment: 'Dome track', market: 'Passing / overs' },
  'Minnesota Vikings': { venue: 'U.S. Bank Stadium', score: 74, environment: 'Controlled dome', market: 'Passing / kicking' },
  'New Orleans Saints': { venue: 'Caesars Superdome', score: 77, environment: 'Dome track', market: 'Passing / overs' },
  'Las Vegas Raiders': { venue: 'Allegiant Stadium', score: 73, environment: 'Controlled dome', market: 'Passing / kicking' },
  'Los Angeles Rams': { venue: 'SoFi Stadium', score: 75, environment: 'Indoor-style', market: 'Passing / overs' },
  'Los Angeles Chargers': { venue: 'SoFi Stadium', score: 75, environment: 'Indoor-style', market: 'Passing / overs' },
}

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
  espnbet: 'theScore Bet',
  fanduel: 'FanDuel',
  fanatics: 'Fanatics',
  hardrockbet: 'Hard Rock Bet',
  hardrockbet_az: 'Hard Rock Bet',
  hardrockbet_fl: 'Hard Rock Bet',
  hardrockbet_oh: 'Hard Rock Bet',
  pointsbetus: 'PointsBet',
  williamhill_us: 'Caesars',
}

const TOOL_MODES: Array<{ key: ToolMode; label: string }> = [
  { key: 'calculators', label: 'Calculators' },
  { key: 'sheets', label: 'Cheat Sheets' },
  { key: 'more', label: 'Tools' },
]

const MAX_CHEAT_SHEET_STAT_PLAYERS = 110

const CALCULATORS: Array<{ key: CalculatorKey; label: string; desc: string }> = [
  { key: 'unit', label: 'Unit Plan', desc: 'Set unit size, stop-loss, and max exposure before betting.' },
  { key: 'ev', label: 'EV', desc: 'Check if your true probability beats the book price.' },
  { key: 'novig', label: 'No-Vig', desc: 'Find fair market probability after removing the hold.' },
  { key: 'kelly', label: 'Kelly', desc: 'Convert a verified edge into conservative stake sizes.' },
  { key: 'parlay', label: 'Parlay', desc: 'See combined payout before tying legs together.' },
  { key: 'hedge', label: 'Hedge', desc: 'Size the other side to lock or reduce risk.' },
]

interface LineupPlayer {
  id: number
  name: string
  team?: string
  position?: string
}

interface SheetRow {
  divider?: boolean
  label?: string
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
  pickLabel?: string
}

interface BvpMatchup {
  batterID: string
  pitcherID: string
  batterName: string
  pitcherName: string
  gameLabel: string
}

interface BvpRow {
  key: string
  player: string
  pitcher: string
  gameLabel: string
  ab: number
  avg: string
  hr: number
  rbi: number
  ops: string
}

export interface FactorRow {
  id: string
  matchup: string
  homeTeam: string
  time: string
  scoreLabel: string
  venue: string
  environment: string
  weather: string
  weatherRaw?: any
  official: string
  score: number
  lean: string
  tone: string
  tags: string[]
}

export type StadiumProfile = {
  sport: FactorSport
  venue: string
  homeTeam: string
  teamLabel?: string
  city?: string
  homeRecord?: string
  environment: string
  market: string
  score: number
  capacity?: string
  altitudeFt?: string
  roof?: string
  surface?: string
  roofStatus?: string
  windImpact?: string
  weatherExposure?: string
  weather?: string
  wind?: string
  blurb: string
}

type BallparkStaticProfile = {
  venue: string
  team: string
  teamName: string
  teamAbbr: string
  city: string
  capacity: string
  altitudeFt: string
  roof: string
  surface: string
  read: string
  blurb: string
}

export type BallparkProfilePayload = {
  profilesByVenue?: Record<string, BallparkStaticProfile>
  profilesByTeam?: Record<string, BallparkStaticProfile>
  homeRecords?: Record<string, string>
}

type FootballStadiumStaticProfile = {
  venue: string
  team: string
  teamName: string
  city: string
  capacity: string
  altitudeFt: string
  roofStatus: string
  surface: string
  windImpact: string
  weatherExposure: string
  blurb: string
}

export type FootballStadiumProfilePayload = {
  profilesByVenue?: Record<string, FootballStadiumStaticProfile>
  profilesByTeam?: Record<string, FootballStadiumStaticProfile>
}

export interface FactorCheatRow {
  id: string
  matchup: string
  time: string
  venue: string
  weather: string
  gameTotalPct: number
  hrPct: number
  read: string
  tone: string
}

export type FactorOfficial = {
  name?: string
  role?: string
  impact?: 'boost' | 'suppress' | 'neutral' | string
}

type MLBL10Payload = {
  teamL10Map?: Record<string, { wins: number; losses: number; winPct: number; avgTotal: number }>
}

interface TdStreakRow {
  player: string
  team: string
  position: string
  streak_games: number
  two_td_games?: number
  games?: number
  two_td_rate?: string
}

interface NflFantasyPlayer {
  player_name: string
  team: string
  position: string
  games?: number
  passing_yards_per_game?: number
  raw_games?: Array<{
    label?: string
    passing_yards?: number
    passing_attempts?: number
  }>
}

interface NflFantasySummary {
  latest_season?: number
  players?: NflFantasyPlayer[]
}

interface QbYardsRow {
  player: string
  team: string
  games: number
  hitGames: number
  hitRate: string
  l5Hits: number
  l10Hits: number
  l5Avg: number
  l10Avg: number
  seasonAvg: number
  streak_games: number
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

  if (score >= 78) return { label: `Strong ${score}`, color: colors.green, score }
  if (score >= 64) return { label: `Lean ${score}`, color: colors.gold, score }
  if (score >= 45) return { label: `Neutral ${score}`, color: colors.textSecondary, score }
  return { label: `Fade ${score}`, color: colors.red, score }
}

function webEdgeLabel(line: number, season: number, l10: number, l5: number) {
  const safeLine = Math.max(line || 0, 0.5)
  if (!season && !l10 && !l5) return { label: '-', color: colors.textSecondary, score: 0 }

  const seasonRatio = season > 0 ? season / safeLine : 0
  const l10Ratio = l10 > 0 ? l10 / safeLine : seasonRatio
  const l5Ratio = l5 > 0 ? l5 / safeLine : seasonRatio
  const formRatio = seasonRatio * 0.30 + l10Ratio * 0.25 + l5Ratio * 0.45
  const score = Math.round(Math.max(0, Math.min(100, ((formRatio - 0.70) / 0.70) * 85)))

  if (score >= 75) return { label: `Strong ${score}`, color: colors.green, score }
  if (score >= 62) return { label: `Lean ${score}`, color: colors.gold, score }
  if (score >= 45) return { label: `Neutral ${score}`, color: colors.textSecondary, score }
  return { label: `Fade ${score}`, color: colors.red, score }
}

function fmt(value: number) {
  return value ? value.toFixed(2) : '-'
}

function teamAbbr(name?: string) {
  return TEAM_NAME_TO_ABBR[name || ''] || name || ''
}

function findLineupPlayer(lineupMap: Record<string, LineupPlayer> | undefined, playerName?: string) {
  if (!lineupMap || !playerName) return undefined
  const normalized = normalizeName(playerName)
  const direct = lineupMap[normalized]
  if (direct) return direct

  const compact = normalized.replace(/\s/g, '')
  return Object.entries(lineupMap).find(([key]) => {
    if (!key) return false
    const keyCompact = key.replace(/\s/g, '')
    return key === normalized || keyCompact === compact || key.includes(normalized) || normalized.includes(key)
  })?.[1]
}

function getBestBatterOutcomes(game: Game) {
  const outcomes: Array<{ player: string }> = []
  const seen = new Set<string>()

  game.bookmakers?.forEach((book) => {
    book.markets?.forEach((market) => {
      if (!market.key || market.key.startsWith('pitcher_')) return
      market.outcomes?.forEach((outcome) => {
        if (!outcome.description) return
        const key = normalizeName(outcome.description)
        if (seen.has(key)) return
        seen.add(key)
        outcomes.push({ player: outcome.description })
      })
    })
  })

  return outcomes
}

function buildBvpMatchups(
  games: Game[],
  lineups: Record<string, LineupPlayer> | undefined,
  pitcherMap: Record<string, string> = {},
  pitcherNameMap: Record<string, string> = {},
) {
  if (!lineups) return []

  const seen = new Set<string>()
  const matchups: BvpMatchup[] = []

  games.forEach((game) => {
    const awayAbbr = teamAbbr(game.away_team)
    const homeAbbr = teamAbbr(game.home_team)
    const awayPitcherId = pitcherMap[awayAbbr]
    const homePitcherId = pitcherMap[homeAbbr]
    const awayPitcherName = pitcherNameMap[awayAbbr] || 'probable starter'
    const homePitcherName = pitcherNameMap[homeAbbr] || 'probable starter'

    getBestBatterOutcomes(game).forEach((outcome) => {
      const lineup = findLineupPlayer(lineups, outcome.player)
      if (!lineup?.id) return

      const batterTeam = teamAbbr(lineup.team)
      const pitcherID = batterTeam === awayAbbr ? homePitcherId : batterTeam === homeAbbr ? awayPitcherId : ''
      const pitcherName = batterTeam === awayAbbr ? homePitcherName : batterTeam === homeAbbr ? awayPitcherName : ''
      if (!pitcherID) return

      const key = `${lineup.id}_${pitcherID}`
      if (seen.has(key)) return
      seen.add(key)

      matchups.push({
        batterID: String(lineup.id),
        pitcherID,
        batterName: lineup.name,
        pitcherName,
        gameLabel: `${awayAbbr || game.away_team} @ ${homeAbbr || game.home_team}`,
      })
    })
  })

  return matchups
}

function buildBvpRows(bvp: Record<string, any> = {}, matchups: BvpMatchup[] = []) {
  const matchupMeta = new Map(matchups.map((matchup) => [`${matchup.batterID}_${matchup.pitcherID}`, matchup]))

  return Object.entries(bvp)
    .map(([key, value]) => {
      const meta = matchupMeta.get(key)
      if (!meta) return null
      return {
        key,
        player: meta.batterName,
        pitcher: meta.pitcherName,
        gameLabel: meta.gameLabel,
        ab: Number(value?.ab || 0),
        avg: value?.avg || '.000',
        hr: Number(value?.hr || 0),
        rbi: Number(value?.rbi || 0),
        ops: value?.ops || '-',
      }
    })
    .filter((row): row is BvpRow => row !== null && row.ab > 0)
    .sort((a, b) => b.ab - a.ab)
}

function factorBaseline(homeTeam: string, sport: FactorSport) {
  const baseline = sport === 'MLB' ? MLB_FACTOR_BASELINES[homeTeam] : NFL_FACTOR_BASELINES[homeTeam]
  return baseline || {
    venue: sport === 'MLB' ? 'Home ballpark' : 'Home stadium',
    score: 55,
    environment: '',
    market: '',
  }
}

export function cleanSkyLabel(sky?: string) {
  const value = String(sky || '').toLowerCase()
  if (value.includes('storm')) return 'Storms'
  if (value.includes('rain')) return 'Rain'
  if (value.includes('drizzle')) return 'Drizzle'
  if (value.includes('cloud')) return 'Cloudy'
  if (value.includes('partly')) return 'Partly cloudy'
  if (value.includes('clear')) return 'Clear'
  return sky || ''
}

function weatherFactor(weather: any, sport: FactorSport) {
  if (!weather) return { delta: 0, label: 'Weather pending', tags: [] }
  if (weather.indoor) return { delta: 6, label: weather.windStr || 'Controlled', tags: ['Controlled conditions'] }

  let delta = 0
  const tags: string[] = []
  const temp = typeof weather.tempF === 'number' ? weather.tempF : null
  const precip = Number(weather.precipPct || 0)

  if (sport === 'MLB') {
    if (temp !== null && temp >= 80) { delta += 8; tags.push('Warm carry') }
    if (temp !== null && temp <= 55) { delta -= 8; tags.push('Cold suppress') }
    if (weather.windImpact === 'boost') { delta += 9; tags.push('Wind boost') }
    if (weather.windImpact === 'suppress') { delta -= 9; tags.push('Wind suppress') }
    if (precip >= 35) { delta -= 4; tags.push('Rain risk') }
  } else {
    if (weather.windImpact === 'suppress') { delta -= 14; tags.push('Wind risk') }
    if (temp !== null && temp <= 32) { delta -= 6; tags.push('Cold risk') }
    if (temp !== null && temp >= 82) { delta += 4; tags.push('Heat edge') }
    if (precip >= 35) { delta -= 7; tags.push('Rain risk') }
  }

  const tempText = temp === null ? '' : `${temp}F`
  const rainText = precip >= 25 ? `, ${precip}% rain` : ''
  const label = [cleanSkyLabel(weather.sky), tempText, weather.windStr].filter(Boolean).join(' · ') + rainText
  return { delta, label: label || '', tags }
}

function weatherTotalAdjustment(weather?: any) {
  if (!weather || weather.indoor) return 0
  let adjustment = 0
  const temp = typeof weather.tempF === 'number' ? weather.tempF : null
  if (temp !== null && temp >= 80) adjustment += 5
  if (temp !== null && temp <= 55) adjustment -= 5
  if (weather.windImpact === 'boost') adjustment += 6
  if (weather.windImpact === 'suppress') adjustment -= 6
  if (Number(weather.precipPct || 0) >= 35) adjustment -= 3
  return adjustment
}

function weatherHrAdjustment(weather?: any) {
  if (!weather || weather.indoor) return 0
  let adjustment = 0
  const temp = typeof weather.tempF === 'number' ? weather.tempF : null
  if (temp !== null && temp >= 80) adjustment += 6
  if (temp !== null && temp <= 55) adjustment -= 7
  if (weather.windImpact === 'boost') adjustment += 10
  if (weather.windImpact === 'suppress') adjustment -= 12
  if (Number(weather.precipPct || 0) >= 35) adjustment -= 3
  return adjustment
}

function officialFactor(sport: FactorSport, official?: FactorOfficial) {
  if (official?.name) {
    const delta = official.impact === 'boost' ? 5 : official.impact === 'suppress' ? -5 : 0
    return {
      delta,
      label: official.name,
      tag: official.role ? `${official.role}: ${official.name}` : official.name,
    }
  }

  return {
    delta: 0,
    label: sport === 'MLB' ? 'Umpire pending' : 'Ref crew pending',
    tag: '',
  }
}

function gameContextFactor(game: Game, sport: FactorSport) {
  if (sport !== 'MLB') return { delta: 0, tags: [] as string[] }

  let delta = 0
  const tags: string[] = []
  const status = `${(game as any).status || ''} ${(game as any).statusReason || ''}`.toLowerCase()

  if (String((game as any).dayNight || '').toLowerCase() === 'day') {
    delta -= 2
    tags.push('Day game')
  }

  if ((game as any).doubleHeader && (game as any).doubleHeader !== 'N') {
    delta -= 3
    tags.push('Doubleheader risk')
  }

  if ((game as any).gameNumber && Number((game as any).gameNumber) > 1) {
    tags.push(`Game ${(game as any).gameNumber}`)
  }

  if (status.includes('delay') || status.includes('postpon') || status.includes('suspend')) {
    delta -= 7
    tags.push('Delay risk')
  }

  if ((game as any).neutralSite) {
    delta -= 2
    tags.push('Neutral site')
  }

  return { delta, tags }
}

export function isNeutralFactorText(value?: string) {
  return /\bneutral\b/i.test(String(value || ''))
}

function factorTeamDisplay(team: string) {
  if (TEAM_NAME_TO_SHORT[team]) return TEAM_NAME_TO_SHORT[team]
  const words = team.split(' ').filter(Boolean)
  if (words.length <= 2) return team
  return words.slice(0, -1).join(' ')
}

// Abbreviated city + nickname (e.g. "KC Royals", "TB Rays") for the MLB stadium
// cheat-sheet matchups, so the full table fits on an iPhone.
const MLB_TEAM_CHEAT_SHORT: Record<string, string> = {
  'Arizona Diamondbacks': 'AZ Diamondbacks', 'Atlanta Braves': 'ATL Braves', 'Baltimore Orioles': 'BAL Orioles',
  'Boston Red Sox': 'BOS Red Sox', 'Chicago Cubs': 'CHC Cubs', 'Chicago White Sox': 'CWS White Sox',
  'Cincinnati Reds': 'CIN Reds', 'Cleveland Guardians': 'CLE Guardians', 'Colorado Rockies': 'COL Rockies',
  'Detroit Tigers': 'DET Tigers', 'Houston Astros': 'HOU Astros', 'Kansas City Royals': 'KC Royals',
  'Los Angeles Angels': 'LAA Angels', 'Los Angeles Dodgers': 'LAD Dodgers', 'Miami Marlins': 'MIA Marlins',
  'Milwaukee Brewers': 'MIL Brewers', 'Minnesota Twins': 'MIN Twins', 'New York Mets': 'NYM Mets',
  'New York Yankees': 'NYY Yankees', 'Oakland Athletics': 'OAK Athletics', 'Athletics': 'Athletics',
  'Philadelphia Phillies': 'PHI Phillies', 'Pittsburgh Pirates': 'PIT Pirates', 'San Diego Padres': 'SD Padres',
  'San Francisco Giants': 'SF Giants', 'Seattle Mariners': 'SEA Mariners', 'St. Louis Cardinals': 'STL Cardinals',
  'Tampa Bay Rays': 'TB Rays', 'Texas Rangers': 'TEX Rangers', 'Toronto Blue Jays': 'TOR Blue Jays',
  'Washington Nationals': 'WSH Nationals',
}

function cheatTeamShort(team: string) {
  return MLB_TEAM_CHEAT_SHORT[team] || factorTeamDisplay(team)
}

function factorTone(score: number) {
  if (score >= 72) return { tone: colors.green, lean: 'Boost' }
  if (score <= 43) return { tone: colors.red, lean: 'Suppress' }
  return { tone: colors.gold, lean: 'Watch' }
}

function factorScoreLabel(sport: FactorSport) {
  return sport === 'MLB' ? 'Run/HR Volume' : 'Scoring Volume'
}

export function factorImpactTone(value: number) {
  if (value >= 8) return colors.green
  if (value <= -8) return colors.red
  return colors.gold
}

export function stadiumProfileForRow(
  row: FactorRow,
  sport: FactorSport,
  ballparkData?: BallparkProfilePayload,
  footballData?: FootballStadiumProfilePayload,
): StadiumProfile {
  const baseline = factorBaseline(row.homeTeam, sport)
  const staticProfile = sport === 'MLB'
    ? ballparkData?.profilesByVenue?.[row.venue] || ballparkData?.profilesByTeam?.[row.homeTeam]
    : footballData?.profilesByVenue?.[row.venue] || footballData?.profilesByTeam?.[row.homeTeam]
  if (sport === 'NFL') {
    const nflProfile = staticProfile as FootballStadiumStaticProfile | undefined
    return {
      sport,
      venue: row.venue,
      homeTeam: row.homeTeam,
      teamLabel: nflProfile?.team,
      city: nflProfile?.city,
      environment: row.environment || baseline.environment,
      market: baseline.market || row.tags[0] || 'Watch board',
      score: baseline.score,
      capacity: nflProfile?.capacity,
      altitudeFt: nflProfile?.altitudeFt,
      roof: nflProfile?.roofStatus,
      roofStatus: nflProfile?.roofStatus,
      surface: nflProfile?.surface,
      windImpact: nflProfile?.windImpact,
      weatherExposure: nflProfile?.weatherExposure,
      weather: row.weather,
      wind: row.weatherRaw?.windStr || nflProfile?.windImpact,
      blurb: nflProfile?.blurb || `${row.venue} matters most through weather, surface, kicking, passing, and total-scoring conditions.`,
    }
  }

  const mlbProfile = staticProfile as BallparkStaticProfile | undefined
  const hasRoofContext = Boolean(mlbProfile?.roof && mlbProfile.roof !== 'Open Air')
  const wind = hasRoofContext ? (mlbProfile?.roof === 'Fixed Dome' ? 'Controlled' : 'Roof watch') : row.weatherRaw?.windStr || ''
  const sky = cleanSkyLabel(row.weatherRaw?.sky)
  const temp = typeof row.weatherRaw?.tempF === 'number' ? `${row.weatherRaw.tempF}F` : ''
  const weather = hasRoofContext ? `${mlbProfile?.roof} context` : [sky, temp].filter(Boolean).join(' · ')
  const blurb = baseline.score >= 72
    ? `${row.venue} generally grades as a hitter-friendly park in KingFish Game Factors. Check wind and temperature before leaning into totals or power props.`
    : baseline.score <= 43
      ? `${row.venue} generally plays more pitcher-friendly in KingFish Game Factors. Run environment can still move when weather or lineup context changes.`
      : `${row.venue} is more context-sensitive than automatic. Weather, wind direction, roof context, and matchup shape do more of the work here.`

  return {
    sport,
    venue: row.venue,
    homeTeam: row.homeTeam,
    teamLabel: mlbProfile?.team,
    city: mlbProfile?.city,
    homeRecord: mlbProfile?.teamAbbr ? ballparkData?.homeRecords?.[mlbProfile.teamAbbr] : undefined,
    environment: mlbProfile?.read || row.environment || baseline.environment,
    market: baseline.market || row.tags[0] || 'Watch board',
    score: baseline.score,
    capacity: mlbProfile?.capacity,
    altitudeFt: mlbProfile?.altitudeFt,
    roof: mlbProfile?.roof,
    surface: mlbProfile?.surface,
    weather,
    wind,
    blurb: mlbProfile?.blurb || blurb,
  }
}

function stadiumProfileForGameLine(
  game: Game,
  weather: any,
  ballparkData?: BallparkProfilePayload,
): StadiumProfile {
  const row: FactorRow = {
    id: game.id || game.game_id || `${game.away_team}-${game.home_team}`,
    matchup: `${game.away_team} @ ${game.home_team}`,
    homeTeam: game.home_team,
    time: game.commence_time,
    scoreLabel: factorScoreLabel('MLB'),
    venue: weather?.park || factorBaseline(game.home_team, 'MLB').venue,
    environment: factorBaseline(game.home_team, 'MLB').environment,
    weather: weather ? weatherFactor(weather, 'MLB').label : 'Weather pending',
    weatherRaw: weather,
    official: 'Umpire pending',
    score: factorBaseline(game.home_team, 'MLB').score,
    lean: factorTone(factorBaseline(game.home_team, 'MLB').score).lean,
    tone: factorTone(factorBaseline(game.home_team, 'MLB').score).tone,
    tags: [factorBaseline(game.home_team, 'MLB').market],
  }
  return stadiumProfileForRow(row, 'MLB', ballparkData)
}

export function buildFactorRows(
  games: Game[] = [],
  weatherData: Record<string, any> = {},
  sport: FactorSport,
  officialData: Record<string, FactorOfficial> = {},
) {
  return games
    .filter((game) => new Date(game.commence_time).getTime() > Date.now() - 3 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime())
    .map((game) => {
      const id = game.id || game.game_id || `${game.away_team}-${game.home_team}`
      const baseline = factorBaseline(game.home_team, sport)
      const weather = weatherFactor(weatherData[id], sport)
      const official = officialFactor(sport, officialData[id])
      const context = gameContextFactor(game, sport)
      const score = Math.max(1, Math.min(100, Math.round(baseline.score + weather.delta + official.delta + context.delta)))
      const tone = factorTone(score)
      const tags = [baseline.market, baseline.environment, ...weather.tags, official.tag, ...context.tags]
        .filter(Boolean)
        .filter((tag) => !isNeutralFactorText(tag))
      const awayName = factorTeamDisplay(game.away_team)
      const homeName = factorTeamDisplay(game.home_team)
      return {
        id,
        matchup: `${game.away_team} @ ${game.home_team}`,
        homeTeam: game.home_team,
        time: new Date(game.commence_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }),
        scoreLabel: factorScoreLabel(sport),
        venue: weatherData[id]?.park || weatherData[id]?.stadium || baseline.venue,
        environment: isNeutralFactorText(baseline.environment) ? '' : baseline.environment,
        weather: weather.label,
        weatherRaw: weatherData[id],
        official: official.label,
        score,
        lean: tone.lean,
        tone: tone.tone,
        tags,
      }
    })
}

export function buildFactorCheatRows(games: Game[] = [], weatherData: Record<string, any> = {}): FactorCheatRow[] {
  return games
    .filter((game) => new Date(game.commence_time).getTime() > Date.now() - 3 * 60 * 60 * 1000)
    .map((game) => {
      const id = game.id || game.game_id || `${game.away_team}-${game.home_team}`
      const baseline = factorBaseline(game.home_team, 'MLB')
      const weather = weatherData[id]
      const weatherRead = weatherFactor(weather, 'MLB')
      const context = gameContextFactor(game, 'MLB')
      const parkTotal = Math.round((baseline.score - 55) * 0.45)
      const parkHr = Math.round((baseline.score - 55) * 0.35)
      const gameTotalPct = Math.max(-30, Math.min(32, Math.round(parkTotal + weatherTotalAdjustment(weather) + context.delta)))
      const hrPct = Math.max(-35, Math.min(35, Math.round(parkHr + weatherHrAdjustment(weather))))
      const read = gameTotalPct >= 8
        ? 'Game total boost'
        : gameTotalPct <= -8
          ? 'Game total suppress'
          : hrPct >= 8
            ? 'HR weather boost'
            : hrPct <= -8
              ? 'HR power suppress'
              : 'Watch board'

      return {
        id,
        matchup: `${cheatTeamShort(game.away_team)} @ ${cheatTeamShort(game.home_team)}`,
        time: new Date(game.commence_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }),
        venue: weather?.park || baseline.venue,
        weather: weatherRead.label || 'Weather pending',
        gameTotalPct,
        hrPct,
        read,
        tone: factorImpactTone(gameTotalPct),
      }
    })
    .sort((a, b) => b.gameTotalPct - a.gameTotalPct || b.hrPct - a.hrPct)
}

function parseTdStreakCsv(csv: string): TdStreakRow[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [player, team, position, streakGames] = line.split(',').map((value) => value.trim())
      return {
        player,
        team,
        position,
        streak_games: Number(streakGames) || 0,
      }
    })
    .filter((row) => row.player && row.team && row.position && row.streak_games > 0)
    .sort((a, b) => b.streak_games - a.streak_games || a.player.localeCompare(b.player))
}

function parseQbTdCsv(csv: string): TdStreakRow[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [player, team, position, streakGames, twoTdGames, games, twoTdRate] = line.split(',').map((value) => value.trim())
      return {
        player,
        team,
        position,
        streak_games: Number(streakGames) || 0,
        two_td_games: Number(twoTdGames) || 0,
        games: Number(games) || 0,
        two_td_rate: twoTdRate,
      }
    })
    .filter((row) => row.player && row.team && row.position && row.streak_games >= 2)
    .sort((a, b) => b.streak_games - a.streak_games || (b.two_td_games || 0) - (a.two_td_games || 0) || a.player.localeCompare(b.player))
}

function buildQb200Rows(data?: NflFantasySummary): QbYardsRow[] {
  return (data?.players || [])
    .filter((player) => player.position === 'QB' && Array.isArray(player.raw_games) && player.raw_games.length >= 5)
    .map((player) => {
      const games = (player.raw_games || [])
        .filter((game) => Number(game.passing_attempts || 0) > 0 || Number(game.passing_yards || 0) > 0)
      const hits = games.filter((game) => Number(game.passing_yards || 0) >= 200)
      const l5 = games.slice(0, 5)
      const l10 = games.slice(0, 10)
      let streak = 0
      for (const game of games) {
        if (Number(game.passing_yards || 0) < 200) break
        streak += 1
      }

      return {
        player: player.player_name,
        team: player.team,
        games: games.length,
        hitGames: hits.length,
        hitRate: `${hits.length}/${games.length}`,
        l5Hits: l5.filter((game) => Number(game.passing_yards || 0) >= 200).length,
        l10Hits: l10.filter((game) => Number(game.passing_yards || 0) >= 200).length,
        l5Avg: l5.length ? l5.reduce((sum, game) => sum + Number(game.passing_yards || 0), 0) / l5.length : 0,
        l10Avg: l10.length ? l10.reduce((sum, game) => sum + Number(game.passing_yards || 0), 0) / l10.length : 0,
        seasonAvg: Number(player.passing_yards_per_game || 0),
        streak_games: streak,
      }
    })
    .filter((row) => row.games >= 5 && row.hitGames > 0)
    .sort((a, b) =>
      b.streak_games - a.streak_games ||
      b.l10Hits - a.l10Hits ||
      b.l5Avg - a.l5Avg ||
      b.seasonAvg - a.seasonAvg ||
      a.player.localeCompare(b.player)
    )
}

function fmtMoney(value: number) {
  if (!Number.isFinite(value)) return '-'
  return `$${value.toFixed(2)}`
}

function americanToDecimal(odds: number) {
  if (odds > 0) return odds / 100 + 1
  return 100 / Math.abs(odds) + 1
}

function decimalToAmerican(decimal: number) {
  if (!Number.isFinite(decimal) || decimal <= 1) return 0
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

function impliedProbability(odds: number) {
  if (!Number.isFinite(odds) || odds === 0) return 0
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

function parseNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(/[$,%]/g, '').trim())
  return Number.isFinite(parsed) ? parsed : NaN
}

function formatSavedAt(value?: string, sheetDate?: string) {
  if (!sheetDate && !value) return 'Locks daily at 9:05 AM CT'
  const dateLabel = new Date(sheetDate ? `${sheetDate}T12:00:00` : value || '').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const publishedAt = value ? new Date(value) : null
  const timeLabel = publishedAt && Number.isFinite(publishedAt.getTime())
    ? publishedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
    : '9:05 AM CT'
  return `For ${dateLabel}, locks ${timeLabel} daily`
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

function bestOutcomes(game: Game, marketKey: string, bookKeys = eligiblePropBookKeys()) {
  const map: Record<string, { player: string; line: number; odds?: number; book?: string }> = {}

  game.bookmakers?.forEach((bookmaker) => {
    if (!bookKeys.includes(bookmaker.key)) return
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

function bestHitFadeOutcomes(game: Game, bookKeys = eligiblePropBookKeys()) {
  const map: Record<string, {
    player: string
    line: number
    overOdds?: number
    overBook?: string
    underOdds?: number
    underBook?: string
  }> = {}

  game.bookmakers?.forEach((bookmaker) => {
    if (!bookKeys.includes(bookmaker.key)) return
    const market = bookmaker.markets?.find((item) => item.key === 'batter_hits')
    market?.outcomes?.forEach((outcome) => {
      if (!outcome.description) return
      if (typeof outcome.price !== 'number' || outcome.price > 700 || outcome.price < -10000) return
      const line = outcome.point || 0.5
      if (line !== 0.5) return
      const key = `${outcome.description}-${line}`
      map[key] ||= { player: outcome.description, line }
      const book = SHEET_BOOK_NAMES[bookmaker.key] || BOOK_DISPLAY_NAMES[bookmaker.key] || bookmaker.key

      if (outcome.name === 'Over' && (!map[key].overOdds || outcome.price > (map[key].overOdds || -10000))) {
        map[key].overOdds = outcome.price
        map[key].overBook = book
      }

      if (outcome.name === 'Under' && (!map[key].underOdds || outcome.price > (map[key].underOdds || -10000))) {
        map[key].underOdds = outcome.price
        map[key].underBook = book
      }
    })
  })

  return Object.values(map)
}

function bestBookOutcomes(game: Game, marketKey: string, bookKeys = eligiblePropBookKeys()) {
  const map: Record<string, {
    player: string
    line: number
    overOdds?: number
    overBook?: string
    underOdds?: number
    underBook?: string
  }> = {}

  game.bookmakers?.forEach((bookmaker) => {
    if (!bookKeys.includes(bookmaker.key)) return
    const market = bookmaker.markets?.find((item) => item.key === marketKey)
    market?.outcomes?.forEach((outcome) => {
      if (!outcome.description) return
      if (typeof outcome.price !== 'number' || outcome.price > 700 || outcome.price < -10000) return
      const line = outcome.point || 0.5
      const key = `${outcome.description}-${line}`
      map[key] ||= { player: outcome.description, line }
      const book = SHEET_BOOK_NAMES[bookmaker.key] || BOOK_DISPLAY_NAMES[bookmaker.key] || bookmaker.key

      if (outcome.name === 'Over' && (map[key].overOdds === undefined || outcome.price > (map[key].overOdds || -10000))) {
        map[key].overOdds = outcome.price
        map[key].overBook = book
      }

      if (outcome.name === 'Under' && (map[key].underOdds === undefined || outcome.price > (map[key].underOdds || -10000))) {
        map[key].underOdds = outcome.price
        map[key].underBook = book
      }
    })
  })

  return Object.values(map)
}

function dedupeBestOdds<T extends SheetRow & { underOdds?: number; underBook?: string }>(rows: T[]) {
  const map = new Map<string, T>()

  rows.forEach((row) => {
    const key = `${row.player}_${row.matchup}_${row.line}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, row)
      return
    }

    map.set(key, {
      ...existing,
      odds: row.odds !== undefined && (existing.odds === undefined || row.odds > existing.odds) ? row.odds : existing.odds,
      book: row.odds !== undefined && (existing.odds === undefined || row.odds > existing.odds) ? row.book : existing.book,
      underOdds: row.underOdds !== undefined && (existing.underOdds === undefined || row.underOdds > existing.underOdds) ? row.underOdds : existing.underOdds,
      underBook: row.underOdds !== undefined && (existing.underOdds === undefined || row.underOdds > existing.underOdds) ? row.underBook : existing.underBook,
    })
  })

  return Array.from(map.values())
}

function bvpByBatterId(bvp: Record<string, any> = {}, matchups: BvpMatchup[] = []) {
  return new Map(matchups.map((matchup) => [matchup.batterID, bvp[`${matchup.batterID}_${matchup.pitcherID}`]]))
}

// ── Server-first sheet scores ─────────────────────────────────────────────────
// /api/statsheet-data now ships `sheet_scores` — the SAME dashboard-derived
// numbers the web statsheet renders (2026-07-09 conversion; "calculated scores
// live on the web"), keyed `${gameId}|${player}|${line}` per sheet. Builders
// prefer these so iPhone/web show IDENTICAL scores; the local formulas below
// stay strictly as the offline fallback (backups are kept, never deleted).
type SheetScores = Record<string, Record<string, any>>

function serverSheetScore(sheetScores: SheetScores | undefined, sheet: string, game: Game, player: string, line: number) {
  const gameId = (game as any).game_id ?? (game as any).id
  return sheetScores?.[sheet]?.[`${gameId}|${player}|${line}`]
}

// App-styled tier chip for a server probability-scale score (EDGE_CONFIG.mlb
// tiers 80/55/35 — the same cutoffs as the MLB dashboard edge). Presentation
// stays client-side; only the NUMBER comes from the server.
function probTierEdge(score: number, neutralWord = 'Neutral', fadeWord = 'Fade') {
  return score >= 80
    ? { label: `Strong ${score}`, color: colors.green, score }
    : score >= 55
      ? { label: `Lean ${score}`, color: colors.gold, score }
      : score >= 35
        ? { label: `${neutralWord} ${score}`, color: colors.textSecondary, score }
        : { label: `${fadeWord} ${score}`, color: colors.red, score }
}

function buildHitFadeRows(
  games: Game[],
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  bvp: Record<string, any> = {},
  matchups: BvpMatchup[] = [],
  sheetScores?: SheetScores,
) {
  const rows: Array<SheetRow & {
    fadeScore: number
    underOdds?: number
    underBook?: string
    vsSpAb: number
    vsSpHits: number
    vsSpHitRate: number
  }> = []
  const bvpByBatter = new Map(matchups.map((matchup) => [matchup.batterID, bvp[`${matchup.batterID}_${matchup.pitcherID}`]]))

  games.forEach((game) => {
    bestHitFadeOutcomes(game).forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return

      const season = getStat(playerStats, 'hits_per_game', 'season')
      const l10 = getStat(playerStats, 'hits_per_game', 'l10')
      const l5 = getStat(playerStats, 'hits_per_game', 'l5')
      if (!season && !l10 && !l5) return

      const matchupBvp = lineup ? bvpByBatter.get(String(lineup.id)) : null
      const vsSpAb = Number(matchupBvp?.ab || 0)
      const vsSpHits = Number(matchupBvp?.hits || 0)
      const vsSpHitRate = vsSpAb > 0 ? vsSpHits / vsSpAb : 0
      const hr = hitRate(playerStats, 'hits_per_game', outcome.line, 10)
      const overMarket = impliedProbability(outcome.overOdds || 0)
      const underMarket = impliedProbability(outcome.underOdds || 0)
      const starterZeroScore =
        vsSpAb >= 8 && vsSpHits === 0 ? 62 :
        vsSpAb >= 5 && vsSpHits === 0 ? 48 :
        vsSpAb >= 3 && vsSpHits === 0 ? 34 :
        vsSpAb >= 6 && vsSpHitRate <= 0.167 ? 32 :
        vsSpAb >= 3 && vsSpHitRate <= 0.200 ? 20 :
        vsSpAb >= 3 ? Math.max(0, 18 - vsSpHitRate * 60) :
        6
      // Server-first: the dashboard hits edge (P(hit) × 100, fade = complement).
      const srv = serverSheetScore(sheetScores, 'hits', game, outcome.player, outcome.line)
      const hitScore = typeof srv?.score === 'number' ? srv.score : Math.round(
        Math.min(l5 / 1.0, 1.5) * 34 +
        Math.min(l10 / 1.0, 1.4) * 18 +
        (vsSpAb >= 3 ? Math.min(vsSpHitRate / 0.34, 1.6) * 32 : 8) +
        overMarket * 16
      )
      const fadeScore = typeof srv?.fadeScore === 'number' ? srv.fadeScore : Math.round(
        starterZeroScore +
        Math.max(0, 1 - Math.min(l5 / 0.70, 1)) * 28 +
        Math.max(0, 1 - Math.min(l10 / 0.80, 1)) * 14 +
        underMarket * 12
      )
      const overEdge = typeof srv?.score === 'number' ? probTierEdge(hitScore) : hitScore >= 78
        ? { label: `Strong ${hitScore}`, color: colors.green, score: hitScore }
        : hitScore >= 64
          ? { label: `Lean ${hitScore}`, color: colors.gold, score: hitScore }
          : hitScore >= 48
            ? { label: `Neutral ${hitScore}`, color: colors.textSecondary, score: hitScore }
            : { label: `Fade ${hitScore}`, color: colors.red, score: hitScore }

      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.overOdds,
        book: outcome.overBook,
        underOdds: outcome.underOdds,
        underBook: outcome.underBook,
        season,
        l10,
        l5,
        hitRate: hr.label,
        reason: sheetReason('hits', { line: outcome.line, season, l10, l5, hitRate: hr.label, odds: outcome.overOdds }),
        edge: overEdge,
        fadeScore,
        vsSpAb,
        vsSpHits,
        vsSpHitRate,
        pickLabel: `Over ${outcome.line} Hits`,
      })
    })
  })

  const dedupedMap = new Map<string, typeof rows[number]>()

  rows.forEach((row) => {
    const key = `${row.player}_${row.matchup}_${row.line}`
    const existing = dedupedMap.get(key)

    if (!existing) {
      dedupedMap.set(key, row)
      return
    }

    dedupedMap.set(key, {
      ...existing,
      odds:
        row.odds !== undefined && (existing.odds === undefined || row.odds > existing.odds)
          ? row.odds
          : existing.odds,
      book:
        row.odds !== undefined && (existing.odds === undefined || row.odds > existing.odds)
          ? row.book
          : existing.book,
      underOdds:
        row.underOdds !== undefined && (existing.underOdds === undefined || row.underOdds > existing.underOdds)
          ? row.underOdds
          : existing.underOdds,
      underBook:
        row.underOdds !== undefined && (existing.underOdds === undefined || row.underOdds > existing.underOdds)
          ? row.underBook
          : existing.underBook,
    })
  })

  const withStats = Array.from(dedupedMap.values()).filter((row) => row.season > 0 || row.l10 > 0 || row.l5 > 0)

  const bets = withStats
    .filter((row) => row.odds !== undefined && row.edge.score >= 60)
    .sort((a, b) => {
      if (b.edge.score !== a.edge.score) return b.edge.score - a.edge.score
      if (b.vsSpHitRate !== a.vsSpHitRate) return b.vsSpHitRate - a.vsSpHitRate
      return b.l5 - a.l5
    })
    .slice(0, 5)

  const used = new Set(bets.map((row) => `${row.player}_${row.line}`))
  const fades = withStats
    .filter((row) => !used.has(`${row.player}_${row.line}`) && row.underOdds !== undefined)
    .filter((row) =>
      row.fadeScore >= 34 ||
      (row.vsSpAb >= 3 && row.vsSpHits === 0) ||
      (row.vsSpAb >= 5 && row.vsSpHitRate <= 0.200) ||
      row.l5 <= 0.60 ||
      row.l10 <= 0.70
    )
    .map((row) => ({
      ...row,
      odds: row.underOdds,
      book: row.underBook,
      reason: row.hitRate !== '-'
        ? `Fade profile: L10 hit rate ${row.hitRate}, with L5 ${fmt(row.l5)} and season ${fmt(row.season)}.`
        : `Fade profile: L5 ${fmt(row.l5)} and season ${fmt(row.season)} sit below the 0.5-hit line.`,
      edge: { label: `Under ${row.fadeScore}`, color: colors.red, score: row.fadeScore },
      pickLabel: `Under ${row.line} Hits`,
    }))
    .sort((a, b) => {
      const aZero = a.vsSpAb >= 3 && a.vsSpHits === 0 ? 1 : 0
      const bZero = b.vsSpAb >= 3 && b.vsSpHits === 0 ? 1 : 0
      if (bZero !== aZero) return bZero - aZero
      if (bZero && b.vsSpAb !== a.vsSpAb) return b.vsSpAb - a.vsSpAb
      if (b.fadeScore !== a.fadeScore) return b.fadeScore - a.fadeScore
      if (a.vsSpHitRate !== b.vsSpHitRate) return a.vsSpHitRate - b.vsSpHitRate
      return a.l5 - b.l5
    })
    .slice(0, 5)

  return fades.length > 0
    ? [...bets, { divider: true, label: 'FADES - UNDER LEANS' } as SheetRow, ...fades]
    : bets
}

function buildRows(
  games: Game[],
  marketKey: string,
  statField: string,
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  sheetKey: SheetKey,
  trend = false,
  bvp: Record<string, any> = {},
  matchups: BvpMatchup[] = [],
  sheetScores?: SheetScores,
) {
  if (sheetKey === 'hits') return buildHitFadeRows(games, lineupMap, stats, bvp, matchups, sheetScores)
  if (sheetKey === 'hr') return buildHrRows(games, lineupMap, stats, bvp, matchups, sheetScores)
  if (sheetKey === 'tb') return buildTotalBaseRows(games, lineupMap, stats, sheetScores)
  if (sheetKey === 'hot') return buildHotHitterRows(games, lineupMap, stats, sheetScores)
  if (sheetKey === 'k') return buildStrikeoutRows(games, lineupMap, stats, sheetScores)

  const rows: SheetRow[] = []

  games.forEach((game) => {
    bestOutcomes(game, marketKey).forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return
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
            color: boostedScore >= 78 ? colors.green : boostedScore >= 64 ? colors.gold : boostedScore >= 45 ? colors.textSecondary : colors.red,
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

function buildShareText(
  sheet: { label: string },
  activeKey: SheetKey,
  rows: SheetRow[],
  bvpRows: BvpRow[],
  tdRows: TdStreakRow[],
  qbTdRows: TdStreakRow[],
  qb200Rows: QbYardsRow[],
) {
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const header = [`KINGFISH BETS`, sheet.label.toUpperCase(), date]

  if (activeKey === 'bvp' && bvpRows.length) {
    return [
      ...header,
      '',
      'BATTER | VS PITCHER | AB | AVG | HR | RBI | OPS',
      ...bvpRows.slice(0, 12).map(row => `${row.player} | ${row.pitcher} | ${row.ab} | ${row.avg} | ${row.hr} | ${row.rbi} | ${row.ops}`),
      '',
      'kingfishbets.com',
    ].join('\n')
  }

  if (activeKey === 'td' && tdRows.length) {
    return [
      ...header,
      '',
      'PLAYER | TEAM | POS | STREAK',
      ...tdRows.slice(0, 12).map(row => `${row.player} | ${row.team} | ${row.position} | ${row.streak_games} games`),
      '',
      'kingfishbets.com',
    ].join('\n')
  }

  if (activeKey === 'qbtd' && qbTdRows.length) {
    return [
      ...header,
      '',
      'QB | TEAM | 2+ TD GAMES | STREAK',
      ...qbTdRows.slice(0, 12).map(row => `${row.player} | ${row.team} | ${row.two_td_games || 0}/${row.games || 0} | ${row.streak_games}`),
      '',
      'kingfishbets.com',
    ].join('\n')
  }

  if (activeKey === 'qb200' && qb200Rows.length) {
    return [
      ...header,
      '',
      'QB | TEAM | 200+ RATE | L5 | L10 | STREAK',
      ...qb200Rows.slice(0, 12).map(row => `${row.player} | ${row.team} | ${row.hitRate} | ${row.l5Hits}/5 | ${row.l10Hits}/10 | ${row.streak_games}`),
      '',
      'kingfishbets.com',
    ].join('\n')
  }

  const cleanRows = rows.filter(row => !row.divider).slice(0, 12)
  if (!cleanRows.length) return ''

  return [
    ...header,
    '',
    'PLAYER | MATCHUP | LINE | ODDS | EDGE',
    ...cleanRows.map(row => `${row.player} | ${row.matchup} | ${row.pickLabel || `Over ${row.line}`} | ${row.odds ? fmtOdds(row.odds) : '-'} ${row.book || ''} | ${row.edge.label}`),
    '',
    'kingfishbets.com',
  ].join('\n')
}

function buildHotHitterRows(
  games: Game[],
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  sheetScores?: SheetScores,
) {
  const rows: Array<SheetRow & { hotFactor: number; streak: number; underOdds?: number; underBook?: string }> = []

  games.forEach((game) => {
    bestBookOutcomes(game, 'batter_hits').forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return

      const season = getStat(playerStats, 'hits_per_game', 'season')
      const l10 = getStat(playerStats, 'hits_per_game', 'l10')
      const l5 = getStat(playerStats, 'hits_per_game', 'l5')
      if (season <= 0 || l5 <= 0) return

      // Server-first (matches the web sheet): "hot" = consecutive games with a
      // hit, score = the dashboard hits edge. Local hotFactor (L5 vs season
      // pace) is the offline fallback curation.
      const srv = serverSheetScore(sheetScores, 'hot', game, outcome.player, outcome.line)
      const streak = Number(srv?.streak) || 0
      const hotFactor = l5 / season
      if (srv) {
        if (streak < 3) return
      } else if (hotFactor < 1.20) return

      const edge = typeof srv?.score === 'number' ? probTierEdge(srv.score) : webEdgeLabel(outcome.line, season, l10, l5)
      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.overOdds,
        book: outcome.overBook,
        underOdds: outcome.underOdds,
        underBook: outcome.underBook,
        season,
        l10,
        l5,
        hitRate: '-',
        reason: srv
          ? `${streak} straight games with a hit (L5 ${fmt(l5)} vs season ${fmt(season)}).`
          : `L5 is ${(hotFactor * 100).toFixed(0)}% of season pace (${fmt(l5)} vs ${fmt(season)}).`,
        edge,
        hotFactor,
        streak,
        pickLabel: `Over ${outcome.line} Hits`,
      })
    })
  })

  return dedupeBestOdds(rows)
    .sort((a, b) => b.streak - a.streak || b.hotFactor - a.hotFactor || b.l10 - a.l10)
    .slice(0, 10)
}

function buildHrRows(
  games: Game[],
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  bvp: Record<string, any> = {},
  matchups: BvpMatchup[] = [],
  sheetScores?: SheetScores,
) {
  const rows: Array<SheetRow & { vsSpHrRate: number; underOdds?: number; underBook?: string }> = []
  const bvpMap = bvpByBatterId(bvp, matchups)

  games.forEach((game) => {
    bestBookOutcomes(game, 'batter_home_runs').forEach((outcome) => {
      if (outcome.line !== 0.5) return
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return

      const season = getStat(playerStats, 'hr_per_game', 'season')
      const l10 = getStat(playerStats, 'hr_per_game', 'l10')
      const l5 = getStat(playerStats, 'hr_per_game', 'l5')
      const matchupBvp = lineup ? bvpMap.get(String(lineup.id)) : null
      const vsSpAb = Number(matchupBvp?.ab || 0)
      const vsSpHr = Number(matchupBvp?.hr || 0)
      const vsSpHrRate = vsSpAb > 0 ? vsSpHr / vsSpAb : 0
      const marketChance = impliedProbability(outcome.overOdds || 0)
      // Server-first: THE HR number — the dashboard's P(homers today) model
      // score, with its receipts line ("xSLG .520 · bats L vs RHP · park HR
      // 118"). The power blend below is the offline fallback only.
      const srv = serverSheetScore(sheetScores, 'hr', game, outcome.player, outcome.line)
      const score = typeof srv?.score === 'number' ? srv.score : Math.round(
        (vsSpAb >= 3 ? Math.min(vsSpHrRate / 0.12, 1.8) * 42 : 8) +
        Math.min(l5 / 0.45, 1.5) * 28 +
        Math.min(l10 / 0.35, 1.4) * 12 +
        Math.min(marketChance / 0.12, 1.4) * 18
      )
      const edge = score >= 72
        ? { label: `Strong ${score}`, color: colors.green, score }
        : score >= 58
          ? { label: `Lean ${score}`, color: colors.gold, score }
          : score >= 42
            ? { label: `Neutral ${score}`, color: colors.textSecondary, score }
            : { label: `Fade ${score}`, color: colors.red, score }
      const tier = srv?.tier || (score >= 72 ? 'Top Target' : score >= 58 ? 'Lean HR' : 'Long Shot')

      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.overOdds,
        book: outcome.overBook,
        underOdds: outcome.underOdds,
        underBook: outcome.underBook,
        season,
        l10,
        l5,
        hitRate: '-',
        reason: srv?.detail
          ? `${tier}: ${srv.detail}.`
          : vsSpAb >= 3
            ? `${tier}: ${vsSpHr} HR in ${vsSpAb} AB vs today's starter.`
            : `${tier}: recent power and market price drive this look.`,
        edge,
        vsSpHrRate,
        pickLabel: `Over ${outcome.line} HR`,
      })
    })
  })

  return dedupeBestOdds(rows)
    .filter((row) => row.odds !== undefined)
    .filter((row) => row.l5 > 0 || row.l10 > 0 || row.vsSpHrRate > 0 || row.odds !== undefined)
    .sort((a, b) => {
      if (b.edge.score !== a.edge.score) return b.edge.score - a.edge.score
      if (b.vsSpHrRate !== a.vsSpHrRate) return b.vsSpHrRate - a.vsSpHrRate
      return b.l5 - a.l5
    })
    .slice(0, 10)
}

function buildTotalBaseRows(
  games: Game[],
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  sheetScores?: SheetScores,
) {
  const rows: Array<SheetRow & { l5Hits: number; l10Hits: number }> = []

  games.forEach((game) => {
    bestBookOutcomes(game, 'batter_total_bases').forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return

      const season = getStat(playerStats, 'tb_per_game', 'season')
      const l10 = getStat(playerStats, 'tb_per_game', 'l10')
      const l5 = getStat(playerStats, 'tb_per_game', 'l5')
      const rawGames = Array.isArray(playerStats.raw_games) ? playerStats.raw_games : []
      const l5Games = rawGames.slice(0, 5)
      const l10Games = rawGames.slice(0, 10)
      const l5Hits = l5Games.filter((raw: any) => Number(raw?.tb || 0) >= Number(outcome.line || 0)).length
      const l10Hits = l10Games.filter((raw: any) => Number(raw?.tb || 0) >= Number(outcome.line || 0)).length
      const l5HitRate = l5Games.length ? l5Hits / l5Games.length : 0
      const l10HitRate = l10Games.length ? l10Hits / l10Games.length : 0
      // Server-first: the dashboard batter_total_bases edge (P(clears) × 100;
      // TB O 0.5 reads the hits distribution there — same bet, same number).
      const srv = serverSheetScore(sheetScores, 'tb', game, outcome.player, outcome.line)
      const score = typeof srv?.score === 'number' ? srv.score : Math.round(
        Math.min(l5HitRate, 1) * 42 +
        Math.min(l10HitRate, 1) * 18 +
        Math.min((l5 || 0) / Math.max(Number(outcome.line || 0.5), 0.5), 1.6) * 24 +
        impliedProbability(outcome.overOdds || 0) * 16
      )
      const edge = typeof srv?.score === 'number' ? probTierEdge(score, 'Watch', 'Pass') : score >= 76
        ? { label: `Strong ${score}`, color: colors.green, score }
        : score >= 62
          ? { label: `Lean ${score}`, color: colors.gold, score }
          : score >= 45
            ? { label: `Watch ${score}`, color: colors.textSecondary, score }
            : { label: `Pass ${score}`, color: colors.red, score }

      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.overOdds,
        book: outcome.overBook,
        season,
        l10,
        l5,
        hitRate: `${l10Hits}/${l10Games.length || 10}`,
        reason: `Cleared this line ${l5Hits}/5 recently and ${l10Hits}/10 over the larger window.`,
        edge,
        l5Hits,
        l10Hits,
        pickLabel: `Over ${outcome.line} Total Bases`,
      })
    })
  })

  return dedupeBestOdds(rows)
    .filter((row) => row.odds !== undefined)
    .filter((row) => row.line <= 2.5)
    .filter((row) => row.l5Hits >= 3 || row.l10Hits >= 6 || row.edge.score >= 60)
    .sort((a, b) => {
      if (b.l5Hits !== a.l5Hits) return b.l5Hits - a.l5Hits
      if (b.edge.score !== a.edge.score) return b.edge.score - a.edge.score
      return b.l5 - a.l5
    })
    .slice(0, 10)
}

function buildStrikeoutRows(
  games: Game[],
  lineupMap: Record<string, LineupPlayer>,
  stats: Record<number, any>,
  sheetScores?: SheetScores,
) {
  const rows: Array<SheetRow & { underOdds?: number; underBook?: string }> = []

  games.forEach((game) => {
    bestBookOutcomes(game, 'pitcher_strikeouts').forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      const playerStats = lineup ? stats[lineup.id] : undefined
      if (!playerStats) return

      const season = getStat(playerStats, 'strikeouts_per_game', 'season')
      const l10 = getStat(playerStats, 'strikeouts_per_game', 'l10')
      const l5 = getStat(playerStats, 'strikeouts_per_game', 'l5')
      // Server-first: P(clears this K line) × 100 from the shared model.
      const srv = serverSheetScore(sheetScores, 'k', game, outcome.player, outcome.line)
      const edge = typeof srv?.edge?.score === 'number' ? probTierEdge(srv.edge.score) : webEdgeLabel(outcome.line, season, l10, l5)

      rows.push({
        player: outcome.player,
        matchup: `${game.away_team.split(' ').pop()} @ ${game.home_team.split(' ').pop()}`,
        line: outcome.line,
        odds: outcome.overOdds,
        book: outcome.overBook,
        underOdds: outcome.underOdds,
        underBook: outcome.underBook,
        season,
        l10,
        l5,
        hitRate: '-',
        reason: l10 > outcome.line ? 'Recent K form clears this number.' : 'Strikeout profile fits this number.',
        edge,
        pickLabel: `Over ${outcome.line} Strikeouts`,
      })
    })
  })

  return dedupeBestOdds(rows)
    .filter((row) => row.season > 0)
    .sort((a, b) => b.edge.score - a.edge.score || b.l5 - a.l5)
    .slice(0, 10)
}

export default function CheatSheetsScreen() {
  const { profile, session } = useAuth()
  const { mode, sheet } = useLocalSearchParams<{ mode?: string; sheet?: string }>()
  const mobileConfig = useMobileConfig()
  const isPremium = profile?.is_premium === true
  // One HQ switch ("Free Access: Cheat Sheets") opens every cheat sheet for
  // logged-in free users during a promo. Requires an account (server enforces it too).
  const cheatSheetsFree = (mobileConfig.flags['cheat_sheets_free'] ?? false) && Boolean(session)
  const canUseCheatSheets = isPremium || cheatSheetsFree
  // Land on Calculators: it's free for everyone, so guests/free users (and App
  // Review) see usable tools before any premium gate.
  const [toolMode, setToolMode] = useState<ToolMode>('calculators')
  const [selectedKey, setSelectedKey] = useState<SheetKey | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [selectedMarketContext, setSelectedMarketContext] = useState<PlayerProfileMarketContext | null>(null)
  const [calculatorKey, setCalculatorKey] = useState<CalculatorKey>('unit')
  const [stadiumProfile, setStadiumProfile] = useState<StadiumProfile | null>(null)
  const [calcInputs, setCalcInputs] = useState<Record<string, string>>({
    unitBankroll: '1000',
    unitPct: '1.5',
    evOdds: '-110',
    evProb: '55',
    evStake: '100',
    novigA: '-110',
    novigB: '-110',
    kellyBankroll: '1000',
    kellyOdds: '-110',
    kellyProb: '55',
    parlayLegs: '-110, +135, -105',
    parlayStake: '25',
    hedgeStake: '100',
    hedgeOdds: '+220',
    hedgeOppOdds: '-140',
  })
  const activeKey = selectedKey || 'hits'
  const activeSheet = SHEETS.find((sheet) => sheet.key === activeKey) || SHEETS[0]
  const hasOpenSheet = selectedKey !== null
  const canLoadData = canUseCheatSheets && toolMode === 'sheets' && hasOpenSheet
  const isTdSheet = activeSheet.type === 'td'
  const canLoadMlbSheetData = canLoadData && !isTdSheet

  useEffect(() => {
    if (mode === 'calculators' || mode === 'sheets' || mode === 'more') {
      setToolMode(mode)
      setSelectedKey(null)
    }
  }, [mode])

  // Deep link from a home tile: /cheat-sheets?sheet=<key> opens that sheet.
  useEffect(() => {
    const sheetParam = typeof sheet === 'string' ? sheet : undefined
    if (sheetParam && SHEETS.some((entry) => entry.key === sheetParam)) {
      setToolMode('sheets')
      setSelectedKey(sheetParam as SheetKey)
    }
  }, [sheet])

  const sheetQuery = useQuery({
    queryKey: ['cheat-sheet', activeSheet.type],
    queryFn: () => kingfishFetch<{ data: Game[]; sheet_scores?: SheetScores; updated_at?: string; published_at?: string; sheet_date?: string }>(`/api/statsheet-data?type=${activeSheet.type}`),
    // NRFI renders entirely from its own /api/mlb-nrfi snapshot (nrfiQuery below) —
    // statsheet-data has no 'nrfi' type (the server would serve the full PROPS
    // snapshot, the largest sheet payload, for nothing). Worse, on the NRFI sheet
    // this query's key ['cheat-sheet','nrfi'] COLLIDED with nrfiQuery's key, so
    // the props payload could land in the NRFI board's cache slot — the root cause
    // of the old "NRFI opens blank until you switch sheets" bug and the slow open.
    // (Port of kingfish-studio 59cae72.)
    enabled: canLoadMlbSheetData && activeKey !== 'nrfi' && activeKey !== 'topleans',
    staleTime: 12 * 60 * 60 * 1000,
  })
  // NRFI/YRFI is premium, same tier as the other cheat sheets.
  const nrfiQuery = useQuery({
    queryKey: ['cheat-sheet-nrfi'],
    queryFn: () => kingfishFetch<{ data: NrfiRow[]; updated_at?: string; published_at?: string; sheet_date?: string }>('/api/mlb-nrfi'),
    enabled: canUseCheatSheets && toolMode === 'sheets' && activeKey === 'nrfi',
    staleTime: 5 * 60 * 1000,
  })
  const nrfiRows = nrfiQuery.data?.data ?? []
  // Top 5 KingFish Leans — cross-sport daily snapshot, own endpoint like NRFI.
  const topLeansQuery = useQuery({
    queryKey: ['cheat-sheet-top-leans'],
    queryFn: () => kingfishFetch<{ data: TopLeansData; updated_at?: string; published_at?: string; sheet_date?: string }>('/api/top-leans'),
    enabled: canUseCheatSheets && toolMode === 'sheets' && activeKey === 'topleans',
    staleTime: 5 * 60 * 1000,
  })
  const topLeansData = topLeansQuery.data?.data
  const topLeanProps = topLeansData?.props ?? []
  const lineupsQuery = useQuery({
    queryKey: ['mlb-lineups-cheat-sheets'],
    queryFn: () => kingfishFetch<{ players: Record<string, LineupPlayer> }>('/api/mlb-lineups'),
    enabled: canLoadMlbSheetData && activeSheet.type !== 'lines' && activeKey !== 'nrfi' && activeKey !== 'topleans',
    staleTime: 12 * 60 * 60 * 1000,
  })

  const scheduleQuery = useQuery({
    queryKey: ['mlb-schedule-cheat-sheets'],
    queryFn: () => kingfishFetch<{
      pitcherMap?: Record<string, string>
      pitcherNameMap?: Record<string, string>
      pitcherIdNameMap?: Record<string, string>
      pitcherEraMap?: Record<string, number>
      teamRecords?: Record<string, { wins: number; losses: number; pct: number }>
    }>('/api/mlb-schedule'),
    enabled: canLoadMlbSheetData && (activeKey === 'bvp' || activeKey === 'hits' || activeKey === 'lines'),
    staleTime: activeKey === 'lines' ? 5 * 60 * 1000 : 60 * 60 * 1000,
  })

  const mlbL10Query = useQuery({
    queryKey: ['mlb-team-l10-cheat-sheets'],
    queryFn: () => kingfishFetch<MLBL10Payload>('/api/mlb-team-l10'),
    enabled: canLoadMlbSheetData && activeKey === 'lines',
    staleTime: 60 * 60 * 1000,
  })

  const tdStreaksQuery = useQuery({
    queryKey: ['nfl-td-streaks-2026'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/data/nfl/td-streaks-2026.csv`)
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      return parseTdStreakCsv(await response.text())
    },
    enabled: canLoadData && activeKey === 'td',
    staleTime: 24 * 60 * 60 * 1000,
  })

  const qbTdStreaksQuery = useQuery({
    queryKey: ['nfl-qb-2td-streaks-2026'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/data/nfl/qb-2td-streaks-2026.csv`)
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      return parseQbTdCsv(await response.text())
    },
    enabled: canLoadData && activeKey === 'qbtd',
    staleTime: 24 * 60 * 60 * 1000,
  })

  const nflFantasyQuery = useQuery({
    queryKey: ['nfl-player-fantasy-summary-qb200'],
    queryFn: () => kingfishFetch<NflFantasySummary>('/data/nfl/player-fantasy-summary.json'),
    enabled: canLoadData && activeKey === 'qb200',
    staleTime: 24 * 60 * 60 * 1000,
  })

  const sheetGames = useMemo(() => sheetQuery.data?.data || [], [sheetQuery.data?.data])

  const playersToFetch = useMemo(() => {
    if (!activeSheet.market || !lineupsQuery.data?.players || !sheetQuery.data?.data) return { batters: [], pitchers: [] }
    const lineupMap = lineupsQuery.data.players
    const seen = new Set<number>()
    const batters: LineupPlayer[] = []
    const pitchers: LineupPlayer[] = []
    const candidates = sheetGames
      .flatMap((game) => bestOutcomes(game, activeSheet.market || ''))
      .sort((a, b) => (b.odds || -10000) - (a.odds || -10000))

    candidates.forEach((outcome) => {
      const lineup = findLineupPlayer(lineupMap, outcome.player)
      if (!lineup || seen.has(lineup.id)) return
      seen.add(lineup.id)
      if (activeSheet.market?.startsWith('pitcher_')) {
        if (pitchers.length < MAX_CHEAT_SHEET_STAT_PLAYERS) pitchers.push(lineup)
      } else if (batters.length < MAX_CHEAT_SHEET_STAT_PLAYERS) {
        batters.push(lineup)
      }
    })
    return { batters, pitchers }
  }, [activeSheet.market, lineupsQuery.data?.players, sheetGames])

  const statsQuery = useQuery({
    queryKey: ['cheat-sheet-stats', activeKey, playersToFetch.batters.map((item) => item.id).join(','), playersToFetch.pitchers.map((item) => item.id).join(',')],
    queryFn: () =>
      kingfishFetch<{ stats: Record<number, any> }>('/api/mlb-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playersToFetch),
      }),
    enabled: canLoadMlbSheetData && activeSheet.type !== 'lines' && (playersToFetch.batters.length > 0 || playersToFetch.pitchers.length > 0),
    staleTime: 12 * 60 * 60 * 1000,
  })

  const weatherQuery = useQuery({
    queryKey: ['cheat-sheet-weather', sheetGames.map((game) => game.id || game.game_id).join(',')],
    queryFn: () =>
      kingfishFetch<Record<string, WeatherInfo>>('/api/mlb-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: sheetGames }),
      }),
    enabled: canLoadMlbSheetData && activeKey === 'lines' && sheetGames.length > 0,
    staleTime: 60 * 60 * 1000,
  })

  const bvpMatchups = useMemo(
    () => buildBvpMatchups(
      sheetGames,
      lineupsQuery.data?.players,
      scheduleQuery.data?.pitcherMap,
      scheduleQuery.data?.pitcherNameMap,
    ),
    [lineupsQuery.data?.players, scheduleQuery.data?.pitcherMap, scheduleQuery.data?.pitcherNameMap, sheetGames],
  )

  const bvpQuery = useQuery({
    queryKey: ['cheat-sheet-bvp-career-v2', bvpMatchups.map((matchup) => `${matchup.batterID}_${matchup.pitcherID}`).join(',')],
    queryFn: () =>
      kingfishFetch<{ bvp: Record<string, any> }>('/api/mlb-bvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchups: bvpMatchups.map(({ batterID, pitcherID }) => ({ batterID, pitcherID })) }),
      }),
    enabled: canLoadMlbSheetData && (activeKey === 'bvp' || activeKey === 'hits' || activeKey === 'hr') && bvpMatchups.length > 0,
    staleTime: 12 * 60 * 60 * 1000,
  })

  const ballparkProfileQuery = useQuery({
    queryKey: ['mobile-mlb-ballpark-profiles'],
    queryFn: () => kingfishFetch<BallparkProfilePayload>('/api/mlb-ballpark-profiles'),
    enabled: canLoadMlbSheetData && activeKey === 'lines',
    staleTime: 30 * 60 * 1000,
  })

  const rows = activeSheet.market && activeSheet.statField && lineupsQuery.data?.players && statsQuery.data?.stats && sheetGames.length > 0
    ? buildRows(sheetGames, activeSheet.market, activeSheet.statField, lineupsQuery.data.players, statsQuery.data.stats, activeKey, activeSheet.trend, bvpQuery.data?.bvp, bvpMatchups, sheetQuery.data?.sheet_scores)
    : []

  const bvpRows = activeKey === 'bvp' ? buildBvpRows(bvpQuery.data?.bvp, bvpMatchups) : []
  const tdStreakRows = activeKey === 'td' ? tdStreaksQuery.data || [] : []
  const qbTdRows = activeKey === 'qbtd' ? qbTdStreaksQuery.data || [] : []
  const qb200Rows = activeKey === 'qb200' ? buildQb200Rows(nflFantasyQuery.data) : []
  const shareText = useMemo(
    () => buildShareText(activeSheet, activeKey, rows, bvpRows, tdStreakRows, qbTdRows, qb200Rows),
    [activeKey, activeSheet, bvpRows, qb200Rows, qbTdRows, rows, tdStreakRows],
  )

  async function shareSheet() {
    if (!shareText) return
    await Share.share({ message: shareText })
  }

  function openPlayerProfile(player: string, row?: SheetRow) {
    setSelectedPlayer(player)
    if (!row || activeKey === 'bvp') {
      setSelectedMarketContext(null)
      return
    }
    const marketKey =
      activeKey === 'hits' || activeKey === 'hot' ? 'batter_hits' :
      activeKey === 'hr' ? 'batter_home_runs' :
      activeKey === 'tb' ? 'batter_total_bases' :
      activeKey === 'k' ? 'pitcher_strikeouts' :
      undefined
    const marketLabel =
      activeKey === 'hits' || activeKey === 'hot' ? 'Hits' :
      activeKey === 'hr' ? 'Home Runs' :
      activeKey === 'tb' ? 'Total Bases' :
      activeKey === 'k' ? 'Strikeouts' :
      ''
    setSelectedMarketContext(marketKey ? { marketKey, marketLabel, commonLine: row.line } : null)
  }

  const updateCalc = (key: string, value: string) => setCalcInputs((current) => ({ ...current, [key]: value }))

  const calculatorResult = useMemo(() => {
    if (calculatorKey === 'unit') {
      const bankroll = parseNumber(calcInputs.unitBankroll)
      const pct = parseNumber(calcInputs.unitPct)
      if (!Number.isFinite(bankroll) || !Number.isFinite(pct) || bankroll <= 0 || pct <= 0) return null
      const oneUnit = bankroll * (pct / 100)
      return [
        { label: '0.5 Unit', value: fmtMoney(oneUnit * 0.5) },
        { label: '1 Unit', value: fmtMoney(oneUnit), tone: colors.gold },
        { label: '2 Units', value: fmtMoney(oneUnit * 2) },
        { label: 'Daily Stop-Loss', value: fmtMoney(oneUnit * 3), tone: colors.red },
        { label: 'Max Daily Exposure', value: fmtMoney(oneUnit * 5) },
      ]
    }

    if (calculatorKey === 'ev') {
      const odds = parseNumber(calcInputs.evOdds)
      const probability = parseNumber(calcInputs.evProb) / 100
      const stake = parseNumber(calcInputs.evStake) || 100
      if (!Number.isFinite(odds) || odds === 0 || !Number.isFinite(probability) || probability <= 0 || probability >= 1) return null
      const decimal = americanToDecimal(odds)
      const profit = (decimal - 1) * stake
      const ev = probability * profit - (1 - probability) * stake
      const bookProb = impliedProbability(odds) * 100
      return [
        { label: 'Expected Value', value: fmtMoney(ev), tone: ev >= 0 ? colors.green : colors.red },
        { label: 'Your Edge', value: `${((probability * 100) - bookProb).toFixed(1)}%`, tone: (probability * 100) >= bookProb ? colors.green : colors.red },
        { label: 'Book Implied', value: `${bookProb.toFixed(1)}%` },
      ]
    }

    if (calculatorKey === 'novig') {
      const sideA = parseNumber(calcInputs.novigA)
      const sideB = parseNumber(calcInputs.novigB)
      if (!Number.isFinite(sideA) || sideA === 0 || !Number.isFinite(sideB) || sideB === 0) return null
      const impA = impliedProbability(sideA)
      const impB = impliedProbability(sideB)
      const total = impA + impB
      if (!total) return null
      const fairA = impA / total
      const fairB = impB / total
      return [
        { label: 'No-Vig Side A', value: `${(fairA * 100).toFixed(1)}% / ${fmtOdds(decimalToAmerican(1 / fairA))}` },
        { label: 'No-Vig Side B', value: `${(fairB * 100).toFixed(1)}% / ${fmtOdds(decimalToAmerican(1 / fairB))}` },
        { label: 'Book Hold', value: `${((total - 1) * 100).toFixed(1)}%`, tone: colors.gold },
      ]
    }

    if (calculatorKey === 'kelly') {
      const bankroll = parseNumber(calcInputs.kellyBankroll)
      const odds = parseNumber(calcInputs.kellyOdds)
      const probability = parseNumber(calcInputs.kellyProb) / 100
      if (!Number.isFinite(bankroll) || bankroll <= 0 || !Number.isFinite(odds) || odds === 0 || !Number.isFinite(probability) || probability <= 0 || probability >= 1) return null
      const decimal = americanToDecimal(odds)
      const b = decimal - 1
      const kelly = (b * probability - (1 - probability)) / b
      const positiveKelly = Math.max(0, kelly)
      return [
        { label: 'Full Kelly', value: `${(kelly * 100).toFixed(1)}%`, tone: kelly > 0 ? colors.green : colors.red },
        { label: 'Half Kelly Stake', value: fmtMoney(bankroll * positiveKelly * 0.5) },
        { label: 'Quarter Kelly Stake', value: fmtMoney(bankroll * positiveKelly * 0.25) },
      ]
    }

    if (calculatorKey === 'parlay') {
      const odds = calcInputs.parlayLegs.split(',').map(parseNumber).filter((price) => Number.isFinite(price) && price !== 0)
      const stake = parseNumber(calcInputs.parlayStake) || 100
      if (odds.length < 2) return null
      const decimal = odds.map(americanToDecimal).reduce((total, next) => total * next, 1)
      const payout = decimal * stake
      return [
        { label: 'Combined Odds', value: fmtOdds(decimalToAmerican(decimal)), tone: colors.gold },
        { label: 'Total Payout', value: fmtMoney(payout) },
        { label: 'Profit', value: fmtMoney(payout - stake), tone: colors.green },
      ]
    }

    const stake = parseNumber(calcInputs.hedgeStake)
    const originalOdds = parseNumber(calcInputs.hedgeOdds)
    const hedgeOdds = parseNumber(calcInputs.hedgeOppOdds)
    if (!Number.isFinite(stake) || stake <= 0 || !Number.isFinite(originalOdds) || originalOdds === 0 || !Number.isFinite(hedgeOdds) || hedgeOdds === 0) return null
    const originalReturn = stake * americanToDecimal(originalOdds)
    const hedgeStake = originalReturn / americanToDecimal(hedgeOdds)
    return [
      { label: 'Hedge Stake', value: fmtMoney(hedgeStake), tone: colors.gold },
      { label: 'Win Either Side', value: fmtMoney(originalReturn - stake - hedgeStake) },
      { label: 'Total Outlay', value: fmtMoney(stake + hedgeStake) },
    ]
  }, [calcInputs, calculatorKey])

  const premiumToolsCard = (
    <Card>
      <AppText style={styles.cardTitle}>Unlock KingFish Tools</AppText>
      <AppText variant="muted" style={styles.cardCopy}>
        Cheat Sheets, player props, Edge Scores, game factors, and unlimited Ask KingFish access are part of KingFish Bets Pro.
      </AppText>
      <View style={styles.action}>
        <Button onPress={() => router.push('/modals/paywall')}>Get Access</Button>
      </View>
    </Card>
  )

  const calculatorCard = (
    <Card style={styles.inlineCalculatorCard}>
      <AppText variant="eyebrow">// Calculator</AppText>
      <AppText style={styles.cardTitle}>{CALCULATORS.find((item) => item.key === calculatorKey)?.label}</AppText>
      {calculatorKey === 'unit' && (
        <View style={styles.inputGrid}>
          <ToolInput label="Bankroll" value={calcInputs.unitBankroll} onChangeText={(value) => updateCalc('unitBankroll', value)} />
          <ToolInput label="Unit %" value={calcInputs.unitPct} onChangeText={(value) => updateCalc('unitPct', value)} />
        </View>
      )}
      {calculatorKey === 'ev' && (
        <View style={styles.inputGrid}>
          <ToolInput label="Book Odds" value={calcInputs.evOdds} onChangeText={(value) => updateCalc('evOdds', value)} />
          <ToolInput label="True Prob %" value={calcInputs.evProb} onChangeText={(value) => updateCalc('evProb', value)} />
          <ToolInput label="Stake" value={calcInputs.evStake} onChangeText={(value) => updateCalc('evStake', value)} />
        </View>
      )}
      {calculatorKey === 'novig' && (
        <View style={styles.inputGrid}>
          <ToolInput label="Side A Odds" value={calcInputs.novigA} onChangeText={(value) => updateCalc('novigA', value)} />
          <ToolInput label="Side B Odds" value={calcInputs.novigB} onChangeText={(value) => updateCalc('novigB', value)} />
        </View>
      )}
      {calculatorKey === 'kelly' && (
        <View style={styles.inputGrid}>
          <ToolInput label="Bankroll" value={calcInputs.kellyBankroll} onChangeText={(value) => updateCalc('kellyBankroll', value)} />
          <ToolInput label="Odds" value={calcInputs.kellyOdds} onChangeText={(value) => updateCalc('kellyOdds', value)} />
          <ToolInput label="True Prob %" value={calcInputs.kellyProb} onChangeText={(value) => updateCalc('kellyProb', value)} />
        </View>
      )}
      {calculatorKey === 'parlay' && (
        <View style={styles.inputGrid}>
          <ToolInput label="Leg Odds" value={calcInputs.parlayLegs} onChangeText={(value) => updateCalc('parlayLegs', value)} wide />
          <ToolInput label="Stake" value={calcInputs.parlayStake} onChangeText={(value) => updateCalc('parlayStake', value)} />
        </View>
      )}
      {calculatorKey === 'hedge' && (
        <View style={styles.inputGrid}>
          <ToolInput label="Original Stake" value={calcInputs.hedgeStake} onChangeText={(value) => updateCalc('hedgeStake', value)} />
          <ToolInput label="Original Odds" value={calcInputs.hedgeOdds} onChangeText={(value) => updateCalc('hedgeOdds', value)} />
          <ToolInput label="Hedge Odds" value={calcInputs.hedgeOppOdds} onChangeText={(value) => updateCalc('hedgeOppOdds', value)} />
        </View>
      )}
      <View style={styles.resultBox}>
        {calculatorResult ? calculatorResult.map((item) => (
          <View key={item.label} style={styles.resultRow}>
            <AppText variant="muted">{item.label}</AppText>
            <AppText style={[styles.resultValue, item.tone ? { color: item.tone } : null]}>{item.value}</AppText>
          </View>
        )) : (
          <AppText variant="muted">Enter values to see the result.</AppText>
        )}
      </View>
    </Card>
  )

  return (
    <Screen>
      <AppText variant="title" style={styles.title}>TackleBox</AppText>
      <AppText variant="muted" style={styles.copy}>
        Tools for checking angles, running numbers, and organizing your betting research.
      </AppText>

      <View style={styles.segmentRow}>
        {TOOL_MODES.map((mode) => (
          <Pressable
            key={mode.key}
            onPress={() => {
              setToolMode(mode.key)
              setSelectedKey(null)
            }}
            style={[styles.segmentButton, toolMode === mode.key && styles.segmentButtonActive]}
          >
            <AppText style={[styles.segmentText, toolMode === mode.key && styles.segmentTextActive]}>{mode.label}</AppText>
          </Pressable>
        ))}
      </View>

      {toolMode === 'more' ? (
        <>
          <Pressable onPress={() => router.push('/fantasy' as any)} style={styles.featureTool}>
            <View style={styles.featureToolCopy}>
              <AppText variant="eyebrow">// Football Draft Room</AppText>
              <AppText style={styles.featureToolTitle}>Fantasy Hub</AppText>
            </View>
            <AppText style={styles.featureToolArrow}>Open</AppText>
          </Pressable>

          <Pressable onPress={() => router.push('/game-factors' as any)} style={styles.featureTool}>
            <View style={styles.featureToolCopy}>
              <AppText variant="eyebrow">// MLB + NFL</AppText>
              <AppText style={styles.featureToolTitle}>Game Factors</AppText>
            </View>
            <AppText style={styles.featureToolArrow}>Open</AppText>
          </Pressable>

          <Pressable onPress={() => router.push('/scout' as any)} style={styles.featureTool}>
            <View style={styles.featureToolCopy}>
              <AppText variant="eyebrow">// NFL Tracking Data</AppText>
              <AppText style={styles.featureToolTitle}>The Scout</AppText>
            </View>
            <AppText style={styles.featureToolArrow}>Open</AppText>
          </Pressable>

          <Pressable onPress={() => router.push('/grade-slip' as any)} style={styles.featureTool}>
            <View style={styles.featureToolCopy}>
              <AppText variant="eyebrow">// Slip Grader</AppText>
              <AppText style={styles.featureToolTitle}>Grade My Slip</AppText>
            </View>
            <AppText style={styles.featureToolArrow}>Open</AppText>
          </Pressable>

          <Pressable onPress={() => router.push('/value-finder' as any)} style={styles.featureTool}>
            <View style={styles.featureToolCopy}>
              <AppText variant="eyebrow">// All Sports</AppText>
              <AppText style={styles.featureToolTitle}>Game Lines</AppText>
            </View>
            <AppText style={styles.featureToolArrow}>Open</AppText>
          </Pressable>
        </>
      ) : toolMode === 'calculators' ? (
        <>
          <View style={styles.calculatorRows}>
            {[0, 2, 4].map((start) => {
              const row = CALCULATORS.slice(start, start + 2)
              return (
                <Fragment key={start}>
                  <View style={styles.calculatorTileRow}>
                    {row.map((calculator) => (
                      <Pressable
                        key={calculator.key}
                        onPress={() => setCalculatorKey(calculator.key)}
                        style={[styles.sheetTile, styles.calcTile, calculatorKey === calculator.key && styles.sheetTileActive]}
                      >
                        <AppText variant="eyebrow">// Tool</AppText>
                        <AppText style={[styles.sheetTileTitle, calculatorKey === calculator.key && styles.sheetTileTitleActive]}>{calculator.label}</AppText>
                        <AppText variant="muted" style={styles.sheetTileCopy} numberOfLines={3}>{calculator.desc}</AppText>
                      </Pressable>
                    ))}
                  </View>
                  {row.some((calculator) => calculator.key === calculatorKey) ? calculatorCard : null}
                </Fragment>
              )
            })}
          </View>
        </>
      ) : !hasOpenSheet ? (
        <>
          <View style={styles.sheetGrid}>
            {(canUseCheatSheets ? TOOL_TILES : []).map((sheet) => (
              <Pressable
                key={sheet.key}
                onPress={() => {
                  setSelectedKey(sheet.key)
                }}
                style={styles.sheetPickerTile}
              >
                <View style={styles.sheetPickerAccent} />
                <AppText style={styles.sheetSportLabel}>{sheet.sport}</AppText>
                <AppText style={styles.sheetPickerTitle} numberOfLines={2}>{sheet.label}</AppText>
              </Pressable>
            ))}
            {canUseCheatSheets ? (
              <Pressable
                key="stadium"
                onPress={() => router.push('/game-factors?view=cheat' as any)}
                style={styles.sheetPickerTile}
              >
                <View style={styles.sheetPickerAccent} />
                <AppText style={styles.sheetSportLabel}>MLB</AppText>
                <AppText style={styles.sheetPickerTitle} numberOfLines={2}>Stadium Cheat Sheet</AppText>
              </Pressable>
            ) : null}
          </View>
          {!canUseCheatSheets ? premiumToolsCard : null}
        </>
      ) : !canUseCheatSheets ? (
        premiumToolsCard
      ) : (
        <>
          <View style={styles.reportHeader}>
            <Pressable
              onPress={() => {
                setSelectedKey(null)
              }}
              style={styles.backButton}
            >
              <AppText style={styles.backButtonText}>All Sheets</AppText>
            </Pressable>
            <AppText variant="eyebrow">// Daily Board</AppText>
          </View>

          <Card>
            <View style={styles.reportTitleRow}>
              <View style={styles.reportTitleWrap}>
                <AppText variant="eyebrow">// {isTdSheet ? 'NFL' : activeSheet.label}</AppText>
                <AppText style={styles.reportTitle}>{activeSheet.label}</AppText>
              </View>
              {shareText ? (
                <Pressable onPress={shareSheet} style={styles.shareButton}>
                  <AppText style={styles.shareButtonText}>Copy</AppText>
                </Pressable>
              ) : null}
            </View>
            {!isTdSheet ? (
              <AppText style={styles.reportDate}>
                {activeKey === 'nrfi'
                  ? formatSavedAt(nrfiQuery.data?.published_at || nrfiQuery.data?.updated_at, nrfiQuery.data?.sheet_date)
                  : activeKey === 'topleans'
                  ? formatSavedAt(topLeansQuery.data?.published_at || topLeansQuery.data?.updated_at, topLeansQuery.data?.sheet_date)
                  : formatSavedAt(sheetQuery.data?.published_at || sheetQuery.data?.updated_at, sheetQuery.data?.sheet_date)}
              </AppText>
            ) : null}
            <AppText variant="muted" style={styles.reportCopy}>{activeSheet.desc}</AppText>

          {(activeKey === 'nrfi'
            ? nrfiQuery.isLoading
            : activeKey === 'topleans'
            ? topLeansQuery.isLoading
            : (sheetQuery.isLoading || lineupsQuery.isLoading || statsQuery.isLoading || scheduleQuery.isLoading || bvpQuery.isLoading || tdStreaksQuery.isLoading || qbTdStreaksQuery.isLoading || nflFantasyQuery.isLoading)) && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.gold} />
              <AppText variant="muted">Loading daily board...</AppText>
            </View>
          )}

          {activeKey === 'nrfi' && !nrfiQuery.isLoading && (
            nrfiRows.length === 0 ? (
              <AppText variant="muted" style={styles.errorText}>No games posted yet — check back closer to first pitch.</AppText>
            ) : (
              <>
                <View style={styles.reportRows}>
                  {nrfiRows.map((row, index) => {
                    const pct = (n: number | null) => (typeof n === 'number' ? `${Math.round(n * 100)}%` : '—')
                    const sp = (s: NrfiRow['away_pitcher_1st']) => (s ? `${s.runs}r/${s.starts}gs` : 'TBD')
                    const showEdge = row.lean?.edge != null && row.lean.strength !== 'pass' && row.lean.strength !== 'info'
                    return (
                      <View key={`${row.game_id}-${index}`} style={styles.reportRow}>
                        <View style={styles.rowMain}>
                          <AppText style={styles.compactPlayer} numberOfLines={1}>{row.away_abbr || row.away_team} @ {row.home_abbr || row.home_team}</AppText>
                          <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                            {row.away_pitcher} ({sp(row.away_pitcher_1st)}) · {row.home_pitcher} ({sp(row.home_pitcher_1st)})
                          </AppText>
                          <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                            Model NRFI {pct(row.model_nrfi_prob)} · Mkt {pct(row.market_nrfi_prob)}
                            {row.nrfi ? ` · NRFI ${row.nrfi.price > 0 ? '+' : ''}${row.nrfi.price}` : ''}
                            {row.yrfi ? ` · YRFI ${row.yrfi.price > 0 ? '+' : ''}${row.yrfi.price}` : ''}
                          </AppText>
                        </View>
                        <View style={styles.rowNumbers}>
                          <AppText style={[styles.compactEdge, { color: row.lean?.color || colors.textSecondary }]}>{row.lean?.label || '—'}</AppText>
                          <AppText style={styles.compactOdds}>{showEdge ? `+${Math.abs((row.lean.edge as number) * 100).toFixed(1)}%` : (row.park_read || '')}</AppText>
                        </View>
                      </View>
                    )
                  })}
                </View>
                <AppText variant="muted" style={styles.cardCopy}>
                  Model lean, not a guarantee. For entertainment only — please bet responsibly.
                </AppText>
              </>
            )
          )}

          {activeKey === 'topleans' && !topLeansQuery.isLoading && (
            topLeanProps.length === 0 && !topLeansData?.game_line ? (
              <AppText variant="muted" style={styles.errorText}>Today's board locks at 9:05 AM CT — check back then.</AppText>
            ) : (
              <>
                <View style={styles.reportRows}>
                  {topLeanProps.map((row, index) => (
                    <View key={`${row.player}-${index}`} style={styles.reportRow}>
                      <View style={styles.rowMain}>
                        <AppText style={styles.compactPlayer} numberOfLines={1}>#{index + 1} {row.player}</AppText>
                        <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                          {row.sport}{row.away_team && row.home_team ? ` · ${row.away_team} @ ${row.home_team}` : ''}
                        </AppText>
                        <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                          {row.market_label}{row.line != null ? ` O ${row.line}` : ''}{row.proj != null ? ` · Proj ${row.proj}` : ''}{row.grade ? ` · ${row.grade}` : ''}
                        </AppText>
                      </View>
                      <View style={styles.rowNumbers}>
                        <AppText style={[styles.compactEdge, { color: colors.gold }]}>{Math.round(row.edge_score)}</AppText>
                        <AppText style={styles.compactOdds}>{row.odds > 0 ? `+${row.odds}` : `${row.odds}`}</AppText>
                      </View>
                    </View>
                  ))}
                  {topLeansData?.game_line ? (
                    <View style={styles.reportRow}>
                      <View style={styles.rowMain}>
                        <AppText style={styles.compactPlayer} numberOfLines={1}>{topLeansData.game_line.side}</AppText>
                        <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                          {topLeansData.game_line.sport} · {topLeansData.game_line.away_team} @ {topLeansData.game_line.home_team}
                        </AppText>
                        <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                          KingFish {topLeansData.game_line.type} · {topLeansData.game_line.detail}
                        </AppText>
                      </View>
                      <View style={styles.rowNumbers}>
                        <AppText style={[styles.compactEdge, { color: colors.gold }]}>{topLeansData.game_line.type === 'Strong Lean' ? 'STRONG' : 'LEAN'}</AppText>
                        <AppText style={styles.compactOdds}>{topLeansData.game_line.odds > 0 ? `+${topLeansData.game_line.odds}` : `${topLeansData.game_line.odds}`}</AppText>
                      </View>
                    </View>
                  ) : null}
                </View>
                <AppText variant="muted" style={styles.cardCopy}>
                  Model lean, not a guarantee. For entertainment only — please bet responsibly.
                </AppText>
              </>
            )
          )}

          {(sheetQuery.isError || tdStreaksQuery.isError || qbTdStreaksQuery.isError || nflFantasyQuery.isError) && (
            <Card>
              <AppText variant="eyebrow">// Error</AppText>
              <AppText variant="muted" style={styles.errorText}>
                {sheetQuery.error instanceof Error
                  ? sheetQuery.error.message
                  : tdStreaksQuery.error instanceof Error
                    ? tdStreaksQuery.error.message
                  : qbTdStreaksQuery.error instanceof Error
                    ? qbTdStreaksQuery.error.message
                  : nflFantasyQuery.error instanceof Error
                    ? nflFantasyQuery.error.message
                    : 'Could not load this sheet.'}
              </AppText>
            </Card>
          )}

          {activeKey === 'td' && tdStreakRows.length > 0 && (
            <>
              <View style={styles.reportRows}>
                {tdStreakRows.slice(0, 30).map((row, index) => (
                  <View key={`${row.player}-${row.team}-${index}`} style={styles.reportRow}>
                    <View style={styles.rankBadge}>
                      <AppText style={styles.rankText}>{index + 1}</AppText>
                    </View>
                    <View style={styles.rowMain}>
                      <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
                      <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                        {row.team} · {row.position}
                      </AppText>
                    </View>
                    <View style={styles.rowNumbers}>
                      <AppText style={styles.compactEdge}>{row.streak_games}</AppText>
                      <AppText style={styles.compactOdds}>games</AppText>
                    </View>
                  </View>
                ))}
              </View>
              <AppText variant="muted" style={styles.cardCopy}>
                Rushing, receiving, return, and fumble-recovery touchdowns only. Passing touchdowns are excluded.
              </AppText>
            </>
          )}

          {activeKey === 'qbtd' && qbTdRows.length > 0 && (
            <>
              <View style={styles.reportRows}>
                {qbTdRows.slice(0, 30).map((row, index) => (
                  <View key={`${row.player}-${row.team}-${index}`} style={styles.reportRow}>
                    <View style={styles.rankBadge}>
                      <AppText style={styles.rankText}>{index + 1}</AppText>
                    </View>
                    <View style={styles.rowMain}>
                      <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
                      <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                        {row.team} · QB · {row.two_td_games}/{row.games} games
                      </AppText>
                    </View>
                    <View style={styles.rowNumbers}>
                      <AppText style={styles.compactEdgeLarge}>{row.streak_games}</AppText>
                    </View>
                  </View>
                ))}
              </View>
              <AppText variant="muted" style={styles.cardCopy}>
                Passing touchdowns only. Streak is consecutive recent regular-season games with 2+ passing TDs.
              </AppText>
            </>
          )}

          {activeKey === 'qb200' && qb200Rows.length > 0 && (
            <>
              <View style={styles.reportRows}>
                {qb200Rows.slice(0, 30).map((row, index) => (
                  <View key={`${row.player}-${row.team}-${index}`} style={styles.reportRow}>
                    <View style={styles.rankBadge}>
                      <AppText style={styles.rankText}>{index + 1}</AppText>
                    </View>
                    <View style={styles.rowMain}>
                      <AppText style={styles.compactPlayer} numberOfLines={1}>{row.player}</AppText>
                      <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                        {row.team} · 200+ · Last {row.l10Hits}/{Math.min(row.games, 10)}
                      </AppText>
                    </View>
                    <View style={styles.rowNumbers}>
                      <AppText style={styles.compactEdgeLarge}>{row.streak_games}</AppText>
                      <AppText style={styles.compactOdds}>streak</AppText>
                    </View>
                  </View>
                ))}
              </View>
              <AppText variant="muted" style={styles.cardCopy}>
                Passing yards only. Ranks quarterbacks by active 200+ yard streak, recent hit rate, and recent yardage form.
              </AppText>
            </>
          )}

          {activeKey === 'lines' && (
            <View style={styles.linePreview}>
              {sheetGames.slice(0, 3).map((game) => (
                <GameLineCard
                  key={game.id || game.game_id || `${game.away_team}-${game.home_team}`}
                  game={game}
                  sport="MLB"
                  weather={weatherQuery.data?.[game.id || game.game_id || '']}
                  mlbContext={{
                    teamAbbrMap: TEAM_NAME_TO_ABBR,
                    records: scheduleQuery.data?.teamRecords,
                    l10Map: mlbL10Query.data?.teamL10Map,
                    pitcherEraMap: scheduleQuery.data?.pitcherEraMap,
                  }}
                  onPressVenue={(game, weather) => setStadiumProfile(stadiumProfileForGameLine(game, weather, ballparkProfileQuery.data))}
                />
              ))}
            </View>
          )}

          {activeKey === 'bvp' && bvpRows.length > 0 && (
            <View style={styles.reportRows}>
              {bvpRows.slice(0, 30).map((row) => (
                <View key={row.key} style={styles.reportRow}>
                  <View style={styles.rowMain}>
                    <AppText
                      onPress={() => openPlayerProfile(row.player)}
                      style={[styles.compactPlayer, styles.profileLink]}
                      numberOfLines={1}
                    >
                      {row.player}
                    </AppText>
                    <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                      {row.gameLabel} · vs {row.pitcher}
                    </AppText>
                    <View style={styles.bvpMetricRow}>
                      <BvpMetric label="AB" value={String(row.ab)} />
                      <BvpMetric label="AVG" value={row.avg} tone={Number(row.avg) >= 0.300 ? colors.green : Number(row.avg) >= 0.200 ? colors.gold : colors.red} />
                      <BvpMetric label="HR" value={String(row.hr)} />
                      <BvpMetric label="RBI" value={String(row.rbi)} />
                      <BvpMetric label="OPS" value={row.ops} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {activeKey !== 'lines' && activeKey !== 'bvp' && activeKey !== 'td' && activeKey !== 'qbtd' && activeKey !== 'qb200' && rows.length > 0 && (
            <View style={styles.reportRows}>
              {(activeKey === 'hits' ? rows : rows.slice(0, 10)).map((row, index) => row.divider ? (
                <View key={`divider-${row.label}-${index}`} style={styles.reportDivider}>
                  <AppText variant="eyebrow" style={styles.reportDividerText}>{row.label}</AppText>
                </View>
              ) : (
                <View key={`${row.player}-${row.line}-${index}`} style={styles.reportRow}>
                  <View style={styles.rankBadge}>
                    <AppText style={styles.rankText}>{row.pickLabel?.startsWith('Under') ? 'F' : index + 1}</AppText>
                  </View>
                  <View style={styles.rowMain}>
                    <AppText
                      onPress={() => openPlayerProfile(row.player, row)}
                      style={[styles.compactPlayer, styles.profileLink]}
                      numberOfLines={1}
                    >
                      {row.player}
                    </AppText>
                    <AppText variant="mono" style={styles.compactMeta} numberOfLines={1}>
                      {row.matchup}
                    </AppText>
                    {(activeKey === 'k' || row.pickLabel) && (
                      <AppText style={styles.pickLine}>{row.pickLabel || `Over ${row.line} Strikeouts`}</AppText>
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

          {activeKey === 'bvp' && !sheetQuery.isLoading && !lineupsQuery.isLoading && !scheduleQuery.isLoading && !bvpQuery.isLoading && sheetGames.length > 0 && bvpRows.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No Batter vs Pitcher matchups are available for today's probable starters yet.
            </AppText>
          )}

          {activeKey === 'td' && !tdStreaksQuery.isLoading && !tdStreaksQuery.isError && tdStreakRows.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No NFL touchdown streak rows are available yet.
            </AppText>
          )}

          {activeKey === 'qbtd' && !qbTdStreaksQuery.isLoading && !qbTdStreaksQuery.isError && qbTdRows.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No NFL QB 2+ TD streak rows are available yet.
            </AppText>
          )}

          {activeKey === 'qb200' && !nflFantasyQuery.isLoading && !nflFantasyQuery.isError && qb200Rows.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No NFL QB 200+ yard rows are available yet.
            </AppText>
          )}

          {activeKey !== 'td' && activeKey !== 'qbtd' && activeKey !== 'qb200' && activeKey !== 'nrfi' && activeKey !== 'topleans' && !sheetQuery.isLoading && sheetGames.length === 0 && (
            <AppText variant="muted" style={styles.cardCopy}>
              No MLB markets were available when this daily board was saved.
            </AppText>
          )}

          <PlayerProfileModal
            playerName={selectedPlayer}
            sport="mlb"
            marketContext={selectedMarketContext}
            onClose={() => {
              setSelectedPlayer(null)
              setSelectedMarketContext(null)
            }}
          />
          </Card>
        </>
      )}
      <Modal visible={Boolean(stadiumProfile)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setStadiumProfile(null)}>
        <View style={styles.stadiumModal}>
          <Card style={styles.stadiumCard}>
            <AppText variant="eyebrow">// Stadium Profile</AppText>
            <AppText style={styles.stadiumTitle}>{stadiumProfile?.venue}</AppText>
            <AppText variant="muted" style={styles.stadiumTeam}>{stadiumProfile?.teamLabel || stadiumProfile?.homeTeam}</AppText>
            {stadiumProfile?.city ? <AppText variant="muted" style={styles.stadiumCity}>{stadiumProfile.city}</AppText> : null}
            {stadiumProfile?.sport === 'MLB' ? (
              <AppText variant="muted" style={styles.stadiumRecord}>Home record: {stadiumProfile?.homeRecord || 'Pending'}</AppText>
            ) : null}
            <View style={styles.stadiumGrid}>
              <FactorMetric label={stadiumProfile?.sport === 'NFL' ? 'Stadium Grade' : 'Park Grade'} value={String(stadiumProfile?.score || '-')} tone={colors.gold} large />
              <FactorMetric label="Surface" value={shortSurface(stadiumProfile?.surface)} />
              <FactorMetric label="Market" value={stadiumProfile?.market || '-'} />
              <FactorMetric label="Capacity" value={stadiumProfile?.capacity || '-'} />
              <FactorMetric label="Altitude" value={stadiumProfile?.altitudeFt ? `${stadiumProfile.altitudeFt} ft` : '-'} />
              <FactorMetric label={stadiumProfile?.sport === 'NFL' ? 'Roof Status' : 'Roof'} value={stadiumProfile?.roofStatus || stadiumProfile?.roof || '-'} />
              {stadiumProfile?.sport === 'NFL' ? (
                <>
                  <FactorMetric label="Wind Impact" value={stadiumProfile?.windImpact || '-'} />
                  <FactorMetric label="Weather Exposure" value={stadiumProfile?.weatherExposure || '-'} />
                </>
              ) : (
                <FactorMetric label="Wind Today" value={stadiumProfile?.wind || 'Pending'} wide visual={<WindArrow value={stadiumProfile?.wind || ''} />} />
              )}
            </View>
            {stadiumProfile?.weather ? <AppText variant="muted" style={styles.stadiumWeather}>{stadiumProfile.weather}</AppText> : null}
            <AppText style={styles.stadiumBlurb}>{stadiumProfile?.blurb}</AppText>
            <Button onPress={() => setStadiumProfile(null)}>Close</Button>
          </Card>
        </View>
      </Modal>
    </Screen>
  )
}

function ToolInput({ label, value, onChangeText, wide = false }: { label: string; value: string; onChangeText: (value: string) => void; wide?: boolean }) {
  return (
    <View style={[styles.toolInputWrap, wide && styles.toolInputWide]}>
      <AppText variant="eyebrow">{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numbers-and-punctuation"
        placeholderTextColor={colors.textMuted}
        style={styles.toolInput}
      />
    </View>
  )
}

function BvpMetric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.bvpMetric}>
      <AppText variant="mono" style={styles.bvpMetricLabel}>{label}</AppText>
      <AppText style={[styles.bvpMetricValue, tone ? { color: tone } : null]}>{value}</AppText>
    </View>
  )
}

export function FactorMeta({ label, value, sub, visual, onPress }: { label: string; value: string; sub?: string; visual?: ReactNode; onPress?: () => void }) {
  const cleanSub = isNeutralFactorText(sub) ? '' : sub
  const content = (
    <>
      <AppText variant="mono" style={styles.factorMetaLabel}>{label}</AppText>
      {visual}
      <AppText style={[styles.factorMetaValue, onPress ? styles.factorMetaLink : null]}>{value}</AppText>
      {cleanSub ? <AppText variant="muted" style={styles.factorMetaSub}>{cleanSub}</AppText> : null}
    </>
  )
  if (onPress) {
    return (
      <Pressable style={styles.factorMeta} onPress={onPress}>
        {content}
      </Pressable>
    )
  }
  return (
    <View style={styles.factorMeta}>
      {content}
    </View>
  )
}

export function shortSurface(surface?: string) {
  if (!surface) return '-'
  return surface.replace('Artificial Turf', 'Turf').replace('Natural Grass', 'Grass')
}

function windDirectionFromLabel(value?: string) {
  const match = String(value || '').match(/\b(N|NE|E|SE|S|SW|W|NW)\b/)
  return match?.[1] || ''
}

function windArrow(direction: string) {
  const arrows: Record<string, string> = { N: '↑', NE: '↗', E: '→', SE: '↘', S: '↓', SW: '↙', W: '←', NW: '↖' }
  return arrows[direction] || ''
}

export function WindArrow({ value }: { value: string }) {
  const direction = windDirectionFromLabel(value)
  if (!direction) return null

  return (
    <View style={styles.windArrowWrap}>
      <AppText style={styles.windArrowGlyph}>{windArrow(direction)}</AppText>
      <View style={styles.windArrowTrails}>
        <View style={styles.windArrowTrail} />
        <View style={[styles.windArrowTrail, styles.windArrowTrailShort]} />
      </View>
    </View>
  )
}

export function FactorMetric({ label, value, tone, wide = false, large = false, visual }: { label: string; value: string; tone?: string; wide?: boolean; large?: boolean; visual?: ReactNode }) {
  return (
    <View style={[styles.factorMetric, wide && styles.factorMetricWide]}>
      <AppText variant="mono" style={styles.factorMetaLabel}>{label}</AppText>
      <View style={visual ? styles.factorMetricValueRow : null}>
        {visual}
        <AppText style={[styles.factorMetricValue, visual ? styles.factorMetricValueInline : null, large ? styles.factorMetricValueLarge : null, tone ? { color: tone } : null]}>{value}</AppText>
      </View>
    </View>
  )
}

export function FactorWeatherVisual({ weather }: { weather?: any }) {
  const sky = cleanSkyLabel(weather?.sky)
  const wind = weather?.windStr || ''
  const rain = Number(weather?.precipPct || 0)
  const skyTone = weather?.indoor
    ? colors.gold
    : /rain|storm|drizzle/i.test(sky)
      ? '#4DB8FF'
      : /cloud/i.test(sky)
        ? colors.textSecondary
        : '#F6D36F'
  return (
    <View style={styles.weatherVisual}>
      <View style={[styles.weatherIcon, { borderColor: skyTone }]}>
        {weather?.indoor ? (
          <View style={styles.roofIcon}>
            <View style={styles.roofLine} />
            <View style={styles.roofLine} />
            <View style={styles.roofLine} />
          </View>
        ) : /rain|storm|drizzle/i.test(sky) ? (
          <View style={styles.rainIcon}>
            <View style={styles.cloudShape} />
            <View style={styles.rainDrops} />
          </View>
        ) : /cloud/i.test(sky) ? (
          <View style={styles.cloudIcon}>
            <View style={styles.cloudShape} />
          </View>
        ) : (
          <View style={styles.sunIcon} />
        )}
      </View>
      {typeof weather?.tempF === 'number' ? (
        <View style={[styles.thermoIcon, weather.tempF >= 80 && styles.thermoHot, weather.tempF <= 55 && styles.thermoCold]}>
          <View style={styles.thermoStem} />
          <View style={styles.thermoBulb} />
        </View>
      ) : null}
      {wind ? (
        <View style={[styles.windIcon, weather?.windImpact === 'suppress' && styles.windIconRisk]}>
          <View style={styles.windLine} />
          <View style={[styles.windLine, styles.windLineShort]} />
        </View>
      ) : null}
      {rain >= 25 ? <View style={styles.rainRiskIcon} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  title: { marginTop: 8 },
  copy: { marginTop: 10, marginBottom: spacing.xl },
  cardTitle: { marginTop: 8, fontSize: 22, fontWeight: '900' },
  cardCopy: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: 4,
    marginBottom: spacing.xl,
  },
  segmentButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
  },
  segmentButtonActive: {
    backgroundColor: colors.gold,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: colors.bgPrimary,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  calculatorRows: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  calculatorTileRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  featureTool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.34)',
    borderRadius: 8,
    backgroundColor: 'rgba(198,145,50,.08)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  featureToolCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureToolTitle: {
    marginTop: 4,
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '900',
  },
  featureToolText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  featureToolArrow: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionEyebrowRow: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  sectionDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  sheetTile: {
    width: '47%',
    minHeight: 126,
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
  sheetTileCenter: { flex: 1, justifyContent: 'center' },
  sheetTileTitle: { color: colors.textPrimary, fontWeight: '900', fontSize: 20, lineHeight: 23 },
  sheetTileTitleActive: { color: colors.gold },
  sheetTileCopy: { marginTop: spacing.sm, fontSize: 12, lineHeight: 16 },
  sheetPickerTile: {
    width: '47%',
    minHeight: 104,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
  },
  sheetPickerAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(198,145,50,.7)',
  },
  sheetSportLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  sheetPickerTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    lineHeight: 22,
    fontWeight: '900',
  },
  calcTile: { minHeight: 134 },
  inlineCalculatorCard: {
    width: '100%',
  },
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  toolInputWrap: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  toolInputWide: { width: '100%' },
  toolInput: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 8,
  },
  resultBox: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  resultValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  factorToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  factorToggleButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCardAlt,
  },
  factorToggleButtonActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  factorViewToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  factorViewButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  factorViewButtonActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(198,145,50,.14)',
  },
  factorViewText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },
  factorViewTextActive: {
    color: colors.textPrimary,
  },
  factorCheatSheet: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cheatSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  cheatSheetHeadCell: {
    width: 54,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'right',
  },
  cheatSheetGameHead: {
    flex: 1,
    width: undefined,
    textAlign: 'left',
  },
  cheatSheetRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(28,35,56,.75)',
    paddingVertical: spacing.md,
  },
  cheatSheetGameCell: {
    flex: 1,
    minWidth: 0,
  },
  cheatSheetMatchup: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  cheatSheetMeta: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
  },
  cheatSheetWeather: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 13,
  },
  cheatSheetMetric: {
    width: 54,
    textAlign: 'right',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
  },
  cheatSheetRead: {
    width: 54,
    textAlign: 'right',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  factorRows: {
    gap: spacing.md,
  },
  factorCard: {
    gap: spacing.sm,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  factorTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  factorMatchup: {
    color: colors.textPrimary,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  factorScore: {
    alignItems: 'flex-end',
    minWidth: 86,
  },
  factorScoreLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
  },
  factorScoreValue: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '900',
  },
  factorLean: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  factorMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  factorMeta: {
    width: '48%',
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.sm,
  },
  factorMetaLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  factorMetaValue: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  factorMetaLink: {
    color: colors.textPrimary,
  },
  factorMetaSub: {
    marginTop: 4,
    fontSize: 12,
  },
  factorTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  factorTag: {
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.3)',
    borderRadius: 6,
    backgroundColor: 'rgba(198,145,50,.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  factorTagText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  weatherVisual: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  weatherIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(122,128,153,.08)',
  },
  cloudIcon: {
    width: 18,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rainIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
  },
  cloudShape: {
    width: 16,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.textSecondary,
  },
  rainDrops: {
    width: 14,
    height: 5,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#4DB8FF',
    marginTop: 2,
  },
  sunIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F6D36F',
  },
  roofIcon: {
    gap: 3,
  },
  roofLine: {
    width: 14,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  thermoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(122,128,153,.22)',
    backgroundColor: 'rgba(122,128,153,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thermoHot: {
    borderColor: 'rgba(232,175,60,.36)',
    backgroundColor: 'rgba(232,175,60,.1)',
  },
  thermoCold: {
    borderColor: 'rgba(77,184,255,.35)',
    backgroundColor: 'rgba(77,184,255,.1)',
  },
  thermoStem: {
    width: 5,
    height: 13,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.goldLight,
  },
  thermoBulb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.goldLight,
    marginTop: -3,
  },
  windIcon: {
    width: 38,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(122,128,153,.22)',
    backgroundColor: 'rgba(122,128,153,.08)',
    justifyContent: 'center',
    paddingHorizontal: 7,
    gap: 4,
  },
  windIconRisk: {
    borderColor: 'rgba(239,68,68,.35)',
    backgroundColor: 'rgba(239,68,68,.1)',
  },
  windLine: {
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
  },
  windLineShort: {
    width: 16,
  },
  rainRiskIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(77,184,255,.35)',
    backgroundColor: 'rgba(77,184,255,.1)',
  },
  cheatMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  factorMetric: {
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    padding: spacing.md,
  },
  factorMetricWide: {
    flexBasis: '100%',
  },
  factorMetricValueRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  factorMetricValue: {
    marginTop: 6,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
  },
  factorMetricValueInline: {
    marginTop: 0,
  },
  windArrowWrap: {
    width: 58,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
  },
  windArrowGlyph: {
    color: colors.gold,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900',
  },
  windArrowTrails: {
    marginLeft: -2,
    gap: 4,
  },
  windArrowTrail: {
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(198,145,50,.5)',
  },
  windArrowTrailShort: {
    width: 11,
  },
  factorMetricValueLarge: {
    fontSize: 32,
    lineHeight: 34,
  },
  stadiumModal: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  stadiumCard: {
    gap: spacing.md,
  },
  stadiumTitle: {
    color: colors.textPrimary,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  stadiumTeam: {
    marginTop: -spacing.sm,
  },
  stadiumCity: {
    marginTop: -spacing.md,
  },
  stadiumRecord: {
    marginTop: -spacing.md,
    color: colors.gold,
  },
  stadiumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stadiumWeather: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  stadiumBlurb: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    backgroundColor: colors.bgCardAlt,
  },
  backButtonText: { color: colors.gold, fontWeight: '900' },
  reportTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  reportTitleWrap: { flex: 1, minWidth: 0 },
  reportTitle: { marginTop: 4, fontSize: 28, lineHeight: 31, fontWeight: '900' },
  reportDate: { color: colors.textSecondary, fontWeight: '900', lineHeight: 18, fontSize: 12, marginTop: spacing.sm },
  shareButton: { borderWidth: 1, borderColor: 'rgba(198,145,50,.38)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7, marginTop: 2 },
  shareButtonText: { color: colors.gold, fontSize: 10, fontWeight: '900' },
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
  reportDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  reportDividerText: {
    color: colors.gold,
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
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
    borderRadius: 6,
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
  compactEdgeLarge: { fontSize: 34, lineHeight: 38, fontWeight: '900' },
  compactOdds: { marginTop: 2, color: colors.gold, fontSize: 12, fontWeight: '900' },
  profileLink: { color: colors.gold },
  bvpMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bvpMetric: {
    minWidth: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bvpMetricLabel: {
    color: colors.textMuted,
    fontSize: 10,
  },
  bvpMetricValue: {
    marginTop: 2,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900',
  },
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
