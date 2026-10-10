import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Ban, CircleCheck, Hourglass, Server, UserRound, UserRoundCheck, UserX, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Switch } from '../../../../components/controls'
import { Boundary, ServiceTile, type BoundaryKind } from '../../../../components/diagram'
import { CodeBlock } from '../../../../components/CodeBlock'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { ActorChip, RoleTile } from './parts'
import { buildTrustPolicy, evaluate, principalOptions, type PrincipalId, type RequesterId } from './trustData'

interface Requester {
  id: RequesterId
  name: string
  caption: string
  icon: LucideIcon
  aws: boolean
  tone?: 'bad'
}

const requesters: Requester[] = [
  { id: 'ec2', name: 'EC2 instance', caption: 'the photo app’s web server', icon: Server, aws: true },
  { id: 'lambda', name: 'Lambda function', caption: 'a thumbnail maker', icon: Zap, aws: true },
  { id: 'dev', name: 'Partner developer', caption: 'works in the partner team’s AWS account', icon: UserRound, aws: false },
  { id: 'sso', name: 'Akua, an employee', caption: 'signs in through your company’s identity provider', icon: UserRoundCheck, aws: false },
  { id: 'stranger', name: 'Stranger on the internet', caption: 'no AWS identity you trust', icon: UserX, aws: false, tone: 'bad' },
]

/** Where each requester lives, drawn as containment boxes. */
const groups: { kind: BoundaryKind; label: string; ids: RequesterId[] }[] = [
  { kind: 'account', label: 'Your account 123456789012', ids: ['ec2', 'lambda'] },
  { kind: 'account', label: 'Partner account 111122223333', ids: ['dev'] },
  { kind: 'group', label: 'Outside AWS', ids: ['sso', 'stranger'] },
]

const DEFAULT_TRUST: PrincipalId[] = ['ec2']

export function TrustSim() {
  const reduce = useReducedMotion() ?? false
  const [trusted, setTrusted] = useState<ReadonlySet<PrincipalId>>(() => new Set(DEFAULT_TRUST))
  const [devAllowed, setDevAllowed] = useState(true)
  const [runs, setRuns] = useState(0)
  /** For screen readers: which requesters changed after the last edit, and why */
  const [changes, setChanges] = useState('')

  const policy = useMemo(() => buildTrustPolicy(trusted), [trusted])
  const verdicts = useMemo(
    () => requesters.map((r) => ({ requester: r, verdict: evaluate(r.id, trusted, devAllowed) })),
    [trusted, devAllowed],
  )
  const okCount = verdicts.filter((v) => v.verdict.ok).length
  const hasRun = runs > 0

  const describeChanges = (nextTrusted: ReadonlySet<PrincipalId>, nextDev: boolean) => {
    if (!hasRun) return ''
    return requesters
      .filter((r) => evaluate(r.id, trusted, devAllowed).ok !== evaluate(r.id, nextTrusted, nextDev).ok)
      .map((r) => {
        const v = evaluate(r.id, nextTrusted, nextDev)
        return `${r.name}: ${v.ok ? 'now gets temporary credentials' : 'now refused'}. ${v.reason}`
      })
      .join(' ')
  }

  const toggle = (id: PrincipalId, on: boolean) => {
    const next = new Set(trusted)
    if (on) next.add(id)
    else next.delete(id)
    setChanges(describeChanges(next, devAllowed))
    setTrusted(next)
  }

  const toggleDev = (on: boolean) => {
    setChanges(describeChanges(trusted, on))
    setDevAllowed(on)
  }

  const run = () => {
    setChanges('')
    setRuns((r) => r + 1)
  }

  const reset = () => {
    setTrusted(new Set(DEFAULT_TRUST))
    setDevAllowed(true)
    setRuns(0)
    setChanges('')
  }

  const renderRequester = (id: RequesterId) => {
    const i = verdicts.findIndex((v) => v.requester.id === id)
    const { requester: r, verdict } = verdicts[i]
    return (
      <li key={r.id} className="rounded-md border border-line bg-paper p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {r.aws ? (
            <ServiceTile name={r.name} caption={r.caption} category="compute" icon={r.icon} size="sm" />
          ) : (
            <ActorChip name={r.name} caption={r.caption} icon={r.icon} tone={r.tone} />
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={hasRun ? `${runs}-${verdict.ok}` : 'idle'}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.12 }}
            >
              {!hasRun ? (
                <Pill>
                  <Hourglass aria-hidden />
                  Not tried yet
                </Pill>
              ) : verdict.ok ? (
                <Pill tone="ok">
                  <CircleCheck aria-hidden />
                  Gets temporary credentials
                </Pill>
              ) : (
                <Pill tone="bad">
                  <Ban aria-hidden />
                  Refused
                </Pill>
              )}
            </motion.span>
          </AnimatePresence>
        </div>
        {r.id === 'dev' && (
          <Switch
            className="mt-2"
            label="Their own account allows them sts:AssumeRole on PhotoReader"
            checked={devAllowed}
            onChange={toggleDev}
          />
        )}
        {hasRun && <p className="mt-2 text-sm text-ink-2">{verdict.reason}</p>}
      </li>
    )
  }

  return (
    <Bench
      title="Try it: who can wear this role?"
      intro="Choose who the PhotoReader role trusts, then let everyone try to assume it. Change the trust policy and watch the answers change. Then switch off the developer’s own permission."
      onReset={reset}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left: the role and its trust policy */}
        <div className="min-w-0">
          <Boundary kind="account" label="Your account 123456789012">
            <RoleTile name="PhotoReader" caption="IAM role" />
            <p className="mt-2 text-sm text-ink-2">
              <span className="font-bold text-ink">Permissions policy</span> (stays the same here): allows{' '}
              <code className="font-mono text-[0.85em] text-ink">s3:GetObject</code> on{' '}
              <code className="font-mono text-[0.85em] text-ink wrap-anywhere">arn:aws:s3:::example-photos/*</code>
            </p>
          </Boundary>

          <fieldset className="mt-4">
            <legend className="text-sm font-bold text-ink-2">Trust policy: who may assume PhotoReader?</legend>
            <ul className="mt-2 space-y-1.5">
              {principalOptions.map((o) => (
                <li key={o.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal',
                      trusted.has(o.id) ? 'border-signal bg-signal-soft' : 'border-line bg-panel hover:border-ink',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={trusted.has(o.id)}
                      onChange={(e) => toggle(o.id, e.target.checked)}
                      className="mt-1 size-4 shrink-0 accent-[var(--color-signal)]"
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-ink">{o.label}</span>
                      <span className="block font-mono text-xs text-ink-3 wrap-anywhere">
                        "{o.key}": "{o.value}"
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <p className="mt-2 text-sm text-ink-2">
            <code className="font-mono text-[0.85em] text-ink">"Federated"</code> means the role trusts a sign-in system outside AWS, here
            an identity provider that vouches for each person with a signed <Term k="saml">SAML</Term> message. Trusting one is called{' '}
            <Term k="federation">federation</Term>.
          </p>

          <CodeBlock code={policy.code} lang="json" title="PhotoReader trust policy" highlight={policy.highlight} className="mt-4! mb-0!" />
          {trusted.size === 0 && (
            <p className="mt-2 text-sm text-ink-2">
              Real IAM will not save a trust policy with no statements, so every real role trusts someone. Here, with nothing ticked, none
              of these requesters is trusted, so nobody gets in.
            </p>
          )}
        </div>

        {/* Right: the requesters */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-bold text-ink">Who is asking?</h4>
            <Button variant="primary" size="sm" onClick={run}>
              <Users aria-hidden />
              {hasRun ? 'Let everyone try again' : 'Let everyone try'}
            </Button>
          </div>
          <p aria-live="polite" aria-atomic="true" className="mt-2 min-h-6 text-sm font-bold text-ink">
            {hasRun ? `${okCount} of ${requesters.length} can assume PhotoReader.` : ''}
            {changes && <span className="sr-only"> {changes}</span>}
          </p>
          <div className="mt-3 space-y-3">
            {groups.map((g) => (
              <Boundary key={g.label} kind={g.kind} label={g.label}>
                <ul className="space-y-2">{g.ids.map(renderRequester)}</ul>
              </Boundary>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 border-t border-line pt-3 text-xs text-ink-3">
        Simplified: real AWS also checks trust policy conditions, guardrails such as service control policies, and whether the person who
        attached the role to the instance or function was allowed to pass it (iam:PassRole). IAM Identity Center works differently: it
        creates and manages its own roles from permission sets, as the last section of this lesson shows. To hand its users a role you made
        yourself, AWS offers account access manager, which needs a different trust policy.
      </p>
    </Bench>
  )
}
