import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { checkTextBudget, S3_LIMITS } from '../../../../test/textBudget'
import { CLASSES } from '../../storageClasses'
import { PREFIX_IDS } from '../../story'
import Lesson from './Lesson'
import { simulateYear, solution, START, type StoreConfig } from './finalModel'
import { StoreSetup } from './StoreSetup'
import { terms } from './terms'

const noop = () => {}
const html = renderToStaticMarkup(<Lesson />)
const setup = (c: StoreConfig) => renderToStaticMarkup(<StoreSetup config={c} onChange={noop} />)
/** Visible text; tags are dropped without adding spaces. */
const text = (h: string) => h.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
/** Every switch, in order: its visible label and whether it is on. */
const switches = (h: string) =>
  (h.match(/<label[\s>][\s\S]*?<\/label>/g) ?? [])
    .filter((l) => l.includes('role="switch"'))
    .map((l) => ({ label: text(l), on: /\schecked=""/.test(l) }))
/** The selected option's value in the select with this aria-label. */
const selected = (h: string, label: string) => {
  const sel = new RegExp(`<select[^>]*aria-label="${label}"[^>]*>([\\s\\S]*?)</select>`).exec(h)?.[1] ?? ''
  return /<option[^>]*value="([^"]*)"[^>]*selected=""/.exec(sel)?.[1] ?? null
}

describe('final lesson', () => {
  it('renders the goal and the Run the year button', () => {
    expect(html).toMatch(/Build Mealhop&#x27;s file store and get it through a year/)
    expect(html).toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*Run the year<\/button>/)
  })

  it('stays within the Module 3 text budget', () => {
    expect(checkTextBudget(html, S3_LIMITS)).toEqual([])
  })

  it('has one explanation: a recap with an everyday comparison, naming each piece', () => {
    expect(html.match(/data-explain=""/g)).toHaveLength(1)
    const recap = text(/<div data-explain=""[^>]*>([\s\S]*?)<\/div>/.exec(html)![1])
    expect(recap).toMatch(/storeroom/)
    for (const piece of ['Block Public Access', 'role', 'presigned link', 'Storage classes', 'Versioning', 'lifecycle rules']) expect(recap).toContain(piece)
  })

  it('ends with the complete file store (step 6)', () => {
    expect(html).toMatch(/Complete: every piece of the file store is in place/)
  })

  it('adds no glossary keys of its own', () => {
    expect(Object.keys(terms)).toEqual([])
  })

  it('labels prices as example prices and never states a price ratio', () => {
    expect(html).toMatch(/Example prices/)
    expect(text(html)).not.toMatch(/\d+ ?(times|x) (cheaper|less|more)|\d+ ?%/i)
  })

  it('shows four counters: lost, leaked, late, and the bill against the budget', () => {
    for (const label of ['Files lost', 'Files leaked', 'Late requests', 'Year bill (estimate)']) expect(html).toContain(label)
    expect(text(html)).toMatch(/over the \$950 budget/)
  })

  it('lists every event of the year, before it plays', () => {
    expect(html.match(/Month \d+: /g)).toHaveLength(7)
    expect(text(html)).toMatch(/A fire destroys ap-south-1a/)
    expect(text(html)).not.toMatch(/Solved/)
  })
})

describe('store setup', () => {
  it('starts as a brand-new bucket: only Block Public Access on, versioning off, everything on S3 Standard', () => {
    const h = setup(START)
    expect(switches(h)).toEqual([
      { label: 'Block all public access', on: true },
      { label: 'Make public', on: false },
      { label: 'Read menu/', on: false },
      { label: 'Read receipts/', on: false },
      { label: 'Servers sign receipt links', on: false },
    ])
    const radios = h.match(/<input[^>]*type="radio"[^>]*>/g) ?? []
    expect(radios.map((r) => /value="([^"]+)"/.exec(r)?.[1])).toEqual(['off', 'on'])
    expect(radios.filter((r) => /\schecked=""/.test(r)).map((r) => /value="([^"]+)"/.exec(r)?.[1])).toEqual(['off'])
    expect(h.match(/<option value="standard" selected="">S3 Standard<\/option>/g)).toHaveLength(5)
  })

  it('every setting is a keyboard control: a shelf select per prefix offering all seven classes', () => {
    const h = setup(START)
    expect(h.match(/<label[^>]*for="[^"]*-shelf"/g)).toHaveLength(PREFIX_IDS.length)
    const shelfOptions = new Set([...h.matchAll(/<option value="([a-z-]+)"[^>]*>S3 /g)].map((m) => m[1]))
    expect([...shelfOptions].sort()).toEqual(CLASSES.map((c) => c.id).sort())
    expect(h).not.toMatch(/draggable/)
  })

  it('menu photos only get old-version clean-up; the others get moves, expiry and clean-up', () => {
    const h = setup(START)
    expect(h).toMatch(/aria-label="menu\/: delete old versions after"/)
    expect(h).not.toMatch(/aria-label="menu\/ move/)
    expect(h).not.toMatch(/aria-label="menu\/: expire/)
    for (const p of ['receipts/', 'delivery/', 'backups/', 'reports/']) {
      expect(h).toContain(`aria-label="${p} move 1: to which shelf"`)
      expect(h).toContain(`aria-label="${p} move 2: to which shelf"`)
      expect(h).toContain(`aria-label="${p}: expire after"`)
    }
  })

  it('shows the solution: receipts slide to Glacier IR then Deep Archive and expire after 7 years', () => {
    const h = setup(solution)
    expect(selected(h, 'receipts/ move 1: to which shelf')).toBe('glacier-ir')
    expect(selected(h, 'receipts/ move 1: after how many days')).toBe('30')
    expect(selected(h, 'receipts/ move 2: to which shelf')).toBe('deep-archive')
    expect(selected(h, 'receipts/ move 2: after how many days')).toBe('365')
    expect(selected(h, 'receipts/: expire after')).toBe('2555')
    expect(selected(h, 'delivery/: expire after')).toBe('30')
    expect(selected(h, 'menu/: delete old versions after')).toBe('30')
    expect(h).toMatch(/>7 years</)
  })

  it('the second move waits for the first', () => {
    expect(setup(START)).toMatch(/<select[^>]*aria-label="receipts\/ move 2: to which shelf"[^>]*disabled=""|<select[^>]*disabled=""[^>]*aria-label="receipts\/ move 2: to which shelf"/)
  })

  it('a rule S3 would reject says so, with lesson 5 reasons', () => {
    const h = setup({ ...solution, placement: { ...solution.placement, receipts: 'deep-archive' } })
    expect(h).toMatch(/S3 would reject this rule, so the year runs without it/)
    expect(h).toMatch(/only move files down the shelves/)
  })

  it('warns when a shelf keeps files in one AZ only', () => {
    expect(setup(solution).match(/Stored in one AZ only/g)).toHaveLength(1)
  })

  it('a public policy is shown as ignored while Block Public Access is on', () => {
    expect(setup({ ...START, access: { ...START.access, publicRead: true } })).toMatch(/Ignored while Block Public Access is on/)
  })

  it('keeps glossary terms out of every label', () => {
    const labels = setup(solution).match(/<label[\s>][\s\S]*?<\/label>/g) ?? []
    expect(labels.filter((l) => /class="(?:[^"]* )?term[ "]/.test(l))).toEqual([])
  })
})

describe('log lines', () => {
  const configs: StoreConfig[] = [
    solution,
    START,
    { ...solution, versioning: 'off' },
    { ...solution, access: { ...solution.access, publicRead: true, blockPublicAccess: false } },
    { ...solution, placement: { ...solution.placement, menu: 'one-zone-ia', receipts: 'deep-archive', delivery: 'deep-archive' } },
    { ...solution, rules: [] },
  ]

  it('each is one short clause: at most 25 words, no sentence break', () => {
    for (const c of configs)
      for (const l of simulateYear(c).log) {
        expect(l.text.split(' ').length, l.text).toBeLessThanOrEqual(25)
        expect(l.text, l.text).not.toMatch(/[.!?](\s|$)/)
      }
  })

  it('says "restore" for the archive shelves, never that they are read in milliseconds', () => {
    for (const c of configs)
      for (const l of simulateYear(c).log) expect(l.text, l.text).not.toMatch(/(Flexible Retrieval|Deep Archive)[^,:]* in milliseconds/)
    expect(simulateYear(solution).log.find((l) => l.kind === 'receipts-5-years')!.text).toMatch(/restored from S3 Glacier Deep Archive/)
  })
})
