import { useState, type ReactNode } from 'react'
import { Cpu, HardDrive } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Segmented } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { ChipStack } from './ChipStack'
import { GIB_PER_VCPU, SIZES, parseTypeName, sizeSpec } from './sizingModel'

/** Real instance type names. Their vCPU and memory figures below are the real ones. */
const EXAMPLES = ['m7g.large', 'c7gd.2xlarge', 'r7a.xlarge'] as const
type Example = (typeof EXAMPLES)[number]

type Kind = 'family' | 'generation' | 'processor' | 'feature' | 'size'
interface Part {
  key: string
  kind: Kind
  text: string
}

const KIND_LABEL: Record<Kind, string> = {
  family: 'family',
  generation: 'generation',
  processor: 'processor',
  feature: 'extra',
  size: 'size',
}

const FAMILY: Record<string, { name: string; gibPerVcpu: number }> = {
  m: { name: 'general purpose: a balance of CPU and memory', gibPerVcpu: GIB_PER_VCPU.m },
  c: { name: 'compute optimized: more CPU for each GiB of memory', gibPerVcpu: GIB_PER_VCPU.c },
  r: { name: 'memory optimized: more memory for each vCPU', gibPerVcpu: GIB_PER_VCPU.r },
}

const PROCESSOR: Record<string, ReactNode> = {
  g: (
    <>
      <Term k="graviton">AWS Graviton</Term>, a chip AWS designs itself.
    </>
  ),
  a: 'AMD chip.',
  i: 'Intel chip.',
}

const FEATURE: Record<string, ReactNode> = {
  d: (
    <>
      Local disks inside the host machine (<Term k="instance-store">instance store</Term>), for fast temporary data.
    </>
  ),
}

function partsOf(name: string): Part[] {
  const p = parseTypeName(name)
  return [
    { key: 'family', kind: 'family', text: p.family },
    { key: 'generation', kind: 'generation', text: String(p.generation) },
    ...p.extras.split('').map<Part>((ch, i) => ({
      key: `extra-${i}`,
      kind: i === 0 && ch in PROCESSOR ? 'processor' : 'feature',
      text: ch,
    })),
    { key: 'size', kind: 'size', text: p.size },
  ]
}

/** An instance type name split into tappable parts. Each tap lights up what that part means. */
export function NameDecoder() {
  const [example, setExample] = useState<Example>('m7g.large')
  const [selected, setSelected] = useState('family')
  const parts = partsOf(example)
  const parsed = parseTypeName(example)
  const prefix = `${parsed.family}${parsed.generation}${parsed.extras}`
  const current = parts.find((p) => p.key === selected) ?? parts[0]
  const you = sizeSpec(parsed.family, parsed.size)

  const choose = (next: Example) => {
    setExample(next)
    if (!partsOf(next).some((p) => p.key === selected)) setSelected('family')
  }

  return (
    <Bench
      title="Try it: decode a type name"
      intro="Tap each part of the name to see what it means, then switch names and compare."
    >
      <Segmented<Example>
        label="Name"
        size="sm"
        value={example}
        onChange={choose}
        options={EXAMPLES.map((e) => ({ value: e, label: <span className="font-mono">{e}</span> }))}
      />

      <div role="group" aria-label={`Parts of ${example}`} className="mt-5 flex flex-wrap items-start gap-x-1.5 gap-y-3">
        {parts.map((p) => {
          const on = p.key === current.key
          return (
            // The dot travels with the size, so a narrow screen never leaves it alone at the end of a line.
            <span key={p.key} className="flex items-start gap-x-1.5">
              {p.kind === 'size' && (
                <span aria-hidden className="pt-1 font-mono text-2xl text-ink-3 sm:text-3xl">
                  .
                </span>
              )}
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${p.text}, ${KIND_LABEL[p.kind]}`}
                onClick={() => setSelected(p.key)}
                className="group flex flex-col items-center rounded-md"
              >
                <span
                  className={cn(
                    'rounded-md border-2 px-2.5 py-0.5 font-mono text-2xl font-bold transition-colors sm:text-3xl',
                    on ? 'border-signal bg-signal-soft text-ink' : 'border-line-strong bg-sunken text-ink group-hover:border-ink',
                  )}
                >
                  {p.text}
                </span>
                <span className={cn('mt-1 text-xs font-bold', on ? 'text-signal' : 'text-ink-3')}>{KIND_LABEL[p.kind]}</span>
              </button>
            </span>
          )
        })}
      </div>

      <p className="mt-3 text-sm text-ink-3">
        <span className="font-mono text-ink">{example}</span> gets you {you.vcpu} <Term k="vcpu">vCPU</Term> and{' '}
        {you.memoryGiB} <Term k="gib">GiB</Term> of memory.
      </p>

      <div aria-live="polite" className="mt-4 rounded-md border border-line bg-paper px-4 py-3">
        <Meaning part={current} family={parsed.family} generation={parsed.generation} prefix={prefix} size={parsed.size} />
      </div>
    </Bench>
  )
}

function Heading({ children }: { children: ReactNode }) {
  return <p className="font-bold text-ink">{children}</p>
}

function Meaning({
  part,
  family,
  generation,
  prefix,
  size,
}: {
  part: Part
  family: string
  generation: number
  prefix: string
  size: string
}) {
  switch (part.kind) {
    case 'family': {
      const f = FAMILY[family]
      return (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 60 80" aria-hidden className="h-20 w-auto shrink-0">
            <line x1={2} x2={58} y1={74.5} y2={74.5} stroke="var(--color-line)" />
            <ChipStack x={16} sticks={f.gibPerVcpu} bottom={74} width={28} />
          </svg>
          <div>
            <Heading>
              <span className="font-mono">{family}</span> = <Term k="instance-family">family</Term>
            </Heading>
            <p className="text-ink-2">
              <span className="font-mono">{family}</span> is {f.name}, {f.gibPerVcpu} GiB per vCPU.
            </p>
          </div>
        </div>
      )
    }
    case 'generation':
      return (
        <div>
          <Heading>
            <span className="font-mono">{generation}</span> = generation
          </Heading>
          <p className="text-ink-2">Higher numbers are newer hardware, usually with better value.</p>
          <div aria-hidden className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
            <span>older</span>
            {[6, 7, 8, 9].map((g) => (
              <span
                key={g}
                className={cn(
                  'grid size-7 place-items-center rounded-md border font-mono text-sm font-bold',
                  g === generation ? 'border-signal bg-signal-soft text-ink' : 'border-line bg-panel text-ink-3',
                )}
              >
                {g}
              </span>
            ))}
            <span>newer</span>
          </div>
        </div>
      )
    case 'processor':
      return (
        <div className="flex items-start gap-3">
          <Cpu aria-hidden className="mt-1 size-6 shrink-0 text-ink-2" />
          <div>
            <Heading>
              <span className="font-mono">{part.text}</span> = processor
            </Heading>
            <p className="text-ink-2">{PROCESSOR[part.text]}</p>
          </div>
        </div>
      )
    case 'feature':
      return (
        <div className="flex items-start gap-3">
          <HardDrive aria-hidden className="mt-1 size-6 shrink-0 text-ink-2" />
          <div>
            <Heading>
              <span className="font-mono">{part.text}</span> = extra feature
            </Heading>
            <p className="text-ink-2">{FEATURE[part.text] ?? 'An extra feature of this type.'}</p>
          </div>
        </div>
      )
    case 'size':
      return (
        <div>
          <Heading>
            <span className="font-mono">{size}</span> = <Term k="instance-size">size</Term>
          </Heading>
          <p className="text-ink-2">Each step up roughly doubles the vCPUs, memory and price.</p>
          <ul className="mt-2 grid gap-1">
            {SIZES.map((s, i) => {
              const sp = sizeSpec(family, s)
              const on = s === size
              return (
                <li
                  key={s}
                  className={cn(
                    'grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-2 rounded-md px-2 py-1 sm:grid-cols-[1.75rem_8.5rem_minmax(0,1fr)]',
                    on && 'bg-signal-soft',
                  )}
                >
                  <span aria-hidden className="text-xs font-bold text-ink-3">
                    {i > 0 ? '×2' : ''}
                  </span>
                  <span className={cn('font-mono text-sm', on ? 'font-bold text-ink' : 'text-ink-2')}>
                    {prefix}.{s}
                  </span>
                  <span className="col-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-start-auto">
                    <span aria-hidden className="flex gap-0.5">
                      {Array.from({ length: sp.vcpu }, (_, k) => (
                        <span key={k} className="size-2.5 rounded-[2px] bg-ink" />
                      ))}
                    </span>
                    <span className="text-xs text-ink-3">
                      {sp.vcpu} vCPU, {sp.memoryGiB} GiB
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )
  }
}
