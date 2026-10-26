import { getChapterCount, getVerseCount } from '../data/BibleVerseData'

/** A chapter-only tail after the book name: "82" or "1-3". */
export const CHAPTER_ONLY_TAIL_REG = /^(\d{1,3})(?:\s*-\s*(\d{1,3}))?$/u

/**
 * Book names, as written, that are also everyday words or given names
 * ("Dan 7 won", "Mark 5 items"). Without a chapter:verse they are only
 * trusted next to another reference in the same paragraph.
 */
const AMBIGUOUS_BOOK_NAMES = new Set([
  'acts',
  'am',
  'amos',
  'col',
  'dan',
  'esther',
  'ex',
  'ezra',
  'in',
  'is',
  'james',
  'job',
  'joel',
  'john',
  'jonah',
  'jude',
  'lev',
  'luke',
  'mark',
  'numbers',
  'phil',
  'ruth',
  'song',
  'titus',
])

export const isAmbiguousBookName = (written: string): boolean =>
  AMBIGUOUS_BOOK_NAMES.has(written.replace(/\./gu, '').toLocaleLowerCase())

/** Whether the written book name starts with a lowercase letter. */
export const startsLowercase = (written: string): boolean => {
  const letter = written.match(/\p{L}/u)?.[0]
  return (
    !!letter &&
    letter === letter.toLocaleLowerCase() &&
    letter !== letter.toLocaleUpperCase()
  )
}

/**
 * Expands a chapter-only tail to an explicit verse range for the provider:
 * "Psalms 82" -> "82:1-8", "Genesis 1-3" -> "1:1-3:24". In a one-chapter book
 * the numbers are verses instead, so "Jude 3" -> "1:3".
 */
export const expandChapterOnlyTail = (
  fullBookName: string,
  first: number,
  last: number
): string => {
  const chapters = getChapterCount(fullBookName)
  if (chapters === 1) {
    if (first < 1 || first > last || last > getVerseCount(fullBookName, 1)) {
      throw new Error(`${fullBookName} has no verse ${last}`)
    }
    return first === last ? `1:${first}` : `1:${first}-${last}`
  }
  if (first < 1 || first > last || last > chapters) {
    throw new Error(`${fullBookName} has no chapter ${last}`)
  }
  const lastVerse = getVerseCount(fullBookName, last)
  return first === last
    ? `${first}:1-${lastVerse}`
    : `${first}:1-${last}:${lastVerse}`
}

/**
 * Returns a function mapping a text offset to its paragraph number, where
 * paragraphs are separated by blank lines.
 */
export const paragraphIndexer = (
  text: string
): ((offset: number) => number) => {
  const breaks: number[] = []
  const reg = /\n[^\S\r\n]*\r?\n/gu
  let match: RegExpExecArray | null
  while ((match = reg.exec(text)) !== null) breaks.push(match.index)
  return (offset) => {
    let low = 0
    let high = breaks.length
    while (low < high) {
      const mid = (low + high) >> 1
      if (breaks[mid] < offset) low = mid + 1
      else high = mid
    }
    return low
  }
}
