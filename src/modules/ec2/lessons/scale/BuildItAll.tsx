import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { Play, Tag, TriangleAlert } from 'lucide-react'
// The extension is explicit: on a case-insensitive disk "components/Challenge" would resolve to challenge.ts.
import { Challenge, useChallenge } from '../../../../components/Challenge.tsx'
import { Button, Pill, Readout, Segmented, Slider, Switch } from '../../../../components/controls'
import { Bench } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { story } from '../../story'
import { AMIS } from '../launch/launchModel'
import { typeByName } from '../sizing/sizingModel'
import { DayStrip } from './DayStrip'
import { MAX_RANGE, MIN_RANGE, withLimits } from './FleetControls'
import { RegionView, screenTerms, statusLine } from './RegionView'
import {
  DAY_BUDGET,
  DAY_TICKS,
  eventsFor,
  fitsWebsite,
  priceOf,
  simulateDay,
  solution,
  startConfig,
  whyLost,
  type FleetConfig,
  type LossReason,
} from './scaleModel'
import { useDayPlayer } from './useDayPlayer'

/** Types offered: the right-sized general one, a compute type too small in memory, a memory type, and a bigger size. */
const TYPES = ['m7g.large', 'c7g.large', 'r7g.large', 'm7g.xlarge'] as const

const money = (n: number) => `$${n.toFixed(2)}`
/** Hourly prices need a third decimal: $0.048. */
const rate = (n: number) => `$${Math.round(n * 1000) / 1000}`

const WHY: Record<LossReason, string> = {
  'no-ami': 'No AMI in the launch template',
  'port-closed': 'Web port closed',
  'too-little-memory': 'Too little memory for the website',
  'one-az': 'Every server was in the AZ that failed',
  'outage-short': 'Too few servers left when the AZ failed',
  'spot-short': 'Too few servers left when Spot was taken back',
  'max-too-low': 'Max too low for the rush',
  'scaling-behind': 'Min too low: the rush outran new servers',
  'db-down': 'No database left to save orders',
  'orders-on-disks': 'Orders on server disks vanished with the servers',
  'over-budget': 'Over budget',
}

/** A titled group of choices in the build panel. */
function Group({ title, note, children }: { title: ReactNode; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-paper/50 p-3">
      <fieldset className="grid min-w-0 content-start gap-3">
        <legend className="font-bold text-ink">{title}</legend>
        {note && <p className="text-xs text-ink-3">{note}</p>}
        {children}
      </fieldset>
    </div>
  )
}

/** The final challenge: choose every part from lessons 1 to 6, then run a day with a lunch rush and an AZ outage. */
export function BuildItAll() {
  const reduced = useReducedMotion() ?? false
  const challenge = useChallenge()
  const { solve, fail } = challenge
  const player = useDayPlayer(reduced)
  const [cfg, setCfg] = useState<FleetConfig>(startConfig)
  const [ran, setRan] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const reasonId = useId()

  const events = useMemo(() => eventsFor(cfg), [cfg])
  const day = useMemo(() => simulateDay(cfg, events), [cfg, events])
  const running = player.playing
  const at = running || ran ? Math.min(player.tick, DAY_TICKS - 1) : 0
  const tick = day.ticks[at]
  const sofar = day.ticks.slice(0, at + 1)
  const lostSoFar = sofar.reduce((n, t) => n + t.turnedAway + t.lostOnServers, 0)
  const costSoFar = sofar.reduce((n, t) => n + t.cost, 0)
  const type = typeByName(cfg.instanceType)
  const fits = fitsWebsite(cfg.instanceType)
  const underBudget = day.cost <= DAY_BUDGET
  const why = ran ? whyLost(cfg, day, events) : []

  const set = (next: Partial<FleetConfig>) => {
    // Any change stops a running day: the result would no longer match the build.
    player.jump(0)
    setRan(false)
    setCfg((c) => withLimits({ ...c, ...next }, next))
  }

  const runDay = (build: FleetConfig, onDone: (solved: boolean) => void) => {
    const result = simulateDay(build, eventsFor(build))
    setRan(false)
    stageRef.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    player.play(0, DAY_TICKS - 1, () => {
      setRan(true)
      onDone(result.solved)
    })
  }

  const run = () => {
    if (cfg.ami === null || running) return
    runDay(cfg, (ok) => (ok ? solve() : fail()))
  }

  const showMe = () => {
    setCfg(solution)
    runDay(solution, () => undefined)
    challenge.show()
  }

  const reset = () => {
    player.jump(0)
    setRan(false)
    setCfg(startConfig)
    challenge.reset()
  }

  const status = running
    ? statusLine(day.ticks, at, cfg)
    : ran
      ? day.lostOrders === 0
        ? `Day over: no orders lost, ${money(day.cost)} spent.`
        : `Day over: ${day.lostOrders} orders lost.`
      : 'Choose the parts below, then press Run the day.'

  const ordersLabel = !ran ? 'No lost orders' : day.lostOrders === 0 ? 'No lost orders' : `No lost orders (this day lost ${day.lostOrders})`

  return (
    <Bench
      tone="screen"
      title="Try it: build it all"
      intro={
        <>
          Choose every part, press <strong className="text-screen-text">Run the day</strong>, and keep every order through a
          lunch rush and an <Term k="availability-zone">AZ</Term> outage.
        </>
      }
      onReset={reset}
      className={screenTerms}
    >
      <Challenge
        tone="screen"
        goal={
          <>
            Get {story.appName} through a lunch rush and an <Term k="availability-zone">AZ</Term> outage
          </>
        }
        checks={[
          { label: ordersLabel, done: ran && day.lostOrders === 0 },
          { label: `Under budget (${money(DAY_BUDGET)} a day)`, done: underBudget },
        ]}
        state={challenge.state}
        hint={
          <>
            Open the web port, spread over 3 <Term k="availability-zone">AZs</Term>, save orders in the shared database,
            and leave max room for the rush.
          </>
        }
        onHint={challenge.hint}
        onShowMe={showMe}
        successNote={
          <>
            When one <Term k="availability-zone">AZ</Term> failed, the other two still had enough servers, and the
            database kept every order through its <Term k="failover">failover</Term>.
          </>
        }
      />

      <div ref={stageRef} className="mt-4">
        <RegionView tick={tick} cfg={cfg} playing={running} reduced={reduced} live={running || ran} />
      </div>

      <p aria-live="polite" className="mt-3 min-h-[3em] text-screen-text sm:min-h-[1.5em]">
        {status}
      </p>

      <div className="mt-3 grid gap-4 rounded-md bg-panel p-3 text-ink sm:p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Group title={<Term k="launch-template">Launch template</Term>} note="The recipe for every new server">
            <Segmented
              label="AMI"
              size="sm"
              value={cfg.ami ?? ''}
              options={AMIS.map((a) => ({ value: a.value, label: a.label }))}
              onChange={(v) => set({ ami: v })}
            />
            <div className="min-w-0">
              <Segmented
                label="Instance type"
                size="sm"
                value={cfg.instanceType}
                options={TYPES.map((t) => ({ value: t, label: <span className="font-mono">{t}</span> }))}
                onChange={(v) => set({ instanceType: v })}
              />
              <p className="mt-1 text-xs text-ink-3 tabular-nums">
                {type.vcpu} vCPUs · {type.memoryGiB} GiB · {rate(priceOf(cfg.instanceType, 'on-demand'))} an hour On-Demand
              </p>
              {!fits && (
                <Pill tone="warn" className="mt-1">
                  <TriangleAlert aria-hidden />
                  Too little memory for the website
                </Pill>
              )}
            </div>
            <Switch
              label={
                <span>
                  <Term k="security-group">Security group</Term> lets <Term k="https">HTTPS</Term> 443 in
                </span>
              }
              checked={cfg.webOpen}
              onChange={(v) => set({ webOpen: v })}
            />
          </Group>

          <Group
            title={<Term k="auto-scaling-group">Auto Scaling group</Term>}
            note={
              <>
                <Term k="target-tracking">Target tracking</Term>: keeps average CPU near {cfg.targetCpu}%
              </>
            }
          >
            <Segmented
              label="AZs it spans"
              size="sm"
              value={String(cfg.azCount)}
              options={[
                { value: '1', label: '1 AZ' },
                { value: '2', label: '2 AZs' },
                { value: '3', label: '3 AZs' },
              ]}
              onChange={(v) => set({ azCount: Number(v) as FleetConfig['azCount'] })}
            />
            <Slider label="Min servers" value={cfg.min} min={MIN_RANGE.min} max={MIN_RANGE.max} onChange={(v) => set({ min: v })} />
            <Slider label="Max servers" value={cfg.max} min={MAX_RANGE.min} max={MAX_RANGE.max} onChange={(v) => set({ max: v })} />
          </Group>

          <Group title="Where orders are saved">
            <Segmented
              label="Orders go to"
              size="sm"
              value={cfg.ordersOn}
              options={[
                { value: 'server-disk', label: "Each server's disk" },
                { value: 'database', label: 'Shared database' },
              ]}
              onChange={(v) => set({ ordersOn: v })}
            />
          </Group>

          <Group
            title="Paying for servers"
            note={
              <>
                The minimum is always on, on a <Term k="savings-plan">Savings Plan</Term>
              </>
            }
          >
            <Segmented
              label="Servers above the minimum"
              size="sm"
              value={cfg.burst}
              options={[
                { value: 'on-demand', label: 'On-Demand' },
                { value: 'spot', label: 'Spot' },
              ]}
              onChange={(v) => set({ burst: v })}
            />
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3 tabular-nums">
              <Pill>
                <Tag aria-hidden />
                Example prices
              </Pill>
              per server-hour: Savings Plan {rate(priceOf(cfg.instanceType, 'savings-plan'))} · On-Demand{' '}
              {rate(priceOf(cfg.instanceType, 'on-demand'))} · Spot {rate(priceOf(cfg.instanceType, 'spot'))}
            </p>
          </Group>
        </div>

        <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-line pt-4">
          <div>
            <Button
              variant="primary"
              onClick={run}
              aria-disabled={cfg.ami === null || running}
              aria-describedby={cfg.ami === null ? reasonId : undefined}
              className="min-w-40"
            >
              <Play aria-hidden />
              Run the day
            </Button>
            {cfg.ami === null && (
              <p id={reasonId} className="mt-1 text-xs text-ink-3">
                Choose an AMI first: without one, nothing can be built.
              </p>
            )}
          </div>
          <Readout
            label={running || ran ? 'Day bill' : 'Day bill (estimate)'}
            value={money(running || ran ? costSoFar : day.cost)}
            hint={`budget ${money(DAY_BUDGET)}`}
            tone={ran ? (underBudget ? 'ok' : 'bad') : 'neutral'}
          />
          <Readout
            label="Orders lost"
            value={running || ran ? lostSoFar : '–'}
            hint={running || ran ? undefined : 'run the day to see'}
            tone={running || ran ? (lostSoFar > 0 ? 'bad' : ran ? 'ok' : 'neutral') : 'neutral'}
          />
        </div>

        <DayStrip ticks={day.ticks} events={events} at={at} revealed={running || ran ? at : -1} playing={running} />

        {why.length > 0 && (
          <div aria-live="polite">
            <p className="text-sm font-bold text-ink-2">What went wrong</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {why.map((w) => (
                <li key={w}>
                  <Pill tone="bad">{WHY[w]}</Pill>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Bench>
  )
}
