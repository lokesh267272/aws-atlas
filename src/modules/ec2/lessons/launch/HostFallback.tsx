import { cn } from '../../../../lib/cn'
import { story } from '../../story'
import { SLOTS, TOTAL_UNITS, type HostStage } from './hostModel'

/* Layout in viewBox units. Sized so text stays about 12px tall on a phone. */
const RACK = { x: 16, y: 44, w: 84, h: 192 }
const SLAB_H = 28
const SLAB_YS = [52, 88, 124, 160, 196]
const STACK = { x: 124, w: 184 }
const SERVER = { y: 200, h: 30 }
const NITRO = { y: 182, h: 14 }
const BLOCK = { y: 118, h: 60, gap: 4 }
const UNIT = (STACK.w - BLOCK.gap * (TOTAL_UNITS - 1)) / TOTAL_UNITS

const blocks = (() => {
  let x = STACK.x
  return SLOTS.map((s) => {
    const w = s.units * UNIT + (s.units - 1) * BLOCK.gap
    const b = { ...s, x, w }
    x += w + BLOCK.gap
    return b
  })
})()

/** Fades and slides in when its step arrives; no motion when the device asks for less. */
const appear = 'transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none'

/**
 * The flat version of the host scene, used without WebGL. It teaches the same thing: a rack of servers, one server
 * zoomed in, the Nitro System splitting it into instances for different customers, and your rented one in its AZ.
 */
export function HostFallback({ stage, label }: { stage: HostStage; label: string }) {
  const split = stage !== 'whole'
  const rented = stage === 'rented'
  const hidden = (show: boolean, delay = 0) => ({
    opacity: show ? 1 : 0,
    transform: show ? 'none' : 'translateY(8px)',
    transitionDelay: show ? `${delay}ms` : '0ms',
  })

  return (
    <div className="p-3 sm:p-4">
      <svg viewBox="0 0 320 250" role="img" aria-label={label} className="mx-auto block h-auto w-full max-w-[440px]">
        {/* Availability Zone, shown once you rent */}
        <g className={appear} style={hidden(rented)}>
          <rect x="3" y="3" width="314" height="244" rx="3" fill="none" stroke="var(--color-az)" strokeWidth="2" strokeDasharray="6 4" />
          <rect x="3" y="3" width="112" height="20" fill="var(--color-az)" />
          <text x="10" y="17" fill="#fff" fontSize="12" fontWeight="700">
            AZ {story.azs[0]}
          </text>
        </g>

        {/* The rack */}
        <text x={RACK.x} y={RACK.y - 6} fill="var(--color-screen-dim)" fontSize="12" fontWeight="700">
          Rack
        </text>
        <rect x={RACK.x} y={RACK.y} width={RACK.w} height={RACK.h} rx="2" fill="var(--color-screen-2)" stroke="var(--color-screen-dim)" strokeOpacity="0.5" />
        {SLAB_YS.map((y, i) => {
          const isHost = i === 0
          const pulledOut = isHost && split
          return (
            <rect
              key={y}
              x={RACK.x + 6}
              y={y}
              width={RACK.w - 12}
              height={SLAB_H}
              rx="2"
              fill={pulledOut ? 'none' : 'var(--color-screen-line)'}
              stroke={isHost ? 'var(--color-screen-text)' : 'var(--color-screen-dim)'}
              strokeOpacity={isHost ? 1 : 0.6}
              strokeDasharray={pulledOut ? '4 3' : undefined}
            />
          )
        })}

        {/* Zoom line from the host slot to the enlarged server */}
        <path
          d={`M${RACK.x + RACK.w - 6} ${SLAB_YS[0] + SLAB_H / 2} L${STACK.x - 6} ${SERVER.y + SERVER.h / 2}`}
          fill="none"
          stroke="var(--color-screen-dim)"
          strokeDasharray="3 3"
        />

        {/* The host, enlarged: the physical server */}
        <rect x={STACK.x} y={SERVER.y} width={STACK.w} height={SERVER.h} rx="2" fill="var(--color-screen-line)" stroke="var(--color-screen-text)" />
        <text x={STACK.x + STACK.w / 2} y={SERVER.y + 19} textAnchor="middle" fill="var(--color-screen-text)" fontSize="12" fontWeight="700">
          Physical server
        </text>

        {/* The Nitro System layer */}
        <g className={appear} style={hidden(split)}>
          <rect x={STACK.x} y={NITRO.y} width={STACK.w} height={NITRO.h} rx="2" fill="var(--color-screen-text)" />
          <text x={STACK.x + STACK.w / 2} y={NITRO.y + 11} textAnchor="middle" fill="var(--color-screen)" fontSize="11" fontWeight="700">
            Nitro System
          </text>
        </g>

        {/* Instances on top, one per customer */}
        <g className={appear} style={hidden(split, 200)}>
          <text x={STACK.x} y={BLOCK.y - 8} fill="var(--color-screen-dim)" fontSize="12" fontWeight="700">
            Instances
          </text>
          {blocks.map((b) => {
            const yours = b.owner === 'you'
            const fill = yours ? (rented ? 'var(--color-compute)' : 'none') : 'var(--color-screen-dim)'
            return (
              <g key={b.id}>
                <rect
                  x={b.x}
                  y={BLOCK.y}
                  width={b.w}
                  height={BLOCK.h}
                  rx="2"
                  fill={fill}
                  stroke={yours && !rented ? 'var(--color-screen-dim)' : 'var(--color-screen-text)'}
                  strokeDasharray={yours && !rented ? '4 3' : undefined}
                  className={cn(yours && 'transition-[fill] duration-500 motion-reduce:transition-none')}
                />
                <text
                  x={b.x + b.w / 2}
                  y={BLOCK.y + BLOCK.h / 2 + 4}
                  textAnchor="middle"
                  fill={yours && !rented ? 'var(--color-screen-dim)' : 'var(--color-screen)'}
                  fontSize="12"
                  fontWeight="700"
                >
                  {yours ? (rented ? 'You' : 'Free') : b.label}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
