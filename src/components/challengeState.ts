/** Failed tries before the Hint button appears. */
export const HINT_AFTER = 2
/** Failed tries before the Show me button appears. */
export const SHOW_AFTER = 3

/** Progress through one challenge. */
export interface ChallengeState {
  tries: number
  solved: boolean
  shown: boolean
  /** The learner has asked for the hint. */
  hinted: boolean
}

export const initialChallenge: ChallengeState = { tries: 0, solved: false, shown: false, hinted: false }

export type ChallengeAction = { type: 'fail' } | { type: 'solve' } | { type: 'show' } | { type: 'hint' } | { type: 'reset' }

/** Pure state machine for a challenge: fail counts tries, solve/show finish it, reset starts over. */
export function challengeReducer(s: ChallengeState, a: ChallengeAction): ChallengeState {
  switch (a.type) {
    case 'fail':
      return s.solved ? s : { ...s, tries: s.tries + 1 }
    case 'solve':
      return { ...s, solved: true }
    case 'show':
      return { ...s, solved: true, shown: true }
    case 'hint':
      return canHint(s) ? { ...s, hinted: true } : s
    case 'reset':
      return initialChallenge
  }
}

/** True once the learner has failed enough times to be offered a hint. */
export function canHint(s: ChallengeState): boolean {
  return !s.solved && s.tries >= HINT_AFTER
}

/** True once the learner has failed enough times to be offered the answer. */
export function canShow(s: ChallengeState): boolean {
  return !s.solved && s.tries >= SHOW_AFTER
}
