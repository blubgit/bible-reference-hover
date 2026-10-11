import { DEFAULT_SETTINGS } from '../data/constants'
import { BibleReferenceController } from './BibleReferenceController'
import { SourceTarget } from './SourceTarget'

describe('BibleReferenceController hover lifecycle', () => {
  test('lets Obsidian attach a delayed popover without it hiding itself', async () => {
    const plugin = {
      settings: { ...DEFAULT_SETTINGS, hoverPreviewDelayMs: 0 },
    }
    const controller = new BibleReferenceController(plugin as never)
    controller.lookup.load = () => new Promise(() => {})
    const source: SourceTarget = {
      text: 'John 3:16',
      replace: async () => true,
      insertAfter: async () => true,
    }

    controller.open(null, source, undefined, 0)
    await new Promise((resolve) => setTimeout(resolve, 5))

    expect(controller.hoverPopover).not.toBeNull()
    expect(controller.hoverPopover?.hoverEl.isConnected).toBe(true)
  })
})
