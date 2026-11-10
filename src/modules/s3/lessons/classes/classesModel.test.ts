import { describe, expect, it } from 'vitest'
import { classById, type ClassId } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, RECOMMENDED_CLASSES } from '../../story'
import {
  MONTH_BUDGET,
  MONTH_EVENTS,
  ONE_ZONE_AZ,
  monthCost,
  objectCount,
  playMonth,
  runMonth,
  solution,
  type Placement,
} from './classesModel'

const all = (id: ClassId) => Object.fromEntries(PREFIX_IDS.map((p) => [p, id])) as Placement

describe('the month (brief)', () => {
  it('the recommended shelves pass', () => {
    expect(runMonth(solution).solved).toBe(true)
  })
  it('Standard everywhere is over budget', () => {
    expect(runMonth(all('standard')).cost).toBeGreaterThan(MONTH_BUDGET)
  })
  it('Intelligent-Tiering saves nothing in month one', () => {
    expect(runMonth(all('intelligent-tiering')).cost).toBeGreaterThan(runMonth(all('standard')).cost)
  })
  it('menu photos on an IA shelf cost more because of fetch fees', () => {
    expect(runMonth({ ...solution, menu: 'standard-ia' }).cost).toBeGreaterThan(runMonth(solution).cost)
  })
  it('archives are too slow for urgent fetches', () => {
    expect(runMonth({ ...solution, delivery: 'deep-archive' }).late.length).toBeGreaterThan(0)
    expect(runMonth({ ...solution, backups: 'glacier-flexible' }).late.length).toBeGreaterThan(0)
  })
  it('One Zone-IA loses what cannot be re-made and re-makes reports', () => {
    expect(runMonth({ ...solution, receipts: 'one-zone-ia' }).lost).toContain('receipts')
    expect(runMonth(solution).remade).toEqual(['reports'])
    expect(runMonth(solution).lost).toEqual([])
  })
})

describe('the month (details)', () => {
  it('the solution is the shared recommended placement', () => {
    expect(solution).toEqual(RECOMMENDED_CLASSES)
  })

  it('has the six scripted events in order, ending with the AZ that holds One Zone data destroyed', () => {
    expect(MONTH_EVENTS.map((e) => (e.kind === 'fetch' ? e.prefix : e.kind))).toEqual([
      'menu',
      'delivery',
      'backups',
      'reports',
      'receipts',
      'az-destroyed',
    ])
    const last = MONTH_EVENTS[MONTH_EVENTS.length - 1]
    expect(last).toEqual({ kind: 'az-destroyed', az: ONE_ZONE_AZ })
  })

  it('fetch sizes come from the shared file sizes', () => {
    const gb = (p: string) => MONTH_EVENTS.find((e) => e.kind === 'fetch' && e.prefix === p)
    expect(gb('delivery')).toMatchObject({ gb: FILE_TYPES.delivery.avgObjectMb / 1000, deadlineSeconds: 60 })
    expect(gb('backups')).toMatchObject({ gb: FILE_TYPES.backups.avgObjectMb / 1000, deadlineSeconds: 3600 })
    expect(gb('menu')).toMatchObject({ deadlineSeconds: 1 })
  })

  it('bills storage, fetch fees and, for Intelligent-Tiering only, monitoring', () => {
    const bill = monthCost(solution)
    const menu = bill.lines.find((l) => l.prefix === 'menu')!
    expect(menu.store).toBeCloseTo(FILE_TYPES.menu.storedGb * classById('standard').storePerGbMonth)
    expect(menu.fetch).toBe(0)
    expect(bill.lines.every((l) => l.monitoring === 0)).toBe(true)
    const it = monthCost(all('intelligent-tiering'))
    const receipts = it.lines.find((l) => l.prefix === 'receipts')!
    // Billed at the frequent (Standard) price in month one, plus a fee per 1,000 objects.
    expect(receipts.store).toBeCloseTo(FILE_TYPES.receipts.storedGb * classById('standard').storePerGbMonth)
    expect(receipts.monitoring).toBeCloseTo((objectCount('receipts') / 1000) * 0.0025)
    expect(receipts.fetch).toBe(0)
  })

  it('totals the lines', () => {
    const bill = monthCost(solution)
    const sum = bill.lines.reduce((n, l) => n + l.store + l.fetch + l.monitoring, 0)
    expect(bill.total).toBeCloseTo(sum)
    expect(runMonth(solution).cost).toBeCloseTo(bill.total)
  })

  it('the solution fits the budget with little to spare, so the budget is not trivial', () => {
    const cost = runMonth(solution).cost
    expect(cost).toBeLessThanOrEqual(MONTH_BUDGET)
    expect(MONTH_BUDGET - cost).toBeLessThan(2)
    // Moving receipts back to Standard alone breaks the budget.
    expect(runMonth({ ...solution, receipts: 'standard' }).cost).toBeGreaterThan(MONTH_BUDGET)
  })

  it('names the late fetches', () => {
    expect(runMonth(solution).late).toEqual([])
    const late = runMonth({ ...solution, delivery: 'deep-archive', backups: 'glacier-flexible' }).late
    expect(late).toHaveLength(2)
    expect(late[0]).toMatch(/delivery photo/i)
    expect(late[1]).toMatch(/backup/i)
  })

  it('a fetch from an instant shelf is on time, even with a 1-second deadline', () => {
    const steps = playMonth(all('glacier-ir'))
    expect(steps.filter((s) => s.kind === 'fetch').every((s) => s.kind === 'fetch' && s.onTime)).toBe(true)
  })

  it('nothing is lost or re-made when no prefix is in One Zone-IA', () => {
    const r = runMonth(all('standard'))
    expect(r.lost).toEqual([])
    expect(r.remade).toEqual([])
  })

  it('is solved only when under budget, on time and nothing lost', () => {
    expect(runMonth(all('standard')).solved).toBe(false)
    expect(runMonth({ ...solution, delivery: 'deep-archive' }).solved).toBe(false)
    expect(runMonth({ ...solution, menu: 'one-zone-ia' }).solved).toBe(false)
  })
})
