import { useEffect, useRef, useState } from 'react'
import { BookOpen, Check, X } from 'lucide-react'
import { CodeBlock } from '../../../../components/CodeBlock'
import { Button } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { formatLabel, quizById } from './quizQuestions'
import { QuizResults } from './QuizResults'
import { allQuestionIds, isAnswered, isRight, newRun, type QuizRun } from './quizRun'

/**
 * Simulation: the module quiz. One question at a time, instant feedback,
 * a score at the end, and a link back to the lesson for every miss.
 */
export function Quiz() {
  const [run, setRun] = useState<QuizRun>(() => newRun(allQuestionIds))
  const questionRef = useRef<HTMLHeadingElement>(null)
  const resultRef = useRef<HTMLHeadingElement>(null)
  // Only move focus after the learner acts, never on first load.
  const focusTarget = useRef<'question' | 'result' | null>(null)

  useEffect(() => {
    const t = focusTarget.current
    if (!t) return
    focusTarget.current = null
    if (t === 'result') resultRef.current?.focus()
    else questionRef.current?.focus()
  }, [run.index, run.finished, run.ids])

  const restart = (ids: string[]) => {
    focusTarget.current = 'question'
    setRun(newRun(ids))
  }

  if (run.finished) {
    return <QuizResults run={run} headingRef={resultRef} onRestart={restart} />
  }

  const qid = run.ids[run.index]
  const q = quizById[qid]
  const picked = run.answers[qid]
  const answered = picked !== undefined
  const correct = answered && picked === q.answer
  const last = run.index === run.ids.length - 1
  const rightSoFar = run.ids.filter((id) => isAnswered(run, id) && isRight(run, id)).length
  const answeredSoFar = run.ids.filter((id) => isAnswered(run, id)).length

  const choose = (optionId: string) => {
    if (answered) return
    setRun((r) => ({ ...r, answers: { ...r.answers, [qid]: optionId } }))
  }

  const next = () => {
    if (last) {
      focusTarget.current = 'result'
      setRun((r) => ({ ...r, finished: true }))
    } else {
      focusTarget.current = 'question'
      setRun((r) => ({ ...r, index: r.index + 1 }))
    }
  }

  return (
    <div className="mx-auto max-w-[46rem]">
      {/* Progress */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-bold text-ink">
          Question {run.index + 1} of {run.ids.length}
        </p>
        <p className="text-sm text-ink-3">
          {answeredSoFar === 0 ? 'No answers yet' : `${rightSoFar} of ${answeredSoFar} right so far`}
        </p>
      </div>
      <ol aria-hidden className="mt-2 flex gap-1">
        {run.ids.map((id, i) => {
          const done = isAnswered(run, id)
          const ok = done && isRight(run, id)
          return (
            <li
              key={id}
              className={cn(
                'grid h-5 min-w-0 flex-1 place-items-center rounded-[3px]',
                done ? (ok ? 'bg-ok' : 'bg-bad') : i === run.index ? 'bg-ink' : 'bg-sunken',
              )}
            >
              {done && (ok ? <Check className="size-3 text-white" /> : <X className="size-3 text-white" />)}
            </li>
          )
        })}
      </ol>

      {/* Question */}
      <div className="mt-5 rounded-lg border border-line bg-panel p-4 sm:p-5">
        <p className="text-sm text-ink-3">{formatLabel[q.format]}</p>
        <h4 ref={questionRef} tabIndex={-1} className="mt-1 text-base font-bold leading-snug text-ink">
          {q.prompt}
        </h4>
        {/* Long lines wrap, so the part a question asks about is never hidden behind a sideways scroll on a phone. */}
        {q.code && (
          <CodeBlock
            code={q.code.code}
            lang={q.code.lang}
            title={q.code.title}
            className="my-4 [&_pre]:whitespace-pre-wrap [&_pre]:[overflow-wrap:anywhere]"
          />
        )}

        <ul className="mt-4 space-y-2">
          {run.optionOrder[qid].map((oid, i) => {
            const opt = q.options.find((o) => o.id === oid)
            if (!opt) return null
            const isPicked = picked === oid
            const showRight = answered && oid === q.answer
            const showWrong = isPicked && !correct
            return (
              <li key={oid}>
                {/* aria-disabled, not disabled, so keyboard focus stays on the chosen answer */}
                <button
                  type="button"
                  aria-disabled={answered || undefined}
                  onClick={() => choose(oid)}
                  aria-pressed={isPicked}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border px-3.5 py-2.5 text-left transition-colors aria-disabled:cursor-default',
                    !answered && 'border-line hover:border-ink hover:bg-paper',
                    showRight && 'border-ok bg-ok-soft text-ink',
                    showWrong && 'border-bad bg-bad-soft text-ink',
                    answered && !showRight && !showWrong && 'border-line text-ink-3',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[0.7rem] font-bold',
                      showRight
                        ? 'border-ok bg-ok text-white'
                        : showWrong
                          ? 'border-bad bg-bad text-white'
                          : 'border-line-strong text-ink-3',
                    )}
                  >
                    {showRight ? <Check className="size-3.5" /> : showWrong ? <X className="size-3.5" /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className={cn('min-w-0', q.monoOptions && 'font-mono text-[0.95rem]')}>{opt.text}</span>
                  {showRight && <span className="sr-only"> (correct answer)</span>}
                  {showWrong && <span className="sr-only"> (your answer, incorrect)</span>}
                </button>
              </li>
            )
          })}
        </ul>

        <div aria-live="polite">
          {answered && (
            <div className={cn('mt-4 rounded-md px-4 py-3', correct ? 'bg-ok-soft' : 'bg-bad-soft')}>
              <p className="flex items-center gap-2 font-bold text-ink">
                {correct ? (
                  <Check aria-hidden className="size-4 text-ok" />
                ) : (
                  <X aria-hidden className="size-4 text-bad" />
                )}
                {correct ? 'Correct.' : 'Not quite.'}
              </p>
              <p className="mt-1 text-ink-2">{q.explanation}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button size="sm" variant="primary" onClick={next}>
                  {last ? 'See your score' : 'Next question'}
                </Button>
                {!correct && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-ink-3">
                    <BookOpen aria-hidden className="size-4" />
                    You will get a review link at the end.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
