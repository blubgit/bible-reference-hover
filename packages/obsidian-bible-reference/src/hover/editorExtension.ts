import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from '@codemirror/view'
import type BibleReferencePlugin from '../main'
import { scanBibleReferences } from '../utils/scanBibleReferences'
import { BibleReferenceController } from './BibleReferenceController'
import { CodeMirrorSourceTarget } from './SourceTarget'

const buildDecorations = (
  view: EditorView,
  enabled: boolean
): DecorationSet => {
  if (!enabled) return Decoration.none
  const source = view.state.doc.toString()
  const builder = new RangeSetBuilder<Decoration>()
  const occurrences = scanBibleReferences(source)
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
  const current = view.state.doc.lineAt(position)
  const trimmed = current.text.trimStart()
  if (/^#{1,6}\s/u.test(trimmed) || /^(?:[-+*]|\d+[.)])\s/u.test(trimmed)) {
    return { from: current.from, to: current.to, text: current.text }
  }

  let first = current.number
  let last = current.number
  while (first > 1 && view.state.doc.line(first - 1).text.trim() !== '') first--
  while (
    last < view.state.doc.lines &&
    view.state.doc.line(last + 1).text.trim() !== ''
  ) {
    last++
  }
  const from = view.state.doc.line(first).from
  const to = view.state.doc.line(last).to
  return { from, to, text: view.state.doc.sliceString(from, to) }
}

export const createBibleReferenceEditorExtension = (
  plugin: BibleReferencePlugin,
  controller: BibleReferenceController
) =>
  ViewPlugin.fromClass(
    class {
      public decorations: DecorationSet

      public constructor(private readonly view: EditorView) {
        this.decorations = buildDecorations(
          view,
          !!plugin.settings.enableHoverPreviews &&
            !!plugin.settings.hoverPreviewInLivePreview
        )
      }

      public update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(
            update.view,
            !!plugin.settings.enableHoverPreviews &&
              !!plugin.settings.hoverPreviewInLivePreview
          )
        }
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
    },
    {
      decorations: (value) => value.decorations,
      eventHandlers: {
        mouseover(event) {
          const target = (event.target as HTMLElement | null)?.closest(
            '.obr-bible-reference'
          ) as HTMLElement | null
          if (target) this.open(target, false)
          return false
        },
        focusin(event) {
          const target = (event.target as HTMLElement | null)?.closest(
            '.obr-bible-reference'
          ) as HTMLElement | null
          if (target) this.open(target, true)
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
