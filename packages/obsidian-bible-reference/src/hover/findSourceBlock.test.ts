import { findSourceBlock } from './findSourceBlock'

const note = [
  '### A. Good works as witness',
  '- Matt 5:16 — others see your good works',
  '- 1 Pet 3:1, 3:15-16 — won "without a word"',
  '  continued on an indented line',
  '- Titus 2:8, 2:10 — opponent shamed',
  '',
  '### B. Faithful conduct',
  '1. Heb 11:7 — Noah',
  '2. Rom 2:27 — the obedient judge',
  'John 3:16 and',
  'Eph 2:8',
]

describe('findSourceBlock', () => {
  test('keeps a heading on its own line', () => {
    expect(findSourceBlock(note, 0)).toEqual({ first: 0, last: 0 })
  })

  test('expands the first list item to the whole list', () => {
    expect(findSourceBlock(note, 1)).toEqual({ first: 1, last: 4 })
  })

  test('expands a later list item to the whole list', () => {
    expect(findSourceBlock(note, 4)).toEqual({ first: 1, last: 4 })
  })

  test('stops an ordered list at the following paragraph', () => {
    expect(findSourceBlock(note, 7)).toEqual({ first: 7, last: 8 })
  })

  test('keeps hard-wrapped paragraph lines together', () => {
    expect(findSourceBlock(note, 10)).toEqual({ first: 9, last: 10 })
  })
})
