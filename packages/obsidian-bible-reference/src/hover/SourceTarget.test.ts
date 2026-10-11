import { lineRangeToOffsets } from './SourceTarget'

describe('lineRangeToOffsets', () => {
  test('returns an inclusive Markdown line range', () => {
    expect(lineRangeToOffsets('first\nJohn 3:16\nlast', 1, 1)).toEqual({
      from: 6,
      to: 15,
      text: 'John 3:16',
    })
  })

  test('keeps hard-wrapped paragraph lines together', () => {
    expect(
      lineRangeToOffsets('before\nJohn 3:16\nand Eph 2.3\nafter', 1, 2)
    ).toEqual({
      from: 7,
      to: 28,
      text: 'John 3:16\nand Eph 2.3',
    })
  })
})
