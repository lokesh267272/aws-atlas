import { classById, INTELLIGENT_TIERS, type ClassId } from '../../storageClasses'
import { FILE_TYPES, PREFIX_IDS, RECOMMENDED_CLASSES, type PrefixId } from '../../story'

/** Which storage class ("shelf") each of Mealhop's file types sits on. */
export type Placement = Record<PrefixId, ClassId>

export type MonthEvent =
  | { kind: 'fetch'; prefix: PrefixId; gb: number; deadlineSeconds: number; label: string }
  | { kind: 'az-destroyed'; az: 0 | 1 | 2 }

export type FetchEvent = Extract<MonthEvent, { kind: 'fetch' }>
export type AzEvent = Extract<MonthEvent, { kind: 'az-destroyed' }>

/** One Zone-IA data lives in this AZ (index into the story's AZ list). */
export const ONE_ZONE_AZ = 0 as const

const gbOf = (prefix: PrefixId, objects: number) => (FILE_TYPES[prefix].avgObjectMb * objects) / 1000

/** The month, in order. Fetch sizes come from the shared example file sizes. */
export const MONTH_EVENTS: MonthEvent[] = [
  // The servers read every menu photo about five times over.
  { kind: 'fetch', prefix: 'menu', gb: FILE_TYPES.menu.storedGb * 5, deadlineSeconds: 1, label: 'The app reads menu photos all month' },
  { kind: 'fetch', prefix: 'delivery', gb: gbOf('delivery', 1), deadlineSeconds: 60, label: 'A complaint needs one delivery photo' },
  { kind: 'fetch', prefix: 'backups', gb: gbOf('backups', 1), deadlineSeconds: 3600, label: "A restore needs last night's backup" },
  { kind: 'fetch', prefix: 'reports', gb: gbOf('reports', 10), deadlineSeconds: 60, label: 'A manager opens a few reports' },
  { kind: 'fetch', prefix: 'receipts', gb: 10, deadlineSeconds: 60, label: 'Customers download their receipts' },
  { kind: 'az-destroyed', az: ONE_ZONE_AZ },
]

/** Example budget for the month (the recommended shelves cost a little under it). */
export const MONTH_BUDGET = 38

/** The sensible shelf for each file type: the same one the file-store diagram shows. */
export const solution: Placement = RECOMMENDED_CLASSES

/** The challenge starts with everything on the front counter. */
export const START_PLACEMENT: Placement = { menu: 'standard', receipts: 'standard', delivery: 'standard', backups: 'standard', reports: 'standard' }

/** How many objects a prefix holds (example sizes, 1 GB = 1,000 MB). */
export function objectCount(prefix: PrefixId): number {
  const f = FILE_TYPES[prefix]
  return Math.round((f.storedGb * 1000) / f.avgObjectMb)
}

/**
 * Storage price per GB for one month. Intelligent-Tiering bills its frequent tier (the Standard price)
 * in month one: nothing has gone 30 days unread yet.
 */
export function monthStorePrice(id: ClassId): number {
  return id === 'intelligent-tiering' ? classById(INTELLIGENT_TIERS.frequent).storePerGbMonth : classById(id).storePerGbMonth
}

export interface BillLine {
  prefix: PrefixId
  /** Keeping the stored GB for the month. */
  store: number
  fetch: number
  /** Intelligent-Tiering's fee per object. */
  monitoring: number
  /** Extra days billed because the files are deleted before the shelf's minimum storage duration. */
  minDuration: number
}

/**
 * For files Mealhop deletes before the shelf's minimum storage duration: how long they live, and how long
 * they are billed. Null when the minimum doesn't bite (kept files, or a minimum no longer than their life).
 */
export function billedDays(prefix: PrefixId, id: ClassId): { lives: number; billed: number } | null {
  const f = FILE_TYPES[prefix]
  const min = classById(id).minDays
  if (!f.deleteAfterKeep || f.keepDays === null || min <= f.keepDays) return null
  return { lives: f.keepDays, billed: min }
}

/**
 * One month's bill, in a steady month: Intelligent-Tiering is billed at its frequent tier plus monitoring,
 * since nothing has gone 30 days unread yet. Files that live only 30 days (delivery photos, backups) are
 * deleted each month, so a shelf with a longer minimum bills each batch for the full minimum: the extra days
 * show as `minDuration`.
 */
export function monthCost(p: Placement): { lines: BillLine[]; total: number } {
  const lines = PREFIX_IDS.map((prefix): BillLine => {
    const id = p[prefix]
    const store = FILE_TYPES[prefix].storedGb * monthStorePrice(id)
    const fetch = MONTH_EVENTS.reduce(
      (n, e) => (e.kind === 'fetch' && e.prefix === prefix ? n + e.gb * classById(id).fetchPerGb : n),
      0,
    )
    const monitoring = id === 'intelligent-tiering' ? (objectCount(prefix) / 1000) * INTELLIGENT_TIERS.monitoringPer1000Objects : 0
    const days = billedDays(prefix, id)
    const minDuration = days ? (store * (days.billed - days.lives)) / days.lives : 0
    return { prefix, store, fetch, monitoring, minDuration }
  })
  return { lines, total: lines.reduce((n, l) => n + l.store + l.fetch + l.monitoring + l.minDuration, 0) }
}

export type StepResult =
  | { kind: 'fetch'; event: FetchEvent; onTime: boolean; waitSeconds: number; fee: number }
  | { kind: 'az-destroyed'; event: AzEvent; lost: PrefixId[]; remade: PrefixId[] }

/** What each event of the month did, in order. */
export function playMonth(p: Placement): StepResult[] {
  return MONTH_EVENTS.map((event): StepResult => {
    if (event.kind === 'fetch') {
      const c = classById(p[event.prefix])
      return { kind: 'fetch', event, onTime: c.firstByteSeconds <= event.deadlineSeconds, waitSeconds: c.firstByteSeconds, fee: event.gb * c.fetchPerGb }
    }
    // One Zone-IA keeps its only copy in ONE_ZONE_AZ: destroying that AZ (fire, flood) loses it.
    const hit = event.az === ONE_ZONE_AZ ? PREFIX_IDS.filter((id) => classById(p[id]).azs === 1) : []
    return {
      kind: 'az-destroyed',
      event,
      lost: hit.filter((id) => !FILE_TYPES[id].recreatable),
      remade: hit.filter((id) => FILE_TYPES[id].recreatable),
    }
  })
}

/** Runs the month: the bill, the late fetches (by label), and what the destroyed AZ took. */
export function runMonth(p: Placement): { cost: number; late: string[]; lost: PrefixId[]; remade: PrefixId[]; solved: boolean } {
  const steps = playMonth(p)
  const cost = monthCost(p).total
  const late = steps.flatMap((s) => (s.kind === 'fetch' && !s.onTime ? [s.event.label] : []))
  const lost = steps.flatMap((s) => (s.kind === 'az-destroyed' ? s.lost : []))
  const remade = steps.flatMap((s) => (s.kind === 'az-destroyed' ? s.remade : []))
  return { cost, late, lost, remade, solved: cost <= MONTH_BUDGET && late.length === 0 && lost.length === 0 }
}
