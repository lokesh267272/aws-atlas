import { useId, useState } from 'react'
import { ChevronRight, Plus, X } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { CLASSES, classById, type ClassId } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, RECOMMENDED_CLASSES, type PrefixId } from '../../story'
import {
  DAYS_PER_MONTH,
  SIM_MONTHS,
  canMove,
  deletesTooEarly,
  emptyRule,
  ruleEvents,
  ruleProblems,
  type Rule,
  type RuleEvent,
  type RuleProblem,
  type Step,
} from './lifecycleModel'
import { shortName, whole } from './format'

const MAX_MOVES = 3
const MAX_DAYS = 3650
/** Days the 7-year run covers (its years are 12 months of 30 days, so 2,520 days). */
const RUN_DAYS = SIM_MONTHS * DAYS_PER_MONTH

/** One line each, shown on the card when S3 would reject the rule. */
export const PROBLEM_LABELS: Record<RuleProblem, string> = {
  'not-down-the-waterfall': "S3 can't make this move: rules only move files down the shelves",
  'unsupported-move': "S3 can't move One Zone-IA files to Glacier Instant Retrieval",
  'days-not-increasing': 'Each move needs more days than the one before',
  'next-step-too-soon': "Move on only after a shelf's minimum stay (30 or 90 days)",
  'expire-before-last-move': 'Expiry must come after the last move',
}

/**
 * The days a field's text stands for, kept between `min` and the maximum.
 * null = the field is empty; undefined = not a number (yet), such as a lone "-".
 */
export function daysFromText(text: string, min: number): number | null | undefined {
  if (text.trim() === '') return null
  const n = Math.round(Number(text))
  return Number.isFinite(n) ? Math.min(MAX_DAYS, Math.max(min, n)) : undefined
}

/** How long Mealhop keeps each kind of file, in a few words. */
const KEEP: Record<PrefixId, string> = {
  menu: 'Read by the app all day, so they stay there',
  receipts: 'Keep 7 years (the accountant asks)',
  delivery: 'Needed for 30 days, then useless',
  backups: 'Needed for 30 days, then useless',
  reports: 'Keep; they can be re-made',
}

/** A whole-number days field. Optional fields can be left empty (= never). */
function DaysInput({
  value,
  onChange,
  min,
  label,
  optional = false,
}: {
  value: number | null
  onChange: (v: number | null) => void
  min: number
  /** Accessible name (the visible words sit beside the field). */
  label: string
  optional?: boolean
}) {
  // While typing, show the draft; once the field loses focus, show the stored value again.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === null ? '' : String(value))
  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={MAX_DAYS}
      step={1}
      value={shown}
      placeholder={optional ? 'never' : undefined}
      aria-label={label}
      onChange={(e) => {
        const text = e.target.value
        const days = daysFromText(text, min)
        if (days === null || days === undefined) {
          setDraft(text)
          if (days === null && optional) onChange(null)
          return
        }
        // Show the number the rule really uses: a value below the minimum (or above the maximum) never sits in the field.
        setDraft(days === Number(text) ? text : String(days))
        onChange(days)
      }}
      onBlur={() => setDraft(null)}
      className="h-9 w-20 rounded-md border border-line-strong bg-panel px-2 text-sm tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-signal"
    />
  )
}

/**
 * A sensible next move: the first shelf further down (skipping Intelligent-Tiering), 90 days after the last move.
 * 90 days covers the minimum stay of every shelf that has a shelf below it, so S3 accepts it.
 */
function nextStep(rule: Rule, start: ClassId): Step {
  const last = rule.transitions[rule.transitions.length - 1]
  const from = last?.to ?? start
  const to = CLASSES.find((c) => c.id !== 'intelligent-tiering' && canMove(from, c.id))?.id ?? 'deep-archive'
  return { afterDays: last ? last.afterDays + 90 : 30, to }
}

/** The path one month of files takes under this rule, as small chips. */
function Path({ events, rule }: { events: RuleEvent[]; rule: Rule }) {
  const hidden = events.find((e) => e.kind === 'hide')
  const deleted = events.some((e) => e.kind === 'delete')
  // Receipts kept 2,555 days (7 real years) expire after the run's 84 thirty-day months end.
  const end = events.find((e) => e.kind === 'hide' || e.kind === 'delete')
  const afterRun = end !== undefined && end.day >= RUN_DAYS
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs text-ink-2" aria-label="What happens to one month of files">
      {events.map((e, i) => (
        <li key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-ink-3" />}
          <span
            className={cn(
              'rounded border px-1.5 py-0.5',
              e.kind === 'hide' ? 'border-dashed border-line-strong' : e.kind === 'delete' ? 'border-line bg-sunken' : 'border-line',
            )}
          >
            <span className="tabular-nums text-ink-3">Day {whole(e.day)}</span>{' '}
            {e.kind === 'hide' ? 'hidden, old version' : e.kind === 'delete' ? 'deleted' : shortName(e.cls)}
          </span>
          {e.early && (
            <Pill tone="warn">
              billed {e.early.min} days on {shortName(e.early.cls)}
            </Pill>
          )}
        </li>
      ))}
      {hidden && !deleted && (
        <li className="flex items-center gap-1">
          <ChevronRight aria-hidden className="size-3.5 shrink-0 text-ink-3" />
          <Pill tone="warn">old versions kept and billed forever</Pill>
        </li>
      )}
      {afterRun && (
        <li className="basis-full text-ink-3">
          {deleted ? 'Deleted' : 'Hidden'} after year 7, so the 7-year run never shows it.
        </li>
      )}
      {rule.prefix === 'menu' && rule.noncurrentExpireAfterDays !== null && (
        <li className="basis-full text-ink-3">
          Replaced photos: deleted {whole(rule.noncurrentExpireAfterDays)} days after they become old.
        </li>
      )}
    </ol>
  )
}

function RuleCard({ rule, onChange }: { rule: Rule; onChange: (r: Rule) => void }) {
  const ft = FILE_TYPES[rule.prefix]
  const start = RECOMMENDED_CLASSES[rule.prefix]
  const headingId = useId()
  const problems = ruleProblems(rule, start)
  const early = deletesTooEarly(rule)
  const menu = rule.prefix === 'menu'
  const last = rule.transitions[rule.transitions.length - 1]
  const canAdd = rule.transitions.length < MAX_MOVES && CLASSES.some((c) => canMove(last?.to ?? start, c.id))

  const setStep = (i: number, patch: Partial<Step>) =>
    onChange({ ...rule, transitions: rule.transitions.map((s, k) => (k === i ? { ...s, ...patch } : s)) })

  return (
    <li aria-labelledby={headingId} className="min-w-0 rounded-md border border-line bg-panel p-3">
      <p id={headingId} className="flex flex-wrap items-baseline gap-x-2 font-bold text-ink">
        <code className="rounded bg-sunken px-1.5 py-0.5 text-sm">{ft.prefix}</code>
        <span>{ft.label}</span>
      </p>
      <p className="mt-1 text-xs text-ink-3">
        Uploaded to <Term k={classById(start).termKey}>{shortName(start)}</Term> · {KEEP[rule.prefix]}
      </p>

      {!menu && (
        <div className="mt-3">
          <p className="text-sm font-bold text-ink-2">
            <Term k="transition-action">Moves</Term>
          </p>
          {rule.transitions.length > 0 && (
            <ol className="mt-1.5 grid gap-2">
              {rule.transitions.map((s, i) => (
                <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                  <span>After</span>
                  <DaysInput
                    value={s.afterDays}
                    min={0}
                    label={`${ft.prefix} move ${i + 1}: after how many days`}
                    onChange={(v) => setStep(i, { afterDays: v ?? 0 })}
                  />
                  <span>days, move to</span>
                  <select
                    value={s.to}
                    aria-label={`${ft.prefix} move ${i + 1}: to which shelf`}
                    onChange={(e) => setStep(i, { to: e.target.value as ClassId })}
                    className="h-9 min-w-0 max-w-full rounded-md border border-line-strong bg-panel px-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-signal"
                  >
                    {CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {shortName(c.id)}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${ft.prefix} move ${i + 1}`}
                    onClick={() => onChange({ ...rule, transitions: rule.transitions.filter((_, k) => k !== i) })}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
          )}
          {canAdd && (
            <Button
              size="sm"
              className="mt-2"
              aria-label={`Add a move for ${ft.prefix}`}
              onClick={() => onChange({ ...rule, transitions: [...rule.transitions, nextStep(rule, start)] })}
            >
              <Plus aria-hidden />
              Add a move
            </Button>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
            <span>
              <Term k="expiration-action">Expire</Term> after
            </span>
            <DaysInput
              value={rule.expireAfterDays}
              min={1}
              optional
              label={`${ft.prefix}: expire after how many days (empty for never)`}
              onChange={(v) => onChange({ ...rule, expireAfterDays: v })}
            />
            <span>days</span>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
        <span>
          Delete <Term k="noncurrent-version">old versions</Term> after
        </span>
        <DaysInput
          value={rule.noncurrentExpireAfterDays}
          min={1}
          optional
          label={`${ft.prefix}: delete old versions after how many days (empty for never)`}
          onChange={(v) => onChange({ ...rule, noncurrentExpireAfterDays: v })}
        />
        <span>days</span>
      </div>

      {(problems.length > 0 || early) && (
        <ul className="mt-3 grid gap-1" aria-label={`Problems with the ${ft.prefix} rule`}>
          {problems.length > 0 && (
            <li>
              <Pill tone="bad">S3 would reject this rule when you save it</Pill>
            </li>
          )}
          {problems.map((p) => (
            <li key={p} className="text-sm text-bad">
              {PROBLEM_LABELS[p]}
            </li>
          ))}
          {early && <li className="text-sm text-bad">Deletes files {ft.keepDays === null ? 'Mealhop keeps' : 'too early'}</li>}
        </ul>
      )}

      <div className="mt-3 border-t border-line pt-2">
        <Path events={ruleEvents(rule, start)} rule={rule} />
      </div>
    </li>
  )
}

/** One card per prefix: moves, expiry and old-version clean-up. */
export function RuleBuilder({ rules, onChange }: { rules: Rule[]; onChange: (rules: Rule[]) => void }) {
  const ruleFor = (p: PrefixId) => rules.find((r) => r.prefix === p) ?? emptyRule(p)
  const update = (next: Rule) =>
    onChange(rules.some((r) => r.prefix === next.prefix) ? rules.map((r) => (r.prefix === next.prefix ? next : r)) : [...rules, next])
  return (
    <Bench
      title="Try it: write a rule for each kind of file"
      intro={
        <>
          Add moves, <Term k="expiration-action">expiry</Term> and old-version days to each card; its path shows where
          one month of files goes.
        </>
      }
    >
      <ul className="grid gap-3 lg:grid-cols-2">
        {PREFIX_IDS.map((p) => (
          <RuleCard key={p} rule={ruleFor(p)} onChange={update} />
        ))}
      </ul>
    </Bench>
  )
}
