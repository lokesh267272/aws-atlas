import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Play, RefreshCw } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Segmented } from '../../../../components/controls'
import { CodeBlock } from '../../../../components/CodeBlock'
import { evaluate, type AccessRequest, type Evaluation, type Statement } from './evaluate'
import { kindOf, requestActions, requestResources, shortResource, simulatorStart, simulatorStartRequest } from './data'
import { policyToJson } from './policyJson'
import { StatementBuilder, type StatementMark } from './StatementBuilder'
import { DecisionFlow, FINAL_PHASE, decisionText } from './DecisionFlow'
import { ChecksTable } from './ChecksTable'

interface Run {
  evaluation: Evaluation
  request: AccessRequest
  key: string
}

const keyOf = (statements: Statement[], request: AccessRequest) =>
  JSON.stringify({ s: statements.map(({ effect, action, resource, mfa }) => [effect, action, resource, mfa]), request })

const selectClass =
  'mt-1 h-10 w-full min-w-0 rounded-md border border-line-strong bg-panel px-2.5 font-mono text-sm text-ink hover:border-ink'

/** Delay between flowchart steps, in milliseconds. */
const STEP_MS = 650

export function PolicySimulator() {
  const uid = useId()
  const reduce = useReducedMotion()
  const [statements, setStatements] = useState<Statement[]>(simulatorStart)
  const [request, setRequest] = useState<AccessRequest>(simulatorStartRequest)
  const [run, setRun] = useState<Run | null>(null)
  const [phase, setPhase] = useState(0)
  /**
   * One live region that always exists. It is emptied on Evaluate and filled when the result shows,
   * so the result is announced even with reduced motion, and even when it repeats the last one.
   */
  const [announcement, setAnnouncement] = useState('')
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const json = useMemo(() => policyToJson(statements), [statements])
  const currentKey = keyOf(statements, request)
  const stale = run !== null && run.key !== currentKey
  const finished = run !== null && phase >= FINAL_PHASE && !stale

  const onEvaluate = () => {
    clearTimers()
    const evaluation = evaluate(statements, request)
    const { title, detail } = decisionText(evaluation)
    const message = `${request.action} on ${shortResource(request.resource)}: ${title}. ${detail}`
    setRun({ evaluation, request, key: currentKey })
    setAnnouncement('')
    if (reduce) {
      setPhase(FINAL_PHASE)
      timers.current.push(window.setTimeout(() => setAnnouncement(message), 100))
      return
    }
    setPhase(1)
    for (let p = 2; p <= FINAL_PHASE; p++) {
      timers.current.push(
        window.setTimeout(() => {
          setPhase(p)
          if (p === FINAL_PHASE) setAnnouncement(message)
        }, STEP_MS * (p - 1)),
      )
    }
  }

  const reset = () => {
    clearTimers()
    setStatements(simulatorStart())
    setRequest(simulatorStartRequest())
    setRun(null)
    setPhase(0)
    setAnnouncement('')
  }

  const marks: StatementMark[] = useMemo(() => {
    if (!finished || !run) return []
    const e = run.evaluation
    if (e.decision === 'explicit-deny') {
      return [
        ...e.denyMatches.map((index) => ({ index, tone: 'bad' as const, label: 'Decided: Deny' })),
        ...e.allowMatches.map((index) => ({ index, tone: 'neutral' as const, label: 'Matched, but overruled' })),
      ]
    }
    return e.allowMatches.map((index) => ({ index, tone: 'ok' as const, label: 'Decided: Allow' }))
  }, [finished, run])

  const highlight = useMemo(() => {
    const lines: number[] = []
    for (const m of marks) {
      if (m.tone === 'neutral') continue
      const [a, b] = json.ranges[m.index] ?? [0, -1]
      for (let n = a; n <= b; n++) lines.push(n)
    }
    return lines
  }, [marks, json])

  const kind = kindOf(request.action)
  const setAction = (action: string) => {
    const nextKind = kindOf(action)
    const keep = requestResources[nextKind].some((r) => r.arn === request.resource)
    setRequest({ ...request, action, resource: keep ? request.resource : requestResources[nextKind][0].arn })
  }

  return (
    <Bench
      title="Try it: the policy simulator"
      intro="Build a policy, choose a request to test against it, and press Evaluate. Watch which step decides, and which statement did it. Then change one thing and predict the answer before you evaluate again."
      onReset={reset}
    >
      <div className="@container">
        {/*
          Wide: statements and JSON on the left, request and result on the right.
          Narrow: statements, then request and result, then the JSON, so the editor and the Evaluate button stay close.
        */}
        <div className="grid gap-6 @3xl:grid-cols-2 @3xl:grid-rows-[auto_1fr]">
          <div className="min-w-0">
            <h4 className="font-bold text-ink">Write the policy</h4>
            <div className="mt-3">
              <StatementBuilder statements={statements} onChange={setStatements} marks={marks} label="Policy statements" />
            </div>
          </div>

          <div className="min-w-0 @3xl:row-span-2">
            <h4 className="font-bold text-ink">Test a request</h4>
            <div className="mt-3 space-y-3 rounded-lg border border-line bg-paper p-3.5">
              <div>
                <label htmlFor={`${uid}-action`} className="text-sm font-bold text-ink-2">
                  Action the person tries
                </label>
                <select
                  id={`${uid}-action`}
                  className={selectClass}
                  value={request.action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  {requestActions.map((a) => (
                    <option key={a.action} value={a.action}>
                      {a.action} ({a.plain})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-res`} className="text-sm font-bold text-ink-2">
                  On this resource
                </label>
                <select
                  id={`${uid}-res`}
                  className={selectClass}
                  value={request.resource}
                  onChange={(e) => setRequest({ ...request, resource: e.target.value })}
                  aria-describedby={`${uid}-res-d`}
                >
                  {requestResources[kind].map((r) => (
                    <option key={r.arn} value={r.arn}>
                      {r.arn}
                    </option>
                  ))}
                </select>
                <p id={`${uid}-res-d`} className="mt-1 text-sm text-ink-3">
                  Only resources this action can work on are listed.
                </p>
              </div>
              <Segmented
                size="sm"
                label="Signed in with MFA?"
                value={request.mfa ? 'yes' : 'no'}
                onChange={(v) => setRequest({ ...request, mfa: v === 'yes' })}
                options={[
                  { value: 'yes', label: 'Yes' },
                  { value: 'no', label: 'No' },
                ]}
              />
              <Button variant="primary" onClick={onEvaluate} className="w-full">
                {stale ? <RefreshCw aria-hidden /> : <Play aria-hidden />}
                {stale ? 'Evaluate again' : 'Evaluate'}
              </Button>
            </div>

            <div className="mt-4">
              {stale && (
                <p role="status" className="mb-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-ink">
                  You changed the policy or the request. This result is out of date: press Evaluate again.
                </p>
              )}
              <DecisionFlow evaluation={run?.evaluation ?? null} request={run?.request ?? null} phase={phase} stale={stale} />
              <p aria-live="polite" className="sr-only">
                {announcement}
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <CodeBlock code={json.code} lang="json" title="policy.json (updates as you edit)" highlight={highlight} className="my-0!" />
          </div>
        </div>

        {run && phase >= FINAL_PHASE && (
          <ChecksTable evaluation={run.evaluation} className={stale ? 'mt-6 opacity-50' : 'mt-6'} />
        )}

        <p className="mt-4 text-xs text-ink-3">
          Simplified: this simulator checks one identity-based policy in one account. Real AWS also checks
          resource-based policies, permissions boundaries, session policies and AWS Organizations policies, and some
          actions involve more than one resource.
        </p>
      </div>
    </Bench>
  )
}
