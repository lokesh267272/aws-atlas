import { Image } from 'lucide-react'
import { Pill } from '../../../../components/controls'
import { Boundary } from '../../../../components/diagram'
import { s3Story } from '../../story'
import {
  AZ_INDEXES,
  DATA_DEVICES,
  DEVICES_PER_DC,
  azOut,
  copiesLeft,
  devicesBroken,
  homeAzs,
  servingAz,
  type AzIndex,
  type Break,
  type Where,
} from './bucketsModel'

/* Layout of one data center in viewBox units. Sized so text stays about 12px tall or more on a phone. */
const VIEW = { w: 168, h: 84 }
const DEV = { x0: 16, gap: 38, y: 40, w: 28, h: 36 }
const CARD = { h: 7 }

/** Fades colour changes; no motion when the device asks for less. */
const fade = 'transition-[fill,stroke,opacity] duration-300 motion-reduce:transition-none'

/** One data center: four devices, a green card on each device holding a copy, red where something broke. */
function DataCenterSvg({ out, broken, holds }: { out: boolean; broken: number; holds: boolean }) {
  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} aria-hidden className="block h-auto w-full max-w-[260px]">
      <rect
        x="2"
        y="2"
        width={VIEW.w - 4}
        height={VIEW.h - 4}
        rx="3"
        fill={out ? 'var(--color-bad-soft)' : 'var(--color-sunken)'}
        stroke={out ? 'var(--color-bad)' : 'var(--color-line-strong)'}
        strokeWidth="1.5"
        className={fade}
      />
      <text x="10" y="18" fontSize="12" fontWeight="700" fill={out ? 'var(--color-bad)' : 'var(--color-ink-2)'}>
        {out ? 'Data center out' : 'Data center'}
      </text>
      {Array.from({ length: DEVICES_PER_DC }, (_, i) => {
        const x = DEV.x0 + i * DEV.gap
        const dataAt = (DATA_DEVICES as readonly number[]).indexOf(i)
        const isBroken = dataAt >= 0 && dataAt < broken
        const hasCopy = holds && dataAt >= 0
        const copyLost = hasCopy && (out || isBroken)
        return (
          <g key={i}>
            <rect
              x={x}
              y={DEV.y}
              width={DEV.w}
              height={DEV.h}
              rx="2"
              fill={isBroken ? 'var(--color-bad-soft)' : out ? 'var(--color-line)' : 'var(--color-panel)'}
              stroke={isBroken ? 'var(--color-bad)' : 'var(--color-ink-3)'}
              strokeWidth="1.5"
              className={fade}
            />
            {isBroken && (
              <path
                d={`M${x + 8} ${DEV.y + 10} l12 16 M${x + 20} ${DEV.y + 10} l-12 16`}
                stroke="var(--color-bad)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
            {hasCopy && (
              <rect
                x={x + 2}
                y={DEV.y - CARD.h - 3}
                width={DEV.w - 4}
                height={CARD.h}
                rx="1.5"
                fill={copyLost ? 'none' : 'var(--color-storage)'}
                stroke={copyLost ? 'var(--color-bad)' : 'var(--color-ink)'}
                strokeDasharray={copyLost ? '3 2' : undefined}
                className={fade}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** What one AZ holds, in a few words. */
function azNote(where: Where, az: AzIndex, stored: boolean, breaks: Break[]): string {
  if (!stored) return 'Nothing stored yet'
  if (!homeAzs(where).includes(az)) return 'No copy here'
  const n = copiesLeft(where, breaks)[az]
  const copies = n === 0 ? 'No copy left' : `${n} ${n === 1 ? 'copy' : 'copies'} left`
  return where === 'ebs' ? `EBS volume: ${copies.toLowerCase()}` : copies
}

/**
 * The flat version of the copies scene, used without WebGL. Same state, same meaning:
 * a Region with three AZs, one data center of devices in each, green copies of the photo, red where something broke.
 */
export function CopiesFallback({ where, stored, breaks, label }: { where: Where; stored: boolean; breaks: Break[]; label: string }) {
  const serving = stored ? servingAz(where, breaks) : null
  return (
    <div className="p-3 sm:p-4">
      <div role="img" aria-label={label} className="rounded-md bg-panel p-2.5 text-ink sm:p-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="grid size-6 shrink-0 place-items-center rounded-[3px] bg-storage text-white [&_svg]:size-3.5">
            <Image aria-hidden />
          </span>
          <span className="font-bold">Your photo</span>
          {!stored ? (
            <Pill>Not stored yet</Pill>
          ) : serving !== null ? (
            <Pill tone="ok">Reads from {s3Story.azs[serving]}</Pill>
          ) : (
            <Pill tone="bad">Can&apos;t be read</Pill>
          )}
        </div>

        <Boundary kind="region" label={`Region ${s3Story.regionCode}`} className="mt-2">
          <div className="grid gap-2 sm:grid-cols-3">
            {AZ_INDEXES.map((az) => {
              const azBroken = breaks.some((b) => b.az === az && b.kind === 'az')
              return (
                <Boundary
                  key={az}
                  kind="az"
                  label={azBroken ? `${s3Story.azs[az]} out` : s3Story.azs[az]}
                  muted={azBroken}
                  highlighted={azBroken}
                >
                  <DataCenterSvg out={azOut(az, breaks)} broken={devicesBroken(az, breaks)} holds={stored && homeAzs(where).includes(az)} />
                  <p className="mt-1 text-xs font-bold text-ink-2">{azNote(where, az, stored, breaks)}</p>
                </Boundary>
              )
            })}
          </div>
        </Boundary>
      </div>
    </div>
  )
}
