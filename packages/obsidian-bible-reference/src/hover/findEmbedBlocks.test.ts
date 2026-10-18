import { findEmbedBlocks } from './findEmbedBlocks'

const findAll = (...lines: string[]) => findEmbedBlocks(lines)
const find = (...lines: string[]) =>
  findAll(...lines)
    .filter((block) => !block.embedded)
    .map(({ first, last }) => ({ first, last }))

describe('findEmbedBlocks', () => {
  test('finds paragraphs and whole lists, not headings', () => {
    expect(
      find('# Title', '', 'John 3:16 is here.', '', '- Luke 8:2', '- Mark 1:1')
    ).toEqual([
      { first: 2, last: 2 },
      { first: 4, last: 5 },
    ])
  })

  test('finds ordered lists and keeps indented continuations', () => {
    expect(find('1. Heb 11:7', '   more text', '2. Rom 2:27')).toEqual([
      { first: 0, last: 2 },
    ])
  })

  test('skips frontmatter, code fences, quotes, callouts and details', () => {
    expect(
      find(
        '---',
        'note: John 3:16',
        '---',
        '```',
        'John 3:16',
        '```',
        '> quote John 3:16',
        '> [!bible]- John 3:16',
        '> **16.** text',
        '<details class="obr-bible-widget">',
        '<p>John 3:16</p>',
        '</details>',
        '',
        'Mark 1:1'
      )
    ).toEqual([{ first: 13, last: 13 }])
  })

  test('flags a block that already has a widget below it', () => {
    const blocks = findAll(
      '- Luke 8:2',
      '',
      '> [!bible]- Luke 8:2',
      '> text',
      '',
      'Mark 1:1'
    )
    expect(blocks.map((block) => block.embedded)).toEqual([true, false])
    expect(
      findAll(
        'Luke 8:2',
        '',
        '<details class="obr-bible-widget">',
        '</details>'
      )
    ).toEqual([{ first: 0, last: 0, embedded: true }])
  })

  test('handles an unclosed fence', () => {
    expect(find('```', 'John 3:16')).toEqual([])
  })
})
