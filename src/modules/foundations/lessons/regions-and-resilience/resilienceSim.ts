/**
 * The "break the data center" simulation, as plain functions with no React.
 * Time is in simulated seconds. All timings are shortened on purpose so the
 * learner can watch a whole failover in a few seconds.
 */

export type Arch = 'single' | 'multi-az' | 'multi-region'
export type NodeId = 'users' | 'dns' | 'lb1' | 'lb2' | 'a' | 'b' | 'c' | 'd'
export type Incident = 'crash' | 'az' | 'region' | 'repair'

/** Shortened timings (real AWS defaults are explained in the lesson). */
export const TIMING = {
  /** Gap between two new requests */
  spawn: 0.5,
  /** Time for one request to travel from the users to a server */
  travel: 1.1,
  /** How long a finished request stays on screen */
  linger: 0.6,
  /** Load balancer health checks notice a dead server */
  lbDetect: 3,
  /** Load balancer sees a repaired server pass its checks again (slower than lbDetect, as with AWS's 5-pass vs 2-fail defaults) */
  lbRecover: 7.5,
  /** Route 53 health checks fail and cached DNS answers expire */
  dnsDetect: 7,
  /** Route 53 moves traffic back to the primary Region */
  dnsRecover: 4,
} as const

export const WINDOW = 20

export interface Req {
  id: number
  path: NodeId[]
  born: number
  arriveAt: number
  /** Set when the request arrives */
  ok?: boolean
  /** The first broken part the request hit, if it failed */
  failedAt?: NodeId
}

export interface IncidentEvent {
  kind: 'incident'
  incident: Incident
  /** Nothing changed (for example, the server was already down) */
  noop: boolean
  /**
   * For crash and power-cut incidents: what had already taken Server A (or AZ a) down before
   * this button was pressed, so the message can match the screen.
   */
  alreadyDown?: 'crash' | 'az' | 'region'
}

export type SimEvent =
  | IncidentEvent
  | { kind: 'lb-removed' | 'lb-restored'; target: 'a' | 'b' }
  | { kind: 'dns-failover' | 'dns-failback' }

export interface Pending {
  start: number
  at: number
}

export interface Sim {
  arch: Arch
  t: number
  crashed: boolean
  azDown: boolean
  regionDown: boolean
  /** What the load balancer believes: true = taken out of service */
  lbOut: { a: boolean; b: boolean }
  lbPending: { a: Pending | null; b: Pending | null }
  /** Which Region Route 53 is currently answering with */
  dnsTarget: 'primary' | 'standby'
  dnsPending: Pending | null
  rr1: number
  rr2: number
  nextSpawn: number
  nextId: number
  inflight: Req[]
  /** Most recent results, newest last (true = answered) */
  recent: boolean[]
  answered: number
  failed: number
}

export function createSim(arch: Arch): Sim {
  return {
    arch,
    t: 0,
    crashed: false,
    azDown: false,
    regionDown: false,
    lbOut: { a: false, b: false },
    lbPending: { a: null, b: null },
    dnsTarget: 'primary',
    dnsPending: null,
    rr1: 0,
    rr2: 0,
    nextSpawn: 0.2,
    nextId: 1,
    inflight: [],
    recent: [],
    answered: 0,
    failed: 0,
  }
}

/** Is this part really working right now? */
export function isUp(sim: Sim, node: NodeId): boolean {
  switch (node) {
    case 'a':
      return !(sim.crashed || sim.azDown || sim.regionDown)
    case 'b':
    case 'lb1':
      // Simplified: the load balancer keeps working from its node in the other AZ during an AZ power cut.
      return !sim.regionDown
    default:
      // Route 53, the standby Region and the users are never broken in this simulation.
      return true
  }
}

/** Is the primary Region still able to serve traffic (what Route 53 health checks test)? */
const primaryHealthy = (sim: Sim) => isUp(sim, 'lb1') && (isUp(sim, 'a') || isUp(sim, 'b'))

export const hasLoadBalancer = (arch: Arch) => arch !== 'single'

function pickPrimaryTarget(sim: Sim): 'a' | 'b' {
  let candidates: Array<'a' | 'b'> = (['a', 'b'] as const).filter((x) => !sim.lbOut[x])
  // If every target looks unhealthy, AWS load balancers "fail open" and try them all.
  if (candidates.length === 0) candidates = ['a', 'b']
  const target = candidates[sim.rr1 % candidates.length]
  sim.rr1++
  return target
}

function routeFor(sim: Sim): NodeId[] {
  if (sim.arch === 'single') return ['users', 'a']
  if (sim.arch === 'multi-az') return ['users', 'lb1', pickPrimaryTarget(sim)]
  if (sim.dnsTarget === 'primary') return ['users', 'dns', 'lb1', pickPrimaryTarget(sim)]
  const target = sim.rr2 % 2 === 0 ? 'c' : 'd'
  sim.rr2++
  return ['users', 'dns', 'lb2', target]
}

function settle(sim: Sim, req: Req) {
  req.failedAt = req.path.find((n) => !isUp(sim, n))
  req.ok = req.failedAt === undefined
  if (req.ok) sim.answered++
  else sim.failed++
  sim.recent.push(req.ok)
  if (sim.recent.length > WINDOW) sim.recent.shift()
}

/** Health checks: update what the load balancer and Route 53 believe, after a delay. */
function runHealthChecks(sim: Sim, events: SimEvent[]) {
  if (hasLoadBalancer(sim.arch) && isUp(sim, 'lb1')) {
    for (const target of ['a', 'b'] as const) {
      const up = isUp(sim, target)
      const out = sim.lbOut[target]
      if (up === !out) {
        sim.lbPending[target] = null
        continue
      }
      const pending = sim.lbPending[target]
      if (!pending) {
        const delay = up ? TIMING.lbRecover : TIMING.lbDetect
        sim.lbPending[target] = { start: sim.t, at: sim.t + delay }
      } else if (sim.t >= pending.at) {
        sim.lbOut[target] = !up
        sim.lbPending[target] = null
        events.push({ kind: up ? 'lb-restored' : 'lb-removed', target })
      }
    }
  }

  if (sim.arch === 'multi-region') {
    const healthy = primaryHealthy(sim)
    const wantsSwitch = (healthy && sim.dnsTarget === 'standby') || (!healthy && sim.dnsTarget === 'primary')
    if (!wantsSwitch) {
      sim.dnsPending = null
    } else if (!sim.dnsPending) {
      const delay = healthy ? TIMING.dnsRecover : TIMING.dnsDetect
      sim.dnsPending = { start: sim.t, at: sim.t + delay }
    } else if (sim.t >= sim.dnsPending.at) {
      sim.dnsTarget = healthy ? 'primary' : 'standby'
      sim.dnsPending = null
      events.push({ kind: healthy ? 'dns-failback' : 'dns-failover' })
    }
  }
}

/**
 * Move the simulation forward by dt seconds.
 * With `instant` (reduced motion), requests arrive the moment they are sent.
 */
export function advance(sim: Sim, dt: number, instant: boolean): SimEvent[] {
  const events: SimEvent[] = []
  sim.t += dt
  runHealthChecks(sim, events)

  while (sim.t >= sim.nextSpawn) {
    const travel = instant ? 0 : TIMING.travel
    const req: Req = { id: sim.nextId++, path: routeFor(sim), born: sim.nextSpawn, arriveAt: sim.nextSpawn + travel }
    sim.inflight.push(req)
    sim.nextSpawn += TIMING.spawn
  }

  for (const req of sim.inflight) {
    if (req.ok === undefined && sim.t >= req.arriveAt) settle(sim, req)
  }
  sim.inflight = sim.inflight.filter((r) => r.ok === undefined || sim.t < r.arriveAt + (instant ? 0 : TIMING.linger))
  return events
}

/** Apply an incident button. Returns the event to announce. */
export function applyIncident(sim: Sim, incident: Incident): IncidentEvent {
  const alreadyDown = sim.regionDown ? 'region' : sim.azDown ? 'az' : sim.crashed ? 'crash' : undefined
  let noop = false
  switch (incident) {
    case 'crash':
      // Server A is already down for some reason (crash, power cut or Region problem): nothing changes.
      noop = !isUp(sim, 'a')
      if (!noop) sim.crashed = true
      return { kind: 'incident', incident, noop, alreadyDown }
    case 'az':
      // A Region problem already covers AZ a.
      noop = sim.azDown || sim.regionDown
      if (!noop) sim.azDown = true
      return { kind: 'incident', incident, noop, alreadyDown }
    case 'region':
      noop = sim.regionDown
      sim.regionDown = true
      break
    case 'repair':
      noop = !sim.crashed && !sim.azDown && !sim.regionDown
      sim.crashed = false
      sim.azDown = false
      sim.regionDown = false
      break
  }
  return { kind: 'incident', incident, noop }
}

/** Success rate over the recent window, as a whole percentage, or null before any request. */
export function successRate(sim: Sim): number | null {
  if (sim.recent.length === 0) return null
  return Math.round((sim.recent.filter(Boolean).length / sim.recent.length) * 100)
}
