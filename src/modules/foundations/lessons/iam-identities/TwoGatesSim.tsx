import { useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  Ban,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  DoorClosed,
  DoorOpen,
  FileText,
  IdCard,
  Loader,
  RotateCcw,
  Trash,
  User,
  X,
} from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Segmented, buttonClass } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { scenarioInfo, stepsFor, type FileState, type GateState, type Scenario, type StationId } from './twoGatesData'

/* --------------------------------------------------------------- Pieces */

function GateStatus({ state }: { state: GateState }) {
  if (state === 'pass')
    return (
      <Pill tone="ok">
        <Check aria-hidden /> Passed
      </Pill>
    )
  if (state === 'fail')
    return (
      <Pill tone="bad">
        <X aria-hidden /> Failed
      </Pill>
    )
  if (state === 'skipped')
    return (
      <Pill>
        <Ban aria-hidden /> Never reached
      </Pill>
    )
  if (state === 'checking')
    return (
      <Pill>
        <Loader aria-hidden /> Checking
      </Pill>
    )
  return (
    <Pill>
      <CircleDashed aria-hidden /> Waiting
    </Pill>
  )
}

function Station({
  active,
  reduce,
  tone,
  children,
}: {
  active: boolean
  reduce: boolean
  tone?: 'ok' | 'bad'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'relative min-w-0 break-words rounded-md border p-3',
        tone === 'ok' ? 'border-ok bg-ok-soft/50' : tone === 'bad' ? 'border-bad bg-bad-soft/50' : 'border-line bg-panel',
      )}
    >
      {active && (
        <motion.div
          layoutId="iam-two-gates-marker"
          aria-hidden
          className="pointer-events-none absolute -inset-1.5 rounded-lg border-2 border-signal"
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }}
        />
      )}
      {active && <span className="sr-only">Current step is here.</span>}
      {children}
    </div>
  )
}

function Connector() {
  return (
    <div aria-hidden className="hidden place-items-center text-line-strong md:grid">
      <ArrowRight className="size-5" />
    </div>
  )
}

const fileWords: Record<FileState, string> = {
  present: 'still there',
  deleted: 'deleted',
  untouched: 'untouched',
}

/* ------------------------------------------------------------ Simulation */

export function TwoGatesSim() {
  const reduce = useReducedMotion() ?? false
  const [scenario, setScenario] = useState<Scenario>('sam')
  const [index, setIndex] = useState(0)
  const steps = useMemo(() => stepsFor(scenario), [scenario])
  const step = steps[index]
  const info = scenarioInfo[scenario]
  const last = index === steps.length - 1
  const nextRef = useRef<HTMLButtonElement>(null)

  const back = () => {
    if (index <= 1) nextRef.current?.focus()
    setIndex((i) => Math.max(0, i - 1))
  }

  const choose = (s: Scenario) => {
    setScenario(s)
    setIndex(0)
  }
  const reset = () => choose('sam')
  const at = (id: StationId) => step.at === id

  return (
    <Bench
      title="Try it: authentication vs authorization"
      intro="Pick who sends the request, then press Next step. Watch which gate each request passes, and where it stops."
      onReset={reset}
    >
      <Segmented
        label="Who sends the request?"
        size="sm"
        value={scenario}
        onChange={choose}
        options={(Object.keys(scenarioInfo) as Scenario[]).map((s) => ({ value: s, label: scenarioInfo[s].label }))}
      />

      {/* The four stations */}
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-[minmax(0,0.8fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Station active={at('person')} reduce={reduce}>
          <User aria-hidden className="size-6 text-ink-2" />
          <p className="mt-1 text-sm font-bold text-ink">{info.who}</p>
          <p className="text-xs text-ink-3">
            {info.isAttacker ? 'pretending to be IAM user sam' : `IAM user ${info.user}`}
          </p>
        </Station>
        <Connector />
        <Station
          active={at('authn')}
          reduce={reduce}
          tone={step.authn === 'pass' ? 'ok' : step.authn === 'fail' ? 'bad' : undefined}
        >
          <IdCard aria-hidden className="size-6 text-ink-2" />
          <p className="mt-1 text-sm font-bold text-ink">Gate 1: authentication</p>
          <p className="text-xs text-ink-3">Who are you?</p>
          <div className="mt-2">
            <GateStatus state={step.authn} />
          </div>
        </Station>
        <Connector />
        <Station
          active={at('authz')}
          reduce={reduce}
          tone={step.authz === 'pass' ? 'ok' : step.authz === 'fail' ? 'bad' : undefined}
        >
          {step.authz === 'pass' ? (
            <DoorOpen aria-hidden className="size-6 text-ink-2" />
          ) : (
            <DoorClosed aria-hidden className="size-6 text-ink-2" />
          )}
          <p className="mt-1 text-sm font-bold text-ink">Gate 2: authorization</p>
          <p className="text-xs text-ink-3">Are you allowed to do this?</p>
          <div className="mt-2">
            <GateStatus state={step.authz} />
          </div>
        </Station>
        <Connector />
        <Station active={at('resource')} reduce={reduce}>
          <span className="grid size-7 place-items-center rounded-[4px] bg-storage text-white">
            <Boxes aria-hidden className="size-4" />
          </span>
          <p className="mt-1 text-sm font-bold text-ink">example-bucket</p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-ink-3">
            {step.file === 'deleted' ? <Trash aria-hidden className="size-3.5" /> : <FileText aria-hidden className="size-3.5" />}
            <span className={step.file === 'deleted' ? 'line-through' : undefined}>report.csv</span>
            <span>({fileWords[step.file]})</span>
          </p>
        </Station>
      </div>

      {/* Controls: right under the stations, so they stay in place and next to what they change */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={back} disabled={index === 0}>
          <ChevronLeft aria-hidden />
          Back
        </Button>
        <button
          ref={nextRef}
          type="button"
          className={buttonClass('primary', 'sm')}
          onClick={() => (last ? setIndex(0) : setIndex((i) => i + 1))}
        >
          {last ? <RotateCcw aria-hidden /> : <ChevronRight aria-hidden />}
          {last ? 'Start again' : 'Next step'}
        </button>
      </div>

      {/* Narration */}
      <div className="mt-4 rounded-md border border-line bg-paper/60 px-4 py-4" aria-live="polite">
        <p className="text-sm text-ink-3">
          Step {index + 1} of {steps.length}
        </p>
        <h4 className="mt-0.5 font-bold text-ink">{step.title}</h4>
        <div className="mt-1 max-w-[68ch] text-ink-2">{step.body}</div>

        {step.request && (
          <dl className="mt-3 grid gap-x-4 gap-y-1 rounded-md bg-screen px-4 py-3 font-mono text-xs text-screen-text sm:grid-cols-[auto_minmax(0,1fr)]">
            <dt className="text-screen-dim">Principal</dt>
            <dd className="break-all">arn:aws:iam::123456789012:user/{info.user}</dd>
            <dt className="text-screen-dim">Action</dt>
            <dd>s3:DeleteObject</dd>
            <dt className="text-screen-dim">Resource</dt>
            <dd className="break-all">arn:aws:s3:::example-bucket/report.csv</dd>
          </dl>
        )}
        {step.request && (
          <p className="mt-1.5 text-xs text-ink-3">
            The Principal and Resource lines are <Term k="arn">ARNs</Term>: unique addresses AWS gives every user and
            resource.
          </p>
        )}

        {step.checks && (
          <ul className="mt-3 space-y-2">
            {step.checks.map((c) => (
              <li
                key={c.policy}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-bold text-ink">{c.policy}</span>
                  <span className="text-ink-3"> via {c.via}</span>
                  <span className="block text-xs text-ink-3">Allows {c.allows}</span>
                </span>
                {c.matches ? (
                  <Pill tone="ok">
                    <Check aria-hidden /> Matches s3:DeleteObject
                  </Pill>
                ) : (
                  <Pill>
                    <X aria-hidden /> No match
                  </Pill>
                )}
              </li>
            ))}
          </ul>
        )}

        {step.outcome && (
          <p
            className={cn(
              'mt-3 flex items-center gap-2 rounded-md px-3 py-2 font-bold',
              step.outcome === 'allowed' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad',
            )}
          >
            {step.outcome === 'allowed' ? <Check aria-hidden className="size-4" /> : <X aria-hidden className="size-4" />}
            {step.outcome === 'allowed'
              ? 'Allowed: passed both gates'
              : step.outcome === 'denied'
                ? 'Denied at gate 2: authorization'
                : 'Blocked at gate 1: authentication'}
          </p>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-3">
        Simplified: in real AWS you sign in once. After that, the console signs each request with temporary session
        credentials, and AWS checks who sent it and whether it is allowed on every single request.
      </p>
    </Bench>
  )
}
