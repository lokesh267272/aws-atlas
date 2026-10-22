/**
 * Lesson 6 model: one simulated day of the delivery app across three Availability Zones,
 * behind an Application Load Balancer, in an Auto Scaling group, with the orders in a Multi-AZ database.
 * Pure and deterministic: no React, no randomness, no clock.
 * Prices are example prices built from lesson 2's catalog and lesson 5's pricing ratios.
 */
import { inboundAllowed, REQUESTS, type Rule } from '../access/accessModel'
import { PRICE_PER_SERVER_HOUR, type PriceModel } from '../pricing/pricingModel'
import { JOBS, typeByName } from '../sizing/sizingModel'

/* ------------------------------------------------------------------ Types */

/** Everything the learner chooses for the fleet. */
export interface FleetConfig {
  /** The image in the launch template. null: no image chosen, so no server can be built. */
  ami: string | null
  /** A name from lesson 2's CATALOG, such as m7g.large. */
  instanceType: string
  /** The security group lets web traffic (HTTPS 443) in from anywhere. */
  webOpen: boolean
  /** How many of the Region's AZs the Auto Scaling group spans. */
  azCount: 1 | 2 | 3
  min: number
  max: number
  /** Target tracking: keep average CPU near this percentage. */
  targetCpu: number
  ordersOn: 'server-disk' | 'database'
  /** How to pay for servers above the minimum. The minimum is covered by a Savings Plan. */
  burst: 'on-demand' | 'spot'
}

export type FleetEvent = { at: number; kind: 'rush' | 'instance-crash' | 'az-down' | 'spot-interruption' }

/** How a server is paid for: the always-on minimum is covered by the Savings Plan, the rest by `burst`. */
export type Pay = Extract<PriceModel, 'savings-plan' | 'on-demand' | 'spot'>

/** One server at the end of a tick. */
export interface InstanceView {
  id: number
  /** Index into story.azs. */
  az: number
  pay: Pay
  /** Launched this tick: not taking orders yet. */
  booting: boolean
  /** Orders saved on this server's own disk (always 0 when orders live in the database). */
  orders: number
}

export type RemovedReason = 'crash' | 'az-down' | 'spot' | 'scale-in'

/** A server that disappeared during a tick, and why. */
export interface RemovedView {
  id: number
  az: number
  pay: Pay
  reason: RemovedReason
  /** Orders that were saved on its disk and vanished with it. */
  orders: number
}

export interface Tick {
  t: number
  /** Orders customers tried to place during this tick. */
  demand: number
  /** Servers in each of the Region's three AZs at the end of the tick, booting ones included. */
  perAz: number[]
  /** Orders saved this step. During a database failover they are held, and saved the step after. */
  served: number
  /** Orders the servers took during a database failover: the app retries them and they are saved next step. */
  held: number
  /** Customers who got no healthy server to answer them. */
  turnedAway: number
  /** Orders saved on servers that disappeared this tick. */
  lostOnServers: number
  /** The orders database is switching to its standby: the app retries its orders, and none are lost. */
  dbFailingOver: boolean
  /** Example cost of this tick in dollars. */
  cost: number

  /* Extra detail for the visuals. */
  instances: InstanceView[]
  removed: RemovedView[]
  azDown: boolean[]
  /** AZ of the database primary, or null when no AZ can hold it. */
  dbPrimary: number | null
  /** AZ of the standby copy, or null once it has taken over. */
  dbStandby: number | null
  /** Servers taking orders during the tick. */
  inService: number
  /** Average CPU of the servers taking orders, in percent. */
  cpu: number
  /** Desired capacity the Auto Scaling group set at the end of the tick. */
  desired: number
}

export interface DayResult {
  ticks: Tick[]
  lostOrders: number
  /** Example cost of the day in dollars, rounded to cents. */
  cost: number
  solved: boolean
}

/* -------------------------------------------------------------- The day */

/** AZs in the Region (story.azs). */
export const REGION_AZS = 3
/** Steps in the simulated day. */
export const DAY_TICKS = 16
/** Billing hours per step, so the day is 24 hours. */
export const HOURS_PER_TICK = 24 / DAY_TICKS
/** A new server takes this many steps to boot before it takes orders. */
export const BOOT_TICKS = 1
/** Steps the database spends failing over to its standby (a minute or two in real AWS). */
export const FAILOVER_TICKS = 1
/** Orders one vCPU handles in one step at 100% CPU. */
export const ORDERS_PER_VCPU = 50

/** Orders customers place on a quiet day, step by step from morning to night. */
export const BASE_DEMAND: readonly number[] = [60, 80, 100, 100, 100, 100, 100, 100, 100, 100, 120, 120, 100, 80, 60, 60]
/** What a lunch rush adds on top, from the step it starts. */
export const RUSH: readonly number[] = [150, 300, 350, 350, 250, 100]

/** Where the orders database lives: primary in the first AZ, standby copy in the second. */
export const DB_HOME = { primary: 0, standby: 1 } as const

const RUSH_AT = 3
/** The final challenge's day: a lunch rush, and the database primary's AZ fails near the end of it. */
export const DAY_EVENTS: FleetEvent[] = [
  { at: RUSH_AT, kind: 'rush' },
  { at: RUSH_AT + 3, kind: 'az-down' },
]
/** A Spot build's day also has AWS taking Spot capacity back at the height of the rush. */
export const SPOT_EVENT: FleetEvent = { at: RUSH_AT + 2, kind: 'spot-interruption' }

/** The events a build is tested against: Spot builds also face a Spot interruption. */
export function eventsFor(cfg: FleetConfig): FleetEvent[] {
  return cfg.burst === 'spot' ? [...DAY_EVENTS, SPOT_EVENT] : DAY_EVENTS
}

/** Example budget for one day of servers, in dollars. */
export const DAY_BUDGET = 7

/** Three AZs, orders in the database, a small always-on minimum and room to grow. */
export const solution: FleetConfig = {
  ami: 'amazon-linux',
  instanceType: 'm7g.large',
  webOpen: true,
  azCount: 3,
  min: 3,
  max: 12,
  targetCpu: 50,
  ordersOn: 'database',
  burst: 'on-demand',
}

/** Where the final challenge starts: the single server of lessons 1 to 5, not finished. */
export const startConfig: FleetConfig = {
  ami: null,
  instanceType: 'm7g.large',
  webOpen: false,
  azCount: 1,
  min: 1,
  max: 1,
  targetCpu: 50,
  ordersOn: 'server-disk',
  burst: 'on-demand',
}

/** Orders customers try to place at each step, with any rushes added. */
export function demandCurve(events: readonly FleetEvent[]): number[] {
  return BASE_DEMAND.map((base, t) =>
    events.reduce((d, e) => (e.kind === 'rush' && t >= e.at && t - e.at < RUSH.length ? d + RUSH[t - e.at] : d), base),
  )
}

/* -------------------------------------------------------------- Servers */

const WEBSITE = JOBS.find((j) => j.id === 'website')!

/** Lesson 2: the website needs this much memory, so a type with less cannot run it. */
export function fitsWebsite(typeName: string): boolean {
  return typeByName(typeName).memoryGiB >= WEBSITE.needMemoryGiB
}

/** Orders one server of this type handles in a step at 100% CPU. */
export function ordersPerServer(typeName: string): number {
  return typeByName(typeName).vcpu * ORDERS_PER_VCPU
}

/** Example hourly price of one server: lesson 2's On-Demand price, scaled by lesson 5's ratios. */
export function priceOf(typeName: string, pay: Pay): number {
  return (typeByName(typeName).pricePerHour * PRICE_PER_SERVER_HOUR[pay]) / PRICE_PER_SERVER_HOUR['on-demand']
}

/** The security group's inbound rules for this build, checked with lesson 4's rule. */
export function webRules(cfg: FleetConfig): Rule[] {
  return cfg.webOpen ? [{ port: 443, source: 'anywhere' }] : []
}

const CUSTOMER = REQUESTS.find((r) => r.id === 'customer')!

interface Inst {
  id: number
  az: number
  spot: boolean
  readyAt: number
  orders: number
}

/** Highest count wins; ties go to the lowest AZ. Returns -1 when every count is 0. */
function busiest(counts: number[]): number {
  let best = -1
  counts.forEach((n, i) => {
    if (n > 0 && (best === -1 || n > counts[best])) best = i
  })
  return best
}

/**
 * One day of the fleet. Each step:
 * 1. Events land: an AZ fails (its servers vanish, the database fails over if its primary was there),
 *    a server crashes, or AWS takes back the Spot servers in one AZ.
 * 2. The load balancer sends orders only to healthy servers that have finished booting. What they cannot take is turned away.
 *    While the database fails over, the orders taken are held (the app retries them) and saved the step after.
 * 3. Target tracking sets desired capacity from average CPU, clamped to [min, max]. The group launches servers
 *    (spread across its healthy AZs, booting for a step) or removes extra ones.
 * Orders saved on a server's own disk vanish with that server; orders in the database never do.
 */
export function simulateDay(cfg: FleetConfig, events: readonly FleetEvent[] = DAY_EVENTS): DayResult {
  const perServer = ordersPerServer(cfg.instanceType)
  const fits = fitsWebsite(cfg.instanceType)
  const webIn = inboundAllowed(webRules(cfg), CUSTOMER)
  const demand = demandCurve(events)
  const groupAzs = Array.from({ length: cfg.azCount }, (_, i) => i)
  const down = Array.from({ length: REGION_AZS }, () => false)
  const db: { primary: number | null; standby: number | null } = { primary: DB_HOME.primary, standby: DB_HOME.standby }
  const usesDb = cfg.ordersOn === 'database'
  let failoverLeft = 0
  /** Orders taken but not saved yet: the app keeps retrying them until the database answers. */
  let waiting = 0
  let nextId = 1
  let insts: Inst[] = []

  const desiredFor = (load: number) => {
    const raw = perServer > 0 ? Math.ceil(load / (perServer * (cfg.targetCpu / 100))) : 0
    return Math.min(cfg.max, Math.max(cfg.min, raw))
  }

  const launch = (t: number, n: number) => {
    if (cfg.ami === null) return
    for (let k = 0; k < n; k++) {
      const healthy = groupAzs.filter((a) => !down[a])
      if (healthy.length === 0) return
      // Spread: the healthy AZ with the fewest servers, lowest first on a tie.
      const az = healthy.reduce((best, a) =>
        insts.filter((i) => i.az === a).length < insts.filter((i) => i.az === best).length ? a : best,
      )
      // The minimum is always On-Demand (covered by the Savings Plan); servers above it use the burst choice.
      const onDemand = insts.filter((i) => !i.spot).length
      insts.push({ id: nextId++, az, spot: cfg.burst === 'spot' && onDemand >= cfg.min, readyAt: t + BOOT_TICKS, orders: 0 })
    }
  }

  /** How each server is paid for: Spot, or On-Demand covered by the Savings Plan (oldest first, up to min), or plain On-Demand. */
  const payOf = (list: Inst[]) => {
    const covered = new Set(
      list
        .filter((i) => !i.spot)
        .sort((a, b) => a.id - b.id)
        .slice(0, cfg.min)
        .map((i) => i.id),
    )
    return (i: Inst): Pay => (i.spot ? 'spot' : covered.has(i.id) ? 'savings-plan' : 'on-demand')
  }

  // The day starts with a warm fleet sized for the first step.
  const firstLoad = webIn && fits ? demand[0] : 0
  launch(-BOOT_TICKS, desiredFor(firstLoad))

  const ticks: Tick[] = []
  for (let t = 0; t < DAY_TICKS; t++) {
    const gone: { inst: Inst; reason: RemovedReason }[] = []
    const pay = payOf(insts)
    const remove = (victims: Inst[], reason: RemovedReason) => {
      victims.forEach((inst) => gone.push({ inst, reason }))
      insts = insts.filter((i) => !victims.includes(i))
    }

    // 1. Events
    for (const e of events) {
      if (e.at !== t) continue
      if (e.kind === 'az-down') {
        const az = db.primary ?? down.findIndex((d) => !d)
        if (az === -1 || down[az]) continue
        down[az] = true
        remove(
          insts.filter((i) => i.az === az),
          'az-down',
        )
        if (db.primary === az) {
          if (db.standby !== null && !down[db.standby]) {
            db.primary = db.standby
            failoverLeft = FAILOVER_TICKS
          } else db.primary = null
          db.standby = null
        } else if (db.standby === az) db.standby = null
      } else if (e.kind === 'instance-crash') {
        const ready = insts.filter((i) => i.readyAt <= t)
        const az = busiest(Array.from({ length: REGION_AZS }, (_, a) => ready.filter((i) => i.az === a).length))
        if (az === -1) continue
        remove([ready.filter((i) => i.az === az).sort((a, b) => a.id - b.id)[0]], 'crash')
      } else if (e.kind === 'spot-interruption') {
        // AWS takes back Spot capacity one pool at a time: here, every Spot server in one AZ.
        const spot = insts.filter((i) => i.spot)
        const az = busiest(Array.from({ length: REGION_AZS }, (_, a) => spot.filter((i) => i.az === a).length))
        if (az === -1) continue
        remove(
          spot.filter((i) => i.az === az),
          'spot',
        )
      }
    }

    // 2. Serve: the load balancer only uses healthy servers that have booted.
    const ready = insts.filter((i) => i.readyAt <= t)
    const dbReachable = !usesDb || db.primary !== null
    const capacity = webIn && fits && dbReachable ? ready.length * perServer : 0
    const taken = Math.min(demand[t], capacity)
    const turnedAway = demand[t] - taken
    const dbFailingOver = usesDb && failoverLeft > 0
    if (failoverLeft > 0) failoverLeft--
    // While the database fails over (or has no primary), the app holds what it took and retries; the step after, it all goes through.
    let served = taken
    if (usesDb && (dbFailingOver || db.primary === null)) {
      waiting += taken
      served = 0
    } else {
      served = taken + waiting
      waiting = 0
    }

    if (!usesDb && served > 0) {
      // The load balancer spreads orders evenly; each server saves its share on its own disk.
      const share = Math.floor(served / ready.length)
      let extra = served - share * ready.length
      for (const i of [...ready].sort((a, b) => a.id - b.id)) {
        i.orders += share + (extra > 0 ? 1 : 0)
        extra--
      }
    }
    // The servers did the work for every order they took, held or not.
    const cpu = ready.length > 0 && perServer > 0 ? Math.round((taken / (ready.length * perServer)) * 100) : 0

    // 3. Auto Scaling: target tracking on average CPU, then launch or remove.
    const desired = desiredFor(taken)
    if (insts.length < desired) launch(t, desired - insts.length)
    while (insts.length > desired) {
      // Simplified: AWS removes from the AZ with the most servers first; which server goes next is configurable.
      // Here Spot goes first, then the newest On-Demand, so the Savings Plan minimum stays.
      const pool = insts.some((i) => i.spot) ? insts.filter((i) => i.spot) : insts
      const az = busiest(Array.from({ length: REGION_AZS }, (_, a) => insts.filter((i) => i.az === a).length))
      const inAz = pool.filter((i) => i.az === az)
      const from = inAz.length > 0 ? inAz : pool
      remove([from.reduce((a, b) => (b.id > a.id ? b : a))], 'scale-in')
    }

    // Cost: the Savings Plan commitment is paid every hour; servers above it pay On-Demand or Spot.
    const onDemand = insts.filter((i) => !i.spot).length
    const spot = insts.length - onDemand
    const cost =
      HOURS_PER_TICK *
      (cfg.min * priceOf(cfg.instanceType, 'savings-plan') +
        Math.max(0, onDemand - cfg.min) * priceOf(cfg.instanceType, 'on-demand') +
        spot * priceOf(cfg.instanceType, 'spot'))

    const lostOnServers = usesDb ? 0 : gone.reduce((n, g) => n + g.inst.orders, 0)
    const payNow = payOf(insts)
    ticks.push({
      t,
      demand: demand[t],
      perAz: Array.from({ length: REGION_AZS }, (_, a) => insts.filter((i) => i.az === a).length),
      served,
      held: waiting,
      turnedAway,
      lostOnServers,
      dbFailingOver,
      cost,
      instances: insts.map((i) => ({ id: i.id, az: i.az, pay: payNow(i), booting: i.readyAt > t, orders: i.orders })),
      removed: gone.map(({ inst, reason }) => ({
        id: inst.id,
        az: inst.az,
        pay: pay(inst),
        reason,
        orders: usesDb ? 0 : inst.orders,
      })),
      azDown: [...down],
      dbPrimary: db.primary,
      dbStandby: db.standby,
      inService: ready.length,
      cpu,
      desired,
    })
  }

  const lostOrders = ticks.reduce((n, t) => n + t.turnedAway + t.lostOnServers, 0)
  const cost = Math.round(ticks.reduce((n, t) => n + t.cost, 0) * 100) / 100
  return { ticks, lostOrders, cost, solved: lostOrders === 0 && cost <= DAY_BUDGET }
}

/* -------------------------------------------------------------- Why */

export type LossReason =
  | 'no-ami'
  | 'port-closed'
  | 'too-little-memory'
  | 'one-az'
  | 'outage-short'
  | 'spot-short'
  | 'max-too-low'
  | 'scaling-behind'
  | 'db-down'
  | 'orders-on-disks'
  | 'over-budget'

/* -------------------------------------------------------------- The final challenge */

/** A run of the final challenge: its day, the two checks, and why it failed (empty when it passed). */
export interface RunVerdict {
  events: FleetEvent[]
  day: DayResult
  noLostOrders: boolean
  underBudget: boolean
  passed: boolean
  why: LossReason[]
}

/** Runs this build through the challenge day (Spot builds also face a Spot interruption) and judges it. */
export function judgeRun(cfg: FleetConfig): RunVerdict {
  const events = eventsFor(cfg)
  const day = simulateDay(cfg, events)
  const noLostOrders = day.lostOrders === 0
  const underBudget = day.cost <= DAY_BUDGET
  return { events, day, noLostOrders, underBudget, passed: noLostOrders && underBudget, why: whyLost(cfg, day, events) }
}

/**
 * What the challenge panel shows for the build on screen.
 * Checks tick only after a run. "All set" means this build would pass but has not run yet.
 * A solved challenge goes stale when the build changes, until a passing build runs again (a run in progress is not stale).
 */
export function challengeView(v: RunVerdict, s: { ran: boolean; running: boolean; solved: boolean }) {
  return {
    checks: { noLostOrders: s.ran && v.noLostOrders, underBudget: s.ran && v.underBudget },
    ready: v.passed && !s.ran && !s.running,
    stale: s.solved && !(v.passed && (s.ran || s.running)),
  }
}

/** Why a day lost orders or money, most basic cause first. Empty when the day was solved. */
export function whyLost(cfg: FleetConfig, r: DayResult, events: readonly FleetEvent[] = eventsFor(cfg)): LossReason[] {
  const out = new Set<LossReason>()
  const outageAt = events.find((e) => e.kind === 'az-down')?.at ?? Infinity
  const spotAt = new Set(events.filter((e) => e.kind === 'spot-interruption').map((e) => e.at))
  r.ticks.forEach((t, i) => {
    if (t.turnedAway === 0) return
    if (cfg.ami === null) out.add('no-ami')
    else if (!cfg.webOpen) out.add('port-closed')
    else if (!fitsWebsite(cfg.instanceType)) out.add('too-little-memory')
    else if (cfg.ordersOn === 'database' && t.dbPrimary === null) out.add('db-down')
    else if (t.t >= outageAt && cfg.azCount === 1) out.add('one-az')
    else {
      const atMax = i > 0 && r.ticks[i - 1].desired >= cfg.max
      if (t.t >= outageAt && t.t <= outageAt + BOOT_TICKS) out.add('outage-short')
      else if (spotAt.has(t.t)) out.add('spot-short')
      else if (!atMax) out.add('scaling-behind')
      if (atMax) out.add('max-too-low')
    }
  })
  if (r.ticks.some((t) => t.lostOnServers > 0)) out.add('orders-on-disks')
  if (r.cost > DAY_BUDGET) out.add('over-budget')
  return [...out]
}
