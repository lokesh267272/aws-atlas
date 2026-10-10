import { BufferGeometry, Float32BufferAttribute, Vector3 } from 'three'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson'
import landTopology from 'world-atlas/land-110m.json'

const DEG = Math.PI / 180

/**
 * Converts latitude/longitude (degrees) to a point on a sphere.
 * Longitude 0 faces +z, east is +x, north is +y.
 */
export function latLonToVec3(lat: number, lon: number, radius = 1, target = new Vector3()): Vector3 {
  const phi = lat * DEG
  const lambda = lon * DEG
  return target.set(radius * Math.cos(phi) * Math.sin(lambda), radius * Math.sin(phi), radius * Math.cos(phi) * Math.cos(lambda))
}

/**
 * Builds the coastlines from Natural Earth (world-atlas land-110m) as one
 * LineSegments geometry: a single draw call. Long edges are split so they
 * follow the curve of the globe, and the artificial edges where the map was
 * cut at the 180° meridian are skipped.
 */
export function buildLandGeometry(radius = 1.002): BufferGeometry {
  const topo = landTopology as unknown as Topology<{ land: GeometryCollection }>
  const land = feature(topo, topo.objects.land)
  const positions: number[] = []
  const a = new Vector3()
  const b = new Vector3()

  const pushSegment = (p: Position, q: Position) => {
    const [lon1, lat1] = p
    const [lon2, lat2] = q
    // Skip seams along the antimeridian and edges that wrap around the map.
    if (Math.abs(lon1 - lon2) > 180) return
    if (Math.abs(lon1) > 179.99 && Math.abs(lon2) > 179.99) return
    if (lat1 < -89.9 && lat2 < -89.9) return
    const span = Math.max(Math.abs(lon1 - lon2), Math.abs(lat1 - lat2))
    const steps = Math.max(1, Math.ceil(span / 2))
    for (let i = 0; i < steps; i++) {
      const t0 = i / steps
      const t1 = (i + 1) / steps
      latLonToVec3(lat1 + (lat2 - lat1) * t0, lon1 + (lon2 - lon1) * t0, radius, a)
      latLonToVec3(lat1 + (lat2 - lat1) * t1, lon1 + (lon2 - lon1) * t1, radius, b)
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }

  const features: Feature[] = 'features' in land ? land.features : [land]
  for (const f of features) {
    const g = f.geometry as Polygon | MultiPolygon | null
    if (!g) continue
    const polygons = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (let i = 1; i < ring.length; i++) pushSegment(ring[i - 1], ring[i])
      }
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
}

