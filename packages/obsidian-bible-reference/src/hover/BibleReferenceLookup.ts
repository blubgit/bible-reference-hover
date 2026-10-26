import { BibleReferencePluginSettings } from '../data/constants'
import {
  getBibleVersion,
  OFFLINE_VERSION_KEY,
} from '../data/BibleVersionCollection'
import { IVerse } from '../interfaces/IVerse'
import { getSuggestionsFromQuery } from '../utils/getSuggestionsFromQuery'
import { ScannedBibleReference } from '../utils/scanBibleReferences'
import { buildContextQuery, clampContextVerses } from './verseContext'

export interface ReferencePassage {
  reference: ScannedBibleReference
  translationKey: string
  /** The verses the reference names. Embedding uses only these. */
  verses: readonly IVerse[]
  /** The verses to display: `verses` plus surrounding context, when loaded. */
  context?: readonly IVerse[]
}

export class BibleReferenceLookup {
  private readonly inFlight = new Map<string, Promise<ReferencePassage>>()

  public constructor(
    private readonly getSettings: () => BibleReferencePluginSettings
  ) {}

  public load(reference: ScannedBibleReference): Promise<ReferencePassage> {
    const settings = this.getSettings()
    const requestedTranslation = settings.offlineMode
      ? OFFLINE_VERSION_KEY
      : reference.translationKey || settings.hoverPreviewTranslation || 'esv'
    const translationKey = getBibleVersion(requestedTranslation).key
    const key = `${reference.query.toLocaleLowerCase()}@${translationKey}`
    const existing = this.inFlight.get(key)
    if (existing) return existing

    const request = this.fetch(reference, translationKey).finally(() => {
      this.inFlight.delete(key)
    })
    this.inFlight.set(key, request)
    return request
  }

  /**
   * Like `load`, plus the verses around the reference when the context
   * setting is on. A failed context fetch falls back to the bare passage.
   */
  public async loadWithContext(
    reference: ScannedBibleReference
  ): Promise<ReferencePassage> {
    const passage = await this.load(reference)
    const settings = this.getSettings()
    if (!(settings.hoverContextEnabled ?? true)) return passage
    const query = buildContextQuery(
      reference.query,
      passage.verses,
      clampContextVerses(settings.hoverContextVerses)
    )
    if (!query) return passage
    try {
      const context = await this.fetchVerses(query, passage.translationKey)
      return { ...passage, context }
    } catch {
      return passage
    }
  }

  private async fetch(
    reference: ScannedBibleReference,
    translationKey: string
  ): Promise<ReferencePassage> {
    return {
      reference,
      translationKey,
      verses: await this.fetchVerses(reference.query, translationKey),
    }
  }

  private async fetchVerses(
    query: string,
    translationKey: string
  ): Promise<readonly IVerse[]> {
    const settings = {
      ...this.getSettings(),
      bibleVersion: translationKey,
    }
    const suggestions = await getSuggestionsFromQuery(
      query,
      settings,
      translationKey
    )
    const suggestion = suggestions[0]
    if (!suggestion || suggestion.verseItems.length === 0) {
      throw new Error('No verses were returned for this reference.')
    }
    return suggestion.verseItems
  }
}
