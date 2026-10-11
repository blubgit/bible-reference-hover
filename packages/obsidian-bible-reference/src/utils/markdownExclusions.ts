const collectMatches = (
  text: string,
  reg: RegExp,
  ranges: Array<{ start: number; end: number }>
): void => {
  reg.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = reg.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length })
    if (match[0].length === 0) reg.lastIndex++
  }
}

/** Markdown regions in which prose references must not be discovered. */
export const getExcludedRanges = (
  text: string
): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = []
  // YAML frontmatter can appear only at the beginning of a note. A global
  // delimiter-pair match also treats later horizontal rules as frontmatter,
  // which can hide all references between two ordinary `---` lines.
  if (text.startsWith('---\n') || text.startsWith('---\r\n')) {
    const frontmatter = text.match(/^---\s*$[\s\S]*?^---\s*$/mu)
    if (frontmatter) {
      ranges.push({ start: 0, end: frontmatter[0].length })
    }
  }
  collectMatches(text, /^(```|~~~)[^\n]*$[\s\S]*?^\1\s*$/gmu, ranges)
  collectMatches(text, /`+[^`\n]*`+/gu, ranges)
  collectMatches(text, /https?:\/\/[^\s<>)]+/giu, ranges)
  collectMatches(
    text,
    /<details\s+class=["']obr-bible-widget["'][^>]*>[\s\S]*?<\/details>/giu,
    ranges
  )
  collectMatches(text, /<[^>]*>/gu, ranges)
  collectMatches(
    text,
    /^>\s*\[!(?:bible|quote)\][^\n]*(?:\n>[^\n]*)*/gimu,
    ranges
  )
  return ranges
}
