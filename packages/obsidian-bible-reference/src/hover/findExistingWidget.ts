const CALLOUT_START = /^>\s*\[!(?:bible|quote)\]/iu
const DETAILS_START = /^<details\s+class=["']obr-bible-widget["']/iu

/**
 * Returns the end offset of an embedded verse widget that sits directly beneath
 * the block ending at `blockEnd`, or null when there is none. Only blank lines
 * may separate the two.
 */
export const findExistingWidgetEnd = (
  text: string,
  blockEnd: number
): number | null => {
  const rest = text.slice(blockEnd)
  const gap = /^\s*/u.exec(rest)?.[0].length ?? 0
  const body = rest.slice(gap)

  if (CALLOUT_START.test(body)) {
    let end = 0
    for (const line of body.split('\n')) {
      if (!line.trimStart().startsWith('>')) break
      end += line.length + 1
    }
    return blockEnd + gap + Math.min(end - 1, body.length)
  }
  if (DETAILS_START.test(body)) {
    const close = /<\/details>/iu.exec(body)
    return close ? blockEnd + gap + close.index + close[0].length : null
  }
  return null
}
