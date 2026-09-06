import { getBibleVersion } from '../data/BibleVersionCollection'
import { getFullBookName, isKnownBookName } from './bookNameReference'
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
const CHAPTER_VERSE = '\\d{1,3}\\s*[:.]\\s*(?:\\d{1,3}|a)\\b'
const ENDPOINT = '(?:(?:\\d{1,3}\\s*[:.]\\s*)?(?:\\d{1,3}|a)\\b)'
const RANGE = `(?:\\s*[${DASH_CLASS}]\\s*${ENDPOINT})?`
const REFERENCE_TAIL_REG = new RegExp(
  `^${CHAPTER_VERSE}${RANGE}(?:\\s*[,;]\\s*${ENDPOINT}${RANGE})*(?:\\s*@([a-z][a-z0-9-]*))?`,
  'iu'
)
const CHAPTER_VERSE_START_REG = new RegExp(CHAPTER_VERSE, 'giu')
const BOOK_SHAPE_REG =
  /^(?:[1-5]\.?\s*)?(?:[\p{L}\p{M}]+\.?)(?:\s+[\p{L}\p{M}]+\.?){0,5}$/u

const overlaps = (
  start: number,
  end: number,
  excluded: Array<{ start: number; end: number }>
): boolean => excluded.some((range) => start < range.end && end > range.start)

const collectMatches = (
  text: string,
  reg: RegExp,
  ranges: Array<{ start: number; end: number }>
): void => {
  reg.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = reg.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length })
    if (match[0].length === 0) reg.lastIndex++
  }
}

/** Markdown regions in which prose references must not be discovered. */
const getExcludedRanges = (
  text: string
): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = []
  collectMatches(text, /^---\s*$[\s\S]*?^---\s*$/gmu, ranges)
  collectMatches(text, /^(```|~~~)[^\n]*$[\s\S]*?^\1\s*$/gmu, ranges)
  collectMatches(text, /`+[^`\n]*`+/gu, ranges)
  collectMatches(text, /https?:\/\/[^\s<>)]+/giu, ranges)
  collectMatches(
    text,
    /<details\s+class=["']obr-bible-widget["'][^>]*>[\s\S]*?<\/details>/giu,
    ranges
  )
  collectMatches(text, /<[^>]*>/gu, ranges)
  collectMatches(
    text,
    /^>\s*\[!(?:bible|quote)\][^\n]*(?:\n>[^\n]*)*/gimu,
    ranges
  )
  return ranges
}

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
  const parsed = splitBibleReference(canonicalInput)
  const fullBookName = getFullBookName(parsed.bookName)
  const fullReference: VerseReference = { ...parsed, bookName: fullBookName }
  const bookMatch = canonicalInput.match(BOOK_REG)
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
  const normalizedTranslation = translationKey?.toLowerCase()
  return {
    query,
    normalized: `${display}${normalizedTranslation ? `@${normalizedTranslation}` : ''}`,
    translationKey: normalizedTranslation,
  }
}

/**
 * Discover, validate, normalize and deduplicate Bible references in prose.
 * References are returned in first-occurrence order while retaining every
 * source occurrence for safe source updates.
 */
export const scanBibleReferences = (
  text: string,
  options: { excludeMarkdown?: boolean } = { excludeMarkdown: true }
): ScannedBibleReference[] => {
  const excluded =
    options.excludeMarkdown === false ? [] : getExcludedRanges(text)
  const references: ScannedBibleReference[] = []
  const byKey = new Map<string, ScannedBibleReference>()
  CHAPTER_VERSE_START_REG.lastIndex = 0

  let chapterMatch: RegExpExecArray | null
  while ((chapterMatch = CHAPTER_VERSE_START_REG.exec(text)) !== null) {
    const chapterStart = chapterMatch.index
    const book = locateBook(text, chapterStart)
    if (!book) continue

    const tail = text.slice(chapterStart).match(REFERENCE_TAIL_REG)
    if (!tail) continue
    const translationKey = tail[1]?.toLowerCase()
    if (
      translationKey &&
      getBibleVersion(translationKey).key !== translationKey
    ) {
      continue
    }

    const end = chapterStart + tail[0].length
    if (/^\.\d/u.test(text.slice(end))) continue
    if (overlaps(book.start, end, excluded)) continue
    const raw = text.slice(book.start, end)
    const referenceWithoutTranslation = translationKey
      ? raw.slice(0, raw.lastIndexOf('@')).trimEnd()
      : raw

    try {
      const canonical = canonicalize(
        referenceWithoutTranslation,
        translationKey
      )
      const occurrence = { raw, start: book.start, end }
      const key = canonical.normalized.toLocaleLowerCase()
      const existing = byKey.get(key)
      if (existing) {
        existing.occurrences.push(occurrence)
      } else {
        const scanned = { ...canonical, occurrences: [occurrence] }
        byKey.set(key, scanned)
        references.push(scanned)
      }
      CHAPTER_VERSE_START_REG.lastIndex = end
    } catch {
      // Candidate shape matched, but chapter/verse metadata rejected it.
    }
  }

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
