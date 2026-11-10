import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Play, Tag } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Readout, Slider } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { CLASSES, EXAMPLE_PRICE_TAG } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, s3Story, type PrefixId } from '../../story'
import { SEVEN_YEAR_BUDGET, SIM_MONTHS, emptyRule, simulate, solution, solved, type Rule, type SimResult } from './lifecycleModel'
import { dollars, gb, money, monthName, shortName } from './format'

/** How long "Run 7 years" takes to sweep all 84 months. */
const PLAY_MS = 7000

export const START_RULES: Rule[] = PREFIX_IDS.map(emptyRule)

/** Jump points on the timeline (in months). */
const JUMPS: { label: string; month: number }[] = [
  { label: 'Day 0', month: 0 },
  { label: 'Month 1', month: 1 },
  { label: 'Month 3', month: 3 },
  { label: 'Year 1', month: 12 },
  { label: 'Year 7', month: SIM_MONTHS },
]

type Phase = 'idle' | 'playing' | 'done'

const prefixList = (ps: PrefixId[]) => ps.map((p) => FILE_TYPES[p].prefix).join(', ')

/** The seven shelves at one point in time, with what each prefix has on it. */
function Shelves({ result, month, scale }: { result: SimResult; month: number; scale: number }) {
  const bill = month > 0 ? result.months[month - 1] : null
  return (
    <ul className="grid gap-2" aria-label={`Shelves at ${monthName(month)}`}>
      {CLASSES.map((c) => {
        const stock = bill?.stock.filter((s) => s.cls === c.id) ?? []
        const current = stock.filter((s) => !s.old).reduce((n, s) => n + s.gb, 0)
        const old = stock.filter((s) => s.old).reduce((n, s) => n + s.gb, 0)
        const pct = (n: number) => `${scale > 0 ? Math.min(100, (n / scale) * 100) : 0}%`
        return (
          <li key={c.id} className="grid gap-x-3 gap-y-1 rounded-md border border-line p-2 sm:grid-cols-[13rem_1fr]">
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">
                <Term k={c.termKey}>{shortName(c.id)}</Term>
              </p>
              <p className="text-xs tabular-nums text-ink-3">
                {s3Story.currency}
                {c.storePerGbMonth}/GB-month{c.minDays > 0 ? ` · min ${c.minDays} days` : ''}
              </p>
            </div>
            <div className="min-w-0">
              <div aria-hidden className="flex h-3 overflow-hidden rounded-sm bg-sunken">
                <div
                  className="h-full bg-[var(--color-storage)] transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: pct(current) }}
                />
                <div
                  className="h-full border border-dashed border-[var(--color-storage)] transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: pct(old), borderWidth: old > 0 ? undefined : 0 }}
                />
              </div>
              {stock.length === 0 ? (
                <p className="mt-1 text-xs text-ink-3">Empty</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-1.5 text-xs text-ink-2">
                  {stock.map((s) => (
                    <li
                      key={`${s.prefix}-${s.old}`}
                      className={cn('rounded border px-1.5 py-0.5 tabular-nums', s.old ? 'border-dashed border-line-strong' : 'border-line')}
                    >
                      <code className="font-bold text-ink">{FILE_TYPES[s.prefix].prefix}</code> {s.old ? 'old versions ' : ''}
                      {gb(s.gb)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** "Tidy for 7 years": the time slider, the shelves, the bill and the challenge. */
export function Calendar({ rules, onRules }: { rules: Rule[]; onRules: (rules: Rule[]) => void }) {
  const reduce = useReducedMotion()
  const challenge = useChallenge()
  const { solve, fail, show } = challenge
  const result = useMemo(() => simulate(rules), [rules])
  const [month, setMonth] = useState(0)
  /** The last run, and the rules it ran. Changing the rules makes it stale (idle again). */
  const [run, setRun] = useState<{ rules: Rule[]; phase: 'playing' | 'done' } | null>(null)
  const phase: Phase = run && run.rules === rules ? run.phase : 'idle'
  const frame = useRef<number | undefined>(undefined)
  /** Set by Show me: the run that follows marks the challenge shown once it ends. */
  const showing = useRef(false)

  // Bars keep one scale for the whole 7 years, so they grow and shrink as time moves.
  const scale = useMemo(() => Math.max(1, ...result.months.flatMap((m) => CLASSES.map((c) => m.gbByClass[c.id]))), [result])

  const cancel = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = undefined
  }, [])

  const finish = useCallback(
    (p: Rule[]) => {
      cancel()
      setMonth(SIM_MONTHS)
      setRun({ rules: p, phase: 'done' })
      const passes = solved(simulate(p))
      if (showing.current && passes) show()
      else if (passes) solve()
      else fail()
      showing.current = false
    },
    [cancel, show, solve, fail],
  )

  const play = useCallback(
    (p: Rule[]) => {
      cancel()
      if (reduce) {
        finish(p)
        return
      }
      const start = performance.now()
      setMonth(0)
      setRun({ rules: p, phase: 'playing' })
      const tick = (now: number) => {
        const m = Math.floor(((now - start) / PLAY_MS) * SIM_MONTHS)
        if (m >= SIM_MONTHS) {
          frame.current = undefined
          finish(p)
          return
        }
        setMonth(m)
        frame.current = requestAnimationFrame(tick)
      }
      frame.current = requestAnimationFrame(tick)
    },
    [cancel, finish, reduce],
  )

  // Never leave an animation frame running after the lesson closes.
  useEffect(() => cancel, [cancel])
  // Editing a rule mid-run stops the run.
  useEffect(() => {
    if (run && run.rules !== rules) cancel()
  }, [run, rules, cancel])
  // If reduced motion is switched on mid-run, jump to the end.
  useEffect(() => {
    if (reduce && phase === 'playing') finish(rules)
  }, [reduce, phase, rules, finish])

  const scrub = (m: number) => {
    if (phase === 'playing') {
      cancel()
      setRun(null)
    }
    setMonth(m)
  }

  const showMe = () => {
    onRules(solution)
    showing.current = true
    play(solution)
  }

  const reset = () => {
    cancel()
    showing.current = false
    onRules(START_RULES)
    setRun(null)
    setMonth(0)
    challenge.reset()
  }

  const passes = solved(result)
  const underBudget = result.total <= SEVEN_YEAR_BUDGET
  const refused = PREFIX_IDS.filter((p) => result.ruleProblems[p].length > 0)
  const bill = month > 0 ? result.months[month - 1] : null
  const soFar = result.months.slice(0, month).reduce((n, m) => n + m.cost, 0)
  const done = phase === 'done'

  return (
    <Bench
      title="Try it: run 7 years of Mealhop's files"
      intro="Run 7 years or drag the time slider, and watch files slide down the shelves or vanish as the bill changes."
      onReset={reset}
    >
      <div className="mb-5">
        <Challenge
          goal={<>Tidy for 7 years: keep the bill to {dollars(SEVEN_YEAR_BUDGET)} or less without deleting anything too early</>}
          checks={[
            { label: `7-year bill ${dollars(SEVEN_YEAR_BUDGET)} or less (these rules: ${dollars(result.total)})`, done: underBudget },
            {
              label:
                result.earlyDeletes.length === 0
                  ? 'Nothing deleted before Mealhop allows'
                  : `Nothing deleted before Mealhop allows (too early: ${prefixList(result.earlyDeletes)})`,
              done: result.earlyDeletes.length === 0,
            },
            {
              label: refused.length === 0 ? 'S3 accepts every rule' : `S3 accepts every rule (refused: ${prefixList(refused)})`,
              done: refused.length === 0,
            },
          ]}
          state={challenge.state}
          stale={phase !== 'playing' && !passes}
          staleReason={done ? 'failing' : 'changed'}
          hint={
            <>
              Expire delivery/ and backups/ after 30 days and delete their old versions a day later, move receipts/ down after
              30 days and a year, and delete old menu versions after 30 days.
            </>
          }
          onHint={challenge.hint}
          onShowMe={showMe}
          successNote={
            <>
              Receipts slide to cheaper shelves and stay 7 years, while delivery photos, backups and old menu photos are really
              deleted once Mealhop no longer needs them.
            </>
          }
        />
      </div>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Button
          variant="primary"
          aria-disabled={phase === 'playing'}
          onClick={() => {
            if (phase === 'playing') return
            showing.current = false
            play(rules)
          }}
          className="min-w-40"
        >
          <Play aria-hidden />
          {phase === 'playing' ? 'Running' : done ? 'Run it again' : 'Run 7 years'}
        </Button>
        <Slider className="min-w-[min(100%,16rem)] flex-1" label="Time" value={month} min={0} max={SIM_MONTHS} onChange={scrub} format={monthName} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Jump to">
        {JUMPS.map((j) => (
          <Button key={j.label} size="sm" variant={month === j.month ? 'secondary' : 'ghost'} aria-pressed={month === j.month} onClick={() => scrub(j.month)}>
            {j.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_15rem]">
        <div className="min-w-0">
          <Shelves result={result} month={month} scale={scale} />
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm bg-[var(--color-storage)]" />
              Files in use
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm border border-dashed border-[var(--color-storage)]" />
              Old versions: hidden, still billed
            </span>
          </p>
        </div>

        <div className="min-w-0 rounded-md border border-line p-3">
          <p className="text-sm font-bold text-ink">{bill ? `${monthName(month)} bill` : 'Bill'}</p>
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums text-ink-2">
            <dt>Storage</dt>
            <dd className="text-right">{money(bill?.storageCost ?? 0)}</dd>
            <dt>
              <Term k="minimum-storage-duration">Minimum-stay</Term> charges
            </dt>
            <dd className={cn('text-right', bill && bill.minCharge > 0 && 'font-bold text-warn')}>{money(bill?.minCharge ?? 0)}</dd>
            <dt className="font-bold text-ink">This month</dt>
            <dd className="text-right font-bold text-ink">{money(bill?.cost ?? 0)}</dd>
          </dl>
          <div className="mt-3 grid gap-3 border-t border-line pt-3">
            <Readout label="Total so far" value={dollars(soFar)} tone={soFar > SEVEN_YEAR_BUDGET ? 'bad' : 'neutral'} />
            <Readout
              label={done ? '7-year total' : '7-year total (estimate)'}
              value={dollars(result.total)}
              hint={`budget ${dollars(SEVEN_YEAR_BUDGET)}; minimum-stay charges ${dollars(result.minDurationCharges)}`}
              tone={done ? (underBudget ? 'ok' : 'bad') : 'neutral'}
            />
          </div>
          <p className="mt-3">
            <Pill>
              <Tag aria-hidden />
              {EXAMPLE_PRICE_TAG}
            </Pill>
          </p>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {done
          ? `7 years done. Total ${dollars(result.total)}, budget ${dollars(SEVEN_YEAR_BUDGET)}. ${
              result.earlyDeletes.length > 0 ? `Deleted too early: ${prefixList(result.earlyDeletes)}. ` : ''
            }${refused.length > 0 ? `Refused rules: ${prefixList(refused)}.` : ''}`
          : ''}
      </p>
    </Bench>
  )
}
