import type { ReactNode } from 'react'
import { Building, Cloud, Globe, Lock, MapPin, Network, Radio, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { categories } from '../course/categories'
import type { Category } from '../course/types'
import { cn } from '../lib/cn'

/* --------------------------------------------------------------- Boundary */

/**
 * Containment boxes drawn the way AWS architecture diagrams draw them.
 * A Boundary must only ever mean "the things inside live in this place".
 */
export type BoundaryKind =
  | 'cloud'
  | 'global'
  | 'edge'
  | 'region'
  | 'az'
  | 'datacenter'
  | 'vpc'
  | 'subnet-public'
  | 'subnet-private'
  | 'account'
  | 'group'

const boundaryStyles: Record<
  BoundaryKind,
  { color: string; text: string; dashed: boolean; icon: LucideIcon; tint?: string }
> = {
  cloud: { color: 'var(--color-cloud)', text: 'var(--color-cloud)', dashed: false, icon: Cloud },
  global: { color: 'var(--color-line-strong)', text: 'var(--color-ink-2)', dashed: true, icon: Globe },
  edge: { color: 'var(--color-edge)', text: '#6a32d6', dashed: true, icon: Radio },
  region: { color: 'var(--color-region)', text: 'var(--color-region-ink)', dashed: true, icon: MapPin },
  az: { color: 'var(--color-az)', text: 'var(--color-az-ink)', dashed: true, icon: Building },
  datacenter: { color: 'var(--color-line-strong)', text: 'var(--color-ink-2)', dashed: false, icon: Building },
  vpc: { color: 'var(--color-vpc)', text: '#6a32d6', dashed: false, icon: Network },
  'subnet-public': { color: 'var(--color-subnet-public)', text: '#4d6a0a', dashed: false, icon: Lock, tint: 'rgba(122,161,22,0.06)' },
  'subnet-private': { color: 'var(--color-subnet-private)', text: 'var(--color-az-ink)', dashed: false, icon: Lock, tint: 'rgba(20,126,186,0.06)' },
  account: { color: 'var(--color-account)', text: '#b5105f', dashed: false, icon: Users },
  group: { color: 'var(--color-line-strong)', text: 'var(--color-ink-2)', dashed: true, icon: Building },
}

export function Boundary({
  kind,
  label,
  icon,
  children,
  className,
  muted = false,
  highlighted = false,
  onLabelClick,
  labelPressed,
  labelWrap = false,
}: {
  kind: BoundaryKind
  label: ReactNode
  /** Override the default icon for this kind */
  icon?: LucideIcon
  children?: ReactNode
  className?: string
  /** Fade it back, e.g. when it is not part of the current lesson */
  muted?: boolean
  /** Draw attention to it, e.g. the failed AZ in a simulation */
  highlighted?: boolean
  /** Makes the label a button (for "click to learn more" diagrams) */
  onLabelClick?: () => void
  labelPressed?: boolean
  /** Let a long label wrap onto more lines instead of being cut off with an ellipsis */
  labelWrap?: boolean
}) {
  const s = boundaryStyles[kind]
  const Icon = icon ?? s.icon
  const labelContent = (
    <>
      <span className="grid size-6 shrink-0 place-items-center" style={{ background: s.color }}>
        <Icon aria-hidden className="size-3.5 text-white" />
      </span>
      <span
        className={cn(
          'px-1.5 text-xs font-bold',
          labelWrap ? 'py-[3px] leading-[18px] [overflow-wrap:anywhere]' : 'truncate leading-6',
        )}
        style={{ color: s.text }}
      >
        {label}
      </span>
    </>
  )
  return (
    <div
      className={cn(
        'relative min-w-0 rounded-[3px] border-2 px-2.5 pb-2.5 transition-opacity sm:px-3 sm:pb-3',
        labelWrap ? 'pt-0' : 'pt-8',
        muted && 'opacity-45',
        highlighted && 'ring-4 ring-offset-2 ring-offset-panel',
        className,
      )}
      style={{
        borderColor: s.color,
        borderStyle: s.dashed ? 'dashed' : 'solid',
        background: s.tint,
        ['--tw-ring-color' as string]: highlighted ? s.color : undefined,
      }}
    >
      {onLabelClick ? (
        <button
          type="button"
          onClick={onLabelClick}
          aria-pressed={labelPressed}
          className={cn(
            labelPosition(labelWrap),
            'text-left hover:underline',
            labelPressed && 'underline decoration-2 underline-offset-2',
          )}
        >
          {labelContent}
        </button>
      ) : (
        <div className={labelPosition(labelWrap)}>
          {labelContent}
        </div>
      )}
      {children}
    </div>
  )
}

/** The label sits on the top-left corner. Wrapping labels stay in the flow so the box grows with them. */
function labelPosition(wrap: boolean) {
  return wrap
    ? '-ml-[calc(0.625rem+2px)] -mt-0.5 mb-2 flex max-w-[calc(100%+0.625rem)] items-start pr-1 sm:-ml-[calc(0.75rem+2px)]'
    : 'absolute -left-0.5 -top-0.5 flex max-w-[calc(100%-1rem)] items-center pr-1'
}

/* ------------------------------------------------------------ ServiceTile */

/**
 * An AWS service drawn as a coloured icon square with its name, as in
 * architecture diagrams. Colour comes from the service category.
 */
export function ServiceTile({
  name,
  category,
  icon: Icon,
  caption,
  muted = false,
  selected = false,
  status,
  onClick,
  size = 'md',
  className,
}: {
  name: string
  category: Category
  icon: LucideIcon
  /** Small text under the name, e.g. "standby copy" */
  caption?: string
  muted?: boolean
  selected?: boolean
  /** Overlay state used by simulations */
  status?: 'ok' | 'down' | 'busy'
  onClick?: () => void
  size?: 'sm' | 'md'
  className?: string
}) {
  const color = categories[category].color
  const square = size === 'sm' ? 'size-8 [&_svg]:size-4' : 'size-10 [&_svg]:size-5'
  const inner = (
    <>
      <span
        className={cn('relative grid shrink-0 place-items-center rounded-[4px] text-white', square)}
        style={{ background: status === 'down' ? 'var(--color-line-strong)' : color }}
      >
        <Icon aria-hidden />
        {status && (
          <span
            aria-hidden
            className={cn(
              'absolute -right-1 -top-1 size-3 rounded-full border-2 border-panel',
              status === 'ok' && 'bg-ok',
              status === 'down' && 'bg-bad',
              status === 'busy' && 'bg-warn',
            )}
          />
        )}
      </span>
      <span className="min-w-0 text-left">
        <span className={cn('block font-bold leading-tight', muted ? 'text-ink-3' : 'text-ink', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {name}
        </span>
        {caption && <span className="block text-xs leading-tight text-ink-3">{caption}</span>}
        {status === 'down' && <span className="sr-only"> (not working)</span>}
      </span>
    </>
  )
  const base = cn(
    'inline-flex min-w-0 items-center gap-2 rounded-md p-1 pr-2 transition-opacity',
    // Fade only the icon, so the name stays readable.
    muted && '[&>span:first-child]:opacity-40 [&>span:first-child]:grayscale',
    selected && 'bg-signal-soft outline-2 outline-signal',
    className,
  )
  if (!onClick) return <span className={base}>{inner}</span>
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={cn(base, 'hover:bg-sunken')}>
      {inner}
    </button>
  )
}
