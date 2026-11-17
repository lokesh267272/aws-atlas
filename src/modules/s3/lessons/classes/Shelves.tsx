import { useId, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Archive, Boxes, DatabaseBackup, Store, Tag, TriangleAlert, Warehouse, type LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Pill, Readout } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { CLASSES, classById, EXAMPLE_PRICE_TAG, needsRestore, waitPhrase, type ClassId } from '../../storageClasses'
import { FILE_TYPES } from '../../story'
import { money } from './format'

/** One real-sized file: last night's database backup. */
const FILE = { key: 'backups/nightly.sql', gb: FILE_TYPES.backups.avgObjectMb / 1000 }

/** The restaurant's storage, from the front counter to the warehouse across town. */
const AREAS: { name: string; icon: LucideIcon; ids: ClassId[] }[] = [
  { name: 'Front counter', icon: Store, ids: ['standard', 'intelligent-tiering'] },
  { name: 'Back shelves', icon: Boxes, ids: ['standard-ia', 'one-zone-ia'] },
  { name: 'Basement', icon: Archive, ids: ['glacier-ir', 'glacier-flexible'] },
  { name: 'Warehouse across town', icon: Warehouse, ids: ['deep-archive'] },
]

const shortName = (id: ClassId) => classById(id).name.replace(/^S3 /, '')
const keepCost = (id: ClassId) => FILE.gb * classById(id).storePerGbMonth
const fetchCost = (id: ClassId) => FILE.gb * classById(id).fetchPerGb
const fetchText = (id: ClassId) => (fetchCost(id) === 0 ? 'No retrieval fee' : money(fetchCost(id)))
/** Bars share one scale, so keeping and fetching can be compared. */
const BAR_MAX = Math.max(...CLASSES.map((c) => Math.max(keepCost(c.id), fetchCost(c.id))))

/** Visual A: one file moved between the seven shelves. */
export function Shelves() {
  const reduce = useReducedMotion() === true
  const uid = useId()
  const [id, setId] = useState<ClassId>('standard')
  const c = classById(id)

  return (
    <Bench
      title="Try it: move a backup between shelves"
      intro={
        <>
          Move the backup to each shelf and watch its monthly cost, fetch fee, wait and{' '}
          <Term k="availability-zone">AZ</Term> count change.
        </>
      }
      onReset={() => setId('standard')}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:items-start">
        <fieldset className="min-w-0">
          <legend className="mb-1.5 text-sm font-bold text-ink-2">Where the backup sits</legend>
          <BarKey />
          <div className="mt-2 grid gap-3">
            {AREAS.map((area) => {
              const Icon = area.icon
              return (
                <div key={area.name}>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-ink-3">
                    <Icon aria-hidden className="size-3.5 shrink-0" />
                    {area.name}
                  </p>
                  <div className="grid gap-1">
                    {area.ids.map((shelf) => (
                      <Shelf
                        key={shelf}
                        id={shelf}
                        name={uid}
                        checked={shelf === id}
                        reduce={reduce}
                        onPick={() => setId(shelf)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </fieldset>

        <div className="min-w-0 rounded-md border border-line bg-paper/60 p-3 lg:sticky lg:top-20">
          <ShelfReadouts id={id} />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {`${c.name}: ${money(keepCost(id))} a month to keep, ${fetchCost(id) === 0 ? 'no retrieval fee' : `${money(fetchCost(id))} to fetch`}, ${waitPhrase(c)}, in ${
          c.azs === 1 ? 'one AZ' : 'at least 3 AZs'
        }.`}
      </p>
    </Bench>
  )
}

/** One shelf: a radio styled as a shelf, with the file on it when chosen. */
function Shelf({
  id,
  name,
  checked,
  reduce,
  onPick,
}: {
  id: ClassId
  name: string
  checked: boolean
  reduce: boolean
  onPick: () => void
}) {
  const keep = keepCost(id)
  const fetch = fetchCost(id)
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md border px-2 py-1.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal',
        checked ? 'border-signal bg-signal-soft' : 'border-line bg-panel hover:border-line-strong',
      )}
    >
      <input type="radio" name={name} value={id} checked={checked} onChange={onPick} className="sr-only" />
      <span aria-hidden className="relative grid size-8 shrink-0 place-items-end justify-items-center">
        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-line-strong" />
        {checked && (
          <motion.span
            layoutId={`${name}-file`}
            className="relative mb-0.5 grid size-6 place-items-center rounded-[4px] bg-storage text-white"
            transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
          >
            <DatabaseBackup className="size-3.5" />
          </motion.span>
        )}
      </span>
      <span className="min-w-0 flex-1 text-sm font-bold text-ink">{shortName(id)}</span>
      <span aria-hidden className="grid w-16 shrink-0 gap-1 sm:w-24">
        <span className="h-1.5 rounded-full bg-storage" style={{ width: `${Math.max(3, (keep / BAR_MAX) * 100)}%` }} />
        <span
          className={cn('h-1.5 rounded-full', fetch > 0 ? 'bg-ink-3' : 'border border-dashed border-line-strong')}
          style={{ width: fetch > 0 ? `${(fetch / BAR_MAX) * 100}%` : '100%' }}
        />
      </span>
      <span className="sr-only">
        {`: ${money(keep)} a month to keep, ${fetch === 0 ? 'no retrieval fee' : `${money(fetch)} to fetch`}`}
      </span>
    </label>
  )
}

function BarKey() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-1.5 w-4 rounded-full bg-storage" /> keep it a month
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-1.5 w-4 rounded-full bg-ink-3" /> fetch it once
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-1.5 w-4 rounded-full border border-dashed border-line-strong" /> no retrieval fee
      </span>
    </p>
  )
}

/** Three AZ squares: filled where a copy lives. */
function AzSquares({ n }: { n: 1 | 3 }) {
  return (
    <span aria-hidden className="mt-1 flex gap-1">
      {[0, 1, 2].map((i) => (
        <span key={i} className="grid size-4 place-items-center rounded-[2px] border-2 border-dashed border-az">
          {i < n && <span className="size-1.5 rounded-[1px] bg-storage" />}
        </span>
      ))}
    </span>
  )
}

/** The four numbers for the backup on one shelf, all from the shared storage-class table. */
export function ShelfReadouts({ id }: { id: ClassId }) {
  const c = classById(id)
  const it = id === 'intelligent-tiering'
  const restore = needsRestore(c)
  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-2">
        <code className="rounded bg-sunken px-1.5 py-0.5 text-xs font-bold text-ink">{FILE.key}</code>, {FILE.gb} GB, on{' '}
        <Term k={c.termKey}>{c.name}</Term>
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Readout
          label="Keep it a month"
          value={money(keepCost(id))}
          hint={it ? 'Standard price until 30 days unread, plus a tiny fee per object' : undefined}
        />
        <Readout label="Fetch it back" value={fetchText(id)} />
        <Readout
          label={restore ? 'Standard restore time' : 'Time to get it back'}
          value={<span className="text-base sm:text-lg">{c.firstByteLabel}</span>}
          tone={restore ? 'warn' : 'neutral'}
          hint={restore ? 'Ask S3 to restore it first; then it can be read.' : undefined}
        />
        <Readout
          label="AZs holding it"
          value={c.azs === 1 ? '1' : 'At least 3'}
          tone={c.azs === 1 ? 'warn' : 'neutral'}
          hint={<AzSquares n={c.azs} />}
        />
      </div>
      {it && (
        <p className="text-xs text-ink-3">S3 moves files between tiers by itself, and there is no retrieval fee.</p>
      )}
      {c.minDays > 0 && (
        <p className="text-xs text-ink-3">
          Billed for at least {c.minDays} days (<Term k="minimum-storage-duration">minimum</Term>)
        </p>
      )}
      {c.azs === 1 && (
        <p className="flex items-start gap-1.5 text-sm font-bold text-warn">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Lost if that AZ is destroyed
        </p>
      )}
      <div>
        <Pill>
          <Tag aria-hidden />
          {EXAMPLE_PRICE_TAG}
        </Pill>
      </div>
    </div>
  )
}
