/**
 * Lesson 2 model: instance type names, a small catalog and the "size three jobs" challenge.
 * Lesson 6 imports CATALOG, so keep its names and figures stable.
 */

/** What an instance family is built for. */
export type Family = 'general' | 'compute' | 'memory' | 'storage' | 'accelerated'

const NAME = /^([a-z]+)(\d+)([a-z0-9-]*)\.([a-z0-9]+)$/

/**
 * Splits an instance type name into its parts, for example m7g.large into
 * family m, generation 7, extras g (the processor letter plus any extra features) and size large.
 */
export function parseTypeName(name: string): { family: string; generation: number; extras: string; size: string } {
  const m = NAME.exec(name)
  if (!m) throw new Error(`Not an instance type name: "${name}"`)
  return { family: m[1], generation: Number(m[2]), extras: m[3], size: m[4] }
}

export interface InstanceType {
  name: string
  family: Family
  vcpu: number
  memoryGiB: number
  /** Example On-Demand price in dollars per hour. Not a live AWS price. */
  pricePerHour: number
}

/** The sizes used in the challenge, smallest first. Each step doubles vCPU, memory and price. */
export const SIZES = ['large', 'xlarge', '2xlarge'] as const
export type Size = (typeof SIZES)[number]

/** The three families the challenge offers. The t family stays out so burstable CPU never comes up. */
export const CHALLENGE_FAMILIES = ['m', 'c', 'r'] as const
export type ChallengeFamily = (typeof CHALLENGE_FAMILIES)[number]

const FAMILY_OF: Record<ChallengeFamily, Family> = { m: 'general', c: 'compute', r: 'memory' }
/** Real figures: memory per vCPU for m7g, c7g and r7g. */
export const GIB_PER_VCPU: Record<ChallengeFamily, number> = { m: 4, c: 2, r: 8 }
/** Example price of the large size, in cents per hour. Ratios follow real On-Demand prices: c < m < r. */
const LARGE_CENTS: Record<ChallengeFamily, number> = { m: 8, c: 7, r: 11 }

/** vCPU and memory of a size in a family: large has 2 vCPU and each step up doubles. */
export function sizeSpec(family: string, size: string): { vcpu: number; memoryGiB: number } {
  const step = Math.max(0, SIZES.indexOf(size as Size))
  const vcpu = 2 * 2 ** step
  return { vcpu, memoryGiB: vcpu * (GIB_PER_VCPU[family as ChallengeFamily] ?? 4) }
}

/** Graviton instance types in three families and three sizes. vCPU and memory are the real figures; prices are examples. */
export const CATALOG: InstanceType[] = CHALLENGE_FAMILIES.flatMap((f) =>
  SIZES.map((size, step) => {
    const vcpu = 2 * 2 ** step
    return {
      name: `${f}7g.${size}`,
      family: FAMILY_OF[f],
      vcpu,
      memoryGiB: vcpu * GIB_PER_VCPU[f],
      pricePerHour: (LARGE_CENTS[f] * 2 ** step) / 100,
    }
  }),
)

/** The instance type with this name. Throws for a name outside the catalog. */
export function typeByName(name: string): InstanceType {
  const t = CATALOG.find((x) => x.name === name)
  if (!t) throw new Error(`Not in the catalog: "${name}"`)
  return t
}

export type JobId = 'website' | 'routes' | 'cache'

/** The delivery app's three jobs: balanced, CPU-heavy and memory-heavy. */
export const JOBS: { id: JobId; needVcpu: number; needMemoryGiB: number }[] = [
  { id: 'website', needVcpu: 2, needMemoryGiB: 6 },
  { id: 'routes', needVcpu: 3, needMemoryGiB: 4 },
  { id: 'cache', needVcpu: 1, needMemoryGiB: 12 },
]

export type Fit = 'over' | 'ok' | 'waste'

/** A type with at least this many times the job's need, on one axis, is mostly idle there. */
export const WASTE_FACTOR = 4

const fitOne = (need: number, have: number): Fit => (need > have ? 'over' : have >= WASTE_FACTOR * need ? 'waste' : 'ok')

/** How a job sits on an instance type: 'over' means the job needs more than the type has, 'waste' means the type has at least 4 times the need. */
export function fit(job: { needVcpu: number; needMemoryGiB: number }, type: InstanceType): { cpu: Fit; memory: Fit } {
  return { cpu: fitOne(job.needVcpu, type.vcpu), memory: fitOne(job.needMemoryGiB, type.memoryGiB) }
}

/** Example budget for running all three jobs, in dollars per hour. Only the right-shaped, smallest fitting picks stay within it. */
export const BUDGET_PER_HOUR = 0.34

const cents = (dollars: number) => Math.round(dollars * 100)

/** Scores a set of picks: does every job fit, what does it cost per hour, and is that within budget. */
export function result(picks: Record<JobId, string>): { allFit: boolean; cost: number; withinBudget: boolean; solved: boolean } {
  let allFit = true
  let totalCents = 0
  for (const job of JOBS) {
    const type = typeByName(picks[job.id])
    const f = fit(job, type)
    if (f.cpu === 'over' || f.memory === 'over') allFit = false
    totalCents += cents(type.pricePerHour)
  }
  const withinBudget = totalCents <= cents(BUDGET_PER_HOUR)
  return { allFit, cost: totalCents / 100, withinBudget, solved: allFit && withinBudget }
}

/** How many jobs run out of CPU or memory with these picks. */
export function failedJobs(picks: Record<JobId, string>): number {
  return JOBS.filter((job) => {
    const f = fit(job, typeByName(picks[job.id]))
    return f.cpu === 'over' || f.memory === 'over'
  }).length
}

/** True when the size one step below this pick (same family) still has enough CPU and memory for the job. */
export function smallerFits(job: { needVcpu: number; needMemoryGiB: number }, name: string): boolean {
  const { family, generation, extras, size } = parseTypeName(name)
  const i = SIZES.indexOf(size as Size)
  if (i <= 0) return false
  const smaller = typeByName(`${family}${generation}${extras}.${SIZES[i - 1]}`)
  const f = fit(job, smaller)
  return f.cpu !== 'over' && f.memory !== 'over'
}

/** One general-purpose type for everything: where the challenge starts. */
export const startingPicks: Record<JobId, string> = { website: 'm7g.large', routes: 'm7g.large', cache: 'm7g.large' }

/** The cheapest picks that fit: each job in the family shaped like it, at the smallest size with no overload. */
export const solution: Record<JobId, string> = { website: 'm7g.large', routes: 'c7g.xlarge', cache: 'r7g.large' }
