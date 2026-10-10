/**
 * The made-up numbers behind "Try it: plan your shop's capacity".
 * Everything here is illustrative: a small online bakery over one year (2026).
 * No React in this file, so the maths stays easy to test and cheap to reuse.
 */

export const DAYS = 365
/** How many visitors one server can handle in a day (illustrative). */
export const VISITORS_PER_SERVER = 1000
/** Price of buying one server up front (illustrative). */
export const SERVER_PRICE = 1500
/** Power, cooling and space for one owned server for a year (illustrative). */
export const UPKEEP_PER_SERVER_YEAR = 300
/** Renting one cloud server for one day (illustrative). */
export const CLOUD_PRICE_PER_SERVER_DAY = 6
/** Cloud mode keeps 20% spare room above yesterday's traffic. */
export const CLOUD_HEADROOM = 1.2
/** Top of the chart's visitor axis. */
export const CHART_MAX = 24000

export type PlanMode = 'buy' | 'cloud'

/** Small deterministic random generator, so the chart looks the same every time. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const bump = (d: number, center: number, width: number, amount: number) =>
  amount * Math.exp(-0.5 * ((d - center) / width) ** 2)

/** The run-up to the end-of-year holidays: rises from late November, peaks just before 25 December. */
function holidaySeason(d: number) {
  const start = 322 // 19 Nov
  const peak = 355 // 22 Dec
  if (d < start) return 0
  if (d <= peak) return 13500 * ((d - start) / (peak - start)) ** 1.6
  return 13500 * Math.exp(-(d - peak) * 0.75)
}

/** Visitors per day for each day of 2026 (1 January is day 0, a Thursday). */
export function buildDemand(): number[] {
  const rand = mulberry32(20261003)
  const out: number[] = []
  for (let d = 0; d < DAYS; d++) {
    const dow = (d + 4) % 7 // 0 = Sunday
    const week = dow === 0 || dow === 6 ? 1.15 : dow === 5 ? 1.06 : 1
    const season = 1 + 0.08 * Math.sin(((d - 80) / DAYS) * Math.PI * 2)
    let v = 3000 * week * season
    v += bump(d, 43, 1.6, 5200) // Valentine's Day, 14 Feb
    v += bump(d, 128, 1.8, 3800) // Mother's Day (US), 10 May 2026
    v += bump(d, 330, 0.8, 3500) // Black Friday, 27 Nov
    v += holidaySeason(d)
    v *= 1 + (rand() - 0.5) * 0.14
    out.push(Math.round(v))
  }
  return out
}

/** Servers running each day in cloud mode: enough for yesterday's traffic plus headroom. */
export function cloudServers(demand: number[]): number[] {
  return demand.map((_, d) => {
    const seen = demand[Math.max(0, d - 1)]
    return Math.max(1, Math.ceil((seen * CLOUD_HEADROOM) / VISITORS_PER_SERVER))
  })
}

/** Running totals for each day, so the chart can show "the year so far" without recounting. */
export interface PlanTotals {
  /** Servers available each day */
  servers: number[]
  /** Running total of capacity (visitors that could have been served) */
  capacity: number[]
  /** Running total of unused capacity */
  idle: number[]
  /** Running total of visitors turned away */
  lost: number[]
  /** Running total of ongoing costs (upkeep or cloud bill) */
  ongoing: number[]
  /** Paid before day 0 */
  upfront: number
}

export function planTotals(demand: number[], mode: PlanMode, boughtServers: number, rented: number[]): PlanTotals {
  const servers = mode === 'buy' ? demand.map(() => boughtServers) : rented
  const capacity: number[] = []
  const idle: number[] = []
  const lost: number[] = []
  const ongoing: number[] = []
  let c = 0
  let i = 0
  let l = 0
  let o = 0
  const dailyUpkeep = (boughtServers * UPKEEP_PER_SERVER_YEAR) / DAYS
  for (let d = 0; d < demand.length; d++) {
    const cap = servers[d] * VISITORS_PER_SERVER
    c += cap
    i += Math.max(0, cap - demand[d])
    l += Math.max(0, demand[d] - cap)
    o += mode === 'buy' ? dailyUpkeep : servers[d] * CLOUD_PRICE_PER_SERVER_DAY
    capacity.push(c)
    idle.push(i)
    lost.push(l)
    ongoing.push(o)
  }
  return { servers, capacity, idle, lost, ongoing, upfront: mode === 'buy' ? boughtServers * SERVER_PRICE : 0 }
}

/** The numbers shown in the readouts for the year up to and including `day`. */
export function summaryAt(t: PlanTotals, day: number) {
  const d = Math.min(Math.max(0, day), t.capacity.length - 1)
  const ongoing = Math.round(t.ongoing[d])
  return {
    upfront: t.upfront,
    ongoing,
    total: t.upfront + ongoing,
    idlePct: t.capacity[d] > 0 ? Math.round((t.idle[d] / t.capacity[d]) * 100) : 0,
    lost: Math.round(t.lost[d]),
  }
}

/** Day index of the 1st of each month in 2026 (not a leap year). */
export const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "14 Feb" for a day index in 2026. */
export function dayLabel(day: number) {
  let m = 11
  while (m > 0 && MONTH_STARTS[m] > day) m--
  return `${day - MONTH_STARTS[m] + 1} ${MONTHS[m]}`
}

export const HOLIDAYS = [
  { day: 44, label: 'Valentine’s Day' },
  { day: 129, label: 'Mother’s Day' },
  { day: 350, label: 'Holiday season' },
]
