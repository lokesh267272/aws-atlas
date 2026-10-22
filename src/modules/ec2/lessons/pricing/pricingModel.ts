/**
 * The made-up numbers behind lesson 5, "Pay less".
 * Prices are example prices with realistic ratios, not live AWS prices.
 * No React in this file, so the maths stays easy to test and cheap to reuse
 * (lesson 6 imports PRICE_PER_SERVER_HOUR: keep it exported and stable).
 */

export type PriceModel = 'on-demand' | 'savings-plan' | 'spot'

/** Example price of one server for one hour, in dollars. Spot is 0.3x On-Demand; the Savings Plan sits in between. */
export const PRICE_PER_SERVER_HOUR: Record<PriceModel, number> = {
  'on-demand': 0.1,
  'savings-plan': 0.05,
  spot: 0.03,
}

/** Example price of 1 GiB of EBS disk for one month, in dollars. */
export const EBS_PER_GIB_MONTH = 0.08

/** Hours in a billing month, as AWS pricing examples count it. */
export const HOURS_PER_MONTH = 730

/** Days in the simulated month. */
export const DAYS_PER_MONTH = 30

/** Linux instances are billed per second, with at least this many seconds each time they start. */
export const MIN_BILLED_SECONDS = 60

/**
 * The instance charge for one run (one start), On-Demand.
 * Running: per second, at least 60 seconds. Stopped: nothing.
 */
export function billInstance(state: 'running' | 'stopped', seconds: number): number {
  if (state === 'stopped') return 0
  return (Math.max(MIN_BILLED_SECONDS, seconds) / 3600) * PRICE_PER_SERVER_HOUR['on-demand']
}

/** The disk charge: billed whether the server is running or stopped. */
export function billEbs(gib: number, hours: number): number {
  return (gib * EBS_PER_GIB_MONTH * hours) / HOURS_PER_MONTH
}

/** Servers needed for live orders, for each hour of the day (index 0 = midnight to 1 am). */
export const DEMAND: number[] = [2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 5, 7, 9, 8, 5, 4, 4, 5, 8, 10, 9, 6, 4, 3]

/** The nightly route-planning job: starts at 1 am, runs 4 hours on 6 servers. It can rerun if interrupted. */
export const BATCH = { start: 1, hours: 4, servers: 6 } as const

/** Orders one server takes in an hour at the rush. Losing a server for an hour loses these. */
export const ORDERS_PER_SERVER_HOUR = 25

/** Hours of the day when AWS takes Spot capacity back once this month: one quiet night, one busy evening. */
export const INTERRUPT_HOURS: readonly number[] = [3, 19]

export const BUDGET_PER_MONTH = 300

export interface Plan {
  /** Servers covered by a Savings Plan: paid for every hour, used or not. */
  savingsPlanServers: number
  /** How to pay for live servers above the Savings Plan. */
  peaks: 'on-demand' | 'spot'
  /** How to pay for the nightly batch job. */
  batch: 'on-demand' | 'spot'
}

/** Savings Plan for the always-on night minimum, On-Demand for the rushes, Spot for the batch job. */
export const solution: Plan = { savingsPlanServers: Math.min(...DEMAND), peaks: 'on-demand', batch: 'spot' }

export const inBatch = (h: number) => h >= BATCH.start && h < BATCH.start + BATCH.hours

/** Servers in each band for one hour of the day. spUsed + peak always equals live demand. */
export function hourBands(p: Plan, h: number) {
  const live = DEMAND[h]
  const spUsed = Math.min(p.savingsPlanServers, live)
  return {
    spUsed,
    spIdle: p.savingsPlanServers - spUsed,
    peak: live - spUsed,
    batch: inBatch(h) ? BATCH.servers : 0,
  }
}

/** Cost of one hour of the day, once (not yet times 30 days). */
export function hourCost(p: Plan, h: number): number {
  const b = hourBands(p, h)
  return (
    p.savingsPlanServers * PRICE_PER_SERVER_HOUR['savings-plan'] +
    b.peak * PRICE_PER_SERVER_HOUR[p.peaks] +
    b.batch * PRICE_PER_SERVER_HOUR[p.batch]
  )
}

export interface Interruption {
  hour: number
  /** Which Spot work AWS took back: live orders or the batch job. */
  hits: 'live' | 'batch'
  servers: number
  /** Live orders on the vanished servers are dropped. */
  ordersLost: number
  /** Batch work reruns the lost hour on Spot. */
  rerunCost: number
}

/** What each Spot interruption hits under this plan. Hours with no Spot running are skipped. */
export function interruptionsFor(p: Plan, hours: readonly number[] = INTERRUPT_HOURS): Interruption[] {
  const out: Interruption[] = []
  for (const hour of hours) {
    const b = hourBands(p, hour)
    if (p.peaks === 'spot' && b.peak > 0) {
      out.push({ hour, hits: 'live', servers: b.peak, ordersLost: b.peak * ORDERS_PER_SERVER_HOUR, rerunCost: 0 })
    }
    if (p.batch === 'spot' && b.batch > 0) {
      out.push({ hour, hits: 'batch', servers: b.batch, ordersLost: 0, rerunCost: b.batch * PRICE_PER_SERVER_HOUR.spot })
    }
  }
  return out
}

/**
 * The month's bill split by how it was paid. savingsPlanIdle is the part of savingsPlan paid for idle servers.
 * `upToHour` counts only the hours of the day before it (each one 30 times), for a month that is still playing.
 */
export function monthBill(p: Plan, opts?: { interruptHours?: readonly number[]; upToHour?: number }) {
  const until = opts?.upToHour ?? 24
  const bill = { savingsPlan: 0, savingsPlanIdle: 0, onDemand: 0, spot: 0 }
  const add = (model: PriceModel, servers: number) => {
    const cost = servers * PRICE_PER_SERVER_HOUR[model] * DAYS_PER_MONTH
    if (model === 'savings-plan') bill.savingsPlan += cost
    else if (model === 'on-demand') bill.onDemand += cost
    else bill.spot += cost
  }
  for (let h = 0; h < 24 && h < until; h++) {
    const b = hourBands(p, h)
    add('savings-plan', p.savingsPlanServers)
    bill.savingsPlanIdle += b.spIdle * PRICE_PER_SERVER_HOUR['savings-plan'] * DAYS_PER_MONTH
    add(p.peaks, b.peak)
    add(p.batch, b.batch)
  }
  for (const i of interruptionsFor(p, opts?.interruptHours)) if (i.hour < until) bill.spot += i.rerunCost
  return bill
}

/** Run a 30-day month. Spot is interrupted once at each of `interruptHours` (default: 3 am and 7 pm). */
export function simulateMonth(p: Plan, opts?: { interruptHours?: number[] }): { cost: number; ordersLost: number } {
  const bill = monthBill(p, opts)
  const hits = interruptionsFor(p, opts?.interruptHours)
  return {
    cost: bill.savingsPlan + bill.onDemand + bill.spot,
    ordersLost: hits.reduce((n, i) => n + i.ordersLost, 0),
  }
}
