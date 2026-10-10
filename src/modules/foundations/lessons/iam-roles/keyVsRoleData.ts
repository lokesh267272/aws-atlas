/**
 * Data and state for "Try it: key in the code vs a role".
 * Times are simulated minutes since midnight; the clock starts at 09:00.
 */

export type Mode = 'key' | 'role'
export type ActorId = 'laptop' | 'repo' | 'bot' | 'bucket' | 'app' | 'imds' | 'sts'
export type PacketKind = 'key' | 'request' | 'creds' | 'data' | 'delete'
export type Tone = 'neutral' | 'ok' | 'bad' | 'warn'

export interface SimStep {
  title: string
  body: string
  /** Actors taking part in this step; the rest fade back */
  active: ActorId[]
  hop?: { from: string; to: string; label: string; packet: PacketKind; tone?: 'neutral' | 'bad' | 'ok' }
  /** Key-path only: what has happened to the key so far */
  keyStatus?: { label: string; tone: Tone }
  /** Key-path only: who holds a working copy of the key */
  holders?: string[]
}

export const steps: Record<Mode, SimStep[]> = {
  key: [
    {
      title: 'You paste the key into your code',
      body: 'You create an access key for an IAM user and paste both halves into the app’s code. The app works on the first try. The key now lives in that file, in every copy of it, and in your Git history.',
      active: ['laptop'],
      keyStatus: { label: 'In your code', tone: 'warn' },
      holders: ['You'],
    },
    {
      title: 'You push the code to a public repository',
      body: 'You share the project on a public code site so a friend can help. Anyone on the internet can now read every file, including the one with the key. Deleting the line later does not help: the old version stays in the history.',
      active: ['laptop', 'repo'],
      hop: { from: 'Your laptop', to: 'Public repository', label: 'git push, with the key inside', packet: 'key', tone: 'bad' },
      keyStatus: { label: 'Public on the internet', tone: 'bad' },
      holders: ['You', 'Anyone who opens the repository'],
    },
    {
      title: 'A bot finds the key within minutes',
      body: 'Automated bots scan public code sites all day, looking for anything shaped like an AWS access key. Security researchers who leaked test keys on purpose have seen them found and used within minutes.',
      active: ['repo', 'bot'],
      hop: { from: 'Public repository', to: 'Scanning bot', label: 'key copied', packet: 'key', tone: 'bad' },
      keyStatus: { label: 'Copied by a stranger', tone: 'bad' },
      holders: ['You', 'Anyone who opens the repository', 'Whoever runs the bot'],
    },
    {
      title: 'The stranger uses your key',
      body: 'AWS sees a valid key, so it says yes. It cannot tell your app from a stranger holding the same key. The stranger can do everything the key’s user is allowed to do: download every photo, and, if that user has wider permissions, run servers on your bill.',
      active: ['bot', 'bucket'],
      hop: { from: 'Scanning bot', to: 'example-photos', label: 's3:GetObject signed with your key: allowed', packet: 'key', tone: 'bad' },
      keyStatus: { label: 'In use by a stranger', tone: 'bad' },
      holders: ['You', 'Anyone who opens the repository', 'Whoever runs the bot'],
    },
    {
      title: 'Someone notices and deletes the key',
      body: 'Hours or days later, a strange bill or an alert makes you look. You delete the key, and it stops working for everyone, including your own app, until you put a new key everywhere it is needed. Until this moment the key never expired on its own.',
      active: ['laptop'],
      hop: { from: 'You', to: 'IAM', label: 'delete the access key', packet: 'delete' },
      keyStatus: { label: 'Deleted', tone: 'neutral' },
      holders: [],
    },
  ],
  role: [
    {
      title: 'The server wears a role',
      body: 'Instead of a key, you attach the PhotoReader role to the EC2 instance through an instance profile. The code holds no secrets at all, so there is nothing to leak from Git.',
      active: ['app'],
    },
    {
      title: 'The app asks for credentials',
      body: 'When the app first talks to S3, the AWS SDK looks for credentials. On EC2 it asks the instance metadata service, a local address that only programs on this instance can reach. You write no code for this.',
      active: ['app', 'imds'],
      hop: { from: 'Photo app', to: 'Instance metadata', label: '“Credentials, please.” The SDK asks for you.', packet: 'request' },
    },
    {
      title: 'AWS STS issues temporary credentials',
      body: 'Behind the scenes, EC2 gets a set of temporary credentials for the PhotoReader role from AWS STS and places it in the instance metadata, where the app picks it up. The set has an access key ID, a secret access key, a session token and an expiration time.',
      active: ['sts', 'imds', 'app'],
      hop: { from: 'AWS STS', to: 'Photo app', label: 'temporary credentials, delivered through the instance metadata', packet: 'creds', tone: 'ok' },
    },
    {
      title: 'The app reads photos from S3',
      body: 'The app signs its request with the temporary credentials. AWS checks the role’s permissions policy, which allows reading files in example-photos, and S3 sends the photo back.',
      active: ['app', 'bucket'],
      hop: { from: 'Photo app', to: 'example-photos', label: 's3:GetObject beach.jpg: allowed', packet: 'data', tone: 'ok' },
    },
    {
      title: 'Fresh credentials arrive before expiry',
      body: 'At least five minutes before the current set expires, EC2 puts a new set in place and the SDK picks it up. Your app never notices. The simulation skips ahead to that moment and then lets the clock run. A set that someone copied still stops working when its own time runs out.',
      active: ['sts', 'imds'],
      hop: { from: 'AWS STS', to: 'Instance metadata', label: 'a fresh set, before the old one expires', packet: 'creds', tone: 'ok' },
    },
  ],
}

/** Index of the role-path step where credentials first exist. */
export const ISSUE_STEP = 2
/** Example lifetime of one credential set, in simulated minutes. */
export const LIFETIME = 60
/** EC2 makes new credentials available at least this many minutes before the old ones expire. */
export const REFRESH_BEFORE = 5
/** 09:00 */
export const START = 9 * 60

export const fmtClock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Example temporary access key IDs (ASIA = temporary, from AWS STS). Always 20 characters. */
export const tempKeyId = (setNo: number) => `ASIAIOSFODNN${(6 + setNo) % 10}EXAMPLE`

/* ------------------------------------------------------------------ state */

export interface CredState {
  /** Clock time when the current set was issued */
  issuedAt: number
  setNo: number
  refreshes: number
  /** Expiration time of a copy someone stole, if any */
  stolenExpiresAt: number | null
}

export interface SimState {
  mode: Mode
  step: number
  playing: boolean
  clock: number
  cred: CredState | null
  /** The learner paused the running credential clock */
  clockPaused: boolean
}

export type SimAction =
  | { type: 'mode'; mode: Mode }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'goto'; step: number }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'tick'; minutes: number }
  | { type: 'steal' }
  | { type: 'toggleClock' }
  | { type: 'reset' }

export const initialSim: SimState = { mode: 'key', step: 0, playing: false, clock: START, cred: null, clockPaused: false }

/** Moves the simulated clock forward, swapping in a fresh set whenever one gets close to expiry. */
function advanceClock(s: SimState, minutes: number): SimState {
  if (!s.cred || minutes <= 0) return s
  let clock = s.clock
  let cred = s.cred
  for (let i = 0; i < minutes; i++) {
    clock += 1
    if (cred.issuedAt + LIFETIME - clock <= REFRESH_BEFORE) {
      cred = { ...cred, issuedAt: clock, setNo: cred.setNo + 1, refreshes: cred.refreshes + 1 }
    }
  }
  return { ...s, clock, cred }
}

function goTo(s: SimState, target: number): SimState {
  const last = steps[s.mode].length - 1
  const n = Math.min(Math.max(target, 0), last)
  let next: SimState = { ...s, step: n }
  if (s.mode === 'role') {
    if (n < ISSUE_STEP) {
      next = { ...next, clock: START, cred: null }
    } else if (!next.cred) {
      next = { ...next, clock: START, cred: { issuedAt: START, setNo: 1, refreshes: 0, stolenExpiresAt: null } }
    }
    // Arriving at the last step: jump the clock to the moment EC2 swaps in a fresh set.
    if (n === last && s.step !== last && next.cred) {
      const untilRefresh = next.cred.issuedAt + LIFETIME - REFRESH_BEFORE - next.clock
      next = advanceClock(next, untilRefresh)
    }
  }
  if (n === last) next = { ...next, playing: false }
  return next
}

export function simReducer(s: SimState, a: SimAction): SimState {
  switch (a.type) {
    case 'mode':
      return { ...initialSim, mode: a.mode }
    case 'next':
      return goTo(s, s.step + 1)
    case 'back':
      return goTo({ ...s, playing: false }, s.step - 1)
    case 'goto':
      return goTo({ ...s, playing: false }, a.step)
    case 'play':
      return s.step >= steps[s.mode].length - 1 ? { ...goTo(s, 0), playing: true } : { ...s, playing: true }
    case 'pause':
      return { ...s, playing: false }
    case 'tick':
      return advanceClock(s, a.minutes)
    case 'steal': {
      // Only one stolen copy at a time.
      const active = s.cred?.stolenExpiresAt != null && s.cred.stolenExpiresAt > s.clock
      return s.cred && !active ? { ...s, cred: { ...s.cred, stolenExpiresAt: s.cred.issuedAt + LIFETIME } } : s
    }
    case 'toggleClock':
      return { ...s, clockPaused: !s.clockPaused }
    case 'reset':
      return initialSim
  }
}
