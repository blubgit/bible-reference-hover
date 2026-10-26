import { HoverParent, HoverPopover, Notice, Point } from 'obsidian'
import { BibleReferencePluginSettings } from '../data/constants'
import {
  normalizeBibleReference,
  scanBibleReferences,
  ScannedBibleReference,
} from '../utils/scanBibleReferences'
import { BibleReferenceLookup, ReferencePassage } from './BibleReferenceLookup'
import { buildEmbeddedWidget } from './buildEmbeddedWidget'
import { createPassageSection, renderPassage } from './renderPassage'
import { SourceTarget } from './SourceTarget'

type PassageState =
  | { status: 'loading' }
  | { status: 'loaded'; passage: ReferencePassage }
  | { status: 'error'; message: string }

export class BibleReferencePopover extends HoverPopover {
  private references: ScannedBibleReference[]
  private states: PassageState[] = []
  private generation = 0
  private bodyEl: HTMLElement
  private referenceEl: HTMLElement
  private editButton: HTMLButtonElement
  private embedButton: HTMLButtonElement
  private expandButton: HTMLButtonElement
  private closed = false
  /** Index of the only reference shown until the card is expanded. */
  private compactIndex: number | null = null

  public constructor(
    parent: HoverParent,
    private readonly source: SourceTarget,
    references: ScannedBibleReference[],
    private readonly lookup: BibleReferenceLookup,
    private readonly getSettings: () => BibleReferencePluginSettings,
    targetEl: HTMLElement | null,
    waitTime: number,
    staticPos?: Point,
    private readonly onClosed: () => void = () => {},
    hoveredReference?: string,
    private readonly confirmOverwrite: () => Promise<boolean> = async () => true
  ) {
    super(parent, targetEl, waitTime, staticPos)
    this.references = references
    const hoveredIndex = references.findIndex(
      (reference) => reference.normalized === hoveredReference
    )
    if (references.length > 1 && hoveredIndex >= 0) {
      this.compactIndex = hoveredIndex
    }
    this.hoverEl.addClass('obr-reference-popover')
    this.hoverEl.setAttr('role', 'dialog')
    this.hoverEl.setAttr('aria-label', 'Bible reference preview')

    const toolbar = this.hoverEl.createDiv({ cls: 'obr-reference-toolbar' })
    this.referenceEl = toolbar.createDiv({ cls: 'obr-reference-chips' })
    const actions = toolbar.createDiv({ cls: 'obr-reference-actions' })
    this.editButton = actions.createEl('button', {
      text: 'Edit references',
      attr: { type: 'button', 'aria-label': 'Edit references' },
    })
    this.embedButton = actions.createEl('button', {
      text: 'Embed verses',
      cls: 'mod-cta',
      attr: { type: 'button', 'aria-label': 'Embed verses' },
    })
    this.expandButton = actions.createEl('button', {
      text: 'Show all',
      attr: {
        type: 'button',
        'aria-label': `Show all ${references.length} references`,
      },
    })
    this.bodyEl = this.hoverEl.createDiv({ cls: 'obr-reference-passages' })

    this.registerDomEvent(this.editButton, 'click', () => this.beginEdit())
    this.registerDomEvent(this.embedButton, 'click', () => {
      void this.embed()
    })
    this.registerDomEvent(this.expandButton, 'click', () => this.expand())
    this.registerDomEvent(this.hoverEl, 'keydown', (event) => {
      if (event.key === 'Escape') this.unload()
    })
    this.applyMode()
    this.renderChips()
    void this.loadPassages()
  }

  public dismiss(): void {
    // Obsidian's runtime exposes hide(), but the public type declaration omits
    // it. Calling it is necessary to cancel delayed popovers and remove the
    // runtime's target listeners and global popover tracking.
    ;(this as unknown as { hide: () => void }).hide()
  }

  public override onunload(): void {
    super.onunload()
    if (this.closed) return
    this.closed = true
    this.onClosed()
  }

  public focusFirstAction(): void {
    if (this.compactIndex !== null) this.expandButton.focus()
    else this.editButton.focus()
  }

  private visibleIndexes(): number[] {
    return this.compactIndex === null
      ? this.references.map((_, index) => index)
      : [this.compactIndex]
  }

  private applyMode(): void {
    const compact = this.compactIndex !== null
    this.editButton.hidden = compact
    this.embedButton.hidden = compact
    this.expandButton.hidden = !compact
  }

  private expand(): void {
    this.compactIndex = null
    this.applyMode()
    this.renderChips()
    this.editButton.focus()
    void this.loadPassages()
  }

  private renderChips(): void {
    this.referenceEl.empty()
    const visible = this.visibleIndexes()
    this.referenceEl.setAttr(
      'aria-label',
      visible.map((index) => this.references[index].normalized).join(', ')
    )
    visible.forEach((referenceIndex, index) => {
      const reference = this.references[referenceIndex]
      if (index > 0) {
        this.referenceEl.createSpan({
          cls: 'obr-reference-separator',
          text: '+',
          attr: { 'aria-hidden': 'true' },
        })
      }
      this.referenceEl.createSpan({
        cls: 'obr-reference-chip',
        text: reference.normalized,
      })
    })
  }

  private async loadPassages(): Promise<void> {
    const generation = ++this.generation
    // Context suits one reference at a time; "Show all" stays compact.
    const withContext = this.visibleIndexes().length === 1
    this.states = this.references.map(() => ({ status: 'loading' }))
    this.renderPassages()
    await Promise.all(
      this.visibleIndexes().map(async (index) => {
        const reference = this.references[index]
        try {
          const passage = withContext
            ? await this.lookup.loadWithContext(reference)
            : await this.lookup.load(reference)
          if (generation !== this.generation) return
          this.states[index] = { status: 'loaded', passage }
        } catch (error) {
          if (generation !== this.generation) return
          this.states[index] = {
            status: 'error',
            message: error instanceof Error ? error.message : 'Lookup failed.',
          }
        }
        this.renderPassages()
      })
    )
  }

  private renderPassages(): void {
    this.bodyEl.empty()
    this.visibleIndexes().forEach((index) => {
      const reference = this.references[index]
      const state = this.states[index]
      if (!state || state.status === 'loading') {
        const section = this.createPassageSection(reference.normalized)
        section.createDiv({ cls: 'obr-reference-loading', text: 'Loading…' })
      } else if (state.status === 'error') {
        const section = this.createPassageSection(reference.normalized)
        section.createDiv({ cls: 'obr-reference-error', text: state.message })
      } else {
        renderPassage(this.bodyEl, state.passage)
      }
    })
    this.embedButton.disabled = !this.visibleIndexes().every(
      (index) => this.states[index]?.status === 'loaded'
    )
  }

  private createPassageSection(label: string): HTMLElement {
    return createPassageSection(this.bodyEl, label)
  }

  private beginEdit(): void {
    this.referenceEl.empty()
    this.editButton.disabled = true
    this.embedButton.disabled = true
    const inputs = this.references.map((reference) => {
      const row = this.referenceEl.createDiv({ cls: 'obr-reference-edit-row' })
      const input = row.createEl('input', {
        type: 'text',
        value: reference.normalized,
        attr: { 'aria-label': `Edit ${reference.normalized}` },
      })
      const error = row.createDiv({ cls: 'obr-reference-edit-error' })
      return { input, error }
    })
    const buttons = this.referenceEl.createDiv({
      cls: 'obr-reference-edit-actions',
    })
    const cancelButton = buttons.createEl('button', { text: 'Cancel' })
    this.registerDomEvent(cancelButton, 'click', () => {
      this.editButton.disabled = false
      this.renderChips()
      this.renderPassages()
    })
    const applyButton = buttons.createEl('button', {
      text: 'Apply',
      cls: 'mod-cta',
    })
    this.registerDomEvent(
      applyButton,
      'click',
      () => void this.applyEdits(inputs)
    )
    inputs[0]?.input.focus()
  }

  private async applyEdits(
    inputs: Array<{ input: HTMLInputElement; error: HTMLElement }>
  ): Promise<void> {
    const nextReferences: ScannedBibleReference[] = []
    let valid = true
    inputs.forEach(({ input, error }, index) => {
      error.empty()
      try {
        const normalized = normalizeBibleReference(input.value)
        nextReferences.push({
          ...normalized,
          occurrences: this.references[index].occurrences,
        })
      } catch (reason) {
        valid = false
        error.setText(
          reason instanceof Error ? reason.message : 'Invalid reference.'
        )
      }
    })
    if (!valid) return

    const changed = nextReferences.some(
      (reference, index) =>
        reference.normalized !== this.references[index].normalized
    )
    let choice: 'preview' | 'source' | null = 'preview'
    if (changed) choice = await this.chooseUpdateMode()
    if (!choice) {
      this.editButton.disabled = false
      this.renderChips()
      this.renderPassages()
      return
    }

    if (choice === 'source') {
      const nextSource = this.replaceOccurrences(nextReferences)
      if (!(await this.source.replace(nextSource))) {
        new Notice(
          'The note changed. Reopen the preview before updating references.'
        )
        return
      }
      this.references = scanBibleReferences(nextSource, {
        chapterOnly: this.getSettings().detectChapterOnlyReferences ?? true,
      })
    } else {
      this.references = nextReferences
    }
    this.editButton.disabled = false
    this.renderChips()
    await this.loadPassages()
  }

  private chooseUpdateMode(): Promise<'preview' | 'source' | null> {
    this.referenceEl.empty()
    this.referenceEl.createDiv({
      cls: 'obr-reference-edit-prompt',
      text: 'Apply these references only to the preview, or also update the note?',
    })
    const actions = this.referenceEl.createDiv({
      cls: 'obr-reference-edit-actions',
    })
    return new Promise((resolve) => {
      const cancel = actions.createEl('button', { text: 'Cancel' })
      const preview = actions.createEl('button', { text: 'Preview only' })
      const source = actions.createEl('button', {
        text: 'Update note',
        cls: 'mod-cta',
      })
      this.registerDomEvent(cancel, 'click', () => resolve(null))
      this.registerDomEvent(preview, 'click', () => resolve('preview'))
      this.registerDomEvent(source, 'click', () => resolve('source'))
      preview.focus()
    })
  }

  private replaceOccurrences(nextReferences: ScannedBibleReference[]): string {
    const replacements = this.references.flatMap((reference, index) =>
      reference.occurrences.map((occurrence) => ({
        start: occurrence.start,
        end: occurrence.end,
        value: nextReferences[index].normalized,
      }))
    )
    replacements.sort((a, b) => b.start - a.start)
    return replacements.reduce(
      (text, replacement) =>
        text.slice(0, replacement.start) +
        replacement.value +
        text.slice(replacement.end),
      this.source.text
    )
  }

  private async embed(): Promise<void> {
    const passages = this.states.flatMap((state) =>
      state.status === 'loaded' ? [state.passage] : []
    )
    if (passages.length !== this.references.length) return
    const widget = buildEmbeddedWidget(passages, this.getSettings())
    const overwrite = this.source.hasEmbedded()
    if (overwrite && !(await this.confirmOverwrite())) return
    if (await this.source.insertAfter(widget, overwrite)) {
      new Notice('Bible verses embedded.')
    } else {
      new Notice('The note changed. Reopen the preview before embedding.')
    }
  }
}
