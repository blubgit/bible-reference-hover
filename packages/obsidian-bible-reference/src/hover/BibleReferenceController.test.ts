import { Modal } from 'obsidian'
import { DEFAULT_SETTINGS } from '../data/constants'
import { normalizeBibleReference } from '../utils/scanBibleReferences'
import { BibleReferenceController } from './BibleReferenceController'
import { BibleReferenceModal } from './BibleReferenceModal'
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

describe('BibleReferenceController taps', () => {
  test('opens a modal for only the tapped reference', () => {
    const opened: unknown[] = []
    const originalOpen = Modal.prototype.open
    Modal.prototype.open = function (this: unknown) {
      opened.push(this)
    }
    const controller = new BibleReferenceController({
      app: {},
      settings: DEFAULT_SETTINGS,
    } as never)
    const reference = normalizeBibleReference('James 3:13-18')

    controller.openTapped({ ...reference, occurrences: [] })

    expect(opened).toHaveLength(1)
    expect(opened[0]).toBeInstanceOf(BibleReferenceModal)
    expect((opened[0] as { reference: unknown }).reference).toEqual({
      ...reference,
      occurrences: [],
    })
    Modal.prototype.open = originalOpen
  })
})
