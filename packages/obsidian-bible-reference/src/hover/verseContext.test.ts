import { buildContextQuery, clampContextVerses } from './verseContext'

const verses = (book: string, chapter: number, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    book_name: book,
    chapter,
    verse: from + i,
    text: '',
  }))

describe('buildContextQuery', () => {
  test('adds verses on both sides of a single verse', () => {
    expect(buildContextQuery('John 8:44', verses('John', 8, 44, 44), 7)).toBe(
      'John 8:37-51'
    )
  })

  test('wraps a range', () => {
    expect(
      buildContextQuery('Genesis 3:1-5', verses('Genesis', 3, 1, 5), 2)
    ).toBe('Genesis 2:24-3:7')
  })

  test('crosses into the previous chapter at a chapter start', () => {
    // John 7 has 53 verses.
    expect(buildContextQuery('John 8:2', verses('John', 8, 2, 2), 7)).toBe(
      'John 7:48-8:9'
    )
  })

  test('crosses into the next chapter at a chapter end', () => {
    // John 8 has 59 verses.
    expect(buildContextQuery('John 8:58', verses('John', 8, 58, 58), 3)).toBe(
      'John 8:55-9:2'
    )
  })

  test('stops at the start and end of the book', () => {
    expect(
      buildContextQuery('Genesis 1:2', verses('Genesis', 1, 2, 2), 7)
    ).toBe('Genesis 1:1-9')
    expect(buildContextQuery('Jude 1:24', verses('Jude', 1, 24, 24), 7)).toBe(
      'Jude 1:17-25'
    )
  })

  test('skips whole chapters', () => {
    expect(
      buildContextQuery('Psalms 82:1-8', verses('Psalms', 82, 1, 8), 7)
    ).toBeNull()
  })

  test('spans from the lowest to the highest verse of a list', () => {
    const list = [
      ...verses('Romans', 8, 2, 7),
      ...verses('Romans', 8, 27, 27),
      ...verses('Romans', 8, 34, 36),
    ]
    expect(buildContextQuery('Romans 8:2-7, 27, 34-36', list, 7)).toBe(
      'Romans 7:20-9:4'
    )
  })

  test('spans chapters for a list that crosses a chapter', () => {
    const list = [...verses('John', 3, 16, 16), ...verses('John', 4, 2, 2)]
    expect(buildContextQuery('John 3:16; 4:2', list, 2)).toBe('John 3:14-4:4')
  })
})

describe('clampContextVerses', () => {
  test('defaults and clamps', () => {
    expect(clampContextVerses(undefined)).toBe(7)
    expect(clampContextVerses(0)).toBe(1)
    expect(clampContextVerses(99)).toBe(30)
    expect(clampContextVerses(4.6)).toBe(5)
  })
})
