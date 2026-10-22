import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Camera, DoorOpen, HardDrive, Play, RefreshCw, ShoppingBag, Store, Wrench, type LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Readout, Segmented, type SegmentedOption } from '../../../../components/controls'
// The extension is needed: on case-insensitive disks 'components/Challenge' resolves to challenge.ts.
import { Challenge, useChallenge } from '../../../../components/Challenge.tsx'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import {
  OPENS,
  SCENARIO,
  playScenario,
  solution,
  type Batch,
  type Choice,
  type Disk,
  type ScenarioEvent,
  type StepResult,
} from './storageModel'

/** Time between events while the day plays. */
const STEP_MS = 800

const START: Choice = { ordersOn: 'ebs-root', snapshotAfter: null }

const eventInfo: Record<ScenarioEvent, { label: string; sub: string; icon: LucideIcon }> = {
  'maintenance-stop': { label: 'Maintenance stop', sub: 'stop, then start', icon: Wrench },
  'replace-server': { label: 'Server replaced', sub: 'terminate, launch a new one', icon: RefreshCw },
  'shop-closes': { label: 'Shop closes', sub: 'last order of the day', icon: Store },
  'volume-failure': { label: 'Volume fails', sub: 'next night: rare, but it happens', icon: HardDrive },
}

const diskName: Record<Disk, string> = {
  'instance-store': 'instance store',
  'ebs-root': 'root volume',
  'ebs-extra': 'extra volume',
}

const diskOptions: SegmentedOption<Disk>[] = [
  { value: 'instance-store', label: 'Instance store', description: 'disks inside the host' },
  { value: 'ebs-root', label: 'Root volume', description: 'the EBS volume the server starts from' },
  { value: 'ebs-extra', label: 'Extra volume', description: 'an EBS volume attached after launch' },
]

type SnapKey = 'none' | ScenarioEvent

/** The event's name inside a snapshot option, so the choice reads "23:00 closes", not just a time. */
const snapEventWord: Record<ScenarioEvent, string> = {
  'maintenance-stop': 'stop',
  'replace-server': 'replaced',
  'shop-closes': 'closes',
  'volume-failure': 'failure',
}

const snapOptions: SegmentedOption<SnapKey>[] = [
  { value: 'none', label: 'No snapshot' },
  ...SCENARIO.filter((s) => s.event !== 'volume-failure').map((s) => ({
    value: s.event,
    label: `${s.time} ${snapEventWord[s.event]}`,
    description: `right after: ${eventInfo[s.event].label}`,
  })),
]

const index = (e: ScenarioEvent) => SCENARIO.findIndex((s) => s.event === e)
const timeOf = (e: ScenarioEvent) => SCENARIO[index(e)].time

/** What the event did to the disk holding the orders. */
function whatHappened(disk: Disk, event: ScenarioEvent): string {
  switch (event) {
    case 'maintenance-stop':
      return disk === 'instance-store' ? 'a stop wipes the instance store' : 'EBS keeps its data through a stop'
    case 'replace-server':
      if (disk === 'ebs-root') return 'the root volume is deleted with the old server'
      if (disk === 'ebs-extra') return 'you attach the kept extra volume to the new server'
      return 'the new server has an empty instance store'
    case 'shop-closes':
      return 'no more orders tonight'
    case 'volume-failure':
      return 'the disk holding the orders breaks'
  }
}

type Badge = { tone: 'ok' | 'bad' | 'neutral' | 'warn'; text: string }

function stepBadges(step: StepResult): Badge[] {
  const out: Badge[] = []
  if (step.restored > 0) out.push({ tone: 'ok', text: `${step.restored} recoverable from the snapshot` })
  if (step.lost > 0) out.push({ tone: 'bad', text: `${step.lost} orders lost` })
  if (out.length === 0) out.push(step.wiped ? { tone: 'neutral', text: 'nothing to lose' } : { tone: 'ok', text: 'orders kept' })
  return out
}

/** A group of orders as it stands after `shown` events have played. */
function batchBadge(b: Batch, shown: number | null, snapIndex: number | null): Badge | null {
  if (shown === null || shown < index(b.before)) return null
  if (b.lostAt && index(b.lostAt) < shown) return { tone: 'bad', text: `lost at ${timeOf(b.lostAt)}` }
  if (b.restoredAt && index(b.restoredAt) < shown) return { tone: 'ok', text: 'recoverable' }
  if (b.inSnapshot && snapIndex !== null && snapIndex < shown) return { tone: 'ok', text: 'in the snapshot' }
  return { tone: 'neutral', text: 'saved' }
}

export function SnapshotChallenge() {
  const reduce = useReducedMotion() === true
  const challenge = useChallenge()
  const [choice, setChoice] = useState<Choice>(START)
  /** How many events have played: null before the first run. */
  const [shown, setShown] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  /** Show me is playing: ignore control changes so the solution is not left half-run. */
  const showing = useRef(false)
  const run = useMemo(() => playScenario(choice), [choice])

  const stopTimer = useCallback(() => {
    if (timer.current !== undefined) window.clearInterval(timer.current)
    timer.current = undefined
  }, [])
  // Never leave the day playing after the lesson closes.
  useEffect(() => stopTimer, [stopTimer])

  const total = run.ordersTotal
  const running = shown !== null && shown < SCENARIO.length
  const finished = shown === SCENARIO.length

  /** Plays the day for `c`, one event at a time (all at once under reduced motion), then calls `done`. */
  const play = (c: Choice, done: (ordersLost: number) => void) => {
    stopTimer()
    setChoice(c)
    const lost = playScenario(c).ordersLost
    if (reduce) {
      setShown(SCENARIO.length)
      done(lost)
      return
    }
    setShown(0)
    let n = 0
    timer.current = window.setInterval(() => {
      n += 1
      setShown(n)
      if (n >= SCENARIO.length) {
        stopTimer()
        done(lost)
      }
    }, STEP_MS)
  }

  const choose = (next: Partial<Choice>) => {
    if (showing.current) return
    stopTimer()
    setShown(null)
    setChoice((c) => ({ ...c, ...next }))
  }

  const reset = () => {
    showing.current = false
    stopTimer()
    setShown(null)
    setChoice(START)
    challenge.reset()
  }

  const canSnapshot = choice.ordersOn !== 'instance-store'
  const snapIndex = choice.snapshotAfter && canSnapshot ? index(choice.snapshotAfter) : null
  const inSnapshot = run.batches.filter((b) => b.inSnapshot).reduce((n, b) => n + b.orders, 0)
  const revealed = (i: number) => shown !== null && i < shown
  const taken = shown === null ? 0 : run.batches.filter((b) => index(b.before) <= shown).reduce((n, b) => n + b.orders, 0)
  const lostSoFar = shown === null ? 0 : run.steps.slice(0, shown).reduce((n, s) => n + s.lost, 0)
  const survived = (e: ScenarioEvent) => revealed(index(e)) && run.steps[index(e)].lost === 0

  return (
    <Bench
      title="Try it: keep every order"
      intro={
        <>
          Choose where orders are saved and when to take a <Term k="ebs-snapshot">snapshot</Term>, then run the day and see
          which orders survive.
        </>
      }
      onReset={reset}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <Segmented
              label="Save orders on"
              size="sm"
              value={choice.ordersOn}
              options={diskOptions}
              onChange={(ordersOn) => choose({ ordersOn })}
            />
            {choice.ordersOn !== 'instance-store' && <Pill>fine for one server; lesson 6 moves orders off the servers</Pill>}
          </div>
          <Segmented
            label="Take one snapshot at"
            size="sm"
            value={choice.snapshotAfter ?? 'none'}
            options={snapOptions}
            onChange={(v) => choose({ snapshotAfter: v === 'none' ? null : v })}
          />
          <Button
            variant="primary"
            aria-disabled={running}
            onClick={() => !running && play(choice, (lost) => (lost === 0 ? challenge.solve() : challenge.fail()))}
          >
            <Play aria-hidden />
            Run the day
          </Button>
        </div>

        <ol aria-label="The day, hour by hour" className="divide-y divide-line rounded-md border border-line bg-panel">
          <Row time={OPENS} icon={DoorOpen} label="Shop opens" sub={`orders are saved on the ${diskName[choice.ordersOn]}`} />
          {SCENARIO.map((step, i) => {
            const batch = run.batches.find((b) => b.before === step.event)
            const info = eventInfo[step.event]
            const isNow = running && shown === i
            return (
              <Fragment key={step.event}>
                {batch && (
                  <Row
                    icon={ShoppingBag}
                    label={`+${batch.orders} orders`}
                    quiet
                    badges={[batchBadge(batch, shown, snapIndex)].filter((b): b is Badge => b !== null)}
                    reduce={reduce}
                  />
                )}
                <Row
                  time={step.time}
                  icon={info.icon}
                  label={info.label}
                  sub={info.sub}
                  detail={revealed(i) ? whatHappened(choice.ordersOn, step.event) : undefined}
                  badges={revealed(i) ? stepBadges(run.steps[i]) : []}
                  now={isNow}
                  reduce={reduce}
                />
                {choice.snapshotAfter === step.event && (
                  <Row
                    icon={Camera}
                    label="Snapshot"
                    sub={canSnapshot ? `copy of the ${diskName[choice.ordersOn]}, kept outside the AZ` : 'snapshots copy EBS volumes only'}
                    badges={
                      !canSnapshot
                        ? [{ tone: 'warn', text: 'not possible' }]
                        : revealed(i)
                          ? [{ tone: inSnapshot > 0 ? 'ok' : 'neutral', text: `${inSnapshot} orders inside` }]
                          : []
                    }
                    reduce={reduce}
                  />
                )}
              </Fragment>
            )
          })}
        </ol>

        <div className="grid gap-4 sm:grid-cols-2">
          <Readout label="Orders taken" value={`${taken} of ${total}`} />
          <Readout
            label="Orders lost"
            value={shown === null ? '–' : lostSoFar}
            tone={lostSoFar > 0 ? 'bad' : finished ? 'ok' : 'neutral'}
          />
        </div>
        <p aria-live="polite" className="sr-only">
          {finished ? `Day over: ${run.ordersLost} of ${total} orders lost.` : ''}
        </p>

        <Challenge
          stale={challenge.state.solved && !(finished && run.ordersLost === 0)}
          goal="Get through the day with zero lost orders"
          checks={[
            { label: 'No orders lost at the maintenance stop', done: survived('maintenance-stop') },
            { label: 'No orders lost when the server is replaced', done: survived('replace-server') },
            { label: 'No orders lost at the volume failure', done: survived('volume-failure') },
          ]}
          state={challenge.state}
          hint="Pick the disk that is kept when its server is terminated, and snapshot it after the last order."
          onHint={challenge.hint}
          onShowMe={() => {
            showing.current = true
            play(solution, () => {
              showing.current = false
              challenge.show()
            })
          }}
          successNote={
            <>
              The extra volume outlived the stop and the new server, and the {timeOf('shop-closes')} snapshot let you rebuild
              a volume with every order.
            </>
          }
        />
      </div>
    </Bench>
  )
}

/* ------------------------------------------------------------------ Parts */

function Row({
  time,
  icon: Icon,
  label,
  sub,
  detail,
  badges = [],
  quiet = false,
  now = false,
  reduce = false,
}: {
  time?: string
  icon: LucideIcon
  label: string
  sub?: string
  /** What happened, shown once the event has played. */
  detail?: string
  badges?: Badge[]
  /** Order rows sit back a little behind the events. */
  quiet?: boolean
  /** The event about to happen while the day plays. */
  now?: boolean
  reduce?: boolean
}) {
  return (
    <li
      className={cn(
        'grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-2 px-3 py-2 transition-colors',
        quiet && 'bg-paper/60',
        now && 'bg-signal-soft',
      )}
    >
      <span className="pt-0.5 text-xs font-bold tabular-nums text-ink-3">{time}</span>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className={cn('flex items-center gap-1.5 text-sm', quiet ? 'text-ink-2' : 'font-bold text-ink')}>
            <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
            {label}
          </p>
          {sub && <p className="text-xs text-ink-3">{sub}</p>}
          {detail && <p className="text-xs text-ink-2">{detail}</p>}
        </div>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.map((b) => (
              <Appear key={b.text} reduce={reduce}>
                <Pill tone={b.tone}>{b.text}</Pill>
              </Appear>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}

/** Fades a status in when it first appears (instantly under reduced motion). */
function Appear({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  return (
    <motion.span
      className="inline-flex"
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.3 }}
    >
      {children}
    </motion.span>
  )
}
