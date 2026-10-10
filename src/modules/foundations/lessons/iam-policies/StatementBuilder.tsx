import { useEffect, useId, useRef } from 'react'
import { Ban, Check, Plus, Trash } from 'lucide-react'
import { Button, Pill, Segmented, Switch } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import type { Effect, Statement } from './evaluate'
import { actionPatterns, describeAction, describeResource, makeStatement, MAX_STATEMENTS, resourcePatterns } from './data'

export interface StatementMark {
  index: number
  /** ok: allowed the request; bad: denied it; neutral: matched but was overruled */
  tone: 'ok' | 'bad' | 'neutral'
  label: string
}

const markBorder: Record<StatementMark['tone'], string> = {
  ok: 'border-ok',
  bad: 'border-bad',
  neutral: 'border-line-strong border-dashed',
}

const selectClass =
  'mt-1 h-10 w-full min-w-0 rounded-md border border-line-strong bg-panel px-2.5 font-mono text-sm text-ink hover:border-ink'

function StatementCard({
  statement,
  index,
  onChange,
  onRemove,
  canRemove,
  mark,
  headingRef,
}: {
  statement: Statement
  index: number
  onChange: (s: Statement) => void
  onRemove: () => void
  canRemove: boolean
  mark?: StatementMark
  /** Lets the builder move keyboard focus to this card after adding or removing a statement */
  headingRef: (el: HTMLHeadingElement | null) => void
}) {
  const uid = useId()
  const set = (patch: Partial<Statement>) => onChange({ ...statement, ...patch })
  const name = `Statement ${index + 1}`
  const deny = statement.effect === 'Deny'

  return (
    <li className={cn('rounded-lg border-2 bg-panel p-3.5 transition-colors', mark ? markBorder[mark.tone] : 'border-line')}>
      <div className="flex flex-wrap items-center gap-2">
        <h5 id={`${uid}-h`} ref={headingRef} tabIndex={-1} className="scroll-mt-24 font-bold text-ink">
          {name}
        </h5>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-sm font-bold',
            deny ? 'text-bad' : 'text-ok',
          )}
        >
          {deny ? <Ban aria-hidden className="size-3.5" /> : <Check aria-hidden className="size-3.5" />}
          {statement.effect}
        </span>
        {mark && (
          <Pill tone={mark.tone} className="ml-1">
            {mark.label}
          </Pill>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove ${name}`}
        >
          <Trash aria-hidden />
          Remove
        </Button>
      </div>

      {/* The group tells screen-reader users which statement a control belongs to. */}
      <div role="group" aria-labelledby={`${uid}-h`} className="mt-3 grid gap-3">
        <Segmented<Effect>
          size="sm"
          label="Effect"
          value={statement.effect}
          onChange={(effect) => set({ effect })}
          options={[
            { value: 'Allow', label: 'Allow' },
            { value: 'Deny', label: 'Deny' },
          ]}
        />
        <div>
          <label htmlFor={`${uid}-a`} className="text-sm font-bold text-ink-2">
            <span className="sr-only">{name}: </span>
            Action
          </label>
          <select
            id={`${uid}-a`}
            className={selectClass}
            value={statement.action}
            onChange={(e) => set({ action: e.target.value })}
            aria-describedby={`${uid}-ad`}
          >
            {actionPatterns.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value}
              </option>
            ))}
          </select>
          <p id={`${uid}-ad`} className="mt-1 text-sm text-ink-3">
            {describeAction(statement.action)}
          </p>
        </div>
        <div>
          <label htmlFor={`${uid}-r`} className="text-sm font-bold text-ink-2">
            <span className="sr-only">{name}: </span>
            Resource
          </label>
          <select
            id={`${uid}-r`}
            className={selectClass}
            value={statement.resource}
            onChange={(e) => set({ resource: e.target.value })}
            aria-describedby={`${uid}-rd`}
          >
            {resourcePatterns.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value}
              </option>
            ))}
          </select>
          <p id={`${uid}-rd`} className="mt-1 text-sm text-ink-3">
            {describeResource(statement.resource)}
          </p>
        </div>
        <Switch
          checked={statement.mfa}
          onChange={(mfa) => set({ mfa })}
          label={
            <>
              <span className="sr-only">{name}: </span>
              {deny ? 'Condition: only if not signed in with MFA' : 'Condition: only if signed in with MFA'}
            </>
          }
        />
        {deny && statement.mfa && (
          <p className="-mt-1 text-sm text-ink-3">
            On a Deny, the JSON uses the opposite test, <span className="font-mono">BoolIfExists</span> with{' '}
            <span className="font-mono">"false"</span>: deny unless the request proves MFA. Requests made with long-term
            access keys carry no MFA information at all, so they are denied too. This is the pattern AWS recommends.
          </p>
        )}
      </div>
    </li>
  )
}

/**
 * Edits up to three statements. Each statement holds one action and one
 * resource (a simplification; real statements can list several of each).
 */
export function StatementBuilder({
  statements,
  onChange,
  marks = [],
  label,
}: {
  statements: Statement[]
  onChange: (next: Statement[]) => void
  marks?: StatementMark[]
  label: string
}) {
  const maxId = useId()
  const atMax = statements.length >= MAX_STATEMENTS

  /* Adding or removing a card would leave keyboard focus nowhere, so move it on purpose. */
  const headings = useRef(new Map<string, HTMLHeadingElement>())
  const addRow = useRef<HTMLDivElement>(null)
  const focusAfterChange = useRef<string | null>(null)
  useEffect(() => {
    const target = focusAfterChange.current
    if (target === null) return
    focusAfterChange.current = null
    if (target === 'add') addRow.current?.querySelector('button')?.focus()
    else headings.current.get(target)?.focus()
  }, [statements])

  const update = (i: number, s: Statement) => onChange(statements.map((x, j) => (j === i ? s : x)))
  const remove = (i: number) => {
    const next = statements.filter((_, j) => j !== i)
    focusAfterChange.current = next[Math.max(0, i - 1)]?.id ?? 'add'
    onChange(next)
  }
  const add = () => {
    if (atMax) return
    const s = makeStatement({ effect: 'Allow', action: 's3:ListBucket', resource: 'arn:aws:s3:::example-reports', mfa: false })
    focusAfterChange.current = s.id
    onChange([...statements, s])
  }

  return (
    <div>
      <ul aria-label={label} className="space-y-3">
        {statements.map((s, i) => (
          <StatementCard
            key={s.id}
            statement={s}
            index={i}
            onChange={(next) => update(i, next)}
            onRemove={() => remove(i)}
            canRemove={statements.length > 1}
            mark={marks.find((m) => m.index === i)}
            headingRef={(el) => {
              if (el) headings.current.set(s.id, el)
              else headings.current.delete(s.id)
            }}
          />
        ))}
      </ul>
      <div ref={addRow} className="mt-3 flex flex-wrap items-center gap-3">
        {/* aria-disabled (not disabled): at the limit the button stays focusable and points to the reason. */}
        <Button
          size="sm"
          onClick={add}
          aria-disabled={atMax}
          aria-describedby={atMax ? maxId : undefined}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
        >
          <Plus aria-hidden />
          Add statement
        </Button>
        <p id={maxId} className="text-sm text-ink-3">
          {atMax ? `This simulator holds up to ${MAX_STATEMENTS} statements.` : null}
        </p>
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Simplified: here each statement has one action and one resource. Real statements can list several of each.
      </p>
    </div>
  )
}
