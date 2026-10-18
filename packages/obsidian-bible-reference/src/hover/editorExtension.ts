import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import { Platform } from 'obsidian'
import type BibleReferencePlugin from '../main'
import { scanBibleReferences } from '../utils/scanBibleReferences'
import { BibleReferenceController } from './BibleReferenceController'
import { findSourceBlock } from './findSourceBlock'
import { CodeMirrorSourceTarget } from './SourceTarget'

const buildDecorations = (
  view: EditorView,
  enabled: boolean,
  chapterOnly: boolean
): DecorationSet => {
  if (!enabled) return Decoration.none
  const source = view.state.doc.toString()
  const builder = new RangeSetBuilder<Decoration>()
  const occurrences = scanBibleReferences(source, { chapterOnly })
    .flatMap((reference) => reference.occurrences)
    .sort((a, b) => a.start - b.start)
  occurrences.forEach((occurrence) => {
    builder.add(
      occurrence.start,
      occurrence.end,
      Decoration.mark({
        class: 'obr-bible-reference',
        attributes: {
          tabindex: '0',
          role: 'button',
          'aria-label': `Preview ${occurrence.raw}`,
        },
      })
    )
  })
  return builder.finish()
}

const findBlock = (
  view: EditorView,
  position: number
): { from: number; to: number; text: string } => {
  const { doc } = view.state
  const { first, last } = findSourceBlock(
    doc.toJSON(),
    doc.lineAt(position).number - 1
  )
  const from = doc.line(first + 1).from
  const to = doc.line(last + 1).to
  return { from, to, text: view.state.doc.sliceString(from, to) }
}

export const createBibleReferenceEditorExtension = (
  plugin: BibleReferencePlugin,
  controller: BibleReferenceController
) =>
  ViewPlugin.fromClass(
    class {
      public decorations: DecorationSet
      private optionsKey = ''

      public constructor(private readonly view: EditorView) {
        this.decorations = this.rebuild(view)
      }

      public update(update: ViewUpdate): void {
        // Decorations cover the whole note, so scrolling needs no rescan.
        // Rebuild only when the text or the relevant settings change.
        const enabled = this.isEnabled()
        const chapterOnly = this.chapterOnly()
        const key = `${enabled}:${chapterOnly}`
        if (update.docChanged || key !== this.optionsKey) {
          this.decorations = this.rebuild(update.view)
        }
      }

      private isEnabled(): boolean {
        return (
          !!plugin.settings.enableHoverPreviews &&
          !!plugin.settings.hoverPreviewInLivePreview
        )
      }

      private chapterOnly(): boolean {
        return plugin.settings.detectChapterOnlyReferences ?? true
      }

      private rebuild(view: EditorView): DecorationSet {
        const enabled = this.isEnabled()
        const chapterOnly = this.chapterOnly()
        this.optionsKey = `${enabled}:${chapterOnly}`
        return buildDecorations(view, enabled, chapterOnly)
      }

      public open(target: HTMLElement, immediate: boolean): void {
        if (
          !plugin.settings.enableHoverPreviews ||
          !plugin.settings.hoverPreviewInLivePreview
        ) {
          return
        }
        const position = this.view.posAtDOM(target)
        const block = findBlock(this.view, position)
        controller.open(
          target,
          new CodeMirrorSourceTarget(
            this.view,
            block.from,
            block.text,
            block.to
          ),
          undefined,
          immediate ? 0 : plugin.settings.hoverPreviewDelayMs
        )
      }

      public openTapped(target: HTMLElement, event: MouseEvent): void {
        if (
          !plugin.settings.enableHoverPreviews ||
          !plugin.settings.hoverPreviewInLivePreview
        ) {
          return
        }
        const position =
          this.view.posAtCoords({ x: event.clientX, y: event.clientY }) ??
          this.view.posAtDOM(target)
        const block = findBlock(this.view, position)
        const offset = position - block.from
        const reference = scanBibleReferences(
          block.text,
          controller.scanOptions()
        ).find((candidate) =>
          candidate.occurrences.some(
            (occurrence) =>
              occurrence.start <= offset && offset <= occurrence.end
          )
        )
        if (reference) controller.openTapped(reference)
      }
    },
    {
      decorations: (value) => value.decorations,
      eventHandlers: {
        mouseover(event) {
          if (Platform.isMobile) return false
          const target = (event.target as HTMLElement | null)?.closest(
            '.obr-bible-reference'
          ) as HTMLElement | null
          if (target) this.open(target, false)
          return false
        },
        focusin(event) {
          if (Platform.isMobile) return false
          const target = (event.target as HTMLElement | null)?.closest(
            '.obr-bible-reference'
          ) as HTMLElement | null
          if (target) this.open(target, true)
          return false
        },
        // Touch devices have no hover: a tap shows just that reference. The
        // tap still places the cursor, so editing keeps working.
        click(event) {
          if (!Platform.isMobile) return false
          const target = (event.target as HTMLElement | null)?.closest(
            '.obr-bible-reference'
          ) as HTMLElement | null
          if (target) this.openTapped(target, event)
          return false
        },
        keydown(event) {
          if (event.key !== 'Tab' || event.shiftKey) return false
          const target = (event.target as HTMLElement | null)?.closest(
            '.obr-bible-reference'
          ) as HTMLElement | null
          if (!target) return false
          event.preventDefault()
          this.open(target, true)
          controller.focusFirstAction()
          return true
        },
      },
    }
  )
