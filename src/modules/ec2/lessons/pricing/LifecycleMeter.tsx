import { useEffect, useReducer, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { FastForward, HardDrive, Play, Plus, Server, Square, Tag, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { categories } from '../../../../course/categories'
import { cn } from '../../../../lib/cn'
import { EBS_PER_GIB_MONTH, MIN_BILLED_SECONDS, PRICE_PER_SERVER_HOUR, billEbs } from './pricingModel'
import { fineMoney, money } from './format'
import { DISK_GIB, initialMeter, meterReducer, meterTotals, type Life } from './meterModel'

/** Simulated seconds per real second: a minute passes in 6 seconds, so the 60-second minimum is easy to catch. */
const SPEED = 10
/** Simulated seconds added per tick, so the bench re-renders 5 times a second, not 10. */
const TICK_SECONDS = 2
/** The live clock runs for at most this long after each Start, Stop or Terminate press; Skip ahead covers longer spans. */
const LIVE_MS = 60_000
const DAY = 86400

/** True while the browser tab is hidden, so the clock can rest. */
function usePageHidden() {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
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
        {fineMoney(cost)} so far · {rate}
      </div>
      <div className="mt-1 text-xs text-ink-3">{status}</div>
    </div>
  )
}

export function LifecycleMeter() {
  const reduce = useReducedMotion()
  const hidden = usePageHidden()
  const [s, dispatch] = useReducer(meterReducer, initialMeter)
  const [message, setMessage] = useState('')
  /** The press count at which the live clock went to rest; the next press wakes it. */
  const [restingAt, setRestingAt] = useState(-1)
  const alive = s.life === 'running' || s.life === 'stopped'
  const running = s.life === 'running'
  const ticking = alive && !reduce && !hidden && restingAt !== s.presses

  // The clock ticks only after a press, for at most a minute, never in a hidden tab and never with reduced motion.
  const presses = s.presses
  useEffect(() => {
    if (!ticking) return
    const id = window.setInterval(() => dispatch({ type: 'tick', seconds: TICK_SECONDS }), (1000 * TICK_SECONDS) / SPEED)
    const rest = window.setTimeout(() => setRestingAt(presses), LIVE_MS)
    return () => {
      window.clearInterval(id)
      window.clearTimeout(rest)
    }
  }, [ticking, presses])

  const totals = meterTotals(s)
  const allRuns = running ? [...s.runs, s.current] : s.runs
  const shownRuns = allRuns.slice(-4)
  const firstShown = allRuns.length - shownRuns.length
  const clockNote = reduce
    ? 'moves when you skip ahead'
    : ticking || s.life === 'none'
      ? `${SPEED}× faster than real time`
      : alive
        ? 'paused, Skip ahead moves it'
        : 'stopped for good'

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

  const canStart = s.life === 'none' || s.life === 'stopped'
  const start = () => {
    if (!canStart) return
    dispatch({ type: 'start' })
    setMessage('Running. The server and the disk are both billed.')
  }
  const stop = () => {
    if (!running) return
    dispatch({ type: 'stop' })
    setMessage(
      `Stopped. That run lasted ${duration(s.current)} and was billed ${duration(Math.max(MIN_BILLED_SECONDS, s.current))}. Only the disk is billed now.`,
    )
  }
  const terminate = () => {
    if (!alive) return
    dispatch({ type: 'terminate' })
    setMessage('Terminated. The server is gone and its root disk was deleted, so both meters stopped.')
  }
  const minute = () => {
    if (!alive) return
    dispatch({ type: 'tick', seconds: 60 })
    setMessage(running ? 'One minute later: both meters moved.' : 'One minute later: only the disk meter moved.')
  }
  const skip = () => {
    if (!alive) return
    dispatch({ type: 'tick', seconds: DAY })
    setMessage(running ? 'One day later: both meters moved.' : 'One day later: only the disk meter moved.')
  }
  const reset = () => {
    dispatch({ type: 'reset' })
    setMessage('')
    setRestingAt(-1)
  }

  return (
    <Bench
      title="Try it: watch the meters"
      intro="Start the server, stop it, start it again, and watch which meter keeps running while it is stopped."
      onReset={reset}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pill tone={lifeLabel[s.life].tone}>{lifeLabel[s.life].text}</Pill>
        <span className="text-sm tabular-nums text-ink-3">
          Clock {clock(s.disk)} · {clockNote}
        </span>
        <span className="ml-auto inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
          <Pill>
            <Tag aria-hidden />
            Example prices
          </Pill>
          <span className="tabular-nums">
            server {money(PRICE_PER_SERVER_HOUR['on-demand'])}/hour · disk {money(EBS_PER_GIB_MONTH)} per <Term k="gib">GiB</Term>-month
          </span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" aria-disabled={!canStart} onClick={start}>
          <Play aria-hidden />
          Start
        </Button>
        <Button aria-disabled={!running} onClick={stop}>
          <Square aria-hidden />
          Stop
        </Button>
        <Button variant="danger" aria-disabled={!alive} onClick={terminate}>
          <Trash2 aria-hidden />
          Terminate
        </Button>
        <Button variant="ghost" aria-disabled={!alive} onClick={minute}>
          <Plus aria-hidden />1 minute
        </Button>
        <Button variant="ghost" aria-disabled={!alive} onClick={skip}>
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
          billed={totals.serverSeconds}
          cost={totals.serverCost}
          on={running}
          status={serverStatus[s.life]}
          rate={running ? `${money(PRICE_PER_SERVER_HOUR['on-demand'])} per hour` : `${money(0, 0)} per hour`}
        />
        <Meter
          title={
            <>
              Disk (<Term k="ebs-volume">EBS volume</Term>, {DISK_GIB} <Term k="gib">GiB</Term>)
            </>
          }
          icon={HardDrive}
          color={categories.storage.color}
          billed={totals.diskSeconds}
          cost={totals.diskCost}
          on={alive}
          status={diskStatus[s.life]}
          rate={alive ? `${fineMoney(billEbs(DISK_GIB, 1))} per hour` : `${money(0, 0)} per hour`}
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
        {message}
      </p>
    </Bench>
  )
}
