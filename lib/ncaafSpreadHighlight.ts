// Presentation only: the server supplies the selected side and thresholds.
export type SpreadHighlightRead = {
  side: 'home' | 'away'
  minimumPoint: number
  minimumStrongPoint: number | null
  detail?: string
}

export function ncaafSpreadHighlight(
  read: SpreadHighlightRead | null | undefined,
  side: 'home' | 'away',
  line: { point?: number; price: number } | null | undefined,
): 'Lean' | 'Strong' | null {
  if (
    !read
    || read.side !== side
    || !line
    || typeof line.point !== 'number'
    || !Number.isFinite(line.point)
    || !Number.isFinite(read.minimumPoint)
    || !Number.isFinite(line.price)
    || line.price < -125
    || line.price > 125
    || line.price === 0
    || line.point < read.minimumPoint
  ) return null

  return typeof read.minimumStrongPoint === 'number'
    && Number.isFinite(read.minimumStrongPoint)
    && line.point >= read.minimumStrongPoint
    ? 'Strong'
    : 'Lean'
}
