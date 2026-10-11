import { ReferenceOccurrence } from '../utils/scanBibleReferences'

/**
 * Occurrences in start order, keeping the first of any that overlap and
 * dropping any outside the text. Splitting a text node at an overlapping or
 * out-of-range offset throws.
 */
export const nonOverlapping = (
  occurrences: readonly ReferenceOccurrence[],
  length: number
): ReferenceOccurrence[] => {
  const kept: ReferenceOccurrence[] = []
  ;[...occurrences]
    .sort((a, b) => a.start - b.start)
    .forEach((occurrence) => {
      const previous = kept[kept.length - 1]
      if (occurrence.start < 0 || occurrence.end > length) return
      if (occurrence.end <= occurrence.start) return
      if (previous && occurrence.start < previous.end) return
      kept.push(occurrence)
    })
  return kept
}
