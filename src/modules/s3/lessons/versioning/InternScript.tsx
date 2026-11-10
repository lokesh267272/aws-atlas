import { useCallback, useEffect, useRef, useState } from 'react'
import { Info, Play, Terminal } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Term } from '../../../../components/Term'
import { s3Story } from '../../story'
import { ModeControl, PhotoTile, StackLegend, VersionStack } from './parts'
import {
  BLANK,
  INTERN_SCRIPT,
  MENU_BEFORE,
  MENU_KEYS,
  MENU_START,
  canRestore,
  current,
  fixAll,
  menuMatches,
  removeMarker,
  restoreVersion,
  runScript,
  setMode,
  type Mode,
  type VBucket,
} from './versioningModel'

/** Time between the Show me steps (Reset and turn on, run the script, restore). */
const SHOW_STEP_MS = 900

export const GOAL = 'Run the script, then make the menu look exactly as it did before'
export const HINT = (
  <>
    Turn <Term k="versioning">versioning</Term> on before the script runs (Reset first).
  </>
)
export const SUCCESS_NOTE = (
  <>
    <Term k="versioning">Versioning</Term> kept every older version, so the script&apos;s overwrite and deletes could all be
    undone.
  </>
)

type ScriptEvent =
  | { kind: 'mode'; mode: Mode }
  | { kind: 'run' }
  | { kind: 'restore' }
  | { kind: 'remove-marker' }
  | { kind: 'show-on' }
  | { kind: 'show-run' }
  | { kind: 'shown' }

interface ScriptState {
  bucket: VBucket
  /** The script has run on this bucket since the last Reset. */
  ran: boolean
  last: ScriptEvent | null
}

const START: ScriptState = { bucket: MENU_START, ran: false, last: null }

const lostFiles = (b: VBucket) => MENU_KEYS.filter((k) => !canRestore(b, k))
const brokenFiles = (b: VBucket) => MENU_KEYS.filter((k) => current(b, k) !== MENU_BEFORE[k])

/** What a run of the script did, in one sentence. */
export function runMessage(b: VBucket): string {
  if (lostFiles(b).length === 0) return 'Versioning kept the old copies, so restore each broken file below.'
  if (b.mode === 'off') return 'Versioning was off, so those photos are gone for good: press Reset to try again.'
  if (b.mode === 'suspended')
    return 'With versioning suspended, the script replaced the null versions, so those photos are gone for good.'
  return 'Some photos are gone for good: press Reset to try again.'
}

function statusText(s: ScriptState): string {
  const { last, bucket } = s
  if (!last) return 'The menu looks right, and versioning is off. Choose a setting, then run the script.'
  switch (last.kind) {
    case 'mode':
      return last.mode === 'on'
        ? 'Versioning on: the next overwrite or delete keeps the old copy.'
        : 'Suspended: new writes will replace each photo’s null version.'
    case 'run':
      return runMessage(bucket)
    case 'restore':
    case 'remove-marker': {
      const left = brokenFiles(bucket).length
      if (left === 0) return 'Every photo is back, exactly as before.'
      return `${last.kind === 'restore' ? 'Restored' : 'Marker removed'}: ${left === 1 ? '1 file' : `${left} files`} still to fix.`
    }
    case 'show-on':
      return 'Show me: Reset, then turn versioning on before the script runs.'
    case 'show-run':
      return 'The script ran, but every old copy is kept.'
    case 'shown':
      return 'Restored the old biryani photo and removed both delete markers.'
  }
}

/** One line per step of the intern's script. */
const scriptLines = INTERN_SCRIPT.map((step) =>
  step.op === 'put' ? { verb: 'Overwrite', key: step.key, rest: `with a ${BLANK.toLowerCase()}` } : { verb: 'Delete', key: step.key, rest: '' },
)

export function InternScript() {
  const reduce = useReducedMotion() === true
  const challenge = useChallenge()
  const [s, setS] = useState<ScriptState>(START)
  const [showing, setShowing] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }, [])
  // Never leave Show me playing after the lesson closes.
  useEffect(() => clearTimers, [clearTimers])

  const passing = s.ran && menuMatches(s.bucket)

  const chooseMode = (m: Mode) => {
    if (showing) return
    const bucket = setMode(s.bucket, m)
    if (bucket !== s.bucket) setS({ ...s, bucket, last: { kind: 'mode', mode: m } })
  }

  const run = () => {
    if (showing) return
    const bucket = runScript(s.bucket)
    setS({ bucket, ran: true, last: { kind: 'run' } })
    // A miss: this run destroyed a photo for good.
    if (lostFiles(bucket).length > 0) challenge.fail()
  }

  const fix = (kind: 'restore' | 'remove-marker', bucket: VBucket) => {
    if (showing) return
    setS({ ...s, bucket, last: { kind } })
    if (s.ran && menuMatches(bucket)) challenge.solve()
  }

  /** Reset puts the bucket back but keeps challenge progress: Reset is part of the answer, so it must not hide the hint. */
  const reset = () => {
    clearTimers()
    setShowing(false)
    setS(START)
  }

  const showMe = () => {
    clearTimers()
    const on = setMode(MENU_START, 'on')
    const ran = runScript(on)
    const fixed = fixAll(ran)
    if (reduce) {
      setS({ bucket: fixed, ran: true, last: { kind: 'shown' } })
      challenge.show()
      return
    }
    setShowing(true)
    setS({ bucket: on, ran: false, last: { kind: 'show-on' } })
    timers.current.push(
      window.setTimeout(() => setS({ bucket: ran, ran: true, last: { kind: 'show-run' } }), SHOW_STEP_MS),
      window.setTimeout(() => {
        setS({ bucket: fixed, ran: true, last: { kind: 'shown' } })
        setShowing(false)
        challenge.show()
      }, 2 * SHOW_STEP_MS),
    )
  }

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
          <ModeControl mode={s.bucket.mode} onChange={chooseMode} disabled={showing} />
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
          <Button variant="primary" className="self-center" aria-disabled={showing} onClick={run}>
            <Play aria-hidden />
            Run the script
          </Button>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-line bg-paper px-3.5 py-3" aria-live="polite">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
          <p className="text-ink-2">{statusText(s)}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold text-ink-2">{s3Story.appName}&apos;s menu, as the app sees it</p>
          <MenuPreview
            bucket={s.bucket}
            ran={s.ran}
            disabled={showing}
            onRestore={(key, id) => fix('restore', restoreVersion(s.bucket, key, id))}
            onRemoveMarker={(key) => fix('remove-marker', removeMarker(s.bucket, key))}
          />
          <StackLegend />
        </div>

        <Challenge
          stale={challenge.state.solved && !showing && !passing}
          staleReason={s.ran ? 'failing' : 'changed'}
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
