/**
 * Lesson 6 model: Mealhop's whole file store, run for a year.
 *
 * It adds no new rules. Each event is judged by the lesson that taught it:
 *  - access (lesson 2): `decide`, `leaks`
 *  - shelves and the AZ fire (lesson 3): the storage-class table, `MONTH_EVENTS` for a month's fetches
 *  - versioning (lesson 4): `runScript`, `fixAll`, `lostFiles`
 *  - lifecycle (lesson 5): `simulate` for the stock and its bill, `ruleEvents` for where a file of some age sits
 *
 * The store already holds 5 years of history, aged by the learner's own rules: the year is months 61 to 72
 * of lesson 5's simulation, started from the learner's shelves. Events are judged on their own; the AZ fire
 * comes last so no later request reads something it destroyed.
 */
import {
  decide,
  GATE_NOW,
  leaks,
  NEW_BUCKET,
  requestById,
  solution as accessSolution,
  type AccessConfig,
  type Req,
} from '../access/accessModel'
import { MONTH_EVENTS, ONE_ZONE_AZ, solution as classesSolution, START_PLACEMENT, type FetchEvent, type Placement } from '../classes/classesModel'
import { lostFiles } from '../versioning/internChallenge'
import { fixAll, MENU_KEYS, MENU_START, menuMatches, runScript, setMode } from '../versioning/versioningModel'
import {
  emptyRule,
  ruleEvents,
  simulate,
  solution as lifecycleSolution,
  type Rule,
  type Stock,
} from '../lifecycle/lifecycleModel'
import { classById, INTELLIGENT_TIERS, needsRestore, type ClassId } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, s3Story, type PrefixId } from '../../story'

/* ------------------------------------------------------------------ Setup */

export interface StoreConfig {
  access: AccessConfig
  versioning: 'off' | 'on'
  /** The shelf each kind of file is uploaded to. */
  placement: Placement
  /** At most one lifecycle rule per prefix (the first one counts). */
  rules: Rule[]
}

/** One answer: lesson 2's access, versioning on, lesson 3's shelves, lesson 5's rules. */
export const solution: StoreConfig = {
  access: accessSolution,
  versioning: 'on',
  placement: classesSolution,
  rules: lifecycleSolution,
}

/** Where the challenge starts: a brand-new bucket, everything on S3 Standard, no rules. */
export const START: StoreConfig = {
  access: NEW_BUCKET,
  versioning: 'off',
  placement: START_PLACEMENT,
  rules: [],
}

/* ----------------------------------------------------------------- Events */

export type YearEventKind =
  | 'intern-script'
  | 'az-destroyed'
  | 'receipt-last-month'
  | 'receipts-5-years'
  | 'reports-reopened'
  | 'bot-probe'
  | 'busy-month'

export type YearEvent = { month: number; kind: YearEventKind }

/** The year, in order. The fire is last: events are judged on their own, so nothing reads a file after it burns. */
export const YEAR_EVENTS: YearEvent[] = [
  { month: 2, kind: 'intern-script' },
  { month: 3, kind: 'receipt-last-month' },
  { month: 5, kind: 'bot-probe' },
  { month: 7, kind: 'reports-reopened' },
  { month: 9, kind: 'receipts-5-years' },
  { month: 11, kind: 'busy-month' },
  { month: 12, kind: 'az-destroyed' },
]

export const YEAR_MONTHS = 12
/** 5 years of 30-day months already in the bucket when the year starts. */
export const HISTORY_MONTHS = 60

/** A receipt from last month is up to 59 days old (30-day months); the customer wants it within a minute. */
export const LAST_MONTH_RECEIPT_AGE = 59
export const RECEIPT_DEADLINE_SECONDS = 60
/** The accountant asks for receipts from 5 years ago and can wait 2 days. */
export const FIVE_YEARS_DAYS = 5 * 365
export const ACCOUNTANT_DEADLINE_SECONDS = 2 * 24 * 3600
/** A manager re-opens last year's reports and wants them within a minute. */
export const OLD_REPORTS_AGE = 365
export const REPORTS_DEADLINE_SECONDS = 60
/** Example sizes for the one-off fetches: one month of receipts, one month of reports. */
const ACCOUNTANT_GB = FILE_TYPES.receipts.newGbPerMonth
const OLD_REPORTS_GB = FILE_TYPES.reports.newGbPerMonth
const ONE_RECEIPT_GB = FILE_TYPES.receipts.avgObjectMb / 1000

/** In the busy month every regular fetch happens this many times over. */
export const BUSY_FACTOR = 3

/**
 * How old the file each regular fetch (lesson 3's month) reads is, in days: a complaint or a receipt download
 * can be about anything from the last 30 days, a restore wants last night's backup.
 */
const FETCH_AGE: Record<PrefixId, number> = { menu: 0, receipts: 29, delivery: 29, backups: 1, reports: 29 }

/** Example budget for the year: storage, minimum-duration charges and fetch fees. */
export const YEAR_BUDGET = 950

/* ------------------------------------------------------------------ Rules */

/**
 * The rules as S3 runs them. With versioning off there are no old versions: an expiry or an overwrite
 * removes the file at once (lesson 5's model always assumes a versioned bucket, so old versions get 0 days).
 */
export function effectiveRules(c: StoreConfig): Rule[] {
  if (c.versioning === 'on') return c.rules
  const all = c.rules.some((r) => r.prefix === 'menu') ? c.rules : [...c.rules, emptyRule('menu')]
  return all.map((r) => ({ ...r, noncurrentExpireAfterDays: 0 }))
}

const ruleFor = (rules: Rule[], p: PrefixId) => rules.find((r) => r.prefix === p)

/**
 * Where a file of this age sits under the rule, or null once an expiry has hidden or deleted it
 * (a hidden file's GET finds only the delete marker). A rule S3 refuses does nothing.
 */
export function classAt(rule: Rule | undefined, start: ClassId, ageDays: number): ClassId | null {
  let cls: ClassId | null = start
  for (const e of ruleEvents(rule, start)) {
    if (e.day > ageDays) break
    cls = e.kind === 'start' || e.kind === 'move' ? e.cls : null
  }
  return cls
}

/* ------------------------------------------------------------------ Words */

const shelf = (id: ClassId) => classById(id).name
const prefixOf = (p: PrefixId) => FILE_TYPES[p].prefix
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`)
/**
 * "S3 Glacier Deep Archive, where a standard restore takes up to 12 hours". Archive classes are restored, not read,
 * and the labels are for a standard restore: faster (expedited) restores exist, so say "standard".
 */
const slowText = (id: ClassId) => `${shelf(id)}, where a standard restore takes ${classById(id).firstByteLabel}`

/* --------------------------------------------------------- Read all day */

/**
 * Menu photos are read all day, so Intelligent-Tiering keeps them in its frequent tier: the Standard price
 * plus its monitoring fee. (Lesson 5's simulation assumes lifecycle files are never read, so it would tier
 * them down; for menu photos that would be wrong.)
 */
const READ_ALL_DAY: PrefixId[] = ['menu']
/** Intelligent-Tiering's monitoring fee per GB-month for this prefix's files (lesson 3's sizes: 1 GB = 1,000 MB). */
const monitoringPerGb = (p: PrefixId) => INTELLIGENT_TIERS.monitoringPer1000Objects / FILE_TYPES[p].avgObjectMb
const frequentTier = (c: StoreConfig) => READ_ALL_DAY.filter((p) => c.placement[p] === 'intelligent-tiering')

/* ----------------------------------------------------------------- Result */

export interface LogLine {
  month: number
  kind: YearEventKind
  /** One short clause: what happened and why. */
  text: string
  ok: boolean
  lost: number
  leaked: number
  late: number
}

export interface YearMonth {
  /** 1 to 12. */
  month: number
  /** Keeping files this month (all shelves, current and old versions). */
  storage: number
  /** Charges for files moved or deleted before their shelf's minimum storage duration. */
  minCharge: number
  /** Fetch fees: the month's regular reads plus any one-off request. */
  fetch: number
  cost: number
  /** What sits on each shelf this month, by prefix (lesson 5's stock). */
  stock: Stock[]
}

export interface YearResult {
  lost: number
  leaked: number
  late: number
  cost: number
  log: LogLine[]
  solved: boolean
  months: YearMonth[]
  /** The year's bill for each kind of file: keeping it, and fetching it. */
  byPrefix: Record<PrefixId, { storage: number; fetch: number }>
  /** Minimum-duration charges for the year (not split by prefix). */
  minCharges: number
}

const line = (e: YearEvent, text: string, counts: Partial<Pick<LogLine, 'lost' | 'leaked' | 'late'>> = {}): LogLine => {
  const lost = counts.lost ?? 0
  const leaked = counts.leaked ?? 0
  const late = counts.late ?? 0
  return { month: e.month, kind: e.kind, text, ok: lost + leaked + late === 0, lost, leaked, late }
}

/** The servers' role fetching an old receipt for the accountant. */
const ACCOUNTANT_REQ: Req = { id: 'accountant', who: 'server-role', action: 'get', key: 'receipts/order-0001.pdf' }

/** Who must be let in for a regular fetch of this prefix (null: staff tools outside this model). */
const fetchReq = (p: PrefixId): Req | null => (p === 'menu' ? requestById('role-menu') : p === 'receipts' ? requestById('customer-own') : null)

/* --------------------------------------------------------------- Simulate */

/** Runs Mealhop's year on this setup. Pure: the same setup always gives the same year. */
export function simulateYear(c: StoreConfig): YearResult {
  const rules = effectiveRules(c)
  const at = (p: PrefixId, age: number) => classAt(ruleFor(rules, p), c.placement[p], age)
  const allowed = (r: Req) => decide(r, c.access, GATE_NOW).allowed

  /** A regular fetch: the class it reads from (null if the file is gone) and its fee. */
  const fetchOf = (f: FetchEvent) => {
    const cls = at(f.prefix, FETCH_AGE[f.prefix])
    return { cls, fee: cls ? f.gb * classById(cls).fetchPerGb : 0 }
  }
  const fetches = MONTH_EVENTS.filter((e): e is FetchEvent => e.kind === 'fetch')
  const regular = fetches.map(fetchOf)
  const regularFees = PREFIX_IDS.map((p) => regular.reduce((n, r, i) => (fetches[i].prefix === p ? n + r.fee : n), 0))

  // Files read all day sit in Intelligent-Tiering's frequent tier: simulate them at the Standard price, then
  // put them back on Intelligent-Tiering and add its monitoring fee.
  const frequent = frequentTier(c)
  const simShelves = { ...c.placement, ...Object.fromEntries(frequent.map((p) => [p, 'standard'])) } as Placement
  const sim = simulate(rules, HISTORY_MONTHS + YEAR_MONTHS, simShelves)
  const yearBills = sim.months.slice(HISTORY_MONTHS).map((b) => {
    const stock = b.stock.map((s) => (frequent.includes(s.prefix) && s.cls === 'standard' ? { ...s, cls: 'intelligent-tiering' as ClassId } : s))
    const monitoring = stock.reduce((n, s) => (frequent.includes(s.prefix) && s.cls === 'intelligent-tiering' ? n + s.gb * monitoringPerGb(s.prefix) : n), 0)
    return { ...b, storageCost: b.storageCost + monitoring, stock }
  })

  /** One-off fees by month and prefix (the busy month's extra reads and the special requests). */
  const extra: { month: number; prefix: PrefixId; fee: number }[] = []
  const log: LogLine[] = YEAR_EVENTS.map((e): LogLine => {
    switch (e.kind) {
      case 'intern-script': {
        const bucket = runScript(c.versioning === 'on' ? setMode(MENU_START, 'on') : MENU_START)
        const gone = lostFiles(bucket).length
        if (gone > 0) return line(e, `The intern's script hit menu photos: with versioning off, ${gone} are gone for good`, { lost: gone })
        // With versioning on, every photo has a good old version to put back (lesson 4's fixAll).
        if (!menuMatches(fixAll(bucket))) return line(e, "The intern's script hit menu photos, and some could not be put back", { lost: 1 })
        return line(e, `The intern's script hit menu photos: versioning kept old versions, so all ${MENU_KEYS.length} came back`)
      }

      case 'receipt-last-month': {
        const cls = at('receipts', LAST_MONTH_RECEIPT_AGE)
        if (!cls) return line(e, "Last month's receipt was already deleted by a lifecycle rule", { lost: 1 })
        extra.push({ month: e.month, prefix: 'receipts', fee: ONE_RECEIPT_GB * classById(cls).fetchPerGb })
        const d = decide(requestById('customer-own'), c.access, GATE_NOW)
        if (!d.allowed)
          return line(
            e,
            c.access.link
              ? "Customer #1042's link failed: the server role that signed it can't read receipts/"
              : 'Customer #1042 had no link, so they never got their receipt',
            { late: 1 },
          )
        if (classById(cls).firstByteSeconds > RECEIPT_DEADLINE_SECONDS)
          return line(e, `Last month's receipt is on ${slowText(cls)}, not a minute`, { late: 1 })
        if (d.reason === 'public') return line(e, "Customer #1042 got last month's receipt, but only because the whole bucket is public")
        return line(e, `Customer #1042 got last month's receipt through a link, from ${shelf(cls)} in milliseconds`)
      }

      case 'bot-probe': {
        const leaked = leaks(c.access, GATE_NOW)
        if (leaked > 0) return line(e, `The bucket is public: a bot and a stranger read receipts and listed every file (${leaked} requests got in)`, { leaked })
        return line(e, 'A bot probed the bucket and got nothing: it stays private')
      }

      case 'reports-reopened': {
        const cls = at('reports', OLD_REPORTS_AGE)
        if (!cls) return line(e, "Last year's reports were deleted, and re-making them takes longer than a minute", { late: 1 })
        extra.push({ month: e.month, prefix: 'reports', fee: OLD_REPORTS_GB * classById(cls).fetchPerGb })
        if (classById(cls).firstByteSeconds > REPORTS_DEADLINE_SECONDS)
          return line(e, `Last year's reports are on ${slowText(cls)}, not a minute`, { late: 1 })
        return line(e, `A manager re-opened last year's reports from ${shelf(cls)} in milliseconds`)
      }

      case 'receipts-5-years': {
        const cls = at('receipts', FIVE_YEARS_DAYS)
        if (!cls) return line(e, '5-year-old receipts were already deleted by a lifecycle rule', { lost: 1 })
        extra.push({ month: e.month, prefix: 'receipts', fee: ACCOUNTANT_GB * classById(cls).fetchPerGb })
        if (!allowed(ACCOUNTANT_REQ)) return line(e, "The accountant's receipts never came: the server role can't read receipts/", { late: 1 })
        if (classById(cls).firstByteSeconds > ACCOUNTANT_DEADLINE_SECONDS)
          return line(e, `5-year-old receipts on ${slowText(cls)}: too slow for 2 days`, { late: 1 })
        return line(
          e,
          needsRestore(classById(cls))
            ? `The accountant's 5-year-old receipts were restored from ${shelf(cls)} (a standard restore takes ${classById(cls).firstByteLabel}), inside 2 days`
            : `The accountant got 5-year-old receipts from ${shelf(cls)} in milliseconds`,
        )
      }

      case 'busy-month': {
        let lost = 0
        let late = 0
        const why: string[] = []
        fetches.forEach((f, i) => {
          const { cls, fee } = regular[i]
          extra.push({ month: e.month, prefix: f.prefix, fee: fee * (BUSY_FACTOR - 1) })
          const req = fetchReq(f.prefix)
          if (!cls) {
            if (FILE_TYPES[f.prefix].recreatable) late += 1
            else lost += 1
            why.push(`${prefixOf(f.prefix)} deleted too soon`)
          } else if (req && !allowed(req)) {
            late += 1
            why.push(f.prefix === 'menu' ? "the app can't read menu/" : "customers can't get receipts/")
          } else if (classById(cls).firstByteSeconds > f.deadlineSeconds) {
            late += 1
            why.push(`${prefixOf(f.prefix)} on ${shelf(cls)} is too slow`)
          }
        })
        if (why.length === 0) return line(e, `A busy month (${BUSY_FACTOR} times the traffic): every fetch was on time`)
        return line(e, `A busy month: ${list(why)}`, { lost, late })
      }

      case 'az-destroyed': {
        const az = s3Story.azs[ONE_ZONE_AZ]
        // What sits in a one-AZ class when the fire hits (current files; old versions are on their way out).
        const stock = yearBills[e.month - 1].stock
        const hit = PREFIX_IDS.filter((p) => stock.some((s) => s.prefix === p && !s.old && s.gb > 0 && classById(s.cls).azs === 1))
        const lostP = hit.filter((p) => !FILE_TYPES[p].recreatable)
        const remade = hit.filter((p) => FILE_TYPES[p].recreatable)
        if (lostP.length > 0) return line(e, `A fire destroyed ${az}: ${list(lostP.map(prefixOf))} ${lostP.length === 1 ? 'was' : 'were'} stored only there and ${lostP.length === 1 ? 'is' : 'are'} lost`, { lost: lostP.length })
        if (remade.length > 0) return line(e, `A fire destroyed ${az}: ${list(remade.map(prefixOf))} re-made from the database, nothing lost`)
        return line(e, `A fire destroyed ${az}: every file had copies in other AZs`)
      }
    }
  })

  const months: YearMonth[] = yearBills.map((b, i) => {
    const month = i + 1
    const fetch = regular.reduce((n, r) => n + r.fee, 0) + extra.filter((x) => x.month === month).reduce((n, x) => n + x.fee, 0)
    return { month, storage: b.storageCost, minCharge: b.minCharge, fetch, cost: b.storageCost + b.minCharge + fetch, stock: b.stock }
  })

  const storage = storageByPrefix(months, frequent)
  const byPrefix = Object.fromEntries(
    PREFIX_IDS.map((p, i) => [
      p,
      { storage: storage[p], fetch: regularFees[i] * YEAR_MONTHS + extra.filter((x) => x.prefix === p).reduce((n, x) => n + x.fee, 0) },
    ]),
  ) as YearResult['byPrefix']

  const lost = log.reduce((n, l) => n + l.lost, 0)
  const leaked = log.reduce((n, l) => n + l.leaked, 0)
  const late = log.reduce((n, l) => n + l.late, 0)
  const cost = months.reduce((n, m) => n + m.cost, 0)
  return {
    lost,
    leaked,
    late,
    cost,
    log,
    solved: lost === 0 && leaked === 0 && late === 0 && cost <= YEAR_BUDGET,
    months,
    byPrefix,
    minCharges: months.reduce((n, m) => n + m.minCharge, 0),
  }
}

/**
 * The year's storage split by prefix. Each shelf's GB is priced from the shared table, and files read all day
 * on Intelligent-Tiering at its frequent tier. Other Intelligent-Tiering files move between tiers that the stock
 * doesn't record, so the rest of the month's bill is split between them by GB.
 */
function storageByPrefix(months: YearMonth[], frequent: PrefixId[]): Record<PrefixId, number> {
  const out = Object.fromEntries(PREFIX_IDS.map((p) => [p, 0])) as Record<PrefixId, number>
  const isTiered = (s: Stock) => s.cls === 'intelligent-tiering' && !frequent.includes(s.prefix)
  const priced = (s: Stock) =>
    s.cls === 'intelligent-tiering'
      ? s.gb * (classById(INTELLIGENT_TIERS.frequent).storePerGbMonth + monitoringPerGb(s.prefix))
      : s.gb * classById(s.cls).storePerGbMonth
  for (const m of months) {
    const fixed = m.stock.filter((s) => !isTiered(s))
    const tiered = m.stock.filter(isTiered)
    const fixedCost = fixed.reduce((n, s) => n + priced(s), 0)
    for (const s of fixed) out[s.prefix] += priced(s)
    const tieredGb = tiered.reduce((n, s) => n + s.gb, 0)
    for (const s of tiered) out[s.prefix] += tieredGb > 0 ? ((m.storage - fixedCost) * s.gb) / tieredGb : 0
  }
  return out
}
