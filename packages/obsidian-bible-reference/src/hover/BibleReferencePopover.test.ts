import { DEFAULT_SETTINGS } from '../data/constants'
import { scanBibleReferences } from '../utils/scanBibleReferences'
import { BibleReferencePopover } from './BibleReferencePopover'
import { SourceTarget } from './SourceTarget'

describe('BibleReferencePopover passage labels', () => {
  test('uses chapter headings and numeric verse labels across chapters', async () => {
    const references = scanBibleReferences('1 John 1:4-5, 2:5-6, 3:1-2')
    const source: SourceTarget = {
      text: '1 John 1:4-5, 2:5-6, 3:1-2',
      replace: async () => true,
      hasEmbedded: () => false,
      insertAfter: async () => true,
    }
    const verses = [
      { book_name: '1 John', chapter: 1, verse: 4, text: 'Verse 1:4' },
      { book_name: '1 John', chapter: 1, verse: 5, text: 'Verse 1:5' },
      { book_name: '1 John', chapter: 2, verse: 5, text: 'Verse 2:5' },
      { book_name: '1 John', chapter: 2, verse: 6, text: 'Verse 2:6' },
      { book_name: '1 John', chapter: 3, verse: 1, text: 'Verse 3:1' },
      { book_name: '1 John', chapter: 3, verse: 2, text: 'Verse 3:2' },
    ]
    const lookup = {
      load: async (reference: (typeof references)[number]) => ({
        reference,
        translationKey: 'esv',
        verses,
      }),
    }
    const parent = { hoverPopover: null }

    const popover = new BibleReferencePopover(
      parent,
      source,
      references,
      lookup as never,
      () => DEFAULT_SETTINGS,
      null,
      0
    )
    await new Promise((resolve) => setTimeout(resolve, 5))

    const hoverEl = popover.hoverEl as unknown as {
      findByTagName(tagName: string): Array<{ textContent: string }>
    }
    const headings = hoverEl
      .findByTagName('h4')
      .map((element) => element.textContent)
    const verseLabels = hoverEl
      .findByTagName('strong')
      .map((element) => element.textContent)

    expect(headings).toEqual(['1 John 1:4–5', '1 John 2:5–6', '1 John 3:1–2'])
    expect(verseLabels).toEqual(['4. ', '5. ', '5. ', '6. ', '1. ', '2. '])
  })

  test('shows only the hovered reference until expanded', async () => {
    const references = scanBibleReferences('John 3:16; Romans 8:28')
    const source: SourceTarget = {
      text: 'John 3:16; Romans 8:28',
      replace: async () => true,
      hasEmbedded: () => false,
      insertAfter: async () => true,
    }
    const load = jest.fn(async (reference: (typeof references)[number]) => ({
      reference,
      translationKey: 'esv',
      verses: [{ book_name: 'Romans', chapter: 8, verse: 28, text: 'x' }],
    }))
    const popover = new BibleReferencePopover(
      { hoverPopover: null },
      source,
      references,
      { load } as never,
      () => DEFAULT_SETTINGS,
      null,
      0,
      undefined,
      () => {},
      'Romans 8:28'
    )
    await new Promise((resolve) => setTimeout(resolve, 5))

    expect(load).toHaveBeenCalledTimes(1)
    expect(load.mock.calls[0][0].normalized).toBe('Romans 8:28')

    const hoverEl = popover.hoverEl as unknown as {
      findByTagName(tagName: string): Array<{ textContent: string }>
    }
    expect(
      hoverEl.findByTagName('h4').map((element) => element.textContent)
    ).toEqual(['Romans 8:28'])
  })
})
