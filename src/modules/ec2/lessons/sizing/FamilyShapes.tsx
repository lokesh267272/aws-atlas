import { useState, type ReactNode } from 'react'
import { Bench } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { ChipStack, GROUND } from './ChipStack'
import type { Family } from './sizingModel'

const label = (x: number, text: string) => (
  <text x={x} y={127} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--color-ink-2)" fontFamily="var(--font-mono)">
    {text}
  </text>
)

/* ----------------------------------------------------------- The families */

type ShapeId = 't' | 'm' | 'c' | 'rx' | 'i' | 'gp'

interface FamilyInfo {
  id: ShapeId
  letters: string
  name: string
  category: Family
  /** Shown under the shape: the one thing that sets it apart. */
  tag: string
  /** What the shape means, in one line. */
  line: ReactNode
  goodFor: string
  draw: ReactNode
}

const FAMILIES: FamilyInfo[] = [
  {
    id: 't',
    letters: 't',
    name: 'General purpose, burstable',
    category: 'general',
    tag: 'burstable',
    line: 'Low steady CPU that can burst higher: cheap for quiet servers.',
    goodFor: 'small websites, test servers, dev tools',
    draw: <ChipStack x={38} width={24} sticks={4} small />,
  },
  {
    id: 'm',
    letters: 'm',
    name: 'General purpose',
    category: 'general',
    tag: '4 GiB per vCPU',
    line: 'A balance of CPU and memory: 4 GiB for each vCPU.',
    goodFor: 'web and app servers, mid-size databases',
    draw: <ChipStack x={34} sticks={4} />,
  },
  {
    id: 'c',
    letters: 'c',
    name: 'Compute optimized',
    category: 'compute',
    tag: '2 GiB per vCPU',
    line: 'More CPU for each GiB of memory: 2 GiB for each vCPU.',
    goodFor: 'batch jobs, video encoding, game servers',
    draw: <ChipStack x={34} sticks={2} />,
  },
  {
    id: 'rx',
    letters: 'r x',
    name: 'Memory optimized',
    category: 'memory',
    tag: '8+ GiB per vCPU',
    line: 'More memory for each vCPU: 8 GiB on r, about 16 to 32 GiB on x.',
    goodFor: 'databases, in-memory caches, real-time analytics',
    draw: (
      <>
        <ChipStack x={14} width={28} sticks={8} />
        <ChipStack x={58} width={28} sticks={16} />
        {label(28, 'r')}
        {label(72, 'x')}
      </>
    ),
  },
  {
    id: 'i',
    letters: 'i',
    name: 'Storage optimized',
    category: 'storage',
    tag: '+ local disks',
    line: 'Fast disks inside the host machine, for lots of reading and writing.',
    goodFor: 'NoSQL databases, search engines, data warehouses',
    draw: (
      <>
        <ChipStack x={12} width={28} sticks={8} />
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <rect
              x={52}
              y={GROUND - 10 - k * 12}
              width={38}
              height={10}
              rx={5}
              fill="var(--color-sunken)"
              stroke="var(--color-ink-2)"
              strokeWidth={1.5}
            />
            <circle cx={83} cy={GROUND - 5 - k * 12} r={1.6} fill="var(--color-ink-2)" />
          </g>
        ))}
        {label(71, 'disks')}
      </>
    ),
  },
  {
    id: 'gp',
    letters: 'g p',
    name: 'Accelerated computing',
    category: 'accelerated',
    tag: '+ GPUs',
    line: (
      <>
        Adds accelerators: <Term k="gpu">GPUs</Term> on g and p.
      </>
    ),
    goodFor: 'machine learning, 3D graphics, video rendering',
    draw: (
      <>
        <ChipStack x={10} width={28} sticks={0} />
        <rect x={48} y={GROUND - 42} width={42} height={42} rx={3} fill="var(--color-sunken)" stroke="var(--color-ink-2)" strokeWidth={1.5} />
        {Array.from({ length: 16 }, (_, k) => (
          <rect key={k} x={53 + (k % 4) * 8.5} y={GROUND - 37 + Math.floor(k / 4) * 8.5} width={6} height={6} rx={1} fill="var(--color-ink-3)" />
        ))}
        {label(69, 'GPU')}
      </>
    ),
  },
]

const categoryWord: Record<Family, string> = {
  general: 'general purpose',
  compute: 'compute optimized',
  memory: 'memory optimized',
  storage: 'storage optimized',
  accelerated: 'accelerated computing',
}

/* -------------------------------------------------------------- The bench */

/** The instance families drawn as shapes: the stack's height shows memory per vCPU, extra parts show special hardware. */
export function FamilyShapes() {
  const [selected, setSelected] = useState<ShapeId>('m')
  const info = FAMILIES.find((f) => f.id === selected) ?? FAMILIES[1]

  return (
    <Bench
      title="Try it: compare family shapes"
      intro={
        <>
          Tap a family: taller stacks have more memory for each <Term k="vcpu">vCPU</Term>, and extra parts mean special
          hardware.
        </>
      }
    >
      <div role="group" aria-label="Instance families" className="grid grid-cols-3 gap-2 md:grid-cols-6">
        {FAMILIES.map((f) => {
          const on = f.id === selected
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              aria-label={`${f.letters}, ${f.tag}, ${categoryWord[f.category]}`}
              onClick={() => setSelected(f.id)}
              className={cn(
                'flex min-w-0 flex-col items-center rounded-md border px-1 pt-2 pb-2 transition-colors',
                on ? 'border-signal bg-signal-soft' : 'border-line bg-panel hover:border-ink',
              )}
            >
              <svg viewBox="0 0 100 132" aria-hidden className="h-auto w-full max-w-[6.5rem]">
                <line x1={4} x2={96} y1={GROUND + 0.5} y2={GROUND + 0.5} stroke="var(--color-line)" />
                {f.draw}
              </svg>
              <span className="font-mono text-lg font-bold leading-tight text-ink">{f.letters}</span>
              <span className="text-center text-xs leading-tight text-ink-3">{f.tag}</span>
            </button>
          )
        })}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-2.5 w-5 rounded-[2px] bg-ink" />
          CPU chip
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-1 w-5 rounded-[1px] bg-ink-3" />
          1 <Term k="gib">GiB</Term> of memory for each vCPU
        </span>
      </p>

      <div aria-live="polite" className="mt-4 rounded-md border border-line bg-paper px-4 py-3">
        <p className="font-bold text-ink">
          <span className="font-mono">{info.letters}</span>: {info.name}
        </p>
        <p className="mt-0.5 text-ink-2">{info.line}</p>
        <p className="mt-1 text-sm text-ink-3">Good for: {info.goodFor}</p>
      </div>
    </Bench>
  )
}
