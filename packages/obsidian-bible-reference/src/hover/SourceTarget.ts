import { Editor, EditorPosition, TFile, Vault } from 'obsidian'
import { EditorView } from '@codemirror/view'

export interface SourceTarget {
  readonly text: string
  replace(nextText: string): Promise<boolean>
  insertAfter(markdown: string): Promise<boolean>
}

const advancePosition = (
  start: EditorPosition,
  text: string
): EditorPosition => {
  const lines = text.split('\n')
  return lines.length === 1
    ? { line: start.line, ch: start.ch + text.length }
    : {
        line: start.line + lines.length - 1,
        ch: lines[lines.length - 1].length,
      }
}

export class EditorSourceTarget implements SourceTarget {
  private end: EditorPosition

  public constructor(
    private readonly editor: Editor,
    private readonly start: EditorPosition,
    public text: string,
    end: EditorPosition
  ) {
    this.end = end
  }

  public async replace(nextText: string): Promise<boolean> {
    if (this.editor.getRange(this.start, this.end) !== this.text) return false
    this.editor.replaceRange(nextText, this.start, this.end)
    this.text = nextText
    this.end = advancePosition(this.start, nextText)
    return true
  }

  public async insertAfter(markdown: string): Promise<boolean> {
    if (this.editor.getRange(this.start, this.end) !== this.text) return false
    this.editor.replaceRange(`\n\n${markdown}`, this.end)
    return true
  }
}

export class CodeMirrorSourceTarget implements SourceTarget {
  private to: number

  public constructor(
    private readonly view: EditorView,
    private readonly from: number,
    public text: string,
    to: number
  ) {
    this.to = to
  }

  public async replace(nextText: string): Promise<boolean> {
    if (this.view.state.doc.sliceString(this.from, this.to) !== this.text) {
      return false
    }
    this.view.dispatch({
      changes: { from: this.from, to: this.to, insert: nextText },
    })
    this.text = nextText
    this.to = this.from + nextText.length
    return true
  }

  public async insertAfter(markdown: string): Promise<boolean> {
    if (this.view.state.doc.sliceString(this.from, this.to) !== this.text) {
      return false
    }
    this.view.dispatch({
      changes: { from: this.to, insert: `\n\n${markdown}` },
    })
    return true
  }
}

export class FileSourceTarget implements SourceTarget {
  private fileSnapshot: string

  public constructor(
    private readonly vault: Vault,
    private readonly file: TFile,
    private readonly from: number,
    public text: string,
    private to: number,
    fileSnapshot: string
  ) {
    this.fileSnapshot = fileSnapshot
  }

  public async replace(nextText: string): Promise<boolean> {
    let changed = false
    let nextSnapshot = this.fileSnapshot
    await this.vault.process(this.file, (current) => {
      if (
        current !== this.fileSnapshot ||
        current.slice(this.from, this.to) !== this.text
      ) {
        return current
      }
      nextSnapshot =
        current.slice(0, this.from) + nextText + current.slice(this.to)
      changed = true
      return nextSnapshot
    })
    if (changed) {
      this.text = nextText
      this.to = this.from + nextText.length
      this.fileSnapshot = nextSnapshot
    }
    return changed
  }

  public async insertAfter(markdown: string): Promise<boolean> {
    let changed = false
    let nextSnapshot = this.fileSnapshot
    await this.vault.process(this.file, (current) => {
      if (
        current !== this.fileSnapshot ||
        current.slice(this.from, this.to) !== this.text
      ) {
        return current
      }
      nextSnapshot =
        current.slice(0, this.to) + `\n\n${markdown}` + current.slice(this.to)
      changed = true
      return nextSnapshot
    })
    if (changed) this.fileSnapshot = nextSnapshot
    return changed
  }
}

export const lineRangeToOffsets = (
  content: string,
  lineStart: number,
  lineEnd: number
): { from: number; to: number; text: string } => {
  const lines = content.split('\n')
  const from = lines
    .slice(0, lineStart)
    .reduce((sum, line) => sum + line.length + 1, 0)
  const selected = lines.slice(lineStart, lineEnd + 1).join('\n')
  return { from, to: from + selected.length, text: selected }
}
