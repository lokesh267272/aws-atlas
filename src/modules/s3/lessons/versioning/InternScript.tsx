import { useCallback, useEffect, useRef, useState } from 'react'
import { Info, Play, SearchCheck, Terminal } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Term } from '../../../../components/Term'
import { s3Story } from '../../story'
import {
  SCRIPT_START,
  isStale,
  scriptStatus,
  scriptStep,
  showMeSteps,
  staleReason,
  type ScriptAction,
  type ScriptState,
} from './internChallenge'
import { ModeControl, PhotoTile, StackLegend, VersionStack } from './parts'
import { BLANK, INTERN_SCRIPT, MENU_BEFORE, MENU_KEYS, canRestore, current, type VBucket } from './versioningModel'

/** Time between the Show me steps (Reset and turn on, run the script, restore). */
const SHOW_STEP_MS = 900

export const GOAL = 'Run the script, then make the menu look exactly as it did before'
export const HINT = (
  <>
    Turn <Term k="versioning">versioning</Term> on before the script runs (Reset first), then use Restore or Remove marker on
    each broken file.
  </>
)
export const SUCCESS_NOTE = (
  <>
    <Term k="versioning">Versioning</Term> kept every older version, so the script&apos;s overwrite and deletes could all be
    undone.
  </>
)

/** One line per step of the intern's script. */
const scriptLines = INTERN_SCRIPT.map((step) =>
  step.op === 'put' ? { verb: 'Overwrite', key: step.key, rest: `with a ${BLANK.toLowerCase()}` } : { verb: 'Delete', key: step.key, rest: '' },
)

export function InternScript() {
  const reduce = useReducedMotion() === true
  const challenge = useChallenge()
  const [s, setS] = useState<ScriptState>(SCRIPT_START)
  const [showing, setShowing] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])
  // Never leave Show me playing after the lesson closes.
  useEffect(() => clearTimers, [clearTimers])

  /** Every learner action goes through the pure step; its verdict drives the shared challenge progress. */
  const send = (a: ScriptAction) => {
    if (showing) return
    const { state, verdict } = scriptStep(s, a)
    setS(state)
    if (verdict === 'fail') challenge.fail()
    if (verdict === 'solve') challenge.solve()
  }

  // Reset clears the bucket but keeps tries and the hint: Reset is part of the answer, so wiping tries would hide the Hint forever.
  const reset = () => {
    clearTimers()
    setShowing(false)
    setS(scriptStep(s, { type: 'reset' }).state)
  }

  const showMe = () => {
    clearTimers()
    const [on, ran, fixed] = showMeSteps()
    if (reduce) {
      setS(fixed)
      challenge.show()
      return
    }
    setShowing(true)
    setS(on)
    timers.current.push(
      window.setTimeout(() => setS(ran), SHOW_STEP_MS),
      window.setTimeout(() => {
        setS(fixed)
        setShowing(false)
        challenge.show()
      }, 2 * SHOW_STEP_MS),
    )
  }

  const canCheck = s.ran && !showing

  return (
    <Bench
      title="Try it: undo the intern's bad script"
      intro={
        <>
          Pick a <Term k="versioning">versioning</Term> setting, run the intern&apos;s script, then put every menu photo back
          exactly as it was.
        </>
      }
      onReset={reset}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <ModeControl mode={s.bucket.mode} onChange={(mode) => send({ type: 'mode', mode })} disabled={showing} />
          <div className="min-w-0 rounded-md border border-line bg-paper px-3 py-2">
            <p className="flex items-center gap-1.5 text-sm font-bold text-ink-2">
              <Terminal aria-hidden className="size-4 text-ink-3" />
              The intern&apos;s script
            </p>
            <ol className="mt-1 list-decimal pl-5 text-sm text-ink-2">
              {scriptLines.map((l) => (
                <li key={`${l.verb}-${l.key}`}>
                  {l.verb} <code className="font-mono text-xs [overflow-wrap:anywhere]">{l.key}</code> {l.rest}
                </li>
              ))}
            </ol>
          </div>
          {/* Primary until the script has run; then Check the menu is the next step. */}
          <Button
            variant={s.ran ? 'secondary' : 'primary'}
            className="self-center"
            aria-disabled={showing}
            onClick={() => send({ type: 'run' })}
          >
            <Play aria-hidden />
            Run the script
          </Button>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-line bg-paper px-3.5 py-3" aria-live="polite">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
          <p className="text-ink-2">{scriptStatus(s)}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold text-ink-2">{s3Story.appName}&apos;s menu, as the app sees it</p>
          <MenuPreview
            bucket={s.bucket}
            ran={s.ran}
            disabled={showing}
            onRestore={(key, versionId) => send({ type: 'restore', key, versionId })}
            onRemoveMarker={(key) => send({ type: 'remove-marker', key })}
          />
          <StackLegend />
        </div>

        <Button
          variant={s.ran ? 'primary' : 'secondary'}
          className="self-start"
          aria-disabled={!canCheck}
          onClick={() => canCheck && send({ type: 'check' })}
        >
          <SearchCheck aria-hidden />
          Check the menu
        </Button>

        <Challenge
          stale={isStale(challenge.state.solved, showing, s)}
          staleReason={staleReason(s)}
          goal={GOAL}
          checks={[
            { label: 'The script has run', done: s.ran },
            ...MENU_KEYS.map((key) => ({
              label: (
                <>
                  <code className="font-mono text-xs">{key}</code> shows its photo again
                </>
              ),
              done: s.ran && current(s.bucket, key) === MENU_BEFORE[key],
            })),
          ]}
          state={challenge.state}
          hint={HINT}
          onHint={challenge.hint}
          onShowMe={showMe}
          successNote={SUCCESS_NOTE}
        />
      </div>
    </Bench>
  )
}

/* ------------------------------------------------------------------ Parts */

/** The three menu files: what the app gets for each, and its versions with ways back. */
export function MenuPreview({
  bucket,
  ran,
  disabled = false,
  onRestore,
  onRemoveMarker,
}: {
  bucket: VBucket
  ran: boolean
  disabled?: boolean
  onRestore: (key: string, versionId: string) => void
  onRemoveMarker: (key: string) => void
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {MENU_KEYS.map((key) => {
        const now = current(bucket, key)
        const good = now === MENU_BEFORE[key]
        const lost = ran && !canRestore(bucket, key)
        return (
          <li key={key} className="flex min-w-0 flex-col gap-2 rounded-md border border-line bg-panel p-2.5">
            <code className="font-mono text-xs font-bold text-ink [overflow-wrap:anywhere]">{key}</code>
            <PhotoTile content={now} size="sm" />
            <div className="flex flex-wrap gap-1">
              {good ? (
                <Pill tone="ok">as before</Pill>
              ) : (
                <Pill tone="bad">{now === null ? 'missing' : 'blank'}</Pill>
              )}
              {lost && <Pill tone="bad">gone for good</Pill>}
            </div>
            <VersionStack
              compact
              versions={bucket.objects[key] ?? []}
              label={`Versions of ${key}, newest first`}
              disabled={disabled}
              onRestore={(id) => onRestore(key, id)}
              onRemoveMarker={() => onRemoveMarker(key)}
            />
          </li>
        )
      })}
    </ul>
  )
}
