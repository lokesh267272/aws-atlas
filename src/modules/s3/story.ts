import type { ClassId } from './storageClasses'

/** One source for the app name and Region: Module 2's story. */
export { story as s3Story } from '../ec2/story'

/** A fixed example bucket name, the same for every learner. */
export const BUCKET_NAME = 'mealhop-files'

export type PrefixId = 'menu' | 'receipts' | 'delivery' | 'backups' | 'reports'
export const PREFIX_IDS: PrefixId[] = ['menu', 'receipts', 'delivery', 'backups', 'reports']

export interface FileType {
  id: PrefixId
  /** The key prefix, e.g. 'menu/'. */
  prefix: string
  label: string
  /** Can Mealhop make it again if it is lost? */
  recreatable: boolean
  /** Example sizes (not real data). */
  storedGb: number
  newGbPerMonth: number
  avgObjectMb: number
  /** Days Mealhop keeps it; null = no limit. */
  keepDays: number | null
  /** Delete after keepDays (true) or just stop caring (false). */
  deleteAfterKeep: boolean
}

export const FILE_TYPES: Record<PrefixId, FileType> = {
  menu: { id: 'menu', prefix: 'menu/', label: 'Menu photos', recreatable: false, storedGb: 400, newGbPerMonth: 20, avgObjectMb: 1, keepDays: null, deleteAfterKeep: false },
  receipts: { id: 'receipts', prefix: 'receipts/', label: 'Order receipts', recreatable: false, storedGb: 300, newGbPerMonth: 30, avgObjectMb: 0.2, keepDays: 2555, deleteAfterKeep: false },
  delivery: { id: 'delivery', prefix: 'delivery/', label: 'Delivery photos', recreatable: false, storedGb: 900, newGbPerMonth: 900, avgObjectMb: 3, keepDays: 30, deleteAfterKeep: true },
  backups: { id: 'backups', prefix: 'backups/', label: 'Nightly backups', recreatable: false, storedGb: 600, newGbPerMonth: 600, avgObjectMb: 20000, keepDays: 30, deleteAfterKeep: true },
  reports: { id: 'reports', prefix: 'reports/', label: 'Daily sales reports', recreatable: true, storedGb: 150, newGbPerMonth: 15, avgObjectMb: 5, keepDays: null, deleteAfterKeep: false },
}

/** The sensible shelf for each file type. */
export const RECOMMENDED_CLASSES: Record<PrefixId, ClassId> = {
  menu: 'standard',
  receipts: 'standard-ia',
  delivery: 'standard-ia',
  backups: 'standard-ia',
  reports: 'one-zone-ia',
}
