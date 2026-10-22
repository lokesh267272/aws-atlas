/* The CPU chip + memory glyph shared by the family shapes and the name decoder. */

/** Ground line shared by every shape, so heights compare at a glance. */
export const GROUND = 114
const STICK = 4.5
const GAP = 1.5

/**
 * A CPU chip with one memory bar stacked on it for every GiB of memory per vCPU.
 * Taller stack = more memory for each vCPU. Drawn inside an SVG.
 */
export function ChipStack({
  x,
  sticks,
  width = 32,
  bottom = GROUND,
  small = false,
}: {
  x: number
  sticks: number
  width?: number
  bottom?: number
  /** Draw it smaller, for the burstable t family. */
  small?: boolean
}) {
  const chipH = small ? 10 : 14
  const stickH = small ? 2.5 : STICK
  const gap = small ? 1 : GAP
  const top = bottom - chipH
  return (
    <g>
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={f} fill="var(--color-ink-3)">
          <rect x={x - 3} y={top + chipH * f - 1} width={3} height={2} />
          <rect x={x + width} y={top + chipH * f - 1} width={3} height={2} />
        </g>
      ))}
      <rect x={x} y={top} width={width} height={chipH} rx={2} fill="var(--color-ink)" />
      {Array.from({ length: sticks }, (_, k) => (
        <rect
          key={k}
          x={x}
          y={top - (k + 1) * (stickH + gap)}
          width={width}
          height={stickH}
          rx={1}
          fill="var(--color-ink-3)"
        />
      ))}
    </g>
  )
}

