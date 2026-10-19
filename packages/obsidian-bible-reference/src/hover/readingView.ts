import {
  MarkdownPostProcessorContext,
  MarkdownRenderChild,
  Platform,
} from 'obsidian'
import type BibleReferencePlugin from '../main'
import { scanBibleReferences } from '../utils/scanBibleReferences'
import { BibleReferenceController } from './BibleReferenceController'
import { nonOverlapping } from './nonOverlapping'

const BLOCK_SELECTOR = 'p, h1, h2, h3, h4, h5, h6, li, blockquote'
const EXCLUDED_SELECTOR =
  'code, pre, a, .obr-bible-reference, .callout[data-callout="bible"], .callout[data-callout="quote"]'

class ReadingReferenceChild extends MarkdownRenderChild {
  public constructor(
    containerEl: HTMLElement,
    private readonly controller: BibleReferenceController,
    private readonly context: MarkdownPostProcessorContext
  ) {
    super(containerEl)
  }

  public decorate(): void {
    const walker = this.containerEl.doc.createTreeWalker(this.containerEl, 4)
    const nodes: Text[] = []
    let node: Node | null
    while ((node = walker.nextNode())) {
      const textNode = node as Text
      const parent = textNode.parentElement
      if (!parent || parent.closest(EXCLUDED_SELECTOR)) continue
      if (
        scanBibleReferences(textNode.data, {
          excludeMarkdown: false,
          ...this.controller.scanOptions(),
        }).length
      ) {
        nodes.push(textNode)
      }
    }
    nodes.forEach((textNode) => {
      // Decoration is cosmetic. An error here must never abort rendering:
      // other renderers, such as PDF exporters, wait on the post-processor.
      try {
        this.decorateTextNode(textNode)
      } catch (error) {
        console.warn('Bible Reference Hover: skipped a text node', error)
      }
    })
  }

  private decorateTextNode(textNode: Text): void {
    const references = scanBibleReferences(textNode.data, {
      excludeMarkdown: false,
      ...this.controller.scanOptions(),
    })
    const owners = new Map(
      references.flatMap((reference) =>
        reference.occurrences.map((occurrence) => [occurrence, reference])
      )
    )
    const occurrences = nonOverlapping(
      [...owners.keys()],
      textNode.length
    ).reverse()
    occurrences.forEach((occurrence) => {
      const match = textNode.splitText(occurrence.start)
      match.splitText(occurrence.end - occurrence.start)
      const span = textNode.doc.createElement('span')
      span.className = 'obr-bible-reference'
      span.tabIndex = 0
      span.setAttr('role', 'button')
      span.setAttr('aria-label', `Preview ${occurrence.raw}`)
      match.parentNode?.insertBefore(span, match)
      span.appendChild(match)
      const reference = owners.get(occurrence)
      if (Platform.isMobile) {
        if (reference) {
          this.registerDomEvent(span, 'click', () =>
            this.controller.openTapped(reference)
          )
        }
        return
      }
      this.registerDomEvent(span, 'mouseenter', () => {
        void this.controller.openReadingBlock(
          span,
          this.containerEl,
          this.context,
          reference?.normalized
        )
      })
      this.registerDomEvent(span, 'focus', () => {
        void this.controller.openReadingBlock(
          span,
          this.containerEl,
          this.context,
          reference?.normalized
        )
      })
      this.registerDomEvent(span, 'keydown', (event) => {
        if (event.key !== 'Tab' || event.shiftKey) return
        event.preventDefault()
        void this.controller
          .openReadingBlock(
            span,
            this.containerEl,
            this.context,
            reference?.normalized
          )
          .then(() => this.controller.focusFirstAction())
      })
    })
  }
}

export const registerReadingView = (
  plugin: BibleReferencePlugin,
  controller: BibleReferenceController
): void => {
  plugin.registerMarkdownPostProcessor((el, context) => {
    if (
      !plugin.settings.enableHoverPreviews ||
      !plugin.settings.hoverPreviewInReadingView
    ) {
      return
    }
    const blocks = new Set<HTMLElement>()
    if (el.matches(BLOCK_SELECTOR)) blocks.add(el)
    el.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((block) => {
      if (block.matches('blockquote') && block.querySelector(BLOCK_SELECTOR))
        return
      blocks.add(block)
    })
    blocks.forEach((block) => {
      if (block.closest('.callout[data-callout="bible"]')) return
      const child = new ReadingReferenceChild(block, controller, context)
      context.addChild(child)
      child.decorate()
    })
  })
}
