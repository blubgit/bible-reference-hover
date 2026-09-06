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
    this.hoverPopover?.unload()
    this.hoverPopover = new BibleReferencePopover(
      this,
      source,
      references,
      this.lookup,
      () => this.plugin.settings,
      targetEl,
      waitTime,
      point
    )
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
    this.hoverPopover?.unload()
    this.hoverPopover = null
  }

  public focusFirstAction(): void {
    this.hoverPopover?.focusFirstAction()
  }
}
