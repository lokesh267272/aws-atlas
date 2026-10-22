/**
 * The pure state behind "Try it: watch the meters": one server with its root disk,
 * started, stopped and terminated by the learner while a simulated clock ticks.
 */
import { MIN_BILLED_SECONDS, billEbs, billInstance } from './pricingModel'

/** Size of the server's root disk (a common default for Linux images). */
export const DISK_GIB = 8

export type Life = 'none' | 'running' | 'stopped' | 'terminated'

export interface MeterState {
  life: Life
  /** Seconds of each finished run (one per start). */
  runs: number[]
  /** Seconds of the run in progress. */
  current: number
  /** Seconds the disk has existed. */
  disk: number
  /** Start, Stop and Terminate presses so far: a new press restarts the live clock. */
  presses: number
}

export type MeterAction = { type: 'start' | 'stop' | 'terminate' | 'reset' } | { type: 'tick'; seconds: number }

export const initialMeter: MeterState = { life: 'none', runs: [], current: 0, disk: 0, presses: 0 }

export function meterReducer(s: MeterState, a: MeterAction): MeterState {
  switch (a.type) {
    case 'start':
      if (s.life !== 'none' && s.life !== 'stopped') return s
      return { ...s, life: 'running', current: 0, presses: s.presses + 1 }
    case 'stop':
      if (s.life !== 'running') return s
      return { ...s, life: 'stopped', runs: [...s.runs, s.current], current: 0, presses: s.presses + 1 }
    case 'terminate':
      if (s.life !== 'running' && s.life !== 'stopped') return s
      return {
        ...s,
        life: 'terminated',
        runs: s.life === 'running' ? [...s.runs, s.current] : s.runs,
        current: 0,
        presses: s.presses + 1,
      }
    case 'tick':
      if (s.life === 'running') return { ...s, current: s.current + a.seconds, disk: s.disk + a.seconds }
      if (s.life === 'stopped') return { ...s, disk: s.disk + a.seconds }
      return s
    case 'reset':
      return initialMeter
  }
}

/** Billed time and cost so far. Each start bills at least 60 seconds, from the moment it starts. */
export function meterTotals(s: MeterState) {
  const running = s.life === 'running'
  const all = running ? [...s.runs, s.current] : s.runs
  return {
    serverSeconds: all.reduce((t, r) => t + Math.max(MIN_BILLED_SECONDS, r), 0),
    serverCost: all.reduce((t, r) => t + billInstance('running', r), 0),
    diskSeconds: s.disk,
    diskCost: billEbs(DISK_GIB, s.disk / 3600),
  }
}
