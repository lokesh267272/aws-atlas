/** The seven S3 storage classes with EXAMPLE prices (ratios follow real S3 pricing; not a quote). */
export type ClassId =
  | 'standard'
  | 'standard-ia'
  | 'intelligent-tiering'
  | 'one-zone-ia'
  | 'glacier-ir'
  | 'glacier-flexible'
  | 'deep-archive'

export interface StorageClass {
  id: ClassId
  name: string
  /** Key in the shared glossary (terms.ts). */
  termKey: string
  /** Example $ per GB per month. */
  storePerGbMonth: number
  /** Example $ per GB read back (0 = no fee). */
  fetchPerGb: number
  /** Seconds until the first byte arrives. */
  firstByteSeconds: number
  /** Typical wait in words. For the two archive classes this is a standard restore (Bulk and Expedited differ). */
  firstByteLabel: string
  /** Minimum days you are charged for storage. */
  minDays: number
  azs: 1 | 3
}

/** Ordered as the lifecycle "waterfall": rules may move objects down this list. */
export const CLASSES: StorageClass[] = [
  { id: 'standard', name: 'S3 Standard', termKey: 's3-standard', storePerGbMonth: 0.025, fetchPerGb: 0, firstByteSeconds: 0.01, firstByteLabel: 'milliseconds', minDays: 0, azs: 3 },
  { id: 'standard-ia', name: 'S3 Standard-IA', termKey: 's3-standard-ia', storePerGbMonth: 0.014, fetchPerGb: 0.01, firstByteSeconds: 0.01, firstByteLabel: 'milliseconds', minDays: 30, azs: 3 },
  { id: 'intelligent-tiering', name: 'S3 Intelligent-Tiering', termKey: 's3-intelligent-tiering', storePerGbMonth: 0.025, fetchPerGb: 0, firstByteSeconds: 0.01, firstByteLabel: 'milliseconds', minDays: 0, azs: 3 },
  { id: 'one-zone-ia', name: 'S3 One Zone-IA', termKey: 's3-one-zone-ia', storePerGbMonth: 0.011, fetchPerGb: 0.01, firstByteSeconds: 0.01, firstByteLabel: 'milliseconds', minDays: 30, azs: 1 },
  { id: 'glacier-ir', name: 'S3 Glacier Instant Retrieval', termKey: 's3-glacier-instant-retrieval', storePerGbMonth: 0.005, fetchPerGb: 0.03, firstByteSeconds: 0.01, firstByteLabel: 'milliseconds', minDays: 90, azs: 3 },
  { id: 'glacier-flexible', name: 'S3 Glacier Flexible Retrieval', termKey: 's3-glacier-flexible-retrieval', storePerGbMonth: 0.0045, fetchPerGb: 0.01, firstByteSeconds: 3 * 3600, firstByteLabel: '3 to 5 hours', minDays: 90, azs: 3 },
  { id: 'deep-archive', name: 'S3 Glacier Deep Archive', termKey: 's3-glacier-deep-archive', storePerGbMonth: 0.002, fetchPerGb: 0.02, firstByteSeconds: 12 * 3600, firstByteLabel: 'up to 12 hours', minDays: 180, azs: 3 },
]

/** Archive classes must be restored with a request before the file can be read. */
export const needsRestore = (c: StorageClass) => c.firstByteSeconds > 1

/** The wait in one phrase, e.g. "back in milliseconds" or "a standard restore takes up to 12 hours". */
export const waitPhrase = (c: StorageClass) =>
  needsRestore(c) ? `a standard restore takes ${c.firstByteLabel}` : `back in ${c.firstByteLabel}`

export function classById(id: ClassId): StorageClass {
  const found = CLASSES.find((c) => c.id === id)
  if (!found) throw new Error(`Unknown storage class: ${id}`)
  return found
}

/**
 * Intelligent-Tiering stores at the Standard price, then the Standard-IA price after 30 days
 * without a read, then the Glacier IR price after 90. No fetch fee; a small monitoring fee per object.
 */
export const INTELLIGENT_TIERS = {
  frequent: 'standard',
  infrequentAfterDays: 30,
  archiveInstantAfterDays: 90,
  /** Example $ per 1,000 objects per month. */
  monitoringPer1000Objects: 0.0025,
} as const

export const EXAMPLE_PRICE_TAG = 'Example prices'
