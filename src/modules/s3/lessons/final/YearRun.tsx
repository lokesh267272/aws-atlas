import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'
import { Bot, Calculator, Check, FileChartColumn, Flame, Play, Receipt, Tag, Terminal, TrendingUp, X, type LucideIcon } from 'lucide-react'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Button, Pill, Readout } from '../../../../components/controls'
import { Bench } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { EXAMPLE_PRICE_TAG } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, s3Story } from '../../story'
import { ONE_ZONE_AZ } from '../classes/classesModel'
import { dollars, money } from '../lifecycle/format'
import { BUSY_FACTOR, simulateYear, solution, START, YEAR_BUDGET, YEAR_MONTHS, type LogLine, type StoreConfig, type YearEventKind, type YearResult } from './finalModel'
import { StoreSetup } from './StoreSetup'

/** Time each month stays on screen while the year plays. */
const STEP_MS = 550

const EVENT: Record<YearEventKind, { icon: LucideIcon; title: ReactNode }> = {
  'intern-script': { icon: Terminal, title: "The intern's script overwrites and deletes menu photos" },
  'receipt-last-month': { icon: Receipt, title: "Customer #1042 wants last month's receipt within a minute" },
  'bot-probe': {
    icon: Bot,
    title: (
      <>
        A bot probes the <Term k="bucket">bucket</Term>
      </>
    ),
  },
  'reports-reopened': { icon: FileChartColumn, title: "A manager re-opens last year's reports" },
  'receipts-5-years': { icon: Calculator, title: 'The accountant asks for 5-year-old receipts, within 2 days' },
  'busy-month': { icon: TrendingUp, title: `A busy month: ${BUSY_FACTOR} times the usual traffic` },
  'az-destroyed': {
    icon: Flame,
    title: (
      <>
        A fire destroys the <Term k="availability-zone">AZ</Term> {s3Story.azs[ONE_ZONE_AZ]}
      </>
    ),
  },
}

export const HINT = (
  <>
    Keep <Term k="block-public-access">Block Public Access</Term> on, let the server <Term k="iam-role">role</Term> read both{' '}
    <Term k="prefix">prefixes</Term> and sign receipt <Term k="presigned-url">links</Term>, and turn{' '}
    <Term k="versioning">versioning</Term> on. Then keep menu photos on <Term k="s3-standard">S3 Standard</Term> and reports on{' '}
    <Term k="s3-one-zone-ia">One Zone-IA</Term>, put the rest on <Term k="s3-standard-ia">Standard-IA</Term>, move receipts to{' '}
    <Term k="s3-glacier-instant-retrieval">Glacier Instant Retrieval</Term> at 30 days and{' '}
    <Term k="s3-glacier-deep-archive">Deep Archive</Term> at a year, <Term k="expiration-action">expire</Term> delivery
    photos and backups at 30 days, and delete <Term k="noncurrent-version">old versions</Term> after 1 day (menu photos after
    30).
  </>
)

export const SUCCESS_NOTE = (
  <>
    Every piece did its job: the <Term k="bucket">bucket</Term> stayed private, <Term k="versioning">versioning</Term> undid
    the intern, files that can&apos;t be re-made survived the fire, and <Term k="lifecycle-rule">rules</Term> kept the bill
    down.
  </>
)

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** What one event cost Mealhop, in a few words for its pill. */
function harm(l: LogLine): string {
  const parts: string[] = []
  if (l.lost) parts.push(`${l.lost} lost`)
  if (l.leaked) parts.push(`${l.leaked} leaked`)
  if (l.late) parts.push(`${l.late} late`)
  return parts.join(', ')
}

/** The final challenge: set up the whole bucket, then run a year of events against it. */
export function YearRun() {
  const reduce = useReducedMotion() === true
  const challenge = useChallenge()
  const [config, setConfig] = useState<StoreConfig>(START)
  /** Months played so far: null before a run, 12 when the year is over. */
  const [shown, setShown] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const onDone = useRef<(() => void) | null>(null)
  /** Show me is playing: ignore edits so the solution isn't left half-run. */
  const showing = useRef(false)
  const stripRef = useRef<HTMLDivElement>(null)

  const result = useMemo(() => simulateYear(config), [config])

  const stopTimer = useCallback(() => {
    if (timer.current !== undefined) window.clearInterval(timer.current)
    timer.current = undefined
  }, [])
  // Never leave the year playing after the lesson closes.
  useEffect(() => stopTimer, [stopTimer])

  const running = shown !== null && shown < YEAR_MONTHS
  const finished = shown === YEAR_MONTHS

  const finish = useCallback(() => {
    stopTimer()
    setShown(YEAR_MONTHS)
    const done = onDone.current
    onDone.current = null
    done?.()
  }, [stopTimer])

  // Reduced motion switched on mid-run: jump to the end of the year.
  useEffect(() => {
    if (reduce && running) finish()
  }, [reduce, running, finish])

  /** Plays the year for `c`, one month at a time (all at once under reduced motion), then calls `done`. */
  const play = (c: StoreConfig, done: (solved: boolean) => void) => {
    stopTimer()
    setConfig(c)
    const solved = simulateYear(c).solved
    onDone.current = () => done(solved)
    stripRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
    if (reduce) {
      finish()
      return
    }
    setShown(0)
    let n = 0
    timer.current = window.setInterval(() => {
      n += 1
      if (n >= YEAR_MONTHS) finish()
      else setShown(n)
    }, STEP_MS)
  }

  const change = (c: StoreConfig) => {
    if (showing.current) return
    stopTimer()
    onDone.current = null
    setShown(null)
    setConfig(c)
  }

  const reset = () => {
    showing.current = false
    stopTimer()
    onDone.current = null
    setShown(null)
    setConfig(START)
    challenge.reset()
  }

  const run = () => {
    if (running) return
    play(config, (ok) => (ok ? challenge.solve() : challenge.fail()))
  }

  const showMe = () => {
    showing.current = true
    play(solution, () => {
      showing.current = false
      challenge.show()
    })
  }

  const seen = result.log.filter((l) => shown !== null && l.month <= shown)
  const lostSoFar = seen.reduce((n, l) => n + l.lost, 0)
  const leakedSoFar = seen.reduce((n, l) => n + l.leaked, 0)
  const lateSoFar = seen.reduce((n, l) => n + l.late, 0)
  const costSoFar = result.months.slice(0, shown ?? 0).reduce((n, m) => n + m.cost, 0)
  const under = result.cost <= YEAR_BUDGET
  const notRun = '(run the year to check)'
  const after = (ok: boolean, label: string, bad: string) => (!finished ? `${label} ${notRun}` : ok ? label : `${label} (${bad})`)

  return (
    <Bench
      title={`Try it: build ${s3Story.appName}'s file store`}
      intro={
        <>
          Set up every piece below, press <strong className="text-ink-2">Run the year</strong>, then read the log: it says what
          held and what broke.
        </>
      }
      onReset={reset}
    >
      <Challenge
        goal={<>Build {s3Story.appName}&apos;s file store and get it through a year</>}
        checks={[
          { label: after(result.lost === 0, 'No files lost', `${result.lost} lost`), done: finished && result.lost === 0 },
          { label: after(result.leaked === 0, 'No files leaked', `${result.leaked} leaked`), done: finished && result.leaked === 0 },
          { label: after(result.late === 0, 'Every request on time', `${result.late} late`), done: finished && result.late === 0 },
          // Like the other three, ticked only by a run; before one, the label shows this setup's estimate.
          { label: `Year bill ${dollars(YEAR_BUDGET)} or less (this setup: ${dollars(result.cost)})`, done: finished && under },
        ]}
        state={challenge.state}
        stale={challenge.state.solved && !running && !(finished && result.solved)}
        staleReason={finished && !result.solved ? 'failing' : 'changed'}
        hint={HINT}
        onHint={challenge.hint}
        onShowMe={showMe}
        successNote={SUCCESS_NOTE}
      />

      <div className="mt-5">
        <StoreSetup config={config} onChange={change} />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-line pt-4">
        <Button variant="primary" aria-disabled={running} onClick={run} className="min-w-40">
          <Play aria-hidden />
          {running ? 'Running the year' : 'Run the year'}
        </Button>
        <Readout label="Files lost" value={shown === null ? '–' : lostSoFar} tone={lostSoFar > 0 ? 'bad' : finished ? 'ok' : 'neutral'} />
        <Readout label="Files leaked" value={shown === null ? '–' : leakedSoFar} tone={leakedSoFar > 0 ? 'bad' : finished ? 'ok' : 'neutral'} />
        <Readout label="Late requests" value={shown === null ? '–' : lateSoFar} tone={lateSoFar > 0 ? 'bad' : finished ? 'ok' : 'neutral'} />
        <Readout
          label={shown === null ? 'Year bill (estimate)' : finished ? 'Year bill' : 'Bill so far'}
          value={dollars(shown === null || finished ? result.cost : costSoFar)}
          hint={
            running
              ? `budget ${dollars(YEAR_BUDGET)}`
              : under
                ? `${dollars(YEAR_BUDGET - result.cost)} under the ${dollars(YEAR_BUDGET)} budget`
                : `${dollars(result.cost - YEAR_BUDGET)} over the ${dollars(YEAR_BUDGET)} budget`
          }
          tone={running ? 'neutral' : under ? 'ok' : 'bad'}
        />
      </div>

      <div ref={stripRef} className="mt-4 scroll-mt-20">
        <YearStrip result={result} shown={shown} running={running} />
      </div>
      <YearLog result={result} shown={shown} running={running} />
      <YearBill result={result} finished={finished} />

      <p className="sr-only" aria-live="polite">
        {finished
          ? `Year over. ${plural(result.lost, 'file')} lost, ${plural(result.leaked, 'file')} leaked, ${plural(result.late, 'late request')}. Bill ${dollars(
              result.cost,
            )}, budget ${dollars(YEAR_BUDGET)}.`
          : ''}
      </p>
    </Bench>
  )
}

/* ------------------------------------------------------------------ Strip */

/**
 * The year at a glance: one column per month. The dashed outline is the month's bill; it fills in as the month
 * plays. The dashed line across is the budget's share per month. Events sit above their month.
 */
function YearStrip({ result, shown, running }: { result: YearResult; shown: number | null; running: boolean }) {
  const pace = YEAR_BUDGET / YEAR_MONTHS
  const top = Math.max(pace * 1.4, ...result.months.map((m) => m.cost))
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`
  return (
    <div aria-hidden className="min-w-0">
      <div className="flex gap-[3px]">
        {result.months.map((m) => {
          const line = result.log.find((l) => l.month === m.month)
          const Icon = line ? EVENT[line.kind].icon : null
          const revealed = shown !== null && m.month <= shown
          return (
            <div key={m.month} className="flex min-w-0 flex-1 justify-center">
              {Icon && line && (
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border [&_svg]:size-3.5',
                    !revealed ? 'border-line-strong text-ink-3' : line.ok ? 'border-ok bg-ok-soft text-ok' : 'border-bad bg-bad-soft text-bad',
                  )}
                >
                  {revealed ? line.ok ? <Check /> : <X /> : <Icon />}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="relative mt-1 flex h-20 items-end gap-[3px] border-b border-line-strong">
        <span className="absolute inset-x-0 border-t border-dashed border-ink-3" style={{ bottom: pct(pace) }} />
        {result.months.map((m) => {
          const revealed = shown !== null && m.month <= shown
          const now = running && shown === m.month
          return (
            <div key={m.month} className={cn('relative h-full min-w-0 flex-1 rounded-t-[2px]', now && 'bg-signal-soft')}>
              <span
                className="absolute inset-x-0 bottom-0 rounded-t-[2px] border border-dashed border-line-strong"
                style={{ height: pct(m.cost) }}
              />
              {revealed && <span className="absolute inset-x-0 bottom-0 rounded-t-[2px] bg-storage/80" style={{ height: pct(m.cost) }} />}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-[3px] text-center text-[11px] tabular-nums text-ink-3">
        {result.months.map((m) => (
          <span key={m.month} className="min-w-0 flex-1">
            {m.month}
          </span>
        ))}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-[2px] bg-storage/80" /> Month&apos;s bill
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-4 border-t border-dashed border-ink-3" /> Budget per month
        </li>
      </ul>
    </div>
  )
}

/* -------------------------------------------------------------------- Log */

/** One line per event: what was asked, then (once its month has played) what happened and why. */
function YearLog({ result, shown, running }: { result: YearResult; shown: number | null; running: boolean }) {
  return (
    <ol aria-label="The year, event by event" className="mt-4 divide-y divide-line rounded-md border border-line bg-panel">
      {result.log.map((l) => {
        const { icon: Icon, title } = EVENT[l.kind]
        const revealed = shown !== null && l.month <= shown
        const now = running && shown === l.month
        return (
          <li key={l.kind} className={cn('flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3 py-2 transition-colors', now && 'bg-signal-soft')}>
            <div className="min-w-0 flex-1">
              <p className="flex items-start gap-1.5 text-sm font-bold text-ink">
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
                <span>
                  <span className="font-normal text-ink-3">Month {l.month}: </span>
                  {title}
                </span>
              </p>
              {revealed && <p className="mt-0.5 pl-5.5 text-sm text-ink-2">{l.text}</p>}
            </div>
            {revealed && (
              <Pill tone={l.ok ? 'ok' : 'bad'} className="shrink-0">
                {l.ok ? <Check aria-hidden /> : <X aria-hidden />}
                {l.ok ? 'fine' : harm(l)}
              </Pill>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/* ------------------------------------------------------------------- Bill */

/** Where the year's money goes: keeping and fetching each kind of file, plus any minimum-duration charges. */
function YearBill({ result, finished }: { result: YearResult; finished: boolean }) {
  const scale = Math.max(1, ...PREFIX_IDS.map((p) => result.byPrefix[p].storage + result.byPrefix[p].fetch), result.minCharges)
  return (
    <div className="mt-4 rounded-md border border-line bg-paper/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-ink-2">{finished ? 'Where the money went' : 'Where the money goes (estimate)'}</h4>
        <Pill>
          <Tag aria-hidden />
          {EXAMPLE_PRICE_TAG}
        </Pill>
      </div>
      <ul className="mt-2 grid gap-2">
        {PREFIX_IDS.map((p) => {
          const b = result.byPrefix[p]
          return (
            <li key={p} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4.5rem] items-center gap-x-2">
              <code className="truncate text-xs font-bold text-ink">{FILE_TYPES[p].prefix}</code>
              <span aria-hidden className="flex h-3 min-w-0 overflow-hidden rounded-[3px] bg-sunken">
                <span className="h-full bg-storage" style={{ width: `${(b.storage / scale) * 100}%` }} />
                <span className="h-full bg-ink-3" style={{ width: `${(b.fetch / scale) * 100}%` }} />
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-ink">{dollars(b.storage + b.fetch)}</span>
              <span className="col-span-3 text-xs text-ink-3">
                keep {money(b.storage)}, fetch {money(b.fetch)}
              </span>
            </li>
          )
        })}
        {result.minCharges > 0.005 && (
          <li className="text-xs font-bold text-warn">
            <Term k="minimum-storage-duration">Minimum-duration</Term> charges: {money(result.minCharges)}
          </li>
        )}
      </ul>
      <div className="mt-3 flex flex-wrap justify-end border-t border-line pt-2">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[2px] bg-storage" /> keep
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[2px] bg-ink-3" /> fetch
          </li>
        </ul>
      </div>
    </div>
  )
}
