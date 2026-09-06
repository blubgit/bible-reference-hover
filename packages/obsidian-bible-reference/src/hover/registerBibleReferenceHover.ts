import type BibleReferencePlugin from '../main'
import { BibleReferenceController } from './BibleReferenceController'
import { createBibleReferenceEditorExtension } from './editorExtension'
import { registerReadingView } from './readingView'

export const registerBibleReferenceHover = (
  plugin: BibleReferencePlugin
): BibleReferenceController => {
  const controller = new BibleReferenceController(plugin)
  registerReadingView(plugin, controller)
  plugin.registerEditorExtension(
    createBibleReferenceEditorExtension(plugin, controller)
  )
  plugin.registerEvent(
    plugin.app.workspace.on('editor-menu', (menu, editor) => {
      if (!editor.somethingSelected()) return
      menu.addItem((item) =>
        item
          .setTitle('Scan for Bible references')
          .setIcon('scan-search')
          .onClick((event) => {
            const point =
              event instanceof MouseEvent
                ? { x: event.clientX, y: event.clientY }
                : undefined
            controller.openEditorSelection(editor, point)
          })
      )
    })
  )
  plugin.register(() => controller.close())
  return controller
}
