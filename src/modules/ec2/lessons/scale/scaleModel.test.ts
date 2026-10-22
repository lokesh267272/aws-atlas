import { describe, expect, it } from 'vitest'
import {
  DAY_BUDGET,
  DAY_EVENTS,
  DAY_TICKS,
  DB_HOME,
  SPOT_EVENT,
  eventsFor,
  fitsWebsite,
  simulateDay,
  solution,
  startConfig,
  whyLost,
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
