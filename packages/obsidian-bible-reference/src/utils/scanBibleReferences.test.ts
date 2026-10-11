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

  test('treats a period without a following digit as sentence punctuation', () => {
    const source = 'Ephesians 3:3-6.\n1 John 1:4-5'
    const result = scanBibleReferences(source)

    expect(result).toHaveLength(2)
    expect(result[0].normalized).toBe('Ephesians 3:3–6')
    expect(result[0].occurrences).toEqual([
      { raw: 'Ephesians 3:3-6', start: 0, end: source.indexOf('.') },
    ])
    expect(result[1].normalized).toBe('1 John 1:4–5')
  })

  test('does not treat horizontal rules after frontmatter as frontmatter', () => {
    const source = [
      '---',
      'title: Trials, endurance, and genuine faith',
      '---',
      '',
      'A question.',
      '',
      '---',
      '',
      '- **James 1:2–4** — the testing of your faith produces endurance.',
      '',
      '---',
      '',
      'A concluding note.',
    ].join('\n')

    expect(
      scanBibleReferences(source).map((reference) => reference.normalized)
    ).toEqual(['James 1:2–4'])
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

describe('chapter-only references', () => {
  const scan = (text: string) =>
    scanBibleReferences(text, { chapterOnly: true }).map((reference) => [
      reference.normalized,
      reference.query,
    ])

  test('finds bare chapters between verse references in order', () => {
    expect(
      scan(
        "Deut 32:8-9 → Ps 82 → 1 Cor 2:6-8 → Eph 6:12: the saints' future role in judgment (1 Cor 6:2-3; Dan 7)"
      )
    ).toEqual([
      ['Deuteronomy 32:8–9', 'Deuteronomy 32:8-9'],
      ['Psalm 82', 'Psalm 82:1-8'],
      ['1 Corinthians 2:6–8', '1 Corinthians 2:6-8'],
      ['Ephesians 6:12', 'Ephesians 6:12'],
      ['1 Corinthians 6:2–3', '1 Corinthians 6:2-3'],
      ['Daniel 7', 'Daniel 7:1-28'],
    ])
  })

  test('expands a chapter range through the last verse of the last chapter', () => {
    expect(scan('Read Gen 1–3 tonight.')).toEqual([
      ['Genesis 1–3', 'Genesis 1:1-3:24'],
    ])
  })

  test('reads a bare number in a one-chapter book as a verse', () => {
    expect(scan('Contend for the faith (Jude 3).')).toEqual([])
    expect(scan('Jude 3 and Rom 1:16')).toEqual([
      ['Jude 3', 'Jude 1:3'],
      ['Romans 1:16', 'Romans 1:16'],
    ])
    expect(scan('Philemon 4-7')).toEqual([['Philemon 4–7', 'Philemon 1:4-7']])
  })

  test('rejects chapters a book does not have', () => {
    expect(scan('Ps 151 and Obad 22')).toEqual([])
  })

  test('ignores lowercase words and numbers inside verse references', () => {
    expect(scan('mark 5 items, then Matt 5:16, 18')).toEqual([
      ['Matthew 5:16, 18', 'Matthew 5:16, 18'],
    ])
  })

  test('trusts ambiguous book names only beside another reference', () => {
    expect(scan('Dan 7 won the race.')).toEqual([])
    expect(scan('Dan 7 won.\n\nSee Rom 8:28.')).toEqual([
      ['Romans 8:28', 'Romans 8:28'],
    ])
    expect(scan('Dan 7 and Rev 13 both use beasts.')).toEqual([
      ['Daniel 7', 'Daniel 7:1-28'],
      ['Revelation 13', 'Revelation 13:1-18'],
    ])
  })

  test('keeps a translation suffix', () => {
    expect(scan('Ps 23@NKJV')).toEqual([['Psalm 23@nkjv', 'Psalm 23:1-6']])
  })

  test('is off unless requested', () => {
    expect(scanBibleReferences('Ps 82 and Rom 8:28')).toHaveLength(1)
  })

  test('normalizes a typed chapter-only reference', () => {
    expect(normalizeBibleReference('Psalm 82')).toEqual({
      query: 'Psalm 82:1-8',
      normalized: 'Psalm 82',
      translationKey: undefined,
    })
  })
})
