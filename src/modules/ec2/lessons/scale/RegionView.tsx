import { lazy } from 'react'
import { Scene3D } from '../../../../components/Scene3D'
import { Term } from '../../../../components/Term'
import { story } from '../../story'
import { payStyle } from './look'
import { RegionFallback } from './RegionFallback'
import { REGION_AZS, type FleetConfig, type Pay, type Tick } from './scaleModel'

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
        : `Orders database primary in ${story.azs[tick.dbPrimary]}${tick.dbFailingOver ? ', failing over, orders waiting' : ''}${
            tick.dbStandby !== null ? `, standby copy in ${story.azs[tick.dbStandby]}` : ''
          }.`
  return [`Region ${story.regionCode} with three Availability Zones.`, ...azs, lb, db].join(' ')
}

/** The sentence for an event (crash, AZ down, Spot taken back) that happened at this step, if any. */
function eventSentence(tick: Tick, prev: Tick | undefined): string | null {
  const reasons = new Set(tick.removed.map((r) => r.reason))
  const launched = tick.instances.some((i) => i.booting)
  if (reasons.has('az-down')) {
    const az = tick.azDown.findIndex((d, a) => d && !prev?.azDown[a])
    const name = story.azs[Math.max(0, az)]
    const first = launched
      ? `${name} went down: the load balancer uses the other AZs and Auto Scaling launches replacements there.`
      : `${name} went down, and the group has no other AZ to launch replacements in.`
    return tick.dbFailingOver ? `${first} The database fails over to its standby: orders wait, then go through.` : first
  }
  if (reasons.has('crash')) return 'A server crashed: the load balancer stops sending to it, and Auto Scaling launches a replacement.'
  if (reasons.has('spot')) return 'AWS took back the Spot servers in one AZ: Auto Scaling launches replacements.'
  return null
}

/**
 * One short line saying what is happening at step `at`. An event's sentence stays for two steps, so it can be read;
 * otherwise it says what Auto Scaling is doing, or how the fleet is coping.
 */
export function statusLine(ticks: Tick[], at: number, cfg: FleetConfig): string {
  const tick = ticks[at]
  const parts: string[] = []
  const recent = [at, at - 1].filter((i) => i >= 0).map((i) => eventSentence(ticks[i], ticks[i - 1]))
  const event = recent.find((s) => s !== null)
  const launched = tick.instances.filter((i) => i.booting).length
  const removedByScaling = tick.removed.filter((r) => r.reason === 'scale-in').length
  if (event) parts.push(event)
  else if (launched > 0) parts.push(`CPU is above target, so Auto Scaling is starting ${count(launched, 'more server', 'more servers')}.`)
  else if (removedByScaling > 0) parts.push(`CPU fell below target, so Auto Scaling removed ${count(removedByScaling, 'server', 'servers')}.`)
  else if (tick.azDown.some(Boolean)) {
    const az = story.azs[tick.azDown.findIndex(Boolean)]
    parts.push(
      tick.inService > 0
        ? `${az} is down: ${count(tick.inService, 'server', 'servers')} in the other AZs take the orders.`
        : `${az} is down, and no servers are left to take orders.`,
    )
  }
  if (tick.lostOnServers > 0) parts.push(`${tick.lostOnServers} orders vanished with the servers' disks.`)
  if (tick.turnedAway > 0) parts.push(`${tick.turnedAway} customers turned away.`)
  if (parts.length === 0)
    parts.push(cfg.webOpen ? `${count(tick.inService, 'server', 'servers')} taking orders, average CPU ${tick.cpu}%.` : 'The web port is closed.')
  return parts.join(' ')
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
}: {
  tick: Tick
  cfg: FleetConfig
  playing: boolean
  reduced: boolean
  /** False for a preview of a day not run yet. */
  live?: boolean
}) {
  const label = describeRegion(tick, cfg, live)
  const usesDb = cfg.ordersOn === 'database'
  return (
    <div className={screenTerms}>
      <Scene3D
        label={label}
        height="h-[270px] sm:h-[430px]"
        fallback={<RegionFallback tick={tick} cfg={cfg} label={label} live={live} />}
      >
        <RegionScene tick={tick} cfg={cfg} playing={playing} reduced={reduced} live={live} />
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
          <Term k="application-load-balancer">Load balancer</Term>
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
            Order saved in the <Term k="rds">orders database</Term>: primary and <Term k="rds-standby">standby copy</Term>,
            later module
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
