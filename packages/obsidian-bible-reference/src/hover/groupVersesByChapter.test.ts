import { IVerse } from '../interfaces/IVerse'
import { groupVersesByChapter } from './groupVersesByChapter'

const verse = (chapter: number, number: number): IVerse => ({
  book_name: '1 John',
  chapter,
  verse: number,
  text: '',
})

describe('groupVersesByChapter', () => {
  test('creates one exact range heading for each introduced chapter', () => {
    const groups = groupVersesByChapter([
      verse(1, 4),
      verse(1, 5),
      verse(2, 5),
      verse(2, 6),
      verse(3, 1),
      verse(3, 2),
    ])

    expect(groups.map((group) => group.label)).toEqual([
      '1 John 1:4–5',
      '1 John 2:5–6',
      '1 John 3:1–2',
    ])
  })

  test('does not imply unrequested verses inside a chapter', () => {
    expect(groupVersesByChapter([verse(3, 16), verse(3, 18)])[0].label).toBe(
      '1 John 3:16, 18'
    )
  })
})
