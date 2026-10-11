import { App, Modal } from 'obsidian'
import { ScannedBibleReference } from '../utils/scanBibleReferences'
import { BibleReferenceLookup } from './BibleReferenceLookup'
import { createPassageSection, renderPassage } from './renderPassage'

/**
 * Touch devices have no hover, so a tapped reference opens this read-only
 * view of that one passage instead of the multi-reference popover.
 */
export class BibleReferenceModal extends Modal {
  public constructor(
    app: App,
    private readonly lookup: BibleReferenceLookup,
    private readonly reference: ScannedBibleReference
  ) {
    super(app)
  }

  public onOpen(): void {
    this.modalEl.addClass('obr-reference-modal')
    const body = this.contentEl.createDiv({ cls: 'obr-reference-passages' })
    createPassageSection(body, this.reference.normalized).createDiv({
      cls: 'obr-reference-loading',
      text: 'Loading…',
    })
    void this.load(body)
  }

  public onClose(): void {
    this.contentEl.empty()
  }

  private async load(body: HTMLElement): Promise<void> {
    try {
      const passage = await this.lookup.load(this.reference)
      body.empty()
      renderPassage(body, passage)
    } catch (error) {
      body.empty()
      createPassageSection(body, this.reference.normalized).createDiv({
        cls: 'obr-reference-error',
        text: error instanceof Error ? error.message : 'Lookup failed.',
      })
    }
  }
}
