import { useId, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, Globe, Play, Route, X, Zap, type LucideIcon } from 'lucide-react'
// The .tsx extension matters: on Windows "Challenge" also matches challenge.ts, which Vite tries first.
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Segmented } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { story } from '../../story'
import {
  BUDGET_PER_HOUR,
  CHALLENGE_FAMILIES,
  JOBS,
  SIZES,
  failedJobs,
  fit,
  parseTypeName,
  result,
  smallerFits,
  solution,
  startingPicks,
  typeByName,
  type ChallengeFamily,
  type Fit,
  type JobId,
  type Size,
} from './sizingModel'

const money = (n: number) => `${story.currency}${n.toFixed(2)}`

const JOB_INFO: Record<JobId, { name: string; shape: string; icon: LucideIcon }> = {
  website: { name: 'Website', shape: 'balanced', icon: Globe },
  routes: { name: 'Route planning', shape: 'CPU-heavy', icon: Route },
  cache: { name: 'Live order cache', shape: 'memory-heavy', icon: Zap },
}

const FAMILY_WORD: Record<ChallengeFamily, string> = { m: 'general', c: 'compute', r: 'memory' }
const FAMILY_DESCRIPTION: Record<ChallengeFamily, string> = {
  m: 'general purpose, 4 GiB per vCPU',
  c: 'compute optimized, 2 GiB per vCPU',
  r: 'memory optimized, 8 GiB per vCPU',
}

/** One square in a gauge stands for this much. */
const GIB_PER_CELL = 2

type Picks = Record<JobId, string>

const nameOf = (family: ChallengeFamily, size: Size) => `${family}7g.${size}`

/** The challenge: choose a type for each of the app's three jobs so every job fits and the bill stays within budget. */
export function SizingChallenge() {
  const reduce = useReducedMotion() === true
  const challenge = useChallenge()
  const [picks, setPicks] = useState<Picks>(startingPicks)
  const [ran, setRan] = useState(false)

  const res = result(picks)
  const fits = JOBS.map((job) => {
    const type = typeByName(picks[job.id])
    return { job, type, f: fit(job, type) }
  })
  const cpuOk = fits.every((x) => x.f.cpu !== 'over')
  const memoryOk = fits.every((x) => x.f.memory !== 'over')

  const pick = (id: JobId, name: string) => {
    setPicks((p) => ({ ...p, [id]: name }))
    setRan(false)
  }

  const run = () => {
    setRan(true)
    if (res.solved) challenge.solve()
    else challenge.fail()
  }

  const showMe = () => {
    setPicks(solution)
    setRan(true)
    challenge.show()
  }

  const reset = () => {
    setPicks(startingPicks)
    setRan(false)
    challenge.reset()
  }

  const failed = failedJobs(picks)
  const problems: string[] = []
  if (failed > 0) problems.push(`${failed} ${failed === 1 ? 'job' : 'jobs'} failed`)
  if (!res.withinBudget) problems.push(`${money(res.cost - BUDGET_PER_HOUR)} over budget`)
  const summary = !ran ? '' : res.solved ? `All three jobs ran for ${money(res.cost)} an hour.` : `${problems.join(', ')}.`
  // Solved earlier, but the current answer has changed or no longer passes.
  const stale = challenge.state.solved && (!ran || !res.solved)

  return (
    <Bench
      title="Try it: size three jobs"
      intro="Pick a family and size for each job, keep every gauge out of the red, then press Run the jobs."
      onReset={reset}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <div className="min-w-0">
          <GaugeKey />
          <div className="mt-3 grid gap-3">
            {fits.map(({ job, type, f }) => (
              <JobCard
                key={job.id}
                id={job.id}
                needVcpu={job.needVcpu}
                needMemoryGiB={job.needMemoryGiB}
                typeName={type.name}
                vcpu={type.vcpu}
                memoryGiB={type.memoryGiB}
                price={type.pricePerHour}
                cpu={f.cpu}
                memory={f.memory}
                smaller={!res.withinBudget && smallerFits(job, type.name)}
                ran={ran}
                reduce={reduce}
                onPick={(name) => pick(job.id, name)}
              />
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-4 lg:sticky lg:top-20">
          <CostMeter picks={picks} cost={res.cost} within={res.withinBudget} />
          <div>
            <Button variant="primary" onClick={run} className="w-full">
              <Play aria-hidden />
              Run the jobs
            </Button>
            <div aria-live="polite" className="mt-2">
              <p className={cn('text-sm', res.solved ? 'text-ok' : 'text-bad')}>{summary}</p>
              {res.solved && !ran && <Pill tone="ok">All set: press Run the jobs</Pill>}
            </div>
          </div>
          <Challenge
            goal={`Run all three jobs for ${money(BUDGET_PER_HOUR)} an hour or less`}
            checks={[
              { label: 'Every job has enough CPU', done: cpuOk },
              { label: 'Every job has enough memory', done: memoryOk },
              { label: `Total ${money(BUDGET_PER_HOUR)} an hour or less`, done: res.withinBudget },
            ]}
            state={challenge.state}
            stale={stale}
            hint="Give CPU-heavy work a c, memory-heavy work an r and balanced work an m, then pick the smallest size with no red."
            onHint={challenge.hint}
            onShowMe={showMe}
            successNote="Each job got the family shaped like its work, at the smallest size that fits, so you pay for no idle capacity."
          />
        </div>
      </div>
    </Bench>
  )
}

/* ------------------------------------------------------------------ Parts */

const cellFill: Record<Fit, string> = { ok: 'bg-ok', waste: 'bg-ink-3', over: 'bg-bad' }
const emptyCell = 'border border-line-strong bg-sunken'
const missingCell = 'border border-dashed border-bad bg-bad-soft'

function Cell({ className }: { className: string }) {
  return <span className={cn('size-3 shrink-0 rounded-[2px] motion-safe:transition-colors', className)} />
}

function GaugeKey() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
      <Pill>Example prices</Pill>
      <span>
        Each square is 1 <Term k="vcpu">vCPU</Term> or {GIB_PER_CELL} <Term k="gib">GiB</Term>:
      </span>
      <span className="inline-flex items-center gap-1">
        <Cell className={cellFill.ok} /> in use
      </span>
      <span className="inline-flex items-center gap-1">
        <Cell className={emptyCell} /> idle
      </span>
      <span className="inline-flex items-center gap-1">
        <Cell className={missingCell} /> missing
      </span>
      <span className="inline-flex items-center gap-1">
        <Cell className={cellFill.waste} /> in use, lots spare
      </span>
    </p>
  )
}

/** Squares for what the type has; the job's need fills them. Red dashed squares are what the job needs but the type lacks. */
function Gauge({ label, unit, perCell, need, have, status }: { label: string; unit: string; perCell: number; need: number; have: number; status: Fit }) {
  const haveCells = Math.round(have / perCell)
  const needCells = Math.round(need / perCell)
  const missing = Math.max(0, needCells - haveCells)
  const text =
    status === 'over'
      ? `needs ${need} ${unit}, has ${have}`
      : status === 'waste'
        ? `${need} of ${have} ${unit} in use: mostly idle`
        : `${need} of ${have} ${unit} in use`
  return (
    <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-x-2">
      <span className="text-sm font-bold text-ink-2">{label}</span>
      <div className="min-w-0">
        <div aria-hidden className="flex flex-wrap gap-0.5 pt-1">
          {Array.from({ length: haveCells }, (_, i) => (
            <Cell key={i} className={i < needCells ? cellFill[status] : emptyCell} />
          ))}
          {Array.from({ length: missing }, (_, i) => (
            <Cell key={`m${i}`} className={missingCell} />
          ))}
        </div>
        <p className={cn('text-xs', status === 'over' ? 'font-bold text-bad' : 'text-ink-3')}>{text}</p>
      </div>
    </div>
  )
}

function JobCard({
  id,
  needVcpu,
  needMemoryGiB,
  typeName,
  vcpu,
  memoryGiB,
  price,
  cpu,
  memory,
  smaller,
  ran,
  reduce,
  onPick,
}: {
  id: JobId
  needVcpu: number
  needMemoryGiB: number
  typeName: string
  vcpu: number
  memoryGiB: number
  price: number
  cpu: Fit
  memory: Fit
  /** A size one step down would also fit this job. */
  smaller: boolean
  ran: boolean
  reduce: boolean
  onPick: (name: string) => void
}) {
  const headingId = useId()
  const info = JOB_INFO[id]
  const Icon = info.icon
  const parsed = parseTypeName(typeName)
  const family = parsed.family as ChallengeFamily
  const size = parsed.size as Size
  const over = cpu === 'over' || memory === 'over'

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={cn('rounded-md border bg-paper/60 p-3', over ? 'border-bad' : 'border-line')}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0">
          <h4 id={headingId} className="flex items-center gap-2 font-bold text-ink">
            <Icon aria-hidden className="size-4 shrink-0 text-ink-2" />
            {info.name}
          </h4>
          <p className="text-sm text-ink-3">
            {info.shape}: needs {needVcpu} vCPU and {needMemoryGiB} GiB
          </p>
        </div>
        <Status cpu={cpu} memory={memory} ran={ran} reduce={reduce} />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <Segmented<ChallengeFamily>
          label="Family"
          size="sm"
          value={family}
          onChange={(f) => onPick(nameOf(f, size))}
          options={CHALLENGE_FAMILIES.map((f) => ({
            value: f,
            label: (
              <>
                <span className="font-mono">{f}</span>{' '}
                <span className="text-xs font-normal">{FAMILY_WORD[f]}</span>
              </>
            ),
            description: FAMILY_DESCRIPTION[f],
          }))}
        />
        <Segmented<Size>
          label="Size"
          size="sm"
          value={size}
          onChange={(s) => onPick(nameOf(family, s))}
          options={SIZES.map((s) => ({ value: s, label: <span className="font-mono">{s}</span> }))}
        />
      </div>

      <p className="mt-3 text-sm">
        <span className="font-mono font-bold text-ink">{typeName}</span>{' '}
        <span className="text-ink-3">
          {vcpu} vCPU, {memoryGiB} GiB, {money(price)} an hour
        </span>{' '}
        {smaller && <Pill tone="warn">Smaller fits</Pill>}
      </p>
      <div className="mt-1.5 grid gap-1.5">
        <Gauge label="CPU" unit="vCPU" perCell={1} need={needVcpu} have={vcpu} status={cpu} />
        <Gauge label="Memory" unit="GiB" perCell={GIB_PER_CELL} need={needMemoryGiB} have={memoryGiB} status={memory} />
      </div>
    </div>
  )
}

/** Live fit before a run; the outcome of the run after it. */
function Status({ cpu, memory, ran, reduce }: { cpu: Fit; memory: Fit; ran: boolean; reduce: boolean }) {
  if (!ran) {
    if (memory === 'over' && cpu === 'over') return <Pill tone="bad">Not enough CPU or memory</Pill>
    if (memory === 'over') return <Pill tone="bad">Not enough memory</Pill>
    if (cpu === 'over') return <Pill tone="bad">Not enough CPU</Pill>
    if (cpu === 'waste' || memory === 'waste') {
      const idle = cpu === 'waste' && memory === 'waste' ? 'CPU and memory' : cpu === 'waste' ? 'CPU' : 'memory'
      return <Pill>Paying for idle {idle}</Pill>
    }
    return <Pill tone="ok">Good fit</Pill>
  }
  const outcome =
    memory === 'over'
      ? { tone: 'bad' as const, icon: X, text: cpu === 'over' ? 'Crashed: out of memory and CPU' : 'Crashed: out of memory' }
      : cpu === 'over'
        ? { tone: 'bad' as const, icon: X, text: 'Too slow: out of CPU' }
        : cpu === 'waste' || memory === 'waste'
          ? { tone: 'neutral' as const, icon: Check, text: 'Ran, with idle capacity' }
          : { tone: 'ok' as const, icon: Check, text: 'Ran smoothly' }
  const Icon = outcome.icon
  return (
    <motion.span
      key={outcome.text}
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <Pill tone={outcome.tone}>
        <Icon aria-hidden />
        {outcome.text}
      </Pill>
    </motion.span>
  )
}

/** The hourly bill as a bar, one segment per job, with the budget marked. */
function CostMeter({ picks, cost, within }: { picks: Picks; cost: number; within: boolean }) {
  // The bar's full width is twice the budget, so the budget line sits in the middle.
  const scale = BUDGET_PER_HOUR * 2
  return (
    <div className="rounded-md border border-line bg-paper/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm text-ink-3">Cost per hour</div>
          <div className={cn('display text-xl tabular-nums', within ? 'text-ok' : 'text-bad')}>{money(cost)}</div>
        </div>
        <Pill>Example prices</Pill>
      </div>
      <div aria-hidden className="relative mt-3 h-4 rounded-[3px] bg-sunken">
        <div className="flex h-full overflow-hidden rounded-[3px]">
          {JOBS.map((job) => (
            <span
              key={job.id}
              className={cn('h-full shrink-0 border-r-2 border-panel motion-safe:transition-[width]', within ? 'bg-ok' : 'bg-bad')}
              style={{ width: `${(typeByName(picks[job.id]).pricePerHour / scale) * 100}%` }}
            />
          ))}
        </div>
        <span className="absolute -top-1 -bottom-1 left-1/2 w-0.5 -translate-x-1/2 bg-ink" />
      </div>
      <p className="mt-1.5 text-center text-xs text-ink-3">
        Budget line: {money(BUDGET_PER_HOUR)} an hour{cost > scale ? ', and the bill runs off the end' : ''}
      </p>
      <p className="mt-0.5 text-center text-xs font-bold text-ink-2">
        {within ? `${money(BUDGET_PER_HOUR - cost)} under budget` : `${money(cost - BUDGET_PER_HOUR)} over budget`}
      </p>
    </div>
  )
}
