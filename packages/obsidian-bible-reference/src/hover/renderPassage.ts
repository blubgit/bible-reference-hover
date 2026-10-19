import { OFFLINE_VERSION_KEY } from '../data/BibleVersionCollection'
import { ReferencePassage } from './BibleReferenceLookup'
import { groupVersesByChapter } from './groupVersesByChapter'

export const createPassageSection = (
  container: HTMLElement,
  label: string
): HTMLElement => {
  const section = container.createDiv({ cls: 'obr-reference-passage' })
  section.createEl('h4', { text: label })
  return section
}

/** Renders a passage as one titled section per chapter. With context, the
 * referenced verses are bold among the surrounding verses. */
export const renderPassage = (
  container: HTMLElement,
  passage: ReferencePassage
): void => {
  const focused = passage.context
    ? new Set(passage.verses.map(({ chapter, verse }) => `${chapter}:${verse}`))
    : null
  groupVersesByChapter(passage.context ?? passage.verses).forEach((group) => {
    const section = createPassageSection(container, group.label)
    section.createDiv({
      cls: 'obr-reference-translation',
      text:
        passage.translationKey === OFFLINE_VERSION_KEY
          ? 'WEB'
          : passage.translationKey.toUpperCase(),
    })
    group.verses.forEach((verse) => {
      const line = section.createEl('p')
      line.createEl('strong', { text: `${verse.verse}. ` })
      const text = verse.text.replace(/<br\s*\/?>/giu, ' ').trim()
      if (focused?.has(`${verse.chapter}:${verse.verse}`)) {
        line.addClass('obr-reference-focus')
        line.createEl('strong', { text })
      } else {
        line.appendText(text)
      }
    })
  })
}
