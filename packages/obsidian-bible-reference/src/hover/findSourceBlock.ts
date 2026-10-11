const HEADING = /^#{1,6}\s/u
const LIST_ITEM = /^(?:[-+*]|\d+[.)])\s/u

const isListLine = (line: string): boolean =>
  LIST_ITEM.test(line.trimStart()) || /^\s+\S/u.test(line)

/**
 * Finds the inclusive, zero-based line range of the Markdown block around
 * `index`. Headings stand alone, list items expand to their whole list, and
 * anything else expands to its paragraph.
 */
export const findSourceBlock = (
  lines: readonly string[],
  index: number
): { first: number; last: number } => {
  const trimmed = lines[index].trimStart()
  if (HEADING.test(trimmed)) return { first: index, last: index }

  const belongs = LIST_ITEM.test(trimmed)
    ? isListLine
    : (line: string) =>
        line.trim() !== '' &&
        !HEADING.test(line.trimStart()) &&
        !LIST_ITEM.test(line.trimStart())
  let first = index
  let last = index
  while (first > 0 && belongs(lines[first - 1])) first--
  while (last < lines.length - 1 && belongs(lines[last + 1])) last++
  return { first, last }
}
