import type { CourseModule } from '../course/types'
import { href } from '../lib/router'
import { useProgress } from '../lib/progress'

export function ProgressBar({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label={`${done} of ${total} lessons complete`}
        className="h-1.5 overflow-hidden rounded-full bg-sunken"
      >
        <div className="h-full rounded-full bg-region transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-ink-3">
        {done} of {total} lessons complete
      </p>
    </div>
  )
}

/** One module in the course list. */
export function ModuleRow({ module: m }: { module: CourseModule }) {
  const { countComplete } = useProgress()
  const done = countComplete(
    m.id,
    m.lessons.map((l) => l.id),
  )
  const minutes = m.lessons.reduce((sum, l) => sum + l.minutes, 0)
  return (
    <a
      href={href.module(m.id)}
      className="group grid gap-4 rounded-lg border border-line bg-panel px-5 py-4 transition-colors hover:border-ink sm:grid-cols-[auto_1fr_14rem] sm:items-center"
    >
      <span className="display grid size-12 place-items-center rounded-md bg-ink text-lg text-white">{m.number}</span>
      <span className="min-w-0">
        <span className="display block text-lg text-ink group-hover:underline">{m.title}</span>
        <span className="block text-ink-2">{m.tagline}</span>
        <span className="mt-1 block text-sm text-ink-3">
          {m.lessons.length} lessons, about {Math.round(minutes / 5) * 5} minutes
        </span>
      </span>
      <ProgressBar done={done} total={m.lessons.length} />
    </a>
  )
}
