import { cn } from '../../../../lib/cn'
import { RUSH, type FleetEvent, type Tick } from './scaleModel'

const POINT_LABEL: Record<Exclude<FleetEvent['kind'], 'rush'>, string> = {
  'az-down': 'AZ down',
  'instance-crash': 'Crash',
  'spot-interruption': 'Spot taken back',
}

/** Rough width of a label in columns, for keeping labels apart (about 7px per letter, about 19px per column on a phone). */
const widthInCols = (text: string) => Math.ceil((text.length * 7 + 8) / 19)

/** Puts each point event's label on the first row where it does not overlap another one. */
function placeLabels(events: readonly FleetEvent[]) {
  const rows: { at: number; w: number }[][] = [[], []]
  const out: { at: number; text: string; row: number }[] = []
  const points = events
    .filter((e): e is FleetEvent & { kind: Exclude<FleetEvent['kind'], 'rush'> } => e.kind !== 'rush')
    .sort((a, b) => a.at - b.at)
  const seen = new Set<string>()
  for (const e of points) {
    const key = `${e.at}-${e.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    const text = POINT_LABEL[e.kind]
    const w = widthInCols(text)
    const row = rows.findIndex((r) => r.every((o) => Math.abs(o.at - e.at) >= (o.w + w) / 2))
    if (row === -1) continue
    rows[row].push({ at: e.at, w })
    out.push({ at: e.at, text, row })
  }
  return out
}

/**
 * The day at a glance: one column per step. The dashed outline is how many orders customers tried to place;
 * green is what was saved, amber what waited out a database failover (saved the step after, so that column
 * rises above its outline), and red what was turned away. Results appear only up to the step the day has reached.
 */
export function DayStrip({
  ticks,
  events,
  at,
  revealed,
  playing,
}: {
  ticks: Tick[]
  events: readonly FleetEvent[]
  /** The step on screen. */
  at: number
  /** Results are shown for steps up to and including this one (-1 for none). */
  revealed: number
  playing: boolean
}) {
  const n = ticks.length
  const top = Math.max(...ticks.map((t) => Math.max(t.demand, t.served + t.held + t.turnedAway))) * 1.08
  const pct = (v: number) => `${(v / top) * 100}%`
  const colPct = (c: number) => `${((c + 0.5) / n) * 100}%`
  const rushes = events.filter((e) => e.kind === 'rush')
  const points = placeLabels(events)

  return (
    <div className="min-w-0">
      {/* Events above the columns */}
      <div aria-hidden className="relative h-[3.6rem] text-xs font-bold text-ink-2">
        {rushes.map((e, i) => {
          const from = e.at
          const to = Math.min(n, e.at + RUSH.length)
          return (
            <div
              key={`${e.at}-${i}`}
              className="absolute top-0"
              style={{ left: `${(from / n) * 100}%`, width: `${((to - from) / n) * 100}%` }}
            >
              <span className="block truncate text-center leading-4">Lunch rush</span>
              <span className="block h-1.5 border-x border-t border-line-strong" />
            </div>
          )
        })}
        {points.map((p) => {
          const nearLeft = p.at < 3
          const nearRight = p.at > n - 4
          return (
            <span
              key={`${p.at}-${p.text}`}
              className={cn(
                'absolute whitespace-nowrap leading-none text-bad',
                nearLeft ? '' : nearRight ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{
                left: nearLeft ? `${(p.at / n) * 100}%` : nearRight ? `${((p.at + 1) / n) * 100}%` : colPct(p.at),
                top: `${1.6 + p.row}rem`,
              }}
            >
              {p.text}
            </span>
          )
        })}
      </div>

      {/* Columns */}
      <div aria-hidden className="relative flex h-24 items-end gap-[2px] border-b border-line-strong">
        {ticks.map((t, i) => {
          const shown = i <= revealed
          const event = events.some((e) => e.at === i && e.kind !== 'rush')
          return (
            <div
              key={i}
              className={cn(
                'relative h-full min-w-0 flex-1 rounded-t-[2px]',
                i === at && (playing || revealed >= 0) && 'bg-signal-soft',
                playing && i > at && 'opacity-40',
              )}
            >
              {event && <span className="absolute inset-y-0 left-1/2 w-0 border-l border-dashed border-bad" />}
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-[2px] border border-dashed border-line-strong"
                style={{ height: pct(t.demand) }}
              />
              {shown && (
                <>
                  <span className="absolute inset-x-0 bottom-0 bg-ok/70" style={{ height: pct(t.served) }} />
                  {t.held > 0 && (
                    <span className="absolute inset-x-0 bg-warn/55" style={{ bottom: pct(t.served), height: pct(t.held) }} />
                  )}
                  {t.turnedAway > 0 && (
                    <span
                      className="absolute inset-x-0 bg-bad"
                      style={{ bottom: pct(t.served + t.held), height: pct(t.turnedAway) }}
                    />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Markers under the columns: orders lost with servers, and database failovers */}
      <div aria-hidden className="relative flex h-4 gap-[2px]">
        {ticks.map((t, i) => (
          <div key={i} className="flex min-w-0 flex-1 justify-center">
            {i <= revealed && t.lostOnServers > 0 && <span className="mt-1 size-2 rotate-45 bg-bad" />}
            {i <= revealed && t.lostOnServers === 0 && t.dbFailingOver && (
              <span className="mt-1 size-2 rounded-full border-2 border-warn" />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-2 text-xs text-ink-3">
        <span>Morning</span>
        <span>time sped up</span>
        <span>Night</span>
      </div>

      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-[2px] border border-dashed border-line-strong" /> Orders tried
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-[2px] bg-ok/70" /> Saved
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-[2px] bg-bad" /> Turned away
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rotate-45 bg-bad" /> Orders lost with servers
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-[2px] bg-warn/55" />
          <span aria-hidden className="size-2 rounded-full border-2 border-warn" /> Failover: orders retry
        </li>
      </ul>
    </div>
  )
}
