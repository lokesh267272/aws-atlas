import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { Check, Circle, Lightbulb, Target, TriangleAlert } from 'lucide-react'
import { cn } from '../lib/cn'
import { Button, Pill } from './controls'
import {
  canHint,
  canShow,
  challengeReducer,
  initialChallenge,
  type ChallengeState,
} from './challengeState'

/** Hook holding challenge progress. Call fail() on a miss, solve() on success, show() after applying the solution; pass hint() to the panel as onHint. */
export function useChallenge() {
  const [state, dispatch] = useReducer(challengeReducer, initialChallenge)
  const fail = useCallback(() => dispatch({ type: 'fail' }), [])
  const solve = useCallback(() => dispatch({ type: 'solve' }), [])
  const show = useCallback(() => dispatch({ type: 'show' }), [])
  const hint = useCallback(() => dispatch({ type: 'hint' }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])
  return useMemo(() => ({ state, fail, solve, show, hint, reset }), [state, fail, solve, show, hint, reset])
}

const darkButton =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-screen-line bg-screen-2 px-2.5 text-sm font-bold text-screen-text transition-colors hover:border-screen-dim hover:text-white focus-visible:outline-screen-accent [&_svg]:size-4'

/** The shared challenge panel: a goal, a live checklist, a hint, a Show me escape hatch and a success note. */
export function Challenge({
  goal,
  checks,
  state,
  hint,
  onHint,
  onShowMe,
  successNote,
  tone = 'light',
  stale = false,
}: {
  goal: ReactNode
  checks: { label: ReactNode; done: boolean }[]
  state: ChallengeState
  hint: ReactNode
  /** Reveal the hint (wire to useChallenge().hint). */
  onHint: () => void
  /** Apply the lesson's solution, then call show(). */
  onShowMe: () => void
  successNote: ReactNode
  tone?: 'light' | 'screen'
  /** True when the learner changed their answer after solving it: swaps the success row for a "run it again" line. Optional; omit for the old behaviour. */
  stale?: boolean
}) {
  const screen = tone === 'screen'
  const solvedRef = useRef<HTMLDivElement>(null)
  // The Show me button unmounts when solved, so move focus to the result.
  useEffect(() => {
    if (state.shown) solvedRef.current?.focus()
  }, [state.shown])
  const hintRef = useRef<HTMLParagraphElement>(null)
  const wasHinted = useRef(state.hinted)
  // Same for the Hint button: when it unmounts on use, move focus to the revealed hint.
  useEffect(() => {
    if (state.hinted && !wasHinted.current) hintRef.current?.focus()
    wasHinted.current = state.hinted
  }, [state.hinted])
  const hintAvailable = canHint(state)
  const showAvailable = canShow(state)
  const hintButton = hintAvailable && !state.hinted

  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border p-3 sm:p-4',
        screen ? 'border-screen-line bg-screen-2 text-screen-text' : 'border-line bg-panel text-ink',
      )}
    >
      <p className="flex items-start gap-2 text-base font-bold">
        <Target aria-hidden className={cn('mt-0.5 size-5 shrink-0', screen ? 'text-screen-accent' : 'text-signal')} />
        <span>{goal}</span>
      </p>

      <ul role="list" className="mt-3 grid gap-1.5">
        {checks.map((c, i) => (
          <li
            key={i}
            className={cn(
              'flex items-start gap-2 text-sm',
              c.done ? (screen ? 'text-screen-text' : 'text-ink') : screen ? 'text-screen-dim' : 'text-ink-3',
            )}
          >
            {c.done ? (
              <Check aria-hidden className={cn('mt-0.5 size-4 shrink-0', screen ? 'text-screen-accent' : 'text-ok')} />
            ) : (
              <Circle aria-hidden className="mt-0.5 size-4 shrink-0" />
            )}
            <span>
              {c.label}
              <span className="sr-only">{c.done ? ' (done)' : ' (not done)'}</span>
            </span>
          </li>
        ))}
      </ul>

      {(hintButton || showAvailable) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {hintButton &&
            (screen ? (
              <button type="button" className={darkButton} onClick={onHint}>
                <Lightbulb aria-hidden />
                Hint
              </button>
            ) : (
              <Button size="sm" onClick={onHint}>
                <Lightbulb aria-hidden />
                Hint
              </Button>
            ))}
          {showAvailable &&
            (screen ? (
              <button type="button" className={darkButton} onClick={onShowMe}>
                Show me
              </button>
            ) : (
              <Button size="sm" onClick={onShowMe}>
                Show me
              </Button>
            ))}
        </div>
      )}

      <div aria-live="polite">
        {hintAvailable && state.hinted && (
          <p
            ref={hintRef}
            tabIndex={-1}
            className={cn('mt-2 text-sm outline-none', screen ? 'text-screen-text' : 'text-ink-2')}
          >
            {hint}
          </p>
        )}
        {state.solved && stale && (
          <p className={cn('mt-3 flex items-start gap-2 text-sm font-bold', screen ? 'text-screen-text' : 'text-warn')}>
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>You changed it: run it again to check.</span>
          </p>
        )}
        {state.solved && !stale && (
          <div
            ref={solvedRef}
            tabIndex={-1}
            className={cn(
              'mt-3 flex outline-none items-start gap-2 rounded-md p-2.5 text-sm',
              screen ? 'border border-screen-line text-screen-text' : 'bg-ok-soft text-ink',
            )}
          >
            <Pill tone="ok" className="shrink-0">
              <Check aria-hidden />
              Solved
            </Pill>
            <span>
              {state.shown && <>Here&apos;s one way to do it. </>}
              {successNote}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
