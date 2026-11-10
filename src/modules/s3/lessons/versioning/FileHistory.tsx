import { useId, useState } from 'react'
import { ImageOff, ImagePlus, Info, Trash2, Undo2 } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Button, Pill, Readout } from '../../../../components/controls'
import { Term } from '../../../../components/Term'
import { classById, EXAMPLE_PRICE_TAG } from '../../storageClasses'
import { FILE_TYPES } from '../../story'
import { ModeControl, PhotoTile, StackLegend, VersionStack } from './parts'
import {
  BLANK,
  MENU_BEFORE,
  MENU_START,
  current,
  del,
  deleteVersion,
  put,
  removeMarker,
  restoreVersion,
  setMode,
  storedVersions,
  type Mode,
  type VBucket,
} from './versioningModel'

const KEY = 'menu/biryani.jpg'

/** Just the biryani photo from the starting menu: stored before versioning was turned on, so its version ID is null. */
const START_BUCKET: VBucket = { ...MENU_START, objects: { [KEY]: MENU_START.objects[KEY] } }

type Action = 'upload' | 'blank' | 'delete' | 'restore' | 'remove-marker' | 'delete-version'

type HistoryEvent =
  | { kind: 'mode'; mode: Mode }
  | { kind: Action; mode: Mode; hadFile: boolean; versionId?: string }

interface HistoryState {
  bucket: VBucket
  /** The number of the next new photo ("Biryani photo 2", "… 3"). */
  nextPhoto: number
  last: HistoryEvent | null
}

const START: HistoryState = { bucket: START_BUCKET, nextPhoto: 2, last: null }

/** The status line: what the last action did, and why. */
export function historyMessage(last: HistoryEvent | null): string {
  if (!last) return 'Versioning is off, as on every new bucket. Overwrite or delete the photo and see what is left.'
  switch (last.kind) {
    case 'mode':
      return last.mode === 'on'
        ? 'Versioning on. Anything saved earlier keeps the version ID null.'
        : 'Suspended: older versions stay, but new uploads and deletes replace the null version.'
    case 'upload':
    case 'blank':
      if (last.mode === 'off')
        return last.hadFile ? 'Versioning off: the old image was replaced and is gone for good.' : 'Uploaded as the only copy, version ID null.'
      if (last.mode === 'suspended') return 'Saved as the null version, replacing any older null version. Other versions stay.'
      return last.kind === 'blank'
        ? 'Oops, a blank image is now current, but the real photo is kept underneath.'
        : 'New version on top. The old photo is kept underneath.'
    case 'delete':
      if (last.mode === 'off') return 'Versioning off: the photo is deleted for good.'
      if (last.mode === 'suspended') return 'A delete marker hides the file. Only the null version, if any, is gone for good.'
      return 'A delete marker now hides the file. Older versions are kept, so you can undo it.'
    case 'restore':
      return last.mode === 'suspended'
        ? 'Copied back on top as the null version, replacing any older null version.'
        : 'That version was copied back on top as a new version, so it is current again.'
    case 'remove-marker':
      return 'Marker removed: the newest version under it shows again.'
    case 'delete-version':
      return `Version ${last.versionId} is deleted for good. Nothing can bring it back.`
  }
}

const money = (n: number) => `$${n.toFixed(2)}`

export function FileHistory() {
  const [s, setS] = useState<HistoryState>(START)
  const actionsId = useId()
  const b = s.bucket
  const now = current(b, KEY)
  const top = b.objects[KEY]?.at(-1)
  const hasFile = now !== null

  const act = (kind: Action, change: (b: VBucket) => VBucket, extra: Partial<HistoryState> = {}, versionId?: string) =>
    setS((prev) => ({
      ...prev,
      ...extra,
      bucket: change(prev.bucket),
      last: { kind, mode: prev.bucket.mode, hadFile: current(prev.bucket, KEY) !== null, versionId },
    }))

  const chooseMode = (m: Mode) =>
    setS((prev) => {
      const bucket = setMode(prev.bucket, m)
      return bucket === prev.bucket ? prev : { ...prev, bucket, last: { kind: 'mode', mode: m } }
    })

  const versions = storedVersions(b)
  const standard = classById('standard')
  const gb = FILE_TYPES.menu.storedGb

  return (
    <Bench
      title="Try it: keep a photo's history"
      intro={
        <>
          Overwrite and delete the biryani photo with <Term k="versioning">versioning</Term> off, then on, and watch what its
          history keeps.
        </>
      }
      onReset={() => setS(START)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <ModeControl mode={b.mode} onChange={chooseMode} />
          {/* aria-disabled, not disabled, so keyboard focus stays on a button that just became unavailable. */}
          <div role="group" aria-labelledby={actionsId} className="min-w-0">
            <p id={actionsId} className="mb-1.5 text-sm font-bold text-ink-2">
              Change <code className="font-mono text-xs">{KEY}</code>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => act('upload', (x) => put(x, KEY, `${MENU_BEFORE[KEY]} ${s.nextPhoto}`), { nextPhoto: s.nextPhoto + 1 })}
              >
                <ImagePlus aria-hidden />
                Upload new photo
              </Button>
              <Button size="sm" onClick={() => act('blank', (x) => put(x, KEY, BLANK))}>
                <ImageOff aria-hidden />
                Overwrite with blank
              </Button>
              <Button size="sm" aria-disabled={!hasFile} onClick={() => hasFile && act('delete', (x) => del(x, KEY))}>
                <Trash2 aria-hidden />
                Delete
              </Button>
              <Button
                size="sm"
                aria-disabled={!top?.deleteMarker}
                onClick={() => top?.deleteMarker && act('remove-marker', (x) => removeMarker(x, KEY))}
              >
                <Undo2 aria-hidden />
                Remove marker
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-md border border-line bg-paper px-3.5 py-3" aria-live="polite">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
          <p className="text-ink-2">{historyMessage(s.last)}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <div className="min-w-0">
            <p className="mb-1.5 text-sm font-bold text-ink-2">What the app gets</p>
            <PhotoTile content={now} />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-sm font-bold text-ink-2">History, newest on top</p>
            <VersionStack
              versions={b.objects[KEY] ?? []}
              label={`Versions of ${KEY}, newest first`}
              onRestore={(id) => act('restore', (x) => restoreVersion(x, KEY, id))}
              onDeleteVersion={(id) => act('delete-version', (x) => deleteVersion(x, KEY, id), {}, id)}
            />
            <p className="text-xs text-ink-3">
              Each version has its own <Term k="version-id">version ID</Term>. The trash button deletes one version for good.
            </p>
            <StackLegend />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Readout label="Photo versions stored" value={versions} hint="you pay for each one; lesson 5 cleans old ones up" />
            <Readout
              label={`Bill for ${gb} GB of menu photos`}
              value={`${money(versions * gb * standard.storePerGbMonth)} a month`}
              hint={
                <>
                  if every photo had {versions === 1 ? '1 version' : `${versions} versions`}, on{' '}
                  <Term k="s3-standard">{standard.name}</Term>
                </>
              }
            />
          </div>
          <Pill className="self-start">{EXAMPLE_PRICE_TAG}</Pill>
        </div>
      </div>
    </Bench>
  )
}
