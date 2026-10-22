import { describe, expect, it } from 'vitest'
import {
  DAY_BUDGET,
  DAY_EVENTS,
  DAY_TICKS,
  DB_HOME,
  SPOT_EVENT,
  challengeView,
  eventsFor,
  fitsWebsite,
  judgeRun,
  simulateDay,
  solution,
  startConfig,
  whyLost,
  type FleetConfig,
} from './scaleModel'

describe('simulateDay (brief)', () => {
  it('the solution survives the day under budget', () => { expect(simulateDay(solution, DAY_EVENTS).solved).toBe(true) })
  it('is deterministic', () => { expect(simulateDay(solution, DAY_EVENTS)).toEqual(simulateDay(solution, DAY_EVENTS)) })
  it('one AZ means the outage turns customers away', () => { expect(simulateDay({ ...solution, azCount: 1 }, DAY_EVENTS).lostOrders).toBeGreaterThan(0) })
  it('orders on server disks are lost when servers disappear', () => { expect(simulateDay({ ...solution, ordersOn: 'server-disk' }, DAY_EVENTS).lostOrders).toBeGreaterThan(0) })
  it('database failover pauses but loses nothing', () => { const r = simulateDay(solution, DAY_EVENTS); expect(r.ticks.some(t => t.dbFailingOver)).toBe(true); expect(r.lostOrders).toBe(0) })
  it('closed web port turns everyone away', () => { expect(simulateDay({ ...solution, webOpen: false }, DAY_EVENTS).lostOrders).toBeGreaterThan(0) })
  it('max too low cannot absorb the rush', () => { expect(simulateDay({ ...solution, max: solution.min }, DAY_EVENTS).lostOrders).toBeGreaterThan(0) })
  it('Spot burst behind the ALB loses capacity, not orders', () => {
    const r = simulateDay({ ...solution, burst: 'spot' }, [...DAY_EVENTS, { at: 5, kind: 'spot-interruption' }]); expect(r.ticks.some(t => t.lostOnServers > 0)).toBe(false)
  })
})

describe('simulateDay (lesson rules)', () => {
  const day = simulateDay(solution, DAY_EVENTS)

  it('plays one tick per step of the day and adds up lost orders', () => {
    expect(day.ticks).toHaveLength(DAY_TICKS)
    const sum = day.ticks.reduce((n, t) => n + t.turnedAway + t.lostOnServers, 0)
    expect(day.lostOrders).toBe(sum)
  })

  it('the outage hits the AZ holding the database primary, and the standby takes over', () => {
    const outage = DAY_EVENTS.find((e) => e.kind === 'az-down')!
    const rush = DAY_EVENTS.find((e) => e.kind === 'rush')!
    expect(outage.at).toBeGreaterThan(rush.at)
    const before = day.ticks[outage.at - 1]
    const at = day.ticks[outage.at]
    expect(before.dbPrimary).toBe(DB_HOME.primary)
    expect(at.azDown[DB_HOME.primary]).toBe(true)
    expect(at.dbPrimary).toBe(DB_HOME.standby)
    expect(at.dbFailingOver).toBe(true)
    expect(at.perAz[DB_HOME.primary]).toBe(0)
  })

  it('the outage overlaps the tail of the rush: demand is still above a quiet day', () => {
    const outage = DAY_EVENTS.find((e) => e.kind === 'az-down')!
    expect(day.ticks[outage.at].demand).toBeGreaterThan(day.ticks[0].demand * 2)
  })

  it('Auto Scaling adds servers for the rush and stays between min and max', () => {
    const counts = day.ticks.map((t) => t.perAz.reduce((a, b) => a + b, 0))
    expect(Math.max(...counts)).toBeGreaterThan(solution.min)
    for (const t of day.ticks) {
      expect(t.desired).toBeGreaterThanOrEqual(solution.min)
      expect(t.desired).toBeLessThanOrEqual(solution.max)
    }
  })

  it('replaces the lost AZ in the healthy AZs', () => {
    const outage = DAY_EVENTS.find((e) => e.kind === 'az-down')!
    const at = day.ticks[outage.at]
    const newOnes = at.instances.filter((i) => i.booting)
    expect(newOnes.length).toBeGreaterThan(0)
    expect(newOnes.every((i) => !at.azDown[i.az])).toBe(true)
  })

  it('a crashed instance is replaced', () => {
    const quiet = simulateDay(solution, [{ at: 1, kind: 'instance-crash' }])
    expect(quiet.ticks[1].removed.map((r) => r.reason)).toContain('crash')
    expect(quiet.ticks[1].instances.some((i) => i.booting)).toBe(true)
    expect(quiet.ticks[2].perAz.reduce((a, b) => a + b, 0)).toBe(solution.min)
  })

  it('servers keep no orders of their own when orders live in the database', () => {
    expect(day.ticks.every((t) => t.instances.every((i) => i.orders === 0))).toBe(true)
  })

  it('a Spot interruption takes back Spot capacity in one AZ only', () => {
    const r = simulateDay({ ...solution, burst: 'spot' }, [...DAY_EVENTS, SPOT_EVENT])
    const gone = r.ticks[SPOT_EVENT.at].removed.filter((x) => x.reason === 'spot')
    expect(gone.length).toBeGreaterThan(0)
    expect(new Set(gone.map((x) => x.az)).size).toBe(1)
    expect(r.lostOrders).toBe(0)
  })

  it('Spot on server disks loses the orders stored on the taken servers', () => {
    const r = simulateDay({ ...solution, burst: 'spot', ordersOn: 'server-disk' }, [...DAY_EVENTS, SPOT_EVENT])
    expect(r.ticks[SPOT_EVENT.at].lostOnServers).toBeGreaterThan(0)
  })

  it('Spot is cheaper than On-Demand above the minimum', () => {
    expect(simulateDay({ ...solution, burst: 'spot' }, DAY_EVENTS).cost).toBeLessThan(day.cost)
  })

  it('a Spot build runs its day with a Spot interruption; an On-Demand build does not', () => {
    expect(eventsFor(solution)).toEqual(DAY_EVENTS)
    expect(eventsFor({ ...solution, burst: 'spot' })).toContainEqual(SPOT_EVENT)
  })
})

describe('the budget is not trivial', () => {
  it('a big always-on fleet goes over budget', () => {
    const r = simulateDay({ ...solution, min: 8, max: 12 }, DAY_EVENTS)
    expect(r.lostOrders).toBe(0)
    expect(r.cost).toBeGreaterThan(DAY_BUDGET)
  })

  it('a bigger type than needed goes over budget', () => {
    const r = simulateDay({ ...solution, instanceType: 'm7g.xlarge' }, DAY_EVENTS)
    expect(r.cost).toBeGreaterThan(DAY_BUDGET)
  })

  it('two AZs at the same settings cannot carry the rush when one fails', () => {
    expect(simulateDay({ ...solution, azCount: 2 }, DAY_EVENTS).lostOrders).toBeGreaterThan(0)
  })

  it('a type with too little memory for the website serves nobody', () => {
    expect(fitsWebsite('c7g.large')).toBe(false)
    expect(fitsWebsite(solution.instanceType)).toBe(true)
    const r = simulateDay({ ...solution, instanceType: 'c7g.large' }, DAY_EVENTS)
    expect(r.ticks.every((t) => t.served === 0)).toBe(true)
  })

  it('no AMI means no servers at all', () => {
    const r = simulateDay({ ...solution, ami: null }, DAY_EVENTS)
    expect(r.ticks.every((t) => t.instances.length === 0)).toBe(true)
    expect(r.solved).toBe(false)
  })

  it('the starting build fails', () => {
    expect(simulateDay(startConfig, eventsFor(startConfig)).solved).toBe(false)
  })
})

describe('whyLost', () => {
  const why = (cfg: Parameters<typeof simulateDay>[0]) => whyLost(cfg, simulateDay(cfg, eventsFor(cfg)))

  it('says nothing for the solution', () => {
    expect(why(solution)).toEqual([])
  })

  it('names each mistake', () => {
    expect(why({ ...solution, webOpen: false })).toContain('port-closed')
    expect(why({ ...solution, azCount: 1 })).toContain('one-az')
    expect(why({ ...solution, azCount: 2 })).toContain('outage-short')
    expect(why({ ...solution, max: solution.min })).toContain('max-too-low')
    expect(why({ ...solution, ordersOn: 'server-disk' })).toContain('orders-on-disks')
    expect(why({ ...solution, instanceType: 'c7g.large' })).toContain('too-little-memory')
    expect(why({ ...solution, min: 8, max: 12 })).toContain('over-budget')
  })
})

describe('database failover queue', () => {
  const day = simulateDay(solution, DAY_EVENTS)
  const at = day.ticks.findIndex((t) => t.dbFailingOver)
  const taken = (i: number) => day.ticks[i].demand - day.ticks[i].turnedAway

  it("holds the failover step's orders instead of saving them", () => {
    expect(at).toBeGreaterThan(0)
    const t = day.ticks[at]
    expect(t.served).toBe(0)
    expect(t.held).toBe(taken(at))
    expect(t.held).toBeGreaterThan(0)
  })

  it("saves the held orders on the next step, on top of that step's own: a dip, then a catch-up", () => {
    const next = day.ticks[at + 1]
    expect(next.dbFailingOver).toBe(false)
    expect(next.held).toBe(0)
    expect(next.served).toBe(taken(at + 1) + day.ticks[at].held)
    expect(next.served).toBeGreaterThan(next.demand)
  })

  it('loses nothing: every order customers placed is saved by the end of the day', () => {
    const placed = day.ticks.reduce((n, t) => n + t.demand, 0)
    const saved = day.ticks.reduce((n, t) => n + t.served, 0)
    expect(saved).toBe(placed)
    expect(day.lostOrders).toBe(0)
  })

  it('servers stay busy while orders retry, so Auto Scaling does not shrink the fleet', () => {
    const t = day.ticks[at]
    expect(t.cpu).toBeGreaterThan(0)
    expect(t.desired).toBeGreaterThanOrEqual(day.ticks[at - 1].perAz.reduce((a, b) => a + b, 0) - 1)
  })

  it('outside a failover nothing is held, and orders on disks never wait', () => {
    for (const [i, t] of day.ticks.entries()) if (i !== at) expect(t.held).toBe(0)
    const disk = simulateDay({ ...solution, ordersOn: 'server-disk' }, DAY_EVENTS)
    expect(disk.ticks.every((t) => t.held === 0 && !t.dbFailingOver)).toBe(true)
  })
})

describe('judgeRun: does a run of this build pass the final challenge', () => {
  it("Show me's build passes both checks", () => {
    const v = judgeRun(solution)
    expect(v.noLostOrders).toBe(true)
    expect(v.underBudget).toBe(true)
    expect(v.passed).toBe(true)
    expect(v.why).toEqual([])
    expect(v.events).toEqual(eventsFor(solution))
  })

  it('the starting build fails', () => {
    const v = judgeRun(startConfig)
    expect(v.passed).toBe(false)
    expect(v.noLostOrders).toBe(false)
  })

  it('passes only when no order is lost and the day is under budget', () => {
    const builds: FleetConfig[] = [
      solution,
      startConfig,
      { ...solution, azCount: 1 },
      { ...solution, azCount: 2 },
      { ...solution, min: 8, max: 12 },
      { ...solution, instanceType: 'm7g.xlarge' },
      { ...solution, burst: 'spot' },
      { ...solution, ordersOn: 'server-disk' },
      { ...solution, webOpen: false },
    ]
    for (const b of builds) {
      const v = judgeRun(b)
      expect(v.passed).toBe(v.noLostOrders && v.underBudget)
      expect(v.passed).toBe(v.day.solved)
      expect(v.noLostOrders).toBe(v.day.lostOrders === 0)
      expect(v.underBudget).toBe(v.day.cost <= DAY_BUDGET)
      expect(v.why.length === 0).toBe(v.passed)
    }
  })

  it('a big always-on fleet keeps every order but fails on budget', () => {
    const v = judgeRun({ ...solution, min: 8, max: 12 })
    expect(v.noLostOrders).toBe(true)
    expect(v.underBudget).toBe(false)
    expect(v.passed).toBe(false)
  })
})

describe('challengeView: what the challenge panel shows', () => {
  const pass = judgeRun(solution)
  const failing = judgeRun({ ...solution, azCount: 1 })
  const idle = { ran: false, running: false, solved: false }

  it('ticks nothing before a run, even a build that would pass', () => {
    expect(challengeView(judgeRun(startConfig), idle).checks).toEqual({ noLostOrders: false, underBudget: false })
    expect(challengeView(pass, idle).checks).toEqual({ noLostOrders: false, underBudget: false })
  })

  it('says All set only for a passing build that has not run yet', () => {
    expect(challengeView(pass, idle).ready).toBe(true)
    expect(challengeView(failing, idle).ready).toBe(false)
    expect(challengeView(pass, { ...idle, running: true }).ready).toBe(false)
    expect(challengeView(pass, { ...idle, ran: true }).ready).toBe(false)
  })

  it('ticks the checks after a run', () => {
    expect(challengeView(pass, { ...idle, ran: true }).checks).toEqual({ noLostOrders: true, underBudget: true })
    expect(challengeView(failing, { ...idle, ran: true }).checks.noLostOrders).toBe(false)
  })

  it('goes stale once a solved build is changed, until it runs again and passes', () => {
    const solved = { ran: true, running: false, solved: true }
    expect(challengeView(pass, solved).stale).toBe(false)
    // Changed to a failing build (a change clears ran).
    expect(challengeView(failing, { ...solved, ran: false }).stale).toBe(true)
    // Changed to another passing build: still needs a run to prove it.
    expect(challengeView(pass, { ...solved, ran: false }).stale).toBe(true)
    // Running a passing build again is not stale.
    expect(challengeView(pass, { ...solved, ran: false, running: true }).stale).toBe(false)
    // Unsolved is never stale.
    expect(challengeView(failing, { ...idle, ran: true }).stale).toBe(false)
  })

  it('is not stale while Show me plays the solution', () => {
    expect(challengeView(pass, { ran: false, running: true, solved: false }).stale).toBe(false)
    expect(challengeView(pass, { ran: false, running: true, solved: true }).stale).toBe(false)
  })
})
