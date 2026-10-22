/**
 * Lesson 3 model: which disks keep their data through server actions, and a
 * scripted day of trouble for the orders.
 *
 * AWS defaults used here: the root EBS volume has DeleteOnTermination on, other
 * EBS volumes have it off. Instance store lives on the host's own disks, so its
 * data survives only a reboot.
 */

/* ------------------------------------------------------------------ Disks */

export type Disk = 'ebs-root' | 'ebs-extra' | 'instance-store'

/** Drawing order: the disk inside the host first, then the EBS volumes. */
export const DISKS: readonly Disk[] = ['instance-store', 'ebs-root', 'ebs-extra']

export type DiskAction = 'reboot' | 'stop' | 'start' | 'terminate' | 'host-failure'

export const ACTIONS: readonly DiskAction[] = ['reboot', 'stop', 'start', 'terminate', 'host-failure']

/** Whether the data on `disk` is still there after `action`. */
export function survives(disk: Disk, action: DiskAction): boolean {
  if (action === 'reboot') return true
  // Stop, terminate and a host failure take the server off its host; a start lands
  // on a host whose instance store is empty.
  if (disk === 'instance-store') return false
  // EBS volumes live apart from the host. On terminate, DeleteOnTermination decides.
  if (action === 'terminate') return disk === 'ebs-extra'
  return true
}

/* ----------------------------------------------------------- Server state */

export type ServerState = 'running' | 'stopped' | 'terminated'

const NEXT: Record<ServerState, Partial<Record<DiskAction, ServerState>>> = {
  // A broken host stops an EBS-backed server; Start moves it to a healthy host.
  running: { reboot: 'running', stop: 'stopped', terminate: 'terminated', 'host-failure': 'stopped' },
  stopped: { start: 'running', terminate: 'terminated' },
  terminated: {},
}

/** Whether `a` makes sense for a server in state `s`. */
export function canDo(s: ServerState, a: DiskAction): boolean {
  return NEXT[s][a] !== undefined
}

/** The server's state after `a`. Invalid actions leave it unchanged. */
export function transition(s: ServerState, a: DiskAction): ServerState {
  return NEXT[s][a] ?? s
}

/* ---------------------------------------------------------------- Disk lab */

export type LabCommand = DiskAction | 'relaunch' | 'write' | 'snapshot' | 'restore'

export type LabEvent =
  | { kind: 'action'; action: DiskAction; lost: Disk[] }
  | { kind: 'relaunch' }
  | { kind: 'write' }
  | { kind: 'snapshot' }
  | { kind: 'restore' }

export interface LabState {
  server: ServerState
  /** Which disks hold your data. */
  data: Record<Disk, boolean>
  /** The root volume was deleted with its server. */
  rootDeleted: boolean
  /** The extra volume is attached to the current server. */
  extraAttached: boolean
  /** The latest snapshot of the extra volume, if any. */
  snapshot: { hasData: boolean } | null
  /** A new volume was made from the snapshot in another AZ. */
  restored: boolean
  last: LabEvent | null
}

export const initialLab: LabState = {
  server: 'running',
  data: { 'instance-store': true, 'ebs-root': true, 'ebs-extra': true },
  rootDeleted: false,
  extraAttached: true,
  snapshot: null,
  restored: false,
  last: null,
}

/** One learner command in the disk lab. Commands that make no sense right now return `s` unchanged. */
export function labStep(s: LabState, c: LabCommand): LabState {
  switch (c) {
    case 'relaunch':
      // A new server from the same image: fresh root volume, empty instance store,
      // and the kept extra volume attached again (same AZ).
      if (s.server !== 'terminated') return s
      return {
        ...s,
        server: 'running',
        data: { 'instance-store': false, 'ebs-root': false, 'ebs-extra': s.data['ebs-extra'] },
        rootDeleted: false,
        extraAttached: true,
        last: { kind: 'relaunch' },
      }
    case 'write':
      if (s.server !== 'running') return s
      return {
        ...s,
        data: { 'instance-store': true, 'ebs-root': true, 'ebs-extra': s.extraAttached || s.data['ebs-extra'] },
        last: { kind: 'write' },
      }
    case 'snapshot':
      return { ...s, snapshot: { hasData: s.data['ebs-extra'] }, last: { kind: 'snapshot' } }
    case 'restore':
      if (!s.snapshot || s.restored) return s
      return { ...s, restored: true, last: { kind: 'restore' } }
    default: {
      if (!canDo(s.server, c)) return s
      const lost = DISKS.filter((d) => s.data[d] && !survives(d, c))
      const data = { ...s.data }
      for (const d of lost) data[d] = false
      const terminated = c === 'terminate'
      return {
        ...s,
        server: transition(s.server, c),
        data,
        rootDeleted: s.rootDeleted || terminated,
        extraAttached: s.extraAttached && !terminated,
        last: { kind: 'action', action: c, lost },
      }
    }
  }
}

/* ------------------------------------------------------- A day of trouble */

export type ScenarioEvent = 'maintenance-stop' | 'replace-server' | 'shop-closes' | 'volume-failure'

export interface ScenarioStep {
  event: ScenarioEvent
  /** Clock time of the event. */
  time: string
  /** Orders placed since the previous event (or since opening). */
  ordersBefore: number
}

/** The shop opens at this time. */
export const OPENS = '07:00'

/** The scripted day. The volume failure comes after closing, so a closing-time snapshot holds every order. */
export const SCENARIO: readonly ScenarioStep[] = [
  { event: 'maintenance-stop', time: '10:00', ordersBefore: 30 },
  { event: 'replace-server', time: '16:00', ordersBefore: 90 },
  { event: 'shop-closes', time: '23:00', ordersBefore: 120 },
  { event: 'volume-failure', time: '03:00', ordersBefore: 0 },
]

export interface Choice {
  ordersOn: Disk
  /** Take one snapshot right after this event, or none. */
  snapshotAfter: ScenarioEvent | null
}

/** The snapshot times offered to the learner. A snapshot after the failure would be too late to matter. */
export const SNAPSHOT_TIMES: readonly (ScenarioEvent | null)[] = [null, 'maintenance-stop', 'replace-server', 'shop-closes']

/** Keep orders on the extra volume (kept on terminate) and snapshot it after the last order of the day. */
export const solution: Choice = { ordersOn: 'ebs-extra', snapshotAfter: 'shop-closes' }

/** Whether `event` destroys the data on the disk holding the orders. */
export function wipes(disk: Disk, event: ScenarioEvent): boolean {
  switch (event) {
    case 'maintenance-stop':
      return !survives(disk, 'stop')
    case 'replace-server':
      return !survives(disk, 'terminate')
    case 'shop-closes':
      return false
    case 'volume-failure':
      // The disk holding the orders breaks.
      return true
  }
}

/** One group of orders placed between two events. */
export interface Batch {
  orders: number
  /** The event these orders were placed before. */
  before: ScenarioEvent
  inSnapshot: boolean
  lostAt: ScenarioEvent | null
  /** First event where these orders came back from the snapshot. */
  restoredAt: ScenarioEvent | null
}

export interface StepResult {
  event: ScenarioEvent
  /** Orders placed just before this event. */
  arrived: number
  /** The event destroyed the disk holding the orders. */
  wiped: boolean
  /** Orders brought back from the snapshot at this event. */
  restored: number
  /** Orders lost at this event. */
  lost: number
  /** A snapshot was taken right after this event. */
  snapshotTaken: boolean
}

export interface ScenarioRun {
  steps: StepResult[]
  batches: Batch[]
  ordersTotal: number
  ordersLost: number
  lostAt: ScenarioEvent | null
}

/**
 * Plays the day for one choice. A snapshot restores the orders as they were when
 * it was taken: orders placed after the last snapshot are lost with the disk.
 * Snapshots copy EBS volumes only, so they cannot help the instance store.
 */
export function playScenario(choice: Choice): ScenarioRun {
  const canSnapshot = choice.ordersOn !== 'instance-store'
  const batches: Batch[] = []
  const steps: StepResult[] = []

  for (const step of SCENARIO) {
    if (step.ordersBefore > 0) {
      batches.push({ orders: step.ordersBefore, before: step.event, inSnapshot: false, lostAt: null, restoredAt: null })
    }
    const wiped = wipes(choice.ordersOn, step.event)
    let restored = 0
    let lost = 0
    if (wiped) {
      for (const b of batches) {
        if (b.lostAt) continue
        if (b.inSnapshot) {
          restored += b.orders
          b.restoredAt ??= step.event
        } else {
          lost += b.orders
          b.lostAt = step.event
        }
      }
    }
    const snapshotTaken = canSnapshot && choice.snapshotAfter === step.event
    if (snapshotTaken) for (const b of batches) if (!b.lostAt) b.inSnapshot = true
    steps.push({ event: step.event, arrived: step.ordersBefore, wiped, restored, lost, snapshotTaken })
  }

  const ordersLost = steps.reduce((n, s) => n + s.lost, 0)
  return {
    steps,
    batches,
    ordersTotal: SCENARIO.reduce((n, s) => n + s.ordersBefore, 0),
    ordersLost,
    lostAt: steps.find((s) => s.lost > 0)?.event ?? null,
  }
}

/** How many orders a choice loses, and at which event the first ones go. */
export function runScenario(choice: Choice): { ordersLost: number; lostAt: ScenarioEvent | null } {
  const { ordersLost, lostAt } = playScenario(choice)
  return { ordersLost, lostAt }
}
