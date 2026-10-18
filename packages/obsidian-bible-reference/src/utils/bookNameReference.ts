import Reference from 'bible-reference-toolkit'

const lookupBookId = (bookName: string, languageCode: string): number => {
  try {
    return Reference.bookIdFromTranslationAndName(languageCode, bookName)
  } catch {
    // fall back to a slower search across all supported languages
    return Reference.bookIdFromName(bookName)
  }
}

// Scanning a note probes the same words again and again, and every miss throws.
// Caching hits and misses keeps a scan from paying for that each time.
const bookIdCache = new Map<string, number | Error>()

export const getBookIdFromBookName = (
  bookName: string,
  languageCode: string = 'en'
): number => {
  const key = `${languageCode}\u0000${bookName}`
  let result = bookIdCache.get(key)
  if (result === undefined) {
    try {
      result = lookupBookId(bookName, languageCode)
    } catch (error) {
      result = error instanceof Error ? error : new Error(String(error))
    }
    bookIdCache.set(key, result)
  }
  if (result instanceof Error) throw result
  return result
}

const knownBookCache = new Map<string, boolean>()

/**
 * Reduce a book-name candidate to the longest trailing run of words the catalog
 * recognizes, and drop the periods abbreviations are written with.
 *
 * BOOK_REG matches greedily across whitespace so multi-word names survive whole
 * ("Song of Solomon"), which means it also swallows any prose in front of the
 * reference ("see Eph." -> "Eph"). Trimming only from the left keeps the match's
 * end position intact, so the chapter/verse remainder the caller slices off is
 * unaffected. An unrecognized candidate comes back as written, so downstream
 * errors still quote what the user typed.
 */
export const resolveBookName = (
  candidate: string,
  languageCode: string = 'en'
): string => {
  const words = candidate.trim().split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const attempt = words.slice(i).join(' ')
    try {
      getBookIdFromBookName(attempt, languageCode)
      return attempt.replace(/\./g, '')
    } catch {
      // not a book name; drop the leading word and try the shorter candidate
    }
  }
  return candidate.trim().replace(/\./g, '')
}

/**
 * Whether the catalog recognizes the candidate as a whole. Unlike
 * resolveBookName this does not shrink the candidate, so "Genesis" is a book
 * and "am reading Genesis" is not - which is what separates a reference from
 * prose that merely contains one.
 */
export const isKnownBookName = (
  candidate: string,
  languageCode: string = 'en'
): boolean => {
  const key = `${languageCode}\u0000${candidate}`
  let known = knownBookCache.get(key)
  if (known === undefined) {
    try {
      getBookIdFromBookName(candidate, languageCode)
      known = true
    } catch {
      known = false
    }
    knownBookCache.set(key, known)
  }
  return known
}

export const getFullBookName = (
  name: string,
  languageCode: string = 'en'
): string => {
  const bookId = getBookIdFromBookName(name, languageCode)

  try {
    return Reference.bookNameFromTranslationAndId(languageCode, bookId)
  } catch {
    return Reference.bookEnglishFullNameFromId(bookId)
  }
}

/**
 * Like getFullBookName, but returns the name as written when the catalog does
 * not recognize it instead of throwing. For callers that only need a lookup key
 * and already handle unknown books themselves.
 */
export const getCanonicalBookName = (
  name: string,
  languageCode: string = 'en'
): string => {
  try {
    return getFullBookName(name, languageCode)
  } catch {
    return name
  }
}
