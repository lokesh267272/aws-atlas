import type { ReactNode } from 'react'
import { CircleCheck, Clock, FastForward, KeyRound, Pause, Play, Ticket, TriangleAlert, UserX } from 'lucide-react'
import { Button, Pill } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { LIFETIME, fmtClock, tempKeyId, type CredState, type SimStep } from './keyVsRoleData'

const Row = ({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) => (
  <>
    <dt className="text-ink-3">{label}</dt>
    <dd className={cn('min-w-0 text-ink', mono && 'font-mono text-[0.8rem] wrap-anywhere')}>{children}</dd>
  </>
)

/** The long-term access key, as it travels from your code to a stranger. */
export function KeyCard({ step, isLast }: { step: SimStep; isLast: boolean }) {
  const status = step.keyStatus ?? { label: 'In your code', tone: 'warn' as const }
  return (
    <section aria-label="The access key" className="rounded-lg border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold text-ink">
          <KeyRound aria-hidden className="size-4 text-ink-2" />
          Access key (long-term)
        </p>
        <Pill tone={status.tone}>
          {status.tone === 'bad' && <TriangleAlert aria-hidden />}
          {status.label}
        </Pill>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <Row label="Access key ID" mono>
          <span className={cn(isLast && 'line-through decoration-2')}>AKIAIOSFODNN7EXAMPLE</span>
        </Row>
        <Row label="Secret access key" mono>
          <span className={cn(isLast && 'line-through decoration-2')}>wJalrXUtnFEMI/K7MDENG/bPxRfiCY…</span>
        </Row>
        <Row label="Expires">
          {isLast ? (
            <span className="font-bold text-ink">Deleted by you, so it works for nobody now</span>
          ) : (
            <span className="font-bold text-bad">Never, unless someone deletes it</span>
          )}
        </Row>
        <Row label="Working copies">
          {step.holders && step.holders.length > 0 ? (
            <ul className="space-y-0.5">
              {step.holders.map((h) => (
                <li key={h} className="flex items-center gap-1.5">
                  {h === 'You' ? (
                    <KeyRound aria-hidden className="size-3.5 shrink-0 text-ink-3" />
                  ) : (
                    <UserX aria-hidden className="size-3.5 shrink-0 text-bad" />
                  )}
                  {h}
                </li>
              ))}
            </ul>
          ) : (
            <span>None. Your own app is broken too until you give it a new key.</span>
          )}
        </Row>
      </dl>
    </section>
  )
}

/** The temporary credentials on the EC2 instance, with a sped-up countdown. */
export function TempCredCard({
  cred,
  clock,
  reduce,
  canRun,
  paused,
  onTogglePause,
  onSkip,
  onSteal,
}: {
  cred: CredState | null
  clock: number
  reduce: boolean
  /** The clock runs by itself right now (last step, motion allowed) */
  canRun: boolean
  paused: boolean
  onTogglePause: () => void
  onSkip: () => void
  onSteal: () => void
}) {
  if (!cred) {
    return (
      <section aria-label="Credentials on the server" className="rounded-lg border border-dashed border-line-strong bg-paper p-4">
        <p className="flex items-center gap-2 font-bold text-ink">
          <Ticket aria-hidden className="size-4 text-ink-2" />
          No credentials on the server yet
        </p>
        <p className="mt-1.5 text-sm text-ink-2">
          There is no secret in the code or on the disk. A thief who copies every file on this server finds nothing to steal.
        </p>
      </section>
    )
  }

  const expiresAt = cred.issuedAt + LIFETIME
  const left = expiresAt - clock
  const pct = Math.max(0, Math.min(100, (left / LIFETIME) * 100))
  const low = left <= 15
  const stolenLeft = cred.stolenExpiresAt === null ? null : cred.stolenExpiresAt - clock
  const stealActive = stolenLeft !== null && stolenLeft > 0

  return (
    <section aria-label="Temporary credentials on the server" className="rounded-lg border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-bold text-ink">
          <Ticket aria-hidden className="size-4 text-ink-2" />
          Temporary credentials, set {cred.setNo}
        </p>
        <Pill tone="ok">
          <CircleCheck aria-hidden />
          Valid
        </Pill>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        <Row label="Access key ID" mono>
          {tempKeyId(cred.setNo)}
        </Row>
        <Row label="Secret access key" mono>
          ••••••••••••EXAMPLEKEY
        </Row>
        <Row label="Session token" mono>
          AQoDYXdzEPT//////////wEXAMPLE…
        </Row>
        <Row label="Expiration">
          <span className="font-bold tabular-nums">{fmtClock(expiresAt)}</span>
          <span className={cn('tabular-nums', low ? 'text-warn' : 'text-ink-3')}> (in {left} min)</span>
        </Row>
      </dl>
      <div className="mt-3" aria-hidden>
        <div className="h-2 overflow-hidden rounded-full bg-sunken">
          <div className={cn('h-full rounded-full', low ? 'bg-warn' : 'bg-ok')} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-2">
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Clock aria-hidden className="size-4 text-ink-3" />
          Simulated time {fmtClock(clock)}
        </span>
        <span className="tabular-nums">
          Refreshed automatically: <strong className="text-ink">{cred.refreshes}</strong> {cred.refreshes === 1 ? 'time' : 'times'}
        </span>
      </div>
      {reduce ? (
        <p className="mt-2 text-xs text-ink-3">The clock only moves when you skip ahead, because your device asks for less motion.</p>
      ) : !canRun ? (
        <p className="mt-2 text-xs text-ink-3">The clock starts running at the last step. Until then it only moves when you skip ahead.</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {canRun && (
          <Button size="sm" onClick={onTogglePause}>
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {paused ? 'Resume clock' : 'Pause clock'}
          </Button>
        )}
        <Button size="sm" onClick={onSkip}>
          <FastForward aria-hidden />
          Skip ahead 10 minutes
        </Button>
        <Button
          size="sm"
          onClick={() => !stealActive && onSteal()}
          aria-disabled={stealActive}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
        >
          <UserX aria-hidden />
          Steal a copy
        </Button>
      </div>
      <div aria-live="polite">
        {stolenLeft !== null && (
          <p
            className={cn(
              'mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm',
              stolenLeft > 0 ? 'bg-warn-soft text-ink' : 'bg-ok-soft text-ink',
            )}
          >
            {stolenLeft > 0 ? (
              <>
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
                <span>
                  A thief copied a set. It works for them until <strong className="tabular-nums">{fmtClock(cred.stolenExpiresAt ?? 0)}</strong>, then
                  becomes useless. Skip ahead to watch it expire.
                </span>
              </>
            ) : (
              <>
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                <span>
                  The stolen copy expired at <strong className="tabular-nums">{fmtClock(cred.stolenExpiresAt ?? 0)}</strong>. AWS no longer accepts it,
                  and nobody had to do anything.
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  )
}
