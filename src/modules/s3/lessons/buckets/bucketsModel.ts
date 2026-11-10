import { BUCKET_NAME, s3Story } from '../../story'

/* ------------------------------------------------------------------ Bucket names */

/** Why a bucket name can't be used. Order here is the order they are shown. */
export type NameProblem = 'too-short' | 'too-long' | 'bad-chars' | 'bad-edge' | 'double-dot' | 'looks-like-ip' | 'reserved' | 'taken'

/** Prefixes and suffixes AWS reserves, so no bucket name can start or end with them (checked against the AWS docs). */
export const RESERVED_PREFIXES: string[] = ['xn--', 'sthree-', 'amzn-s3-demo-']
export const RESERVED_SUFFIXES: string[] = ['-s3alias', '--ol-s3', '.mrap', '--x-s3', '--table-s3', '-an']

/** Names another AWS account already owns in this story. Each one is otherwise a valid name. */
export const TAKEN_NAMES: string[] = ['mealhop', 'mealhop-app', 'food-photos', 'photos', 'my-bucket', 'test-bucket']

/**
 * The general purpose bucket naming rules, checked after trimming pasted spaces:
 * 3 to 63 characters; only lowercase letters, numbers, dots and hyphens; starts and ends with a letter or number;
 * no two dots in a row; not shaped like an IP address; no reserved prefix or suffix; and not already owned by anyone (names are global).
 * A name with another problem is never reported as taken.
 */
export function bucketNameProblems(raw: string, taken: string[] = TAKEN_NAMES): NameProblem[] {
  const name = raw.trim()
  const out: NameProblem[] = []
  if (name.length < 3) out.push('too-short')
  if (name.length > 63) out.push('too-long')
  if (/[^a-z0-9.-]/.test(name)) out.push('bad-chars')
  if (/^[.-]|[.-]$/.test(name)) out.push('bad-edge')
  if (name.includes('..')) out.push('double-dot')
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(name)) out.push('looks-like-ip')
  if (RESERVED_PREFIXES.some((x) => name.startsWith(x)) || RESERVED_SUFFIXES.some((x) => name.endsWith(x))) out.push('reserved')
  if (out.length === 0 && taken.includes(name)) out.push('taken')
  return out
}

/* ------------------------------------------------------------------ Files and keys */

export type Prefix = '' | 'menu/' | 'receipts/' | 'delivery/'
export const PREFIXES: Prefix[] = ['', 'menu/', 'receipts/', 'delivery/']

/** The keys Mealhop's app asks S3 for when it shows the menu. */
export const APP_KEYS: string[] = ['menu/dosa.jpg', 'menu/biryani.jpg', 'menu/lassi.jpg']

export interface DeskFile {
  file: string
  /** What it is, in plain words. */
  label: string
  kind: 'photo' | 'pdf'
  /** Stored as metadata with the object. */
  contentType: 'image/jpeg' | 'application/pdf'
  /** Example size (sizes follow the story's averages). */
  sizeMb: number
}

/** Files waiting on Mealhop's desk: the three menu photos the app needs, a receipt and a rider's delivery photo. */
export const DESK_FILES: DeskFile[] = [
  { file: 'dosa.jpg', label: 'Masala dosa photo', kind: 'photo', contentType: 'image/jpeg', sizeMb: 1.1 },
  { file: 'biryani.jpg', label: 'Veg biryani photo', kind: 'photo', contentType: 'image/jpeg', sizeMb: 0.9 },
  { file: 'lassi.jpg', label: 'Mango lassi photo', kind: 'photo', contentType: 'image/jpeg', sizeMb: 0.8 },
  { file: 'order-1042.pdf', label: 'Receipt for order 1042', kind: 'pdf', contentType: 'application/pdf', sizeMb: 0.2 },
  { file: 'delivered-1042.jpg', label: 'Delivery photo, order 1042', kind: 'photo', contentType: 'image/jpeg', sizeMb: 3 },
]

export function deskFile(file: string): DeskFile | undefined {
  return DESK_FILES.find((f) => f.file === file)
}

export interface BucketState {
  bucket: { name: string; region: string } | null
  objects: { key: string; file: string }[]
}

export const emptyState: BucketState = { bucket: null, objects: [] }

/** Creates the bucket in Mumbai if the name is usable. A bucket can't be renamed, so an existing one stays as it is. */
export function createBucket(s: BucketState, raw: string, taken: string[] = TAKEN_NAMES): BucketState {
  if (s.bucket || bucketNameProblems(raw, taken).length > 0) return s
  return { ...s, bucket: { name: raw.trim(), region: s3Story.regionCode } }
}

/** The key is the prefix plus the file name: "folders" are only the start of the key. */
export const keyFor = (file: string, prefix: Prefix) => prefix + file

/** Puts a file in the bucket under prefix + file. The same key again replaces the object. No bucket, no upload. */
export function upload(s: BucketState, file: string, prefix: Prefix): BucketState {
  if (!s.bucket) return s
  const key = keyFor(file, prefix)
  const at = s.objects.findIndex((o) => o.key === key)
  const objects = at >= 0 ? s.objects.map((o, i) => (i === at ? { key, file } : o)) : [...s.objects, { key, file }]
  return { ...s, objects }
}

export function removeObject(s: BucketState, key: string): BucketState {
  return { ...s, objects: s.objects.filter((o) => o.key !== key) }
}

/** The app's keys with no object behind them (all of them when there is no bucket). */
export function missingKeys(s: BucketState): string[] {
  if (!s.bucket) return [...APP_KEYS]
  return APP_KEYS.filter((k) => !s.objects.some((o) => o.key === k))
}

export function menuLoads(s: BucketState): boolean {
  return s.bucket !== null && missingKeys(s).length === 0
}

/** One way to stock the menu: a free name in Mumbai and each photo under the key the app asks for. */
export const solution: BucketState = {
  bucket: { name: BUCKET_NAME, region: s3Story.regionCode },
  objects: APP_KEYS.map((key) => ({ key, file: key.slice('menu/'.length) })),
}

/* ------------------------------------------------------------------ Where the copies live */

export type Where = 's3-standard' | 'ebs'
export type AzIndex = 0 | 1 | 2
/**
 * Two kinds of break, each matching a documented fact:
 * - device: one disk or server fails. S3 Standard keeps copies on multiple devices, and an EBS volume's data is
 *   replicated across multiple servers in its AZ, so neither loses the photo.
 * - az: a whole AZ (all of its data centers) is out. S3 Standard still has copies in the other AZs; an EBS volume
 *   lives in one AZ, so it can't be read.
 */
export type Break = { kind: 'device' | 'az'; az: AzIndex }

export const AZ_INDEXES: AzIndex[] = [0, 1, 2]

/** Copies drawn on separate devices inside each AZ that holds the data (AWS only says "multiple"). */
export const COPIES_PER_AZ = 2
/** Devices drawn in each AZ, and which of them hold a copy. */
export const DEVICES_PER_AZ = 4
export const DATA_DEVICES = [0, 2] as const
/** The AZ the EBS volume (Module 2) lives in. */
export const EBS_AZ: AzIndex = 0

/** The AZs that hold copies: all three for S3 Standard, one for an EBS volume. */
export function homeAzs(where: Where): AzIndex[] {
  return where === 's3-standard' ? AZ_INDEXES : [EBS_AZ]
}

/** The whole AZ is out. */
export function azOut(az: AzIndex, breaks: Break[]): boolean {
  return breaks.some((b) => b.az === az && b.kind === 'az')
}

/**
 * A device in this AZ is broken. The sim breaks at most one per AZ (more breaks there change nothing), because
 * what AWS documents is that a single failing device or server loses no data.
 */
export function deviceBroken(az: AzIndex, breaks: Break[]): boolean {
  return breaks.some((b) => b.az === az && b.kind === 'device')
}

/** Copies left in each AZ, as [AZ 0, AZ 1, AZ 2]. */
export function copiesLeft(where: Where, breaks: Break[]): number[] {
  const homes = homeAzs(where)
  return AZ_INDEXES.map((az) =>
    !homes.includes(az) || azOut(az, breaks) ? 0 : COPIES_PER_AZ - (deviceBroken(az, breaks) ? 1 : 0),
  )
}

/** The photo can be read while any copy is left. */
export function readable(where: Where, breaks: Break[]): boolean {
  return copiesLeft(where, breaks).some((n) => n > 0)
}

/** The AZ a read is served from: the first one with a copy left, or null. */
export function servingAz(where: Where, breaks: Break[]): AzIndex | null {
  const left = copiesLeft(where, breaks)
  return AZ_INDEXES.find((az) => left[az] > 0) ?? null
}
