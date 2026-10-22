import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Play, Tag } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Readout, Segmented, Slider } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge.tsx'
import { Term } from '../../../../components/Term'
import { story } from '../../story'
import {
  BATCH,
  BUDGET_PER_MONTH,
  DAYS_PER_MONTH,
  DEMAND,
  PRICE_PER_SERVER_HOUR,
  hourBands,
  interruptionsFor,
  monthBill,
  simulateMonth,
  solution,
  type Plan,
} from './pricingModel'

/** How long "Run the month" takes to sweep the 24 hours. */
const PLAY_MS = 6000
const MAX_SP = Math.max(...DEMAND)
/** Right end of the bill bar, in dollars. The dearest plan costs a little less. */
const GAUGE_MAX = 450
const START_PLAN: Plan = { savingsPlanServers: 0, peaks: 'on-demand', batch: 'on-demand' }
const RERUN_HOUR = BATCH.start + BATCH.hours

/* Chart geometry, in SVG units. One block = one server for one hour. */
const W = 560
const H = 290
const L = 30
const R = 8
const T = 52
const B = 24
const ROWS = 16
const PW = W - L - R
const PH = H - T - B
const COL = PW / 24
const ROW = PH / ROWS
const x = (h: number) => L + h * COL
const y = (row: number) => T + PH - row * ROW

type BlockKind = 'sp' | 'idle' | 'od' | 'spot' | 'lost' | 'rerun'

const money = (n: number) => `$${n.toFixed(2)}`
const dollars = (n: number) => `$${Math.round(n)}`
const pay = (m: 'on-demand' | 'spot') => (m === 'spot' ? 'Spot' : 'On-Demand')
/** "1 server's worth", "3 servers' worth" */
const worth = (n: number) => (n === 1 ? "1 server's worth" : `${n} servers' worth`)

/** "3 am", "noon", "7 pm" */
function hourName(h: number) {
  const hh = ((h % 24) + 24) % 24
  if (hh === 0) return '12 am'
  if (hh === 12) return 'noon'
  return hh < 12 ? `${hh} am` : `${hh - 12} pm`
}

function blockStyle(kind: BlockKind, hatch: string) {
  switch (kind) {
    case 'sp':
      return { fill: 'var(--color-compute)', stroke: 'var(--color-compute)' }
    case 'idle':
      return { fill: 'var(--color-panel)', stroke: 'var(--color-compute)', strokeDasharray: '2.5 2' }
    case 'od':
      return { fill: 'var(--color-compute)', fillOpacity: 0.32, stroke: 'var(--color-compute)' }
    case 'spot':
      return { fill: `url(#${hatch})`, stroke: 'var(--color-warn)' }
    case 'rerun':
      return { fill: `url(#${hatch})`, stroke: 'var(--color-warn)', strokeDasharray: '2.5 2' }
    case 'lost':
      return { fill: 'var(--color-bad)', stroke: 'var(--color-bad)' }
  }
}

/** The hatch used for Spot blocks. */
function SpotHatch({ id, size = 5 }: { id: string; size?: number }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width={size} height={size} fill="var(--color-warn-soft)" />
      <line x1="0" y1="0" x2="0" y2={size} stroke="var(--color-warn)" strokeWidth="1.6" />
    </pattern>
  )
}

/** A legend swatch drawn with the same style as the chart's blocks. */
function Swatch({ kind }: { kind: BlockKind }) {
  const hatch = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-h`
  return (
    <svg width="18" height="13" aria-hidden className="shrink-0">
      <defs>
        <SpotHatch id={hatch} size={4} />
      </defs>
      <rect x="1" y="1" width="16" height="11" rx="1.5" strokeWidth="1.2" {...blockStyle(kind, hatch)} />
    </svg>
  )
}

/** Day chart: stacked blocks per hour, the live-demand line, rush and job labels, and Spot interruptions once played. */
function DayChart({
  plan,
  t,
  playing,
  played,
  labelSize,
}: {
  plan: Plan
  /** Hours played so far (0 to 24). */
  t: number
  playing: boolean
  /** True once a run has started: interruptions up to `t` are shown. */
  played: boolean
  labelSize: number
}) {
  const hatch = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-spot`
  const hits = played ? interruptionsFor(plan).filter((i) => i.hour < t) : []
  const lostHours = new Set(hits.filter((i) => i.hits === 'live').map((i) => i.hour))
  const rerun = hits.some((i) => i.hits === 'batch')
  const tagHours = [...new Set(hits.map((i) => i.hour))]

  const blocks: { h: number; row: number; kind: BlockKind }[] = []
  for (let h = 0; h < 24; h++) {
    const b = hourBands(plan, h)
    let row = 0
    const push = (n: number, kind: BlockKind) => {
      for (let i = 0; i < n; i++) blocks.push({ h, row: row++, kind })
    }
    push(b.spUsed, 'sp')
    push(b.peak, plan.peaks === 'on-demand' ? 'od' : lostHours.has(h) ? 'lost' : 'spot')
    push(b.spBatch, 'sp')
    push(b.spIdle, 'idle')
    push(b.batch, plan.batch === 'spot' ? 'spot' : 'od')
    if (rerun && h === RERUN_HOUR) push(BATCH.servers, 'rerun')
  }

  let demandLine = `M${x(0)},${y(DEMAND[0])}`
  DEMAND.forEach((v, h) => {
    demandLine += ` V${y(v)} H${x(h + 1)}`
  })

  const charW = labelSize * 0.56
  const spans = [
    { from: BATCH.start, to: BATCH.start + BATCH.hours, label: 'Route planning' },
    { from: 11, to: 15, label: 'Lunch rush' },
    { from: 18, to: 22, label: 'Dinner rush' },
  ]
  const rerunTop = hourBands(plan, RERUN_HOUR)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
      <defs>
        <SpotHatch id={hatch} />
      </defs>

      {/* Grid and axes */}
      {[0, 4, 8, 12, 16].map((r) => (
        <g key={r}>
          <line x1={L} x2={W - R} y1={y(r)} y2={y(r)} stroke="var(--color-line)" strokeWidth={r === 0 ? 1.5 : 1} />
          <text x={L - 6} y={y(r) + labelSize * 0.35} textAnchor="end" fontSize={labelSize} fill="var(--color-ink-3)">
            {r}
          </text>
        </g>
      ))}
      {[0, 6, 12, 18, 24].map((h, i, all) => (
        <text
          key={h}
          x={x(h)}
          y={H - 6}
          textAnchor={i === 0 ? 'start' : i === all.length - 1 ? 'end' : 'middle'}
          fontSize={labelSize}
          fill="var(--color-ink-3)"
        >
          {hourName(h)}
        </text>
      ))}

      {/* What each part of the day is */}
      {spans.map((s) => (
        <g key={s.label}>
          <text
            x={x((s.from + s.to) / 2)}
            y={16}
            textAnchor="middle"
            fontSize={labelSize}
            fontWeight="700"
            fill="var(--color-ink-2)"
          >
            {s.label}
          </text>
          <path
            d={`M${x(s.from) + 2},26 V22 H${x(s.to) - 2} V26`}
            fill="none"
            stroke="var(--color-line-strong)"
            strokeWidth="1.2"
          />
        </g>
      ))}

      {/* Blocks: one server for one hour */}
      {blocks.map((b) => (
        <rect
          key={`${b.h}-${b.row}`}
          x={x(b.h) + 1.5}
          y={y(b.row + 1) + 1.5}
          width={COL - 3}
          height={ROW - 3}
          rx="1.5"
          strokeWidth="1.2"
          opacity={playing && b.h >= t ? 0.3 : 1}
          {...blockStyle(b.kind, hatch)}
        />
      ))}
      {rerun && (
        <text
          x={x(RERUN_HOUR + 0.5)}
          y={y(Math.max(plan.savingsPlanServers, rerunTop.spUsed + rerunTop.peak) + BATCH.servers) - 4}
          textAnchor="middle"
          fontSize={labelSize * 0.9}
          fontWeight="700"
          fill="var(--color-warn)"
          stroke="var(--color-panel)"
          strokeWidth="3"
          paintOrder="stroke"
        >
          rerun
        </text>
      )}

      {/* Servers needed for live orders */}
      <path d={demandLine} fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" />

      {/* Spot interruptions, once the playhead has passed them */}
      {tagHours.map((h) => {
        const cx = x(h + 0.5)
        const w = 16 * charW + 12
        const left = Math.min(Math.max(L, cx - w / 2), W - R - w)
        const live = lostHours.has(h)
        const color = live ? 'var(--color-bad)' : 'var(--color-warn)'
        return (
          <g key={h}>
            <line x1={cx} x2={cx} y1={38} y2={y(0)} stroke={color} strokeWidth="1.5" strokeDasharray="4 3" />
            <rect
              x={left}
              y={38 - (labelSize + 6) / 2}
              width={w}
              height={labelSize + 6}
              rx="4"
              fill={live ? 'var(--color-bad-soft)' : 'var(--color-warn-soft)'}
              stroke={color}
            />
            <text x={left + w / 2} y={38 + labelSize * 0.35} textAnchor="middle" fontSize={labelSize} fontWeight="700" fill={color}>
              2-minute warning
            </text>
          </g>
        )
      })}

      {playing && <line x1={x(t)} x2={x(t)} y1={T - 4} y2={y(0)} stroke="var(--color-signal)" strokeWidth="2" />}
    </svg>
  )
}

/** The month's bill as one bar, split by how each part is paid, with the budget marked. */
function BillBar({ plan, upToHour }: { plan: Plan; upToHour: number }) {
  const hatch = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-bar`
  const bill = monthBill(plan, { upToHour })
  const parts: { kind: BlockKind; value: number; label: string }[] = [
    { kind: 'sp', value: bill.savingsPlan - bill.savingsPlanIdle, label: 'Commitment used' },
    { kind: 'idle', value: bill.savingsPlanIdle, label: 'Commitment unused, still paid' },
    { kind: 'od', value: bill.onDemand, label: 'On-Demand' },
    { kind: 'spot', value: bill.spot, label: 'Spot' },
  ]
  const pct = (v: number) => `${(Math.min(v, GAUGE_MAX) / GAUGE_MAX) * 100}%`
  let left = 0
  return (
    <div>
      <div className="relative h-7 overflow-hidden rounded-md border border-line bg-sunken">
        <svg className="absolute inset-0 size-full" aria-hidden>
          <defs>
            <SpotHatch id={hatch} />
          </defs>
          {parts.map((p) => {
            const at = left
            left += p.value
            if (p.value <= 0) return null
            return (
              <rect
                key={p.kind}
                x={pct(at)}
                y="0"
                width={pct(p.value)}
                height="100%"
                strokeWidth="1.2"
                {...blockStyle(p.kind, hatch)}
              />
            )
          })}
        </svg>
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-ink"
          style={{ left: pct(BUDGET_PER_MONTH) }}
        />
      </div>
      <div className="relative mt-1 h-5 text-xs font-bold text-ink-2">
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pct(BUDGET_PER_MONTH) }}>
          Budget {dollars(BUDGET_PER_MONTH)}
        </span>
      </div>
      {bill.savingsPlanIdle > 0 && (
        <p className="text-xs text-warn">Commitment unused, still paid: {money(bill.savingsPlanIdle)}</p>
      )}
    </div>
  )
}

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

  const { solve, fail } = challenge
  const finish = useCallback(
    (p: Plan) => {
      cancel()
      setT(24)
      setPhase('done')
      const r = simulateMonth(p)
      if (r.cost <= BUDGET_PER_MONTH && r.ordersLost === 0) solve()
      else fail()
    },
    [cancel, solve, fail],
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
  const labelSize = boxWidth > 0 ? Math.min(19, Math.max(9, (12 * W) / boxWidth)) : 12

  const change = (next: Partial<Plan>) => {
    cancel()
    setPhase('idle')
    setT(0)
    setPlan((p) => ({ ...p, ...next }))
  }

  const showMe = () => {
    setPlan(solution)
    run(solution)
    challenge.show()
  }

  const reset = () => {
    cancel()
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
          Set a <Term k="savings-plan">Savings Plan</Term> commitment for the always-on servers, choose how to pay for
          the rest, then run the month.
        </>
      }
      onReset={reset}
    >
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
        1 block = 1 server for 1 hour, every day of the month; each 2-minute warning happens once this month.
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
                  ? `Once this month at ${hourName(i.hour)}, AWS took back ${i.servers} Spot servers taking orders and ${i.ordersLost} orders were lost.`
                  : `Once this month at ${hourName(i.hour)}, AWS took back the route-planning servers and the job reran with no orders lost.`}
              </span>
            </li>
          ))}
          {done && passed.length === 0 && (
            <li className="text-sm text-ink-2">
              {usesSpot
                ? 'AWS took back Spot capacity this month, but none of your Spot servers were running then.'
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
            onClick={() => phase !== 'playing' && run(plan)}
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

      <div className="mt-5">
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
          hint="Commit only to the servers you need even at night, keep the rushes On-Demand, and give the night job to Spot."
          onHint={challenge.hint}
          onShowMe={showMe}
          successNote="A small commitment stays in use all day, On-Demand covers the rushes, and Spot runs the job that can simply rerun."
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {done
          ? `Month finished. Bill ${money(estimate.cost)}, budget ${dollars(BUDGET_PER_MONTH)}. ${estimate.ordersLost} orders lost.`
          : ''}
      </p>
    </Bench>
  )
}
