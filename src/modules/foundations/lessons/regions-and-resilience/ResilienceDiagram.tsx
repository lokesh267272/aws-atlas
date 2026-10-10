import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CloudOff, Server, Split, Users, Waypoints, ZapOff } from 'lucide-react'
import { Pill } from '../../../../components/controls'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import { cn } from '../../../../lib/cn'
import {
  edgePath,
  edgesFor,
  nodesFor,
  pointAt,
  polyLength,
  routePoints,
  type Anchors,
} from './diagramGeometry'
import { PRIMARY, STANDBY } from './messages'
import { TIMING, type Arch, type NodeId, type Req } from './resilienceSim'

/** Everything the static part of the diagram needs. All primitives, so memo works. */
export interface DiagramState {
  arch: Arch
  crashed: boolean
  azDown: boolean
  regionDown: boolean
  lbOutA: boolean
  lbOutB: boolean
  lbCheckingA: boolean
  dnsTarget: 'primary' | 'standby'
  dnsChecking: boolean
}

type TileStatus = 'ok' | 'down' | 'busy'
interface TileView {
  status: TileStatus
  caption: string
}

const ALL_NODES: NodeId[] = ['users', 'dns', 'lb1', 'lb2', 'a', 'b', 'c', 'd']

/** Icon square size in px for ServiceTile size="sm" (size-8) and the users tile. */
const ICON = 32
/** ServiceTile has 4px padding before the icon. */
const PAD = 4

function tileViews(s: DiagramState): Record<NodeId, TileView> {
  const hasLb = s.arch !== 'single'
  const multiRegion = s.arch === 'multi-region'
  const standbyServing = multiRegion && s.dnsTarget === 'standby'

  const aDown = s.crashed || s.azDown || s.regionDown
  const aReason = s.regionDown ? 'Region down' : s.azDown ? 'no power' : 'crashed'
  let a: TileView
  if (aDown) {
    // Kept short so it fits a narrow AZ box; the load balancer caption says Server A still gets requests.
    a = { status: 'down', caption: aReason }
  } else if (hasLb && s.lbOutA) {
    a = { status: 'busy', caption: 'repaired, being checked' }
  } else {
    a = { status: 'ok', caption: standbyServing ? 'healthy, no traffic' : 'healthy' }
  }

  const b: TileView = s.regionDown
    ? { status: 'down', caption: 'Region down' }
    : s.lbOutB
      ? { status: 'busy', caption: 'being checked' }
      : { status: 'ok', caption: standbyServing ? 'healthy, no traffic' : 'healthy' }

  const lb1: TileView = s.regionDown
    ? { status: 'down', caption: 'Region down' }
    : { status: s.lbCheckingA ? 'busy' : 'ok', caption: s.lbCheckingA ? 'Server A failing checks' : 'checks servers' }

  const standby: TileView = { status: 'ok', caption: standbyServing ? 'serving users' : 'standby, idle' }
  const dns: TileView = s.dnsChecking
    ? { status: 'busy', caption: s.dnsTarget === 'primary' ? 'primary failing checks' : 'primary passing again' }
    : { status: 'ok', caption: `answers ${s.dnsTarget === 'primary' ? PRIMARY.region : STANDBY.region}` }

  return { users: { status: 'ok', caption: '' }, dns, lb1, lb2: standby, a, b, c: standby, d: standby }
}

/* ------------------------------------------------------------- Diagram */

export function ResilienceDiagram({
  state,
  requests,
  t,
  animate,
}: {
  state: DiagramState
  requests: Req[]
  t: number
  /** False with reduced motion: no moving dots */
  animate: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nodeEls = useRef<Partial<Record<NodeId, HTMLElement | null>>>({})
  const [anchors, setAnchors] = useState<Anchors>({})

  const refs = useMemo(
    () =>
      Object.fromEntries(
        ALL_NODES.map((id) => [
          id,
          (el: HTMLElement | null) => {
            nodeEls.current[id] = el
          },
        ]),
      ) as Record<NodeId, (el: HTMLElement | null) => void>,
    [],
  )

  const measure = useCallback(() => {
    const c = containerRef.current
    if (!c) return
    const cr = c.getBoundingClientRect()
    const next: Anchors = {}
    for (const id of ALL_NODES) {
      const el = nodeEls.current[id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      const top = r.top - cr.top + (r.height - ICON) / 2
      next[id] = { x: r.left - cr.left + PAD + ICON / 2, top, bottom: top + ICON, cy: top + ICON / 2 }
    }
    setAnchors(next)
  }, [])

  useLayoutEffect(() => {
    const c = containerRef.current
    if (!c) return
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(c)
    let alive = true
    document.fonts?.ready.then(() => alive && measure()).catch(() => undefined)
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [measure])

  // Captions change tile widths, which moves centred tiles: measure again.
  const views = useMemo(() => tileViews(state), [state])
  const captionKey = ALL_NODES.map((id) => views[id].caption).join('|')
  useLayoutEffect(() => {
    measure()
  }, [measure, state.arch, captionKey])

  // On narrow screens the two-Region diagram scrolls sideways. Start it centred, so the users and
  // Route 53 (the parts to watch) are in view instead of cut off at the right edge.
  useLayoutEffect(() => {
    const sc = scrollRef.current
    if (sc && state.arch === 'multi-region') sc.scrollLeft = Math.max(0, (sc.scrollWidth - sc.clientWidth) / 2)
  }, [state.arch])

  const down: Partial<Record<NodeId, boolean>> = {
    a: state.crashed || state.azDown || state.regionDown,
    b: state.regionDown,
    lb1: state.regionDown,
  }
  const edges = edgesFor(state.arch, { a: state.lbOutA, b: state.lbOutB }, state.dnsTarget)
  const visible = new Set(nodesFor(state.arch))

  return (
    <div ref={scrollRef} className={cn(state.arch === 'multi-region' && 'overflow-x-auto pb-2')}>
      <div ref={containerRef} className={cn('relative', state.arch === 'multi-region' && 'min-w-[36rem]')}>
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          {edges.map((e) => {
            const a = anchors[e.from]
            const b = anchors[e.to]
            if (!a || !b || !visible.has(e.from) || !visible.has(e.to)) return null
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={edgePath(a, b)}
                fill="none"
                stroke={e.active ? 'var(--color-ink-2)' : 'var(--color-line-strong)'}
                strokeWidth={e.active ? 2 : 1.5}
                strokeDasharray={e.active ? undefined : '4 4'}
              />
            )
          })}
        </svg>
        <DiagramNodes state={state} views={views} refs={refs} />
        {animate && <RequestDots requests={requests} anchors={anchors} t={t} down={down} />}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- Nodes */

const DiagramNodes = memo(function DiagramNodes({
  state,
  views,
  refs,
}: {
  state: DiagramState
  views: Record<NodeId, TileView>
  refs: Record<NodeId, (el: HTMLElement | null) => void>
}) {
  const { arch } = state
  const multiRegion = arch === 'multi-region'

  return (
    <div className="relative flex flex-col items-center gap-9">
      <span ref={refs.users} className="inline-flex items-center gap-2 rounded-md bg-panel p-1 pr-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-ink text-white">
          <Users aria-hidden className="size-4" />
        </span>
        <span className="text-left">
          <span className="block text-xs font-bold leading-tight text-ink">Your users</span>
          <span className="block text-xs leading-tight text-ink-3">send requests</span>
        </span>
      </span>

      {multiRegion && (
        <span ref={refs.dns} className="inline-flex rounded-md bg-panel">
          <ServiceTile
            name="Route 53"
            category="networking"
            icon={Waypoints}
            size="sm"
            status={views.dns.status}
            caption={views.dns.caption}
          />
        </span>
      )}

      <div className={cn('grid w-full gap-4', multiRegion && 'grid-cols-2')}>
        <RegionBox
          label={`${PRIMARY.region} (${PRIMARY.place})${multiRegion ? ', primary' : ''}`}
          names={PRIMARY}
          regionDown={state.regionDown}
          azDown={state.azDown}
          lb={arch !== 'single' ? { id: 'lb1', name: multiRegion ? 'Primary load balancer' : 'Load balancer', view: views.lb1 } : null}
          left={{ id: 'a', name: 'Server A', view: views.a }}
          right={arch !== 'single' ? { id: 'b', name: 'Server B', view: views.b } : null}
          refs={refs}
        />
        {multiRegion && (
          <RegionBox
            label={`${STANDBY.region} (${STANDBY.place}), standby`}
            names={STANDBY}
            regionDown={false}
            azDown={false}
            lb={{ id: 'lb2', name: 'Standby load balancer', view: views.lb2 }}
            left={{ id: 'c', name: 'Server C', view: views.c }}
            right={{ id: 'd', name: 'Server D', view: views.d }}
            refs={refs}
          />
        )}
      </div>
    </div>
  )
})

function RegionBox({
  label,
  names,
  regionDown,
  azDown,
  lb,
  left,
  right,
  refs,
}: {
  label: string
  names: { azA: string; azB: string }
  regionDown: boolean
  azDown: boolean
  lb: { id: NodeId; name: string; view: TileView } | null
  left: { id: NodeId; name: string; view: TileView }
  right: { id: NodeId; name: string; view: TileView } | null
  refs: Record<NodeId, (el: HTMLElement | null) => void>
}) {
  return (
    <Boundary kind="region" label={<OnPanel>{label}</OnPanel>} highlighted={regionDown}>
      {regionDown && (
        <div className="mb-2 flex justify-center">
          <Pill tone="bad">
            <CloudOff aria-hidden />
            Region problem
          </Pill>
        </div>
      )}
      {lb && (
        <div className="flex justify-center">
          <span ref={refs[lb.id]} className="inline-flex rounded-md bg-panel">
            <ServiceTile
              name={lb.name}
              category="networking"
              icon={Split}
              size="sm"
              status={lb.view.status}
              caption={lb.view.caption}
            />
          </span>
        </div>
      )}
      <div className={cn('grid grid-cols-2 gap-2 sm:gap-3', lb ? 'mt-7' : 'mt-1')}>
        <AzBox short="AZ a" full={names.azA} powerCut={azDown && !regionDown} server={left} refs={refs} />
        <AzBox short="AZ b" full={names.azB} powerCut={false} server={right} refs={refs} />
      </div>
    </Boundary>
  )
}

function AzBox({
  short,
  full,
  powerCut,
  server,
  refs,
}: {
  short: string
  full: string
  powerCut: boolean
  server: { id: NodeId; name: string; view: TileView } | null
  refs: Record<NodeId, (el: HTMLElement | null) => void>
}) {
  return (
    // A container, so the label can show the full AZ name only when there is room for it.
    <div className="@container min-w-0">
      <Boundary
        kind="az"
        label={<AzLabel short={server ? short : `${short}, empty`} full={full} />}
        highlighted={powerCut}
        muted={!server}
      >
        {powerCut && (
          <div className="mb-1.5">
            <Pill tone="bad" className="max-w-full">
              <ZapOff aria-hidden />
              Power cut
            </Pill>
          </div>
        )}
        {server ? (
          <div className="flex justify-center">
            <span ref={refs[server.id]} className="inline-flex max-w-full rounded-md bg-panel">
              <ServiceTile
                name={server.name}
                category="compute"
                icon={Server}
                size="sm"
                status={server.view.status}
                caption={server.view.caption}
              />
            </span>
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-ink-3">Nothing running here</p>
        )}
      </Boundary>
    </div>
  )
}

/** Label text on a panel-coloured background, so connector lines pass behind it. */
function OnPanel({ children }: { children: ReactNode }) {
  // Negative margins stretch the background over the label's own padding.
  return <span className="-mx-1.5 bg-panel px-1.5">{children}</span>
}

/** "AZ a", plus the real AZ name (us-east-1a) when the box is wide enough to show it. */
function AzLabel({ short, full }: { short: string; full: string }) {
  return (
    <OnPanel>
      {short}
      <span className="hidden @min-[12rem]:inline"> ({full})</span>
    </OnPanel>
  )
}

/* ----------------------------------------------------------- Request dots */

/** Answer marks sit on the icon's top-left corner (the status dot is top-right), so they stay inside the tile. */
const MARK_OFFSET = 11

function RequestDots({
  requests,
  anchors,
  t,
  down,
}: {
  requests: Req[]
  anchors: Anchors
  t: number
  down: Partial<Record<NodeId, boolean>>
}) {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
      {requests.map((r) => {
        const full = routePoints(r.path, anchors)
        if (!full) return null
        if (r.ok === undefined) {
          // A request in flight travels until it reaches the first broken part, then waits there.
          const p = Math.min(1, Math.max(0, (t - r.born) / TIMING.travel))
          const brokenAt = r.path.find((n) => down[n])
          const route = brokenAt ? (routePoints(r.path, anchors, brokenAt) ?? full) : full
          const pt = pointAt(route, Math.min(p * polyLength(full), polyLength(route)))
          return <circle key={r.id} cx={pt.x} cy={pt.y} r={5} fill="var(--color-signal)" stroke="var(--color-panel)" strokeWidth={1.5} />
        }
        const stop = r.ok ? full : routePoints(r.path, anchors, r.failedAt)
        if (!stop) return null
        const end = stop[stop.length - 1]
        const fade = Math.max(0, 1 - (t - r.arriveAt) / TIMING.linger)
        if (r.ok) {
          return (
            <g key={r.id} opacity={fade} transform={`translate(${end.x - MARK_OFFSET},${end.y - MARK_OFFSET})`}>
              <circle r={7} fill="var(--color-ok)" stroke="var(--color-panel)" strokeWidth={1.5} />
              <path d="M-3.2,0.2 L-1,2.5 L3.4,-2.2" fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )
        }
        return (
          <g key={r.id} opacity={fade} transform={`translate(${end.x - MARK_OFFSET},${end.y - MARK_OFFSET})`}>
            <circle r={7} fill="var(--color-bad)" stroke="var(--color-panel)" strokeWidth={1.5} />
            <path d="M-2.8,-2.8 L2.8,2.8 M2.8,-2.8 L-2.8,2.8" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
          </g>
        )
      })}
    </svg>
  )
}
