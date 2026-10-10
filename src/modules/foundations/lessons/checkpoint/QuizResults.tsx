import type { Ref } from 'react'
import { BookOpen, Check, RotateCcw, X } from 'lucide-react'
import { Button } from '../../../../components/controls'
import { getModule } from '../../../../course/registry'
import { href } from '../../../../lib/router'
import { quizById } from './quizQuestions'
import { allQuestionIds, isRight, type QuizRun } from './quizRun'

const lessonTitle = (lessonId: string) =>
  getModule('foundations')?.lessons.find((l) => l.id === lessonId)?.title ?? lessonId

function verdict(score: number, total: number) {
  const share = total === 0 ? 0 : score / total
  if (score === total) return 'Every answer right. The foundations are in place.'
  if (share >= 0.75) return 'A strong result. Look over the few you missed, then move on.'
  if (share >= 0.5) return 'A solid start. The lessons linked below are worth a second look.'
  return 'Worth another pass. Revisit the lessons linked below, then try again.'
}

const optionText = (questionId: string, optionId: string | undefined) =>
  quizById[questionId].options.find((o) => o.id === optionId)?.text ?? 'No answer'

/** The end of a quiz run: score, what was missed, and where to review it. */
export function QuizResults({
  run,
  headingRef,
  onRestart,
}: {
  run: QuizRun
  headingRef: Ref<HTMLHeadingElement>
  onRestart: (ids: string[]) => void
}) {
  const total = run.ids.length
  const missed = run.ids.filter((id) => !isRight(run, id))
  const score = total - missed.length
  const isFullRun = total === allQuestionIds.length

  return (
    <div className="mx-auto max-w-[46rem]">
      <div className="rounded-lg border border-line bg-panel p-4 sm:p-5">
        <h4 ref={headingRef} tabIndex={-1} className="display text-xl text-ink">
          You scored {score} out of {total}
        </h4>
        {!isFullRun && <p className="mt-1 text-sm text-ink-3">This round only repeated the questions you missed.</p>}
        <p className="mt-2 text-ink-2">{verdict(score, total)}</p>

        <ol aria-label="Your answers" className="mt-4 flex flex-wrap gap-1.5">
          {run.ids.map((id, i) => {
            const ok = isRight(run, id)
            return (
              <li
                key={id}
                className={
                  ok
                    ? 'inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-xs font-bold text-ink'
                    : 'inline-flex items-center gap-1 rounded-full bg-bad-soft px-2 py-0.5 text-xs font-bold text-ink'
                }
              >
                {ok ? (
                  <Check aria-hidden className="size-3.5 text-ok" />
                ) : (
                  <X aria-hidden className="size-3.5 text-bad" />
                )}
                <span>
                  {i + 1}
                  <span className="sr-only">: {ok ? 'right' : 'missed'}</span>
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => onRestart(allQuestionIds)}>
            <RotateCcw aria-hidden />
            Try again
          </Button>
          {missed.length > 0 && missed.length < total && (
            <Button onClick={() => onRestart(missed)}>
              Retry only the {missed.length} you missed
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-ink-3">Each new try shuffles the order of the answer options.</p>
      </div>

      {missed.length > 0 && (
        <div className="mt-6">
          <h4 className="font-bold text-ink">What to review</h4>
          <ul className="mt-3 space-y-3">
            {missed.map((id) => {
              const q = quizById[id]
              return (
                <li key={id} className="rounded-lg border border-line bg-panel p-4">
                  <p className="font-bold text-ink">{q.topic}</p>
                  <p className="mt-1 flex items-start gap-2 text-sm text-ink-2">
                    <X aria-hidden className="mt-0.5 size-4 shrink-0 text-bad" />
                    <span>
                      <span className="text-ink-3">Your answer: </span>
                      {optionText(id, run.answers[id])}
                    </span>
                  </p>
                  <p className="mt-1 flex items-start gap-2 text-sm text-ink-2">
                    <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                    <span>
                      <span className="text-ink-3">Correct answer: </span>
                      {optionText(id, q.answer)}
                    </span>
                  </p>
                  <a
                    href={href.lesson('foundations', q.lessonId)}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-signal underline underline-offset-2"
                  >
                    <BookOpen aria-hidden className="size-4 shrink-0" />
                    Review the lesson “{lessonTitle(q.lessonId)}”
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
