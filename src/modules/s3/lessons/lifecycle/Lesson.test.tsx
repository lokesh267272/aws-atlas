import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { checkTextBudget, S3_LIMITS } from '../../../../test/textBudget'
import { CLASSES } from '../../storageClasses'
import { Calendar, START_RULES, monthAt } from './Calendar'
import Lesson from './Lesson'
import { emptyRule, solution, type Rule } from './lifecycleModel'
import { PROBLEM_LABELS, RuleBuilder, daysFromText } from './RuleBuilder'
import { terms } from './terms'

const noop = () => {}
/** Labels as React writes them into HTML (apostrophes become &#x27;). */
const escapeHtml = (s: string) => renderToStaticMarkup(<>{s}</>)
const builder = (rules: Rule[]) => renderToStaticMarkup(<RuleBuilder rules={rules} onChange={noop} />)
const withReceipts = (patch: Partial<Rule>) => START_RULES.map((r) => (r.prefix === 'receipts' ? { ...r, ...patch } : r))

describe('lifecycle lesson', () => {
  it('renders the Tidy for 7 years goal and the Run 7 years button', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/Tidy for 7 years/)
    expect(html).toMatch(/>Run 7 years</)
  })

  it('stays within the text budget', () => {
    expect(checkTextBudget(renderToStaticMarkup(<Lesson />), S3_LIMITS)).toEqual([])
  })

  it('has two explanations: the filing clerk and the early-move minimum', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html.match(/data-explain=""/g)).toHaveLength(2)
    expect(html).toMatch(/filing clerk with a calendar/)
    expect(html).toMatch(/still pay for the whole minimum/)
    expect(html).toMatch(/One rule also can&#x27;t move files off a shelf it moved them to until that minimum is up/)
  })

  it('no longer claims files must be 30 days old before an IA shelf (AWS dropped that in July 2026)', () => {
    const text = renderToStaticMarkup(<Lesson />).replace(/<[^>]*>/g, ' ')
    expect(text).not.toMatch(/30 days old/)
    expect(Object.values(PROBLEM_LABELS).join(' ')).not.toMatch(/30 days old/)
  })

  it('labels prices as example prices and never states a price ratio', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/Example prices/)
    const text = html.replace(/<[^>]*>/g, ' ')
    expect(text).not.toMatch(/\d+ ?(times|x) (cheaper|less|more)|\d+ ?%/i)
  })

  it('adds only its own two glossary keys', () => {
    expect(Object.keys(terms).sort()).toEqual(['expiration-action', 'transition-action'])
  })

  it('shows the file store at step 5', () => {
    expect(renderToStaticMarkup(<Lesson />)).toMatch(/Lifecycle rules move or remove files as they age/)
  })
})

describe('rule builder', () => {
  it('has a card for every prefix, starting with no rules', () => {
    const html = builder(START_RULES)
    for (const p of ['menu/', 'receipts/', 'delivery/', 'backups/', 'reports/']) expect(html).toContain(`>${p}</code>`)
    expect(html).not.toMatch(/reject/)
  })

  it('offers every shelf in each move, with keyboard controls only', () => {
    const html = builder(solution)
    const options = new Set([...html.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]))
    expect([...options].sort()).toEqual(CLASSES.map((c) => c.id).sort())
    expect(html).toMatch(/aria-label="receipts\/ move 2: after how many days"/)
    expect(html).toMatch(/aria-label="receipts\/ move 2: to which shelf"/)
    expect(html).toMatch(/Add a move/)
    expect(html).toMatch(/aria-label="delivery\/: expire after how many days/)
  })

  it('keeps menu photos on Standard: only old versions can be cleaned up', () => {
    const html = builder(solution)
    expect(html).toMatch(/aria-label="menu\/: delete old versions after how many days/)
    expect(html).not.toMatch(/aria-label="menu\/ move/)
    expect(html).not.toMatch(/aria-label="menu\/: expire/)
  })

  it('shows a rejected rule and why, in one line', () => {
    const html = builder(
      withReceipts({
        transitions: [
          { afterDays: 30, to: 'glacier-ir' },
          { afterDays: 60, to: 'deep-archive' },
        ],
      }),
    )
    expect(html).toMatch(/S3 would reject this rule when you save it/)
    expect(html).toContain(escapeHtml(PROBLEM_LABELS['next-step-too-soon']))
    expect(PROBLEM_LABELS['next-step-too-soon']).toMatch(/minimum stay/)
  })

  it('accepts a move into Standard-IA or One Zone-IA from day 0', () => {
    expect(builder(withReceipts({ transitions: [{ afterDays: 0, to: 'one-zone-ia' }] }))).not.toMatch(/reject/)
  })

  it('names the One Zone-IA to Glacier Instant Retrieval move it rejects', () => {
    const html = builder(START_RULES.map((r) => (r.prefix === 'reports' ? { ...r, transitions: [{ afterDays: 60, to: 'glacier-ir' as const }] } : r)))
    expect(html).toContain(escapeHtml(PROBLEM_LABELS['unsupported-move']))
    expect(html).not.toContain(escapeHtml(PROBLEM_LABELS['not-down-the-waterfall']))
  })

  it('shows a days value below the minimum as the minimum while typing', () => {
    expect(daysFromText('0', 1)).toBe(1)
    expect(daysFromText('-5', 0)).toBe(0)
    expect(daysFromText('99999', 0)).toBe(3650)
    expect(daysFromText('45', 1)).toBe(45)
    expect(daysFromText('', 1)).toBeNull()
    expect(daysFromText('-', 1)).toBeUndefined()
  })

  it('flags deleting receipts before 7 years', () => {
    expect(builder(withReceipts({ expireAfterDays: 365 }))).toMatch(/Deletes files too early/)
  })

  it('shows the path of one month of files, with early charges and hidden old versions', () => {
    const early = builder(
      START_RULES.map((r) => (r.prefix === 'backups' ? { ...r, transitions: [{ afterDays: 0, to: 'glacier-ir' as const }], expireAfterDays: 30 } : r)),
    )
    expect(early).toMatch(/billed 30 days on Standard-IA/)
    expect(early).toMatch(/old versions kept and billed forever/)
    const html = builder(solution)
    expect(html).toMatch(/Day 2,555<\/span> hidden, old version/)
    expect(html).toMatch(/Day 2,556<\/span> deleted/)
  })

  it('says receipts are deleted after year 7, so the 7-year run never shows it (and only receipts)', () => {
    const html = builder(solution)
    expect(html.match(/Deleted after year 7, so the 7-year run never shows it/g)).toHaveLength(1)
  })

  it('every problem has a short one-line label', () => {
    for (const label of Object.values(PROBLEM_LABELS)) {
      expect(label.split(' ').length).toBeLessThanOrEqual(12)
      expect(label).not.toMatch(/[.!?]$/)
    }
  })
})

describe('calendar', () => {
  const html = renderToStaticMarkup(<Calendar rules={START_RULES} onRules={noop} />)

  it('starts at day 0 with empty shelves and nothing solved', () => {
    expect(html).toMatch(/Day 0/)
    expect(html.match(/>Empty</g)).toHaveLength(CLASSES.length)
    expect(html).not.toMatch(/Solved/)
  })

  it('has a time slider and jump buttons from day 0 to year 7', () => {
    expect(html).toMatch(/type="range"[^>]*max="84"/)
    for (const j of ['Day 0', 'Month 1', 'Month 3', 'Year 1', 'Year 7']) expect(html).toContain(`>${j}</button>`)
  })

  it('bills minimum-duration charges on their own line', () => {
    expect(html).toMatch(/Minimum-stay<\/span>|Minimum-stay/)
    expect(html).toMatch(/charges/)
  })

  it('shows each shelf with its example price and minimum', () => {
    expect(html).toMatch(/\$0\.002\/GB-month · min 180 days/)
    expect(html).toMatch(/\$0\.025\/GB-month</)
  })

  it('with no rules the estimate is over budget and the checks say so', () => {
    expect(html).toMatch(/these rules: \$80,628/)
    expect(renderToStaticMarkup(<Calendar rules={[emptyRule('receipts')]} onRules={noop} />)).toMatch(/S3 would accept every rule/)
  })

  it('names rules S3 would reject in the challenge checks', () => {
    const bad: Rule = { ...emptyRule('receipts'), transitions: [{ afterDays: 30, to: 'glacier-ir' }, { afterDays: 60, to: 'deep-archive' }] }
    expect(renderToStaticMarkup(<Calendar rules={[bad]} onRules={noop} />)).toMatch(/S3 would accept every rule \(rejected: receipts\/\)/)
  })

  it('never computes a month below 0, even if the first frame is a little early', () => {
    expect(monthAt(-16)).toBe(0)
    expect(monthAt(0)).toBe(0)
    expect(monthAt(3500)).toBe(42)
    expect(monthAt(7000)).toBe(84)
  })
})
