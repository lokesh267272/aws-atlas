import { useId, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ChevronDown, ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { checklist, type ChecklistItem } from './checklistData'

function ItemRow({
  item,
  done,
  open,
  onToggleDone,
  onToggleOpen,
}: {
  item: ChecklistItem
  done: boolean
  open: boolean
  onToggleDone: () => void
  onToggleOpen: () => void
}) {
  const reduce = useReducedMotion()
  const panelId = useId()
  const boxId = useId()
  return (
    <li className={cn('rounded-md border transition-colors', done ? 'border-ok bg-ok-soft/50' : 'border-line bg-panel')}>
      <div className="px-3 py-2.5">
        <label htmlFor={boxId} className="flex cursor-pointer items-start gap-3">
          <input
            id={boxId}
            type="checkbox"
            checked={done}
            onChange={onToggleDone}
            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--color-ok)]"
          />
          <span className="font-bold leading-snug text-ink">
            {item.title}
            {done && <span aria-hidden className="ml-2 text-sm font-bold text-ok">Done</span>}
          </span>
        </label>
        {/* On narrow screens the risk panel is far below, so each step shows its own risk line. */}
        <p className="mt-1 flex gap-2 pl-8 text-sm lg:hidden">
          {done ? (
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
          ) : (
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
          )}
          <span>
            <span className={cn('font-bold', done ? 'text-ok' : 'text-warn')}>{done ? 'Covered.' : 'At risk.'}</span>{' '}
            <span className="text-ink-2">{done ? item.covered : item.exposed}</span>
          </span>
        </p>
        <div className="pl-8">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggleOpen}
            className="mt-1 inline-flex items-center gap-1 rounded-sm text-sm font-bold text-signal hover:underline"
          >
            <ChevronDown aria-hidden className={cn('size-4 transition-transform', open && 'rotate-180')} />
            {open ? 'Hide why and how' : 'Why and how'}
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-line px-3 pb-3 pt-3 text-[0.95rem] text-ink-2 sm:pl-11">
              <p>
                <strong className="text-ink">Why: </strong>
                {item.why}
              </p>
              <div>
                <p className="font-bold text-ink">What it looks like in AWS</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 marker:text-ink-3">
                  {item.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </div>
              {item.note && <p className="text-sm text-ink-3">{item.note}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

/** Simulation 1: a first-day checklist with a progress meter and a live risk panel. */
export function SafetyChecklist() {
  const [done, setDone] = useState<Set<string>>(() => new Set())
  const [open, setOpen] = useState<Set<string>>(() => new Set(['mfa']))
  const [announce, setAnnounce] = useState('')

  const count = done.size
  const total = checklist.length
  const allDone = count === total

  const progressId = useId()
  const riskId = useId()

  const toggleDone = (item: ChecklistItem) => {
    const next = new Set(done)
    const nowDone = !next.has(item.id)
    if (nowDone) next.add(item.id)
    else next.delete(item.id)
    setDone(next)
    setAnnounce(
      `${item.title}: ${nowDone ? 'done' : 'not done'}. ${nowDone ? item.covered : item.exposed} ${next.size} of ${total} done.${
        next.size === total ? ' All steps complete.' : ''
      }`,
    )
  }

  const toggleOpen = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div>
      {/* Progress meter */}
      <div className="rounded-md border border-line bg-paper px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-bold text-ink" id={progressId}>
            Account safety: {count} of {total} done
          </p>
          <p className={cn('text-sm font-bold', allDone ? 'text-ok' : 'text-ink-3')}>
            {allDone ? 'Ready for everyday work' : `${total - count} to go`}
          </p>
        </div>
        <div
          role="progressbar"
          aria-labelledby={progressId}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={count}
          className="mt-2 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        >
          {checklist.map((item) => (
            <span
              key={item.id}
              className={cn('h-2.5 rounded-full transition-colors', done.has(item.id) ? 'bg-ok' : 'bg-sunken')}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <ol className="space-y-2" aria-label="First-day checklist">
          {checklist.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              done={done.has(item.id)}
              open={open.has(item.id)}
              onToggleDone={() => toggleDone(item)}
              onToggleOpen={() => toggleOpen(item.id)}
            />
          ))}
        </ol>

        <section aria-labelledby={riskId} className="hidden self-start rounded-md border border-line bg-paper p-3 lg:block">
          <h4 id={riskId} className="font-bold text-ink">
            What could go wrong today
          </h4>
          <ul className="mt-2 space-y-2.5">
            {checklist.map((item) => {
              const ok = done.has(item.id)
              return (
                <li key={item.id} className="flex gap-2 text-sm">
                  {ok ? (
                    <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                  ) : (
                    <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
                  )}
                  <span>
                    <span className={cn('font-bold', ok ? 'text-ok' : 'text-warn')}>
                      {item.short}: {ok ? 'covered' : 'at risk'}.
                    </span>{' '}
                    <span className="text-ink-2">{ok ? item.covered : item.exposed}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      {allDone && (
        <p className="mt-4 rounded-md bg-ok-soft px-4 py-3 text-ink">
          <strong className="text-ok">All six done.</strong> Each step follows AWS’s own advice for a new account: root
          locked away, an everyday admin, an eye on the bill, and a record of who did what.
        </p>
      )}
    </div>
  )
}
