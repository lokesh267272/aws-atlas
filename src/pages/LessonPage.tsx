import { Component, Suspense, lazy, useMemo, type ErrorInfo, type ReactNode } from 'react'
import { Check, ChevronLeft, ChevronRight, CircleCheck } from 'lucide-react'
import { Button, ButtonLink } from '../components/controls'
import type { CourseModule, LessonMeta } from '../course/types'
import { cn } from '../lib/cn'
import { href } from '../lib/router'
import { useProgress } from '../lib/progress'

class LessonErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lesson crashed', error, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-lg border border-bad bg-bad-soft p-5">
          <p className="font-bold text-bad">This lesson stopped working.</p>
          <p className="mt-1 text-ink-2">
            {this.state.error.message}. Reload the page to try again; your progress is kept.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

const lazyCache = new Map<LessonMeta['load'], ReturnType<typeof lazy>>()
function useLessonComponent(lesson: LessonMeta) {
  return useMemo(() => {
    let C = lazyCache.get(lesson.load)
    if (!C) {
      C = lazy(lesson.load)
      lazyCache.set(lesson.load, C)
    }
    return C
  }, [lesson])
}

function LessonRail({ module: m, current }: { module: CourseModule; current: string }) {
  const { isComplete } = useProgress()
  return (
    <ol className="space-y-0.5">
      {m.lessons.map((l, i) => {
        const active = l.id === current
        const complete = isComplete(m.id, l.id)
        return (
          <li key={l.id}>
            <a
              href={href.lesson(m.id, l.id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'grid grid-cols-[1.5rem_1fr] items-start gap-2 rounded-md px-2 py-1.5 text-sm',
                active ? 'bg-panel font-bold text-ink shadow-[inset_3px_0_0_var(--color-region)]' : 'text-ink-2 hover:bg-sunken hover:text-ink',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-5 place-items-center rounded-full text-[0.7rem] font-bold',
                  complete ? 'bg-ok text-white' : active ? 'bg-ink text-white' : 'border border-line-strong text-ink-3',
                )}
              >
                {complete ? <Check aria-label="Complete" className="size-3" /> : i + 1}
              </span>
              <span className="leading-snug">{l.title}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}

export function LessonPage({
  module: m,
  lesson,
  index,
  prev,
  next,
}: {
  module: CourseModule
  lesson: LessonMeta
  index: number
  prev?: LessonMeta
  next?: LessonMeta
}) {
  const LessonBody = useLessonComponent(lesson)
  const { isComplete, setComplete } = useProgress()
  const complete = isComplete(m.id, lesson.id)

  return (
    <div className="mx-auto grid max-w-[84rem] gap-8 px-4 pb-24 sm:px-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:px-8">
      {/* Lesson list: a sidebar on wide screens, a collapsible list on small ones */}
      <nav aria-label={`Lessons in Module ${m.number}`} className="pt-6 lg:pt-10">
        <div className="lg:sticky lg:top-20">
          <a href={href.module(m.id)} className="block text-sm text-ink-3 hover:text-ink hover:underline">
            Module {m.number}
          </a>
          <p className="display text-lg text-ink">{m.title}</p>
          <details className="mt-3 rounded-lg border border-line bg-panel p-2 lg:hidden">
            <summary className="cursor-pointer px-2 py-1 text-sm font-bold text-ink">
              Lesson {index + 1} of {m.lessons.length}: show all lessons
            </summary>
            <div className="mt-2">
              <LessonRail module={m} current={lesson.id} />
            </div>
          </details>
          <div className="mt-4 hidden lg:block">
            <LessonRail module={m} current={lesson.id} />
          </div>
        </div>
      </nav>

      <main id="main" className="min-w-0 max-w-[60rem] lg:pt-10">
        <header className="border-b border-line pb-8">
          <p className="text-sm text-ink-3">
            Lesson {index + 1} of {m.lessons.length}
            <span className="mx-2" aria-hidden>
              /
            </span>
            about {lesson.minutes} minutes
          </p>
          <h1 className="display mt-2 text-2xl text-ink sm:text-3xl">{lesson.title}</h1>
          <p className="mt-3 max-w-[60ch] text-lg text-ink-2">{lesson.summary}</p>
        </header>

        <div className="pt-10">
          <LessonErrorBoundary key={lesson.id}>
            <Suspense fallback={<p className="text-ink-3">Loading the lesson…</p>}>
              <LessonBody />
            </Suspense>
          </LessonErrorBoundary>
        </div>

        <footer className="mt-16 border-t border-line pt-8">
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-panel p-5">
            {complete ? (
              <>
                <CircleCheck aria-hidden className="size-6 text-ok" />
                <p className="flex-1 font-bold text-ink">You marked this lesson complete.</p>
                <Button size="sm" variant="ghost" onClick={() => setComplete(m.id, lesson.id, false)}>
                  Mark as not complete
                </Button>
              </>
            ) : (
              <>
                <p className="flex-1 text-ink-2">Finished reading and tried the simulations?</p>
                <Button variant="primary" onClick={() => setComplete(m.id, lesson.id, true)}>
                  <Check aria-hidden />
                  Mark lesson complete
                </Button>
              </>
            )}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <a
                href={href.lesson(m.id, prev.id)}
                className="group flex items-center gap-3 rounded-lg border border-line px-4 py-3 hover:border-ink"
              >
                <ChevronLeft aria-hidden className="size-5 text-ink-3" />
                <span>
                  <span className="block text-sm text-ink-3">Previous lesson</span>
                  <span className="block font-bold text-ink group-hover:underline">{prev.title}</span>
                </span>
              </a>
            ) : (
              <span />
            )}
            {next ? (
              <a
                href={href.lesson(m.id, next.id)}
                className="group flex items-center justify-end gap-3 rounded-lg border border-line bg-panel px-4 py-3 text-right hover:border-ink"
              >
                <span>
                  <span className="block text-sm text-ink-3">Next lesson</span>
                  <span className="block font-bold text-ink group-hover:underline">{next.title}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 text-ink-3" />
              </a>
            ) : (
              <ButtonLink href={href.module(m.id)} className="h-auto justify-end py-3">
                Back to the module overview
              </ButtonLink>
            )}
          </div>
        </footer>
      </main>
    </div>
  )
}
