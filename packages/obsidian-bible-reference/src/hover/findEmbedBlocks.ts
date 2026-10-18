import { findSourceBlock } from './findSourceBlock'

const FENCE = /^\s*(`{3,}|~{3,})/u
const HEADING = /^\s*#{1,6}\s/u
const WIDGET_START =
  /^(?:>\s*\[!(?:bible|quote)\]|<details\s+class=["']obr-bible-widget["'])/iu

export interface EmbedBlock {
  /** Inclusive, zero-based line range. */
  first: number
  last: number
  /** True when a widget already sits beneath the block. */
  embedded: boolean
}

const skipFrontmatter = (lines: readonly string[]): number => {
  if (lines[0]?.trimEnd() !== '---') return 0
  const close = lines.findIndex(
    (line, index) => index > 0 && line.trimEnd() === '---'
  )
  return close === -1 ? 0 : close + 1
}

const hasWidgetAfter = (lines: readonly string[], last: number): boolean => {
  let next = last + 1
  while (next < lines.length && lines[next].trim() === '') next++
  return next < lines.length && WIDGET_START.test(lines[next].trimStart())
}

/**
 * Finds every paragraph and list in a note that may receive an embedded
 * widget: the same blocks hovering shows, minus headings, code, quotes and
 * callouts and HTML details. Blocks that already have a widget beneath them are
 * returned too, flagged `embedded`.
 */
export const findEmbedBlocks = (lines: readonly string[]): EmbedBlock[] => {
  const blocks: EmbedBlock[] = []
  let index = skipFrontmatter(lines)
  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trimStart()
    const fence = FENCE.exec(line)?.[1]
    if (line.trim() === '' || HEADING.test(line)) {
      index++
    } else if (fence) {
      index++
      while (
        index < lines.length &&
        !lines[index].trimStart().startsWith(fence)
      )
        index++
      index++
    } else if (trimmed.startsWith('>')) {
      while (index < lines.length && lines[index].trimStart().startsWith('>'))
        index++
    } else if (/^<details\b/iu.test(trimmed)) {
      while (index < lines.length && !/<\/details>/iu.test(lines[index]))
        index++
      index++
    } else {
      const { last } = findSourceBlock(lines, index)
      blocks.push({
        first: index,
        last,
        embedded: hasWidgetAfter(lines, last),
      })
      index = last + 1
    }
  }
  return blocks
}
