import { CLASSES, classById, INTELLIGENT_TIERS, type ClassId } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, RECOMMENDED_CLASSES, type PrefixId } from '../../story'

/**
 * Lesson 5: lifecycle rules over 7 years of Mealhop's files.
 *
 * Time runs in 30-day months. Every month each prefix gets a new batch of files
 * (`newGbPerMonth`), all created on the month's first day. Batches age, move down
 * the shelves and expire by their prefix's rule, and are billed by the day.
 */

export const DAYS_PER_MONTH = 30
/** 7 years of 30-day months. */
export const SIM_MONTHS = 84

export interface Step {
  /** Days after the file was created. */
  afterDays: number
  to: ClassId
}

/** One lifecycle rule. Its filter is a prefix; this lesson has at most one rule per prefix. */
export interface Rule {
  prefix: PrefixId
  /** Transition actions, in order. */
  transitions: Step[]
  /** Expiration action for current versions (days after creation); null = never. */
  expireAfterDays: number | null
  /** Delete noncurrent (old) versions this many days after they become old; null = never. */
  noncurrentExpireAfterDays: number | null
}

export type RuleProblem = 'not-down-the-waterfall' | 'unsupported-move' | 'days-not-increasing' | 'next-step-too-soon' | 'expire-before-last-move'

/** The order problems are listed in. */
const PROBLEM_ORDER: RuleProblem[] = ['not-down-the-waterfall', 'unsupported-move', 'days-not-increasing', 'next-step-too-soon', 'expire-before-last-move']

/**
 * Mealhop's bucket has versioning on (lesson 4). So an expiration action does not erase a file:
 * S3 adds a delete marker and the file stays, billed, as a noncurrent version until a
 * noncurrent-version rule deletes it.
 */
export const VERSIONED_BUCKET = true

/** Example: GB of menu photos replaced each month. The old copies become noncurrent versions. */
export const MENU_VERSIONS_GB_PER_MONTH = 20

/** Example budget for the whole 7 years (all prefixes, storage plus minimum-duration charges). */
export const SEVEN_YEAR_BUDGET = 5000

/* ------------------------------------------------------------ rule checks */
/*
 * Each S3 lifecycle constraint is one small function, so the fact audit can adjust it in one place.
 * Source: https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
 * Since 16 July 2026 there is no "30 days old before Standard-IA or One Zone-IA" rule: a move can be on any day.
 */

const order = (id: ClassId) => CLASSES.findIndex((c) => c.id === id)

/** Moves that are down the list but that S3 lifecycle still does not support. */
const UNSUPPORTED_MOVES: [ClassId, ClassId][] = [['one-zone-ia', 'glacier-ir']]

const isDown = (from: ClassId, to: ClassId) => order(to) > order(from)
const isUnsupported = (from: ClassId, to: ClassId) => UNSUPPORTED_MOVES.some(([f, t]) => f === from && t === to)

/** Lifecycle only moves objects down the waterfall (CLASSES order), never up or sideways, and not One Zone-IA to Glacier IR. */
export function canMove(from: ClassId, to: ClassId): boolean {
  return isDown(from, to) && !isUnsupported(from, to)
}

/**
 * Why S3 would reject this rule (empty = S3 accepts it). `startClass` is where the prefix's files are uploaded.
 *
 * One rule can't move files on from a class it moved them to before that class's minimum storage duration
 * (30 days for the IA classes, 90 for Glacier IR and Flexible Retrieval). AWS's example: Glacier IR after 4 days,
 * then Deep Archive after 20, is rejected; Deep Archive must be at least day 94. The upload class is not checked:
 * the rule can't know it, so files uploaded to Standard-IA may move at once (and pay its minimum).
 */
export function ruleProblems(r: Rule, startClass: ClassId): RuleProblem[] {
  const found = new Set<RuleProblem>()
  let from = startClass
  let prev: Step | null = null
  for (const s of r.transitions) {
    if (prev && s.afterDays <= prev.afterDays) found.add('days-not-increasing')
    else if (prev && s.afterDays - prev.afterDays < classById(prev.to).minDays) found.add('next-step-too-soon')
    if (!isDown(from, s.to)) found.add('not-down-the-waterfall')
    else if (isUnsupported(from, s.to)) found.add('unsupported-move')
    from = s.to
    prev = s
  }
  const last = r.transitions[r.transitions.length - 1]
  if (last && r.expireAfterDays !== null && r.expireAfterDays <= last.afterDays) found.add('expire-before-last-move')
  return PROBLEM_ORDER.filter((p) => found.has(p))
}

/** Does this rule delete (or hide) current files before Mealhop allows? keepDays null = keep with no time limit. */
export function deletesTooEarly(r: Rule): boolean {
  if (r.expireAfterDays === null) return false
  const keep = FILE_TYPES[r.prefix].keepDays
  return keep === null || r.expireAfterDays < keep
}

export const emptyRule = (prefix: PrefixId): Rule => ({ prefix, transitions: [], expireAfterDays: null, noncurrentExpireAfterDays: null })

/* --------------------------------------------------------------- timeline */

export interface EarlyCharge {
  /** The class left too soon. */
  cls: ClassId
  /** Days spent there. */
  stayed: number
  /** Its minimum storage duration. */
  min: number
}

export interface RuleEvent {
  kind: 'start' | 'move' | 'hide' | 'delete'
  /** Days after the file was created. */
  day: number
  /** The class the file is in after this event (for hide and delete: the class it was in). */
  cls: ClassId
  /** Set when leaving a class before its minimum storage duration. */
  early?: EarlyCharge
}

const earlyLeave = (cls: ClassId, entered: number, left: number): EarlyCharge | undefined => {
  const min = classById(cls).minDays
  const stayed = left - entered
  return stayed < min ? { cls, stayed, min } : undefined
}

/**
 * What the rule does to one batch of current files, day by day. A rule S3 would reject (any problem) does nothing here.
 * In a versioned bucket, expiry hides the file (delete marker) and the noncurrent rule deletes it later.
 */
export function ruleEvents(r: Rule | undefined, startClass: ClassId): RuleEvent[] {
  const events: RuleEvent[] = [{ kind: 'start', day: 0, cls: startClass }]
  if (!r || ruleProblems(r, startClass).length > 0) return events
  let cls = startClass
  let entered = 0
  for (const s of r.transitions) {
    events.push({ kind: 'move', day: s.afterDays, cls: s.to, early: earlyLeave(cls, entered, s.afterDays) })
    cls = s.to
    entered = s.afterDays
  }
  if (r.expireAfterDays === null) return events
  if (!VERSIONED_BUCKET) {
    events.push({ kind: 'delete', day: r.expireAfterDays, cls, early: earlyLeave(cls, entered, r.expireAfterDays) })
    return events
  }
  events.push({ kind: 'hide', day: r.expireAfterDays, cls })
  if (r.noncurrentExpireAfterDays !== null) {
    const gone = r.expireAfterDays + r.noncurrentExpireAfterDays
    events.push({ kind: 'delete', day: gone, cls, early: earlyLeave(cls, entered, gone) })
  }
  return events
}

/** Old menu versions: they become noncurrent on day 0 in the menu's class, and only the noncurrent rule deletes them. */
function oldVersionEvents(r: Rule | undefined, cls: ClassId): RuleEvent[] {
  const events: RuleEvent[] = [{ kind: 'hide', day: 0, cls }]
  // A rejected rule does nothing, old versions included.
  const days = r && ruleProblems(r, cls).length === 0 ? r.noncurrentExpireAfterDays : null
  if (days !== null) events.push({ kind: 'delete', day: days, cls, early: earlyLeave(cls, 0, days) })
  return events
}

/* ----------------------------------------------------------------- billing */

interface Segment {
  cls: ClassId
  from: number
  /** Exclusive; Infinity = still there at the end. */
  to: number
  old: boolean
  /** $ per GB per month while in this segment. */
  price: number
}

/** Intelligent-Tiering moves unread files to cheaper tiers by itself (lifecycle files are assumed not read). */
function itSegments(entered: number, from: number, to: number, old: boolean, avgObjectMb: number): Segment[] {
  const monitoring = ((1024 / avgObjectMb) / 1000) * INTELLIGENT_TIERS.monitoringPer1000Objects
  const tiers: [number, number][] = [
    [entered, classById(INTELLIGENT_TIERS.frequent).storePerGbMonth],
    [entered + INTELLIGENT_TIERS.infrequentAfterDays, classById('standard-ia').storePerGbMonth],
    [entered + INTELLIGENT_TIERS.archiveInstantAfterDays, classById('glacier-ir').storePerGbMonth],
  ]
  return tiers
    .map(([start, p], i) => ({
      cls: 'intelligent-tiering' as ClassId,
      from: Math.max(from, start),
      to: Math.min(to, tiers[i + 1]?.[0] ?? Infinity),
      old,
      price: p + monitoring,
    }))
    .filter((s) => s.to > s.from)
}

/** Turn events into billed segments, splitting at the hide day (current → old version). */
function segmentsOf(events: RuleEvent[], avgObjectMb: number): Segment[] {
  const hideDay = events.find((e) => e.kind === 'hide')?.day ?? Infinity
  const end = events.find((e) => e.kind === 'delete')?.day ?? Infinity
  const stays = events.filter((e) => e.kind === 'start' || e.kind === 'move')
  // Old-version streams have no start: they sit in their class from day 0.
  if (stays.length === 0) stays.push({ kind: 'start', day: 0, cls: events[0].cls })
  const out: Segment[] = []
  stays.forEach((e, i) => {
    const from = e.day
    const to = Math.min(stays[i + 1]?.day ?? Infinity, end)
    const parts: [number, number, boolean][] = [
      [from, Math.min(to, hideDay), false],
      [Math.max(from, hideDay), to, true],
    ]
    for (const [a, b, old] of parts) {
      if (b <= a) continue
      if (e.cls === 'intelligent-tiering') out.push(...itSegments(from, a, b, old, avgObjectMb))
      else out.push({ cls: e.cls, from: a, to: b, old, price: classById(e.cls).storePerGbMonth })
    }
  })
  return out.filter((s) => s.to > s.from)
}

const zeroByClass = (): Record<ClassId, number> => Object.fromEntries(CLASSES.map((c) => [c.id, 0])) as Record<ClassId, number>

/** One batch's bill by month of its age (index j = its (j+1)th month). */
interface AgeMonth {
  storage: number
  charge: number
  gbByClass: Record<ClassId, number>
  oldGb: number
}

export interface Stock {
  prefix: PrefixId
  cls: ClassId
  /** Average GB on this shelf during the month. */
  gb: number
  /** Old (noncurrent) versions: hidden, still billed. */
  old: boolean
}

interface Stream {
  prefix: PrefixId
  ages: AgeMonth[]
  /** Per age-month, GB by class split into current and old. */
  stock: { cls: ClassId; gb: number; old: boolean }[][]
}

function streamOf(prefix: PrefixId, gbPerMonth: number, events: RuleEvent[], months: number): Stream {
  const avgObjectMb = FILE_TYPES[prefix].avgObjectMb
  const ages: AgeMonth[] = Array.from({ length: months }, () => ({ storage: 0, charge: 0, gbByClass: zeroByClass(), oldGb: 0 }))
  const stock: Stream['stock'] = Array.from({ length: months }, () => [])
  for (const s of segmentsOf(events, avgObjectMb)) {
    const first = Math.floor(s.from / DAYS_PER_MONTH)
    const last = Math.min(months - 1, Math.ceil(Math.min(s.to, months * DAYS_PER_MONTH) / DAYS_PER_MONTH) - 1)
    for (let j = first; j <= last; j++) {
      const days = Math.min(s.to, (j + 1) * DAYS_PER_MONTH) - Math.max(s.from, j * DAYS_PER_MONTH)
      if (days <= 0) continue
      const gb = (gbPerMonth * days) / DAYS_PER_MONTH
      ages[j].storage += gb * s.price
      ages[j].gbByClass[s.cls] += gb
      if (s.old) ages[j].oldGb += gb
      const same = stock[j].find((x) => x.cls === s.cls && x.old === s.old)
      if (same) same.gb += gb
      else stock[j].push({ cls: s.cls, gb, old: s.old })
    }
  }
  for (const e of events) {
    if (!e.early) continue
    const j = Math.floor(e.day / DAYS_PER_MONTH)
    if (j < months) ages[j].charge += (gbPerMonth * (e.early.min - e.early.stayed) * classById(e.early.cls).storePerGbMonth) / DAYS_PER_MONTH
  }
  return { prefix, ages, stock }
}

export interface MonthBill {
  /** 1 = the first 30 days. */
  month: number
  /** Everything billed this month: storage plus minimum-duration charges. */
  cost: number
  storageCost: number
  /** Charges for files moved or deleted before their class's minimum storage duration. */
  minCharge: number
  /** Average GB stored this month per class (current and old versions). */
  gbByClass: Record<ClassId, number>
  /** Of which: old (noncurrent) versions. */
  oldGb: number
  /** What sits on each shelf, by prefix. */
  stock: Stock[]
}

export interface SimResult {
  months: MonthBill[]
  total: number
  minDurationCharges: number
  /** Prefixes whose rule deletes current files before `keepDays`. */
  earlyDeletes: PrefixId[]
  ruleProblems: Record<PrefixId, RuleProblem[]>
}

/**
 * Run the rules for `months` 30-day months. Rules S3 would reject do nothing.
 * The first rule for a prefix is used; later ones for the same prefix are ignored.
 */
export function simulate(rules: Rule[], months = SIM_MONTHS, startClasses: Record<PrefixId, ClassId> = RECOMMENDED_CLASSES): SimResult {
  const byPrefix = (p: PrefixId) => rules.find((r) => r.prefix === p)
  const problems = Object.fromEntries(
    PREFIX_IDS.map((p) => {
      const r = byPrefix(p)
      return [p, r ? ruleProblems(r, startClasses[p]) : []]
    }),
  ) as Record<PrefixId, RuleProblem[]>

  const streams: Stream[] = PREFIX_IDS.map((p) => streamOf(p, FILE_TYPES[p].newGbPerMonth, ruleEvents(byPrefix(p), startClasses[p]), months))
  streams.push(streamOf('menu', MENU_VERSIONS_GB_PER_MONTH, oldVersionEvents(byPrefix('menu'), startClasses.menu), months))

  // A batch arrives every month, so month m holds batches aged 0..m: a running sum over ages.
  const running = streams.map(() => ({ storage: 0, charge: 0, gbByClass: zeroByClass(), oldGb: 0, stock: new Map<string, Stock>() }))
  const out: MonthBill[] = []
  for (let m = 0; m < months; m++) {
    streams.forEach((s, i) => {
      const acc = running[i]
      const a = s.ages[m]
      acc.storage += a.storage
      acc.charge += a.charge
      acc.oldGb += a.oldGb
      for (const c of CLASSES) acc.gbByClass[c.id] += a.gbByClass[c.id]
      for (const x of s.stock[m]) {
        const key = `${x.cls}|${x.old}`
        const prev = acc.stock.get(key)
        if (prev) prev.gb += x.gb
        else acc.stock.set(key, { prefix: s.prefix, cls: x.cls, gb: x.gb, old: x.old })
      }
    })
    const gbByClass = zeroByClass()
    for (const acc of running) for (const c of CLASSES) gbByClass[c.id] += acc.gbByClass[c.id]
    const storageCost = running.reduce((n, a) => n + a.storage, 0)
    // Charges also sum over batches: in month m, the batch aged j months is the one created in month m - j.
    const minCharge = running.reduce((n, a) => n + a.charge, 0)
    const stock = mergeStock(running.flatMap((a) => [...a.stock.values()].map((x) => ({ ...x }))))
    out.push({
      month: m + 1,
      cost: storageCost + minCharge,
      storageCost,
      minCharge,
      gbByClass,
      oldGb: running.reduce((n, a) => n + a.oldGb, 0),
      stock,
    })
  }

  return {
    months: out,
    total: out.reduce((n, m) => n + m.cost, 0),
    minDurationCharges: out.reduce((n, m) => n + m.minCharge, 0),
    earlyDeletes: PREFIX_IDS.filter((p) => {
      const r = byPrefix(p)
      return r !== undefined && deletesTooEarly(r)
    }),
    ruleProblems: problems,
  }
}

/** Old menu versions and current menu photos on the same shelf stay separate entries; same prefix+class+old merge. */
function mergeStock(list: Stock[]): Stock[] {
  const map = new Map<string, Stock>()
  for (const x of list) {
    if (x.gb <= 1e-9) continue
    const key = `${x.prefix}|${x.cls}|${x.old}`
    const prev = map.get(key)
    if (prev) prev.gb += x.gb
    else map.set(key, x)
  }
  return [...map.values()]
}

/** Under budget, nothing deleted too early, and S3 would accept every rule. */
export function solved(r: SimResult): boolean {
  return r.total <= SEVEN_YEAR_BUDGET && r.earlyDeletes.length === 0 && PREFIX_IDS.every((p) => r.ruleProblems[p].length === 0)
}

/** One answer: receipts slide down and stay 7 years; delivery photos and backups go after 30 days; old menu photos after 30. */
export const solution: Rule[] = [
  { prefix: 'menu', transitions: [], expireAfterDays: null, noncurrentExpireAfterDays: 30 },
  {
    prefix: 'receipts',
    transitions: [
      { afterDays: 30, to: 'glacier-ir' },
      { afterDays: 365, to: 'deep-archive' },
    ],
    expireAfterDays: 2555,
    noncurrentExpireAfterDays: 1,
  },
  { prefix: 'delivery', transitions: [], expireAfterDays: 30, noncurrentExpireAfterDays: 1 },
  { prefix: 'backups', transitions: [], expireAfterDays: 30, noncurrentExpireAfterDays: 1 },
]
