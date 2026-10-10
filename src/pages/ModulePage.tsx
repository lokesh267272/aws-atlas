import { CircleCheck } from 'lucide-react'
import { AwsMap } from '../components/AwsMap'
import { ButtonLink } from '../components/controls'
import type { CourseModule } from '../course/types'
import { cn } from '../lib/cn'
import { href } from '../lib/router'
import { useProgress } from '../lib/progress'
import { ProgressBar } from './ModuleRow'

export function ModulePage({ module: m }: { module: CourseModule }) {
  const { isComplete, countComplete } = useProgress()
  const done = countComplete(
    m.id,
    m.lessons.map((l) => l.id),
  )
  const nextLesson = m.lessons.find((l) => !isComplete(m.id, l.id)) ?? m.lessons[0]

  return (
    <main id="main" className="mx-auto max-w-[84rem] px-4 pb-24 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="pt-8 text-sm text-ink-3">
        <a href={href.home()} className="hover:text-ink hover:underline">
          Course map
        </a>
        <span aria-hidden className="mx-2">
          /
        </span>
        <span className="text-ink-2">Module {m.number}</span>
      </nav>

      <header className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
        <div>
          <p className="display text-lg text-region-ink">Module {m.number}</p>
          <h1 className="display mt-1 text-2xl text-ink sm:text-3xl">{m.title}</h1>
          <p className="mt-2 text-lg text-ink-2">{m.tagline}</p>
          <p className="mt-4 max-w-[64ch] text-ink-2">{m.description}</p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <ProgressBar done={done} total={m.lessons.length} />
          <ButtonLink variant="primary" className="mt-4 w-full" href={href.lesson(m.id, nextLesson.id)}>
            {done === 0 ? 'Start the first lesson' : done === m.lessons.length ? 'Review from the start' : `Continue: ${nextLesson.title}`}
          </ButtonLink>
        </div>
      </header>

      <section aria-labelledby="outcomes-h" className="mt-12">
        <h2 id="outcomes-h" className="display text-xl text-ink">
          By the end you can
        </h2>
        <ul className="mt-4 grid max-w-[72rem] gap-x-8 gap-y-2 md:grid-cols-2">
          {m.outcomes.map((o) => (
            <li key={o} className="flex gap-3 text-ink-2">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-region" />
              {o}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="lessons-h" className="mt-12">
        <h2 id="lessons-h" className="display text-xl text-ink">
          Lessons
        </h2>
        <ol className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel">
          {m.lessons.map((l, i) => {
            const complete = isComplete(m.id, l.id)
            return (
              <li key={l.id}>
                <a
                  href={href.lesson(m.id, l.id)}
                  className="group grid grid-cols-[2.5rem_1fr_auto] items-start gap-3 px-4 py-4 hover:bg-paper sm:px-5"
                >
                  <span
                    className={cn(
                      'display grid size-9 place-items-center rounded-full border-2 text-base',
                      complete ? 'border-ok bg-ok text-white' : 'border-line-strong text-ink-2',
                    )}
                  >
                    {complete ? <CircleCheck aria-label="Complete" className="size-5" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-ink group-hover:underline">{l.title}</span>
                    <span className="block text-ink-2">{l.summary}</span>
                  </span>
                  <span className="whitespace-nowrap pt-0.5 text-sm text-ink-3">{l.minutes} min</span>
                </a>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="fits-h" className="mt-12">
        <h2 id="fits-h" className="display text-xl text-ink">
          Where this module fits
        </h2>
        <p className="mt-2 max-w-[64ch] text-ink-2">
          The bright parts of the map are what this module teaches. Everything else on AWS sits inside, or is controlled
          by, these pieces.
        </p>
        <AwsMap focusModuleId={m.id} className="mt-5" />
      </section>
    </main>
  )
}
