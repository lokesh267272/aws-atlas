import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowDown, ArrowRight, HardHat } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ServiceTile } from '../../../../components/diagram'
import { cn } from '../../../../lib/cn'

/**
 * Something that is not an AWS service (a person, a laptop, a code site, a bot).
 * Drawn in neutral grey so category colours stay reserved for AWS services.
 * tone="bad" marks a threat, always paired with words in the caption.
 */
export function ActorChip({
  name,
  caption,
  icon: Icon,
  selected = false,
  muted = false,
  tone = 'neutral',
  className,
}: {
  name: string
  caption?: string
  icon: LucideIcon
  selected?: boolean
  muted?: boolean
  tone?: 'neutral' | 'bad'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-2 rounded-md p-1 pr-2',
        selected && 'bg-signal-soft outline-2 outline-signal',
        className,
      )}
    >
      {/* Muted: only the icon fades, so the name and caption stay readable */}
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-[4px] border transition-opacity [&_svg]:size-5',
          tone === 'bad' ? 'border-bad bg-bad-soft text-bad' : 'border-line-strong bg-sunken text-ink-2',
          muted && 'opacity-40',
        )}
      >
        <Icon aria-hidden />
      </span>
      <span className="min-w-0 text-left">
        <span className={cn('block text-sm font-bold leading-tight', muted ? 'text-ink-3' : 'text-ink')}>{name}</span>
        {caption && <span className="block text-xs leading-tight text-ink-3">{caption}</span>}
      </span>
    </span>
  )
}

/** An IAM role, drawn as a security-category tile with a hard hat (the "badge you borrow"). */
export function RoleTile({
  name,
  caption = 'IAM role',
  muted,
  selected,
  size,
}: {
  name: string
  caption?: string
  muted?: boolean
  selected?: boolean
  size?: 'sm' | 'md'
}) {
  return (
    <ServiceTile
      name={name}
      caption={caption}
      category="security"
      icon={HardHat}
      muted={muted}
      selected={selected}
      size={size}
      className="max-w-full [&_.block]:wrap-anywhere"
    />
  )
}

/** A labelled arrow between two parts of a diagram. Points down on narrow screens, right on wide ones. */
export function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-1.5 py-1 text-ink-3 md:flex-col md:py-0">
      <ArrowDown aria-hidden className="size-5 md:hidden" />
      <ArrowRight aria-hidden className="hidden size-5 md:block" />
      <span className="text-xs font-bold md:max-w-36 md:text-center">{label}</span>
    </div>
  )
}

/**
 * One message travelling from one part to another during a simulation step.
 * The packet slides along the track when the step starts (skipped with reduced motion).
 */
export function Hop({
  from,
  to,
  label,
  packet,
  playKey,
  reduce,
  tone = 'neutral',
}: {
  from: string
  to: string
  label: ReactNode
  packet: LucideIcon
  /** Changing this replays the slide */
  playKey: string
  reduce: boolean
  tone?: 'neutral' | 'bad' | 'ok'
}) {
  const Packet = packet
  const packetClass =
    tone === 'bad' ? 'border-bad bg-bad-soft text-bad' : tone === 'ok' ? 'border-ok bg-ok-soft text-ok' : 'border-signal bg-signal-soft text-signal'
  return (
    <div>
      {/* Three columns that never wrap, so the arrow always points from one label to the other */}
      <div className="grid grid-cols-[minmax(0,auto)_minmax(4rem,1fr)_minmax(0,auto)] items-center gap-2 sm:gap-3">
        <span className="min-w-0 break-words text-sm font-bold text-ink">{from}</span>
        <div aria-hidden className="relative h-8 px-4">
          <div className="absolute inset-x-4 top-1/2 border-t-2 border-dashed border-line-strong" />
          <ArrowRight className="absolute right-0 top-1/2 size-4 -translate-y-1/2 text-line-strong" />
          <div className="relative h-full">
            {reduce ? (
              <span
                className={cn('absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border-2', packetClass)}
                style={{ left: '50%' }}
              >
                <Packet className="size-4" />
              </span>
            ) : (
              <motion.span
                key={playKey}
                className={cn('absolute top-1/2 grid size-7 place-items-center rounded-md border-2', packetClass)}
                initial={{ left: '0%', x: '-50%', y: '-50%' }}
                animate={{ left: '100%', x: '-50%', y: '-50%' }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              >
                <Packet className="size-4" />
              </motion.span>
            )}
          </div>
        </div>
        <span className="min-w-0 break-words text-right text-sm font-bold text-ink">{to}</span>
      </div>
      <p className="mt-1 text-sm text-ink-3">{label}</p>
    </div>
  )
}
