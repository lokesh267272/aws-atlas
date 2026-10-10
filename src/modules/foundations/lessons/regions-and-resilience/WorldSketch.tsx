import { useMemo } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import landJson from 'world-atlas/land-110m.json'
import { cn } from '../../../../lib/cn'
import { REGIONS, greatCirclePoints, type LatLon, type RegionCode } from './regions'
import type { Place } from './scenarios'

/*
  A flat world sketch (equirectangular projection: longitude maps straight to x,
  latitude straight to y). Land comes from the local world-atlas package.
  Labels are HTML placed on top, so they stay readable on small screens.
*/

const W = 960
const NORTH = 78
const SOUTH = -56
const SCALE = W / 360
const H = (NORTH - SOUTH) * SCALE

const projX = (lon: number) => (lon + 180) * SCALE
const projY = (lat: number) => (NORTH - lat) * SCALE

/** Turn a list of points into an SVG path, breaking the line where it wraps around the date line. */
function pathFromPoints(points: LatLon[], close: boolean): string {
  let d = ''
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    if (i === 0) {
      d += `M${projX(p.lon).toFixed(1)},${projY(p.lat).toFixed(1)}`
      continue
    }
    const prev = points[i - 1]
    const dLon = p.lon - prev.lon
    if (Math.abs(dLon) > 180) {
      // Crosses the 180° line: draw to the edge, then continue from the opposite edge.
      const edge = dLon < 0 ? 180 : -180
      const pLon = dLon < 0 ? p.lon + 360 : p.lon - 360
      const span = pLon - prev.lon
      const t = span === 0 ? 0 : (edge - prev.lon) / span
      const latAtEdge = prev.lat + t * (p.lat - prev.lat)
      d += `L${projX(edge).toFixed(1)},${projY(latAtEdge).toFixed(1)}`
      d += `M${projX(-edge).toFixed(1)},${projY(latAtEdge).toFixed(1)}`
    }
    d += `L${projX(p.lon).toFixed(1)},${projY(p.lat).toFixed(1)}`
  }
  return close ? d + 'Z' : d
}

let landPathCache: string | null = null

/** Build the land outline once and reuse it. */
function landPath(): string {
  if (landPathCache !== null) return landPathCache
  const topo = landJson as unknown as Topology
  const land = feature(topo, topo.objects.land as GeometryCollection)
  const parts: string[] = []
  for (const f of land.features) {
    const g = f.geometry
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
    for (const poly of polygons) {
      const outer = poly[0]
      // Skip Antarctica: it sits below the bottom edge of this sketch.
      if (outer.every(([, lat]) => lat < -55)) continue
      for (const ring of poly) {
        parts.push(pathFromPoints(ring.map(([lon, lat]) => ({ lon, lat })), true))
      }
    }
  }
  landPathCache = parts.join('')
  return landPathCache
}

const pct = (p: LatLon) => ({ left: `${(projX(p.lon) / W) * 100}%`, top: `${(projY(p.lat) / H) * 100}%` })

export function WorldSketch({
  users,
  otherUsers = [],
  chosen,
  ariaLabel,
}: {
  users: Place
  otherUsers?: Place[]
  chosen: RegionCode | null
  ariaLabel: string
}) {
  const land = useMemo(() => landPath(), [])
  const chosenRegion = chosen ? REGIONS.find((r) => r.code === chosen) : undefined
  const arc = useMemo(
    () => (chosenRegion ? pathFromPoints(greatCirclePoints(users, chosenRegion), false) : null),
    [users, chosenRegion],
  )

  const placements = useMemo(() => labelPlacements(users, chosenRegion), [users, chosenRegion])

  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-md border border-line bg-sunken">
        <svg viewBox={`0 0 ${W} ${H.toFixed(0)}`} className="block h-auto w-full" role="img" aria-label={ariaLabel}>
          <path d={land} fill="var(--color-line)" stroke="var(--color-line-strong)" strokeWidth={0.6} />
          {arc && (
            <path d={arc} fill="none" stroke="var(--color-signal)" strokeWidth={4} strokeLinecap="round" strokeDasharray="10 8" />
          )}
          {REGIONS.map((r) => {
            const sel = r.code === chosen
            return (
              <g key={r.code} opacity={chosen && !sel ? 0.55 : 1}>
                {sel && <circle cx={projX(r.lon)} cy={projY(r.lat)} r={19} fill="none" stroke="var(--color-region)" strokeWidth={4} />}
                <circle
                  cx={projX(r.lon)}
                  cy={projY(r.lat)}
                  r={sel ? 11 : 8}
                  fill="var(--color-region)"
                  stroke="var(--color-panel)"
                  strokeWidth={2}
                />
              </g>
            )
          })}
          {/* The users: a dark square so it differs from Region dots by shape, not only colour */}
          <rect
            x={projX(users.lon) - 10}
            y={projY(users.lat) - 10}
            width={20}
            height={20}
            rx={3}
            fill="var(--color-ink)"
            stroke="var(--color-panel)"
            strokeWidth={2}
          />
        </svg>

        {/* Labels (decorative duplicates of the aria-label above) */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {/* Other readers: HTML rings with a fixed pixel size, so they stay visible when the map shrinks on phones */}
          {otherUsers.map((p) => (
            <span
              key={p.label}
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-ink-3"
              style={pct(p)}
            />
          ))}
          <MapLabel at={users} tone="ink" placement={placements.users}>
            {users.label}
          </MapLabel>
          {chosenRegion && placements.region && (
            <MapLabel at={chosenRegion} tone="region" placement={placements.region}>
              {chosenRegion.place}
            </MapLabel>
          )}
        </div>
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 rounded-[2px] bg-ink" />
          Where most users are
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2.5 rounded-full bg-region" />
          AWS Region on the shortlist (approximate location)
        </span>
        {otherUsers.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-full border-2 border-dashed border-ink-3" />
            Other readers
          </span>
        )}
      </figcaption>
    </figure>
  )
}

type Placement = 'above' | 'below' | 'left' | 'right'

/** Place the two labels so they do not cover each other or fall off the top edge. */
function labelPlacements(users: LatLon, region: LatLon | undefined): { users: Placement; region?: Placement } {
  const uy = projY(users.lat) / H
  const userPlace: Placement = uy > 0.8 ? 'above' : 'below'
  if (!region) return { users: userPlace }
  const ry = projY(region.lat) / H
  let regionPlace: Placement = ry < 0.28 ? 'below' : 'above'
  const close = Math.abs(projX(region.lon) - projX(users.lon)) / W < 0.15 && Math.abs(ry - uy) < 0.12
  if (close && regionPlace === userPlace) {
    const flipped: Placement = userPlace === 'below' ? 'above' : 'below'
    regionPlace = flipped === 'above' && ry < 0.28 ? (region.lon < users.lon ? 'left' : 'right') : flipped
  }
  return { users: userPlace, region: regionPlace }
}

function MapLabel({
  at,
  tone,
  placement,
  children,
}: {
  at: LatLon
  tone: 'ink' | 'region'
  placement: Placement
  children: string
}) {
  const pos = pct(at)
  const x = projX(at.lon) / W
  // Keep centred labels inside the map near the left and right edges.
  const shift = x < 0.12 ? '0%' : x > 0.88 ? '-100%' : '-50%'
  const transform =
    placement === 'above'
      ? `translate(${shift}, calc(-100% - 12px))`
      : placement === 'below'
        ? `translate(${shift}, 12px)`
        : placement === 'left'
          ? 'translate(calc(-100% - 14px), -50%)'
          : 'translate(14px, -50%)'
  return (
    <span
      className={cn(
        'absolute whitespace-nowrap rounded-sm px-1.5 py-0.5 text-xs font-bold shadow-[0_1px_0_var(--color-line-strong)]',
        tone === 'ink' ? 'bg-ink text-white' : 'bg-panel text-region-ink',
      )}
      style={{ left: pos.left, top: pos.top, transform }}
    >
      {children}
    </span>
  )
}
