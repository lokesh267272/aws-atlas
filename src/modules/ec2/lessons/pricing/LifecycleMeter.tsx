import { useEffect, useReducer, type ReactNode } from 'react'
import { FastForward, HardDrive, Play, Server, Square, Tag, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { categories } from '../../../../course/categories'
import { cn } from '../../../../lib/cn'
import {
  EBS_PER_GIB_MONTH,
  MIN_BILLED_SECONDS,
  PRICE_PER_SERVER_HOUR,
  billEbs,
  billInstance,
} from './pricingModel'

/** Simulated seconds per real second: a minute passes in 6 seconds, so the 60-second minimum is easy to catch. */
const SPEED = 10
/** Size of the server's root disk (a common default for Linux images). */
const DISK_GIB = 8
const DAY = 86400

type Life = 'none' | 'running' | 'stopped' | 'terminated'

interface MeterState {
  life: Life
  /** Seconds of each finished run (one per start). */
  runs: number[]
  /** Seconds of the run in progress. */
  current: number
  /** Seconds the disk has existed. */
  disk: number
  /** Last change, announced to screen readers. */
  message: string
}

type MeterAction = { type: 'start' | 'stop' | 'terminate' | 'reset' } | { type: 'tick'; seconds: number }

const initial: MeterState = { life: 'none', runs: [], current: 0, disk: 0, message: '' }

function reducer(s: MeterState, a: MeterAction): MeterState {
  switch (a.type) {
    case 'start':
      if (s.life !== 'none' && s.life !== 'stopped') return s
      return { ...s, life: 'running', current: 0, message: 'Running. The server and the disk are both billed.' }
    case 'stop':
      if (s.life !== 'running') return s
      return {
        ...s,
        life: 'stopped',
        runs: [...s.runs, s.current],
        current: 0,
        message: `Stopped. That run lasted ${duration(s.current)} and was billed ${duration(Math.max(MIN_BILLED_SECONDS, s.current))}. Only the disk is billed now.`,
      }
    case 'terminate':
      if (s.life !== 'running' && s.life !== 'stopped') return s
      return {
        ...s,
        life: 'terminated',
        runs: s.life === 'running' ? [...s.runs, s.current] : s.runs,
        current: 0,
        message: 'Terminated. The server is gone and its root disk was deleted, so both meters stopped.',
      }
    case 'tick':
      if (s.life === 'running') return { ...s, current: s.current + a.seconds, disk: s.disk + a.seconds }
      if (s.life === 'stopped') return { ...s, disk: s.disk + a.seconds }
      return s
    case 'reset':
      return initial
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "0:01:05" or "1 d 0:00:20" */
function clock(seconds: number) {
  const d = Math.floor(seconds / DAY)
  const rest = seconds % DAY
  const t = `${Math.floor(rest / 3600)}:${pad(Math.floor((rest % 3600) / 60))}:${pad(rest % 60)}`
  return d > 0 ? `${d} d ${t}` : t
}

/** "45 seconds", "1 minute", "2 minutes 5 seconds" for announcements. */
function duration(seconds: number) {
  if (seconds >= DAY) return `${Math.floor(seconds / DAY)} days and ${clock(seconds % DAY)}`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const parts = []
  if (m) parts.push(`${m} minute${m === 1 ? '' : 's'}`)
  if (s || !m) parts.push(`${s} second${s === 1 ? '' : 's'}`)
  return parts.join(' ')
}

/** Tiny amounts need more digits to be seen moving. */
const money = (n: number) => `$${n < 1 ? n.toFixed(5) : n.toFixed(2)}`

const lifeLabel: Record<Life, { text: string; tone: 'neutral' | 'ok' | 'warn' | 'bad' }> = {
  none: { text: 'Not started', tone: 'neutral' },
  running: { text: 'Running', tone: 'ok' },
  stopped: { text: 'Stopped', tone: 'warn' },
  terminated: { text: 'Terminated', tone: 'bad' },
}

/** One meter card: a big billed-time readout, the cost so far and whether the meter is moving. */
function Meter({
  title,
  icon: Icon,
  color,
  billed,
  cost,
  on,
  status,
  rate,
}: {
  title: ReactNode
  icon: LucideIcon
  color: string
  billed: number
  cost: number
  on: boolean
  status: ReactNode
  rate: ReactNode
}) {
  return (
    <div className="min-w-0 rounded-md border border-line border-l-4 bg-paper/60 px-3 py-2.5" style={{ borderLeftColor: color }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon aria-hidden className="size-5 shrink-0" style={{ color }} />
        <span className="font-bold text-ink">{title}</span>
        <span className={cn('ml-auto inline-flex items-center gap-1.5 text-xs font-bold', on ? 'text-ok' : 'text-ink-3')}>
          <span aria-hidden className={cn('inline-block size-2 rounded-full', on ? 'bg-ok' : 'border border-line-strong')} />
          {on ? 'Meter running' : 'Meter stopped'}
        </span>
      </div>
      <div className="mt-2 text-sm text-ink-3">Billed time</div>
      <div className={cn('display text-2xl tabular-nums', on ? 'text-ink' : 'text-ink-3')}>{clock(billed)}</div>
      <div className="mt-0.5 text-sm tabular-nums text-ink-2">
        {money(cost)} so far · {rate}
      </div>
      <div className="mt-1 text-xs text-ink-3">{status}</div>
    </div>
  )
}

export function LifecycleMeter() {
  const [s, dispatch] = useReducer(reducer, initial)
  const alive = s.life === 'running' || s.life === 'stopped'

  // The clock only runs after the learner presses Start, and stops for good on Terminate or Reset.
  useEffect(() => {
    if (!alive) return
    const id = window.setInterval(() => dispatch({ type: 'tick', seconds: 1 }), 1000 / SPEED)
    return () => window.clearInterval(id)
  }, [alive])

  const running = s.life === 'running'
  const billedRuns = s.runs.reduce((t, r) => t + Math.max(MIN_BILLED_SECONDS, r), 0)
  const serverBilled = billedRuns + (running ? Math.max(MIN_BILLED_SECONDS, s.current) : 0)
  const serverCost =
    s.runs.reduce((t, r) => t + billInstance('running', r), 0) + (running ? billInstance('running', s.current) : 0)
  const diskCost = billEbs(DISK_GIB, s.disk / 3600)
  const allRuns = running ? [...s.runs, s.current] : s.runs
  const shownRuns = allRuns.slice(-4)
  const firstShown = allRuns.length - shownRuns.length

  const serverStatus: Record<Life, ReactNode> = {
    none: 'Press Start to launch it.',
    running: (
      <>
        <Term k="per-second-billing">Billed per second</Term>, at least 60 seconds each start.
      </>
    ),
    stopped: 'Stopped: no charge for the server.',
    terminated: 'Terminated: deleted for good.',
  }
  const diskStatus: Record<Life, ReactNode> = {
    none: 'Created when the server starts.',
    running: 'Billed while the server runs.',
    stopped: 'Still billed: it keeps your data while stopped.',
    terminated: (
      <>
        Deleted with the server, as a <Term k="root-volume">root volume</Term> is by default.
      </>
    ),
  }

  const act = (type: 'start' | 'stop' | 'terminate', allowed: boolean) => () => allowed && dispatch({ type })
  const canStart = s.life === 'none' || s.life === 'stopped'

  return (
    <Bench
      title="Try it: watch the meters"
      intro="Start the server, stop it, start it again, and watch which meter keeps running while it is stopped."
      onReset={() => dispatch({ type: 'reset' })}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pill tone={lifeLabel[s.life].tone}>{lifeLabel[s.life].text}</Pill>
        <span className="text-sm tabular-nums text-ink-3">
          Clock {clock(s.disk)} · {SPEED}× faster than real time
        </span>
        <span className="ml-auto inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
          <Pill>
            <Tag aria-hidden />
            Example prices
          </Pill>
          <span className="tabular-nums">
            server ${PRICE_PER_SERVER_HOUR['on-demand'].toFixed(2)}/hour · disk ${EBS_PER_GIB_MONTH.toFixed(2)} per GiB-month
          </span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" aria-disabled={!canStart} onClick={act('start', canStart)}>
          <Play aria-hidden />
          Start
        </Button>
        <Button aria-disabled={!running} onClick={act('stop', running)}>
          <Square aria-hidden />
          Stop
        </Button>
        <Button variant="danger" aria-disabled={!alive} onClick={act('terminate', alive)}>
          <Trash2 aria-hidden />
          Terminate
        </Button>
        <Button variant="ghost" aria-disabled={!alive} onClick={() => alive && dispatch({ type: 'tick', seconds: DAY })}>
          <FastForward aria-hidden />
          Skip ahead 1 day
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Meter
          title={
            <>
              Server (<Term k="instance">instance</Term>)
            </>
          }
          icon={Server}
          color={categories.compute.color}
          billed={serverBilled}
          cost={serverCost}
          on={running}
          status={serverStatus[s.life]}
          rate={running ? `$${PRICE_PER_SERVER_HOUR['on-demand'].toFixed(2)} per hour` : '$0 per hour'}
        />
        <Meter
          title={
            <>
              Disk (<Term k="ebs-volume">EBS volume</Term>, {DISK_GIB} GiB)
            </>
          }
          icon={HardDrive}
          color={categories.storage.color}
          billed={s.disk}
          cost={diskCost}
          on={alive}
          status={diskStatus[s.life]}
          rate={alive ? `$${billEbs(DISK_GIB, 1).toFixed(4)} per hour` : '$0 per hour'}
        />
      </div>

      {allRuns.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-ink-2">Each start of the server</p>
          <ol className="mt-1.5 grid gap-1 text-sm text-ink-2">
            {shownRuns.map((r, i) => {
              const n = firstShown + i
              const now = running && n === allRuns.length - 1
              return (
                <li key={n} className="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
                  <span className="font-bold text-ink">Start {n + 1}:</span>
                  <span>
                    {now ? 'running' : 'ran'} {clock(r)}, billed {clock(Math.max(MIN_BILLED_SECONDS, r))}
                  </span>
                  {r < MIN_BILLED_SECONDS && <Pill tone="warn">60-second minimum</Pill>}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {s.message}
      </p>
    </Bench>
  )
}
