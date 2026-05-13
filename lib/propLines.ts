type PropBookLine = {
  over?: number | null
  under?: number | null
  point?: number | null
}

export function getDisplayLine(bookData: Record<string, PropBookLine>, books: string[]): number {
  const lineCounts = new Map<number, number>()

  books.forEach((book) => {
    const point = bookData[book]?.point
    if (typeof point === 'number') {
      lineCounts.set(point, (lineCounts.get(point) || 0) + 1)
    }
  })

  const lines = Array.from(lineCounts.entries())
  if (!lines.length) return 0

  lines.sort(([lineA, countA], [lineB, countB]) => countB - countA || lineA - lineB)
  return lines[0][0]
}

export function getBestOverAtLine(
  bookData: Record<string, PropBookLine>,
  books: string[],
  line: number
): { book: string; odds: number } | null {
  const candidates = books
    .map((book) => ({
      book,
      odds: bookData[book]?.over,
      point: bookData[book]?.point,
    }))
    .filter(
      (entry): entry is { book: string; odds: number; point: number } =>
        typeof entry.odds === 'number' &&
        typeof entry.point === 'number' &&
        entry.point === line
    )

  if (!candidates.length) return null
  return candidates.reduce((best, current) => (current.odds > best.odds ? current : best))
}
