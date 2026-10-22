import { describe, expect, it } from 'vitest'
import {
  DISKS,
  SCENARIO,
  SNAPSHOT_TIMES,
  canDo,
  initialLab,
  labStep,
  playScenario,
  runScenario,
  solution,
  survives,
  transition,
  type Disk,
  type DiskAction,
} from './storageModel'

describe('which disks survive which action', () => {
  it.each([
    ['instance-store', 'reboot', true], ['instance-store', 'stop', false], ['instance-store', 'terminate', false], ['instance-store', 'host-failure', false],
    ['ebs-root', 'stop', true], ['ebs-root', 'terminate', false], ['ebs-root', 'host-failure', true],
    ['ebs-extra', 'stop', true], ['ebs-extra', 'terminate', true], ['ebs-extra', 'host-failure', true],
  ])('%s after %s survives: %s', (d, a, ok) => { expect(survives(d as Disk, a as DiskAction)).toBe(ok) })

  it('start brings EBS data back but an empty instance store', () => {
    expect(survives('ebs-root', 'start')).toBe(true)
    expect(survives('ebs-extra', 'start')).toBe(true)
    expect(survives('instance-store', 'start')).toBe(false)
  })

  it('every disk keeps its data on reboot', () => {
    expect(DISKS.every((d) => survives(d, 'reboot'))).toBe(true)
  })
})

describe('server state', () => {
  it('cannot start a terminated server or stop a stopped one', () => {
    expect(transition('terminated', 'start')).toBe('terminated'); expect(transition('stopped', 'stop')).toBe('stopped')
  })

  it('follows the stop, start and terminate lifecycle', () => {
    expect(transition('running', 'reboot')).toBe('running')
    expect(transition('running', 'stop')).toBe('stopped')
    expect(transition('stopped', 'start')).toBe('running')
    expect(transition('running', 'terminate')).toBe('terminated')
    expect(transition('stopped', 'terminate')).toBe('terminated')
  })

  it('a host failure stops the server so it can start on a healthy host', () => {
    expect(transition('running', 'host-failure')).toBe('stopped')
  })

  it('only offers actions that make sense in each state', () => {
    expect(canDo('running', 'start')).toBe(false)
    expect(canDo('stopped', 'reboot')).toBe(false)
    expect(canDo('stopped', 'host-failure')).toBe(false)
    expect(canDo('stopped', 'start')).toBe(true)
    expect((['reboot', 'stop', 'start', 'terminate', 'host-failure'] as const).some((a) => canDo('terminated', a))).toBe(false)
  })
})

describe('disk lab', () => {
  it('stop wipes only the instance store', () => {
    const s = labStep(initialLab, 'stop')
    expect(s.server).toBe('stopped')
    expect(s.data).toEqual({ 'instance-store': false, 'ebs-root': true, 'ebs-extra': true })
    expect(s.last).toEqual({ kind: 'action', action: 'stop', lost: ['instance-store'] })
  })

  it('ignores an action the server cannot do', () => {
    expect(labStep(initialLab, 'start')).toBe(initialLab)
  })

  it('terminate deletes the root volume and detaches the extra volume', () => {
    const s = labStep(initialLab, 'terminate')
    expect(s.rootDeleted).toBe(true)
    expect(s.extraAttached).toBe(false)
    expect(s.data['ebs-extra']).toBe(true)
  })

  it('a new server gets a fresh root volume and the extra volume re-attached with its data', () => {
    const s = labStep(labStep(initialLab, 'terminate'), 'relaunch')
    expect(s.server).toBe('running')
    expect(s.rootDeleted).toBe(false)
    expect(s.extraAttached).toBe(true)
    expect(s.data).toEqual({ 'instance-store': false, 'ebs-root': false, 'ebs-extra': true })
  })

  it('relaunch only works after terminate', () => {
    expect(labStep(initialLab, 'relaunch')).toBe(initialLab)
  })

  it('a snapshot copies the extra volume as it is now, and restores into another AZ', () => {
    const snap = labStep(initialLab, 'snapshot')
    expect(snap.snapshot).toEqual({ hasData: true })
    expect(labStep(initialLab, 'restore')).toBe(initialLab)
    expect(labStep(snap, 'restore').restored).toBe(true)
  })

  it('write data refills every disk the running server can reach', () => {
    const s = labStep(labStep(labStep(initialLab, 'stop'), 'start'), 'write')
    expect(s.data).toEqual({ 'instance-store': true, 'ebs-root': true, 'ebs-extra': true })
    expect(labStep(labStep(initialLab, 'stop'), 'write').data['instance-store']).toBe(false)
  })
})

describe('the day of trouble', () => {
  it('instance store loses orders at the maintenance stop', () => { expect(runScenario({ ordersOn: 'instance-store', snapshotAfter: null }).lostAt).toBe('maintenance-stop') })
  it('root volume loses orders when the server is replaced', () => { expect(runScenario({ ordersOn: 'ebs-root', snapshotAfter: null }).lostAt).toBe('replace-server') })
  it('extra volume without snapshot loses orders at volume failure', () => { expect(runScenario({ ordersOn: 'ebs-extra', snapshotAfter: null }).lostAt).toBe('volume-failure') })
  it('an early snapshot still loses later orders', () => { expect(runScenario({ ordersOn: 'ebs-extra', snapshotAfter: 'maintenance-stop' }).ordersLost).toBeGreaterThan(0) })
  it('the solution loses nothing', () => { expect(runScenario(solution).ordersLost).toBe(0) })

  it('runs the events in order, with the volume failure after closing time', () => {
    expect(SCENARIO.map((s) => s.event)).toEqual(['maintenance-stop', 'replace-server', 'shop-closes', 'volume-failure'])
    expect(SCENARIO.find((s) => s.event === 'volume-failure')!.ordersBefore).toBe(0)
  })

  it('a snapshot restores exactly the orders taken before it', () => {
    const early = SCENARIO[0].ordersBefore
    const total = SCENARIO.reduce((n, s) => n + s.ordersBefore, 0)
    const run = playScenario({ ordersOn: 'ebs-extra', snapshotAfter: 'maintenance-stop' })
    expect(run.ordersLost).toBe(total - early)
    expect(run.steps[3]).toMatchObject({ event: 'volume-failure', restored: early, lost: total - early })
  })

  it('snapshots copy EBS volumes only, so they cannot save the instance store', () => {
    const total = SCENARIO.reduce((n, s) => n + s.ordersBefore, 0)
    expect(runScenario({ ordersOn: 'instance-store', snapshotAfter: 'shop-closes' }).ordersLost).toBe(total)
  })

  it('a root-volume snapshot taken early brings back only the early orders when the server is replaced', () => {
    const run = playScenario({ ordersOn: 'ebs-root', snapshotAfter: 'maintenance-stop' })
    expect(run.steps[1]).toMatchObject({ event: 'replace-server', restored: SCENARIO[0].ordersBefore, lost: SCENARIO[1].ordersBefore })
    expect(run.batches[0].lostAt).toBeNull()
    expect(run.batches[1].lostAt).toBe('replace-server')
  })

  it('only one choice loses no orders, so the challenge is not trivial', () => {
    const winners = DISKS.flatMap((ordersOn) =>
      SNAPSHOT_TIMES.filter((snapshotAfter) => runScenario({ ordersOn, snapshotAfter }).ordersLost === 0).map((snapshotAfter) => ({ ordersOn, snapshotAfter })),
    )
    expect(winners).toEqual([solution])
  })
})
