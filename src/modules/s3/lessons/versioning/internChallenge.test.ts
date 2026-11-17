import { describe, expect, it } from 'vitest'
import { canHint, canShow, challengeReducer, initialChallenge, type ChallengeState } from '../../../../components/challengeState'
import {
  SCRIPT_START,
  isPassing,
  isStale,
  runMessage,
  scriptStatus,
  scriptStep,
  showMeSteps,
  staleReason,
  type ScriptAction,
  type ScriptState,
} from './internChallenge'
import { MENU_START, current, menuMatches, runScript, setMode } from './versioningModel'

type Step = ScriptAction | { type: 'hint' }

/** Plays actions through the pure step function and the shared challenge reducer, the way the component wires them. */
function play(steps: Step[], from: { s: ScriptState; c: ChallengeState } = { s: SCRIPT_START, c: initialChallenge }) {
  let { s, c } = from
  let verdict: string | null = null
  for (const a of steps) {
    if (a.type === 'hint') {
      c = challengeReducer(c, { type: 'hint' })
      continue
    }
    const r = scriptStep(s, a)
    s = r.state
    verdict = r.verdict
    if (r.verdict) c = challengeReducer(c, { type: r.verdict })
  }
  return { s, c, verdict }
}

const ON: ScriptAction = { type: 'mode', mode: 'on' }
const RUN: ScriptAction = { type: 'run' }
const CHECK: ScriptAction = { type: 'check' }
const RESET: ScriptAction = { type: 'reset' }
const FIX_ALL: ScriptAction[] = [
  { type: 'restore', key: 'menu/biryani.jpg', versionId: 'null' },
  { type: 'remove-marker', key: 'menu/dosa.jpg' },
  { type: 'remove-marker', key: 'menu/paneer-tikka.jpg' },
]

describe("the intern's script challenge", () => {
  it('a run that destroys photos for good is a miss', () => {
    expect(scriptStep(SCRIPT_START, RUN).verdict).toBe('fail')
    const suspended = play([ON, { type: 'mode', mode: 'suspended' }])
    expect(scriptStep(suspended.s, RUN).verdict).toBe('fail')
  })

  it('a run with versioning on is not a miss', () => {
    const { s, verdict } = play([ON, RUN])
    expect(verdict).toBeNull()
    expect(s.ran).toBe(true)
  })

  it('checking the menu while it is still broken with versioning on is a miss', () => {
    const { c, verdict } = play([ON, RUN, CHECK])
    expect(verdict).toBe('fail')
    expect(c.tries).toBe(1)
  })

  it('a learner stuck on the restore step reaches the Hint after 2 misses and Show me after 3', () => {
    const two = play([ON, RUN, CHECK, CHECK])
    expect(canHint(two.c)).toBe(true)
    expect(canShow(two.c)).toBe(false)
    expect(canShow(play([CHECK], two).c)).toBe(true)
  })

  it('checking before the script has run does nothing', () => {
    const { c, verdict, s } = play([ON, CHECK])
    expect(verdict).toBeNull()
    expect(c.tries).toBe(0)
    expect(scriptStatus(s)).toMatch(/Run the script first/)
  })

  it('solves on the last restore', () => {
    const { s, c, verdict } = play([ON, RUN, ...FIX_ALL])
    expect(verdict).toBe('solve')
    expect(c.solved).toBe(true)
    expect(menuMatches(s.bucket)).toBe(true)
    // Not before the last one.
    expect(play([ON, RUN, ...FIX_ALL.slice(0, 2)]).c.solved).toBe(false)
  })

  it('solves on a check once the menu matches', () => {
    const fixed = play([ON, RUN, ...FIX_ALL])
    expect(scriptStep(fixed.s, CHECK).verdict).toBe('solve')
  })

  it('goes stale when changed after solving, and says why', () => {
    const solved = play([ON, RUN, ...FIX_ALL])
    expect(isStale(solved.c.solved, false, solved.s)).toBe(false)
    const rerun = play([RUN], solved)
    expect(isStale(rerun.c.solved, false, rerun.s)).toBe(true)
    expect(staleReason(rerun.s)).toBe('failing')
    const reset = play([RESET], solved)
    expect(isStale(reset.c.solved, false, reset.s)).toBe(true)
    expect(staleReason(reset.s)).toBe('changed')
    // Never stale while Show me plays.
    expect(isStale(true, true, rerun.s)).toBe(false)
  })

  it('Reset clears the bucket but keeps tries and the revealed hint', () => {
    const before = play([RUN, RUN, { type: 'hint' }])
    expect(before.c).toMatchObject({ tries: 2, hinted: true })
    const after = play([RESET], before)
    expect(after.verdict).toBeNull()
    expect(after.c).toEqual(before.c)
    expect(after.s).toEqual(SCRIPT_START)
  })

  it('mode changes and fixes before the run never count', () => {
    const { c } = play([ON, { type: 'mode', mode: 'suspended' }, { type: 'remove-marker', key: 'menu/dosa.jpg' }])
    expect(c).toEqual(initialChallenge)
  })

  it('Show me goes Reset, on, script, then restores everything', () => {
    const [on, ran, fixed] = showMeSteps()
    expect(on).toEqual({ ...SCRIPT_START, bucket: setMode(MENU_START, 'on'), last: { kind: 'show-on' } })
    expect(ran.bucket).toEqual(runScript(setMode(MENU_START, 'on')))
    expect(ran.ran).toBe(true)
    expect(isPassing(ran)).toBe(false)
    expect(isPassing(fixed)).toBe(true)
    expect(current(fixed.bucket, 'menu/dosa.jpg')).toBe('Dosa photo')
  })

  it('status lines are one sentence and say what to do next', () => {
    const sentences = (t: string) => (t.match(/[.!?](\s|$)/g) ?? []).length
    const broken = play([ON, RUN, CHECK]).s
    expect(scriptStatus(broken)).toMatch(/3 files still look wrong.*Restore.*Remove marker/)
    const lost = play([RUN, CHECK]).s
    expect(scriptStatus(lost)).toMatch(/gone for good.*Reset/)
    const fixed = play([ON, RUN, ...FIX_ALL, CHECK]).s
    expect(scriptStatus(fixed)).toMatch(/exactly as before/)
    for (const s of [broken, lost, fixed, play([ON, RUN]).s, play([RUN]).s]) expect(sentences(scriptStatus(s))).toBe(1)
    expect(runMessage(runScript(MENU_START))).toMatch(/off.*gone for good/)
  })
})
