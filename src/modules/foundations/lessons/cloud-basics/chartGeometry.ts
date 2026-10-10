import { CHART_MAX, DAYS } from './capacityModel'

/* Capacity chart geometry, in SVG user units. The SVG scales to its container. */
export const W = 680
export const H = 300
export const L = 50
export const R = 12
export const T = 30
export const B = 26
export const PW = W - L - R
export const PH = H - T - B

/** x position of the start of a day */
export const x = (d: number) => L + (d / DAYS) * PW
/** y position of a visitor count */
export const y = (v: number) => T + PH * (1 - Math.min(v, CHART_MAX) / CHART_MAX)

export const TICKS = [0, 4000, 8000, 12000, 16000, 20000, 24000]

/** Where the playhead sits, as a fraction of the chart width (used to keep it in view on narrow screens). */
export const playheadFraction = (day: number) => x(day + 1) / W

/** The chart never draws narrower than this many CSS pixels; below it, its box scrolls sideways. */
export const MIN_RENDER_W = 520

/**
 * Label size in SVG units for a chart box this many CSS pixels wide, so labels stay about 12px
 * on screen when the chart is drawn small (phones), and stay at 11 units on wide screens.
 */
export function labelSizeFor(boxWidth: number) {
  if (boxWidth <= 0) return 11
  const rendered = Math.max(boxWidth, MIN_RENDER_W)
  return Math.round(Math.min(16, Math.max(11, (12 * W) / rendered)) * 10) / 10
}
