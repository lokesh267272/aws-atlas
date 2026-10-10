import { useId, useRef, useState, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button } from './controls'

/** After this many wrong picks the answer is shown, so nobody gets stuck. */
const MAX_WRONG = 2

/**
 * One self-check question.
 * A wrong pick is crossed out and the learner tries again; the right answer and
 * the explanation appear after a correct pick, or after two wrong ones.
 */
export function Checkpoint({
  question,
  options,
  answer,
  explanation,
}: {
  question: ReactNode
  options: ReactNode[]
  /** Index of the correct option */
  answer: number
  /** Why the right answer is right (and, ideally, why a tempting wrong one is wrong) */
  explanation: ReactNode
}) {
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const firstOption = useRef<HTMLButtonElement>(null)
  const qid = useId()

  const revealed = solved || wrong.length >= Math.min(MAX_WRONG, options.length - 1)
  const lastPick = wrong[wrong.length - 1]

  const pick = (i: number) => {
    if (revealed || wrong.includes(i)) return
    if (i === answer) setSolved(true)
    else setWrong((w) => [...w, i])
  }

  const reset = () => {
    setWrong([])
    setSolved(false)
    requestAnimationFrame(() => firstOption.current?.focus())
  }

  return (
    <div className="my-8 max-w-[68ch] rounded-lg border border-line bg-panel">
      <div className="border-b border-line px-5 py-3">
        <h3 className="font-bold text-ink">Check yourself</h3>
      </div>
      <div className="px-5 py-4">
        <p id={qid} className="font-bold text-ink">
          {question}
        </p>
        <ul className="mt-3 space-y-2" aria-labelledby={qid}>
          {options.map((opt, i) => {
            const isWrong = wrong.includes(i)
            const isRight = revealed && i === answer
            const inactive = revealed || isWrong
            return (
              <li key={i}>
                <button
                  ref={i === 0 ? firstOption : undefined}
                  type="button"
                  aria-disabled={inactive || undefined}
                  onClick={() => pick(i)}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-md border px-3.5 py-2.5 text-left transition-colors',
                    !inactive && 'border-line hover:border-ink hover:bg-paper',
                    isRight && 'border-ok bg-ok-soft text-ink',
                    isWrong && 'border-bad/60 bg-bad-soft text-ink-2',
                    inactive && !isRight && !isWrong && 'border-line text-ink-3',
                    inactive && 'cursor-default',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[0.7rem] font-bold',
                      isRight ? 'border-ok bg-ok text-white' : isWrong ? 'border-bad bg-bad text-white' : 'border-line-strong text-ink-3',
                    )}
                  >
                    {isRight ? <Check className="size-3.5" /> : isWrong ? <X className="size-3.5" /> : String.fromCharCode(65 + i)}
                  </span>
                  <span className={cn(isWrong && 'line-through decoration-bad/60')}>{opt}</span>
                  {isRight && <span className="sr-only"> (correct answer)</span>}
                  {isWrong && <span className="sr-only"> (not correct)</span>}
                </button>
              </li>
            )
          })}
        </ul>
        <div aria-live="polite">
          {!revealed && lastPick !== undefined && (
            <p className="mt-4 rounded-md bg-bad-soft px-4 py-3 text-ink-2">
              <span className="font-bold text-bad">Not quite.</span> Try another option.
            </p>
          )}
          {revealed && (
            <div className={cn('mt-4 rounded-md px-4 py-3', solved ? 'bg-ok-soft' : 'bg-sunken')}>
              <p className={cn('font-bold', solved ? 'text-ok' : 'text-ink')}>
                {solved ? (wrong.length === 0 ? 'Correct.' : 'Correct, you got there.') : `The answer is ${String.fromCharCode(65 + answer)}.`}
              </p>
              <div className="mt-1 text-ink-2">{explanation}</div>
              <Button size="sm" variant="ghost" className="-ml-3 mt-2" onClick={reset}>
                Answer again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
