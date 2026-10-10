import { Cloud, User } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { ownerRow, type Owner } from './owner'

/**
 * "You manage" or "AWS manages", with an icon. Shortened to "You" or "AWS" on small screens.
 * Same look as everywhere else in the lesson: "you" is light with a dark outline, the provider is dark.
 * The light ring keeps the dark pill visible on the dark provider row.
 */
export function OwnerBadge({ owner, providerName = 'AWS', className }: { owner: Owner; providerName?: string; className?: string }) {
  const Icon = owner === 'you' ? User : Cloud
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold',
        owner === 'you' ? 'border border-ink bg-panel text-ink' : 'bg-cloud text-white ring-1 ring-white/70',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      <span className="sm:hidden">{owner === 'you' ? 'You' : providerName}</span>
      <span className="hidden sm:inline">{owner === 'you' ? 'You manage' : `${providerName} manages`}</span>
    </span>
  )
}

/** A legend entry: a small swatch in the row style plus the words. */
export function OwnerKey({ owner, label }: { owner: Owner; label: string }) {
  const Icon = owner === 'you' ? User : Cloud
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-2">
      <span aria-hidden className={cn('grid size-6 place-items-center rounded-[4px] border-2', ownerRow[owner])}>
        <Icon className="size-3.5" />
      </span>
      {label}
    </span>
  )
}
