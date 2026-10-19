import {
  Editor,
  HoverParent,
  MarkdownPostProcessorContext,
  Notice,
  Point,
  TFile,
} from 'obsidian'
import type BibleReferencePlugin from '../main'
import {
  scanBibleReferences,
  ScannedBibleReference,
} from '../utils/scanBibleReferences'
import { BibleReferenceLookup } from './BibleReferenceLookup'
import { BibleReferenceModal } from './BibleReferenceModal'
import { BibleReferencePopover } from './BibleReferencePopover'
import { embedFullNote } from './embedFullNote'
import { findSourceBlock } from './findSourceBlock'
import {
  EditorSourceTarget,
  FileSourceTarget,
  lineRangeToOffsets,
  SourceTarget,
} from './SourceTarget'

export class BibleReferenceController implements HoverParent {
  public hoverPopover: BibleReferencePopover | null = null
  public readonly lookup: BibleReferenceLookup
  private pendingPopover: BibleReferencePopover | null = null

  public constructor(private readonly plugin: BibleReferencePlugin) {
    this.lookup = new BibleReferenceLookup(() => this.plugin.settings)
  }

  public open(
    targetEl: HTMLElement | null,
    source: SourceTarget,
    point?: Point,
    waitTime = this.plugin.settings.hoverPreviewDelayMs ?? 300,
    hoveredReference?: string
  ): void {
    const references = scanBibleReferences(source.text, this.scanOptions())
    if (references.length === 0) return
    this.dismissPopovers()
    const popover = new BibleReferencePopover(
      this,
      source,
      references,
      this.lookup,
      () => this.plugin.settings,
      targetEl,
      waitTime,
      point,
      () => {
        if (this.pendingPopover === popover) this.pendingPopover = null
      },
      hoveredReference
    )
    // HoverPopover assigns itself to hoverPopover only when its delay expires.
    // Assigning it there early makes Obsidian mistake it for an older popover
    // and dismiss the new popover from inside HoverPopover.onShow().
    this.pendingPopover = popover
  }

  public openEditorSelection(editor: Editor, point?: Point): void {
    const text = editor.getSelection()
    const references = scanBibleReferences(text, this.scanOptions())
    if (references.length === 0) {
      new Notice('No Bible references found in the selection.')
      return
    }
    const start = editor.getCursor('from')
    const end = editor.getCursor('to')
    this.open(null, new EditorSourceTarget(editor, start, text, end), point, 0)
  }

  public embedFullNote(editor: Editor): Promise<void> {
    return embedFullNote(
      editor,
      this.lookup,
      () => this.plugin.settings,
      this.scanOptions()
    )
  }

  public async openReadingBlock(
    targetEl: HTMLElement,
    blockEl: HTMLElement,
    context: MarkdownPostProcessorContext,
    hoveredReference?: string
  ): Promise<void> {
    const info = context.getSectionInfo(blockEl)
    const file = this.plugin.app.vault.getAbstractFileByPath(context.sourcePath)
    if (!info || !(file instanceof TFile)) return
    const content = await this.plugin.app.vault.cachedRead(file)
    // Obsidian reports a single list item as its own section; widen it to the
    // surrounding list so reading view matches Live Preview.
    const block = findSourceBlock(content.split('\n'), info.lineStart)
    const range = lineRangeToOffsets(
      content,
      Math.min(block.first, info.lineStart),
      Math.max(block.last, info.lineEnd)
    )
    this.open(
      targetEl,
      new FileSourceTarget(
        this.plugin.app.vault,
        file,
        range.from,
        range.text,
        range.to,
        content
      ),
      undefined,
      undefined,
      hoveredReference
    )
  }

  /** Shows only the tapped reference; touch devices have no hover. */
  public openTapped(reference: ScannedBibleReference): void {
    this.dismissPopovers()
    new BibleReferenceModal(this.plugin.app, this.lookup, reference).open()
  }

  public scanOptions(): { chapterOnly: boolean } {
    return {
      chapterOnly: this.plugin.settings.detectChapterOnlyReferences ?? true,
    }
  }

  public close(): void {
    this.dismissPopovers()
  }

  public focusFirstAction(): void {
    setTimeout(() => {
      ;(this.hoverPopover ?? this.pendingPopover)?.focusFirstAction()
    }, 0)
  }

  private dismissPopovers(): void {
    const popovers = new Set([this.pendingPopover, this.hoverPopover])
    this.pendingPopover = null
    popovers.forEach((popover) => popover?.dismiss())
  }
}
