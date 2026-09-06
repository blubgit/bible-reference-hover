import { IVerse } from '../interfaces/IVerse'

export interface VerseChapterGroup {
  label: string
  verses: IVerse[]
}

const formatVerseRanges = (verses: readonly IVerse[]): string => {
  const ranges: string[] = []
  let start = verses[0].verse
  let end = start

  const pushRange = (): void => {
    ranges.push(start === end ? `${start}` : `${start}–${end}`)
  }

  verses.slice(1).forEach(({ verse }) => {
    if (verse === end + 1) {
      end = verse
      return
    }
    pushRange()
    start = verse
    end = verse
  })
  pushRange()
  return ranges.join(', ')
}

export const groupVersesByChapter = (
  verses: readonly IVerse[]
): VerseChapterGroup[] => {
  const groups: VerseChapterGroup[] = []
  verses.forEach((verse) => {
    const current = groups[groups.length - 1]
    if (
      current &&
      current.verses[0].book_name === verse.book_name &&
      current.verses[0].chapter === verse.chapter
    ) {
      current.verses.push(verse)
      current.label = `${verse.book_name} ${verse.chapter}:${formatVerseRanges(
        current.verses
      )}`
      return
    }
    groups.push({
      label: `${verse.book_name} ${verse.chapter}:${verse.verse}`,
      verses: [verse],
    })
  })
  return groups
}
