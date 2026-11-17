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

export interface TextLimits {
  proseMaxBlocks: number
  proseMaxSentences: number
  proseMaxWords: number
  captionMaxWords: number
  captionMaxSentences: number
  explainMaxBlocks: number
  explainMinSentences: number
  explainMaxSentences: number
  explainMaxWords: number
  realAwsMax: number
}

/** Module 2 (and earlier): one short intro, tiny captions, no explanation blocks. */
export const MODULE2_LIMITS: TextLimits = {
  proseMaxBlocks: 1,
  proseMaxSentences: 1,
  proseMaxWords: 30,
  captionMaxWords: 22,
  captionMaxSentences: 1,
  explainMaxBlocks: 0,
  explainMinSentences: 0,
  explainMaxSentences: 0,
  explainMaxWords: 0,
  realAwsMax: 1,
}

/** Module 3 (S3): a two-sentence intro plus up to two short `Explain` blocks. */
export const S3_LIMITS: TextLimits = {
  proseMaxBlocks: 1,
  proseMaxSentences: 2,
  proseMaxWords: 40,
  captionMaxWords: 22,
  captionMaxSentences: 1,
  explainMaxBlocks: 2,
  explainMinSentences: 2,
  explainMaxSentences: 4,
  explainMaxWords: 70,
  realAwsMax: 1,
}

/**
 * Checks server-rendered lesson HTML against the text budget.
 * Returns readable violations; an empty array means the lesson is within budget.
 */
export function checkTextBudget(html: string, limits: TextLimits = MODULE2_LIMITS): string[] {
  const problems: string[] = []

  const prose = innerHtmlOf(html, /class="[^"]*\bprose-lesson\b[^"]*"/)
  if (prose.length > limits.proseMaxBlocks) problems.push(`${prose.length} prose blocks (max ${limits.proseMaxBlocks})`)
  prose.forEach((p) => {
    const text = textOf(p)
    if (sentenceCount(text) > limits.proseMaxSentences)
      problems.push(`prose has ${sentenceCount(text)} sentences (max ${limits.proseMaxSentences}): "${text}"`)
    if (wordCount(text) > limits.proseMaxWords) problems.push(`prose has ${wordCount(text)} words (max ${limits.proseMaxWords}): "${text}"`)
  })

  const explain = innerHtmlOf(html, /\bdata-explain\b/)
  if (explain.length > limits.explainMaxBlocks) problems.push(`${explain.length} explanation blocks (max ${limits.explainMaxBlocks})`)
  if (limits.explainMaxBlocks > 0) {
    explain.forEach((e) => {
      const text = textOf(e)
      const sentences = sentenceCount(text)
      if (sentences < limits.explainMinSentences)
        problems.push(`explanation has ${sentences} sentences (min ${limits.explainMinSentences}): "${text}"`)
      if (sentences > limits.explainMaxSentences)
        problems.push(`explanation has ${sentences} sentences (max ${limits.explainMaxSentences}): "${text}"`)
      if (wordCount(text) > limits.explainMaxWords)
        problems.push(`explanation has ${wordCount(text)} words (max ${limits.explainMaxWords}): "${text}"`)
    })
  }

  innerHtmlOf(html, /\bdata-caption\b/).forEach((c) => {
    const text = textOf(c)
    if (wordCount(text) > limits.captionMaxWords) problems.push(`caption has ${wordCount(text)} words (max ${limits.captionMaxWords}): "${text}"`)
    if (sentenceCount(text) > limits.captionMaxSentences)
      problems.push(`caption has ${sentenceCount(text)} sentences (max ${limits.captionMaxSentences}): "${text}"`)
  })

  const plain = textOf(html)
  for (const banned of ['What to take away', 'Check yourself']) {
    if (plain.includes(banned)) problems.push(`"${banned}" must not appear`)
  }
  const real = plain.split('In real AWS').length - 1
  if (real > limits.realAwsMax) problems.push(`"In real AWS" appears ${real} times (max ${limits.realAwsMax})`)

  return problems
}
