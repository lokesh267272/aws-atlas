import { describe, expect, it } from 'vitest'
import { classById, type ClassId } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, RECOMMENDED_CLASSES, type PrefixId } from '../../story'
import {
  MENU_VERSIONS_GB_PER_MONTH,
  SEVEN_YEAR_BUDGET,
  canMove,
  emptyRule,
  ruleEvents,
  ruleProblems,
  simulate,
  solution,
  solved,
  type Rule,
} from './lifecycleModel'

/** The rules with one prefix's rule patched (added if missing). */
function withRule(rules: Rule[], prefix: PrefixId, patch: Partial<Rule>): Rule[] {
  const found = rules.some((r) => r.prefix === prefix)
  const base = found ? rules : [...rules, emptyRule(prefix)]
  return base.map((r) => (r.prefix === prefix ? { ...r, ...patch } : r))
}

const rule = (prefix: PrefixId, transitions: Rule['transitions'], expireAfterDays: number | null = null, noncurrentExpireAfterDays: number | null = null): Rule => ({
  prefix,
  transitions,
  expireAfterDays,
  noncurrentExpireAfterDays,
})

const price = (id: ClassId) => classById(id).storePerGbMonth

describe('the 7-year challenge', () => {
  it('the solution passes 7 years', () => {
    expect(solved(simulate(solution))).toBe(true)
  })

  it('no rules is over budget', () => {
    expect(simulate([]).total).toBeGreaterThan(SEVEN_YEAR_BUDGET)
  })

  it('deleting receipts after a year is too early', () => {
    expect(simulate(withRule(solution, 'receipts', { expireAfterDays: 365 })).earlyDeletes).toContain('receipts')
  })

  it('expiring menu photos or reports at all is too early (Mealhop keeps them)', () => {
    expect(simulate([rule('menu', [], 400)]).earlyDeletes).toEqual(['menu'])
    expect(simulate([rule('reports', [], 4000)]).earlyDeletes).toEqual(['reports'])
  })

  it('deleting delivery photos and backups at 30 days is allowed, sooner is not', () => {
    expect(simulate(solution).earlyDeletes).toEqual([])
    expect(simulate(withRule(solution, 'delivery', { expireAfterDays: 29 })).earlyDeletes).toEqual(['delivery'])
  })

  it('old menu versions pile up without a noncurrent rule', () => {
    expect(simulate(solution.filter((x) => x.prefix !== 'menu')).total).toBeGreaterThan(simulate(solution).total)
  })

  it('is deterministic', () => {
    expect(simulate(solution)).toEqual(simulate(solution))
  })

  it('is not trivial: every part of the solution is needed to stay under budget', () => {
    const without = (prefix: PrefixId) => solution.filter((r) => r.prefix !== prefix)
    for (const p of ['menu', 'receipts', 'delivery', 'backups'] as const) {
      expect(simulate(without(p)).total, p).toBeGreaterThan(SEVEN_YEAR_BUDGET)
    }
  })

  it('stays out of reach with cheap tricks elsewhere: archiving reports does not pay for skipping receipts or menu', () => {
    const reportsArchived = withRule(solution, 'reports', { transitions: [{ afterDays: 30, to: 'deep-archive' }] })
    const receiptsToDeep = withRule(reportsArchived, 'receipts', { transitions: [{ afterDays: 30, to: 'deep-archive' }] })
    const menuOneDay = withRule(reportsArchived, 'menu', { noncurrentExpireAfterDays: 1 })
    expect(simulate(menuOneDay.filter((r) => r.prefix !== 'receipts')).total).toBeGreaterThan(SEVEN_YEAR_BUDGET)
    expect(simulate(receiptsToDeep.filter((r) => r.prefix !== 'menu')).total).toBeGreaterThan(SEVEN_YEAR_BUDGET)
  })

  it('leaves room for other sensible answers', () => {
    // One move for receipts is enough.
    expect(solved(simulate(withRule(solution, 'receipts', { transitions: [{ afterDays: 30, to: 'glacier-ir' }] })))).toBe(true)
    // Old menu versions kept for 90 days as an undo window.
    expect(solved(simulate(withRule(solution, 'menu', { noncurrentExpireAfterDays: 90 })))).toBe(true)
  })

  it('the solution has no rule problems and every rule is on the challenge prefixes', () => {
    const r = simulate(solution)
    PREFIX_IDS.forEach((p) => expect(r.ruleProblems[p]).toEqual([]))
    expect(solution.map((x) => x.prefix).sort()).toEqual(['backups', 'delivery', 'menu', 'receipts'])
  })

  it('a menu-version rule makes sense for the story numbers', () => {
    expect(MENU_VERSIONS_GB_PER_MONTH).toBeGreaterThan(0)
    expect(MENU_VERSIONS_GB_PER_MONTH).toBeLessThanOrEqual(FILE_TYPES.menu.newGbPerMonth)
  })
})

describe('rule problems (S3 refuses these rules)', () => {
  it('moving into Standard-IA before day 30 is not allowed', () => {
    expect(
      ruleProblems({ prefix: 'receipts', transitions: [{ afterDays: 10, to: 'standard-ia' }], expireAfterDays: null, noncurrentExpireAfterDays: null }, 'standard'),
    ).toContain('ia-too-soon')
    expect(ruleProblems(rule('receipts', [{ afterDays: 29, to: 'one-zone-ia' }]), 'standard')).toContain('ia-too-soon')
    expect(ruleProblems(rule('receipts', [{ afterDays: 30, to: 'standard-ia' }]), 'standard')).toEqual([])
  })

  it('a move back up the shelves is not allowed', () => {
    const r = rule('receipts', [
      { afterDays: 200, to: 'deep-archive' },
      { afterDays: 400, to: 'glacier-ir' },
    ])
    expect(ruleProblems(r, 'standard-ia')).toContain('not-down-the-waterfall')
  })

  it('a move to the shelf the files already sit on is not allowed', () => {
    expect(ruleProblems(rule('receipts', [{ afterDays: 60, to: 'standard-ia' }]), 'standard-ia')).toContain('not-down-the-waterfall')
  })

  it('One Zone-IA cannot move to Glacier Instant Retrieval', () => {
    expect(canMove('one-zone-ia', 'glacier-ir')).toBe(false)
    expect(canMove('one-zone-ia', 'glacier-flexible')).toBe(true)
    expect(canMove('intelligent-tiering', 'standard-ia')).toBe(false)
    expect(canMove('standard', 'deep-archive')).toBe(true)
    expect(ruleProblems(rule('reports', [{ afterDays: 60, to: 'glacier-ir' }]), 'one-zone-ia')).toEqual(['not-down-the-waterfall'])
  })

  it('each move needs more days than the one before', () => {
    const r = rule('receipts', [
      { afterDays: 365, to: 'glacier-ir' },
      { afterDays: 365, to: 'deep-archive' },
    ])
    expect(ruleProblems(r, 'standard-ia')).toEqual(['days-not-increasing'])
  })

  it('a move out of an IA shelf needs 30 days there first', () => {
    const r = rule('receipts', [
      { afterDays: 30, to: 'standard-ia' },
      { afterDays: 45, to: 'glacier-flexible' },
    ])
    expect(ruleProblems(r, 'standard')).toEqual(['next-step-too-soon'])
    const ok = rule('receipts', [
      { afterDays: 30, to: 'standard-ia' },
      { afterDays: 60, to: 'glacier-flexible' },
    ])
    expect(ruleProblems(ok, 'standard')).toEqual([])
  })

  it('files that start on an IA shelf can move on at once (they just pay its minimum)', () => {
    expect(ruleProblems(rule('backups', [{ afterDays: 0, to: 'glacier-ir' }]), 'standard-ia')).toEqual([])
  })

  it('expiry must come after the last move', () => {
    expect(ruleProblems(rule('receipts', [{ afterDays: 365, to: 'deep-archive' }], 365), 'standard-ia')).toEqual(['expire-before-last-move'])
    expect(ruleProblems(rule('receipts', [{ afterDays: 365, to: 'deep-archive' }], 366), 'standard-ia')).toEqual([])
  })

  it('a refused rule does nothing in the simulation, and simulate reports why', () => {
    const bad = rule('receipts', [{ afterDays: 10, to: 'standard-ia' }], 2555)
    const r = simulate([bad], 84, { ...RECOMMENDED_CLASSES, receipts: 'standard' })
    expect(r.ruleProblems.receipts).toEqual(['ia-too-soon'])
    expect(r.total).toBeCloseTo(simulate([], 84, { ...RECOMMENDED_CLASSES, receipts: 'standard' }).total, 6)
  })
})

describe('billing', () => {
  it('runs 84 months and the total is the sum of the months', () => {
    const r = simulate(solution)
    expect(r.months).toHaveLength(84)
    expect(r.months[0].month).toBe(1)
    expect(r.total).toBeCloseTo(r.months.reduce((s, m) => s + m.cost, 0), 6)
  })

  it('with no rules every month adds a full batch: month 84 holds 84 months of files', () => {
    const last = simulate([]).months[83]
    const iaGb = (FILE_TYPES.receipts.newGbPerMonth + FILE_TYPES.delivery.newGbPerMonth + FILE_TYPES.backups.newGbPerMonth) * 84
    expect(last.gbByClass['standard-ia']).toBeCloseTo(iaGb, 6)
    expect(last.gbByClass.standard).toBeCloseTo((FILE_TYPES.menu.newGbPerMonth + MENU_VERSIONS_GB_PER_MONTH) * 84, 6)
    expect(last.gbByClass['one-zone-ia']).toBeCloseTo(FILE_TYPES.reports.newGbPerMonth * 84, 6)
  })

  it('a 30-day expiry plus 1 day for the old version bills each batch for 31 days', () => {
    const r = simulate([rule('delivery', [], 30, 1)], 3)
    const gb = FILE_TYPES.delivery.newGbPerMonth
    // Month 2: batch 2 for 30 days, batch 1 for the 1 extra day as an old version.
    expect(r.months[1].oldGb - MENU_VERSIONS_GB_PER_MONTH * 2).toBeCloseTo(gb / 30, 6)
    const deliveryMonth2 = r.months[1].gbByClass['standard-ia'] - FILE_TYPES.receipts.newGbPerMonth * 2 - FILE_TYPES.backups.newGbPerMonth * 2
    expect(deliveryMonth2).toBeCloseTo(gb * (1 + 1 / 30), 6)
  })

  it('with versioning on, expiring without deleting old versions keeps paying for them', () => {
    const hidden = simulate([rule('delivery', [], 30)])
    const gone = simulate([rule('delivery', [], 30, 1)])
    expect(hidden.total).toBeGreaterThan(gone.total + 10_000)
    expect(hidden.months[83].oldGb).toBeGreaterThan(0)
    expect(hidden.earlyDeletes).toEqual([])
  })

  it('moves lower the bill: receipts on cheaper shelves cost less', () => {
    const plain = simulate([rule('receipts', [], 2555, 1)]).total
    const moved = simulate([rule('receipts', [{ afterDays: 30, to: 'glacier-ir' }, { afterDays: 365, to: 'deep-archive' }], 2555, 1)]).total
    expect(moved).toBeLessThan(plain)
  })

  it('deleting early from a 90-day class still bills 90 days', () => {
    const r = simulate([{ prefix: 'backups', transitions: [{ afterDays: 0, to: 'glacier-ir' }], expireAfterDays: 30, noncurrentExpireAfterDays: 1 }])
    expect(r.minDurationCharges).toBeGreaterThan(0)
    const gb = FILE_TYPES.backups.newGbPerMonth
    // Left Standard-IA after 0 of its 30 days, deleted from Glacier IR after 31 of its 90 days.
    const leaveIa = gb * price('standard-ia') * (30 / 30)
    const deleteIr = gb * price('glacier-ir') * (59 / 30)
    // Every batch leaves Standard-IA inside the 7 years; the last batch is deleted on day 31, after the run ends.
    expect(r.minDurationCharges).toBeCloseTo(84 * leaveIa + 83 * deleteIr, 6)
  })

  it('a move after the minimum has no extra charge', () => {
    expect(simulate(solution).minDurationCharges).toBe(0)
  })

  it('Intelligent-Tiering bills Standard, then Standard-IA after 30 days, then Glacier IR after 90, plus monitoring', () => {
    const r = simulate([rule('reports', [{ afterDays: 0, to: 'glacier-flexible' }]), rule('receipts', [{ afterDays: 0, to: 'intelligent-tiering' }])], 4, {
      ...RECOMMENDED_CLASSES,
      receipts: 'standard',
    })
    expect(r.months[3].gbByClass['intelligent-tiering']).toBeCloseTo(FILE_TYPES.receipts.newGbPerMonth * 4, 6)
    // Month 4 holds batches aged 0, 1, 2 and 3 months.
    const gb = FILE_TYPES.receipts.newGbPerMonth
    const objectsPerGb = 1024 / FILE_TYPES.receipts.avgObjectMb
    const monitoring = ((gb * 4 * objectsPerGb) / 1000) * 0.0025
    const storage = gb * (price('standard') + price('standard-ia') * 2 + price('glacier-ir'))
    const reports = FILE_TYPES.reports.newGbPerMonth * 4 * price('glacier-flexible')
    // The prefixes without a rule: menu photos and old versions on Standard, delivery and backups on Standard-IA.
    const others =
      (FILE_TYPES.menu.newGbPerMonth + MENU_VERSIONS_GB_PER_MONTH) * 4 * price('standard') +
      (FILE_TYPES.delivery.newGbPerMonth + FILE_TYPES.backups.newGbPerMonth) * 4 * price('standard-ia')
    expect(r.months[3].storageCost).toBeCloseTo(storage + monitoring + reports + others, 6)
  })
})

describe('rule events (the path shown on each card)', () => {
  it('lists start, moves, hide and delete days, with early charges', () => {
    const ev = ruleEvents(rule('backups', [{ afterDays: 0, to: 'glacier-ir' }], 30, 1), 'standard-ia')
    expect(ev.map((e) => [e.kind, e.day, e.cls])).toEqual([
      ['start', 0, 'standard-ia'],
      ['move', 0, 'glacier-ir'],
      ['hide', 30, 'glacier-ir'],
      ['delete', 31, 'glacier-ir'],
    ])
    expect(ev[1].early).toEqual({ cls: 'standard-ia', stayed: 0, min: 30 })
    expect(ev[3].early).toEqual({ cls: 'glacier-ir', stayed: 31, min: 90 })
  })

  it('a refused rule shows only the start', () => {
    expect(ruleEvents(rule('receipts', [{ afterDays: 5, to: 'standard-ia' }]), 'standard').map((e) => e.kind)).toEqual(['start'])
  })
})
