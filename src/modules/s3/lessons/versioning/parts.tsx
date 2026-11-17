import { useId } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArchiveRestore, EyeOff, FileX, Image, ImageOff, Trash2 } from 'lucide-react'
import { Button, Pill } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { categories } from '../../../../course/categories'
import { cn } from '../../../../lib/cn'
import { BLANK, canSetMode, type Mode, type Version } from './versioningModel'

/* ------------------------------------------------------------ Mode control */

const MODES: { value: Mode; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'the default for a new bucket' },
  { value: 'on', label: 'On', description: 'keep every version' },
  { value: 'suspended', label: 'Suspended', description: 'stop making new versions, keep the old ones' },
]

/** Off / On / Suspended, drawn like the shared Segmented control, with Off locked once versioning has been on. */
export function ModeControl({
  mode,
  onChange,
  disabled = false,
}: {
  mode: Mode
  onChange: (m: Mode) => void
  /** Lock the whole control, e.g. while Show me plays. */
  disabled?: boolean
}) {
  const name = useId()
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-sm font-bold text-ink-2">Versioning</legend>
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-md border border-line bg-sunken p-1">
          {MODES.map((opt) => {
            const checked = opt.value === mode
            const off = disabled || !canSetMode(mode, opt.value)
            return (
              <label
                key={opt.value}
                className={cn(
                  'relative inline-flex items-center rounded-[4px] px-2.5 py-1 text-sm font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal',
                  checked ? 'bg-panel text-ink shadow-[0_1px_0_var(--color-line-strong)]' : 'text-ink-3',
                  off ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:text-ink',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={checked}
                  disabled={off}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                  aria-description={opt.description}
                />
                {opt.label}
              </label>
            )
          })}
        </div>
      </fieldset>
      <p className="text-xs text-ink-3">
        {mode === 'off' ? 'Off is the default.' : 'Once on, it can only be suspended.'}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------- Photo tile */

/** What a normal read of the file returns: the photo, a blank image, or "not found". */
export function PhotoTile({ content, size = 'md' }: { content: string | null; size?: 'sm' | 'md' }) {
  const sm = size === 'sm'
  const box = cn('grid place-items-center rounded-md border-2', sm ? 'h-16 w-full' : 'h-28 w-full')
  if (content === null) {
    return (
      <div className={cn(box, 'border-dashed border-bad bg-bad-soft/40 text-bad')}>
        <span className="flex flex-col items-center gap-1 text-xs font-bold">
          <FileX aria-hidden className={sm ? 'size-5' : 'size-7'} />
          404 Not Found
        </span>
      </div>
    )
  }
  if (content === BLANK) {
    return (
      <div className={cn(box, 'border-dashed border-line-strong bg-panel text-ink-3')}>
        <span className="flex flex-col items-center gap-1 text-xs font-bold">
          <ImageOff aria-hidden className={sm ? 'size-5' : 'size-7'} />
          {BLANK}
        </span>
      </div>
    )
  }
  return (
    <div className={cn(box, 'border-line bg-paper text-ink')}>
      <span className="flex flex-col items-center gap-1 px-2 text-center text-xs font-bold">
        <span
          className={cn('grid place-items-center rounded-[4px] text-white', sm ? 'size-7' : 'size-10')}
          style={{ background: categories.storage.color }}
        >
          <Image aria-hidden className={sm ? 'size-4' : 'size-6'} />
        </span>
        {content}
      </span>
    </div>
  )
}

/* ----------------------------------------------------------- Version stack */

/**
 * A file's versions, newest on top. The top row is the current version.
 * Restore copies an older version back on top; the trash button deletes one version for good.
 */
export function VersionStack({
  versions,
  label,
  onRestore,
  onRemoveMarker,
  onDeleteVersion,
  disabled = false,
  compact = false,
}: {
  /** Oldest first, as in the model. */
  versions: Version[]
  /** Accessible name for the list. */
  label: string
  onRestore?: (versionId: string) => void
  onRemoveMarker?: () => void
  onDeleteVersion?: (versionId: string) => void
  disabled?: boolean
  compact?: boolean
}) {
  const reduce = useReducedMotion() === true
  const rows = [...versions].reverse()
  if (rows.length === 0) {
    return <p className="rounded-md border border-dashed border-line px-3 py-2 text-xs text-ink-3">No versions: nothing is stored.</p>
  }
  return (
    <ol aria-label={label} className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {rows.map((v, i) => {
          const top = i === 0
          return (
            <motion.li
              key={`${v.versionId}:${v.deleteMarker ? 'marker' : v.content}`}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: 24 }}
              transition={{ duration: reduce ? 0 : 0.3 }}
              className={cn(
                'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border',
                compact ? 'px-1.5 py-1' : 'px-2 py-1.5',
                top ? 'border-ink bg-panel' : 'border-line bg-paper/60',
                v.deleteMarker && 'border-dashed border-bad bg-bad-soft/40',
              )}
            >
              <span
                aria-hidden
                className={cn('grid size-6 shrink-0 place-items-center rounded-[3px] text-white [&_svg]:size-3.5', v.deleteMarker && 'bg-bad')}
                style={v.deleteMarker ? undefined : { background: categories.storage.color }}
              >
                {v.deleteMarker ? <EyeOff /> : v.content === BLANK ? <ImageOff /> : <Image />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block font-bold', compact ? 'text-xs' : 'text-sm', v.deleteMarker ? 'text-bad' : top ? 'text-ink' : 'text-ink-2')}>
                  {v.deleteMarker ? 'Delete marker' : v.content}
                </span>
                <span className="block text-xs text-ink-3">
                  ID <code className="font-mono">{v.versionId}</code>
                </span>
              </span>
              {top && <Pill tone={v.deleteMarker ? 'bad' : 'neutral'}>{v.deleteMarker ? 'current: looks deleted' : 'current'}</Pill>}
              {(onRestore || onRemoveMarker || onDeleteVersion) && (
                <span className="flex flex-wrap gap-1">
                  {top && v.deleteMarker && onRemoveMarker && (
                    <Button size="sm" aria-disabled={disabled} onClick={() => !disabled && onRemoveMarker()}>
                      <Trash2 aria-hidden />
                      Remove marker
                    </Button>
                  )}
                  {!top && !v.deleteMarker && onRestore && (
                    <Button size="sm" aria-disabled={disabled} onClick={() => !disabled && onRestore(v.versionId)}>
                      <ArchiveRestore aria-hidden />
                      <span className="sr-only">{`${v.content}, version ${v.versionId}: `}</span>
                      Restore
                    </Button>
                  )}
                  {!v.deleteMarker && onDeleteVersion && (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-disabled={disabled}
                      aria-label={`Delete version ${v.versionId} for good`}
                      title="Delete this version for good"
                      onClick={() => !disabled && onDeleteVersion(v.versionId)}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  )}
                </span>
              )}
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ol>
  )
}

/** One line under a stack, naming the older rows. */
export function StackLegend() {
  return (
    <p className="text-xs text-ink-3">
      Rows under the top are <Term k="noncurrent-version">noncurrent versions</Term>: hidden from the app, still stored.
    </p>
  )
}
