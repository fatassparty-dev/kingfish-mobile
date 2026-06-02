const US_STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
])

const LOCATION_LABELS: Record<string, string> = {
  OTHER: 'Other / outside US',
  PR: 'Puerto Rico',
}

export function normalizeLocation(value?: string | null) {
  const location = String(value || '').trim()
  if (!location) return ''
  const upper = location.toUpperCase()
  if (upper === 'OUTSIDE US' || upper === 'OUTSIDE_US' || upper === 'OUTSIDE' || upper === 'NON-US') return 'OTHER'
  return upper
}

export function isValidLocation(value?: string | null) {
  const location = normalizeLocation(value)
  if (!location) return true
  return US_STATE_CODES.has(location) || location === 'PR' || location === 'OTHER'
}

export function isOutsideUsLocation(value?: string | null) {
  const location = normalizeLocation(value)
  return location === 'OTHER'
}

export function locationLabel(value?: string | null) {
  const location = normalizeLocation(value)
  return LOCATION_LABELS[location] || location || 'Not set'
}
