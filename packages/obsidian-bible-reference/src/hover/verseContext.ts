import { getVerseCount } from '../data/BibleVerseData'
import { IVerse } from '../interfaces/IVerse'

export const DEFAULT_CONTEXT_VERSES = 7
export const MAX_CONTEXT_VERSES = 30

interface Position {
  chapter: number
  verse: number
}

export const clampContextVerses = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_CONTEXT_VERSES
  }
  return Math.min(MAX_CONTEXT_VERSES, Math.max(1, Math.round(value)))
}

/** The verse after `position`, rolling into the next chapter; null at book end. */
const next = (book: string, { chapter, verse }: Position): Position | null => {
  if (verse < getVerseCount(book, chapter)) return { chapter, verse: verse + 1 }
  return getVerseCount(book, chapter + 1) > 0
    ? { chapter: chapter + 1, verse: 1 }
    : null
}

/** The verse before `position`, rolling into the previous chapter; null at book start. */
const previous = (
  book: string,
  { chapter, verse }: Position
): Position | null => {
  if (verse > 1) return { chapter, verse: verse - 1 }
  const count = getVerseCount(book, chapter - 1)
  return count > 0 ? { chapter: chapter - 1, verse: count } : null
}

const isContiguous = (book: string, verses: readonly IVerse[]): boolean =>
  verses.every((verse, index) => {
    if (index === 0) return true
    const step = next(book, verses[index - 1])
    return step?.chapter === verse.chapter && step.verse === verse.verse
  })

const bookOfQuery = (query: string): string | null =>
  query.match(/^(.+?)\s+\d{1,3}\s*:/u)?.[1] ?? null

const compare = (a: Position, b: Position): number =>
  a.chapter - b.chapter || a.verse - b.verse

/**
 * Builds a provider query covering `span` verses before the first and after
 * the last verse of a passage, crossing chapter edges within the book. A list
 * such as "Rom 8:2-7, 27, 34-36" spans from its lowest to its highest verse.
 * Returns null when no context applies: a whole chapter or an unknown book.
 */
export const buildContextQuery = (
  query: string,
  verses: readonly IVerse[],
  span: number
): string | null => {
  const book = bookOfQuery(query)
  if (!book || verses.length === 0) return null
  const sorted = [...verses].sort(compare)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (
    isContiguous(book, sorted) &&
    first.verse === 1 &&
    last.verse === getVerseCount(book, last.chapter)
  ) {
    return null
  }

  let start: Position = { chapter: first.chapter, verse: first.verse }
  let end: Position = { chapter: last.chapter, verse: last.verse }
  for (let i = 0; i < span; i++) {
    start = previous(book, start) ?? start
    end = next(book, end) ?? end
  }
  const tail =
    start.chapter === end.chapter
      ? `${start.chapter}:${start.verse}-${end.verse}`
      : `${start.chapter}:${start.verse}-${end.chapter}:${end.verse}`
  return `${book} ${tail}`
}
