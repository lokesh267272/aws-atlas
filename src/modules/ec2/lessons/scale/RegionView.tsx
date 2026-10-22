import { lazy } from 'react'
import { Scene3D } from '../../../../components/Scene3D'
import { Term } from '../../../../components/Term'
import { story } from '../../story'
import { payStyle } from './look'
import { RegionFallback } from './RegionFallback'
import { fitsWebsite, REGION_AZS, type FleetConfig, type Pay, type RemovedView, type Tick } from './scaleModel'

// three.js loads only when the browser can show 3D.
const RegionScene = lazy(() => import('./RegionScene'))

/** Glossary words on the dark panel: underline and highlight in the screen accent, which stays readable there. */
export const screenTerms =
  '[&_.term]:decoration-screen-accent [&_.term:hover]:text-screen-accent [&_.term[aria-expanded=true]]:text-screen-accent'

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** What the stage shows, in words, for screen readers. */
export function describeRegion(tick: Tick, cfg: FleetConfig, live = true): string {
  const azs = Array.from({ length: REGION_AZS }, (_, a) => {
    const name = story.azs[a]
    if (tick.azDown[a]) return `${name} is down.`
    if (a >= cfg.azCount) return `${name} is not used by the group.`
    const here = tick.instances.filter((i) => i.az === a)
    const booting = here.filter((i) => i.booting).length
    return `${name}: ${count(here.length, 'server', 'servers')}${booting ? `, ${booting} starting up` : ''}.`
  })
  const lb = cfg.webOpen
    ? `The load balancer sends orders only to healthy servers${live && tick.turnedAway ? `; ${tick.turnedAway} customers were turned away` : ''}.`
    : 'The web port is closed, so every customer is turned away.'
  const db =
    cfg.ordersOn === 'server-disk'
      ? 'Orders are saved on each server’s own disk; the database is not used.'
      : tick.dbPrimary === null
        ? 'The orders database is unavailable.'
        : `Orders database primary in ${story.azs[tick.dbPrimary]}${tick.dbFailingOver ? ', failing over, orders retrying' : ''}${
            tick.dbStandby !== null ? `, standby copy in ${story.azs[tick.dbStandby]}` : ''
          }.`
  return [`Region ${story.regionCode} with three Availability Zones.`, ...azs, lb, db].join(' ')
}

/** Steps an event's line stays up, so it can be read (about two seconds while the day plays). */
export const EVENT_STEPS = 3

/** Servers that left in the last two steps, so a crashed or taken-back server and its tag stay on stage long enough to see. */
export function recentRemoved(ticks: Tick[], at: number): RemovedView[] {
  return [at - 1, at].filter((i) => i >= 0 && i < ticks.length).flatMap((i) => ticks[i].removed)
}

/** The line for an event (AZ down, crash, Spot taken back) at this step, if any. */
function eventLine(tick: Tick, prev: Tick | undefined, cfg: FleetConfig): string | null {
  const reasons = new Set(tick.removed.map((r) => r.reason))
  if (reasons.has('az-down')) {
    const az = tick.azDown.findIndex((d, a) => d && !prev?.azDown[a])
    const name = story.azs[Math.max(0, az)]
    const left = Array.from({ length: cfg.azCount }, (_, a) => a).some((a) => !tick.azDown[a])
    if (!left) return `${name} down: the group has no other AZ`
    return tick.dbFailingOver ? `${name} down: other AZs take over, the database fails over` : `${name} down: other AZs take over`
  }
  if (reasons.has('crash')) return 'A server failed its health check: Auto Scaling replaces it'
  if (reasons.has('spot')) return 'AWS took back Spot servers: Auto Scaling replaces them'
  return null
}

/** The line for what Auto Scaling did at this step, if anything. */
function actionLine(tick: Tick): string | null {
  const launched = tick.instances.filter((i) => i.booting).length
  const removed = tick.removed.filter((r) => r.reason === 'scale-in').length
  if (launched > 0) return `CPU above target: Auto Scaling starts ${count(launched, 'server', 'servers')}`
  if (removed > 0) return `CPU below target: Auto Scaling removes ${count(removed, 'server', 'servers')}`
  return null
}

/**
 * One short clause (at most 15 words) for step `at`. The stage, the strip and the readouts show the rest.
 * An event's line stays for EVENT_STEPS steps and an Auto Scaling action's for two, unless something newer happens.
 */
export function statusLine(ticks: Tick[], at: number, cfg: FleetConfig): string {
  return notableLine(ticks, at, cfg) ?? steadyLine(ticks, at, cfg)
}

/** The event or Auto Scaling line for step `at`, or null on a steady step. Only these are announced to screen readers. */
export function notableLine(ticks: Tick[], at: number, cfg: FleetConfig): string | null {
  for (let k = 0; k < EVENT_STEPS && at - k >= 0; k++) {
    const line = eventLine(ticks[at - k], ticks[at - k - 1], cfg)
    if (line) return line
  }
  return actionLine(ticks[at]) ?? (at > 0 ? actionLine(ticks[at - 1]) : null)
}

function steadyLine(ticks: Tick[], at: number, cfg: FleetConfig): string {
  const tick = ticks[at]
  if (!cfg.webOpen) return 'Web port closed: every customer is turned away'
  if (!fitsWebsite(cfg.instanceType)) return 'Too little memory: the website cannot run'
  if (cfg.ordersOn === 'database' && tick.dbPrimary === null) return 'No database left: orders cannot be saved'
  if (tick.inService === 0) return 'No servers are taking orders'
  const down = tick.azDown.findIndex(Boolean)
  if (down >= 0) return `${story.azs[down]} down: ${count(tick.inService, 'server', 'servers')} in other AZs take orders`
  return `${count(tick.inService, 'server', 'servers')} taking orders, average CPU ${tick.cpu}%`
}

/** A legend mark drawn like a server in the flat view. */
export function ServerSwatch({ pay, booting = false }: { pay: Pay; booting?: boolean }) {
  return <span aria-hidden className="inline-block size-3.5 shrink-0 rounded-[3px] border-2" style={payStyle(pay, booting)} />
}

/** A dashed boundary line, as Region and AZ frames are drawn. */
function Line({ color }: { color: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 12" className="h-3 w-4 shrink-0">
      <line x1="1" y1="6" x2="15" y2="6" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
    </svg>
  )
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color }} />
}

/** The Region on a dark stage: 3D when the browser can, the flat view otherwise. Plus a legend. */
export function RegionView({
  tick,
  cfg,
  playing,
  reduced,
  live = true,
  removed = tick.removed,
}: {
  tick: Tick
  cfg: FleetConfig
  playing: boolean
  reduced: boolean
  /** False for a preview of a day not run yet. */
  live?: boolean
  /** Servers to draw leaving (see recentRemoved); this step's by default. */
  removed?: RemovedView[]
}) {
  const label = describeRegion(tick, cfg, live)
  const usesDb = cfg.ordersOn === 'database'
  return (
    <div className={screenTerms}>
      <Scene3D
        label={label}
        height="h-[320px] sm:h-[430px]"
        fallback={<RegionFallback tick={tick} cfg={cfg} label={label} live={live} removed={removed} />}
      >
        <RegionScene tick={tick} cfg={cfg} playing={playing} reduced={reduced} live={live} removed={removed} />
      </Scene3D>

      <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-screen-dim">
        <li className="flex items-center gap-1.5">
          <Line color="var(--color-region)" /> <Term k="region">Region</Term> {story.regionCode}
        </li>
        <li className="flex items-center gap-1.5">
          <Line color="var(--color-az)" /> <Term k="availability-zone">Availability Zone</Term>
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-4 shrink-0 rounded-[2px] bg-networking" />{' '}
          <Term k="load-balancer">Load balancer</Term>
        </li>
        <li className="flex items-center gap-1.5">
          <ServerSwatch pay="savings-plan" /> Minimum servers: <Term k="savings-plan">Savings Plan</Term>
        </li>
        <li className="flex items-center gap-1.5">
          <ServerSwatch pay="on-demand" /> Extra: <Term k="on-demand-instance">On-Demand</Term>
        </li>
        <li className="flex items-center gap-1.5">
          <ServerSwatch pay="spot" /> Extra: <Term k="spot-instance">Spot</Term>
        </li>
        <li className="flex items-center gap-1.5">
          <ServerSwatch pay="savings-plan" booting /> Starting up
        </li>
        <li className="flex items-center gap-1.5">
          <Dot color="var(--color-screen-accent)" /> Request
          <Dot color="var(--color-bad)" /> turned away
        </li>
        <li className="flex items-center gap-1.5">
          <Dot color="var(--color-database)" />
          <span>
            Order saved in the <Term k="rds">database</Term>, kept in sync with a <Term k="rds-standby">standby copy</Term>
          </span>
        </li>
        {!usesDb && (
          <li className="flex items-center gap-1.5">
            <Dot color="var(--color-screen-dim)" /> Order saved on the server&apos;s own disk
          </li>
        )}
      </ul>
    </div>
  )
}
