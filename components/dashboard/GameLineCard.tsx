import { StyleSheet, View } from 'react-native'
import { Card } from '@/components/Card'
import { AppText } from '@/components/Text'
import { fmtOdds, fmtTime } from '@/lib/format'
import { displayBookName, supportedBookmakers } from '@/lib/sportsbooks'
import { colors, spacing } from '@/lib/theme'
import type { Bookmaker, Game, Market, Outcome, WeatherInfo } from '@/types'

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

function shortTeamName(team: string) {
  const pieces = team.split(' ').filter(Boolean)
  return pieces[pieces.length - 1] || team
}

function consensusMoneylineLean(bookmakers: Bookmaker[], game: Game) {
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
    label: `${shortTeamName(top.name)} ML`,
    detail: `${Math.round(top.probability * 100)}% no-vig market lean across ${top.books} books.`,
    price: best?.price,
    book: best?.book,
  }
}

function consensusTotalLean(bookmakers: Bookmaker[], weather?: WeatherInfo) {
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

  if (edge < 0.03) return null

  const best = rows
    .map((row) => ({ price: leanOver ? row.overPrice : row.underPrice, book: row.book }))
    .sort((a, b) => b.price - a.price)[0]
  const side = leanOver ? 'Over' : 'Under'

  return {
    label: `${side} ${Number(avgPoint.toFixed(1))}`,
    detail: weather?.windImpact === 'boost' || weather?.windImpact === 'suppress'
      ? `${weather.windStr} adds ${leanOver ? 'over' : 'under'} context to the market price.`
      : `${Math.round(Math.max(overProb, underProb) * 100)}% no-vig market lean across ${rows.length} books.`,
    price: best?.price,
    book: best?.book,
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
  return `${point > 0 ? '+' : ''}${point} `
}

export function GameLineCard({ game, weather }: { game: Game; weather?: WeatherInfo }) {
  const bookmakers = supportedBookmakers(game.bookmakers)
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
  const moneylineLean = consensusMoneylineLean(bookmakers, game)
  const totalLean = consensusTotalLean(bookmakers, weather)

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

      {moneylineLean && <LeanBox label="Moneyline Lean" lean={moneylineLean} />}
      <TeamRow team={game.away_team} line={awayBest} />
      {drawBest && <TeamRow team="Draw" line={drawBest} />}
      <TeamRow team={game.home_team} line={homeBest} />

      {(awaySpread || homeSpread) && (
        <View style={styles.marketBox}>
          <AppText variant="eyebrow">// Spread / Run Line</AppText>
          <MarketRow team={game.away_team} line={awaySpread} />
          <MarketRow team={game.home_team} line={homeSpread} />
        </View>
      )}

      {(over || under) && (
        <View style={styles.marketBox}>
          <AppText variant="eyebrow">// Total</AppText>
          {totalLean && <LeanBox label="Total Lean" lean={totalLean} compact />}
          <View style={styles.totalRow}>
            {over && (
              <AppText style={styles.totalText}>
                O {over.point} {fmtOdds(over.price)}
              </AppText>
            )}
            {under && (
              <AppText style={styles.totalText}>
                U {under.point} {fmtOdds(under.price)}
              </AppText>
            )}
          </View>
        </View>
      )}

      {(bttsYes || bttsNo) && (
        <View style={styles.marketBox}>
          <AppText variant="eyebrow">// Both Teams To Score</AppText>
          <View style={styles.totalRow}>
            {bttsYes && <AppText style={styles.totalText}>Yes {fmtOdds(bttsYes.price)}</AppText>}
            {bttsNo && <AppText style={styles.totalText}>No {fmtOdds(bttsNo.price)}</AppText>}
          </View>
        </View>
      )}
    </Card>
  )
}

function LeanBox({ label, lean, compact = false }: { label: string; lean: { label: string; detail: string; price?: number; book?: string }; compact?: boolean }) {
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

function TeamRow({ team, line }: { team: string; line: { price: number; book: string } | null }) {
  return (
    <View style={styles.teamRow}>
      <View style={styles.teamNameWrap}>
        <AppText style={styles.teamName}>{team}</AppText>
        {line?.book && <AppText variant="mono">{line.book}</AppText>}
      </View>
      <View style={styles.oddsBadge}>
        <AppText style={styles.oddsText}>{line ? fmtOdds(line.price) : '-'}</AppText>
      </View>
    </View>
  )
}

function MarketRow({ team, line }: { team: string; line: { price: number; point?: number; book: string } | null }) {
  return (
    <View style={styles.marketRow}>
      <View style={[styles.teamNameWrap, styles.marketTeamNameWrap]}>
        <AppText style={styles.marketTeam}>{team}</AppText>
        {line?.book && <AppText variant="mono">{line.book}</AppText>}
      </View>
      <AppText style={styles.marketPrice}>{line ? `${fmtSpreadPoint(line.point)}${fmtOdds(line.price)}` : '-'}</AppText>
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
    fontSize: 15,
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
    borderRadius: 999,
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
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginTop: 8,
  },
  marketTeamNameWrap: {
    flex: 0,
    maxWidth: '72%',
  },
  marketTeam: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
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
})
