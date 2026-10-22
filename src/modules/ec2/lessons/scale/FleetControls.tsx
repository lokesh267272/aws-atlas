import { ServerCrash, UtensilsCrossed, ZapOff } from 'lucide-react'
import { Segmented, Slider } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import type { FleetConfig, FleetEvent } from './scaleModel'

/** Small buttons styled for the dark "screen" panel (as in lesson 1). */
export const darkButton =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-screen-line bg-screen-2 px-3 text-sm font-bold text-screen-text transition-colors hover:border-screen-dim hover:text-white aria-disabled:cursor-default aria-disabled:opacity-45 aria-disabled:hover:border-screen-line aria-disabled:hover:text-screen-text focus-visible:outline-screen-accent [&_svg]:size-4'

export type Knobs = Pick<FleetConfig, 'azCount' | 'min' | 'max' | 'targetCpu'>

/** Keeps min at or below max: moving one past the other pushes the other along. */
export function withLimits(cfg: FleetConfig, next: Partial<Knobs>): FleetConfig {
  const out = { ...cfg, ...next }
  if (next.min !== undefined && out.max < out.min) out.max = out.min
  if (next.max !== undefined && out.min > out.max) out.min = out.max
  return out
}

export const MIN_RANGE = { min: 1, max: 6 }
export const MAX_RANGE = { min: 1, max: 12 }

const AZ_OPTIONS = [
  { value: '1', label: '1 AZ' },
  { value: '2', label: '2 AZs' },
  { value: '3', label: '3 AZs' },
] as const

/** The event buttons: each makes something happen to the fleet, now. Dark, to sit right under the stage. */
export function EventButtons({
  onEvent,
  canCrash,
  canAzDown,
}: {
  onEvent: (kind: FleetEvent['kind']) => void
  canCrash: boolean
  canAzDown: boolean
}) {
  return (
    <div role="group" aria-label="Make something happen" className="flex flex-wrap gap-2">
      <button type="button" className={darkButton} onClick={() => onEvent('rush')}>
        <UtensilsCrossed aria-hidden />
        Lunch rush
      </button>
      <button type="button" className={darkButton} aria-disabled={!canCrash} onClick={() => canCrash && onEvent('instance-crash')}>
        <ServerCrash aria-hidden />
        Crash an instance
      </button>
      <button type="button" className={darkButton} aria-disabled={!canAzDown} onClick={() => canAzDown && onEvent('az-down')}>
        <ZapOff aria-hidden />
        Take an AZ down
      </button>
    </div>
  )
}

/** The Auto Scaling group's knobs: how many AZs it spans, min and max servers, and the target-tracking CPU target. */
export function FleetControls({ cfg, onChange }: { cfg: FleetConfig; onChange: (next: Partial<Knobs>) => void }) {
  return (
    <div className="grid min-w-0 gap-4">
      <h4 className="text-sm font-bold text-ink">
        <Term k="auto-scaling-group">Auto Scaling group</Term>
      </h4>
      <Segmented
        label="AZs the group spans"
        size="sm"
        value={String(cfg.azCount) as (typeof AZ_OPTIONS)[number]['value']}
        options={AZ_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onChange={(v) => onChange({ azCount: Number(v) as FleetConfig['azCount'] })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Slider
          label="Min servers"
          value={cfg.min}
          min={MIN_RANGE.min}
          max={MIN_RANGE.max}
          onChange={(v) => onChange({ min: v })}
        />
        <Slider
          label="Max servers"
          value={cfg.max}
          min={MAX_RANGE.min}
          max={MAX_RANGE.max}
          onChange={(v) => onChange({ max: v })}
        />
      </div>
      <div className="min-w-0">
        <Slider
          label="Keep average CPU near"
          value={cfg.targetCpu}
          min={30}
          max={80}
          step={10}
          format={(v) => `${v}%`}
          onChange={(v) => onChange({ targetCpu: v })}
        />
        <p className="mt-1 text-xs text-ink-3">
          A <Term k="target-tracking">target tracking</Term> policy: lower means more spare servers
        </p>
      </div>
    </div>
  )
}
