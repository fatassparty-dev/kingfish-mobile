export function fmtOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+jr$/, '')
    .replace(/\s+sr$/, '')
    .replace(/\s+ii$/, '')
    .replace(/\s+iii$/, '')
    .trim()
}
