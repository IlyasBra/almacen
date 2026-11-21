/**
 * Splits `text` into lines no wider than `maxWidth`, at most `maxLines`; what
 * does not fit ends in "…". A word wider than a line is cut where it overflows.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (value: string) => number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  const queue = [...words]
  while (queue.length > 0) {
    const word = queue.shift() ?? ''
    const candidate = current ? `${current} ${word}` : word
    if (measure(candidate) <= maxWidth) {
      current = candidate
      continue
    }
    if (current) {
      lines.push(current)
      current = ''
      queue.unshift(word)
      continue
    }
    // A single word is too wide: take as many characters as fit.
    const chars = Array.from(word)
    let size = chars.length
    while (size > 1 && measure(chars.slice(0, size).join('')) > maxWidth) size--
    lines.push(chars.slice(0, size).join(''))
    if (size < chars.length) queue.unshift(chars.slice(size).join(''))
  }
  if (current) lines.push(current)

  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1] ?? ''
  while (last.length > 0 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1)
  kept[maxLines - 1] = `${last.trimEnd()}…`
  return kept
}
