import { describe, expect, it } from 'vitest'
import { monthCost, monthStorePrice } from '../classes/classesModel'
import { emptyRule, type Rule } from '../lifecycle/lifecycleModel'
import {
  classAt,
  HISTORY_MONTHS,
  simulateYear,
  solution,
  START,
  YEAR_BUDGET,
  YEAR_EVENTS,
  YEAR_MONTHS,
  type StoreConfig,
} from './finalModel'

const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0)
const withRule = (c: StoreConfig, rule: Rule): StoreConfig => ({
  ...c,
  rules: [...c.rules.filter((r) => r.prefix !== rule.prefix), rule],
})
const ruleOf = (c: StoreConfig, prefix: Rule['prefix']) => c.rules.find((r) => r.prefix === prefix) ?? emptyRule(prefix)
const logOf = (c: StoreConfig, kind: (typeof YEAR_EVENTS)[number]['kind']) => simulateYear(c).log.find((l) => l.kind === kind)!

describe('final model: the brief', () => {
  it('the solution survives the year', () => {
    expect(simulateYear(solution).solved).toBe(true)
  })

  it('versioning off loses menu photos to the intern', () => {
    expect(simulateYear({ ...solution, versioning: 'off' }).lost).toBeGreaterThan(0)
  })

  it('a public bucket leaks to the bot', () => {
    expect(simulateYear({ ...solution, access: { ...solution.access, publicRead: true, blockPublicAccess: false } }).leaked).toBeGreaterThan(0)
  })

  it('menu photos on One Zone-IA are lost when the AZ is destroyed', () => {
    expect(simulateYear({ ...solution, placement: { ...solution.placement, menu: 'one-zone-ia' } }).lost).toBeGreaterThan(0)
  })

  it('fresh receipts in Deep Archive are too slow', () => {
    expect(simulateYear({ ...solution, placement: { ...solution.placement, receipts: 'deep-archive' } }).late).toBeGreaterThan(0)
  })

  it('no lifecycle rules is over budget', () => {
    expect(simulateYear({ ...solution, rules: [] }).cost).toBeGreaterThan(YEAR_BUDGET)
  })

  it('uses the same prices as lesson 3', () => {
    // The year carries 5 years of history, so its stock is bigger than lesson 3's one-month snapshot.
    // What must match is the price: a GB on each shelf, and a regular month of fetches, cost what lesson 3 charges.
    const first = simulateYear(solution).months[0]
    expect(first.minCharge).toBe(0)
    expect(first.storage).toBeCloseTo(sum(first.stock.map((s) => s.gb * monthStorePrice(s.cls))), 9)
    expect(first.fetch).toBeCloseTo(sum(monthCost(solution.placement).lines.map((l) => l.fetch)), 9)
  })
})

describe('final model: the year', () => {
  it('plays every event kind once, in month order, inside the year', () => {
    const kinds = YEAR_EVENTS.map((e) => e.kind)
    expect(new Set(kinds).size).toBe(7)
    expect(kinds).toHaveLength(7)
    const months = YEAR_EVENTS.map((e) => e.month)
    expect([...months].sort((a, b) => a - b)).toEqual(months)
    expect(months.every((m) => m >= 1 && m <= YEAR_MONTHS)).toBe(true)
  })

  it('the AZ fire comes last, so no later request reads what it destroyed', () => {
    expect(YEAR_EVENTS.at(-1)!.kind).toBe('az-destroyed')
  })

  it('writes one log line per event, in order, and sums the counters from them', () => {
    const r = simulateYear(START)
    expect(r.log.map((l) => l.kind)).toEqual(YEAR_EVENTS.map((e) => e.kind))
    expect(r.log.map((l) => l.month)).toEqual(YEAR_EVENTS.map((e) => e.month))
    expect(sum(r.log.map((l) => l.lost))).toBe(r.lost)
    expect(sum(r.log.map((l) => l.leaked))).toBe(r.leaked)
    expect(sum(r.log.map((l) => l.late))).toBe(r.late)
    for (const l of r.log) expect(l.ok).toBe(l.lost + l.leaked + l.late === 0)
  })

  it('bills twelve months, and the total is their sum', () => {
    const r = simulateYear(solution)
    expect(r.months).toHaveLength(YEAR_MONTHS)
    expect(r.cost).toBeCloseTo(sum(r.months.map((m) => m.cost)), 9)
    for (const m of r.months) expect(m.cost).toBeCloseTo(m.storage + m.minCharge + m.fetch, 9)
  })

  it('is pure and deterministic', () => {
    expect(simulateYear(solution)).toEqual(simulateYear(solution))
    expect(simulateYear(START)).toEqual(simulateYear(START))
  })

  it('the solution passes every event, with a reason on each line', () => {
    const r = simulateYear(solution)
    expect(r.log.every((l) => l.ok)).toBe(true)
    expect(r.cost).toBeLessThanOrEqual(YEAR_BUDGET)
    for (const l of r.log) expect(l.text.length).toBeGreaterThan(10)
  })

  it('a brand-new bucket (the start) fails on every count', () => {
    const r = simulateYear(START)
    expect(r.lost).toBeGreaterThan(0)
    expect(r.late).toBeGreaterThan(0)
    expect(r.cost).toBeGreaterThan(YEAR_BUDGET)
    expect(r.solved).toBe(false)
  })

  it('the cost breakdown adds up to the bill', () => {
    for (const c of [solution, START, { ...solution, placement: { ...solution.placement, backups: 'intelligent-tiering' as const } }]) {
      const r = simulateYear(c)
      expect(sum(Object.values(r.byPrefix).map((b) => b.storage + b.fetch)) + r.minCharges).toBeCloseTo(r.cost, 6)
    }
  })
})

describe('final model: each event', () => {
  it('the intern: versioning on restores all three photos; off loses all three', () => {
    expect(logOf(solution, 'intern-script')).toMatchObject({ ok: true, lost: 0 })
    expect(logOf({ ...solution, versioning: 'off' }, 'intern-script')).toMatchObject({ ok: false, lost: 3 })
  })

  it('the bot: a private bucket leaks nothing; Block Public Access stops a public policy', () => {
    expect(logOf(solution, 'bot-probe').leaked).toBe(0)
    expect(logOf({ ...solution, access: { ...solution.access, publicRead: true } }, 'bot-probe').leaked).toBe(0)
  })

  it("last month's receipt: needs a link the role can sign", () => {
    expect(logOf({ ...solution, access: { ...solution.access, link: null } }, 'receipt-last-month')).toMatchObject({ ok: false, late: 1 })
    const noRole = { ...solution, access: { ...solution.access, roleRead: { menu: true, receipts: false } } }
    expect(logOf(noRole, 'receipt-last-month')).toMatchObject({ ok: false, late: 1 })
  })

  it("last month's receipt: a public bucket serves it, and the line says that is why", () => {
    const open = { ...solution, access: { ...solution.access, link: null, publicRead: true, blockPublicAccess: false } }
    expect(logOf(open, 'receipt-last-month')).toMatchObject({ ok: true })
    expect(logOf(open, 'receipt-last-month').text).toMatch(/only because the whole bucket is public/)
  })

  it("last month's receipt: a rule that archives it to Glacier Flexible Retrieval makes it late", () => {
    const slow = withRule(solution, { ...ruleOf(solution, 'receipts'), transitions: [{ afterDays: 30, to: 'glacier-flexible' }] })
    expect(logOf(slow, 'receipt-last-month')).toMatchObject({ ok: false, late: 1 })
  })

  it('5-year-old receipts: Deep Archive is fine within 2 days; expiring them sooner loses them', () => {
    expect(logOf(solution, 'receipts-5-years').ok).toBe(true)
    const early = withRule(solution, { ...ruleOf(solution, 'receipts'), expireAfterDays: 1095 })
    expect(logOf(early, 'receipts-5-years')).toMatchObject({ ok: false, lost: 1 })
  })

  it('5-year-old receipts: hidden by an expiry (versioning on) still counts as gone', () => {
    const hidden = withRule(solution, { ...ruleOf(solution, 'receipts'), expireAfterDays: 1095, noncurrentExpireAfterDays: null })
    expect(logOf(hidden, 'receipts-5-years').lost).toBe(1)
  })

  it('old reports: Glacier Flexible Retrieval is too slow; expired reports are re-made, late but not lost', () => {
    const slow = withRule(solution, { prefix: 'reports', transitions: [{ afterDays: 90, to: 'glacier-flexible' }], expireAfterDays: null, noncurrentExpireAfterDays: null })
    expect(logOf(slow, 'reports-reopened')).toMatchObject({ ok: false, late: 1, lost: 0 })
    const gone = withRule(solution, { prefix: 'reports', transitions: [], expireAfterDays: 180, noncurrentExpireAfterDays: 1 })
    expect(logOf(gone, 'reports-reopened')).toMatchObject({ ok: false, late: 1, lost: 0 })
  })

  it('the busy month: the app needs its role to read menu photos', () => {
    const noMenu = { ...solution, access: { ...solution.access, roleRead: { menu: false, receipts: true } } }
    expect(logOf(noMenu, 'busy-month')).toMatchObject({ ok: false, late: 1 })
  })

  it('the busy month: delivery photos on Deep Archive miss the complaint deadline', () => {
    const r = logOf({ ...solution, placement: { ...solution.placement, delivery: 'deep-archive' } }, 'busy-month')
    expect(r.ok).toBe(false)
    expect(r.late).toBeGreaterThan(0)
  })

  it('the busy month: delivery photos deleted before 30 days are lost when a complaint needs one', () => {
    const early = withRule(solution, { ...ruleOf(solution, 'delivery'), transitions: [], expireAfterDays: 7 })
    expect(logOf(early, 'busy-month').lost).toBe(1)
  })

  it('the fire: reports on One Zone-IA are re-made, not lost', () => {
    expect(logOf(solution, 'az-destroyed')).toMatchObject({ ok: true, lost: 0 })
    expect(logOf(solution, 'az-destroyed').text).toMatch(/re-made/)
  })

  it('the fire: a rule that moves receipts to One Zone-IA loses them', () => {
    const oz = withRule(solution, { ...ruleOf(solution, 'receipts'), transitions: [{ afterDays: 30, to: 'one-zone-ia' }] })
    expect(logOf(oz, 'az-destroyed').lost).toBe(1)
  })
})

describe('final model: the bill', () => {
  it('keeping old versions forever (expiry without old-version cleanup) costs more', () => {
    const keep = solution.rules.map((r) => ({ ...r, noncurrentExpireAfterDays: null }))
    expect(simulateYear({ ...solution, rules: keep }).cost).toBeGreaterThan(simulateYear(solution).cost)
  })

  it('everything on S3 Standard is over budget, even with the right rules', () => {
    const allStandard = { menu: 'standard', receipts: 'standard', delivery: 'standard', backups: 'standard', reports: 'standard' } as const
    expect(simulateYear({ ...solution, placement: allStandard }).cost).toBeGreaterThan(YEAR_BUDGET)
  })

  it('menu photos on Standard-IA pay fetch fees that break the budget', () => {
    const r = simulateYear({ ...solution, placement: { ...solution.placement, menu: 'standard-ia' } })
    expect(r.cost).toBeGreaterThan(YEAR_BUDGET)
    expect(r.byPrefix.menu.fetch).toBeGreaterThan(simulateYear(solution).byPrefix.menu.fetch)
  })

  it('menu photos on Intelligent-Tiering stay in its frequent tier: the Standard price plus monitoring', () => {
    const tiered = simulateYear({ ...solution, placement: { ...solution.placement, menu: 'intelligent-tiering' } })
    const std = simulateYear(solution)
    expect(tiered.byPrefix.menu.storage).toBeGreaterThan(std.byPrefix.menu.storage)
    expect(tiered.months[0].stock.some((s) => s.prefix === 'menu' && s.cls === 'intelligent-tiering')).toBe(true)
  })

  it('the setup the hint describes passes (no 7-year expiry needed inside this year)', () => {
    const hinted: StoreConfig = {
      ...solution,
      rules: [
        { prefix: 'menu', transitions: [], expireAfterDays: null, noncurrentExpireAfterDays: 30 },
        { prefix: 'receipts', transitions: [{ afterDays: 30, to: 'glacier-ir' }, { afterDays: 365, to: 'deep-archive' }], expireAfterDays: null, noncurrentExpireAfterDays: 1 },
        { prefix: 'delivery', transitions: [], expireAfterDays: 30, noncurrentExpireAfterDays: 1 },
        { prefix: 'backups', transitions: [], expireAfterDays: 30, noncurrentExpireAfterDays: 1 },
        { prefix: 'reports', transitions: [], expireAfterDays: null, noncurrentExpireAfterDays: 1 },
      ],
    }
    expect(simulateYear(hinted).solved).toBe(true)
  })

  it('a sensible alternative still fits: reports on Standard-IA instead of One Zone-IA', () => {
    expect(simulateYear({ ...solution, placement: { ...solution.placement, reports: 'standard-ia' } }).solved).toBe(true)
  })

  it('history is 5 years of 30-day months', () => {
    expect(HISTORY_MONTHS).toBe(60)
  })
})

describe('classAt', () => {
  const receipts = ruleOf(solution, 'receipts')
  it('follows the rule down the shelves, then hides the file at expiry', () => {
    expect(classAt(receipts, 'standard-ia', 0)).toBe('standard-ia')
    expect(classAt(receipts, 'standard-ia', 59)).toBe('glacier-ir')
    expect(classAt(receipts, 'standard-ia', 1825)).toBe('deep-archive')
    expect(classAt(receipts, 'standard-ia', 2555)).toBeNull()
  })

  it('a rule S3 refuses does nothing', () => {
    expect(classAt(receipts, 'deep-archive', 59)).toBe('deep-archive')
  })
})
