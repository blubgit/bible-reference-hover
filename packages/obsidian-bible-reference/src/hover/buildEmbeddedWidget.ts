import { BibleReferencePluginSettings } from '../data/constants'
import { OFFLINE_VERSION_KEY } from '../data/BibleVersionCollection'
import { ReferencePassage } from './BibleReferenceLookup'
import { groupVersesByChapter } from './groupVersesByChapter'

const cleanText = (value: string): string =>
  value
    .replace(/<br\s*\/?>/giu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()

const escapeHtml = (value: string): string =>
  value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#039;')

const titleOf = (passages: ReferencePassage[]): string =>
  passages.map((passage) => passage.reference.normalized).join(' · ')

const translationLabel = (key: string): string =>
  key === OFFLINE_VERSION_KEY ? 'WEB' : key.toUpperCase()

const calloutWidget = (
  passages: ReferencePassage[],
  settings: BibleReferencePluginSettings,
  type: 'bible' | 'quote'
): string => {
  const fold = settings.embeddedWidgetInitiallyCollapsed === false ? '+' : '-'
  const lines = [`> [!${type}]${fold} ${titleOf(passages)}`]
  let groupIndex = 0
  passages.forEach((passage) => {
    groupVersesByChapter(passage.verses).forEach((group) => {
      if (groupIndex++ > 0) lines.push('>')
      lines.push(
        `> **${group.label} (${translationLabel(passage.translationKey)})**`
      )
      group.verses.forEach((verse) => {
        lines.push(`> **${verse.verse}.** ${cleanText(verse.text)}`)
      })
    })
  })
  return lines.join('\n')
}

const detailsWidget = (
  passages: ReferencePassage[],
  settings: BibleReferencePluginSettings
): string => {
  const open =
    settings.embeddedWidgetInitiallyCollapsed === false ? ' open' : ''
  const lines = [
    `<details class="obr-bible-widget"${open}>`,
    `<summary>${escapeHtml(titleOf(passages))}</summary>`,
  ]
  passages.forEach((passage) =>
    groupVersesByChapter(passage.verses).forEach((group) => {
      lines.push(
        `<p><strong>${escapeHtml(group.label)} (${escapeHtml(
          translationLabel(passage.translationKey)
        )})</strong></p>`
      )
      group.verses.forEach((verse) => {
        lines.push(
          `<p><strong>${verse.verse}.</strong> ${escapeHtml(
            cleanText(verse.text)
          )}</p>`
        )
      })
    })
  )
  lines.push('</details>')
  return lines.join('\n')
}

export const buildEmbeddedWidget = (
  passages: ReferencePassage[],
  settings: BibleReferencePluginSettings
): string => {
  switch (settings.embeddedWidgetStyle) {
    case 'quote-callout':
      return calloutWidget(passages, settings, 'quote')
    case 'html-details':
      return detailsWidget(passages, settings)
    case 'bible-callout':
    default:
      return calloutWidget(passages, settings, 'bible')
  }
}
