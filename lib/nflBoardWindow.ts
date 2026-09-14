type NflGame = { commence_time: string }

type NflWindow<T> = {
  key: string
  label: string
  games: T[]
}

export function nflDay(value: string | number) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}

function dateValue(day: string) {
  return Date.parse(`${day}T12:00:00Z`)
}

function regularSeasonStart(year: number) {
  const septemberFirst = new Date(Date.UTC(year, 8, 1, 12))
  const daysToMonday = (8 - septemberFirst.getUTCDay()) % 7
  septemberFirst.setUTCDate(septemberFirst.getUTCDate() + daysToMonday + 3)
  return septemberFirst.toISOString().slice(0, 10)
}

function seasonYear(value: string | number) {
  const [year, month] = nflDay(value).split('-').map(Number)
  return month <= 2 ? year - 1 : year
}

export function nflWeek(value: string | number) {
  const year = seasonYear(value)
  const diffDays = Math.floor((dateValue(nflDay(value)) - dateValue(regularSeasonStart(year))) / 86400000)
  const week = Math.floor(diffDays / 7) + 1
  if (week >= 1 && week <= 18) return { key: `${year}-week-${week}`, label: `Week ${week}` }
  return { key: `${year}-postseason`, label: 'Postseason' }
}

export function nflWindows<T extends NflGame>(games: T[], now: number) {
  const future = games
    .filter(game => Date.parse(game.commence_time) > now)
    .sort((a, b) => Date.parse(a.commence_time) - Date.parse(b.commence_time))
  const weeks = new Map<string, NflWindow<T>>()
  for (const game of future) {
    const week = nflWeek(game.commence_time)
    const entry = weeks.get(week.key) || { ...week, games: [] }
    entry.games.push(game)
    weeks.set(week.key, entry)
  }
  const todayGames = future.filter(game => nflDay(game.commence_time) === nflDay(now))
  const currentWeekKey = nflWeek(now).key
  const defaultKey = todayGames.length ? 'today' : weeks.has(currentWeekKey) ? currentWeekKey : weeks.keys().next().value || 'all'
  return {
    options: [
      { key: 'today', label: 'Today', games: todayGames },
      ...weeks.values(),
      { key: 'all', label: 'All', games: future },
    ],
    defaultKey,
  }
}

export function inNflWindow(game: NflGame, key: string, now: number) {
  if (!(Date.parse(game.commence_time) > now)) return false
  if (key === 'all') return true
  if (key === 'today') return nflDay(game.commence_time) === nflDay(now)
  return nflWeek(game.commence_time).key === key
}
