import { Pressable, StyleSheet, View } from 'react-native'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { fmtOdds, fmtTime } from '@/lib/format'
import { displayBookName, supportedBookmakers, type SportsbookPreferences } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Bookmaker, Game, Market, Outcome, Sport, WeatherInfo } from '@/types'

type MlbLineContext = {
  teamAbbrMap?: Record<string, string>
  records?: Record<string, { wins: number; losses: number; pct: number }>
  l10Map?: Record<string, { wins: number; losses: number; winPct: number; avgTotal: number }>
  pitcherEraMap?: Record<string, number>
}

type TeamFormLineContext = {
  awayForm?: Record<string, any>
  homeForm?: Record<string, any>
}

type NflLineContext = {
  teamAbbrMap?: Record<string, string>
  teamStatsMap?: Record<string, { powerScore?: number }>
}

type NcaafLineContext = {
  teams?: Array<{
    rank?: number
    team: string
    lastRecord?: string
    currentRecord?: string
    schedule?: string
    lean?: string
    profile?: string
    offense?: string
    defense?: string
    offenseRank?: number
    defenseRank?: number
    pointsForPerGame?: number
    pointsAllowedPerGame?: number
    lastGameTotal?: number
  }>
}

type SoccerLineContext = {
  awayInfo?: Record<string, any>
  homeInfo?: Record<string, any>
  isTournament?: boolean
}

type LeanResult = {
  label: string
  detail: string
  price?: number
  book?: string
  type?: string
  team?: string
}

const COUNTRY_CODES: Record<string, string> = {
  Algeria: 'DZ', Argentina: 'AR', Australia: 'AU', Austria: 'AT', Belgium: 'BE',
  'Bosnia & Herzegovina': 'BA', 'Bosnia and Herzegovina': 'BA', 'Bosnia-H.': 'BA', Brazil: 'BR',
  Cameroon: 'CM', Canada: 'CA', 'Cape Verde': 'CV', Chile: 'CL', China: 'CN',
  Colombia: 'CO', 'Costa Rica': 'CR', Croatia: 'HR', Curacao: 'CW',
  Curaçao: 'CW', Czechia: 'CZ', 'Czech Republic': 'CZ', Denmark: 'DK', 'Congo DR': 'CD', 'DR Congo': 'CD',
  Ecuador: 'EC', Egypt: 'EG', England: 'GB', France: 'FR', Germany: 'DE',
  Ghana: 'GH', Greece: 'GR', Haiti: 'HT', Iran: 'IR', Iraq: 'IQ',
  Italy: 'IT', 'Ivory Coast': 'CI', Jamaica: 'JM', Japan: 'JP', Jordan: 'JO',
  Mexico: 'MX', Morocco: 'MA', Netherlands: 'NL', 'New Zealand': 'NZ',
  Nigeria: 'NG', Norway: 'NO', Panama: 'PA', Paraguay: 'PY', Peru: 'PE',
  Poland: 'PL', Portugal: 'PT',
  Qatar: 'QA', 'Saudi Arabia': 'SA', Scotland: 'GB', Senegal: 'SN', Serbia: 'RS',
  'South Africa': 'ZA', 'South Korea': 'KR', Spain: 'ES', Sweden: 'SE',
  Switzerland: 'CH', Tunisia: 'TN', Turkey: 'TR', Ukraine: 'UA',
  Uzbekistan: 'UZ', 'United States': 'US', USA: 'US', Uruguay: 'UY', Wales: 'GB',
}

function flagEmoji(country: string) {
  const code = COUNTRY_CODES[country]
  if (!code) return ''
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

function tournamentTeamLabel(team: string, enabled?: boolean) {
  if (!enabled || team === 'Draw') return team
  const flag = flagEmoji(team)
  return flag ? `${flag} ${team}` : team
}

function getMarket(bookmakers: Bookmaker[], key: string): Market | undefined {
  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets?.find((item) => item.key === key)
    if (market) return market
  }
  return undefined
}

function findOutcome(market: Market | undefined, name: string): Outcome | undefined {
  return market?.outcomes?.find((outcome) => outcome.name === name)
}

function bestMoneyline(bookmakers: Bookmaker[], team: string) {
  let best: { price: number; book: string } | null = null

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets?.find((item) => item.key === 'h2h')
    const outcome = market?.outcomes?.find((item) => item.name === team)
    if (!outcome || typeof outcome.price !== 'number') continue

    if (!best || outcome.price > best.price) {
      best = { price: outcome.price, book: displayBookName(bookmaker.key, bookmaker.title) }
    }
  }

  return best
}

function bestMarketOutcome(bookmakers: Bookmaker[], marketKey: string, outcomeName: string) {
  let best: { price: number; book: string } | null = null

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets?.find((item) => item.key === marketKey)
    const outcome = market?.outcomes?.find((item) => item.name === outcomeName)
    if (!outcome || typeof outcome.price !== 'number') continue

    if (!best || outcome.price > best.price) {
      best = { price: outcome.price, book: displayBookName(bookmaker.key, bookmaker.title) }
    }
  }

  return best
}

function impliedProbability(price?: number) {
  if (typeof price !== 'number' || price === 0) return null
  return price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100)
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value))
}

function shortTeamName(team: string) {
  const pieces = team.split(' ').filter(Boolean)
  return pieces[pieces.length - 1] || team
}

function ncaafProgramName(team: string) {
  const overrides: Record<string, string> = {
    'TCU Horned Frogs': 'TCU',
    'North Carolina Tar Heels': 'North Carolina',
  }
  if (overrides[team]) return overrides[team]
  return team.replace(/ University$/i, '').replace(/ College$/i, '')
}

function consensusMoneylineLean(bookmakers: Bookmaker[], game: Game, sport?: Sport): LeanResult | null {
  const totals: Record<string, number[]> = {}

  bookmakers.forEach((bookmaker) => {
    const market = bookmaker.markets?.find((item) => item.key === 'h2h')
    const priced = market?.outcomes
      ?.map((outcome) => {
        const implied = impliedProbability(outcome.price)
        return implied === null ? null : { name: outcome.name, implied }
      })
      .filter(Boolean) as Array<{ name: string; implied: number }>
    const total = priced?.reduce((sum, outcome) => sum + outcome.implied, 0)
    if (!priced?.length || !total) return

    priced.forEach((outcome) => {
      totals[outcome.name] = [...(totals[outcome.name] || []), outcome.implied / total]
    })
  })

  const ranked = Object.entries(totals)
    .map(([name, values]) => ({
      name,
      probability: values.reduce((sum, value) => sum + value, 0) / values.length,
      books: values.length,
    }))
    .filter((item) => item.books >= 2)
    .sort((a, b) => b.probability - a.probability)

  const top = ranked[0]
  const next = ranked[1]
  if (!top || !next || top.probability - next.probability < 0.03) return null

  const best =
    top.name === game.away_team
      ? bestMoneyline(bookmakers, game.away_team)
      : top.name === game.home_team
        ? bestMoneyline(bookmakers, game.home_team)
        : bestMoneyline(bookmakers, top.name)

  return {
    label: `${sport === 'NCAAF' ? ncaafProgramName(top.name) : shortTeamName(top.name)} ML`,
    detail: `Books lean this side across ${top.books} prices. Best number shown.`,
    price: best?.price,
    book: best?.book,
    team: top.name,
  }
}

function mlScoreType(diff: number) {
  if (diff >= 10) return 'Strong Lean'
  if (diff >= 4) return 'Lean'
  return 'Price Watch'
}

function moneylineScoreDetail(score: number, otherScore: number) {
  return `KingFish edge grade ${score}-${otherScore}.`
}

function totalReadDetail(read: number | string, postedTotal: number | string) {
  return `KingFish total read ${read} vs ${postedTotal}.`
}

function mlbTeamScore(
  line: { price: number } | null,
  ctx: { isHome: boolean; record?: { pct?: number }; l10?: { winPct?: number }; starterEra?: number },
) {
  const market = line ? (impliedProbability(line.price) || 0.5) * 100 : 50
  const record = Number.isFinite(Number(ctx.record?.pct)) ? Number(ctx.record?.pct) * 100 : 50
  const recent = Number.isFinite(Number(ctx.l10?.winPct)) ? Number(ctx.l10?.winPct) * 100 : record
  const starterEra = Number(ctx.starterEra)
  const starter = Number.isFinite(starterEra) && starterEra > 0 ? clampScore(100 - ((starterEra - 2.5) * 18)) : 50
  const venue = ctx.isHome ? 55 : 49
  return clampScore((market * 0.3) + (record * 0.22) + (recent * 0.2) + (starter * 0.18) + (venue * 0.1))
}

function mlbAbbr(team: string, context?: MlbLineContext) {
  return context?.teamAbbrMap?.[team] || team
}

function mlbMoneylineLean(
  game: Game,
  awayMoneyline: { book: string; price: number } | null,
  homeMoneyline: { book: string; price: number } | null,
  context?: MlbLineContext,
): LeanResult | null {
  if (!awayMoneyline || !homeMoneyline) return null
  const awayAbbr = mlbAbbr(game.away_team, context)
  const homeAbbr = mlbAbbr(game.home_team, context)
  const awayScore = mlbTeamScore(awayMoneyline, {
    isHome: false,
    record: context?.records?.[awayAbbr],
    l10: context?.l10Map?.[awayAbbr],
    starterEra: context?.pitcherEraMap?.[awayAbbr],
  })
  const homeScore = mlbTeamScore(homeMoneyline, {
    isHome: true,
    record: context?.records?.[homeAbbr],
    l10: context?.l10Map?.[homeAbbr],
    starterEra: context?.pitcherEraMap?.[homeAbbr],
  })
  const homeLean = homeScore >= awayScore
  const diff = Math.abs(homeScore - awayScore)
  const score = Math.round(homeLean ? homeScore : awayScore)
  const otherScore = Math.round(homeLean ? awayScore : homeScore)
  const best = homeLean ? homeMoneyline : awayMoneyline
  return {
    label: homeLean ? game.home_team : game.away_team,
    detail: moneylineScoreDetail(score, otherScore),
    price: best.price,
    book: best.book,
    type: mlScoreType(diff),
    team: homeLean ? game.home_team : game.away_team,
  }
}

function consensusTotalLean(bookmakers: Bookmaker[], weather?: WeatherInfo, showNeutralWatch = false): LeanResult | null {
  const rows: Array<{ over: number; under: number; point: number; overPrice: number; underPrice: number; book: string }> = []

  bookmakers.forEach((bookmaker) => {
    const market = bookmaker.markets?.find((item) => item.key === 'totals')
    const over = market?.outcomes?.find((outcome) => outcome.name === 'Over')
    const under = market?.outcomes?.find((outcome) => outcome.name === 'Under')
    const overImp = impliedProbability(over?.price)
    const underImp = impliedProbability(under?.price)
    if (!over || !under || overImp === null || underImp === null || typeof over.point !== 'number') return

    const total = overImp + underImp
    if (!total) return
    rows.push({
      over: overImp / total,
      under: underImp / total,
      point: over.point,
      overPrice: over.price,
      underPrice: under.price,
      book: displayBookName(bookmaker.key, bookmaker.title),
    })
  })

  if (rows.length < 2) return null

  const overProb = rows.reduce((sum, row) => sum + row.over, 0) / rows.length
  const underProb = rows.reduce((sum, row) => sum + row.under, 0) / rows.length
  const avgPoint = rows.reduce((sum, row) => sum + row.point, 0) / rows.length
  let leanOver = overProb >= underProb
  let edge = Math.abs(overProb - underProb)

  if (weather?.windImpact === 'boost') {
    leanOver = true
    edge = Math.max(edge, 0.04)
  } else if (weather?.windImpact === 'suppress') {
    leanOver = false
    edge = Math.max(edge, 0.04)
  }

  if (edge < 0.03) {
    if (!showNeutralWatch) return null
    return {
      label: `Near ${Number(avgPoint.toFixed(1))}`,
      detail: `Books are balanced on this total across ${rows.length} prices.`,
    }
  }

  const best = rows
    .map((row) => ({ price: leanOver ? row.overPrice : row.underPrice, book: row.book }))
    .sort((a, b) => b.price - a.price)[0]
  const side = leanOver ? 'Over' : 'Under'

  return {
    label: `${side} ${Number(avgPoint.toFixed(1))}`,
    detail: weather?.windImpact === 'boost' || weather?.windImpact === 'suppress'
      ? `${weather.windStr} adds ${leanOver ? 'over' : 'under'} context to the market price.`
      : `Books lean ${side.toLowerCase()} across ${rows.length} prices. Best number shown.`,
    price: best?.price,
    book: best?.book,
  }
}

function mlbTotalLean(
  game: Game,
  over: Outcome | undefined,
  under: Outcome | undefined,
  bookmakers: Bookmaker[],
  context?: MlbLineContext,
): LeanResult | null {
  if (!over || !under || typeof over.point !== 'number') return null
  const awayAbbr = mlbAbbr(game.away_team, context)
  const homeAbbr = mlbAbbr(game.home_team, context)
  const recentTotals = [context?.l10Map?.[awayAbbr]?.avgTotal, context?.l10Map?.[homeAbbr]?.avgTotal]
    .filter((value): value is number => Number.isFinite(Number(value)) && Number(value) > 0)
  if (recentTotals.length === 0) return null
  const eras = [context?.pitcherEraMap?.[awayAbbr], context?.pitcherEraMap?.[homeAbbr]]
    .filter((value): value is number => Number.isFinite(Number(value)) && Number(value) > 0)
  const recentAvg = recentTotals.reduce((sum, value) => sum + value, 0) / recentTotals.length
  const eraAvg = eras.length ? eras.reduce((sum, value) => sum + value, 0) / eras.length : 4.2
  const projection = Math.max(5.5, Math.min(13.5, recentAvg + ((eraAvg - 4.2) * 0.6)))
  const diff = projection - over.point
  const leanOver = diff >= 0
  const best = bookmakers
    .map((bookmaker) => {
      const market = bookmaker.markets?.find((item) => item.key === 'totals')
      const outcome = market?.outcomes?.find((item) => item.name === (leanOver ? 'Over' : 'Under'))
      return outcome && typeof outcome.price === 'number'
        ? { price: outcome.price, book: displayBookName(bookmaker.key, bookmaker.title) }
        : null
    })
    .filter((item): item is { price: number; book: string } => Boolean(item))
    .sort((a, b) => b.price - a.price)[0]
  return {
    label: Math.abs(diff) >= 0.35 ? `${leanOver ? 'Over' : 'Under'} ${over.point}` : `Near ${over.point}`,
    detail: totalReadDetail(projection.toFixed(1), over.point),
    price: best?.price,
    book: best?.book,
    type: Math.abs(diff) >= 1 ? 'Strong Total Lean' : Math.abs(diff) >= 0.35 ? 'Total Lean' : 'Total Watch',
  }
}

function basketballFormScore(form: Record<string, any> | undefined, isHome: boolean) {
  if (!form?.games) return isHome ? 52 : 50
  const games = Math.max(1, Number(form.games || 1))
  const winPct = Number.isFinite(Number(form.wins)) ? (Number(form.wins || 0) / games) * 100 : 50
  const l10Net = Number(form.l10For || 0) - Number(form.l10Against || 0)
  const l5Net = Number(form.l5For || form.l10For || 0) - Number(form.l5Against || form.l10Against || 0)
  const netScore = clampScore(50 + (l10Net * 2.5))
  const recentScore = clampScore(50 + (l5Net * 2.8))
  return clampScore((winPct * 0.35) + (netScore * 0.35) + (recentScore * 0.2) + ((isHome ? 55 : 49) * 0.1))
}

function nhlFormScore(form: Record<string, any> | undefined, isHome: boolean) {
  if (!form?.games && !form?.pointPctg) return isHome ? 52 : 50
  const pointPct = Number.isFinite(Number(form.pointPctg)) ? Number(form.pointPctg) * 100 : 50
  const l10Games = Number(form.l10Games || 0)
  const l10Pct = l10Games > 0
    ? ((Number(form.l10Wins || 0) + (Number(form.l10OtLosses || 0) * 0.5)) / l10Games) * 100
    : pointPct
  const gf = Number(form.l10GoalsForPerGame || form.goalsForPerGame || 0)
  const ga = Number(form.l10GoalsAgainstPerGame || form.goalsAgainstPerGame || 0)
  const goalDiffScore = gf || ga ? clampScore(50 + ((gf - ga) * 12)) : 50
  return clampScore((pointPct * 0.32) + (l10Pct * 0.28) + (goalDiffScore * 0.28) + ((isHome ? 55 : 49) * 0.12))
}

function teamFormMoneylineLean(
  sport: Sport | undefined,
  game: Game,
  awayMoneyline: { book: string; price: number } | null,
  homeMoneyline: { book: string; price: number } | null,
  context?: TeamFormLineContext,
): LeanResult | null {
  if (!awayMoneyline || !homeMoneyline) return null
  const awayProb = impliedProbability(awayMoneyline.price) || 0.5
  const homeProb = impliedProbability(homeMoneyline.price) || 0.5
  const formScore = sport === 'NHL' ? nhlFormScore : basketballFormScore
  const marketWeight = sport === 'NHL' ? 0.4 : 0.42
  const formWeight = sport === 'NHL' ? 0.6 : 0.58
  const awayScore = clampScore((awayProb * 100 * marketWeight) + (formScore(context?.awayForm, false) * formWeight))
  const homeScore = clampScore((homeProb * 100 * marketWeight) + (formScore(context?.homeForm, true) * formWeight))
  const awayLean = awayScore >= homeScore
  const diff = Math.abs(awayScore - homeScore)
  const score = Math.round(awayLean ? awayScore : homeScore)
  const otherScore = Math.round(awayLean ? homeScore : awayScore)
  const detail = moneylineScoreDetail(score, otherScore)
  return {
    label: awayLean ? game.away_team : game.home_team,
    detail,
    price: awayLean ? awayMoneyline.price : homeMoneyline.price,
    book: awayLean ? awayMoneyline.book : homeMoneyline.book,
    type: mlScoreType(diff),
    team: awayLean ? game.away_team : game.home_team,
  }
}

function pricedTotals(bookmakers: Bookmaker[]) {
  const rows: Array<{ over: number; under: number; point: number }> = []
  bookmakers.forEach((bookmaker) => {
    const market = bookmaker.markets?.find((item) => item.key === 'totals')
    const over = market?.outcomes?.find((outcome) => outcome.name === 'Over')
    const under = market?.outcomes?.find((outcome) => outcome.name === 'Under')
    if (typeof over?.price === 'number' && typeof under?.price === 'number' && typeof over.point === 'number') {
      rows.push({ over: over.price, under: under.price, point: over.point })
    }
  })
  return rows
}

function teamFormTotalLean(
  sport: Sport | undefined,
  postedTotal: number | undefined,
  bestOver: { book: string; price: number } | null,
  bestUnder: { book: string; price: number } | null,
  allTotals: Array<{ over: number; under: number; point: number }>,
  context?: TeamFormLineContext,
): LeanResult | null {
  if (!postedTotal || (!bestOver && !bestUnder)) return null
  const rows = allTotals.filter((item) => Number.isFinite(item.point) && Number.isFinite(item.over) && Number.isFinite(item.under))
  const avgTotal = rows.length ? rows.reduce((sum, item) => sum + item.point, 0) / rows.length : postedTotal
  const awayForm = context?.awayForm
  const homeForm = context?.homeForm
  const hasTeamForm = awayForm?.games && homeForm?.games
  const formProjection = hasTeamForm
    ? sport === 'NHL'
      ? (
          (((Number(awayForm.l10GoalsForPerGame || awayForm.goalsForPerGame || 0) + Number(homeForm.l10GoalsAgainstPerGame || homeForm.goalsAgainstPerGame || 0)) / 2) +
          ((Number(homeForm.l10GoalsForPerGame || homeForm.goalsForPerGame || 0) + Number(awayForm.l10GoalsAgainstPerGame || awayForm.goalsAgainstPerGame || 0)) / 2)) * 0.7
        ) + (
          (((Number(awayForm.goalsForPerGame || 0) + Number(homeForm.goalsAgainstPerGame || 0)) / 2) +
          ((Number(homeForm.goalsForPerGame || 0) + Number(awayForm.goalsAgainstPerGame || 0)) / 2)) * 0.3
        )
      : (
          (((Number(awayForm.l10For || 0) + Number(homeForm.l10Against || 0)) / 2) +
          ((Number(homeForm.l10For || 0) + Number(awayForm.l10Against || 0)) / 2)) * 0.7
        ) + (
          (((Number(awayForm.l5For || awayForm.l10For || 0) + Number(homeForm.l5Against || homeForm.l10Against || 0)) / 2) +
          ((Number(homeForm.l5For || homeForm.l10For || 0) + Number(awayForm.l5Against || awayForm.l10Against || 0)) / 2)) * 0.3
        )
    : null

  if (!bestOver || !bestUnder) {
    const best = bestOver || bestUnder
    const side = bestOver ? 'Over' : 'Under'
    return {
      label: `${side} ${postedTotal}`,
      detail: formProjection
        ? totalReadDetail(formProjection.toFixed(1), postedTotal)
        : `${avgTotal.toFixed(1)} market range.`,
      price: best?.price,
      book: best?.book,
      type: 'Total Watch',
    }
  }

  const pressureSamples = rows.length
    ? rows.map((item) => {
        const overImp = impliedProbability(item.over) || 0.5
        const underImp = impliedProbability(item.under) || 0.5
        return overImp / (overImp + underImp)
      })
    : [(impliedProbability(bestOver.price) || 0.5) / ((impliedProbability(bestOver.price) || 0.5) + (impliedProbability(bestUnder.price) || 0.5))]
  const overPressure = pressureSamples.reduce((sum, value) => sum + value, 0) / pressureSamples.length
  const marketEstimate = avgTotal + ((overPressure - 0.5) * (sport === 'NHL' ? 1.2 : 6))
  const estimate = formProjection
    ? sport === 'NHL'
      ? (formProjection * 0.86) + (avgTotal * 0.08) + (marketEstimate * 0.06)
      : (formProjection * 0.90) + (avgTotal * 0.05) + (marketEstimate * 0.05)
    : marketEstimate
  const diff = estimate - postedTotal
  const tightThreshold = sport === 'NHL' ? 0.15 : 0.25
  if (Math.abs(diff) < tightThreshold) {
    return {
      label: `Near ${postedTotal}`,
      detail: `${estimate.toFixed(1)} estimated. Books graded this total tightly.`,
      type: 'Total Watch',
    }
  }
  const overLean = diff >= 0
  const strongThreshold = sport === 'NHL' ? 0.5 : 1.5
  const leanThreshold = sport === 'NHL' ? 0.25 : 0.5
  return {
    label: `${overLean ? 'Over' : 'Under'} ${postedTotal}`,
    detail: formProjection
      ? totalReadDetail(estimate.toFixed(1), postedTotal)
      : `${estimate.toFixed(1)} market range.`,
    price: overLean ? bestOver.price : bestUnder.price,
    book: overLean ? bestOver.book : bestUnder.book,
    type: Math.abs(diff) >= strongThreshold ? 'Strong Total Lean' : Math.abs(diff) >= leanThreshold ? 'Total Lean' : 'Total Watch',
  }
}

function nflMlScore(price: number, stats: { powerScore?: number } | undefined, isHome: boolean) {
  const marketScore = (impliedProbability(price) || 0.5) * 100
  const powerScore = clampScore(Number(stats?.powerScore || 55))
  const venueScore = isHome ? 58 : 50
  return clampScore((marketScore * 0.45) + (powerScore * 0.45) + (venueScore * 0.1))
}

function nflMoneylineLean(
  game: Game,
  awayMoneyline: { book: string; price: number } | null,
  homeMoneyline: { book: string; price: number } | null,
  context?: NflLineContext,
): LeanResult | null {
  if (!awayMoneyline || !homeMoneyline) return null
  const awayAbbr = context?.teamAbbrMap?.[game.away_team] || game.away_team
  const homeAbbr = context?.teamAbbrMap?.[game.home_team] || game.home_team
  const awayScore = nflMlScore(awayMoneyline.price, context?.teamStatsMap?.[awayAbbr], false)
  const homeScore = nflMlScore(homeMoneyline.price, context?.teamStatsMap?.[homeAbbr], true)
  const homeLean = homeScore >= awayScore
  const diff = Math.abs(homeScore - awayScore)
  const score = Math.round(homeLean ? homeScore : awayScore)
  const otherScore = Math.round(homeLean ? awayScore : homeScore)
  const best = homeLean ? homeMoneyline : awayMoneyline
  return {
    label: homeLean ? game.home_team : game.away_team,
    detail: moneylineScoreDetail(score, otherScore),
    price: best.price,
    book: best.book,
    type: mlScoreType(diff),
    team: homeLean ? game.home_team : game.away_team,
  }
}

function recordPct(record?: string) {
  const match = String(record || '').match(/(\d+)\s*-\s*(\d+)/)
  if (!match) return null
  const wins = Number(match[1])
  const losses = Number(match[2])
  const total = wins + losses
  return total > 0 ? wins / total : null
}

function ncaafTeamContext(team: string, context?: NcaafLineContext) {
  const clean = ncaafProgramName(team).toLowerCase()
  return context?.teams?.find((item) => {
    const itemClean = ncaafProgramName(item.team).toLowerCase()
    return itemClean === clean || clean.includes(itemClean) || itemClean.includes(clean)
  })
}

function ncaafBaselineScore(team: string, context?: NcaafLineContext) {
  const info = ncaafTeamContext(team, context)
  if (!info) return 50
  const rank = Number(info.rank)
  const rankScore = Number.isFinite(rank) && rank > 0 ? clampScore(90 - (rank * 1.25)) : 50
  const pct = recordPct(info.currentRecord || info.lastRecord)
  const recordScore = pct === null ? rankScore : clampScore(pct * 100)
  const scheduleText = `${info.schedule || ''} ${info.lean || ''}`.toLowerCase()
  const scheduleBonus = scheduleText.includes('elite') || scheduleText.includes('playoff') || scheduleText.includes('title')
    ? 4
    : scheduleText.includes('strong') ? 2 : 0
  return clampScore((rankScore * 0.62) + (recordScore * 0.28) + 10 + scheduleBonus)
}

function ncaafSpreadScore(line: { point?: number } | null) {
  if (typeof line?.point !== 'number') return 50
  return line.point < 0
    ? clampScore(55 + (Math.abs(line.point) * 2))
    : clampScore(48 - (line.point * 1.15))
}

function ncaafMlScore(
  line: { price: number } | null,
  spread: { point?: number } | null,
  team: string,
  isHome: boolean,
  context?: NcaafLineContext,
) {
  const marketScore = line ? (impliedProbability(line.price) || 0.5) * 100 : 50
  const baseline = ncaafBaselineScore(team, context)
  const spreadScore = ncaafSpreadScore(spread)
  const venueScore = isHome ? 56 : 50
  return clampScore((marketScore * 0.45) + (baseline * 0.3) + (spreadScore * 0.15) + (venueScore * 0.1))
}

function ncaafMoneylineLean(
  game: Game,
  awayMoneyline: { book: string; price: number } | null,
  homeMoneyline: { book: string; price: number } | null,
  awaySpread: { book: string; price: number; point?: number } | null,
  homeSpread: { book: string; price: number; point?: number } | null,
  context?: NcaafLineContext,
): LeanResult | null {
  if (!awayMoneyline || !homeMoneyline) return consensusMoneylineLean([], game, 'NCAAF')
  const awayScore = ncaafMlScore(awayMoneyline, awaySpread, game.away_team, false, context)
  const homeScore = ncaafMlScore(homeMoneyline, homeSpread, game.home_team, true, context)
  const awayLean = awayScore >= homeScore
  const diff = Math.abs(awayScore - homeScore)
  const score = Math.round(awayLean ? awayScore : homeScore)
  const otherScore = Math.round(awayLean ? homeScore : awayScore)
  const best = awayLean ? awayMoneyline : homeMoneyline
  const team = awayLean ? game.away_team : game.home_team
  return {
    label: `${ncaafProgramName(team)} ML`,
    detail: moneylineScoreDetail(score, otherScore),
    price: best.price,
    book: best.book,
    type: mlScoreType(diff),
    team,
  }
}

function gradeSignal(value?: string) {
  const grade = String(value || '').toUpperCase()
  if (grade.startsWith('A+')) return 4
  if (grade.startsWith('A')) return 3
  if (grade.startsWith('B+')) return 1.5
  if (grade.startsWith('B')) return 0.5
  if (grade.startsWith('C')) return -1
  return 0
}

function ncaafTotalProfile(team: string, context?: NcaafLineContext) {
  const info = ncaafTeamContext(team, context)
  if (!info) return 0
  const text = `${info.profile || ''} ${info.schedule || ''} ${info.lean || ''}`.toLowerCase()
  let signal = 0
  if (text.includes('over') || text.includes('explosive') || text.includes('scoring') || text.includes('fast')) signal += 1.2
  if (text.includes('under') || text.includes('defense') || text.includes('controlled') || text.includes('grinder')) signal -= 1.2
  if (text.includes('elite') || text.includes('playoff') || text.includes('title')) signal += 0.4
  signal += gradeSignal(info.offense) * 0.35
  signal -= gradeSignal(info.defense) * 0.25
  if (Number.isFinite(Number(info.offenseRank))) signal += Math.max(-1.2, Math.min(1.2, (65 - Number(info.offenseRank)) / 30))
  if (Number.isFinite(Number(info.defenseRank))) signal -= Math.max(-1.2, Math.min(1.2, (65 - Number(info.defenseRank)) / 30))
  if (Number.isFinite(Number(info.lastGameTotal))) signal += Math.max(-1.4, Math.min(1.4, (Number(info.lastGameTotal) - 52) / 9))
  return signal
}

function ncaafStatsTotalProjection(game: Game, context?: NcaafLineContext) {
  const away = ncaafTeamContext(game.away_team, context)
  const home = ncaafTeamContext(game.home_team, context)
  const awayFor = Number(away?.pointsForPerGame)
  const awayAllowed = Number(away?.pointsAllowedPerGame)
  const homeFor = Number(home?.pointsForPerGame)
  const homeAllowed = Number(home?.pointsAllowedPerGame)
  if (![awayFor, awayAllowed, homeFor, homeAllowed].every(Number.isFinite)) return null
  return ((awayFor + homeAllowed) / 2) + ((homeFor + awayAllowed) / 2)
}

function ncaafTotalLean(
  game: Game,
  postedTotal: number | undefined,
  bestOver: { book: string; price: number } | null,
  bestUnder: { book: string; price: number } | null,
  allTotals: Array<{ over: number; under: number; point: number }>,
  awaySpread: { point?: number } | null,
  homeSpread: { point?: number } | null,
  context?: NcaafLineContext,
): LeanResult | null {
  if (!postedTotal || (!bestOver && !bestUnder)) return null
  const rows = allTotals.filter((item) => Number.isFinite(item.point) && Number.isFinite(item.over) && Number.isFinite(item.under))
  const avgTotal = rows.length ? rows.reduce((sum, row) => sum + row.point, 0) / rows.length : postedTotal
  const pressureSamples = rows.length
    ? rows.map((row) => {
        const overImp = impliedProbability(row.over) || 0.5
        const underImp = impliedProbability(row.under) || 0.5
        return overImp / (overImp + underImp)
      })
    : []
  const overPressure = pressureSamples.length ? pressureSamples.reduce((sum, value) => sum + value, 0) / pressureSamples.length : 0.5
  const pressureAdj = (overPressure - 0.5) * 8
  const favoritePoint = [awaySpread?.point, homeSpread?.point]
    .filter((point): point is number => typeof point === 'number')
    .sort((a, b) => Math.abs(b) - Math.abs(a))[0]
  const spreadAdj = typeof favoritePoint === 'number' && Math.abs(favoritePoint) >= 17
    ? -0.8
    : typeof favoritePoint === 'number' && Math.abs(favoritePoint) <= 3 ? 0.35 : 0
  const profileAdj = ncaafTotalProfile(game.away_team, context) + ncaafTotalProfile(game.home_team, context)
  const statsProjection = ncaafStatsTotalProjection(game, context)
  const marketProjection = avgTotal + pressureAdj + profileAdj + spreadAdj
  const estimate = statsProjection === null ? marketProjection : (statsProjection * 0.55) + (marketProjection * 0.45)
  const diff = estimate - postedTotal
  if (Math.abs(diff) < 0.8) {
    return {
      label: `Near ${postedTotal}`,
      detail: `${estimate.toFixed(1)} total read. Market and team context are tight.`,
      type: 'Total Watch',
    }
  }
  const overLean = diff >= 0
  const best = overLean ? bestOver : bestUnder
  return {
    label: `${overLean ? 'Over' : 'Under'} ${postedTotal}`,
    detail: totalReadDetail(estimate.toFixed(1), postedTotal),
    price: best?.price,
    book: best?.book,
    type: Math.abs(diff) >= 2.2 ? 'Strong Total Lean' : 'Total Lean',
  }
}

function soccerPlayed(team: Record<string, any> | undefined) {
  return Number(team?.played || 0)
}

function soccerPointsPerGame(team: Record<string, any> | undefined) {
  const played = soccerPlayed(team)
  return played ? Number(team?.points || 0) / played : 0
}

function soccerDrawRate(team: Record<string, any> | undefined) {
  const played = soccerPlayed(team)
  return played ? Number(team?.drawn || 0) / played : 0
}

function soccerRecentDraws(team: Record<string, any> | undefined) {
  return String(team?.form || '').toUpperCase().split('').filter((result) => result === 'D').length
}

function soccerGoalsForPerGame(team: Record<string, any> | undefined) {
  const played = soccerPlayed(team)
  return played ? Number(team?.goalsFor || 0) / played : 0
}

function soccerPowerScore(team: Record<string, any> | undefined) {
  if (!team?.played) return 50
  const played = Number(team.played || 1)
  const ppg = soccerPointsPerGame(team)
  const gdPerGame = Number(team.goalDifference || 0) / played
  const scoringRate = soccerGoalsForPerGame(team)
  const againstRate = Number(team.goalsAgainst || 0) / played
  const tableBonus = Math.max(0, 22 - Number(team.position || 20)) * 1.1
  return 35 + (ppg * 12) + (gdPerGame * 8) + (scoringRate * 3) - (againstRate * 2) + tableBonus
}

function soccerMoneylineLean(
  game: Game,
  awayMoneyline: { book: string; price: number } | null,
  homeMoneyline: { book: string; price: number } | null,
  drawMoneyline: { book: string; price: number } | null,
  context?: SoccerLineContext,
): LeanResult | null {
  const awayInfo = context?.awayInfo
  const homeInfo = context?.homeInfo
  if (!awayInfo || !homeInfo) return null
  const awayPower = soccerPowerScore(awayInfo)
  const homePower = soccerPowerScore(homeInfo) + 3
  const diff = homePower - awayPower
  const ppgGap = Math.abs(soccerPointsPerGame(homeInfo) - soccerPointsPerGame(awayInfo))
  const drawProfile =
    (soccerRecentDraws(awayInfo) > 0 && soccerRecentDraws(homeInfo) > 0) ||
    (soccerDrawRate(awayInfo) >= 0.24 && soccerDrawRate(homeInfo) >= 0.24) ||
    ((soccerDrawRate(awayInfo) + soccerDrawRate(homeInfo)) / 2 >= 0.28)
  const isDrawWatch = (Math.abs(diff) < 5 || ppgGap <= 0.15) && drawProfile
  const stronger = diff > 0 ? homeInfo : awayInfo
  const weaker = diff > 0 ? awayInfo : homeInfo
  const side = isDrawWatch ? 'Draw' : String(stronger.shortName || stronger.team || (diff > 0 ? game.home_team : game.away_team))
  const best = isDrawWatch ? drawMoneyline : diff > 0 ? homeMoneyline : awayMoneyline
  const ppgEdge = (soccerPointsPerGame(stronger) - soccerPointsPerGame(weaker)).toFixed(2)
  const gdEdge = Number(stronger.goalDifference || 0) - Number(weaker.goalDifference || 0)
  return {
    label: side,
    detail: isDrawWatch
      ? `${ppgGap.toFixed(2)} points/game gap with a draw profile on both sides.`
      : `${ppgEdge} points/game edge and ${gdEdge >= 0 ? '+' : ''}${gdEdge} goal-difference edge.`,
    price: best?.price,
    book: best?.book,
    type: isDrawWatch ? 'Draw Lean' : Math.abs(diff) >= 10 ? 'Strong Lean' : 'Lean',
    team: isDrawWatch ? undefined : diff > 0 ? game.home_team : game.away_team,
  }
}

function soccerMarketSnapshot(
  game: Game,
  awayMoneyline: { book: string; price: number } | null,
  homeMoneyline: { book: string; price: number } | null,
  drawMoneyline: { book: string; price: number } | null,
): LeanResult | null {
  const candidates = [
    { label: game.away_team, line: awayMoneyline },
    { label: game.home_team, line: homeMoneyline },
    { label: 'Draw', line: drawMoneyline },
  ].filter((item): item is { label: string; line: { book: string; price: number } } => Boolean(item.line))
  if (!candidates.length) return null

  const shortest = candidates.reduce((best, item) => {
    const bestProbability = impliedProbability(best.line.price) || 0
    const itemProbability = impliedProbability(item.line.price) || 0
    return itemProbability > bestProbability ? item : best
  })

  return {
    label: tournamentTeamLabel(shortest.label, true),
    detail: `Books are pricing ${shortest.label} as the clear favorite at about ${Math.round((impliedProbability(shortest.line.price) || 0) * 100)}% implied. Cross-check draw risk, total, and both-teams-to-score before betting.`,
    price: shortest.line.price,
    book: shortest.line.book,
    type: 'Snapshot',
    team: shortest.label === 'Draw' ? undefined : shortest.label,
  }
}

function soccerTotalLean(
  postedTotal: number | undefined,
  bestOver: { book: string; price: number } | null,
  bestUnder: { book: string; price: number } | null,
  context?: SoccerLineContext,
): LeanResult | null {
  const awayInfo = context?.awayInfo
  const homeInfo = context?.homeInfo
  if (!soccerPlayed(awayInfo) || !soccerPlayed(homeInfo) || !postedTotal) return null
  const awayAttack = Number(awayInfo?.goalsFor || 0) / Number(awayInfo?.played || 1)
  const awayConcede = Number(awayInfo?.goalsAgainst || 0) / Number(awayInfo?.played || 1)
  const homeAttack = Number(homeInfo?.goalsFor || 0) / Number(homeInfo?.played || 1)
  const homeConcede = Number(homeInfo?.goalsAgainst || 0) / Number(homeInfo?.played || 1)
  const projection = Math.max(1.2, Math.min(4.8, ((awayAttack + homeConcede) / 2) + ((homeAttack + awayConcede) / 2)))
  const diff = projection - postedTotal
  const leanOver = diff >= 0
  const best = leanOver ? bestOver : bestUnder
  return {
    label: Math.abs(diff) >= 0.25 ? `${leanOver ? 'Over' : 'Under'} ${postedTotal}` : `Near ${postedTotal}`,
    detail: totalReadDetail(projection.toFixed(1), postedTotal),
    price: best?.price,
    book: best?.book,
    type: Math.abs(diff) >= 0.6 ? 'Strong Total Lean' : Math.abs(diff) >= 0.25 ? 'Total Lean' : 'Total Watch',
  }
}

function soccerBttsLean(
  bestAwayMoneyline: { book: string; price: number } | null,
  bestDrawMoneyline: { book: string; price: number } | null,
  bestHomeMoneyline: { book: string; price: number } | null,
  bestYes: { book: string; price: number } | null,
  bestNo: { book: string; price: number } | null,
  context?: SoccerLineContext,
): LeanResult | null {
  const awayInfo = context?.awayInfo
  const homeInfo = context?.homeInfo
  if (!soccerPlayed(awayInfo) || !soccerPlayed(homeInfo)) return null
  const awayScoring = soccerGoalsForPerGame(awayInfo)
  const homeScoring = soccerGoalsForPerGame(homeInfo)
  const awayConceding = Number(awayInfo?.goalsAgainst || 0) / Number(awayInfo?.played || 1)
  const homeConceding = Number(homeInfo?.goalsAgainst || 0) / Number(homeInfo?.played || 1)
  const allMoneylinePlus = Boolean(bestAwayMoneyline && bestDrawMoneyline && bestHomeMoneyline) &&
    [bestAwayMoneyline, bestDrawMoneyline, bestHomeMoneyline].every((line) => Number(line?.price) > 0)
  const combinedScoring = awayScoring + homeScoring
  const isYes = awayScoring >= 1 && homeScoring >= 1 && (
    (allMoneylinePlus && combinedScoring >= 2.3) ||
    combinedScoring >= 2.9 ||
    (combinedScoring >= 2.5 && awayConceding >= 1.4 && homeConceding >= 1.4)
  )
  const best = isYes ? bestYes : bestNo
  return {
    label: `BTTS: ${isYes ? 'Yes' : 'No'}`,
    detail: isYes
      ? 'KF matchup read clears the BTTS line.'
      : 'KF matchup read does not clear the BTTS line.',
    price: best?.price,
    book: best?.book,
    type: 'BTTS Lean',
  }
}

function bestSpread(bookmakers: Bookmaker[], team: string) {
  let best: { price: number; point?: number; book: string } | null = null

  for (const bookmaker of bookmakers) {
    const market = bookmaker.markets?.find((item) => item.key === 'spreads')
    const outcome = market?.outcomes?.find((item) => item.name === team)
    if (!outcome || typeof outcome.price !== 'number') continue

    if (!best || outcome.price > best.price) {
      best = { price: outcome.price, point: outcome.point, book: displayBookName(bookmaker.key, bookmaker.title) }
    }
  }

  return best
}

function fmtSpreadPoint(point?: number) {
  if (typeof point !== 'number') return ''
  return `${point > 0 ? '+' : ''}${point}`
}

export function GameLineCard({
  game,
  weather,
  showNeutralTotalWatch = false,
  sport,
  mlbContext,
  teamFormContext,
  nflContext,
  ncaafContext,
  soccerContext,
  onPressSoccerTeam,
  userState,
  sportsbookPreferences,
}: {
  game: Game
  weather?: WeatherInfo
  showNeutralTotalWatch?: boolean
  sport?: Sport
  mlbContext?: MlbLineContext
  teamFormContext?: TeamFormLineContext
  nflContext?: NflLineContext
  ncaafContext?: NcaafLineContext
  soccerContext?: SoccerLineContext
  onPressSoccerTeam?: (team: string) => void
  userState?: string | null
  sportsbookPreferences?: SportsbookPreferences | null
}) {
  const bookmakers = supportedBookmakers(game.bookmakers, userState, sportsbookPreferences)
  const totalMarket = getMarket(bookmakers, 'totals')
  const over = findOutcome(totalMarket, 'Over')
  const under = findOutcome(totalMarket, 'Under')
  const awayBest = bestMoneyline(bookmakers, game.away_team)
  const homeBest = bestMoneyline(bookmakers, game.home_team)
  const drawBest = bestMoneyline(bookmakers, 'Draw')
  const bttsYes = bestMarketOutcome(bookmakers, 'btts', 'Yes')
  const bttsNo = bestMarketOutcome(bookmakers, 'btts', 'No')
  const awaySpread = bestSpread(bookmakers, game.away_team)
  const homeSpread = bestSpread(bookmakers, game.home_team)
  const usesTeamFormLean = sport === 'NBA' || sport === 'NHL' || sport === 'WNBA'
  const moneylineLean = sport === 'MLB'
    ? mlbMoneylineLean(game, awayBest, homeBest, mlbContext)
    : sport === 'NFL'
      ? nflMoneylineLean(game, awayBest, homeBest, nflContext)
    : sport === 'NCAAF'
      ? ncaafMoneylineLean(game, awayBest, homeBest, awaySpread, homeSpread, ncaafContext)
    : sport === 'SOCCER'
      ? soccerContext?.isTournament
        ? soccerMarketSnapshot(game, awayBest, homeBest, drawBest)
        : soccerMoneylineLean(game, awayBest, homeBest, drawBest, soccerContext)
    : usesTeamFormLean
      ? teamFormMoneylineLean(sport, game, awayBest, homeBest, teamFormContext)
    : consensusMoneylineLean(bookmakers, game, sport)
  const totalLean = sport === 'MLB'
    ? mlbTotalLean(game, over, under, bookmakers, mlbContext)
    : sport === 'NCAAF'
      ? ncaafTotalLean(game, over?.point, bestMarketOutcome(bookmakers, 'totals', 'Over'), bestMarketOutcome(bookmakers, 'totals', 'Under'), pricedTotals(bookmakers), awaySpread, homeSpread, ncaafContext)
    : sport === 'SOCCER'
      ? soccerTotalLean(over?.point, bestMarketOutcome(bookmakers, 'totals', 'Over'), bestMarketOutcome(bookmakers, 'totals', 'Under'), soccerContext)
    : usesTeamFormLean
      ? teamFormTotalLean(sport, over?.point, bestMarketOutcome(bookmakers, 'totals', 'Over'), bestMarketOutcome(bookmakers, 'totals', 'Under'), pricedTotals(bookmakers), teamFormContext)
    : consensusTotalLean(bookmakers, weather, showNeutralTotalWatch)
  const bttsLean = sport === 'SOCCER' ? soccerBttsLean(awayBest, drawBest, homeBest, bttsYes, bttsNo, soccerContext) : null
  const moneylineLeanLabel = sport === 'SOCCER' && soccerContext?.isTournament
    ? 'Market Snapshot'
    : moneylineLean?.type ? `KingFish ${moneylineLean.type}` : 'Moneyline Lean'
  const totalLeanLabel = totalLean?.type ? `KingFish ${totalLean.type}` : totalLean?.label.startsWith('Near') ? 'Total Watch' : 'Total Lean'
  const hideAwayMoneyline = moneylineLean?.team === game.away_team
  const hideHomeMoneyline = moneylineLean?.team === game.home_team
  const totalLeanSide = totalLean?.label.startsWith('Over') ? 'over' : totalLean?.label.startsWith('Under') ? 'under' : null
  const showTournamentFlags = sport === 'SOCCER' && soccerContext?.isTournament

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.timeBlock}>
          <AppText variant="eyebrow">// {fmtTime(game.commence_time)}</AppText>
          {weather && <AppText variant="mono">{weather.park}</AppText>}
        </View>
        <AppText variant="mono">{bookmakers.length} books</AppText>
      </View>

      {weather && (
        <View style={styles.weatherRowWrap}>
          <View style={styles.weatherRow}>
            <WeatherPill label={weather.sky} />
            <WeatherPill label={`${weather.tempF} F`} />
            <WeatherPill
              label={weather.windStr}
              tone={weather.windImpact === 'boost' ? 'good' : weather.windImpact === 'suppress' ? 'bad' : 'neutral'}
            />
            {weather.precipPct > 30 && <WeatherPill label={`${weather.precipPct}% rain`} tone="warn" />}
          </View>
        </View>
      )}

      {moneylineLean && <LeanBox label={moneylineLeanLabel} lean={moneylineLean} />}
      {!hideAwayMoneyline && (
        <TeamRow
          team={game.away_team}
          line={awayBest}
          tournament={showTournamentFlags}
          onPress={showTournamentFlags ? onPressSoccerTeam : undefined}
        />
      )}
      {drawBest && <TeamRow team="Draw" line={drawBest} />}
      {!hideHomeMoneyline && (
        <TeamRow
          team={game.home_team}
          line={homeBest}
          tournament={showTournamentFlags}
          onPress={showTournamentFlags ? onPressSoccerTeam : undefined}
        />
      )}

      {(awaySpread || homeSpread) && (
        <View style={styles.marketBox}>
          <AppText variant="eyebrow">// Spread</AppText>
          <MarketRow team={game.away_team} line={awaySpread} marketLabel={sport === 'MLB' ? 'RL' : 'Spread'} />
          <MarketRow team={game.home_team} line={homeSpread} marketLabel={sport === 'MLB' ? 'RL' : 'Spread'} />
        </View>
      )}

      {(over || under) && (
        <View style={styles.marketBox}>
          <AppText variant="eyebrow">// Total</AppText>
          {totalLean && <LeanBox label={totalLeanLabel} lean={totalLean} compact />}
          <View style={styles.totalRow}>
            {over && totalLeanSide !== 'over' && (
              <AppText style={styles.totalText}>
                O {over.point} <AppText style={styles.totalPrice}>{fmtOdds(over.price)}</AppText>
              </AppText>
            )}
            {under && totalLeanSide !== 'under' && (
              <AppText style={styles.totalText}>
                U {under.point} <AppText style={styles.totalPrice}>{fmtOdds(under.price)}</AppText>
              </AppText>
            )}
          </View>
        </View>
      )}

      {(bttsYes || bttsNo) && (
        <View style={styles.marketBox}>
          <AppText variant="eyebrow">// Both Teams To Score</AppText>
          {bttsLean && <LeanBox label={`KingFish ${bttsLean.type}`} lean={bttsLean} compact />}
          <View style={styles.totalRow}>
            {bttsYes && (
              <AppText style={styles.totalText}>
                Yes <AppText style={styles.totalPrice}>{fmtOdds(bttsYes.price)}</AppText>
              </AppText>
            )}
            {bttsNo && (
              <AppText style={styles.totalText}>
                No <AppText style={styles.totalPrice}>{fmtOdds(bttsNo.price)}</AppText>
              </AppText>
            )}
          </View>
        </View>
      )}
    </Card>
  )
}

function LeanBox({ label, lean, compact = false }: { label: string; lean: LeanResult; compact?: boolean }) {
  return (
    <View style={[styles.leanBox, compact && styles.leanBoxCompact]}>
      <View style={styles.leanCopy}>
        <AppText variant="mono">{label}</AppText>
        <AppText style={styles.leanMain}>{lean.label}</AppText>
        <AppText variant="muted" style={styles.leanDetail}>{lean.detail}</AppText>
      </View>
      {typeof lean.price === 'number' && (
        <View style={styles.leanPrice}>
          <AppText style={styles.leanPriceText}>{fmtOdds(lean.price)}</AppText>
          {lean.book ? <AppText variant="mono">{lean.book}</AppText> : null}
        </View>
      )}
    </View>
  )
}

function TeamRow({
  team,
  line,
  tournament = false,
  onPress,
}: {
  team: string
  line: { price: number; book: string } | null
  tournament?: boolean
  onPress?: (team: string) => void
}) {
  const teamName = (
    <View style={styles.teamNameWrap}>
      <AppText style={styles.teamName}>{tournamentTeamLabel(team, tournament)}</AppText>
      {line && <AppText variant="mono">ML</AppText>}
    </View>
  )
  return (
    <View style={styles.teamRow}>
      {onPress && team !== 'Draw' ? <Pressable onPress={() => onPress(team)}>{teamName}</Pressable> : teamName}
      <View style={styles.oddsBadge}>
        <AppText style={styles.oddsText}>{line ? fmtOdds(line.price) : '-'}</AppText>
      </View>
    </View>
  )
}

function MarketRow({ team, line, marketLabel }: { team: string; line: { price: number; point?: number; book: string } | null; marketLabel: string }) {
  const point = line ? fmtSpreadPoint(line.point) : ''
  return (
    <View style={styles.marketRow}>
      <View style={styles.teamNameWrap}>
        <View style={styles.marketTeamLine}>
          <AppText style={styles.marketTeam}>{team}</AppText>
          {point ? <AppText style={styles.marketPoint}>{point}</AppText> : null}
        </View>
        <AppText variant="mono">{marketLabel}</AppText>
      </View>
      <AppText style={styles.marketPrice}>{line ? fmtOdds(line.price) : '-'}</AppText>
    </View>
  )
}

function WeatherPill({ label, tone = 'neutral' }: { label: string; tone?: 'good' | 'bad' | 'warn' | 'neutral' }) {
  return (
    <View
      style={[
        styles.weatherPill,
        tone === 'good' && styles.weatherGood,
        tone === 'bad' && styles.weatherBad,
        tone === 'warn' && styles.weatherWarn,
      ]}
    >
      <AppText style={[styles.weatherText, tone === 'good' && styles.goodText, tone === 'bad' && styles.badText, tone === 'warn' && styles.warnText]}>
        {label}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  timeBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  teamNameWrap: {
    flex: 1,
    minWidth: 0,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
  },
  oddsBadge: {
    minWidth: 62,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(198,145,50,.1)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  oddsText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
  },
  weatherRowWrap: {
    marginBottom: spacing.sm,
  },
  weatherRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weatherPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.bgCardAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weatherGood: {
    borderColor: 'rgba(34,197,94,.25)',
    backgroundColor: 'rgba(34,197,94,.08)',
  },
  weatherBad: {
    borderColor: 'rgba(239,68,68,.25)',
    backgroundColor: 'rgba(239,68,68,.08)',
  },
  weatherWarn: {
    borderColor: 'rgba(232,175,60,.25)',
    backgroundColor: 'rgba(232,175,60,.08)',
  },
  weatherText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  goodText: {
    color: colors.green,
  },
  badText: {
    color: colors.red,
  },
  warnText: {
    color: colors.yellow,
  },
  leanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(198,145,50,.25)',
    borderRadius: 10,
    backgroundColor: 'rgba(198,145,50,.08)',
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  leanBoxCompact: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  leanCopy: {
    flex: 1,
    minWidth: 0,
  },
  leanMain: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
  },
  leanDetail: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
  },
  leanPrice: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  leanPriceText: {
    color: colors.gold,
    fontSize: 17,
    fontWeight: '900',
  },
  marketBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  marketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: 8,
  },
  marketTeamLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  marketTeam: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  marketPoint: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  marketPrice: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
  },
  totalRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 6,
  },
  totalText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  totalPrice: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
})
