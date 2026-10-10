import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'

type PartId =
  | 'version'
  | 'statement'
  | 'sid-1'
  | 'effect-allow'
  | 'action-1'
  | 'resource-1'
  | 'resource-bucket'
  | 'resource-objects'
  | 'condition'
  | 'condition-op'
  | 'condition-key'
  | 'sid-2'
  | 'effect-deny'
  | 'action-2'
  | 'resource-2'

interface Part {
  label: string
  body: ReactNode
  gotcha?: ReactNode
}

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded-sm bg-sunken px-1 font-mono text-[0.86em] text-ink [overflow-wrap:anywhere]">{children}</code>
)

const parts: Record<PartId, Part> = {
  version: {
    label: 'Version',
    body: (
      <>
        <p>
          Which edition of the policy language this policy uses. <C>2012-10-17</C> is the current edition, so every
          new policy uses exactly this value.
        </p>
        <p>
          It looks like a date, but it is a version name. You never change it to today’s date. Leave it out and AWS
          falls back to an older 2008 edition, where some newer features do not work.
        </p>
      </>
    ),
  },
  statement: {
    label: 'Statement',
    body: (
      <>
        <p>
          The list of rules, in square brackets. Each pair of curly braces inside is one statement. This policy has
          two.
        </p>
        <p>AWS checks every statement against every request. The order you write them in does not matter.</p>
      </>
    ),
  },
  'sid-1': {
    label: 'Sid',
    body: (
      <p>
        A statement ID: an optional name you choose, here <C>ReadReports</C>, so people can tell statements apart.
        In IAM policies it may contain only letters and numbers. AWS does not use it when deciding.
      </p>
    ),
  },
  'effect-allow': {
    label: 'Effect: Allow',
    body: (
      <p>
        What happens when this statement matches a request. <C>Allow</C> grants permission. AWS calls a matching
        Allow an explicit allow.
      </p>
    ),
  },
  'action-1': {
    label: 'Action',
    body: (
      <>
        <p>
          Which operations the statement covers, written <C>service:Operation</C>. <C>s3:GetObject</C> reads (downloads)
          a file. <C>s3:ListBucket</C> lists the files in a bucket.
        </p>
        <p>A list in square brackets means “any of these”.</p>
      </>
    ),
  },
  'resource-1': {
    label: 'Resource',
    body: (
      <p>
        Which things the actions apply to, written as ARNs (Amazon Resource Names). This list names the bucket and
        the files in it, because the two actions need different ARNs.
      </p>
    ),
  },
  'resource-bucket': {
    label: 'The bucket ARN',
    body: (
      <p>
        <C>arn:aws:s3:::example-reports</C> is the bucket itself. <C>s3:ListBucket</C> acts on the bucket, so this is
        the line that lets it work.
      </p>
    ),
    gotcha: (
      <>
        Classic mistake: with only this line, <C>s3:GetObject</C> matches nothing, because a file is not the bucket.
      </>
    ),
  },
  'resource-objects': {
    label: 'The object ARN',
    body: (
      <p>
        <C>arn:aws:s3:::example-reports/*</C> means every object (file) in the bucket. The <C>*</C> matches anything
        after the slash, even names with more slashes such as <C>2026/summary.pdf</C>. <C>s3:GetObject</C> acts on
        files, so it needs this form.
      </p>
    ),
    gotcha: <>This ARN does not match the bucket itself, so it cannot make s3:ListBucket work.</>,
  },
  condition: {
    label: 'Condition',
    body: (
      <p>
        An optional extra test. The statement only matches when the test is true. Here: only when the person signed
        in with MFA. Without MFA this Allow does not match, so both reading and listing are refused.
      </p>
    ),
  },
  'condition-op': {
    label: 'Condition operator: Bool',
    body: (
      <p>
        The kind of test, called the <Term k="condition-operator">condition operator</Term>. <C>Bool</C> compares a
        true-or-false value. Other operators compare text (<C>StringEquals</C>), numbers, dates or IP addresses.
      </p>
    ),
  },
  'condition-key': {
    label: 'Condition key',
    body: (
      <>
        <p>
          The fact being tested, called the <Term k="condition-key">condition key</Term>.{' '}
          <C>aws:MultiFactorAuthPresent</C> is true when the request comes from a sign-in that used MFA.
        </p>
        <p>
          Requests made with long-term <Term k="access-key">access keys</Term> never include this condition key, so
          they do not match this Allow either.
        </p>
      </>
    ),
  },
  'sid-2': {
    label: 'Sid',
    body: (
      <p>
        The second statement’s label, <C>NeverDelete</C>. A good Sid says what the rule is for, which helps the next
        person who reads the policy.
      </p>
    ),
  },
  'effect-deny': {
    label: 'Effect: Deny',
    body: (
      <p>
        <C>Deny</C> refuses the request when this statement matches. AWS calls it an explicit deny, and it beats every
        Allow, in this policy or any other.
      </p>
    ),
  },
  'action-2': {
    label: 'Action',
    body: (
      <p>
        <C>s3:DeleteObject</C> deletes a file. A single action can be written as a plain string, without square
        brackets.
      </p>
    ),
  },
  'resource-2': {
    label: 'Resource: *',
    body: (
      <p>
        A <C>*</C> on its own means every resource. Together with Deny, it means anyone with this policy can never
        use <C>s3:DeleteObject</C> on any file, in any bucket.
      </p>
    ),
    gotcha: (
      <>
        Simplified: in a bucket that keeps old versions of files, removing one specific version is a separate action,{' '}
        <C>s3:DeleteObjectVersion</C>. A complete “never delete” rule denies that too.
      </>
    ),
  },
}

const order: PartId[] = [
  'version',
  'statement',
  'sid-1',
  'effect-allow',
  'action-1',
  'resource-1',
  'resource-bucket',
  'resource-objects',
  'condition',
  'condition-op',
  'condition-key',
  'sid-2',
  'effect-deny',
  'action-2',
  'resource-2',
]

interface Line {
  indent: number
  key?: string
  value?: string
  /** Punctuation after the key (e.g. "[") or on its own (e.g. "},") */
  punct?: string
  parts: PartId[]
  /** Which part this line's key (or value) is the focusable handle for */
  button?: PartId
}

const S: PartId[] = ['statement']
const lines: Line[] = [
  { indent: 0, punct: '{', parts: [] },
  { indent: 1, key: 'Version', value: '2012-10-17', punct: ',', parts: ['version'], button: 'version' },
  { indent: 1, key: 'Statement', punct: '[', parts: S, button: 'statement' },
  { indent: 2, punct: '{', parts: S },
  { indent: 3, key: 'Sid', value: 'ReadReports', punct: ',', parts: [...S, 'sid-1'], button: 'sid-1' },
  { indent: 3, key: 'Effect', value: 'Allow', punct: ',', parts: [...S, 'effect-allow'], button: 'effect-allow' },
  { indent: 3, key: 'Action', punct: '[', parts: [...S, 'action-1'], button: 'action-1' },
  { indent: 4, value: 's3:GetObject', punct: ',', parts: [...S, 'action-1'] },
  { indent: 4, value: 's3:ListBucket', parts: [...S, 'action-1'] },
  { indent: 3, punct: '],', parts: [...S, 'action-1'] },
  { indent: 3, key: 'Resource', punct: '[', parts: [...S, 'resource-1'], button: 'resource-1' },
  {
    indent: 4,
    value: 'arn:aws:s3:::example-reports',
    punct: ',',
    parts: [...S, 'resource-1', 'resource-bucket'],
    button: 'resource-bucket',
  },
  {
    indent: 4,
    value: 'arn:aws:s3:::example-reports/*',
    parts: [...S, 'resource-1', 'resource-objects'],
    button: 'resource-objects',
  },
  { indent: 3, punct: '],', parts: [...S, 'resource-1'] },
  { indent: 3, key: 'Condition', punct: '{', parts: [...S, 'condition'], button: 'condition' },
  { indent: 4, key: 'Bool', punct: '{', parts: [...S, 'condition', 'condition-op'], button: 'condition-op' },
  {
    indent: 5,
    key: 'aws:MultiFactorAuthPresent',
    value: 'true',
    parts: [...S, 'condition', 'condition-op', 'condition-key'],
    button: 'condition-key',
  },
  { indent: 4, punct: '}', parts: [...S, 'condition', 'condition-op'] },
  { indent: 3, punct: '}', parts: [...S, 'condition'] },
  { indent: 2, punct: '},', parts: S },
  { indent: 2, punct: '{', parts: S },
  { indent: 3, key: 'Sid', value: 'NeverDelete', punct: ',', parts: [...S, 'sid-2'], button: 'sid-2' },
  { indent: 3, key: 'Effect', value: 'Deny', punct: ',', parts: [...S, 'effect-deny'], button: 'effect-deny' },
  { indent: 3, key: 'Action', value: 's3:DeleteObject', punct: ',', parts: [...S, 'action-2'], button: 'action-2' },
  { indent: 3, key: 'Resource', value: '*', parts: [...S, 'resource-2'], button: 'resource-2' },
  { indent: 2, punct: '}', parts: S },
  { indent: 1, punct: ']', parts: S },
  { indent: 0, punct: '}', parts: [] },
]

const keyClass = 'text-[#8fd0ff]'
const strClass = 'text-[#b9e37f]'
const punctClass = 'text-screen-dim'

export function PolicyAnatomy() {
  /** The part the learner chose (click, tap, focus, Previous/Next). Only this is announced. */
  const [selected, setSelected] = useState<PartId>('version')
  /**
   * A mouse hover preview. It never replaces the chosen part: it ends when the pointer leaves the JSON or when
   * the learner chooses a part. Only real pointer movement sets it, so scrolling the page does not.
   */
  const [hovered, setHovered] = useState<PartId | null>(null)
  const shown = hovered ?? selected
  const pos = order.indexOf(selected)
  const part = parts[shown]

  /* Screen readers hear the chosen part only, never hover previews. The text is read from a hidden copy. */
  const liveSource = useRef<HTMLDivElement>(null)
  const [announcement, setAnnouncement] = useState('')
  const announced = useRef(selected)
  useEffect(() => {
    if (announced.current === selected) return
    announced.current = selected
    const el = liveSource.current
    setAnnouncement(el ? Array.from(el.children, (c) => c.textContent ?? '').join(' ') : parts[selected].label)
  }, [selected])

  const select = (id: PartId) => {
    setHovered(null)
    setSelected(id)
  }
  const step = (delta: number) => {
    const next = order[pos + delta]
    if (next) select(next)
  }

  /* On phones the panel sticks over the bottom of the JSON. Keep a part reached with Tab above it. */
  const panelRef = useRef<HTMLDivElement>(null)
  const keepAbovePanel = (el: HTMLElement) => {
    const panel = panelRef.current
    if (!panel || getComputedStyle(panel).position !== 'sticky') return
    const r = el.getBoundingClientRect()
    const p = panel.getBoundingClientRect()
    if (r.bottom > p.top - 8 && r.top < p.bottom) window.scrollBy({ top: r.bottom - p.top + 24 })
  }

  const handleClass =
    'rounded-sm px-0.5 -mx-0.5 underline decoration-dotted decoration-screen-dim underline-offset-4 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#5fb3e6]'
  const disabledClass = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-45'

  return (
    <Bench
      title="Try it: take a policy apart"
      intro="Hover over any part of the policy to preview it. Click, tap or Tab to a part to keep it in the panel. You can also step through with the Previous and Next buttons."
      onReset={() => select('version')}
      /* overflow-clip (not hidden) keeps the rounded corners but lets the explanation panel stick on phones. */
      className="overflow-clip!"
    >
      <div className="@container">
        <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_19rem]">
          <div
            role="group"
            aria-label="Policy JSON. Each underlined word is a button that explains that part."
            className="overflow-x-auto rounded-lg border border-screen-line bg-screen py-3 [--json-pad:0.75rem] [--json-step:1ch] @lg:[--json-pad:1rem] @lg:[--json-step:2ch]"
            onPointerMove={(e) => {
              if (e.pointerType !== 'mouse') return
              const id = (e.target as HTMLElement).closest('[data-part]')?.getAttribute('data-part') as PartId | null | undefined
              if (id && id !== hovered) setHovered(id)
            }}
            onPointerLeave={() => setHovered(null)}
          >
            <p className="border-b border-screen-line px-4 pb-2 font-mono text-xs text-screen-dim">analyst-reports-policy.json</p>
            <div className="pt-2 font-mono text-[0.75rem] leading-relaxed text-screen-text @lg:text-[0.8rem]">
              {lines.map((line, i) => {
                const lit = line.parts.includes(shown)
                const innermost = line.parts[line.parts.length - 1]
                const handle = (text: string, cls: string) =>
                  line.button ? (
                    <button
                      type="button"
                      className={cn(cls, handleClass)}
                      onFocus={(e) => {
                        select(line.button!)
                        keepAbovePanel(e.currentTarget)
                      }}
                      onClick={() => select(line.button!)}
                      aria-pressed={selected === line.button}
                      aria-label={`${text}: explain ${parts[line.button].label}`}
                    >
                      {text}
                    </button>
                  ) : (
                    <span className={cls}>{text}</span>
                  )
                return (
                  <div
                    key={i}
                    data-part={innermost}
                    /* A mouse click anywhere on a line keeps its part. Keyboard users have the buttons. */
                    onClick={innermost ? () => select(innermost) : undefined}
                    className={cn(
                      /* Long values wrap instead of being cut off on narrow screens. */
                      'whitespace-pre-wrap border-l-2 pr-3 transition-colors [overflow-wrap:anywhere]',
                      lit ? 'border-[#5fb3e6] bg-white/[0.11]' : 'border-transparent',
                    )}
                    style={{ paddingLeft: `calc(var(--json-pad) + ${line.indent} * var(--json-step))` }}
                  >
                    {line.key !== undefined && (
                      <>
                        {handle(`"${line.key}"`, keyClass)}
                        <span className={punctClass}>: </span>
                      </>
                    )}
                    {line.value !== undefined &&
                      (line.key === undefined ? handle(`"${line.value}"`, strClass) : <span className={strClass}>"{line.value}"</span>)}
                    {line.punct && <span className={punctClass}>{line.punct}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* On phones the panel sits below the long JSON, so it sticks to the bottom of the screen while the JSON is in view. */}
          <div
            ref={panelRef}
            className="flex flex-col rounded-lg border border-line bg-paper p-4 @max-3xl:sticky @max-3xl:bottom-2 @max-3xl:z-10 @max-3xl:max-h-[50vh] @max-3xl:overflow-y-auto @max-3xl:shadow-[0_8px_28px_rgba(20,33,43,0.28)]"
          >
            <p className="text-sm text-ink-3">
              Part {order.indexOf(shown) + 1} of {order.length}
              {hovered !== null && hovered !== selected ? ' (preview)' : ''}
            </p>
            <div className="mt-1 flex-1">
              <h4 className="text-lg font-bold text-ink">{part.label}</h4>
              <div className="mt-2 space-y-2 text-[0.98rem] text-ink-2">{part.body}</div>
              {part.gotcha && (
                <p className="mt-3 flex gap-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-ink">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
                  <span>{part.gotcha}</span>
                </p>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {/* aria-disabled (not disabled) so keyboard focus stays on the button at either end of the list. */}
              <Button size="sm" className={disabledClass} onClick={() => step(-1)} aria-disabled={pos === 0}>
                <ChevronLeft aria-hidden />
                Previous
              </Button>
              <Button size="sm" className={disabledClass} onClick={() => step(1)} aria-disabled={pos === order.length - 1}>
                Next
                <ChevronRight aria-hidden />
              </Button>
            </div>
            <div ref={liveSource} hidden>
              <p>{parts[selected].label}.</p>
              {parts[selected].body}
              {parts[selected].gotcha && <p>{parts[selected].gotcha}</p>}
            </div>
            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>
          </div>
        </div>

        <p className="mt-4 rounded-md border border-line px-4 py-3 text-ink-2">
          <span className="font-bold text-ink">In plain words: </span>
          whoever has this policy may list the example-reports bucket and read its files, but only after signing in
          with MFA. They can never delete a file with s3:DeleteObject, in any bucket.
        </p>
      </div>
    </Bench>
  )
}
