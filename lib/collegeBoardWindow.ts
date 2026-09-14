// Shared presentation contract: keep web, phone and tablet copies identical.
type CollegeGame = {
  commence_time: string
  seasonWeek?: number
  seasonYear?: number
  seasonType?: number
}
export function collegeDay(value: string | number) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}
function monday(value: string | number) {
  const date = new Date(collegeDay(value) + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7)
  return date.toISOString().slice(0, 10)
}
export function collegeWeek(game: CollegeGame) {
  const start = monday(game.commence_time)
  if (Number.isInteger(game.seasonWeek) && Number.isInteger(game.seasonYear)) {
    const type = game.seasonType ?? 2
    return { key: `${game.seasonYear}-${type}-${game.seasonWeek}`, label: type === 3 ? `Postseason · Week ${game.seasonWeek}` : `Week ${game.seasonWeek}` }
  }
  // Unknown schedule metadata gets a date label, never an invented season week.
  const end = new Date(start + 'T12:00:00Z')
  end.setUTCDate(end.getUTCDate() + 6)
  const format = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return { key: start, label: `${format(new Date(start + 'T12:00:00Z'))}–${format(end)}` }
}
export function collegeWindows(games: CollegeGame[], now: number) {
  const future = games.filter(game => Date.parse(game.commence_time) > now)
    .sort((a, b) => Date.parse(a.commence_time) - Date.parse(b.commence_time))
  const weeks = new Map<string, { key: string; label: string }>()
  for (const game of future) {
    const week = collegeWeek(game)
    weeks.set(week.key, week)
  }
  const current = future.find(game => monday(game.commence_time) === monday(now))
  return {
    options: [...weeks.values(), { key: 'today', label: 'Today' }, { key: 'all', label: 'All' }],
    defaultKey: current ? collegeWeek(current).key : future[0] ? collegeWeek(future[0]).key : 'all',
  }
}
export function inCollegeWindow(game: CollegeGame, key: string, now: number) {
  if (!(Date.parse(game.commence_time) > now)) return false
  if (key === 'all') return true
  if (key === 'today') return collegeDay(game.commence_time) === collegeDay(now)
  return collegeWeek(game).key === key
}
