import { describe, expect, it } from 'vitest'
import {
  BATCH,
  BUDGET_PER_MONTH,
  DEMAND,
  PRICE_PER_SERVER_HOUR,
  billEbs,
  billInstance,
  hourBands,
  interruptionsFor,
  monthBill,
  simulateMonth,
  solution,
} from './pricingModel'

describe('pricing model: example prices', () => {
  it('keeps the example ratios: Spot at most 0.3x On-Demand, Savings Plan in between', () => {
    const p = PRICE_PER_SERVER_HOUR
    expect(p.spot).toBeLessThanOrEqual(0.3 * p['on-demand'] + 1e-9)
    expect(p['savings-plan']).toBeGreaterThan(p.spot)
    expect(p['savings-plan']).toBeLessThan(p['on-demand'])
  })
})

describe('pricing model: lifecycle billing', () => {
  it('bills at least 60 seconds per start, then per second', () => {
    expect(billInstance('running', 30)).toBeCloseTo(billInstance('running', 60)); expect(billInstance('running', 90)).toBeGreaterThan(billInstance('running', 60))
  })
  it('a stopped server costs nothing but its disk still does', () => { expect(billInstance('stopped', 3600)).toBe(0); expect(billEbs(8, 1)).toBeGreaterThan(0) })
  it('bills one running hour at the On-Demand hourly price', () => {
    expect(billInstance('running', 3600)).toBeCloseTo(PRICE_PER_SERVER_HOUR['on-demand'])
  })
  it('bills the disk in proportion to its size and time', () => {
    expect(billEbs(16, 10)).toBeCloseTo(2 * billEbs(8, 10))
    expect(billEbs(8, 20)).toBeCloseTo(2 * billEbs(8, 10))
  })
})

describe('pricing model: the demand curve', () => {
  it('has 24 hours with lunch and dinner peaks and a quiet night', () => {
    expect(DEMAND).toHaveLength(24)
    const night = Math.max(...DEMAND.slice(0, 6))
    const lunch = Math.max(...DEMAND.slice(11, 15))
    const afternoon = Math.min(...DEMAND.slice(14, 18))
    const dinner = Math.max(...DEMAND.slice(18, 22))
    expect(lunch).toBeGreaterThan(afternoon)
    expect(dinner).toBeGreaterThan(afternoon)
    expect(Math.min(...DEMAND)).toBe(night)
  })
  it('runs the batch job at night', () => {
    expect(BATCH.start).toBeGreaterThanOrEqual(0)
    expect(BATCH.start + BATCH.hours).toBeLessThanOrEqual(6)
  })
})

describe('pricing model: a month', () => {
  it('the solution is under budget with no lost orders', () => { const r = simulateMonth(solution); expect(r.ordersLost).toBe(0); expect(r.cost).toBeLessThanOrEqual(BUDGET_PER_MONTH) })
  it('all On-Demand loses nothing but is over budget', () => { expect(simulateMonth({ savingsPlanServers: 0, peaks: 'on-demand', batch: 'on-demand' }).cost).toBeGreaterThan(BUDGET_PER_MONTH) })
  it('a Savings Plan sized to the peak is over budget', () => { expect(simulateMonth({ ...solution, savingsPlanServers: Math.max(...DEMAND) }).cost).toBeGreaterThan(BUDGET_PER_MONTH) })
  it('Spot for live peaks loses orders when interrupted', () => { expect(simulateMonth({ ...solution, peaks: 'spot' }).ordersLost).toBeGreaterThan(0) })

  it('needs Spot for the batch job to fit the budget', () => {
    expect(simulateMonth({ ...solution, batch: 'on-demand' }).cost).toBeGreaterThan(BUDGET_PER_MONTH)
  })
  it('needs a Savings Plan to fit the budget', () => {
    expect(simulateMonth({ ...solution, savingsPlanServers: 0 }).cost).toBeGreaterThan(BUDGET_PER_MONTH)
  })
  it('an interrupted Spot batch job reruns: it costs a little more but loses no orders', () => {
    const quiet = simulateMonth(solution, { interruptHours: [] })
    const hit = simulateMonth(solution, { interruptHours: [BATCH.start] })
    expect(hit.ordersLost).toBe(0)
    expect(hit.cost).toBeGreaterThan(quiet.cost)
  })
  it('without interruptions, Spot peaks lose nothing', () => {
    expect(simulateMonth({ ...solution, peaks: 'spot' }, { interruptHours: [] }).ordersLost).toBe(0)
  })
  it('pays for Savings Plan servers every hour, even idle ones', () => {
    const plan = { ...solution, savingsPlanServers: Math.max(...DEMAND) }
    const bill = monthBill(plan)
    expect(bill.savingsPlanIdle).toBeGreaterThan(0)
    expect(bill.savingsPlan).toBeCloseTo(plan.savingsPlanServers * 24 * 30 * PRICE_PER_SERVER_HOUR['savings-plan'])
  })
  it('counts only the hours already played when the month is part-way through', () => {
    const at = (upToHour: number) => {
      const b = monthBill(solution, { upToHour })
      return b.savingsPlan + b.onDemand + b.spot
    }
    expect(at(0)).toBe(0)
    expect(at(12)).toBeGreaterThan(0)
    expect(at(12)).toBeLessThan(at(24))
    expect(at(24)).toBeCloseTo(simulateMonth(solution).cost)
  })
  it('splits the bill into parts that add up to the month cost', () => {
    const bill = monthBill(solution)
    expect(bill.savingsPlan + bill.onDemand + bill.spot).toBeCloseTo(simulateMonth(solution).cost)
  })
})

describe('pricing model: per-hour bands and interruptions', () => {
  it('stacks the Savings Plan, peaks and batch so live demand is always met', () => {
    for (let h = 0; h < 24; h++) {
      const b = hourBands(solution, h)
      expect(b.spUsed + b.peak).toBe(DEMAND[h])
      expect(b.spUsed + b.spIdle).toBe(solution.savingsPlanServers)
    }
  })
  it('reports which job an interruption hits', () => {
    expect(interruptionsFor(solution).map((i) => i.hits)).toEqual(['batch'])
    const risky = interruptionsFor({ ...solution, peaks: 'spot' })
    expect(risky.some((i) => i.hits === 'live' && i.ordersLost > 0)).toBe(true)
    expect(interruptionsFor({ ...solution, batch: 'on-demand' })).toEqual([])
  })
})
