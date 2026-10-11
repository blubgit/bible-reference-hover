import { getBibleVersion } from '../data/BibleVersionCollection'
import {
  getFullBookName,
  isKnownBookName,
  resolveBookName,
} from './bookNameReference'
import {
  CHAPTER_ONLY_TAIL_REG,
  expandChapterOnlyTail,
  isAmbiguousBookName,
  paragraphIndexer,
  startsLowercase,
} from './chapterOnlyReferences'
import { getExcludedRanges } from './markdownExclusions'
import {
  BOOK_REG,
  DASH_CHARS,
  normalizeChapterVerseSeparators,
  normalizeDashes,
} from './regs'
import {
  getReferenceHead,
  splitBibleReference,
  VerseReference,
} from './splitBibleReference'

export interface ReferenceOccurrence {
  raw: string
  start: number
  end: number
}

export interface ScannedBibleReference {
  /** Provider-ready reference using full book name, colons and ASCII dashes. */
  query: string
  /** Human-facing canonical reference using full book name and en dashes. */
  normalized: string
  translationKey?: string
  occurrences: ReferenceOccurrence[]
}

const DASH_CLASS = DASH_CHARS.replace(/[\\\]^-]/g, '\\$&')
// A reference may contain spaces or tabs, but punctuation must never bridge
// lines. Otherwise a sentence-ending period can consume the first digit of
// the following line as a dotted chapter/verse boundary.
const INLINE_SPACE = '[^\\S\\r\\n]*'
const CHAPTER_VERSE = `\\d{1,3}${INLINE_SPACE}[:.]${INLINE_SPACE}(?:\\d{1,3}|a)\\b`
const ENDPOINT = `(?:(?:\\d{1,3}${INLINE_SPACE}[:.]${INLINE_SPACE})?(?:\\d{1,3}|a)\\b)`
const RANGE = `(?:${INLINE_SPACE}[${DASH_CLASS}]${INLINE_SPACE}${ENDPOINT})?`
const REFERENCE_TAIL_REG = new RegExp(
  `^${CHAPTER_VERSE}${RANGE}(?:${INLINE_SPACE}[,;]${INLINE_SPACE}${ENDPOINT}${RANGE})*(?:${INLINE_SPACE}@([a-z][a-z0-9-]*))?`,
  'iu'
)
const CHAPTER_VERSE_START_REG = new RegExp(CHAPTER_VERSE, 'giu')
// A bare chapter or chapter range right after a word: "Ps 82", "Gen 1-3".
// It must not continue into a verse, letters, digits or another dash.
const CHAPTER_ONLY_START_REG = new RegExp(
  `(?<=[\\p{L}\\p{M}.]${INLINE_SPACE})\\d{1,3}(?:${INLINE_SPACE}[${DASH_CLASS}]${INLINE_SPACE}\\d{1,3})?(?![\\p{L}\\d${DASH_CLASS}]|${INLINE_SPACE}[:.]${INLINE_SPACE}\\d)(?:${INLINE_SPACE}@([a-z][a-z0-9-]*))?`,
  'giu'
)
const BOOK_SHAPE_REG =
  /^(?:[1-5]\.?\s*)?(?:[\p{L}\p{M}]+\.?)(?:\s+[\p{L}\p{M}]+\.?){0,5}$/u

const overlaps = (
  start: number,
  end: number,
  excluded: Array<{ start: number; end: number }>
): boolean => excluded.some((range) => start < range.end && end > range.start)

const locateBook = (
  text: string,
  chapterStart: number
): { start: number; bookName: string } | null => {
  const regionStart = Math.max(0, chapterStart - 120)
  const prefix = text.slice(regionStart, chapterStart)
  const startCandidates: number[] = []

  for (let i = 0; i < prefix.length; i++) {
    const char = prefix[i]
    const previous = i === 0 ? '' : prefix[i - 1]
    if (
      /\p{L}|[1-5]/u.test(char) &&
      (i === 0 || !/[\p{L}\p{M}\d]/u.test(previous))
    ) {
      startCandidates.push(i)
    }
  }

  for (const localStart of startCandidates) {
    const candidate = prefix.slice(localStart).trim()
    if (!BOOK_SHAPE_REG.test(candidate)) continue
    const lettersOnly = candidate.replace(/[^\p{L}\p{M}]/gu, '')
    if (
      lettersOnly.length <= 2 &&
      candidate === candidate.toLocaleLowerCase()
    ) {
      continue
    }
    if (!isKnownBookName(candidate)) continue
    const leadingWhitespace = prefix.slice(localStart).search(/\S/u)
    return {
      start: regionStart + localStart + Math.max(0, leadingWhitespace),
      bookName: candidate,
    }
  }
  return null
}

const canonicalize = (
  rawReference: string,
  translationKey?: string
): Omit<ScannedBibleReference, 'occurrences'> => {
  const canonicalInput = normalizeChapterVerseSeparators(
    normalizeDashes(rawReference)
  ).trim()
  const normalizedTranslation = translationKey?.toLowerCase()
  const bookMatch = canonicalInput.match(BOOK_REG)
  const chapterOnly = bookMatch
    ? canonicalInput
        .slice((bookMatch.index ?? 0) + bookMatch[0].length)
        .trim()
        .match(CHAPTER_ONLY_TAIL_REG)
    : null
  if (bookMatch && chapterOnly) {
    // Keep the reference as written for display and note updates; only the
    // provider query spells out the verses.
    const fullBookName = getFullBookName(resolveBookName(bookMatch[0]))
    const first = Number(chapterOnly[1])
    const last = Number(chapterOnly[2] ?? chapterOnly[1])
    const tail = first === last ? `${first}` : `${first}–${last}`
    return {
      query: `${fullBookName} ${expandChapterOnlyTail(fullBookName, first, last)}`,
      normalized: `${fullBookName} ${tail}${normalizedTranslation ? `@${normalizedTranslation}` : ''}`,
      translationKey: normalizedTranslation,
    }
  }

  const parsed = splitBibleReference(canonicalInput)
  const fullBookName = getFullBookName(parsed.bookName)
  const fullReference: VerseReference = { ...parsed, bookName: fullBookName }
  const rawTail = bookMatch
    ? canonicalInput.slice((bookMatch.index ?? 0) + bookMatch[0].length).trim()
    : getReferenceHead(fullReference).slice(parsed.bookName.length).trim()
  const normalizedTail = rawTail
    .replace(/\s*:\s*/gu, ':')
    .replace(/\s*-\s*/gu, '-')
    .replace(/\s*([,;])\s*/gu, '$1 ')
    .trim()
  const query = `${fullBookName} ${normalizedTail}`
  const display = query.replace(/(\d)-(?=\d)/gu, '$1–')
  return {
    query,
    normalized: `${display}${normalizedTranslation ? `@${normalizedTranslation}` : ''}`,
    translationKey: normalizedTranslation,
  }
}

interface FoundReference {
  canonical: Omit<ScannedBibleReference, 'occurrences'>
  occurrence: ReferenceOccurrence
}

const isUnknownTranslation = (translationKey?: string): boolean =>
  !!translationKey && getBibleVersion(translationKey).key !== translationKey

const toFoundReference = (
  text: string,
  start: number,
  end: number,
  translationKey?: string
): FoundReference | null => {
  const raw = text.slice(start, end)
  const referenceWithoutTranslation = translationKey
    ? raw.slice(0, raw.lastIndexOf('@')).trimEnd()
    : raw
  try {
    return {
      canonical: canonicalize(referenceWithoutTranslation, translationKey),
      occurrence: { raw, start, end },
    }
  } catch {
    // Candidate shape matched, but chapter/verse metadata rejected it.
    return null
  }
}

/**
 * A list item after "," or ";" may be the ordinal of the next reference's book
 * rather than a verse: in "Col 4:5-6; 1 Thess 4:11" the "1" belongs to
 * "1 Thess". Returns the tail length with such an ordinal and its separator
 * dropped, so the two references never overlap.
 */
const trimOrdinalOfNextBook = (
  text: string,
  tailStart: number,
  tail: string
): number => {
  const ordinal = tail.match(/[,;][^\S\r\n]*([1-5])$/u)
  if (!ordinal) return tail.length
  const nextWord = text
    .slice(tailStart + tail.length)
    .match(/^\.?[^\S\r\n]*([\p{L}\p{M}]+)/u)?.[1]
  return nextWord && isKnownBookName(`${ordinal[1]} ${nextWord}`)
    ? (ordinal.index ?? tail.length)
    : tail.length
}

const findVerseReferences = (
  text: string,
  excluded: Array<{ start: number; end: number }>
): FoundReference[] => {
  const found: FoundReference[] = []
  CHAPTER_VERSE_START_REG.lastIndex = 0
  let chapterMatch: RegExpExecArray | null
  while ((chapterMatch = CHAPTER_VERSE_START_REG.exec(text)) !== null) {
    const chapterStart = chapterMatch.index
    const book = locateBook(text, chapterStart)
    if (!book) continue

    const tail = text.slice(chapterStart).match(REFERENCE_TAIL_REG)
    if (!tail) continue
    const translationKey = tail[1]?.toLowerCase()
    if (isUnknownTranslation(translationKey)) continue

    const end =
      chapterStart + trimOrdinalOfNextBook(text, chapterStart, tail[0])
    if (/^\.\d/u.test(text.slice(end))) continue
    if (overlaps(book.start, end, excluded)) continue
    const reference = toFoundReference(text, book.start, end, translationKey)
    if (!reference) continue
    found.push(reference)
    CHAPTER_VERSE_START_REG.lastIndex = end
  }
  return found
}

/**
 * Finds "Ps 82" or "Gen 1-3". A book name that is also an everyday word
 * ("Dan 7", "Mark 5") only counts when another reference shares its paragraph.
 */
const findChapterOnlyReferences = (
  text: string,
  excluded: Array<{ start: number; end: number }>,
  verseReferences: FoundReference[]
): FoundReference[] => {
  const occupied = verseReferences.map((reference) => reference.occurrence)
  const candidates: Array<FoundReference & { ambiguous: boolean }> = []
  CHAPTER_ONLY_START_REG.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = CHAPTER_ONLY_START_REG.exec(text)) !== null) {
    const end = match.index + match[0].length
    const book = locateBook(text, match.index)
    if (!book || startsLowercase(book.bookName)) continue
    const translationKey = match[1]?.toLowerCase()
    if (isUnknownTranslation(translationKey)) continue
    if (overlaps(book.start, end, excluded)) continue
    if (overlaps(book.start, end, occupied)) continue
    const reference = toFoundReference(text, book.start, end, translationKey)
    if (!reference) continue
    candidates.push({
      ...reference,
      ambiguous: isAmbiguousBookName(book.bookName),
    })
  }
  if (!candidates.some((candidate) => candidate.ambiguous)) return candidates

  const paragraphOf = paragraphIndexer(text)
  const anchored = new Set(
    [...verseReferences, ...candidates.filter((c) => !c.ambiguous)].map(
      (reference) => paragraphOf(reference.occurrence.start)
    )
  )
  return candidates.filter(
    (candidate) =>
      !candidate.ambiguous ||
      anchored.has(paragraphOf(candidate.occurrence.start))
  )
}

/**
 * Discover, validate, normalize and deduplicate Bible references in prose.
 * References are returned in first-occurrence order while retaining every
 * source occurrence for safe source updates. With `chapterOnly`, references
 * without a verse ("Ps 82") are found too.
 */
export const scanBibleReferences = (
  text: string,
  options: { excludeMarkdown?: boolean; chapterOnly?: boolean } = {
    excludeMarkdown: true,
  }
): ScannedBibleReference[] => {
  const excluded =
    options.excludeMarkdown === false ? [] : getExcludedRanges(text)
  const found = findVerseReferences(text, excluded)
  if (options.chapterOnly) {
    found.push(...findChapterOnlyReferences(text, excluded, found))
    found.sort((a, b) => a.occurrence.start - b.occurrence.start)
  }

  const references: ScannedBibleReference[] = []
  const byKey = new Map<string, ScannedBibleReference>()
  found.forEach(({ canonical, occurrence }) => {
    const key = canonical.normalized.toLocaleLowerCase()
    const existing = byKey.get(key)
    if (existing) {
      existing.occurrences.push(occurrence)
    } else {
      const scanned = { ...canonical, occurrences: [occurrence] }
      byKey.set(key, scanned)
      references.push(scanned)
    }
  })
  return references
}

export const normalizeBibleReference = (
  input: string
): Omit<ScannedBibleReference, 'occurrences'> => {
  const suffix = input.match(/@([a-z][a-z0-9-]*)\s*$/iu)
  const translationKey = suffix?.[1].toLowerCase()
  if (
    translationKey &&
    getBibleVersion(translationKey).key !== translationKey
  ) {
    throw new Error(`Unknown translation: ${translationKey}`)
  }
  const reference = suffix ? input.slice(0, suffix.index).trim() : input.trim()
  return canonicalize(reference, translationKey)
}
