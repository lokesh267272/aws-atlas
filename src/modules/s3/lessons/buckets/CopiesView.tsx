import { lazy, useId, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { HardDrive, Upload, Wrench, ZapOff } from 'lucide-react'
import { Switch } from '../../../../components/controls'
import { Bench } from '../../../../components/lesson'
import { Scene3D } from '../../../../components/Scene3D'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { s3Story } from '../../story'
import { CopiesFallback } from './CopiesFallback'
import {
  AZ_INDEXES,
  EBS_AZ,
  azOut,
  copiesLeft,
  deviceBroken,
  homeAzs,
  servingAz,
  type AzIndex,
  type Break,
  type Where,
} from './bucketsModel'

// three.js loads only when the browser can show 3D.
const CopiesScene = lazy(() => import('./CopiesScene'))

/** Small buttons styled for the dark "screen" panel. */
const darkButton =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-screen-line bg-screen-2 px-3 text-sm font-bold text-screen-text transition-colors hover:border-screen-dim hover:text-white aria-disabled:cursor-default aria-disabled:opacity-45 aria-disabled:hover:border-screen-line aria-disabled:hover:text-screen-text focus-visible:outline-screen-accent [&_svg]:size-4'

/** Glossary words on the dark panel: underline and highlight in the screen accent, which stays readable there. */
const screenTerms =
  '[&_.term]:decoration-screen-accent [&_.term:hover]:text-screen-accent [&_.term[aria-expanded=true]]:text-screen-accent'

/** What one AZ looks like now, for screen readers. */
function describeAz(where: Where, az: AzIndex, stored: boolean, breaks: Break[]): string {
  const name = s3Story.azs[az]
  if (azOut(az, breaks)) return `${name} is out.`
  const broken = deviceBroken(az, breaks) ? '1 device broken, ' : ''
  if (!stored || !homeAzs(where).includes(az)) return `${name}: ${broken}no copy here.`
  return `${name}: ${broken}${copiesLeft(where, breaks)[az] > 0 ? 'still has copies' : 'no copy left'}.`
}

/** What the stage shows, in words, for screen readers. */
export function describeCopies(where: Where, stored: boolean, breaks: Break[]): string {
  const intro = `Region ${s3Story.regionCode} with three Availability Zones, each with a row of four storage devices.`
  const what = !stored
    ? 'No photo stored yet.'
    : where === 's3-standard'
      ? 'The photo is stored in S3 Standard, with copies on devices in every AZ.'
      : `The photo is saved on an EBS volume, with copies on devices in ${s3Story.azs[EBS_AZ]} only.`
  const serving = stored ? servingAz(where, breaks) : null
  const result = !stored ? '' : serving !== null ? `The photo loads from ${s3Story.azs[serving]}.` : "The photo can't be read."
  return [intro, what, ...AZ_INDEXES.map((az) => describeAz(where, az, stored, breaks)), result].filter(Boolean).join(' ')
}

/** One short line under the stage: what is stored, and whether the photo still loads. */
export function statusLine(where: Where, stored: boolean, breaks: Break[]): string {
  if (!stored) return 'Nothing stored yet.'
  const azsLeft = copiesLeft(where, breaks).filter((n) => n > 0).length
  const serving = servingAz(where, breaks)
  if (breaks.length === 0) {
    return where === 's3-standard'
      ? 'Stored: copies on devices in all 3 AZs.'
      : `Saved on one EBS volume: copies on devices in ${s3Story.azs[EBS_AZ]} only.`
  }
  if (serving !== null) {
    return where === 's3-standard'
      ? `Still loads, from ${s3Story.azs[serving]}: copies remain in ${azsLeft} of 3 AZs.`
      : `Still loads, from ${s3Story.azs[serving]}: other copies remain.`
  }
  // Only a whole AZ going out stops reads (one broken device never does), so this is the volume's AZ being out.
  if (where === 'ebs') return `${s3Story.azs[EBS_AZ]} is out, so the EBS volume can't be read.`
  return 'Every AZ is out, so no copy is left to read in this Region.'
}

/** A dashed boundary line, as Region and AZ frames are drawn. */
function DashLine({ color }: { color: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 12" className="h-3 w-4 shrink-0">
      <line x1="1" y1="6" x2="15" y2="6" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
    </svg>
  )
}

function Swatch({ className }: { className: string }) {
  return <span aria-hidden className={cn('inline-block h-2.5 w-4 shrink-0 rounded-[2px]', className)} />
}

/** Visual B: upload a photo, then break a device or take out a whole AZ, and compare S3 Standard with an EBS volume. */
export function CopiesView() {
  const reduced = useReducedMotion() ?? false
  const [where, setWhere] = useState<Where>('s3-standard')
  const [stored, setStored] = useState(false)
  const [breaks, setBreaks] = useState<Break[]>([])
  const [target, setTarget] = useState<AzIndex>(0)
  const groupName = useId()

  const label = describeCopies(where, stored, breaks)
  const azGone = azOut(target, breaks)
  const canDevice = stored && !azGone && !deviceBroken(target, breaks)
  const canAz = stored && !azGone
  const why = !stored
    ? where === 's3-standard'
      ? 'Upload the photo first.'
      : 'Save the photo first.'
    : !canAz
      ? `${s3Story.azs[target]} is already out: pick another AZ.`
      : !canDevice
        ? `A device in ${s3Story.azs[target]} is already broken.`
        : ''

  // Each view starts fresh, so the learner stores the photo and breaks things again for S3 and for EBS.
  const switchTo = (next: Where) => {
    setWhere(next)
    setStored(false)
    setBreaks([])
  }

  const breakIt = (kind: Break['kind'], ok: boolean) => {
    if (ok) setBreaks((b) => [...b, { kind, az: target }])
  }

  const reset = () => {
    setWhere('s3-standard')
    setStored(false)
    setBreaks([])
    setTarget(0)
  }

  return (
    <Bench
      tone="screen"
      title="Try it: break things and keep the photo"
      intro={
        <>
          <strong className="text-screen-text">Upload the photo</strong>, then break a device or take out a whole{' '}
          <Term k="availability-zone">AZ</Term>, and see if it still loads.
        </>
      }
      onReset={reset}
      className={screenTerms}
    >
      <Scene3D
        label={label}
        height="h-[320px] sm:h-[420px]"
        fallback={<CopiesFallback where={where} stored={stored} breaks={breaks} label={label} />}
      >
        <CopiesScene where={where} stored={stored} breaks={breaks} reduced={reduced} />
      </Scene3D>

      <div className="mt-3 grid gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button type="button" className={darkButton} aria-disabled={stored} onClick={() => setStored(true)}>
            <Upload aria-hidden />
            {where === 's3-standard' ? 'Upload the photo' : 'Save the photo'}
          </button>
          <Switch
            tone="screen"
            label="Show an EBS volume instead"
            checked={where === 'ebs'}
            onChange={(on) => switchTo(on ? 'ebs' : 's3-standard')}
          />
        </div>

        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-sm font-bold text-screen-text">Break things in</legend>
            <div className="inline-flex gap-1 rounded-md border border-screen-line bg-screen-2 p-1">
              {AZ_INDEXES.map((az) => {
                const checked = az === target
                const name = s3Story.azs[az]
                const short = name.slice(s3Story.regionCode.length - 1)
                return (
                  <label
                    key={az}
                    className={cn(
                      'relative cursor-pointer rounded-[4px] px-2.5 py-1 text-sm font-bold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-screen-accent',
                      checked ? 'bg-screen-line text-white' : 'text-screen-dim hover:text-white',
                    )}
                  >
                    <input
                      type="radio"
                      name={groupName}
                      value={az}
                      checked={checked}
                      onChange={() => setTarget(az)}
                      className="sr-only"
                    />
                    <span className="hidden sm:inline">{name.slice(0, name.length - short.length)}</span>
                    {short}
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div role="group" aria-label="Break something" className="flex flex-wrap gap-2">
            <button type="button" className={darkButton} aria-disabled={!canDevice} onClick={() => breakIt('device', canDevice)}>
              <HardDrive aria-hidden />
              Break a device
            </button>
            <button type="button" className={darkButton} aria-disabled={!canAz} onClick={() => breakIt('az', canAz)}>
              <ZapOff aria-hidden />
              Take out the AZ
            </button>
            <button
              type="button"
              className={darkButton}
              aria-disabled={breaks.length === 0}
              onClick={() => setBreaks([])}
            >
              <Wrench aria-hidden />
              Repair all
            </button>
          </div>
        </div>
        {why && <p className="text-sm text-screen-dim">{why}</p>}
      </div>

      <p aria-live="polite" className="mt-3 min-h-[3em] font-bold text-screen-text sm:min-h-[1.5em]">
        {statusLine(where, stored, breaks)}
      </p>

      <div className="mt-3 rounded-md border border-screen-line p-3 text-sm">
        <p className="font-bold text-screen-text">
          <Term k="s3-standard">S3 Standard</Term> is designed for 99.999999999% (11 nines){' '}
          <Term k="durability">durability</Term>
        </p>
        <p className="mt-1 text-screen-dim">
          AWS&apos;s own example of what 11 nines means (a design goal, not a promise): store 10,000,000 objects and expect to lose one about once every 10,000 years.
        </p>
      </div>

      <ul aria-label="Legend" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-screen-dim">
        <li className="flex items-center gap-1.5">
          <DashLine color="var(--color-region)" /> <Term k="region">Region</Term> {s3Story.regionCode}
        </li>
        <li className="flex items-center gap-1.5">
          <DashLine color="var(--color-az)" /> <Term k="availability-zone">Availability Zone</Term> (one or more data centers)
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="border border-screen-dim" /> <Term k="data-center">Data center</Term>
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="bg-screen-line" /> Storage device
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="bg-storage" /> Copy of the photo
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="bg-bad" /> Broken or lost
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch className="h-0.5 bg-screen-accent" /> Where reads come from
        </li>
        {where === 'ebs' && (
          <li className="flex items-center gap-1.5">
            <Swatch className="bg-storage" /> <Term k="ebs-volume">EBS volume</Term> (Module 2): one AZ only
          </li>
        )}
      </ul>
    </Bench>
  )
}
