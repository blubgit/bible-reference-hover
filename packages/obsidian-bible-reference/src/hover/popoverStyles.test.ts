import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const styles = readFileSync(
  resolve(import.meta.dir, '../../../../styles.css'),
  'utf8'
)

const ruleFor = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  return styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'u'))?.[1] ?? ''
}

describe('Bible reference popover sizing', () => {
  test('bounds the popover and scrolls only the passage body', () => {
    const popover = ruleFor('.obr-reference-popover')
    const passages = ruleFor('.obr-reference-passages')

    expect(popover).toContain('display: flex')
    expect(popover).toContain('flex-direction: column')
    expect(popover).toContain('max-height: min(70vh, 44rem)')
    expect(popover).toContain('overflow: hidden')
    expect(passages).toContain('flex: 1 1 auto')
    expect(passages).toContain('min-height: 0')
    expect(passages).toContain('overflow-y: auto')
  })
})
