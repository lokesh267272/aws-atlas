import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, Ban, CircleCheck, CircleX, Send } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import type { AccessRequest, Evaluation } from './evaluate'
import { shortResource } from './data'

/** Phases of the animation: 0 idle, 1 request, 2 deny check, 3 allow check, 4 result. */
export const FINAL_PHASE = 4

const names = (idx: number[]) => idx.map((i) => `Statement ${i + 1}`).join(' and ')

export function decisionText(e: Evaluation): { title: string; detail: string } {
  if (e.decision === 'explicit-deny')
    return { title: 'Denied (explicit Deny)', detail: `${names(e.denyMatches)} matched with Effect Deny. A Deny always wins.` }
  if (e.decision === 'allowed')
    return { title: 'Allowed', detail: `${names(e.allowMatches)} matched with Effect Allow, and no Deny matched.` }
  return { title: 'Denied (no Allow matched: implicit deny)', detail: 'No statement allowed this request, so the starting answer, Deny, stands.' }
}

function Node({
  state,
  title,
  children,
  tone = 'neutral',
}: {
  state: 'waiting' | 'active' | 'done' | 'skipped'
  title: ReactNode
  children?: ReactNode
  tone?: 'neutral' | 'ok' | 'bad'
}) {
  return (
    <div
      className={cn(
        'rounded-md border-2 px-3.5 py-2.5 transition-[opacity,border-color] duration-300',
        state === 'waiting' && 'border-line opacity-45',
        state === 'skipped' && 'border-dashed border-line opacity-60',
        state === 'active' && 'border-signal bg-signal-soft',
        state === 'done' && tone === 'neutral' && 'border-line-strong',
        state === 'done' && tone === 'ok' && 'border-ok bg-ok-soft',
        state === 'done' && tone === 'bad' && 'border-bad bg-bad-soft',
      )}
    >
      <p className="font-bold text-ink">{title}</p>
      {children && <div className="mt-0.5 text-sm text-ink-2">{children}</div>}
    </div>
  )
}

function Connector({ label }: { label?: string }) {
  return (
    <div aria-hidden className="flex items-center gap-2 py-1 pl-4 text-xs font-bold text-ink-3">
      <ArrowDown className="size-4" />
      {label}
    </div>
  )
}

export function DecisionFlow({
  evaluation,
  request,
  phase,
  stale,
}: {
  evaluation: Evaluation | null
  request: AccessRequest | null
  phase: number
  stale: boolean
}) {
  const reduce = useReducedMotion()
  const reveal = (key: string, content: ReactNode) => (
    <motion.span
      key={key}
      className="block"
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {content}
    </motion.span>
  )

  if (!evaluation || !request) {
    return (
      <div className="rounded-md border-2 border-dashed border-line px-4 py-6 text-center text-ink-3">
        Choose a request and press Evaluate to watch AWS decide.
      </div>
    )
  }

  const e = evaluation
  const denyCount = e.checks.filter((c) => c.statement.effect === 'Deny').length
  const allowCount = e.checks.length - denyCount
  const denied = e.denyMatches.length > 0
  const state = (n: number): 'waiting' | 'active' | 'done' => (phase < n ? 'waiting' : phase === n && n < FINAL_PHASE ? 'active' : 'done')
  const result = decisionText(e)
  const ResultIcon = e.decision === 'allowed' ? CircleCheck : e.decision === 'explicit-deny' ? Ban : CircleX

  return (
    <div className={cn('transition-opacity', stale && 'opacity-50')}>
      <ol aria-label="How AWS decided">
        <li>
          <Node state={state(1)} title={<span className="inline-flex items-center gap-2"><Send aria-hidden className="size-4 text-ink-3" />Request arrives</span>}>
            <span className="font-mono">{request.action}</span> on{' '}
            <span className="font-mono break-all">{shortResource(request.resource)}</span>,{' '}
            {request.mfa ? 'signed in with MFA' : 'without MFA'}. Starting answer: Deny.
          </Node>
        </li>
        <li>
          <Connector />
          <Node state={state(2)} title="Step 1: Does any Deny statement match?" tone={denied ? 'bad' : 'neutral'}>
            {phase >= 2
              ? reveal(
                  'd',
                  denyCount === 0
                    ? 'No: this policy has no Deny statements.'
                    : denied
                      ? `Yes: ${names(e.denyMatches)}.`
                      : `No: checked ${denyCount} Deny statement${denyCount > 1 ? 's' : ''}, none matched.`,
                )
              : 'Waiting'}
          </Node>
        </li>
        <li>
          <Connector label={phase >= 2 ? (denied ? 'Yes, so skip straight to the result' : 'No, so keep going') : undefined} />
          {denied ? (
            <Node state={phase >= 3 ? 'skipped' : 'waiting'} title="Step 2: Does any Allow statement match?">
              {phase >= 3 ? 'Skipped: an explicit Deny has already decided.' : 'Waiting'}
            </Node>
          ) : (
            <Node state={state(3)} title="Step 2: Does any Allow statement match?" tone={e.allowMatches.length ? 'ok' : 'neutral'}>
              {phase >= 3
                ? reveal(
                    'a',
                    allowCount === 0
                      ? 'No: this policy has no Allow statements.'
                      : e.allowMatches.length
                        ? `Yes: ${names(e.allowMatches)}.`
                        : `No: checked ${allowCount} Allow statement${allowCount > 1 ? 's' : ''}, none matched.`,
                  )
                : 'Waiting'}
            </Node>
          )}
        </li>
        <li>
          <Connector />
          <div
            className={cn(
              'rounded-md border-2 px-4 py-3 transition-[opacity,border-color] duration-300',
              phase < FINAL_PHASE && 'border-line opacity-45',
              phase >= FINAL_PHASE && (e.decision === 'allowed' ? 'border-ok bg-ok-soft' : 'border-bad bg-bad-soft'),
            )}
          >
            {phase >= FINAL_PHASE ? (
              reveal(
                'r',
                <>
                  <span
                    className={cn(
                      'flex items-center gap-2 text-lg font-bold',
                      e.decision === 'allowed' ? 'text-ok' : 'text-bad',
                    )}
                  >
                    <ResultIcon aria-hidden className="size-5 shrink-0" />
                    {result.title}
                  </span>
                  <span className="mt-1 block text-sm text-ink-2">{result.detail}</span>
                </>,
              )
            ) : (
              <p className="font-bold text-ink">Result</p>
            )}
          </div>
        </li>
      </ol>
      {/* The result is announced by PolicySimulator's permanent live region. */}
    </div>
  )
}
