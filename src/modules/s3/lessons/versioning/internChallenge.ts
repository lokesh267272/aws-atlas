/**
 * The intern's bad script challenge, as pure transitions. The component (InternScript) holds a
 * ScriptState, sends each learner action through scriptStep, and passes the verdict to useChallenge:
 * 'fail' → fail(), 'solve' → solve(). Nothing here touches the challenge progress directly.
 */
import {
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

export type ScriptEvent =
  | { kind: 'mode'; mode: Mode }
  | { kind: 'run' }
  | { kind: 'restore' }
  | { kind: 'remove-marker' }
  | { kind: 'check' }
  | { kind: 'show-on' }
  | { kind: 'show-run' }
  | { kind: 'shown' }

export interface ScriptState {
  bucket: VBucket
  /** The script has run on this bucket since the last Reset. */
  ran: boolean
  last: ScriptEvent | null
}

export type ScriptAction =
  | { type: 'mode'; mode: Mode }
  | { type: 'run' }
  | { type: 'restore'; key: string; versionId: string }
  | { type: 'remove-marker'; key: string }
  /** The second main action: open the app and check the menu. */
  | { type: 'check' }
  | { type: 'reset' }

/** What the action means for the challenge: a miss, a solve, or neither. */
export type Verdict = 'fail' | 'solve' | null

export const SCRIPT_START: ScriptState = { bucket: MENU_START, ran: false, last: null }

/** Files with no good copy left anywhere in their history. */
export const lostFiles = (b: VBucket) => MENU_KEYS.filter((k) => !canRestore(b, k))
/** Files that don't show their photo right now. */
export const brokenFiles = (b: VBucket) => MENU_KEYS.filter((k) => current(b, k) !== MENU_BEFORE[k])

/** The goal: the script has run and the menu looks exactly as before. */
export const isPassing = (s: ScriptState) => s.ran && menuMatches(s.bucket)

export function scriptStep(s: ScriptState, a: ScriptAction): { state: ScriptState; verdict: Verdict } {
  switch (a.type) {
    case 'mode': {
      const bucket = setMode(s.bucket, a.mode)
      return { state: bucket === s.bucket ? s : { ...s, bucket, last: { kind: 'mode', mode: a.mode } }, verdict: null }
    }
    case 'run': {
      const bucket = runScript(s.bucket)
      // A miss: this run destroyed a photo for good.
      return { state: { bucket, ran: true, last: { kind: 'run' } }, verdict: lostFiles(bucket).length > 0 ? 'fail' : null }
    }
    case 'restore':
    case 'remove-marker': {
      const bucket = a.type === 'restore' ? restoreVersion(s.bucket, a.key, a.versionId) : removeMarker(s.bucket, a.key)
      const state: ScriptState = { ...s, bucket, last: { kind: a.type } }
      return { state, verdict: isPassing(state) ? 'solve' : null }
    }
    case 'check': {
      const state: ScriptState = { ...s, last: { kind: 'check' } }
      // Before the script runs there is nothing to check yet (the button is disabled then too).
      if (!s.ran) return { state, verdict: null }
      return { state, verdict: isPassing(s) ? 'solve' : 'fail' }
    }
    case 'reset':
      // Clears the bucket only. The component never resets challenge progress here (see InternScript).
      return { state: SCRIPT_START, verdict: null }
  }
}

/** Show me, as three states to play in order: Reset and turn versioning on, run the script, restore everything. */
export function showMeSteps(): ScriptState[] {
  const on = setMode(MENU_START, 'on')
  const ran = runScript(on)
  return [
    { bucket: on, ran: false, last: { kind: 'show-on' } },
    { bucket: ran, ran: true, last: { kind: 'show-run' } },
    { bucket: fixAll(ran), ran: true, last: { kind: 'shown' } },
  ]
}

/** Solved earlier, but the current setup no longer passes (never while Show me plays). */
export const isStale = (solved: boolean, showing: boolean, s: ScriptState) => solved && !showing && !isPassing(s)

export const staleReason = (s: ScriptState): 'failing' | 'changed' => (s.ran ? 'failing' : 'changed')

/** What a run of the script did, in one sentence. */
export function runMessage(b: VBucket): string {
  if (lostFiles(b).length === 0) return 'Versioning kept the old copies: restore each broken file below, then check the menu.'
  if (b.mode === 'off') return 'Versioning was off, so those photos are gone for good: press Reset to try again.'
  if (b.mode === 'suspended')
    return 'With versioning suspended, the script wrote over the old photos (their version ID was null), so they are gone for good.'
  return 'Some photos are gone for good: press Reset to try again.'
}

const files = (n: number) => (n === 1 ? '1 file' : `${n} files`)

/** The status line under the controls: what just happened and what to do next. */
export function scriptStatus(s: ScriptState): string {
  const { last, bucket } = s
  if (!last) return 'The menu looks right, and versioning is off. Choose a setting, then run the script.'
  switch (last.kind) {
    case 'mode':
      return last.mode === 'on'
        ? 'Versioning on: the next overwrite or delete keeps the old copy.'
        : 'Suspended: new writes will overwrite each photo’s null-ID copy.'
    case 'run':
      return runMessage(bucket)
    case 'restore':
    case 'remove-marker': {
      const left = brokenFiles(bucket).length
      if (left === 0) return 'Every photo is back, exactly as before.'
      return `${last.kind === 'restore' ? 'Restored' : 'Marker removed'}: ${files(left)} still to fix.`
    }
    case 'check': {
      if (!s.ran) return 'Run the script first, then check the menu.'
      if (isPassing(s)) return 'Every photo is back, exactly as before.'
      if (lostFiles(bucket).length > 0) return 'Some photos are gone for good, so press Reset to try again.'
      const left = brokenFiles(bucket).length
      return `${files(left)} still ${left === 1 ? 'looks' : 'look'} wrong: use Restore or Remove marker on each one.`
    }
    case 'show-on':
      return 'Show me: Reset, then turn versioning on before the script runs.'
    case 'show-run':
      return 'The script ran, but every old copy is kept.'
    case 'shown':
      return 'Restored the old biryani photo and removed both delete markers.'
  }
}
