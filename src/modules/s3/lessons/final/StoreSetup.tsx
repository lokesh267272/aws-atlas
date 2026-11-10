import { useId, type ReactNode } from 'react'
import { Camera, DatabaseBackup, FileChartColumn, Image, Receipt, type LucideIcon } from 'lucide-react'
import { Pill, Segmented, Switch } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { CLASSES, classById, type ClassId } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, type PrefixId } from '../../story'
import { RECEIPT_LINK } from '../access/accessModel'
import { emptyRule, ruleProblems, type Rule, type Step } from '../lifecycle/lifecycleModel'
import { PROBLEM_LABELS } from '../lifecycle/RuleBuilder'
import { shortName } from '../lifecycle/format'
import type { StoreConfig } from './finalModel'

/* ---------------------------------------------------------------- Choices */

/** Day choices for a move, an expiry and old-version clean-up (a select each: no typing needed). */
const MOVE_DAYS = [30, 60, 90, 180, 365, 730]
const EXPIRE_DAYS = [30, 90, 365, 1095, 1825, 2555]
const OLD_VERSION_DAYS = [1, 30, 365]

const dayWords = (d: number) => {
  if (d % 365 === 0) return d === 365 ? '1 year' : `${d / 365} years`
  return d === 1 ? '1 day' : `${d} days`
}
/** Keeps a value that isn't one of the choices (e.g. from Show me) selectable. */
const withValue = (choices: number[], v: number | null) => (v === null || choices.includes(v) ? choices : [...choices, v].sort((a, b) => a - b))

const ROWS: Record<PrefixId, { icon: LucideIcon; use: string }> = {
  menu: { icon: Image, use: 'Read all day; only a photo shoot can replace them' },
  receipts: { icon: Receipt, use: 'Downloaded now and then; the accountant wants 7 years' },
  delivery: { icon: Camera, use: 'Needed for 30 days if a customer complains' },
  backups: { icon: DatabaseBackup, use: 'Needed fast after a crash; keep 30 days' },
  reports: { icon: FileChartColumn, use: 'Opened now and then; can be re-made' },
}

const selectClass =
  'h-9 min-w-0 max-w-full rounded-md border border-line-strong bg-panel px-1.5 text-sm text-ink hover:border-ink focus-visible:outline-2 focus-visible:outline-signal disabled:opacity-45'

/* ------------------------------------------------------------------ Parts */

/** A titled panel. The title may hold glossary terms, so it is a heading, never a label. */
function Panel({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('min-w-0 rounded-md border border-line bg-paper/60 p-3', className)}>
      <h4 id={id} className="text-sm font-bold text-ink">
        {title}
      </h4>
      <div className="mt-2 grid gap-2.5">{children}</div>
    </section>
  )
}

const note = 'text-xs text-ink-3'

/* ----------------------------------------------------------------- Access */

function AccessPanel({ c, set }: { c: StoreConfig; set: (next: Partial<StoreConfig>) => void }) {
  const a = c.access
  const update = (patch: Partial<StoreConfig['access']>) => set({ access: { ...a, ...patch } })
  return (
    <Panel title="Who gets in">
      <div>
        <Switch label="Block all public access" checked={a.blockPublicAccess} onChange={(v) => update({ blockPublicAccess: v })} />
        <p className={cn(note, 'mt-1')}>
          <Term k="block-public-access">Block Public Access</Term> is on for every new bucket
        </p>
      </div>
      <div>
        <Switch label="Make public" checked={a.publicRead} onChange={(v) => update({ publicRead: v })} />
        <p className={cn(note, 'mt-1')}>
          {a.publicRead && a.blockPublicAccess ? (
            <span className="font-bold text-warn">Ignored while Block Public Access is on</span>
          ) : (
            <>
              A <Term k="bucket-policy">bucket policy</Term> letting anyone read and list every file
            </>
          )}
        </p>
      </div>
      <div className="border-t border-line pt-2">
        <p className="text-xs font-bold text-ink-2">
          Server <Term k="iam-role">role</Term> may read
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
          <Switch label="Read menu/" checked={a.roleRead.menu} onChange={(v) => update({ roleRead: { ...a.roleRead, menu: v } })} />
          <Switch label="Read receipts/" checked={a.roleRead.receipts} onChange={(v) => update({ roleRead: { ...a.roleRead, receipts: v } })} />
        </div>
      </div>
      <div>
        <Switch
          label="Servers sign receipt links"
          checked={a.link !== null}
          onChange={(v) => update({ link: v ? { ...RECEIPT_LINK } : null })}
        />
        <p className={cn(note, 'mt-1')}>
          A <Term k="presigned-url">presigned link</Term> for one customer&apos;s receipt, signed with the role, lasts{' '}
          {RECEIPT_LINK.minutes / 60} hour
        </p>
      </div>
    </Panel>
  )
}

/* ------------------------------------------------------------- Versioning */

function VersioningPanel({ c, set }: { c: StoreConfig; set: (next: Partial<StoreConfig>) => void }) {
  return (
    <Panel title={<Term k="versioning">Versioning</Term>}>
      <Segmented
        label="Versioning"
        size="sm"
        className="[&>legend]:sr-only"
        value={c.versioning}
        options={[
          { value: 'off', label: 'Off', description: 'the default for a new bucket' },
          { value: 'on', label: 'On', description: 'keep every old version' },
        ]}
        onChange={(v) => set({ versioning: v })}
      />
      <p className={note}>
        Off is the default. On keeps every old version, and you pay for each one; once on, a real bucket can only be
        suspended.
      </p>
    </Panel>
  )
}

/* ------------------------------------------------------------ File cards */

/**
 * One move slot: a shelf (or "No move") and a day. The second slot works only once the first is set.
 * Choosing "No move" in the first slot clears both. Arrowing through a closed select only changes values in place.
 */
function MoveSlot({
  prefix,
  index,
  rule,
  onRule,
}: {
  prefix: string
  index: 0 | 1
  rule: Rule
  onRule: (r: Rule) => void
}) {
  const step = rule.transitions[index]
  const prev = index === 1 ? rule.transitions[0] : undefined
  const blocked = index === 1 && !prev
  /** A sensible first day: 30 for the first move; for the second, after the first shelf's minimum stay. */
  const defaultDay = () => {
    if (!prev) return MOVE_DAYS[0]
    const earliest = prev.afterDays + Math.max(1, classById(prev.to).minDays)
    return MOVE_DAYS.find((d) => d >= earliest) ?? earliest
  }
  const setShelf = (v: string) => {
    if (v === '') return onRule({ ...rule, transitions: rule.transitions.slice(0, index) })
    const next: Step = { afterDays: step?.afterDays ?? defaultDay(), to: v as ClassId }
    onRule({ ...rule, transitions: [...rule.transitions.slice(0, index), next, ...rule.transitions.slice(index + 1)] })
  }
  const setDays = (d: number) =>
    step && onRule({ ...rule, transitions: rule.transitions.map((t, k) => (k === index ? { ...t, afterDays: d } : t)) })

  return (
    <li className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2', blocked && 'opacity-60')}>
      <span>{index === 0 ? 'Move to' : 'Then to'}</span>
      <select
        className={selectClass}
        aria-label={`${prefix} move ${index + 1}: to which shelf`}
        value={step?.to ?? ''}
        disabled={blocked}
        onChange={(e) => setShelf(e.target.value)}
      >
        <option value="">No move</option>
        {CLASSES.map((cl) => (
          <option key={cl.id} value={cl.id}>
            {shortName(cl.id)}
          </option>
        ))}
      </select>
      <span>after</span>
      <select
        className={selectClass}
        aria-label={`${prefix} move ${index + 1}: after how many days`}
        value={step?.afterDays ?? ''}
        disabled={!step}
        onChange={(e) => setDays(Number(e.target.value))}
      >
        {!step && <option value="">–</option>}
        {withValue(MOVE_DAYS, step?.afterDays ?? null).map((d) => (
          <option key={d} value={d}>
            {dayWords(d)}
          </option>
        ))}
      </select>
    </li>
  )
}

function FileCard({
  id,
  shelf,
  rule,
  onShelf,
  onRule,
}: {
  id: PrefixId
  shelf: ClassId
  rule: Rule
  onShelf: (c: ClassId) => void
  onRule: (r: Rule) => void
}) {
  const ft = FILE_TYPES[id]
  const { icon: Icon, use } = ROWS[id]
  const uid = useId()
  const problems = ruleProblems(rule, shelf)
  const menu = id === 'menu'

  return (
    <li className="min-w-0 rounded-md border border-line bg-panel p-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-bold text-ink">
        <Icon aria-hidden className="size-4 shrink-0 text-ink-2" />
        <code className="rounded bg-sunken px-1.5 py-0.5 text-sm">{ft.prefix}</code>
        <span>{ft.label}</span>
      </p>
      <p className="mt-0.5 text-xs text-ink-3">{use}</p>

      <div className="mt-2.5">
        <label htmlFor={`${uid}-shelf`} className="text-xs font-bold text-ink-2">
          Uploaded to<span className="sr-only"> (shelf for {ft.label.toLowerCase()})</span>
        </label>
        <select
          id={`${uid}-shelf`}
          className={cn(selectClass, 'mt-1 h-10 w-full')}
          value={shelf}
          onChange={(e) => onShelf(e.target.value as ClassId)}
        >
          {CLASSES.map((cl) => (
            <option key={cl.id} value={cl.id}>
              {cl.name}
            </option>
          ))}
        </select>
        {classById(shelf).azs === 1 && <p className="mt-1 text-xs font-bold text-warn">Stored in one AZ only</p>}
      </div>

      <div className="mt-3 grid gap-2 border-t border-line pt-2.5">
        {menu ? (
          <p className={note}>Read all day, so they stay on their shelf; only old versions can be cleaned up.</p>
        ) : (
          <div>
            <p className="text-xs font-bold text-ink-2">
              <Term k="transition-action">Moves</Term>
            </p>
            <ol className="mt-1 grid gap-1.5">
              <MoveSlot prefix={ft.prefix} index={0} rule={rule} onRule={onRule} />
              <MoveSlot prefix={ft.prefix} index={1} rule={rule} onRule={onRule} />
            </ol>
          </div>
        )}

        {!menu && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
            <span>
              <Term k="expiration-action">Expire</Term> after
            </span>
            <select
              className={selectClass}
              aria-label={`${ft.prefix}: expire after`}
              value={rule.expireAfterDays ?? ''}
              onChange={(e) => onRule({ ...rule, expireAfterDays: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">Never</option>
              {withValue(EXPIRE_DAYS, rule.expireAfterDays).map((d) => (
                <option key={d} value={d}>
                  {dayWords(d)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
          <span>
            Delete <Term k="noncurrent-version">old versions</Term> after
          </span>
          <select
            className={selectClass}
            aria-label={`${ft.prefix}: delete old versions after`}
            value={rule.noncurrentExpireAfterDays ?? ''}
            onChange={(e) => onRule({ ...rule, noncurrentExpireAfterDays: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">Never</option>
            {withValue(OLD_VERSION_DAYS, rule.noncurrentExpireAfterDays).map((d) => (
              <option key={d} value={d}>
                {dayWords(d)}
              </option>
            ))}
          </select>
        </div>

        {problems.length > 0 && (
          <ul className="grid gap-1" aria-label={`Problems with the ${ft.prefix} rule`}>
            <li>
              <Pill tone="bad">S3 would reject this rule, so the year runs without it</Pill>
            </li>
            {problems.map((p) => (
              <li key={p} className="text-sm text-bad">
                {PROBLEM_LABELS[p]}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/* ------------------------------------------------------------------ Setup */

/**
 * Every setting for Mealhop's bucket: who gets in, versioning, and for each kind of file its shelf and
 * lifecycle rule. Panels sit side by side on wide screens and stack on a phone.
 */
export function StoreSetup({ config: c, onChange }: { config: StoreConfig; onChange: (c: StoreConfig) => void }) {
  const set = (next: Partial<StoreConfig>) => onChange({ ...c, ...next })
  const ruleFor = (p: PrefixId) => c.rules.find((r) => r.prefix === p) ?? emptyRule(p)
  const setRule = (r: Rule) =>
    set({ rules: c.rules.some((x) => x.prefix === r.prefix) ? c.rules.map((x) => (x.prefix === r.prefix ? r : x)) : [...c.rules, r] })

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[3fr_2fr]">
        <AccessPanel c={c} set={set} />
        <VersioningPanel c={c} set={set} />
      </div>
      <Panel
        title={
          <>
            Each kind of file: its <Term k="storage-class">storage class</Term> and <Term k="lifecycle-rule">lifecycle rule</Term>
          </>
        }
      >
        <ul className="grid gap-3 lg:grid-cols-2">
          {PREFIX_IDS.map((p) => (
            <FileCard
              key={p}
              id={p}
              shelf={c.placement[p]}
              rule={ruleFor(p)}
              onShelf={(cls) => set({ placement: { ...c.placement, [p]: cls } })}
              onRule={setRule}
            />
          ))}
        </ul>
      </Panel>
    </div>
  )
}
