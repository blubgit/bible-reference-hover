import { DEFAULT_SETTINGS } from '../data/constants'
import { scanBibleReferences } from '../utils/scanBibleReferences'
import { BibleReferencePopover } from './BibleReferencePopover'
import { SourceTarget } from './SourceTarget'

describe('BibleReferencePopover passage labels', () => {
  test('shows the book, chapter, and verse for comma-separated chapters', async () => {
    const references = scanBibleReferences('1 John 1:4-5, 2:5-6, 3:1-2')
    const source: SourceTarget = {
      text: '1 John 1:4-5, 2:5-6, 3:1-2',
      replace: async () => true,
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

    const rendered = popover.hoverEl.textContent ?? ''
    expect(rendered).toContain('1 John 1:4. ')
    expect(rendered).toContain('1 John 1:5. ')
    expect(rendered).toContain('1 John 2:5. ')
    expect(rendered).toContain('1 John 2:6. ')
    expect(rendered).toContain('1 John 3:1. ')
    expect(rendered).toContain('1 John 3:2. ')
  })
})
