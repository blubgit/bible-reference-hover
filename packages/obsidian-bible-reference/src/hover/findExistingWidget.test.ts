import { findExistingWidgetEnd } from './findExistingWidget'

describe('findExistingWidgetEnd', () => {
  test('returns null when nothing follows the block', () => {
    expect(findExistingWidgetEnd('John 3:16', 9)).toBeNull()
    expect(findExistingWidgetEnd('John 3:16\n\nOther text', 9)).toBeNull()
  })

  test('finds a callout widget and stops at its last quoted line', () => {
    const text =
      'John 3:16\n\n> [!bible]- John 3:16\n> **16.** For God\n\nAfter'
    const end = findExistingWidgetEnd(text, 9)
    expect(text.slice(9, end as number)).toBe(
      '\n\n> [!bible]- John 3:16\n> **16.** For God'
    )
  })

  test('finds a callout widget at the end of the note', () => {
    const text = 'John 3:16\n\n> [!quote]+ John 3:16\n> **16.** For God'
    expect(findExistingWidgetEnd(text, 9)).toBe(text.length)
  })

  test('finds an html details widget', () => {
    const text =
      'John 3:16\n\n<details class="obr-bible-widget">\n<summary>x</summary>\n</details>\nAfter'
    const end = findExistingWidgetEnd(text, 9)
    expect(text.slice(end as number)).toBe('\nAfter')
  })

  test('ignores unrelated callouts', () => {
    expect(
      findExistingWidgetEnd('John 3:16\n\n> [!note] hi\n> text', 9)
    ).toBeNull()
  })
})
