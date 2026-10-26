import { App, Modal } from 'obsidian'

/** Asks whether to replace verses already embedded beneath a block. */
export class ConfirmOverwriteModal extends Modal {
  private choice = false
  private resolve: (overwrite: boolean) => void = () => {}

  public constructor(app: App) {
    super(app)
  }

  public ask(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolve = resolve
      this.open()
    })
  }

  public onOpen(): void {
    this.setTitle('Overwrite embedded verses?')
    this.contentEl.createEl('p', {
      text: 'This block already has embedded verses. Overwrite them with the current selection?',
    })
    const buttons = this.contentEl.createDiv({ cls: 'modal-button-container' })
    const overwrite = buttons.createEl('button', {
      text: 'Overwrite',
      cls: 'mod-warning',
    })
    const cancel = buttons.createEl('button', { text: 'Cancel' })
    overwrite.addEventListener('click', () => {
      this.choice = true
      this.close()
    })
    cancel.addEventListener('click', () => this.close())
    cancel.focus()
  }

  public onClose(): void {
    this.contentEl.empty()
    this.resolve(this.choice)
  }
}
