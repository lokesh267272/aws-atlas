import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Camera, Check, DatabaseBackup, FileChartColumn, Flame, Image, Play, Receipt, Tag, X, type LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Readout } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { CLASSES, classById, EXAMPLE_PRICE_TAG, type ClassId, type StorageClass } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, s3Story, type PrefixId } from '../../story'
import {
  MONTH_BUDGET,
  MONTH_EVENTS,
  ONE_ZONE_AZ,
  billedDays,
  START_PLACEMENT,
  monthCost,
  playMonth,
  runMonth,
  solution,
  type BillLine,
  type Placement,
  type StepResult,
} from './classesModel'
import { dollars, money, size, within } from './format'

/** Time between events while the month plays. */
const STEP_MS = 700
const EVENTS = MONTH_EVENTS.length

const ROWS: Record<PrefixId, { icon: LucideIcon; use: string }> = {
  menu: { icon: Image, use: 'read all day by the app' },
  receipts: { icon: Receipt, use: 'downloaded now and then, kept 7 years' },
  delivery: { icon: Camera, use: 'needed only if a customer complains' },
  backups: { icon: DatabaseBackup, use: 'rarely read, needed fast after a crash' },
  reports: { icon: FileChartColumn, use: 'opened a few times, can be re-made' },
}

const selectClass =
  'mt-1 h-10 w-full min-w-0 rounded-md border border-line-strong bg-panel px-2.5 text-sm text-ink hover:border-ink'

/** How long a fetch from this shelf takes, in words. */
const waitText = (c: StorageClass) =>
  c.firstByteSeconds < 1 ? 'back in milliseconds' : c.id === 'deep-archive' ? 'a standard restore takes up to 12 hours' : 'a standard restore takes hours'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Visual B and the challenge: a shelf for each file type, then a month of fetches and an AZ destroyed. */
export function MonthBoard() {
  const reduce = useReducedMotion() === true
  const challenge = useChallenge()
  const uid = useId()
  const [placement, setPlacement] = useState<Placement>(START_PLACEMENT)
  /** How many events have played: null before a run. */
  const [shown, setShown] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  /** What to do when the current run ends (kept so reduced motion can finish it early). */
  const onDone = useRef<(() => void) | null>(null)
  /** Show me is playing: ignore shelf changes so the solution is not left half-run. */
  const showing = useRef(false)

  const steps = useMemo(() => playMonth(placement), [placement])
  const result = useMemo(() => runMonth(placement), [placement])
  const bill = useMemo(() => monthCost(placement), [placement])

  const stopTimer = useCallback(() => {
    if (timer.current !== undefined) window.clearInterval(timer.current)
    timer.current = undefined
  }, [])
  // Never leave the month playing after the lesson closes.
  useEffect(() => stopTimer, [stopTimer])

  const running = shown !== null && shown < EVENTS
  const finished = shown === EVENTS
  const revealed = (i: number) => shown !== null && i < shown

  const finish = useCallback(() => {
    stopTimer()
    setShown(EVENTS)
    const done = onDone.current
    onDone.current = null
    done?.()
  }, [stopTimer])

  // If reduced motion is switched on mid-run, jump to the end of the month.
  useEffect(() => {
    if (reduce && running) finish()
  }, [reduce, running, finish])

  /** Plays the month for `p`, one event at a time (all at once under reduced motion), then calls `done`. */
  const play = (p: Placement, done: (solved: boolean) => void) => {
    stopTimer()
    setPlacement(p)
    const solved = runMonth(p).solved
    onDone.current = () => done(solved)
    if (reduce) {
      finish()
      return
    }
    setShown(0)
    let n = 0
    timer.current = window.setInterval(() => {
      n += 1
      if (n >= EVENTS) finish()
      else setShown(n)
    }, STEP_MS)
  }

  const choose = (prefix: PrefixId, id: ClassId) => {
    if (showing.current) return
    stopTimer()
    onDone.current = null
    setShown(null)
    setPlacement((p) => ({ ...p, [prefix]: id }))
  }

  const reset = () => {
    showing.current = false
    stopTimer()
    onDone.current = null
    setShown(null)
    setPlacement(START_PLACEMENT)
    challenge.reset()
  }

  const under = bill.total <= MONTH_BUDGET
  const lateSoFar = steps.filter((s, i) => revealed(i) && s.kind === 'fetch' && !s.onTime).length
  const lostSoFar = steps.reduce((n, s, i) => (revealed(i) && s.kind === 'az-destroyed' ? n + s.lost.length : n), 0)
  const notRun = '(run the month to check)'

  return (
    <Bench
      title="Try it: find the cheapest month that still works"
      intro={
        <>
          Pick a shelf for each kind of file, run the month, and watch every fetch, the{' '}
          <Term k="availability-zone">AZ</Term> fire and the bill.
        </>
      }
      onReset={reset}
    >
      <div className="mb-5">
        <Challenge
          goal={
            <>
              Run a month of {s3Story.appName}&apos;s files for {dollars(MONTH_BUDGET)} or less, with every fetch on time
              and nothing lost
            </>
          }
          checks={[
            { label: `Bill ${dollars(MONTH_BUDGET)} or less (this plan: ${money(bill.total)})`, done: under },
            {
              label: !finished
                ? `Every fetch on time ${notRun}`
                : result.late.length === 0
                  ? 'Every fetch on time'
                  : `Every fetch on time (${result.late.length} late)`,
              done: finished && result.late.length === 0,
            },
            {
              label: !finished
                ? `No file lost when an AZ is destroyed ${notRun}`
                : result.lost.length === 0
                  ? 'No file lost when an AZ is destroyed'
                  : `No file lost when an AZ is destroyed (${result.lost.map((p) => FILE_TYPES[p].prefix).join(', ')} lost)`,
              done: finished && result.lost.length === 0,
            },
          ]}
          state={challenge.state}
          stale={challenge.state.solved && !running && !(finished && result.solved)}
          staleReason={finished && !result.solved ? 'failing' : 'changed'}
          hint={
            <>
              Keep menu photos on <Term k="s3-standard">Standard</Term>, put the rarely read files on{' '}
              <Term k="s3-standard-ia">Standard-IA</Term>, and use <Term k="s3-one-zone-ia">One Zone-IA</Term> only for
              reports, which can be re-made.
            </>
          }
          onHint={challenge.hint}
          onShowMe={() => {
            showing.current = true
            play(solution, () => {
              showing.current = false
              challenge.show()
            })
          }}
          successNote="Every fetch came back in time, only files you can re-make sat in one AZ, and the whole bill, minimum days included, fit the budget."
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-ink-2">{s3Story.appName}&apos;s files</h4>
          <ul className="mt-2 grid gap-2">
            {PREFIX_IDS.map((id) => (
              <FileRow key={id} id={id} uid={uid} value={placement[id]} onPick={(c) => choose(id, c)} />
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3">
            <Button
              variant="primary"
              aria-disabled={running}
              onClick={() => !running && play(placement, (ok) => (ok ? challenge.solve() : challenge.fail()))}
              className="min-w-40"
            >
              <Play aria-hidden />
              {running ? 'Running the month' : 'Run the month'}
            </Button>
            <Readout label="Late fetches" value={shown === null ? '–' : lateSoFar} tone={lateSoFar > 0 ? 'bad' : finished ? 'ok' : 'neutral'} />
            <Readout label="File types lost" value={shown === null ? '–' : lostSoFar} tone={lostSoFar > 0 ? 'bad' : finished ? 'ok' : 'neutral'} />
          </div>
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-bold text-ink-2">The month</h4>
          <ol aria-label="The month, event by event" className="mt-2 divide-y divide-line rounded-md border border-line bg-panel">
            {steps.map((s, i) => (
              <EventRow
                key={i}
                step={s}
                placement={placement}
                revealed={revealed(i)}
                now={running && shown === i}
                reduce={reduce}
              />
            ))}
          </ol>
        </div>
      </div>

      <Bill placement={placement} finished={finished} />

      <p className="sr-only" aria-live="polite">
        {finished
          ? `Month over. Bill ${money(bill.total)}, budget ${dollars(MONTH_BUDGET)}. ${plural(result.late.length, 'late fetch', 'late fetches')}, ${plural(
              result.lost.length,
              'kind of file',
              'kinds of file',
            )} lost.`
          : ''}
      </p>
    </Bench>
  )
}

/* ------------------------------------------------------------------ Parts */

export function FileRow({ id, uid, value, onPick }: { id: PrefixId; uid: string; value: ClassId; onPick: (c: ClassId) => void }) {
  const ft = FILE_TYPES[id]
  const { icon: Icon, use } = ROWS[id]
  const selectId = `${uid}-${id}`
  const days = billedDays(id, value)
  const deleted = ft.deleteAfterKeep && ft.keepDays !== null ? `, deleted after ${ft.keepDays} days` : ''
  return (
    <li className="rounded-md border border-line bg-paper/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-bold text-ink">
            <Icon aria-hidden className="size-4 shrink-0 text-ink-2" />
            {ft.label}
            <code className="rounded bg-sunken px-1.5 py-0.5 text-xs text-ink">{ft.prefix}</code>
          </p>
          <p className="text-sm text-ink-3">
            {size(ft.storedGb)}, {use}
            {deleted}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <label htmlFor={selectId} className="text-xs font-bold text-ink-2">
            Shelf<span className="sr-only"> for {ft.label.toLowerCase()}</span>
          </label>
          <select id={selectId} className={selectClass} value={value} onChange={(e) => onPick(e.target.value as ClassId)}>
            {CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {value === 'intelligent-tiering' && (
        <p className="mt-1.5 text-xs text-ink-3">Standard price this month (nothing has gone 30 days unread yet), plus a fee per object</p>
      )}
      {days && (
        <p className="mt-1.5 text-xs font-bold text-warn">
          <Term k="minimum-storage-duration">Minimum</Term>: lives {days.lives} days, billed {days.billed} on this shelf
        </p>
      )}
    </li>
  )
}

function EventRow({
  step,
  placement,
  revealed,
  now,
  reduce,
}: {
  step: StepResult
  placement: Placement
  revealed: boolean
  now: boolean
  reduce: boolean
}) {
  if (step.kind === 'az-destroyed') {
    const name = s3Story.azs[step.event.az]
    return (
      <li className={cn('px-3 py-2 transition-colors', now && 'bg-signal-soft')}>
        <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Flame aria-hidden className="size-4 shrink-0 text-ink-3" />
          A fire: {name} is destroyed
        </p>
        <p className="text-xs text-ink-3">Files with copies in other AZs survive</p>
        <AzMap placement={placement} destroyed={revealed ? step.event.az : null} />
        {revealed && (
          <div className="mt-2 flex flex-wrap gap-1">
            {step.lost.map((p) => (
              <Appear key={p} reduce={reduce}>
                <Pill tone="bad">
                  <X aria-hidden />
                  {FILE_TYPES[p].prefix} lost
                </Pill>
              </Appear>
            ))}
            {step.remade.map((p) => (
              <Appear key={p} reduce={reduce}>
                <Pill tone="ok">
                  <Check aria-hidden />
                  {FILE_TYPES[p].prefix} re-made from the database
                </Pill>
              </Appear>
            ))}
            {step.lost.length === 0 && step.remade.length === 0 && (
              <Appear reduce={reduce}>
                <Pill tone="ok">
                  <Check aria-hidden />
                  nothing lost
                </Pill>
              </Appear>
            )}
          </div>
        )}
      </li>
    )
  }

  const { event, onTime, fee } = step
  const c = classById(placement[event.prefix])
  const Icon = ROWS[event.prefix].icon
  return (
    <li className={cn('px-3 py-2 transition-colors', now && 'bg-signal-soft')}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
            {event.label}
          </p>
          <p className="text-xs text-ink-3">
            {size(event.gb)} from <code>{FILE_TYPES[event.prefix].prefix}</code>, needed within {within(event.deadlineSeconds)}
          </p>
          {revealed && (
            <p className="text-xs text-ink-2">
              {c.name}: {waitText(c)}, {fee === 0 ? 'no fetch fee' : `fetch fee ${money(fee)}`}
            </p>
          )}
        </div>
        {revealed && (
          <Appear reduce={reduce}>
            <Pill tone={onTime ? 'ok' : 'bad'}>
              {onTime ? <Check aria-hidden /> : <X aria-hidden />}
              {onTime ? 'on time' : 'late'}
            </Pill>
          </Appear>
        )}
      </div>
    </li>
  )
}

/** The Region's three AZs and which file types keep a copy in each. One Zone-IA files live only in ONE_ZONE_AZ. */
function AzMap({ placement, destroyed }: { placement: Placement; destroyed: number | null }) {
  return (
    <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
      {s3Story.azs.map((az, i) => {
        const gone = destroyed === i
        const here = PREFIX_IDS.filter((p) => classById(placement[p]).azs === 3 || i === ONE_ZONE_AZ)
        return (
          <div
            key={az}
            className={cn(
              'min-w-0 rounded-[3px] border-2 border-dashed p-1.5 transition-colors',
              gone ? 'border-line-strong bg-sunken' : 'border-az',
            )}
          >
            <p className={cn('text-xs font-bold', gone ? 'text-ink-3' : 'text-az-ink')}>
              {az}
              {gone && ': destroyed'}
            </p>
            <ul className="mt-1 flex flex-wrap gap-1">
              {here.map((p) => {
                const only = classById(placement[p]).azs === 1
                return (
                  <li
                    key={p}
                    className={cn(
                      'rounded px-1 py-0.5 font-mono text-[11px] leading-none',
                      only ? 'border border-warn text-warn' : 'bg-sunken text-ink-2',
                      gone && 'line-through opacity-60',
                    )}
                  >
                    {FILE_TYPES[p].prefix}
                    {only && <span className="sr-only"> (stored only in this AZ)</span>}
                  </li>
                )
              })}
              {here.length === 0 && <li className="text-[11px] text-ink-3">no copies</li>}
            </ul>
          </div>
        )
      })}
      <p className="text-[11px] text-ink-3 sm:col-span-3">
        <span className="rounded border border-warn px-1 font-mono text-warn">outlined</span> ={' '}
        <Term k="s3-one-zone-ia">One Zone-IA</Term>: stored in one AZ only
      </p>
    </div>
  )
}

/**
 * The month's bill, one line per file type: keeping (storage colour), extra minimum days (paler storage colour),
 * fetching and monitoring.
 */
export function Bill({ placement, finished }: { placement: Placement; finished: boolean }) {
  const { lines, total } = monthCost(placement)
  const under = total <= MONTH_BUDGET
  const lineTotal = (l: BillLine) => l.store + l.minDuration + l.fetch + l.monitoring
  const scale = Math.max(20, ...lines.map(lineTotal))
  return (
    <div className="mt-5 rounded-md border border-line bg-paper/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-ink-2">{finished ? 'The bill' : 'The bill (estimate)'}</h4>
        <Pill>
          <Tag aria-hidden />
          {EXAMPLE_PRICE_TAG}
        </Pill>
      </div>
      <ul className="mt-2 grid gap-2">
        {lines.map((l) => {
          const days = billedDays(l.prefix, placement[l.prefix])
          return (
            <li key={l.prefix} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4.5rem] items-center gap-x-2">
              <code className="truncate text-xs font-bold text-ink">{FILE_TYPES[l.prefix].prefix}</code>
              <span aria-hidden className="flex h-3 min-w-0 overflow-hidden rounded-[3px] bg-sunken">
                <span className="h-full bg-storage motion-safe:transition-[width]" style={{ width: `${(l.store / scale) * 100}%` }} />
                <span
                  className="h-full bg-storage/45 motion-safe:transition-[width]"
                  style={{ width: `${(l.minDuration / scale) * 100}%` }}
                />
                <span className="h-full bg-ink-3 motion-safe:transition-[width]" style={{ width: `${(l.fetch / scale) * 100}%` }} />
                <span className="h-full bg-warn motion-safe:transition-[width]" style={{ width: `${(l.monitoring / scale) * 100}%` }} />
              </span>
              <span className="text-right text-sm font-bold tabular-nums text-ink">{money(lineTotal(l))}</span>
              <span className="col-span-3 text-xs text-ink-3">
                keep {money(l.store)}, fetch {money(l.fetch)}
                {l.monitoring > 0 && <>, monitoring {money(l.monitoring)}</>}
              </span>
              {days && l.minDuration > 0 && (
                <span className="col-span-3 text-xs font-bold text-warn">
                  minimum days: lives {days.lives} days, billed {days.billed}: +{money(l.minDuration)}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-t border-line pt-2">
        <Readout
          label={finished ? 'Month bill' : 'Month bill (estimate)'}
          value={money(total)}
          tone={under ? 'ok' : 'bad'}
          hint={under ? `${money(MONTH_BUDGET - total)} under the ${dollars(MONTH_BUDGET)} budget` : `${money(total - MONTH_BUDGET)} over the ${dollars(MONTH_BUDGET)} budget`}
        />
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-3">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[2px] bg-storage" /> keep
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[2px] bg-storage/45" /> minimum days
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[2px] bg-ink-3" /> fetch
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-[2px] bg-warn" /> monitoring
          </li>
        </ul>
      </div>
    </div>
  )
}

/** Fades a status in when it first appears (instantly under reduced motion). */
function Appear({ reduce, children }: { reduce: boolean; children: ReactNode }) {
  return (
    <motion.span
      className="inline-flex"
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduce ? 0 : 0.3 }}
    >
      {children}
    </motion.span>
  )
}
