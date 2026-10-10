import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CircleCheck, Lightbulb, X } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Segmented } from '../../../../components/controls'
import { CodeBlock } from '../../../../components/CodeBlock'
import { cn } from '../../../../lib/cn'
import { evaluate, type Decision, type Statement } from './evaluate'
import { challenges, makeStatement, shortResource, type Expected } from './data'
import { policyToJson } from './policyJson'
import { StatementBuilder } from './StatementBuilder'

const expectedLabel: Record<Expected, string> = {
  allowed: 'Allowed',
  denied: 'Denied',
  'explicit-deny': 'Denied by a Deny',
}

const actualLabel: Record<Decision, string> = {
  allowed: 'Allowed',
  'implicit-deny': 'Denied (implicit)',
  'explicit-deny': 'Denied (explicit)',
}

const passes = (expected: Expected, actual: Decision) =>
  expected === 'allowed' ? actual === 'allowed' : expected === 'denied' ? actual !== 'allowed' : actual === 'explicit-deny'

const freshPolicies = () => Object.fromEntries(challenges.map((c) => [c.id, c.start()])) as Record<string, Statement[]>

export function PolicyChallenges() {
  const [activeId, setActiveId] = useState(challenges[0].id)
  const [policies, setPolicies] = useState<Record<string, Statement[]>>(freshPolicies)
  const [hints, setHints] = useState<Record<string, number>>({})

  const results = useMemo(
    () =>
      Object.fromEntries(
        challenges.map((c) => [
          c.id,
          c.tests.map((t) => {
            const actual = evaluate(policies[c.id], t.request).decision
            return { ...t, actual, pass: passes(t.expected, actual) }
          }),
        ]),
      ),
    [policies],
  )

  const challenge = challenges.find((c) => c.id === activeId) ?? challenges[0]
  const rows = results[challenge.id]
  const passed = rows.filter((r) => r.pass).length
  const solved = passed === rows.length
  const statements = policies[challenge.id]
  const json = useMemo(() => policyToJson(statements).code, [statements])
  /** 0: hidden, 1: hint shown, 2: hint and a passing policy shown */
  const hintLevel = hints[challenge.id] ?? 0

  const setStatements = (next: Statement[]) => setPolicies((p) => ({ ...p, [challenge.id]: next }))

  /* "Still stuck?" disappears when pressed, so focus moves to the button that replaces it. */
  const solutionRow = useRef<HTMLDivElement>(null)
  const focusSolution = useRef(false)
  useEffect(() => {
    if (hintLevel === 2 && focusSolution.current) {
      focusSolution.current = false
      solutionRow.current?.querySelector('button')?.focus()
    }
  }, [hintLevel])

  const reset = () => {
    setPolicies(freshPolicies())
    setHints({})
    setActiveId(challenges[0].id)
  }

  return (
    <Bench
      title="Try it: policy challenges"
      intro="Each challenge lists requests that must be allowed or denied. Edit the statements until every row passes. The tests rerun as you change anything."
      onReset={reset}
    >
      <Segmented
        label="Challenge"
        value={activeId}
        onChange={setActiveId}
        options={challenges.map((c, i) => {
          const done = results[c.id].every((r) => r.pass)
          return {
            value: c.id,
            label: (
              <span className="inline-flex items-center gap-1.5">
                {done && <CircleCheck aria-hidden className="size-4 text-ok" />}
                {i + 1}. {c.title}
                {done && <span className="sr-only"> (solved)</span>}
              </span>
            ),
          }
        })}
      />

      <div className="mt-4 rounded-lg border border-line bg-paper px-4 py-3">
        <p className="text-sm text-ink-3">{challenge.who}</p>
        <p className="mt-0.5 text-ink">{challenge.brief}</p>
      </div>

      <div className="@container mt-5">
        <div className="grid gap-6 @3xl:grid-cols-2">
          <div className="min-w-0">
            <h4 className="font-bold text-ink">Your policy</h4>
            <div className="mt-3">
              <StatementBuilder statements={statements} onChange={setStatements} label={`Statements for challenge: ${challenge.title}`} />
            </div>
            <details className="mt-4 rounded-lg border border-line">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-bold text-ink-2">Show the policy as JSON</summary>
              <div className="px-3 pb-3">
                <CodeBlock code={json} lang="json" className="my-0!" />
              </div>
            </details>
          </div>

          <div className="min-w-0">
            <h4 className="font-bold text-ink">Required results</h4>
            <div className="mt-3 overflow-x-auto rounded-lg border border-line">
              {/* Three columns and no minimum width, so the Pass/Fail verdict stays in view even on a phone. */}
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Test requests for this challenge, with expected and actual results</caption>
                <thead className="bg-paper text-ink-3">
                  <tr className="border-b border-line">
                    <th scope="col" className="py-2 pr-2 pl-3 font-bold">Request</th>
                    <th scope="col" className="px-2 py-2 font-bold">Must be</th>
                    <th scope="col" className="py-2 pr-3 pl-2 font-bold">Your policy</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={cn('border-b border-line last:border-0', !r.pass && 'bg-bad-soft/50')}>
                      <th scope="row" className="py-2 pr-2 pl-3 align-top font-normal">
                        <span className="block font-mono break-all text-ink">{r.request.action}</span>
                        <span className="block font-mono text-xs break-all text-ink-3">{shortResource(r.request.resource)}</span>
                        <span className="block text-xs text-ink-3">{r.request.mfa ? 'with MFA' : 'without MFA'}</span>
                      </th>
                      <td className="px-2 py-2 align-top text-ink-2">{expectedLabel[r.expected]}</td>
                      <td className="py-2 pr-3 pl-2 align-top text-ink-2">
                        <span className="block">{actualLabel[r.actual]}</span>
                        {r.pass ? (
                          <span className="mt-1 inline-flex items-center gap-1 font-bold text-ok">
                            <Check aria-hidden className="size-4" />
                            Pass
                          </span>
                        ) : (
                          <span className="mt-1 inline-flex items-center gap-1 font-bold text-bad">
                            <X aria-hidden className="size-4" />
                            Fail
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div aria-live="polite" className="mt-3">
              {solved ? (
                <p className="flex items-start gap-2 rounded-md bg-ok-soft px-3 py-2.5 font-bold text-ok">
                  <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
                  Solved. Every request behaves as required.
                </p>
              ) : (
                <p className="text-sm font-bold text-ink-2">
                  {passed} of {rows.length} rows pass.
                </p>
              )}
            </div>

            <div className="mt-4">
              <Button
                size="sm"
                onClick={() => setHints((h) => ({ ...h, [challenge.id]: hintLevel > 0 ? 0 : 1 }))}
                aria-expanded={hintLevel > 0}
              >
                <Lightbulb aria-hidden />
                {hintLevel > 0 ? 'Hide hint' : 'Show hint'}
              </Button>
              {hintLevel > 0 && (
                <div className="mt-3 rounded-md border-l-4 border-az bg-signal-soft/60 px-4 py-3 text-ink-2">
                  <p>{challenge.hint}</p>
                  {hintLevel === 1 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 -ml-3"
                      onClick={() => {
                        focusSolution.current = true
                        setHints((h) => ({ ...h, [challenge.id]: 2 }))
                      }}
                    >
                      Still stuck? Show one policy that passes
                    </Button>
                  ) : (
                    <>
                      <p className="mt-3 font-bold text-ink">One policy that passes:</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {challenge.solution.map((s, i) => (
                          <li key={i}>
                            Statement {i + 1}: {s.effect} <span className="font-mono">{s.action}</span> on{' '}
                            <span className="font-mono break-all">{s.resource}</span>
                            {s.mfa ? (s.effect === 'Allow' ? ', only if signed in with MFA' : ', only if not signed in with MFA') : ''}
                          </li>
                        ))}
                      </ul>
                      <div ref={solutionRow}>
                        <Button size="sm" className="mt-3" onClick={() => setStatements(challenge.solution.map(makeStatement))}>
                          Use this policy
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Bench>
  )
}
