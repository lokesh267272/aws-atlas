import { useId, useMemo } from 'react'
import { DAYS, HOLIDAYS, MONTHS, MONTH_STARTS, VISITORS_PER_SERVER, type PlanMode } from './capacityModel'
import { H, L, MIN_RENDER_W, R, T, TICKS, W, x, y } from './chartGeometry'

const f = (n: number) => n.toFixed(1)

/**
 * Visitors per day (the demand line) against the servers you have (the capacity line).
 * Idle capacity is the hatched area under the capacity line and above demand;
 * turned-away visitors are the solid area above the capacity line.
 */
export function CapacityChart({
  demand,
  servers,
  mode,
  day,
  labelSize = 11,
  scrolls = false,
}: {
  demand: number[]
  servers: number[]
  mode: PlanMode
  /** Show the year up to and including this day */
  day: number
  /** Text size in SVG units; larger when the chart is drawn small, so labels stay readable */
  labelSize?: number
  /** True when the chart is wider than its box. It then opens on the second half of the year, so the label goes there. */
  scrolls?: boolean
}) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const ids = {
    hatch: `${raw}-hatch`,
    aboveDemand: `${raw}-above-demand`,
    aboveCap: `${raw}-above-cap`,
    reveal: `${raw}-reveal`,
  }

  const demandPaths = useMemo(() => {
    let line = `M${f(x(0))},${f(y(demand[0]))}`
    demand.forEach((v, d) => {
      line += ` L${f(x(d + 0.5))},${f(y(v))}`
    })
    line += ` L${f(x(DAYS))},${f(y(demand[demand.length - 1]))}`
    return {
      line,
      area: `${line} V${f(y(0))} H${f(x(0))} Z`,
      above: `${line} V${T} H${f(x(0))} Z`,
    }
  }, [demand])

  const capPaths = useMemo(() => {
    let line = `M${f(x(0))},${f(y(servers[0] * VISITORS_PER_SERVER))}`
    servers.forEach((s, d) => {
      line += ` V${f(y(s * VISITORS_PER_SERVER))} H${f(x(d + 1))}`
    })
    return {
      line,
      area: `${line} V${f(y(0))} H${f(x(0))} Z`,
      above: `${line} V${T} H${f(x(0))} Z`,
    }
  }, [servers])

  const revealW = x(day + 1) - L
  const showPlayhead = day < DAYS - 1
  const capY = y(servers[0] * VISITORS_PER_SERVER)
  const capLabelY = capY - 6 < T + 10 ? capY + labelSize + 4 : capY - 6
  const capLabelX = scrolls ? x(MONTH_STARTS[5]) : L + 6

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" style={{ minWidth: MIN_RENDER_W }} aria-hidden>
      <defs>
        <pattern id={ids.hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--color-warn-soft)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-warn)" strokeWidth="1.6" />
        </pattern>
        <clipPath id={ids.aboveDemand}>
          <path d={demandPaths.above} />
        </clipPath>
        <clipPath id={ids.aboveCap}>
          <path d={capPaths.above} />
        </clipPath>
        <clipPath id={ids.reveal}>
          <rect x={L} y={0} width={Math.max(0, revealW)} height={H} />
        </clipPath>
      </defs>

      {/* Grid and axes */}
      {TICKS.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={t === 0 ? 1.5 : 1} />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize={labelSize} fill="var(--color-ink-3)">
            {t === 0 ? '0' : `${t / 1000}k`}
          </text>
        </g>
      ))}
      {MONTH_STARTS.map((m, i) => (
        <g key={m}>
          {i > 0 && <line x1={x(m)} x2={x(m)} y1={y(0)} y2={y(0) + 4} stroke="var(--color-line-strong)" />}
          <text x={x(m + 15)} y={H - 8} textAnchor="middle" fontSize={labelSize} fill="var(--color-ink-3)">
            {MONTHS[i]}
          </text>
        </g>
      ))}
      {HOLIDAYS.map((h, i) => {
        const last = i === HOLIDAYS.length - 1
        return (
          <g key={h.label}>
            <line x1={x(h.day)} x2={x(h.day)} y1={T - 6} y2={T + 6} stroke="var(--color-line-strong)" />
            <text
              x={last ? W - R : x(h.day)}
              y={T - 11}
              textAnchor={last ? 'end' : 'middle'}
              fontSize={labelSize}
              fontWeight="700"
              fill="var(--color-ink-2)"
            >
              {h.label}
            </text>
          </g>
        )
      })}

      {/* The whole year's demand, faint, so you can see what is coming */}
      <path d={demandPaths.line} fill="none" stroke="var(--color-line-strong)" strokeWidth="1" strokeDasharray="3 3" />

      {/* The year so far */}
      <g clipPath={`url(#${ids.reveal})`}>
        <g clipPath={`url(#${ids.aboveDemand})`}>
          <path d={capPaths.area} fill={`url(#${ids.hatch})`} />
        </g>
        <g clipPath={`url(#${ids.aboveCap})`}>
          <path d={demandPaths.area} fill="var(--color-bad)" fillOpacity="0.85" />
        </g>
        <path d={demandPaths.line} fill="none" stroke="var(--color-ink)" strokeWidth="1.4" strokeLinejoin="round" />
        <path
          d={capPaths.line}
          fill="none"
          stroke="var(--color-compute)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="square"
        />
      </g>

      {/* Capacity label */}
      <text
        x={capLabelX}
        y={capLabelY}
        fontSize={labelSize}
        fontWeight="700"
        fill="var(--color-compute)"
        stroke="var(--color-panel)"
        strokeWidth="3"
        paintOrder="stroke"
      >
        {mode === 'buy'
          ? `Your ${servers[0]} server${servers[0] === 1 ? '' : 's'}: ${(servers[0] * VISITORS_PER_SERVER).toLocaleString('en-US')} visitors a day`
          : 'Rented servers'}
      </text>

      {showPlayhead && (
        <line x1={x(day + 1)} x2={x(day + 1)} y1={T} y2={y(0)} stroke="var(--color-signal)" strokeWidth="2" />
      )}
    </svg>
  )
}

/** The legend, as HTML so it wraps on narrow screens. Each entry has a shape and words, not just a colour. */
export function CapacityLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
      <li className="flex items-center gap-2">
        <svg width="22" height="10" aria-hidden>
          <line x1="0" y1="5" x2="22" y2="5" stroke="var(--color-ink)" strokeWidth="1.6" />
        </svg>
        Visitors per day (demand)
      </li>
      <li className="flex items-center gap-2">
        <svg width="22" height="10" aria-hidden>
          <line x1="0" y1="5" x2="22" y2="5" stroke="var(--color-compute)" strokeWidth="3" />
        </svg>
        Visitors your servers can handle (capacity)
      </li>
      <li className="flex items-center gap-2">
        <svg width="16" height="12" aria-hidden>
          <defs>
            <pattern id="cb-legend-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" fill="var(--color-warn-soft)" />
              <line x1="0" y1="0" x2="0" y2="5" stroke="var(--color-warn)" strokeWidth="1.4" />
            </pattern>
          </defs>
          <rect width="16" height="12" fill="url(#cb-legend-hatch)" stroke="var(--color-warn)" />
        </svg>
        Idle: paid for, not used
      </li>
      <li className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-3 w-4 bg-bad" />
        Turned away: site too busy
      </li>
    </ul>
  )
}
