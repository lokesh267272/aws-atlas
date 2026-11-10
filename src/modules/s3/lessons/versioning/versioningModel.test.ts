import { describe, expect, it } from 'vitest'
import {
  BLANK,
  INTERN_SCRIPT,
  MENU_BEFORE,
  MENU_START,
  canRestore,
  current,
  del,
  deleteVersion,
  fixAll,
  menuMatches,
  put,
  removeMarker,
  restoreVersion,
  runScript,
  setMode,
  storedVersions,
  type VBucket,
} from './versioningModel'

const DOSA = 'menu/dosa.jpg'
const BIRYANI = 'menu/biryani.jpg'
const on = () => setMode(MENU_START, 'on')

describe('versioning model: the brief', () => {
  it('with versioning off the script destroys the menu for good', () => {
    const b = runScript(MENU_START)
    expect(menuMatches(b)).toBe(false)
    expect(menuMatches(fixAll(b))).toBe(false)
  })

  it('with versioning on everything can be restored', () => {
    const b = runScript(on())
    expect(current(b, DOSA)).toBeNull()
    expect(menuMatches(fixAll(b))).toBe(true)
  })

  it('a delete adds a marker and keeps older versions', () => {
    const b = del(on(), DOSA)
    expect(b.objects[DOSA].at(-1)!.deleteMarker).toBe(true)
    expect(current(removeMarker(b, DOSA), DOSA)).not.toBeNull()
  })

  it('cannot be turned off again, only suspended', () => {
    expect(setMode(setMode(MENU_START, 'on'), 'off').mode).toBe('on')
    expect(setMode(setMode(setMode(MENU_START, 'on'), 'suspended'), 'off').mode).toBe('suspended')
    expect(setMode(setMode(MENU_START, 'on'), 'suspended').mode).toBe('suspended')
  })

  it('deleting a specific version is permanent', () => {
    let b = del(on(), DOSA)
    // The photo stored before versioning was on is the only data version.
    b = deleteVersion(b, DOSA, 'null')
    expect(current(fixAll(b), DOSA)).toBeNull()
    expect(menuMatches(fixAll(b))).toBe(false)
  })

  it('running the script twice and restoring twice stays valid', () => {
    const b = runScript(runScript(on()))
    expect(menuMatches(fixAll(fixAll(b)))).toBe(true)
  })

  it('every version is stored (and billed)', () => {
    expect(storedVersions(runScript(on()))).toBe(4)
  })
})

describe('versioning model: details', () => {
  it('starts off, with three dish photos stored under version ID null', () => {
    expect(MENU_START.mode).toBe('off')
    expect(Object.keys(MENU_START.objects).sort()).toEqual(Object.keys(MENU_BEFORE).sort())
    for (const [key, versions] of Object.entries(MENU_START.objects)) {
      expect(versions).toEqual([{ versionId: 'null', content: MENU_BEFORE[key], deleteMarker: false }])
    }
    expect(menuMatches(MENU_START)).toBe(true)
  })

  it('the script blanks biryani and deletes dosa and paneer tikka', () => {
    expect(INTERN_SCRIPT).toEqual([
      { op: 'put', key: 'menu/biryani.jpg', content: BLANK },
      { op: 'del', key: 'menu/dosa.jpg' },
      { op: 'del', key: 'menu/paneer-tikka.jpg' },
    ])
  })

  it('off: put replaces the only copy and del removes the object', () => {
    const b = put(MENU_START, BIRYANI, 'new photo')
    expect(b.objects[BIRYANI]).toEqual([{ versionId: 'null', content: 'new photo', deleteMarker: false }])
    const gone = del(MENU_START, DOSA)
    expect(gone.objects[DOSA]).toBeUndefined()
    expect(current(gone, DOSA)).toBeNull()
  })

  it('on: put appends a version with a new, unique ID and keeps the old one', () => {
    const b = put(put(on(), BIRYANI, 'photo 2'), BIRYANI, 'photo 3')
    const v = b.objects[BIRYANI]
    expect(v.map((x) => x.content)).toEqual([MENU_BEFORE[BIRYANI], 'photo 2', 'photo 3'])
    expect(v[0].versionId).toBe('null')
    expect(v[1].versionId).not.toBe('null')
    expect(new Set(v.map((x) => x.versionId)).size).toBe(3)
    expect(current(b, BIRYANI)).toBe('photo 3')
  })

  it('on: a delete on a missing key still adds a marker', () => {
    const b = del(del(on(), DOSA), DOSA)
    expect(b.objects[DOSA].map((x) => x.deleteMarker)).toEqual([false, true, true])
    // One removeMarker takes off only the top marker: the file still looks deleted.
    expect(current(removeMarker(b, DOSA), DOSA)).toBeNull()
    expect(current(removeMarker(removeMarker(b, DOSA), DOSA), DOSA)).toBe(MENU_BEFORE[DOSA])
  })

  it('removeMarker does nothing when the current version is data', () => {
    const b = on()
    expect(removeMarker(b, DOSA)).toEqual(b)
  })

  it('restoreVersion copies an older version on top as a new version', () => {
    let b = put(on(), BIRYANI, BLANK)
    b = restoreVersion(b, BIRYANI, 'null')
    const v = b.objects[BIRYANI]
    expect(v).toHaveLength(3)
    expect(v[2].content).toBe(MENU_BEFORE[BIRYANI])
    expect(v[2].versionId).not.toBe('null')
    expect(current(b, BIRYANI)).toBe(MENU_BEFORE[BIRYANI])
  })

  it('restoreVersion on top of a delete marker brings the file back', () => {
    const b = restoreVersion(del(on(), DOSA), DOSA, 'null')
    expect(current(b, DOSA)).toBe(MENU_BEFORE[DOSA])
  })

  it('restoreVersion ignores markers and unknown IDs', () => {
    const b = del(on(), DOSA)
    const markerId = b.objects[DOSA][1].versionId
    expect(restoreVersion(b, DOSA, markerId)).toEqual(b)
    expect(restoreVersion(b, DOSA, 'nope')).toEqual(b)
  })

  it('suspended: existing versions stay, put and del replace the null version', () => {
    let b = put(on(), BIRYANI, 'photo 2') // [null: original, id: photo 2]
    b = setMode(b, 'suspended')
    b = put(b, BIRYANI, 'photo 3')
    const v = b.objects[BIRYANI]
    // The original (null) is replaced; photo 2 keeps its ID; photo 3 is the new null version on top.
    expect(v.map((x) => [x.versionId === 'null', x.content])).toEqual([
      [false, 'photo 2'],
      [true, 'photo 3'],
    ])
    const d = del(b, BIRYANI)
    expect(d.objects[BIRYANI].map((x) => [x.versionId, x.deleteMarker])).toEqual([
      [v[0].versionId, false],
      ['null', true],
    ])
  })

  it('suspended: a delete with no null version still adds a null marker', () => {
    let b = put(del(on(), DOSA), DOSA, 'dosa 2') // null data, marker, data
    b = deleteVersion(b, DOSA, 'null')
    b = del(setMode(b, 'suspended'), DOSA)
    expect(b.objects[DOSA].at(-1)).toEqual({ versionId: 'null', content: '', deleteMarker: true })
    expect(b.objects[DOSA]).toHaveLength(3)
  })

  it('suspending before the script does not save files stored as null', () => {
    const b = runScript(setMode(on(), 'suspended'))
    expect(menuMatches(fixAll(b))).toBe(false)
  })

  it('suspend needs versioning to have been on first', () => {
    expect(setMode(MENU_START, 'suspended').mode).toBe('off')
  })

  it('deleteVersion of the last version removes the key', () => {
    const b = deleteVersion(on(), DOSA, 'null')
    expect(b.objects[DOSA]).toBeUndefined()
  })

  it('storedVersions skips markers', () => {
    expect(storedVersions(MENU_START)).toBe(3)
    expect(storedVersions(del(on(), DOSA))).toBe(3)
    expect(storedVersions(put(on(), DOSA, 'x'))).toBe(4)
  })

  it('canRestore says whether a good copy of a file still exists', () => {
    const lost = runScript(MENU_START)
    expect(canRestore(lost, DOSA)).toBe(false)
    expect(canRestore(runScript(on()), DOSA)).toBe(true)
  })

  it('fixAll leaves a bucket that already matches unchanged', () => {
    expect(fixAll(on())).toEqual(on())
  })

  it('the model never mutates its input', () => {
    const b: VBucket = on()
    const snapshot = JSON.stringify(b)
    runScript(b)
    fixAll(runScript(b))
    deleteVersion(b, DOSA, 'null')
    expect(JSON.stringify(b)).toBe(snapshot)
  })
})
