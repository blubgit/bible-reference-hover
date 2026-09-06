import {
  Editor,
  HoverParent,
  MarkdownPostProcessorContext,
  Notice,
  Point,
  TFile,
} from 'obsidian'
import type BibleReferencePlugin from '../main'
import { scanBibleReferences } from '../utils/scanBibleReferences'
import { BibleReferenceLookup } from './BibleReferenceLookup'
import { BibleReferencePopover } from './BibleReferencePopover'
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
    waitTime = this.plugin.settings.hoverPreviewDelayMs ?? 300
  ): void {
    const references = scanBibleReferences(source.text)
    if (references.length === 0) return
    this.dismissPopovers()
    let popover: BibleReferencePopover
    popover = new BibleReferencePopover(
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
      }
    )
    // HoverPopover assigns itself to hoverPopover only when its delay expires.
    // Assigning it there early makes Obsidian mistake it for an older popover
    // and dismiss the new popover from inside HoverPopover.onShow().
    this.pendingPopover = popover
  }

  public openEditorSelection(editor: Editor, point?: Point): void {
    const text = editor.getSelection()
    const references = scanBibleReferences(text)
    if (references.length === 0) {
      new Notice('No Bible references found in the selection.')
      return
    }
    const start = editor.getCursor('from')
    const end = editor.getCursor('to')
    this.open(null, new EditorSourceTarget(editor, start, text, end), point, 0)
  }

  public async openReadingBlock(
    targetEl: HTMLElement,
    blockEl: HTMLElement,
    context: MarkdownPostProcessorContext
  ): Promise<void> {
    const info = context.getSectionInfo(blockEl)
    const file = this.plugin.app.vault.getAbstractFileByPath(context.sourcePath)
    if (!info || !(file instanceof TFile)) return
    const content = await this.plugin.app.vault.cachedRead(file)
    const range = lineRangeToOffsets(content, info.lineStart, info.lineEnd)
    this.open(
      targetEl,
      new FileSourceTarget(
        this.plugin.app.vault,
        file,
        range.from,
        range.text,
        range.to,
        content
      )
    )
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
