import { DEFAULT_SETTINGS } from '../data/constants'
import { buildEmbeddedWidget } from './buildEmbeddedWidget'
import { ReferencePassage } from './BibleReferenceLookup'

const passages: ReferencePassage[] = [
  {
    reference: {
      query: 'John 3:16',
      normalized: 'John 3:16',
      occurrences: [{ raw: 'John 3.16', start: 0, end: 9 }],
    },
    translationKey: 'esv',
    verses: [
      { book_name: 'John', chapter: 3, verse: 16, text: 'For God so loved.' },
    ],
  },
]

describe('buildEmbeddedWidget', () => {
  test('builds a collapsed Bible callout', () => {
    const widget = buildEmbeddedWidget(passages, DEFAULT_SETTINGS)
    expect(widget).toContain('> [!bible]- John 3:16')
    expect(widget).toContain('> **John 3:16 (ESV)**')
    expect(widget).toContain('> **16.** For God so loved.')
  })

  test('builds a quote callout', () => {
    expect(
      buildEmbeddedWidget(passages, {
        ...DEFAULT_SETTINGS,
        embeddedWidgetStyle: 'quote-callout',
      })
    ).toContain('> [!quote]- John 3:16')
  })

  test('builds escaped HTML details', () => {
    const html = buildEmbeddedWidget(passages, {
      ...DEFAULT_SETTINGS,
      embeddedWidgetStyle: 'html-details',
    })
    expect(html).toContain('<details class="obr-bible-widget">')
    expect(html).toContain('<summary>John 3:16</summary>')
    expect(html).toContain('<p><strong>John 3:16 (ESV)</strong></p>')
    expect(html).toContain('<p><strong>16.</strong> For God so loved.</p>')
  })
})
