/** Distance and timing helpers. No three.js here, so this stays out of the 3D bundle. */

const DEG = Math.PI / 180

/** Mean radius of the Earth in kilometres. */
export const EARTH_RADIUS_KM = 6371

/**
 * Light in glass fibre travels at roughly two-thirds of its speed in a vacuum:
 * about 200,000 km per second, or 200 km per millisecond.
 */
export const FIBRE_KM_PER_MS = 200

/** Great-circle distance between two points, in kilometres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * DEG
  const dLon = (lon2 - lon1) * DEG
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** The fastest possible there-and-back time through fibre for a straight-line distance. */
export function minRoundTripMs(km: number): number {
  return (2 * km) / FIBRE_KM_PER_MS
}

/** True when the browser can create a WebGL context. Releases the test context right away. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
