/**
 * A small, hand-picked shortlist of real AWS Regions for the "pick the Region"
 * simulation. Names and codes come from the AWS Regions documentation.
 * Coordinates are approximate city locations: AWS does not publish the exact
 * sites of its data centers.
 */

export type RegionCode =
  | 'us-east-1'
  | 'us-west-2'
  | 'sa-east-1'
  | 'eu-west-2'
  | 'eu-central-1'
  | 'ap-northeast-1'
  | 'ap-southeast-1'
  | 'ap-southeast-2'

/**
 * Relative price group, based on on-demand prices for the same general-purpose
 * EC2 server type, checked in October 2026. Prices differ by service and change
 * over time, so the lesson only ever talks about these broad groups.
 */
export type PriceTier = 'lower' | 'middle' | 'higher'

export interface LatLon {
  lat: number
  lon: number
}

export interface RegionInfo extends LatLon {
  code: RegionCode
  /** Official long name, as in the AWS console */
  name: string
  /** Short place name used in buttons and labels */
  place: string
  country: string
  /** Inside the European Union (the UK is not, since 2020) */
  inEU: boolean
  priceTier: PriceTier
  /** One of the largest Regions, which usually get new services early */
  large: boolean
}

export const REGIONS: RegionInfo[] = [
  {
    code: 'us-east-1',
    name: 'US East (N. Virginia)',
    place: 'N. Virginia',
    country: 'United States',
    inEU: false,
    lat: 39.0,
    lon: -77.5,
    priceTier: 'lower',
    large: true,
  },
  {
    code: 'us-west-2',
    name: 'US West (Oregon)',
    place: 'Oregon',
    country: 'United States',
    inEU: false,
    lat: 45.6,
    lon: -120.5,
    priceTier: 'lower',
    large: true,
  },
  {
    code: 'sa-east-1',
    name: 'South America (São Paulo)',
    place: 'São Paulo',
    country: 'Brazil',
    inEU: false,
    lat: -23.55,
    lon: -46.63,
    priceTier: 'higher',
    large: false,
  },
  {
    code: 'eu-west-2',
    name: 'Europe (London)',
    place: 'London',
    country: 'United Kingdom',
    inEU: false,
    lat: 51.51,
    lon: -0.13,
    priceTier: 'middle',
    large: false,
  },
  {
    code: 'eu-central-1',
    name: 'Europe (Frankfurt)',
    place: 'Frankfurt',
    country: 'Germany',
    inEU: true,
    lat: 50.11,
    lon: 8.68,
    priceTier: 'middle',
    large: false,
  },
  {
    code: 'ap-northeast-1',
    name: 'Asia Pacific (Tokyo)',
    place: 'Tokyo',
    country: 'Japan',
    inEU: false,
    lat: 35.68,
    lon: 139.69,
    priceTier: 'middle',
    large: false,
  },
  {
    code: 'ap-southeast-1',
    name: 'Asia Pacific (Singapore)',
    place: 'Singapore',
    country: 'Singapore',
    inEU: false,
    lat: 1.35,
    lon: 103.82,
    priceTier: 'middle',
    large: false,
  },
  {
    code: 'ap-southeast-2',
    name: 'Asia Pacific (Sydney)',
    place: 'Sydney',
    country: 'Australia',
    inEU: false,
    lat: -33.87,
    lon: 151.21,
    priceTier: 'middle',
    large: false,
  },
]

export const regionByCode = (code: RegionCode): RegionInfo => {
  const r = REGIONS.find((x) => x.code === code)
  if (!r) throw new Error(`Unknown Region ${code}`)
  return r
}

/* ------------------------------------------------------------ Distance */

const EARTH_RADIUS_KM = 6371
const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

/** Great-circle distance: the shortest path over the Earth's surface, in km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/* -------------------------------------------------------- Latency model */

/** Light in glass fibre covers roughly 200 km every millisecond. */
export const FIBRE_KM_PER_MS = 200
/** Real cable routes are longer than a straight line over the globe. */
export const ROUTE_FACTOR = 1.5
/** A few milliseconds for routers and other equipment along the way. */
export const EQUIPMENT_MS = 5

/**
 * A rough estimate of round-trip time (there and back) in milliseconds.
 * Real numbers depend on the actual cable routes and how busy the network is.
 */
export function estimateRoundTripMs(km: number): number {
  return Math.round((2 * km * ROUTE_FACTOR) / FIBRE_KM_PER_MS + EQUIPMENT_MS)
}

/* --------------------------------------------- Great-circle arc points */

function toVec({ lat, lon }: LatLon): [number, number, number] {
  const la = toRad(lat)
  const lo = toRad(lon)
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
}

/** Points along the shortest path between a and b, for drawing an arc on a map. */
export function greatCirclePoints(a: LatLon, b: LatLon, steps = 48): LatLon[] {
  const va = toVec(a)
  const vb = toVec(b)
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))
  const omega = Math.acos(dot)
  if (omega < 1e-6) return [a, b]
  const s = Math.sin(omega)
  const pts: LatLon[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const k1 = Math.sin((1 - t) * omega) / s
    const k2 = Math.sin(t * omega) / s
    const x = k1 * va[0] + k2 * vb[0]
    const y = k1 * va[1] + k2 * vb[1]
    const z = k1 * va[2] + k2 * vb[2]
    pts.push({ lat: toDeg(Math.atan2(z, Math.hypot(x, y))), lon: toDeg(Math.atan2(y, x)) })
  }
  return pts
}
