import { nonOverlapping } from './nonOverlapping'

const occurrence = (start: number, end: number) => ({ raw: '', start, end })

describe('nonOverlapping', () => {
  test('keeps the first of overlapping occurrences, in start order', () => {
    expect(nonOverlapping([occurrence(13, 28), occurrence(2, 14)], 40)).toEqual(
      [occurrence(2, 14)]
    )
  })

  test('keeps adjacent occurrences', () => {
    expect(nonOverlapping([occurrence(5, 9), occurrence(0, 5)], 9)).toEqual([
      occurrence(0, 5),
      occurrence(5, 9),
    ])
  })

  test('drops occurrences outside the text', () => {
    expect(nonOverlapping([occurrence(2, 14)], 12)).toEqual([])
  })
})
