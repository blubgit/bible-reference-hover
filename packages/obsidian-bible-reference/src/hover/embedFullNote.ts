import { Editor, EditorChange, Notice } from 'obsidian'
import { BibleReferencePluginSettings } from '../data/constants'
import {
  scanBibleReferences,
  ScannedBibleReference,
} from '../utils/scanBibleReferences'
import { BibleReferenceLookup, ReferencePassage } from './BibleReferenceLookup'
import { buildEmbeddedWidget } from './buildEmbeddedWidget'
import { findEmbedBlocks } from './findEmbedBlocks'

const MAX_PARALLEL_LOOKUPS = 4

interface PlannedEmbed {
  endLine: number
  references: ScannedBibleReference[]
}

const planEmbeds = (
  lines: string[],
  scanOptions: { chapterOnly: boolean }
): { todo: PlannedEmbed[]; alreadyEmbedded: number } => {
  const todo: PlannedEmbed[] = []
  let alreadyEmbedded = 0
  findEmbedBlocks(lines).forEach(({ first, last, embedded }) => {
    const references = scanBibleReferences(
      lines.slice(first, last + 1).join('\n'),
      scanOptions
    )
    if (references.length === 0) return
    if (embedded) alreadyEmbedded++
    else todo.push({ endLine: last, references })
  })
  return { todo, alreadyEmbedded }
}

const plural = (count: number): string =>
  `${count} reference block${count === 1 ? '' : 's'}`

/** Runs `task` over `items` with at most `limit` in flight at once. */
const runLimited = async <T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
): Promise<void> => {
  let next = 0
  const worker = async (): Promise<void> => {
    while (next < items.length) await task(items[next++])
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
}

/**
 * Adds a verse widget beneath every paragraph and list that mentions a
 * reference, as the hover's Embed verses button does for one block. Blocks that
 * already have a widget are left alone, so running it again is safe.
 */
export const embedFullNote = async (
  editor: Editor,
  lookup: BibleReferenceLookup,
  getSettings: () => BibleReferencePluginSettings,
  scanOptions: { chapterOnly: boolean }
): Promise<void> => {
  const snapshot = editor.getValue()
  const lines = snapshot.split('\n')
  const { todo: plan, alreadyEmbedded } = planEmbeds(lines, scanOptions)
  if (plan.length === 0) {
    new Notice(
      alreadyEmbedded
        ? `No new reference blocks. ${alreadyEmbedded} already had verses.`
        : 'No Bible references found in this note.'
    )
    return
  }

  // Each distinct passage is fetched once, however often a note repeats it.
  const unique = new Map<string, ScannedBibleReference>()
  plan.forEach(({ references }) =>
    references.forEach((reference) =>
      unique.set(reference.normalized.toLocaleLowerCase(), reference)
    )
  )
  const loaded = new Map<string, ReferencePassage | null>()
  const blocksReady = (): number =>
    plan.filter(({ references }) =>
      references.every((reference) =>
        loaded.has(reference.normalized.toLocaleLowerCase())
      )
    ).length
  const progress = new Notice('', 0)
  const showProgress = (): void => {
    progress.setMessage(
      `Adding reference blocks: ${blocksReady()} of ${plan.length}`
    )
  }
  showProgress()
  try {
    await runLimited([...unique], MAX_PARALLEL_LOOKUPS, async ([key, ref]) => {
      try {
        loaded.set(key, await lookup.load(ref))
      } catch {
        loaded.set(key, null)
      }
      showProgress()
    })
  } finally {
    progress.hide()
  }

  const changes: EditorChange[] = []
  let failed = 0
  plan.forEach(({ endLine, references }) => {
    const passages = references.map((reference) => {
      const passage = loaded.get(reference.normalized.toLocaleLowerCase())
      return passage ? { ...passage, reference } : null
    })
    if (passages.some((passage) => !passage)) {
      failed++
      return
    }
    changes.push({
      from: { line: endLine, ch: lines[endLine].length },
      text: `\n\n${buildEmbeddedWidget(
        passages as ReferencePassage[],
        getSettings()
      )}`,
    })
  })

  if (editor.getValue() !== snapshot) {
    new Notice('The note changed. Run Add Bible Reference again.')
    return
  }
  if (changes.length) editor.transaction({ changes })

  const skipped = failed + alreadyEmbedded
  const reasons = [
    alreadyEmbedded ? `${alreadyEmbedded} already had verses` : '',
    failed ? `${failed} could not be loaded` : '',
  ].filter(Boolean)
  new Notice(
    `Added ${plural(changes.length)}. Skipped ${skipped}${
      reasons.length ? ` (${reasons.join(', ')})` : ''
    }.`,
    8000
  )
}
