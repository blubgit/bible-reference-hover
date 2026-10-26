import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { BollyLifeProvider } from './BollyLifeProvider'
import { getBibleVersion } from '../data/BibleVersionCollection'
import { verseCache } from './verseCache'

// `obsidian` is mocked globally in the bun test preload (see bunfig.toml).

const chapter = Array.from({ length: 18 }, (_, index) => ({
  verse: index + 1,
  text: `Verse ${index + 1}`,
  chapter: 1,
  book: 55,
}))

describe('BollyLifeProvider', () => {
  afterEach(() => {
    mock.restore()
    verseCache.clear()
  })

  it('returns only verses from the start of an open-ended range', async () => {
    spyOn(global, 'fetch').mockResolvedValue({
      json: async () => chapter,
    } as Response)
    const provider = new BollyLifeProvider(getBibleVersion('esv'))

    const verses = await provider.query('2 Timothy', 1, [14, 999])

    expect(verses.map((verse) => verse.verse)).toEqual([14, 15, 16, 17, 18])
  })
})
