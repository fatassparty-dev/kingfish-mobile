const TEAM_ALIASES: Record<string, string> = {
  miami: 'miami florida',
  'miami fl': 'miami florida',
  'miami fl hurricanes': 'miami florida',
  'miami florida hurricanes': 'miami florida',
  'miami hurricanes': 'miami florida',
  'miami oh': 'miami ohio',
  'miami oh redhawks': 'miami ohio',
  'miami ohio redhawks': 'miami ohio',
  'houston baptist': 'houston christian',
  'houston baptist huskies': 'houston christian',
  'houston christian huskies': 'houston christian',
  mississippi: 'ole miss',
  'mississippi rebels': 'ole miss',
  'ole miss rebels': 'ole miss',
  'southern cal': 'usc',
  'southern california': 'usc',
  'southern california trojans': 'usc',
  'usc trojans': 'usc',
  'san jose state spartans': 'san jose state',
  'north carolina state': 'nc state',
  'north carolina state wolfpack': 'nc state',
  'nc state wolfpack': 'nc state',
}

export function normalizeNcaafTeamName(value: string) {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(university|college)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return TEAM_ALIASES[normalized] || normalized
}

export function sameNcaafTeam(left: string, right: string) {
  const leftKey = normalizeNcaafTeamName(left)
  const rightKey = normalizeNcaafTeamName(right)
  if (!leftKey || !rightKey) return false
  if (leftKey === rightKey) return true

  const [shorter, longer] = leftKey.length < rightKey.length ? [leftKey, rightKey] : [rightKey, leftKey]
  if (!longer.startsWith(`${shorter} `)) return false
  const nextWord = longer.slice(shorter.length + 1).split(' ')[0]
  const institutionModifiers = new Set([
    'a', 'and', 'state', 'tech', 'southern', 'western', 'eastern', 'northern',
    'central', 'international', 'atlantic', 'christian', 'commerce', 'valley',
    'baptist', 'oh', 'ohio', 'fl', 'florida', 'pa', 'pennsylvania',
  ])
  return !institutionModifiers.has(nextWord)
}

export function normalizedNcaafConference(value?: string) {
  const conference = String(value || '').trim().toLowerCase()
  const aliases: Record<string, string> = {
    sec: 'SEC',
    'southeastern conference': 'SEC',
    acc: 'ACC',
    'atlantic coast conference': 'ACC',
    'big 12': 'Big 12',
    'big 12 conference': 'Big 12',
    'big ten': 'Big Ten',
    'big ten conference': 'Big Ten',
    'pac-12': 'Pac-12',
    'pac 12': 'Pac-12',
    independent: 'Independent',
    'fbs indep.': 'Independent',
  }
  return aliases[conference] || String(value || '').trim()
}

export function ncaafConferenceMatches(actual: string | undefined, selected: string) {
  return selected === 'All' || normalizedNcaafConference(actual) === normalizedNcaafConference(selected)
}
