import type { CSSProperties } from 'react'
import type { Pay } from './scaleModel'

/**
 * Hex values of the design tokens, for three.js (it cannot read CSS variables).
 * Server colours follow lesson 5's chart: Savings Plan solid orange, On-Demand pale orange, Spot pale amber with an amber band.
 */
export const HEX = {
  screen: '#13202b',
  screen2: '#1c2c39',
  line: '#2e4352',
  dim: '#8fa6b6',
  text: '#d6e2ea',
  accent: '#5fb3e6',
  region: '#00a4a6',
  az: '#147eba',
  compute: '#ed7100',
  /** The compute orange at about a third strength on white, as lesson 5 draws On-Demand. */
  computeTint: '#f9c9a1',
  networking: '#8c4fff',
  database: '#c925d1',
  warn: '#9a5f00',
  warnSoft: '#fbefd6',
  bad: '#c0352b',
  lineStrong: '#9aaab6',
}

export const PAY_NAME: Record<Pay, string> = {
  'savings-plan': 'Savings Plan',
  'on-demand': 'On-Demand',
  spot: 'Spot',
}

/** CSS look of a server square in the flat view and the legend. Spot is hatched, as in lesson 5. */
export function payStyle(pay: Pay, booting = false): CSSProperties {
  const base: CSSProperties =
    pay === 'savings-plan'
      ? { background: 'var(--color-compute)', borderColor: 'var(--color-compute)' }
      : pay === 'on-demand'
        ? { background: HEX.computeTint, borderColor: 'var(--color-compute)' }
        : {
            background:
              'repeating-linear-gradient(45deg, var(--color-warn) 0 1.5px, var(--color-warn-soft) 1.5px 4.5px)',
            borderColor: 'var(--color-warn)',
          }
  return booting ? { ...base, background: 'transparent', borderStyle: 'dashed' } : base
}
