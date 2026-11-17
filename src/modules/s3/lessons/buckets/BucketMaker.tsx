import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Archive, Check, FileText, Folder, Image, ImageOff, Lock, MapPin, Plus, Smartphone, Trash2, Upload, X } from 'lucide-react'
import { Challenge, useChallenge } from '../../../../components/Challenge'
import { Button, Pill, Segmented, Switch } from '../../../../components/controls'
import { ServiceTile } from '../../../../components/diagram'
import { Bench } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { s3Story } from '../../story'
import {
  APP_KEYS,
  DESK_FILES,
  PREFIXES,
  bucketNameProblems,
  createBucket,
  deskFile,
  emptyState,
  keyFor,
  menuLoads,
  missingKeys,
  removeObject,
  solution,
  upload,
  type BucketState,
  type NameProblem,
  type Prefix,
} from './bucketsModel'

/** Short labels for each naming problem. */
const PROBLEM_TEXT: Record<NameProblem, string> = {
  'too-short': 'At least 3 characters',
  'too-long': 'At most 63 characters',
  'bad-chars': 'Only lowercase letters, numbers, dots and hyphens',
  'bad-edge': 'Start and end with a letter or number',
  'double-dot': 'No two dots in a row',
  'looks-like-ip': "Can't look like an IP address",
  reserved: 'Uses a reserved prefix or suffix, like xn-- or -s3alias',
  taken: 'Taken: another AWS account owns it',
}

/** The dish each key the app asks for shows on the menu (the dishes from Module 2). */
const DISHES: Record<string, string> = {
  'menu/dosa.jpg': 'Masala dosa',
  'menu/biryani.jpg': 'Veg biryani',
  'menu/lassi.jpg': 'Mango lassi',
}

const note = 'mt-1.5 text-sm text-ink-3'

const listAnd = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

function sizeLabel(file: string) {
  const f = deskFile(file)
  return f ? `${f.sizeMb} MB` : ''
}

function FileIcon({ file, className }: { file: string; className?: string }) {
  const Icon = deskFile(file)?.kind === 'pdf' ? FileText : Image
  return <Icon aria-hidden className={cn('size-4 shrink-0 text-ink-3', className)} />
}

/** One step of the builder, numbered so the order is clear. */
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-line bg-paper/50 p-3">
      <h4 className="mb-2 flex items-center gap-2 font-bold text-ink">
        <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-xs text-white">
          {n}
        </span>
        {title}
      </h4>
      {children}
    </div>
  )
}

/** An object row: its name (or full key), size and a delete button. */
function ObjectRow({ objectKey, name, file, onDelete }: { objectKey: string; name: string; file: string; onDelete: () => void }) {
  return (
    <li className="flex min-w-0 items-center gap-2 py-1 text-sm">
      <FileIcon file={file} />
      <code className="min-w-0 flex-1 font-mono text-xs text-ink [overflow-wrap:anywhere]">{name}</code>
      <span className="shrink-0 text-xs tabular-nums text-ink-3">{sizeLabel(file)}</span>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${objectKey}`}
        className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-sunken hover:text-bad [&_svg]:size-3.5"
      >
        <Trash2 aria-hidden />
      </button>
    </li>
  )
}

/** The bucket's contents, as a console draws them (folders) or as S3 stores them (one flat list of keys). */
function BucketContents({
  state,
  realKeys,
  onDelete,
}: {
  state: BucketState
  realKeys: boolean
  onDelete: (key: string) => void
}) {
  const objects = [...state.objects].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  if (objects.length === 0) {
    return <p className="py-2 text-sm text-ink-3">Empty. Drag a file here, or pick one and press Upload.</p>
  }
  if (realKeys) {
    return (
      <ul aria-label="Keys in the bucket" className="divide-y divide-line">
        {objects.map((o) => (
          <ObjectRow key={o.key} objectKey={o.key} name={o.key} file={o.file} onDelete={() => onDelete(o.key)} />
        ))}
      </ul>
    )
  }
  const root = objects.filter((o) => !o.key.includes('/'))
  const folders = new Map<string, typeof objects>()
  for (const o of objects) {
    const slash = o.key.indexOf('/')
    if (slash < 0) continue
    const folder = o.key.slice(0, slash + 1)
    folders.set(folder, [...(folders.get(folder) ?? []), o])
  }
  return (
    <ul aria-label="Folder view" className="grid gap-1">
      {[...folders].map(([folder, inside]) => (
        <li key={folder} className="min-w-0">
          <p className="flex items-center gap-2 py-1 text-sm font-bold text-ink">
            <Folder aria-hidden className="size-4 shrink-0 text-ink-3" />
            <code className="font-mono text-xs">{folder}</code>
            <span className="text-xs font-normal text-ink-3">
              {inside.length} {inside.length === 1 ? 'object' : 'objects'}
            </span>
          </p>
          <ul className="ml-5 border-l border-line pl-2">
            {inside.map((o) => (
              <ObjectRow key={o.key} objectKey={o.key} name={o.key.slice(folder.length)} file={o.file} onDelete={() => onDelete(o.key)} />
            ))}
          </ul>
        </li>
      ))}
      {root.map((o) => (
        <ObjectRow key={o.key} objectKey={o.key} name={o.key} file={o.file} onDelete={() => onDelete(o.key)} />
      ))}
    </ul>
  )
}

/** The three parts of the last object uploaded: key, data and metadata. */
function ObjectParts({ objectKey, file }: { objectKey: string | null; file: string | null }) {
  const f = file ? deskFile(file) : undefined
  return (
    <div className="rounded-md border border-line p-3">
      <p className="text-sm font-bold text-ink">
        One <Term k="object">object</Term> = key + data + <Term k="metadata">metadata</Term>
      </p>
      {objectKey && f ? (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <dt className="text-ink-3">
            <Term k="object-key">Key</Term>
          </dt>
          <dd className="font-mono text-xs leading-5 text-ink [overflow-wrap:anywhere]">{objectKey}</dd>
          <dt className="text-ink-3">Data</dt>
          <dd className="text-ink">
            the {f.kind === 'pdf' ? 'PDF' : 'photo'} itself, {f.sizeMb} MB
          </dd>
          <dt className="text-ink-3">Metadata</dt>
          <dd className="text-ink">
            type <span className="font-mono text-xs">{f.contentType}</span>, size, date
          </dd>
        </dl>
      ) : (
        <p className={note}>Upload a file to see its parts.</p>
      )}
    </div>
  )
}

/** Mealhop's app, showing the menu as it looked the last time the learner opened it. */
function AppPreview({ opened, reduced }: { opened: BucketState | null; reduced: boolean }) {
  const missing = opened ? missingKeys(opened) : []
  const loads = opened ? menuLoads(opened) : false
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-panel',
        !opened ? 'border-line-strong' : loads ? 'border-ok' : 'border-bad',
      )}
    >
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-2.5 py-1.5 text-xs font-bold text-ink-2">
        <Smartphone aria-hidden className="size-4 shrink-0 text-ink-3" />
        {s3Story.appName} app: today&apos;s menu
      </div>
      <div aria-live="polite" className="min-h-[9rem] p-3">
        {!opened && <p className="text-sm text-ink-3">Press Open the app to load the menu.</p>}
        {opened && !opened.bucket && (
          <p className="flex items-start gap-1.5 text-sm text-ink-2">
            <X aria-hidden className="mt-0.5 size-4 shrink-0 text-bad" />
            The app has no bucket to read photos from yet.
          </p>
        )}
        {opened?.bucket && (
          <motion.div
            key={missing.join()}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ul className="grid grid-cols-3 gap-2">
              {APP_KEYS.map((k) => {
                const ok = !missing.includes(k)
                return (
                  <li key={k} className="min-w-0">
                    <span
                      aria-hidden
                      className={cn(
                        'grid aspect-[4/3] place-items-center rounded-[3px] [&_svg]:size-5',
                        ok ? 'bg-storage text-white' : 'border border-dashed border-bad bg-bad-soft text-bad',
                      )}
                    >
                      {ok ? <Image /> : <ImageOff />}
                    </span>
                    <span className="mt-1 block text-xs font-bold leading-tight text-ink">{DISHES[k]}</span>
                    <span className={cn('block text-xs leading-tight', ok ? 'text-ok' : 'text-bad')}>
                      {ok ? 'loaded' : 'not found'}
                    </span>
                  </li>
                )
              })}
            </ul>
            <p className={cn('mt-2 text-sm', loads ? 'text-ok' : 'text-ink-2')}>
              {loads ? 'Every dish photo loaded.' : `The app couldn't find ${listAnd(missing)}.`}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

/** Visual A and the lesson's challenge: name a bucket, upload the dish photos under the right keys, open the app. */
export function BucketMaker() {
  const reduced = useReducedMotion() ?? false
  const [state, setState] = useState<BucketState>(emptyState)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [prefix, setPrefix] = useState<Prefix>('')
  const [realKeys, setRealKeys] = useState(false)
  const [last, setLast] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)
  /** Create was pressed with a problem: show the problems even for an empty name. */
  const [tried, setTried] = useState(false)
  /** The bucket as it was the last time the app was opened (null: not opened yet). */
  const [opened, setOpened] = useState<BucketState | null>(null)
  const challenge = useChallenge()
  const { solve, fail, show } = challenge

  const nameId = useId()
  const problemsId = useId()
  const uploadWhyId = useId()
  const bucketRef = useRef<HTMLDivElement>(null)
  const justCreated = useRef(false)

  const problems = bucketNameProblems(name)
  const typed = name.trim().length > 0
  const showProblems = typed || tried
  const missing = missingKeys(state)
  const lastObject = state.objects.find((o) => o.key === last) ?? null

  // After Create the name field goes away, so move focus to the new bucket.
  useEffect(() => {
    if (state.bucket && justCreated.current) {
      justCreated.current = false
      bucketRef.current?.focus()
    }
  }, [state.bucket])

  const create = (e?: FormEvent) => {
    e?.preventDefault()
    if (problems.length > 0) {
      setTried(true)
      return
    }
    justCreated.current = true
    setState((s) => createBucket(s, name))
    setMessage('')
  }

  const doUpload = (file: string | null) => {
    if (!state.bucket) {
      setMessage('Create the bucket first.')
      return
    }
    if (!file) {
      setMessage('Pick a file on the desk first.')
      return
    }
    const key = keyFor(file, prefix)
    const replacing = state.objects.some((o) => o.key === key)
    setState(upload(state, file, prefix))
    setLast(key)
    setMessage(replacing ? `Replaced ${key}: same key, so the new upload takes its place.` : `Uploaded as ${key}.`)
  }

  const remove = (key: string) => {
    setState((s) => removeObject(s, key))
    setMessage(`Deleted ${key}.`)
  }

  const openApp = () => {
    setOpened(state)
    if (menuLoads(state)) solve()
    else fail()
  }

  const showMe = () => {
    setState(solution)
    setName(solution.bucket!.name)
    setPrefix('menu/')
    setLast(solution.objects[solution.objects.length - 1].key)
    setOpened(solution)
    setMessage('')
    show()
  }

  const reset = () => {
    setState(emptyState)
    setName('')
    setTried(false)
    setSelected(null)
    setPrefix('')
    setRealKeys(false)
    setLast(null)
    setMessage('')
    setOpened(null)
    challenge.reset()
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.getData('text/plain')
    if (deskFile(file)) {
      setSelected(file)
      doUpload(file)
    }
  }

  const uploadWhy = !state.bucket ? 'Create the bucket first.' : !selected ? 'Pick a file on the desk.' : null

  return (
    <Bench
      title="Try it: make a bucket and fill it"
      intro={
        <>
          Create a <Term k="bucket">bucket</Term>, upload each dish photo under the <Term k="object-key">key</Term> the
          app asks for, then press <strong className="text-ink-2">Open the app</strong>.
        </>
      }
      onReset={reset}
    >
      <Challenge
        goal="Stock the menu: the app must find every dish photo by its key"
        checks={[
          { label: 'A bucket with a valid, free name', done: state.bucket !== null },
          ...APP_KEYS.map((k) => ({
            label: (
              <>
                <code className="font-mono text-xs">{k}</code> is in the bucket
              </>
            ),
            done: state.bucket !== null && !missing.includes(k),
          })),
        ]}
        state={challenge.state}
        hint={
          <>
            Pick a dish photo, set the prefix to <code className="font-mono">menu/</code>, then press Upload: the key must
            match exactly, like <code className="font-mono">menu/dosa.jpg</code>.
          </>
        }
        onHint={challenge.hint}
        onShowMe={showMe}
        stale={!menuLoads(state)}
        staleReason={opened === state ? 'failing' : 'changed'}
        successNote="Every key the app asks for now matches an object in your bucket, so each photo loads."
      />

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-3">
          <Step n={1} title="Create the bucket">
            {state.bucket ? (
              <div ref={bucketRef} tabIndex={-1} className="outline-none">
                <ServiceTile
                  name={state.bucket.name}
                  category="storage"
                  icon={Archive}
                  caption={`${state.bucket.region}: name and Region can't change now`}
                />
              </div>
            ) : (
              <form onSubmit={create} className="grid gap-2">
                <label htmlFor={nameId} className="text-sm font-bold text-ink-2">
                  Bucket name
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="mealhop-…"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={showProblems && problems.length > 0}
                    aria-describedby={problemsId}
                    className="h-10 min-w-0 flex-1 basis-40 rounded-md border border-line-strong bg-panel px-3 font-mono text-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-signal"
                  />
                  <Button type="submit" variant="primary" aria-disabled={problems.length > 0}>
                    <Plus aria-hidden />
                    Create
                  </Button>
                </div>
                <div id={problemsId} aria-live="polite">
                  {!showProblems ? (
                    <p className="text-sm text-ink-3">3 to 63 characters: lowercase letters, numbers, dots and hyphens.</p>
                  ) : problems.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {problems.map((p) => (
                        <li key={p}>
                          <Pill tone="bad">
                            <X aria-hidden />
                            {PROBLEM_TEXT[p]}
                          </Pill>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Pill tone="ok">
                      <Check aria-hidden />
                      Name is free
                    </Pill>
                  )}
                </div>
                <p className="text-xs text-ink-3">
                  Names are <Term k="globally-unique-name">unique across all AWS accounts</Term>.
                </p>
              </form>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-ink-2">
              <MapPin aria-hidden className="size-4 shrink-0 text-region" />
              <Term k="region">Region</Term>: <strong className="text-ink">{s3Story.regionName}</strong>
              <span className="font-mono text-xs">{s3Story.regionCode}</span>
              <Pill>
                <Lock aria-hidden />
                Same Region as the servers
              </Pill>
            </p>
          </Step>

          <Step n={2} title="Upload files">
            <p className="text-sm font-bold text-ink-2">On {s3Story.appName}&apos;s desk</p>
            <ul aria-label="Files on the desk" className="mt-1.5 grid gap-1.5">
              {DESK_FILES.map((f) => {
                const isSelected = selected === f.file
                return (
                  <li key={f.file}>
                    <button
                      type="button"
                      draggable
                      aria-pressed={isSelected}
                      onClick={() => setSelected(isSelected ? null : f.file)}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', f.file)
                        e.dataTransfer.effectAllowed = 'copy'
                        setSelected(f.file)
                      }}
                      onDragEnd={() => setDragOver(false)}
                      className={cn(
                        'flex w-full min-w-0 cursor-grab items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors',
                        isSelected
                          ? 'border-signal bg-signal-soft text-ink outline-2 outline-signal'
                          : 'border-line-strong bg-panel text-ink hover:border-ink',
                      )}
                    >
                      <FileIcon file={f.file} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-xs font-bold [overflow-wrap:anywhere]">{f.file}</span>
                        <span className="block text-xs text-ink-3">{f.label}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-ink-3">{f.sizeMb} MB</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            <Segmented
              className="mt-3"
              label="Prefix (the folder part of the key)"
              size="sm"
              value={prefix}
              options={PREFIXES.map((p) => ({
                value: p,
                label: p ? <span className="font-mono">{p}</span> : 'none',
              }))}
              onChange={setPrefix}
            />

            <p className="mt-2 text-sm text-ink-2">
              <Term k="object-key">Key</Term>:{' '}
              {selected ? (
                <code className="font-mono text-xs font-bold text-ink [overflow-wrap:anywhere]">
                  <span className={cn(prefix && 'text-signal')}>{prefix}</span>
                  {selected}
                </code>
              ) : (
                <span className="text-ink-3">pick a file</span>
              )}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                onClick={() => doUpload(selected)}
                aria-disabled={uploadWhy !== null}
                aria-describedby={uploadWhy ? uploadWhyId : undefined}
              >
                <Upload aria-hidden />
                Upload
              </Button>
              {uploadWhy && (
                <span id={uploadWhyId} className="text-sm text-ink-3">
                  {uploadWhy}
                </span>
              )}
            </div>
            <p aria-live="polite" className="mt-2 min-h-[1.25rem] text-sm text-ink-2 [overflow-wrap:anywhere]">
              {message}
            </p>
          </Step>
        </div>

        <div className="grid min-w-0 content-start gap-3">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
              if (!dragOver) setDragOver(true)
            }}
            onDragLeave={(e) => {
              // Moving between the zone's own children is not leaving it.
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
            }}
            onDrop={onDrop}
            className={cn(
              'min-w-0 rounded-md border-2 p-3 transition-colors',
              dragOver ? 'border-dashed border-signal bg-signal-soft/50' : 'border-line',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-2 font-bold text-ink">
                <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-[3px] bg-storage text-white [&_svg]:size-3.5">
                  <Archive />
                </span>
                <span className="min-w-0 [overflow-wrap:anywhere]">{state.bucket ? state.bucket.name : 'No bucket yet'}</span>
              </p>
              <Switch label="Show real keys" checked={realKeys} onChange={setRealKeys} />
            </div>
            <div className="mt-2">
              {state.bucket ? (
                <BucketContents state={state} realKeys={realKeys} onDelete={remove} />
              ) : (
                <p className="py-2 text-sm text-ink-3">Create the bucket, then drop files here.</p>
              )}
            </div>
            <p className="mt-2 text-xs text-ink-3">
              {realKeys ? (
                <>
                  No folders, just one flat list of keys: <span className="font-mono">menu/</span> is a{' '}
                  <Term k="prefix">prefix</Term>, the start of a key.
                </>
              ) : (
                'Folders here are drawn from the keys.'
              )}
            </p>
          </div>

          <ObjectParts objectKey={lastObject?.key ?? null} file={lastObject?.file ?? null} />

          <ul aria-label="Bucket facts" className="flex flex-wrap gap-1.5">
            <li>
              <Pill>Each object up to 50 TB</Pill>
            </li>
            <li>
              <Pill>Any number of objects</Pill>
            </li>
            <li>
              <Pill>No disk size to pick: pay for what you store</Pill>
            </li>
          </ul>

          <div>
            <Button variant="primary" onClick={openApp}>
              <Smartphone aria-hidden />
              Open the app
            </Button>
          </div>
          <AppPreview opened={opened} reduced={reduced} />
        </div>
      </div>
    </Bench>
  )
}
