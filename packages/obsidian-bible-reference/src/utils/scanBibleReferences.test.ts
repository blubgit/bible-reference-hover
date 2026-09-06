import {
  normalizeBibleReference,
  scanBibleReferences,
} from './scanBibleReferences'

describe('scanBibleReferences', () => {
  test.each([
    ['Eph 2:3-4', 'Ephesians 2:3–4'],
    ['Eph 2.3-4', 'Ephesians 2:3–4'],
    ['Eph. 2.3–4', 'Ephesians 2:3–4'],
    ['John 3.16-4.2', 'John 3:16–4:2'],
    ['John 3.16-4:2', 'John 3:16–4:2'],
    ['John 3.16, 18; 4.1', 'John 3:16, 18; 4:1'],
    ['1 John 1.9@ESV', '1 John 1:9@esv'],
  ])('normalizes %s', (input, expected) => {
    expect(scanBibleReferences(input)[0]?.normalized).toBe(expected)
  })

  test('finds independent references and deduplicates equivalent notation', () => {
    const result = scanBibleReferences(
      'Read Eph 2.3-4, then John 3:16. Compare Eph 2:3-4.'
    )
    expect(result.map((reference) => reference.normalized)).toEqual([
      'Ephesians 2:3–4',
      'John 3:16',
    ])
    expect(result[0].occurrences).toHaveLength(2)
  })

  test.each([
    'Version 3.16 is current.',
    'The date is 3.16.2026.',
    'Read John 3.',
    'Read Notabook 3.16.',
    '`John 3.16`',
    'https://example.com/John/3.16',
    '> [!bible]- John 3:16\n> verse text',
    '<details class="obr-bible-widget"><summary>John 3:16</summary></details>',
  ])('does not scan %s', (input) => {
    expect(scanBibleReferences(input)).toEqual([])
  })

  test('normalizes an edited reference', () => {
    expect(normalizeBibleReference('John 3.17@KJV')).toMatchObject({
      query: 'John 3:17',
      normalized: 'John 3:17@kjv',
      translationKey: 'kjv',
    })
  })
})
