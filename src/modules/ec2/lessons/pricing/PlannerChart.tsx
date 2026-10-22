import { useId } from 'react'
import { BATCH, BUDGET_PER_MONTH, DEMAND, hourBands, interruptionsFor, monthBill, type Plan } from './pricingModel'
import { dollars, hourName, money } from './format'

/** Right end of the bill bar, in dollars. The dearest plan costs a little less. */
const GAUGE_MAX = 450
export const RERUN_HOUR = BATCH.start + BATCH.hours

/* Chart geometry, in SVG units. One block = one server for one hour. */
export const W = 560
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

export type BlockKind = 'sp' | 'idle' | 'od' | 'spot' | 'lost' | 'rerun'

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
export function SpotHatch({ id, size = 5 }: { id: string; size?: number }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width={size} height={size} fill="var(--color-warn-soft)" />
      <line x1="0" y1="0" x2="0" y2={size} stroke="var(--color-warn)" strokeWidth="1.6" />
    </pattern>
  )
}

/** A legend swatch drawn with the same style as the chart's blocks. */
export function Swatch({ kind }: { kind: BlockKind }) {
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
export function DayChart({
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
export function BillBar({ plan, upToHour }: { plan: Plan; upToHour: number }) {
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
        <p className="flex items-center gap-1.5 text-xs text-ink-2">
          <Swatch kind="idle" />
          Commitment unused, still paid: {money(bill.savingsPlanIdle)}
        </p>
      )}
    </div>
  )
}
