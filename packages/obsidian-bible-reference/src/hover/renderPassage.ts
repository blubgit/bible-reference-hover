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

/** Renders a passage as one titled section per chapter. */
export const renderPassage = (
  container: HTMLElement,
  passage: ReferencePassage
): void => {
  groupVersesByChapter(passage.verses).forEach((group) => {
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
      line.appendText(verse.text.replace(/<br\s*\/?>/giu, ' ').trim())
    })
  })
}
