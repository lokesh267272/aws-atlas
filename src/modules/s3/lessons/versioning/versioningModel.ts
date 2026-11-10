/**
 * Lesson 4 model: S3 Versioning for one bucket.
 *
 * Facts it follows (S3 docs, "Retaining multiple versions of objects"):
 *  - A bucket starts unversioned ('off'). Once versioning is enabled it can be suspended,
 *    never returned to unversioned.
 *  - Objects stored while unversioned have the version ID null, and keep it when versioning is turned on.
 *  - On: a PUT adds a new version with its own ID; a simple DELETE adds a delete marker (also with its own ID).
 *  - Suspended: existing versions stay; a PUT replaces the null version (the new null version goes on top);
 *    a DELETE removes the null version, if any, and adds a delete marker whose ID is null.
 *  - Deleting a specific version ID is permanent. Removing the delete marker, or copying an older version
 *    back on top, restores a file.
 *  - Every stored version is billed.
 */

export type Mode = 'off' | 'on' | 'suspended'

export interface Version {
  versionId: string
  content: string
  deleteMarker: boolean
}

export interface VBucket {
  mode: Mode
  /** Every key's versions, oldest first. A key with no versions is absent. */
  objects: Record<string, Version[]>
  /** How many version IDs this bucket has handed out, so an ID is never reused. Internal. */
  seq?: number
}

/* ------------------------------------------------------------- Version IDs */

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

/** A short, random-looking but repeatable version ID (real ones are long opaque strings). */
function makeId(key: string, n: number): string {
  let h = 2166136261
  for (const ch of `${key}#${n}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  let out = ''
  for (let i = 0; i < 8; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) ^ i
    out += ID_CHARS[(h >>> 0) % ID_CHARS.length]
  }
  return out
}

/** A fresh version ID for `key`, and the bucket with its counter moved on. */
function freshId(b: VBucket, key: string): [string, VBucket] {
  const taken = new Set((b.objects[key] ?? []).map((v) => v.versionId))
  let n = (b.seq ?? 0) + 1
  while (taken.has(makeId(key, n))) n += 1
  return [makeId(key, n), { ...b, seq: n }]
}

/* ------------------------------------------------------------------ Basics */

const versionsOf = (b: VBucket, key: string): Version[] => b.objects[key] ?? []

function withVersions(b: VBucket, key: string, versions: Version[]): VBucket {
  const objects = { ...b.objects }
  if (versions.length > 0) objects[key] = versions
  else delete objects[key]
  return { ...b, objects }
}

/** Turn versioning on or suspend it. Off is ignored once the bucket has been on; suspend needs it to have been on. */
export function setMode(b: VBucket, m: Mode): VBucket {
  if (m === b.mode) return b
  if (m === 'off') return b // only a never-versioned bucket is off
  if (m === 'suspended' && b.mode === 'off') return b
  return { ...b, mode: m }
}

/** Upload (or overwrite) `key` with `content`. */
export function put(b: VBucket, key: string, content: string): VBucket {
  const list = versionsOf(b, key)
  switch (b.mode) {
    case 'off':
      return withVersions(b, key, [{ versionId: 'null', content, deleteMarker: false }])
    case 'on': {
      const [versionId, next] = freshId(b, key)
      return withVersions(next, key, [...list, { versionId, content, deleteMarker: false }])
    }
    case 'suspended':
      return withVersions(b, key, [...list.filter((v) => v.versionId !== 'null'), { versionId: 'null', content, deleteMarker: false }])
  }
}

/** A simple delete (no version ID given). */
export function del(b: VBucket, key: string): VBucket {
  const list = versionsOf(b, key)
  switch (b.mode) {
    case 'off':
      return withVersions(b, key, [])
    case 'on': {
      const [versionId, next] = freshId(b, key)
      return withVersions(next, key, [...list, { versionId, content: '', deleteMarker: true }])
    }
    case 'suspended':
      return withVersions(b, key, [...list.filter((v) => v.versionId !== 'null'), { versionId: 'null', content: '', deleteMarker: true }])
  }
}

/** Delete one specific version (or marker) for good. */
export function deleteVersion(b: VBucket, key: string, versionId: string): VBucket {
  const list = versionsOf(b, key)
  if (!list.some((v) => v.versionId === versionId)) return b
  return withVersions(b, key, list.filter((v) => v.versionId !== versionId))
}

/** Copy an older version back on top, as a new version. Markers and unknown IDs are ignored. */
export function restoreVersion(b: VBucket, key: string, versionId: string): VBucket {
  const found = versionsOf(b, key).find((v) => v.versionId === versionId)
  if (!found || found.deleteMarker) return b
  return put(b, key, found.content)
}

/** Remove the delete marker on top, if the current version is one. */
export function removeMarker(b: VBucket, key: string): VBucket {
  const top = versionsOf(b, key).at(-1)
  if (!top?.deleteMarker) return b
  return deleteVersion(b, key, top.versionId)
}

/** What a normal read of `key` returns: the current version's content, or null if missing or deleted. */
export function current(b: VBucket, key: string): string | null {
  const top = versionsOf(b, key).at(-1)
  return top && !top.deleteMarker ? top.content : null
}

/** Versions that hold data, across the bucket (delete markers are not counted). */
export function storedVersions(b: VBucket): number {
  return Object.values(b.objects).reduce((n, list) => n + list.filter((v) => !v.deleteMarker).length, 0)
}

/* ------------------------------------------------------ The intern's script */

export const BLANK = 'Blank image'

/** The menu as it should look: each key and its photo. */
export const MENU_BEFORE: Record<string, string> = {
  'menu/biryani.jpg': 'Biryani photo',
  'menu/dosa.jpg': 'Dosa photo',
  'menu/paneer-tikka.jpg': 'Paneer tikka photo',
}

export const MENU_KEYS = Object.keys(MENU_BEFORE)

/** Three dish photos, stored before versioning was ever turned on (so their version ID is null). */
export const MENU_START: VBucket = {
  mode: 'off',
  objects: Object.fromEntries(
    MENU_KEYS.map((key) => [key, [{ versionId: 'null', content: MENU_BEFORE[key], deleteMarker: false }]]),
  ),
}

export interface ScriptStep {
  op: 'put' | 'del'
  key: string
  content?: string
}

/** The intern's bad script: a blank over the biryani photo, then two deletes. */
export const INTERN_SCRIPT: ScriptStep[] = [
  { op: 'put', key: 'menu/biryani.jpg', content: BLANK },
  { op: 'del', key: 'menu/dosa.jpg' },
  { op: 'del', key: 'menu/paneer-tikka.jpg' },
]

export function runScript(b: VBucket): VBucket {
  return INTERN_SCRIPT.reduce((acc, s) => (s.op === 'put' ? put(acc, s.key, s.content ?? BLANK) : del(acc, s.key)), b)
}

/** True when every menu file shows exactly the photo it showed before the script. */
export function menuMatches(b: VBucket): boolean {
  return MENU_KEYS.every((key) => current(b, key) === MENU_BEFORE[key])
}

/** True when `key` shows its photo, or a version holding that photo still exists. */
export function canRestore(b: VBucket, key: string): boolean {
  const good = MENU_BEFORE[key]
  return current(b, key) === good || versionsOf(b, key).some((v) => !v.deleteMarker && v.content === good)
}

/** The Show me path: for each menu file, remove the markers on top and, if needed, copy the newest good version back. */
export function fixAll(b: VBucket): VBucket {
  return MENU_KEYS.reduce((acc, key) => {
    const good = MENU_BEFORE[key]
    if (current(acc, key) === good || !canRestore(acc, key)) return acc
    let next = acc
    while (versionsOf(next, key).at(-1)?.deleteMarker) next = removeMarker(next, key)
    if (current(next, key) === good) return next
    const newest = [...versionsOf(next, key)].reverse().find((v) => !v.deleteMarker && v.content === good)!
    return restoreVersion(next, key, newest.versionId)
  }, b)
}
