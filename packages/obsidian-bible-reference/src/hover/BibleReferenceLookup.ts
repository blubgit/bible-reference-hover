import { BibleReferencePluginSettings } from '../data/constants'
import {
  getBibleVersion,
  OFFLINE_VERSION_KEY,
} from '../data/BibleVersionCollection'
import { IVerse } from '../interfaces/IVerse'
import { getSuggestionsFromQuery } from '../utils/getSuggestionsFromQuery'
import { ScannedBibleReference } from '../utils/scanBibleReferences'

export interface ReferencePassage {
  reference: ScannedBibleReference
  translationKey: string
  verses: readonly IVerse[]
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

  private async fetch(
    reference: ScannedBibleReference,
    translationKey: string
  ): Promise<ReferencePassage> {
    const settings = {
      ...this.getSettings(),
      bibleVersion: translationKey,
    }
    const suggestions = await getSuggestionsFromQuery(
      reference.query,
      settings,
      translationKey
    )
    const suggestion = suggestions[0]
    if (!suggestion || suggestion.verseItems.length === 0) {
      throw new Error('No verses were returned for this reference.')
    }
    return {
      reference,
      translationKey,
      verses: suggestion.verseItems,
    }
  }
}
