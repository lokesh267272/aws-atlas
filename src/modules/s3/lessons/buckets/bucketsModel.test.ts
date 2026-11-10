import { describe, expect, it } from 'vitest'
import {
  APP_KEYS,
  DESK_FILES,
  TAKEN_NAMES,
  bucketNameProblems,
  copiesLeft,
  createBucket,
  emptyState,
  menuLoads,
  missingKeys,
  readable,
  removeObject,
  solution,
  upload,
  type BucketState,
} from './bucketsModel'

/** A bucket created, no objects yet. */
const withBucket: BucketState = { bucket: { name: 'mealhop-files-mumbai', region: 'ap-south-1' }, objects: [] }
/** The brief's `empty` fixture means the same: bucket created, nothing in it. */
const empty = withBucket

describe('bucket names', () => {
  it.each([
    ['', ['too-short']], ['ab', ['too-short']], ['a'.repeat(64), ['too-long']], ['Mealhop', ['bad-chars']], ['meal_hop', ['bad-chars']],
    ['meal hop', ['bad-chars']], ['mealhop-', ['bad-edge']], ['meal..hop', ['double-dot']], ['192.168.1.1', ['looks-like-ip']], ['mealhop', ['taken']],
    ['xn--photos', ['reserved']], ['sthree-files', ['reserved']], ['amzn-s3-demo-bucket', ['reserved']], ['my-bucket-s3alias', ['reserved']],
    ['data--ol-s3', ['reserved']], ['site.mrap', ['reserved']], ['data--x-s3', ['reserved']], ['data--table-s3', ['reserved']], ['mealhop-123456789012-ap-south-1-an', ['reserved']],
  ])('%s → %j', (name, problems) => { expect(bucketNameProblems(name)).toEqual(problems) })

  it('reserved names are only reserved at the start or end', () => { expect(bucketNameProblems('my-xn--files')).toEqual([]); expect(bucketNameProblems('s3alias-files')).toEqual([]) })

  it('trims pasted spaces', () => { expect(bucketNameProblems('  mealhop-files-mumbai ')).toEqual([]) })

  it('accepts the edges of the length rule and dots inside a name', () => {
    expect(bucketNameProblems('abc')).toEqual([])
    expect(bucketNameProblems('a'.repeat(63))).toEqual([])
    expect(bucketNameProblems('mealhop.files')).toEqual([])
  })

  it('rejects a name that starts with a dot or hyphen', () => {
    expect(bucketNameProblems('-mealhop')).toEqual(['bad-edge'])
    expect(bucketNameProblems('.mealhop')).toEqual(['bad-edge'])
  })

  it("'mealhop' is owned by another account; every taken name is otherwise valid", () => {
    expect(TAKEN_NAMES).toContain('mealhop')
    for (const n of TAKEN_NAMES) expect(bucketNameProblems(n, [])).toEqual([])
  })

  it('uses the taken list it is given', () => {
    expect(bucketNameProblems('mealhop', [])).toEqual([])
    expect(bucketNameProblems('mealhop-files', ['mealhop-files'])).toEqual(['taken'])
  })
})

describe('creating a bucket', () => {
  it('creates a bucket in Mumbai with the trimmed name', () => {
    expect(createBucket(emptyState, ' mealhop-files ').bucket).toEqual({ name: 'mealhop-files', region: 'ap-south-1' })
  })

  it('refuses a name with a problem, and never renames an existing bucket', () => {
    expect(createBucket(emptyState, 'mealhop')).toBe(emptyState)
    expect(createBucket(withBucket, 'another-name')).toBe(withBucket)
  })
})

describe('objects and keys', () => {
  it('folders are just part of the key', () => { expect(upload(empty, 'dosa.jpg', 'menu/').objects[0].key).toBe('menu/dosa.jpg') })

  it('wrong prefix leaves the key missing', () => { expect(missingKeys(upload(withBucket, 'dosa.jpg', '')).length).toBe(3) })

  it('the solution loads the menu', () => { expect(menuLoads(solution)).toBe(true) })

  it('nothing uploads before a bucket exists', () => {
    expect(upload(emptyState, 'dosa.jpg', 'menu/')).toBe(emptyState)
    expect(menuLoads(emptyState)).toBe(false)
  })

  it('re-uploading the same key replaces the object instead of adding one', () => {
    const once = upload(withBucket, 'dosa.jpg', 'menu/')
    const twice = upload(once, 'dosa.jpg', 'menu/')
    expect(twice.objects).toHaveLength(1)
    expect(upload(once, 'dosa.jpg', '').objects.map((o) => o.key)).toEqual(['menu/dosa.jpg', 'dosa.jpg'])
  })

  it('the same file under another prefix is another object', () => {
    const s = upload(upload(withBucket, 'dosa.jpg', 'menu/'), 'dosa.jpg', 'delivery/')
    expect(s.objects.map((o) => o.key)).toEqual(['menu/dosa.jpg', 'delivery/dosa.jpg'])
  })

  it('missing keys shrink as the right photos arrive; extra objects do no harm', () => {
    let s = upload(withBucket, 'order-1042.pdf', 'receipts/')
    expect(missingKeys(s)).toEqual(APP_KEYS)
    s = upload(s, 'dosa.jpg', 'menu/')
    s = upload(s, 'biryani.jpg', 'menu/')
    expect(missingKeys(s)).toEqual(['menu/lassi.jpg'])
    s = upload(s, 'lassi.jpg', 'menu/')
    expect(menuLoads(s)).toBe(true)
  })

  it('removing an object brings its key back to missing', () => {
    expect(missingKeys(removeObject(solution, 'menu/dosa.jpg'))).toEqual(['menu/dosa.jpg'])
  })

  it('the desk has the three menu photos, a receipt and a delivery photo', () => {
    const files = DESK_FILES.map((f) => f.file)
    for (const k of APP_KEYS) expect(files).toContain(k.replace('menu/', ''))
    expect(files).toContain('order-1042.pdf')
    expect(DESK_FILES).toHaveLength(5)
    expect(APP_KEYS.every((k) => k.startsWith('menu/') && k.endsWith('.jpg'))).toBe(true)
  })

  it('the solution uses a valid, free name in Mumbai', () => {
    expect(bucketNameProblems(solution.bucket!.name)).toEqual([])
    expect(solution.bucket!.region).toBe('ap-south-1')
  })
})

describe('where the copies live', () => {
  it('S3 Standard survives a whole AZ; an EBS volume does not', () => {
    expect(readable('s3-standard', [{ kind: 'az', az: 0 }])).toBe(true)
    expect(readable('ebs', [{ kind: 'az', az: 0 }])).toBe(false)
    expect(readable('s3-standard', [{ kind: 'az', az: 0 }, { kind: 'az', az: 1 }])).toBe(true)
  })

  it('one broken device never loses the photo, in S3 or on an EBS volume', () => {
    expect(readable('s3-standard', [{ kind: 'device', az: 0 }])).toBe(true)
    expect(readable('ebs', [{ kind: 'device', az: 0 }])).toBe(true)
  })

  it('a second broken device in the same AZ adds nothing: the sim claims only that one device failing loses nothing', () => {
    expect(copiesLeft('ebs', [{ kind: 'device', az: 0 }, { kind: 'device', az: 0 }])).toEqual([1, 0, 0])
    expect(readable('ebs', [{ kind: 'device', az: 0 }, { kind: 'device', az: 0 }])).toBe(true)
  })

  it('a broken device and a whole AZ out in the same AZ: the AZ wins', () => {
    expect(copiesLeft('s3-standard', [{ kind: 'device', az: 0 }, { kind: 'az', az: 0 }])).toEqual([0, 2, 2])
  })

  it('breaking AZs the EBS volume is not in leaves it readable', () => {
    expect(readable('ebs', [{ kind: 'az', az: 1 }, { kind: 'az', az: 2 }])).toBe(true)
  })

  it('S3 Standard is unreadable only when every AZ in the Region is out', () => {
    expect(readable('s3-standard', [{ kind: 'az', az: 0 }, { kind: 'az', az: 1 }, { kind: 'az', az: 2 }])).toBe(false)
  })

  it('counts copies per AZ: two in each for S3 Standard, two in AZ 0 only for EBS', () => {
    expect(copiesLeft('s3-standard', [])).toEqual([2, 2, 2])
    expect(copiesLeft('ebs', [])).toEqual([2, 0, 0])
    expect(copiesLeft('s3-standard', [{ kind: 'device', az: 1 }, { kind: 'az', az: 2 }])).toEqual([2, 1, 0])
    expect(copiesLeft('ebs', [{ kind: 'device', az: 0 }])).toEqual([1, 0, 0])
  })
})
