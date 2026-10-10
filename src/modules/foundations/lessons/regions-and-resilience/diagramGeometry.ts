import type { Arch, NodeId } from './resilienceSim'

/** Where lines attach to a tile's icon, in pixels relative to the diagram. */
export interface Anchor {
  x: number
  top: number
  bottom: number
  cy: number
}

export type Anchors = Partial<Record<NodeId, Anchor>>

export interface Point {
  x: number
  y: number
}

export interface Edge {
  from: NodeId
  to: NodeId
  /** Traffic is currently sent along this line */
  active: boolean
}

export function nodesFor(arch: Arch): NodeId[] {
  if (arch === 'single') return ['users', 'a']
  if (arch === 'multi-az') return ['users', 'lb1', 'a', 'b']
  return ['users', 'dns', 'lb1', 'a', 'b', 'lb2', 'c', 'd']
}

export function edgesFor(arch: Arch, lbOut: { a: boolean; b: boolean }, dnsTarget: 'primary' | 'standby'): Edge[] {
  if (arch === 'single') return [{ from: 'users', to: 'a', active: true }]
  const primaryActive = arch === 'multi-az' || dnsTarget === 'primary'
  const lbEdges: Edge[] = [
    { from: 'lb1', to: 'a', active: primaryActive && !lbOut.a },
    { from: 'lb1', to: 'b', active: primaryActive && !lbOut.b },
  ]
  if (arch === 'multi-az') return [{ from: 'users', to: 'lb1', active: true }, ...lbEdges]
  return [
    { from: 'users', to: 'dns', active: true },
    { from: 'dns', to: 'lb1', active: dnsTarget === 'primary' },
    { from: 'dns', to: 'lb2', active: dnsTarget === 'standby' },
    ...lbEdges,
    { from: 'lb2', to: 'c', active: dnsTarget === 'standby' },
    { from: 'lb2', to: 'd', active: dnsTarget === 'standby' },
  ]
}

/** The y where a line from `a` turns sideways towards `b`: just below the source. */
const elbowY = (a: Anchor, b: Anchor) => a.bottom + Math.min(14, Math.max(0, (b.top - a.bottom) / 2))

/** Points of an orthogonal line (down, across, down) from a to b, like an architecture diagram. */
export function hopPoints(a: Anchor, b: Anchor): Point[] {
  // Nearly in line: draw one straight line. It leaves the source tile a little off its icon,
  // which the tile's own background hides.
  if (Math.abs(a.x - b.x) < 24) return [{ x: b.x, y: a.bottom }, { x: b.x, y: b.top }]
  const y = elbowY(a, b)
  return [
    { x: a.x, y: a.bottom },
    { x: a.x, y },
    { x: b.x, y },
    { x: b.x, y: b.top },
  ]
}

export function edgePath(a: Anchor, b: Anchor): string {
  return hopPoints(a, b)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join('')
}

/**
 * The full route a request travels, through the middle of each tile on the way,
 * stopping at `stopAt` (the first broken part) if given.
 */
export function routePoints(path: NodeId[], anchors: Anchors, stopAt?: NodeId): Point[] | null {
  const pts: Point[] = []
  for (let i = 0; i < path.length - 1; i++) {
    const a = anchors[path[i]]
    const b = anchors[path[i + 1]]
    if (!a || !b) return null
    if (i > 0) pts.push({ x: a.x, y: a.cy })
    pts.push(...hopPoints(a, b))
    if (path[i + 1] === stopAt) {
      pts.push({ x: b.x, y: b.cy })
      return pts
    }
  }
  const last = anchors[path[path.length - 1]]
  if (last) pts.push({ x: last.x, y: last.cy })
  return pts
}

/** Length of a polyline. */
export function polyLength(pts: Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return len
}

/** The point at distance d along a polyline. */
export function pointAt(pts: Point[], d: number): Point {
  let left = d
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (left <= seg && seg > 0) {
      const t = left / seg
      return { x: pts[i - 1].x + t * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + t * (pts[i].y - pts[i - 1].y) }
    }
    left -= seg
  }
  return pts[pts.length - 1]
}
