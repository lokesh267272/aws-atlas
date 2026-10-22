/** Strip tags and collapse whitespace. */
const textOf = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const wordCount = (text: string) => (text ? text.split(' ').length : 0)
const sentenceCount = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length

/** Inner HTML of every element whose opening tag matches `attr`, balancing nested tags of the same name. */
function innerHtmlOf(html: string, attr: RegExp): string[] {
  const out: string[] = []
  const open = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g
  let m: RegExpExecArray | null
  while ((m = open.exec(html))) {
    if (!attr.test(m[0])) continue
    const name = m[1]
    const tag = new RegExp(`<(/?)${name}\\b[^>]*>`, 'g')
    tag.lastIndex = open.lastIndex
    let depth = 1
    let t: RegExpExecArray | null
    while ((t = tag.exec(html))) {
      depth += t[1] ? -1 : 1
      if (depth === 0) {
        out.push(html.slice(open.lastIndex, t.index))
        break
      }
    }
  }
  return out
}

/**
 * Checks server-rendered lesson HTML against the text budget.
 * Returns readable violations; an empty array means the lesson is within budget.
 */
export function checkTextBudget(html: string): string[] {
  const problems: string[] = []

  const prose = innerHtmlOf(html, /class="[^"]*\bprose-lesson\b[^"]*"/)
  if (prose.length > 1) problems.push(`${prose.length} prose blocks (max 1)`)
  prose.forEach((p) => {
    const text = textOf(p)
    if (sentenceCount(text) > 1) problems.push(`prose has ${sentenceCount(text)} sentences (max 1): "${text}"`)
    if (wordCount(text) > 30) problems.push(`prose has ${wordCount(text)} words (max 30): "${text}"`)
  })

  innerHtmlOf(html, /\bdata-caption\b/).forEach((c) => {
    const text = textOf(c)
    if (wordCount(text) > 22) problems.push(`caption has ${wordCount(text)} words (max 22): "${text}"`)
    if (sentenceCount(text) > 1) problems.push(`caption has ${sentenceCount(text)} sentences (max 1): "${text}"`)
  })

  const plain = textOf(html)
  for (const banned of ['What to take away', 'Check yourself']) {
    if (plain.includes(banned)) problems.push(`"${banned}" must not appear`)
  }
  const real = plain.split('In real AWS').length - 1
  if (real > 1) problems.push(`"In real AWS" appears ${real} times (max 1)`)

  return problems
}
