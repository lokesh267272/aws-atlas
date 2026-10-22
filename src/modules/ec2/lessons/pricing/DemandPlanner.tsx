import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Play, Tag } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Readout, Segmented, Slider } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Term } from '../../../../components/Term'
import { story } from '../../story'
import {
  BATCH,
  BUDGET_PER_MONTH,
  DAYS_PER_MONTH,
  DEMAND,
  PRICE_PER_SERVER_HOUR,
  interruptionsFor,
  monthBill,
  simulateMonth,
  solution,
  type Plan,
} from './pricingModel'
import { BillBar, DayChart, Swatch, W } from './PlannerChart'
import { dollars, hourName, money } from './format'

/** How long "Run the month" takes to sweep the 24 hours. */
const PLAY_MS = 6000
const MAX_SP = Math.max(...DEMAND)
const START_PLAN: Plan = { savingsPlanServers: 0, peaks: 'on-demand', batch: 'on-demand' }

const pay = (m: 'on-demand' | 'spot') => (m === 'spot' ? 'Spot' : 'On-Demand')
/** "1 server's worth", "3 servers' worth" */
const worth = (n: number) => (n === 1 ? "1 server's worth" : `${n} servers' worth`)

type Phase = 'idle' | 'playing' | 'done'

export function DemandPlanner() {
  const reduce = useReducedMotion()
  const challenge = useChallenge()
  const [plan, setPlan] = useState<Plan>(START_PLAN)
  const [phase, setPhase] = useState<Phase>('idle')
  const [t, setT] = useState(0)
  const frame = useRef<number | undefined>(undefined)
  const chartBox = useRef<HTMLDivElement>(null)
  const [boxWidth, setBoxWidth] = useState(0)

  const estimate = simulateMonth(plan)
  const hits = interruptionsFor(plan)
  const passed = phase === 'idle' ? [] : hits.filter((i) => i.hour < t)
  const lostSoFar = passed.reduce((n, i) => n + i.ordersLost, 0)
  const soFar = monthBill(plan, { upToHour: phase === 'idle' ? 24 : t })
  const costShown = soFar.savingsPlan + soFar.onDemand + soFar.spot

  const cancel = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = undefined
  }, [])

  const { solve, fail, show } = challenge
  /** Set by Show me: the run that follows marks the challenge shown once it ends, not before. */
  const showing = useRef(false)
  const finish = useCallback(
    (p: Plan) => {
      cancel()
      setT(24)
      setPhase('done')
      const r = simulateMonth(p)
      const passes = r.cost <= BUDGET_PER_MONTH && r.ordersLost === 0
      if (showing.current && passes) show()
      else if (passes) solve()
      else fail()
      showing.current = false
    },
    [cancel, solve, fail, show],
  )

  const run = useCallback(
    (p: Plan) => {
      cancel()
      if (reduce) {
        finish(p)
        return
      }
      const start = performance.now()
      setT(0)
      setPhase('playing')
      const tick = (now: number) => {
        const hours = ((now - start) / PLAY_MS) * 24
        if (hours >= 24) {
          frame.current = undefined
          finish(p)
          return
        }
        setT(hours)
        frame.current = requestAnimationFrame(tick)
      }
      frame.current = requestAnimationFrame(tick)
    },
    [cancel, finish, reduce],
  )

  // Never leave an animation frame running after the lesson closes.
  useEffect(() => cancel, [cancel])

  // If reduced motion is switched on mid-run, jump to the end of the month.
  useEffect(() => {
    if (reduce && phase === 'playing') finish(plan)
  }, [reduce, phase, plan, finish])

  // Measure the chart, so its labels stay about 12px on screen at any width.
  useLayoutEffect(() => {
    const el = chartBox.current
    if (!el) return
    const measure = () => setBoxWidth(el.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const labelSize = boxWidth > 0 ? Math.min(24, Math.max(9, (12 * W) / boxWidth)) : 12

  const change = (next: Partial<Plan>) => {
    cancel()
    showing.current = false
    setPhase('idle')
    setT(0)
    setPlan((p) => ({ ...p, ...next }))
  }

  const showMe = () => {
    setPlan(solution)
    showing.current = true
    run(solution)
  }

  const reset = () => {
    cancel()
    showing.current = false
    setPlan(START_PLAN)
    setPhase('idle')
    setT(0)
    challenge.reset()
  }

  const done = phase === 'done'
  const underBudget = estimate.cost <= BUDGET_PER_MONTH
  const price = PRICE_PER_SERVER_HOUR
  const usesSpot = plan.peaks === 'spot' || plan.batch === 'spot'

  const chartLabel = `One day of ${story.appName}, repeated for ${DAYS_PER_MONTH} days. Servers needed for live orders: ${DEMAND[3]} at night, ${DEMAND[12]} at the lunch rush and ${DEMAND[19]} at the dinner rush. A Savings Plan commitment of ${worth(
    plan.savingsPlanServers,
  )} is paid every hour. Live servers above it are ${pay(plan.peaks)}. The route-planning job uses ${BATCH.servers} ${pay(
    plan.batch,
  )} servers from ${hourName(BATCH.start)} to ${hourName(BATCH.start + BATCH.hours)}${
    plan.batch === 'on-demand' ? ', using any commitment the live orders leave unused' : ', and Spot never uses the commitment'
  }.`

  const ordersCheck = !done
    ? 'No orders lost (run the month to check)'
    : estimate.ordersLost === 0
      ? 'No orders lost'
      : `No orders lost (that month lost ${estimate.ordersLost})`

  return (
    <Bench
      title={`Try it: pay for a month of ${story.appName}`}
      intro={
        <>
          Set a <Term k="savings-plan">Savings Plan</Term> commitment for the servers always needed, choose how to pay for
          the rest, then run the month.
        </>
      }
      onReset={reset}
    >
      <div className="mb-5">
        <Challenge
          goal={
            <>
              Run a month of {story.appName} for {dollars(BUDGET_PER_MONTH)} or less with zero lost orders.
            </>
          }
          checks={[
            { label: `Month bill ${dollars(BUDGET_PER_MONTH)} or less (this plan: ${money(estimate.cost)})`, done: underBudget },
            { label: ordersCheck, done: done && estimate.ordersLost === 0 },
          ]}
          state={challenge.state}
          stale={!(underBudget && estimate.ordersLost === 0)}
          hint={
            <>
              Commit only to the servers you need even at night, keep the rushes{' '}
              <Term k="on-demand-instance">On-Demand</Term>, and give the night job to <Term k="spot-instance">Spot</Term>.
            </>
          }
          onHint={challenge.hint}
          onShowMe={showMe}
          successNote={
            <>
              A small commitment stays in use all day, <Term k="on-demand-instance">On-Demand</Term> covers the rushes, and{' '}
              <Term k="spot-instance">Spot</Term> runs the job that can simply rerun.
            </>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Slider
          className="sm:col-span-2"
          label="Savings Plan commitment (servers' worth per hour)"
          value={plan.savingsPlanServers}
          min={0}
          max={MAX_SP}
          onChange={(v) => change({ savingsPlanServers: v })}
          format={(v) => `${worth(v)}, ${money(v * PRICE_PER_SERVER_HOUR['savings-plan'])}/hour`}
        />
        <Segmented<Plan['peaks']>
          label="Live servers above the commitment"
          value={plan.peaks}
          onChange={(v) => change({ peaks: v })}
          options={[
            { value: 'on-demand', label: 'On-Demand' },
            { value: 'spot', label: 'Spot' },
          ]}
        />
        <Segmented<Plan['batch']>
          label="Night route-planning job"
          value={plan.batch}
          onChange={(v) => change({ batch: v })}
          options={[
            { value: 'on-demand', label: 'On-Demand' },
            { value: 'spot', label: 'Spot' },
          ]}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
        <Pill>
          <Tag aria-hidden />
          Example prices
        </Pill>
        <span className="tabular-nums">
          per server-hour: Savings Plan {money(price['savings-plan'])} · On-Demand {money(price['on-demand'])} · Spot {money(price.spot)}
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-ink-2">
        <li className="flex items-center gap-1.5">
          <Swatch kind="sp" />
          <span>
            Covered by the <Term k="savings-plan">Savings Plan</Term>
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch kind="idle" />
          Commitment unused, still paid
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch kind="od" />
          <Term k="on-demand-instance">On-Demand</Term>
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch kind="spot" />
          <span>
            <Term k="spot-instance">Spot</Term>: can be taken back
          </span>
        </li>
        <li className="flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden className="shrink-0">
            <line x1="0" y1="5" x2="18" y2="5" stroke="var(--color-ink)" strokeWidth="2" />
          </svg>
          Servers needed for orders
        </li>
      </ul>

      <div ref={chartBox} role="img" aria-label={chartLabel} className="mt-3 rounded-md border border-line bg-panel p-1">
        <DayChart plan={plan} t={t} playing={phase === 'playing'} played={phase !== 'idle'} labelSize={labelSize} />
      </div>
      <p className="mt-1 text-xs text-ink-3">
        1 block = 1 server for 1 hour, every day of the month.
      </p>

      {phase !== 'idle' && (passed.length > 0 || done) && (
        <ul className="mt-3 grid gap-1.5">
          {passed.map((i) => (
            <li key={`${i.hour}-${i.hits}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
              <Pill tone={i.hits === 'live' ? 'bad' : 'warn'}>
                <Term k="spot-interruption">2-minute warning</Term>
              </Pill>
              <span>
                {i.hits === 'live'
                  ? `${hourName(i.hour)}: ${i.servers} Spot servers taken back, ${i.ordersLost} orders lost.`
                  : `${hourName(i.hour)}: route-planning servers taken back, job reran, no orders lost.`}
              </span>
            </li>
          ))}
          {done && passed.length === 0 && (
            <li className="text-sm text-ink-2">
              {usesSpot
                ? 'Spot capacity was taken back, but none of your Spot servers were running then.'
                : 'No interruptions: only Spot servers can be taken back.'}
            </li>
          )}
        </ul>
      )}

      <div className="mt-4">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <Button
            variant="primary"
            aria-disabled={phase === 'playing'}
            onClick={() => {
              if (phase === 'playing') return
              showing.current = false
              run(plan)
            }}
            className="min-w-40"
          >
            <Play aria-hidden />
            {phase === 'playing' ? 'Running the month' : done ? 'Run it again' : 'Run the month'}
          </Button>
          <Readout
            label={phase === 'idle' ? 'Month bill (estimate)' : 'Month bill'}
            value={money(costShown)}
            tone={done ? (underBudget ? 'ok' : 'bad') : 'neutral'}
          />
          <Readout
            label="Orders lost"
            value={phase === 'idle' ? '–' : lostSoFar}
            hint={phase === 'idle' ? 'run the month to see' : undefined}
            tone={phase === 'idle' ? 'neutral' : lostSoFar > 0 ? 'bad' : done ? 'ok' : 'neutral'}
          />
        </div>
        <p className="mt-3 text-sm text-ink-3">Where the month's money goes</p>
        <div className="mt-1">
          <BillBar plan={plan} upToHour={phase === 'idle' ? 24 : t} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {done
          ? `Month finished. Bill ${money(estimate.cost)}, budget ${dollars(BUDGET_PER_MONTH)}. ${estimate.ordersLost} orders lost.`
          : ''}
      </p>
    </Bench>
  )
}
