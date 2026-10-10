import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { CircleCheck, CircleX, FileCode, Monitor, SquareTerminal } from 'lucide-react'
import { Pill, Segmented, Switch } from '../../../../components/controls'
import {
  accessDeniedError,
  alreadyExistsError,
  CALLER_NAME,
  DENIED_CALLER_NAME,
  makeUser,
  nameTaken,
  userNameProblem,
} from './iamSim'
import { RequestFlow, toolNames, type Outcome, type Run, type Tool } from './RequestFlow'
import { CliPanel, ConsolePanel, SdkPanel } from './ToolPanels'

const STEP_MS = 750

const outcomeText: Record<Outcome, string> = {
  created: 'User created',
  exists: 'Name already taken',
  denied: 'Access denied',
}

/** Simulation 2: create the same IAM user from the console, the CLI or boto3, and watch one request flow. */
export function ThreeWays() {
  const reduce = useReducedMotion()
  const [tool, setTool] = useState<Tool>('console')
  const [name, setName] = useState('Bob')
  const [denied, setDenied] = useState(false)
  const [users, setUsers] = useState<string[]>([CALLER_NAME, DENIED_CALLER_NAME])
  const [run, setRun] = useState<Run | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [stage, setStage] = useState(0)
  const [announce, setAnnounce] = useState('')
  const timers = useRef<number[]>([])
  const counter = useRef(0)
  const flowRef = useRef<HTMLHeadingElement>(null)

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const problem = userNameProblem(name)
  const taken = problem ? null : (users.find((u) => u.toLowerCase() === name.toLowerCase()) ?? null)

  const go = () => {
    if (problem) return
    clearTimers()
    // On narrow screens the request flow sits below the form: bring it into view so the learner sees it play.
    const flow = flowRef.current
    if (flow && flow.getBoundingClientRect().top > window.innerHeight * 0.6) {
      flow.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
    counter.current += 1
    let outcome: Outcome = 'created'
    if (denied) outcome = 'denied'
    else if (nameTaken(users, name)) outcome = 'exists'
    const r: Run = { n: counter.current, tool, name, outcome }
    if (outcome === 'created') {
      r.user = makeUser(name)
      setUsers((u) => [...u, name])
    } else if (outcome === 'exists') {
      r.error = alreadyExistsError(name)
    } else {
      r.error = accessDeniedError(name)
    }
    setRun(r)
    setRuns((prev) => [r, ...prev].slice(0, 6))
    const summary = `${toolNames[tool]} sent CreateUser for ${name}. Result: ${outcomeText[outcome]}. CloudTrail recorded the event.`
    if (reduce) {
      setStage(5)
      setAnnounce(summary)
      return
    }
    setStage(1)
    setAnnounce('')
    for (let s = 2; s <= 5; s++) {
      timers.current.push(
        window.setTimeout(() => {
          setStage(s)
          if (s === 5) setAnnounce(summary)
        }, STEP_MS * (s - 1)),
      )
    }
  }

  const panelProps = { name, setName, problem, taken, onRun: go }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <Segmented
            label="Choose your tool"
            value={tool}
            onChange={setTool}
            options={[
              { value: 'console', label: <><Monitor aria-hidden className="size-4" />Console</> },
              { value: 'cli', label: <><SquareTerminal aria-hidden className="size-4" />CLI</> },
              { value: 'sdk', label: <><FileCode aria-hidden className="size-4" />Python SDK</> },
            ]}
          />
          <div className="mt-4 rounded-md border border-line bg-paper px-3 py-3">
            <Switch
              label="Send it as ReadOnlyAnna, who has no permission to create users"
              checked={denied}
              onChange={setDenied}
            />
            <p className="mt-2 text-sm text-ink-3">
              Users in this account: <span className="font-mono text-ink-2">{users.join(', ')}</span>
            </p>
          </div>
          <div className="mt-4">
            {tool === 'console' && <ConsolePanel {...panelProps} />}
            {tool === 'cli' && <CliPanel {...panelProps} />}
            {tool === 'sdk' && <SdkPanel {...panelProps} />}
          </div>
        </div>

        <div className="min-w-0">
          <h4 ref={flowRef} className="mb-3 scroll-mt-20 font-bold text-ink">
            What happens next, whichever tool you use
          </h4>
          <RequestFlow run={run} stage={stage} />
          {run === null && (
            <p className="mt-3 text-sm text-ink-3">Run the action from any tab to watch the request travel.</p>
          )}
        </div>
      </div>

      {runs.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 font-bold text-ink">
            Your runs, newest first. The tool changes; the API call does not: every run sent{' '}
            <code className="font-mono font-normal">CreateUser</code>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Your runs, newest first</caption>
              <thead>
                <tr className="border-b border-line-strong text-ink-3">
                  <th scope="col" className="py-1.5 pr-3 font-bold">Tool</th>
                  <th scope="col" className="py-1.5 pr-3 font-bold">User name</th>
                  <th scope="col" className="py-1.5 font-bold">Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.n} className="border-b border-line">
                    <td className="py-1.5 pr-3 text-ink">{toolNames[r.tool]}</td>
                    <td className="max-w-[8rem] truncate py-1.5 pr-3 font-mono text-ink-2 sm:max-w-[12rem]">{r.name}</td>
                    <td className="py-1.5">
                      {r.outcome === 'created' ? (
                        <Pill tone="ok">
                          <CircleCheck aria-hidden />
                          {outcomeText[r.outcome]}
                        </Pill>
                      ) : (
                        <Pill tone="bad">
                          <CircleX aria-hidden />
                          {outcomeText[r.outcome]}
                        </Pill>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <p className="mt-5 text-xs text-ink-3">
        Simulated. Nothing is sent to AWS. Simplified: the request and reply are shown in a readable form (your tools build
        and decode the real format for you), and real IAM also weighs other policy types before it allows a request.
      </p>
    </div>
  )
}
