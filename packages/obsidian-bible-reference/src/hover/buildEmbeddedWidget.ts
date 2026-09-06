import { BibleReferencePluginSettings } from '../data/constants'
import { OFFLINE_VERSION_KEY } from '../data/BibleVersionCollection'
import { ReferencePassage } from './BibleReferenceLookup'
import { formatVerseLabel } from './formatVerseLabel'

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
  passages.forEach((passage, passageIndex) => {
    if (passageIndex > 0) lines.push('>')
    lines.push(
      `> **${passage.reference.normalized} (${translationLabel(
        passage.translationKey
      )})**`
    )
    passage.verses.forEach((verse) => {
      lines.push(`> **${formatVerseLabel(verse)}.** ${cleanText(verse.text)}`)
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
  passages.forEach((passage) => {
    lines.push(
      `<p><strong>${escapeHtml(passage.reference.normalized)} (${escapeHtml(
        translationLabel(passage.translationKey)
      )})</strong></p>`
    )
    passage.verses.forEach((verse) => {
      lines.push(
        `<p><strong>${escapeHtml(
          formatVerseLabel(verse)
        )}.</strong> ${escapeHtml(cleanText(verse.text))}</p>`
      )
    })
  })
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
