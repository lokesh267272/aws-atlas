import { useEffect, useRef, type ReactNode } from 'react'
import {
  BatteryCharging,
  Boxes,
  Building,
  Cable,
  Fan,
  HardDrive,
  KeyRound,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Table2,
  Waypoints,
  Zap,
  ZoomIn,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import { Term } from '../../../../components/Term'
import { Button } from '../../../../components/controls'
import type { Category } from '../../../../course/types'
import { regionByCode } from './regions'

/* ---------------------------------------------------------------- Data */

/** Regions shown on the planet level, with the prefix of their real AZ IDs. */
export const zoomRegions = [
  { code: 'us-east-1', azPrefix: 'use1' },
  { code: 'eu-central-1', azPrefix: 'euc1' },
  { code: 'ap-northeast-1', azPrefix: 'apne1' },
  { code: 'ap-south-1', azPrefix: 'aps1' },
  { code: 'sa-east-1', azPrefix: 'sae1' },
  { code: 'af-south-1', azPrefix: 'afs1' },
] as const

export type ZoomRegionCode = (typeof zoomRegions)[number]['code']

export const azIdsFor = (code: ZoomRegionCode) => {
  const z = zoomRegions.find((r) => r.code === code)!
  return Array.from({ length: regionByCode[code].azs }, (_, i) => `${z.azPrefix}-az${i + 1}`)
}

/** We draw three data centers per AZ. AWS does not publish the real number. */
export const DATA_CENTERS_PER_AZ = 3

/* ------------------------------------------------------- Shared pieces */

interface Lives {
  name: string
  caption: string
  category: Category
  icon: LucideIcon
}

function LevelHeader({
  title,
  explain,
  fact,
  focusOnMount,
}: {
  title: string
  explain: ReactNode
  fact: ReactNode
  focusOnMount: boolean
}) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!focusOnMount || !el) return
    el.focus({ preventScroll: true })
    // On a phone the new heading can sit far above the screen; bring it into view so the learner starts at the top.
    // offsetTop ignores the zoom-in scale animation that is still running, so this is where the heading will settle.
    let pageTop = 0
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) pageTop += n.offsetTop
    const top = pageTop - window.scrollY
    if (top < 72 || top > window.innerHeight - 80) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // 80px clears the sticky site header
      window.scrollTo({ top: pageTop - 80, behavior: reduce ? 'instant' : 'smooth' })
    }
    // Runs once, when this level first appears.
  }, [])
  return (
    <div className="mb-4">
      <h4 ref={ref} tabIndex={-1} className="display text-lg text-ink focus:outline-none focus-visible:outline-2">
        {title}
      </h4>
      <p className="mt-1 max-w-[68ch] text-ink-2">{explain}</p>
      <p className="mt-1 text-sm text-ink-3">{fact}</p>
    </div>
  )
}

function WhatLivesHere({ items, note }: { items: Lives[]; note?: ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-line bg-paper p-3">
      <p className="text-sm font-bold text-ink">What lives at this level</p>
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {items.map((it) => (
            <li key={it.name}>
              <ServiceTile name={it.name} caption={it.caption} category={it.category} icon={it.icon} size="sm" />
            </li>
          ))}
        </ul>
      )}
      {note && <p className="mt-2 max-w-[68ch] text-sm text-ink-2">{note}</p>}
    </div>
  )
}

/** "Zoom in" button. The target is spoken by screen readers; sighted learners see it on the box label. */
function ZoomButton({ onClick, text = 'Zoom in', target }: { onClick: () => void; text?: string; target: string }) {
  return (
    <Button size="sm" onClick={onClick} className="mt-2.5 whitespace-nowrap">
      <ZoomIn aria-hidden />
      {text}
      <span className="sr-only"> to {target}</span>
    </Button>
  )
}

/* -------------------------------------------------------------- Levels */

export function PlanetView({ onZoom, focusOnMount }: { onZoom: (code: ZoomRegionCode) => void; focusOnMount: boolean }) {
  return (
    <>
      <LevelHeader
        title="The AWS global network"
        explain="Regions all over the planet, plus edge locations in more than 100 cities, all joined by AWS’s own private fibre network."
        fact="Here: 6 of the 34 Regions a standard account can use."
        focusOnMount={focusOnMount}
      />
      <Boundary kind="cloud" label="AWS global network">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {zoomRegions.map(({ code }) => {
            const r = regionByCode[code]
            return (
              <li key={code}>
                <Boundary kind="region" label={code}>
                  <p className="text-sm font-bold text-ink">{r.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
                    {Array.from({ length: r.azs }, (_, i) => (
                      <span key={i} className="size-4 rounded-[2px] border-2 border-dashed border-az" />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink-3">{r.azs} Availability Zones</p>
                  <ZoomButton onClick={() => onZoom(code)} target={code} />
                </Boundary>
              </li>
            )
          })}
        </ul>
        <Boundary kind="edge" label="Edge locations" className="mt-3">
          <p className="flex items-center gap-2 text-sm text-ink-2">
            <Radio aria-hidden className="size-4 shrink-0 text-[#6a32d6]" />
            Hundreds of small sites in cities, outside the Regions. You will meet them later in this lesson.
          </p>
        </Boundary>
      </Boundary>
      <WhatLivesHere
        items={[
          { name: 'IAM', caption: 'Global: your users and permissions', category: 'security', icon: KeyRound },
          { name: 'Route 53', caption: 'DNS, answered at the edge', category: 'networking', icon: Waypoints },
          { name: 'CloudFront', caption: 'Copies of content, at the edge', category: 'networking', icon: Radio },
        ]}
        note={
          <>
            A few services are global: they are not tied to one Region you choose. <Term k="iam">IAM</Term> is one.{' '}
            <Term k="route-53">Route 53</Term> and <Term k="cloudfront">CloudFront</Term> answer from edge locations close to your
            users.
          </>
        }
      />
    </>
  )
}

export function RegionView({
  code,
  onZoom,
  focusOnMount,
}: {
  code: ZoomRegionCode
  onZoom: (azIndex: number) => void
  focusOnMount: boolean
}) {
  const r = regionByCode[code]
  const ids = azIdsFor(code)
  return (
    <>
      <LevelHeader
        title={`Region ${code}`}
        explain="A geographic area with its own group of Availability Zones. It is isolated from every other Region, and what you create here stays here unless you copy it."
        fact={`${r.name} has ${r.azs} Availability Zones. Every Region has at least three.`}
        focusOnMount={focusOnMount}
      />
      <Boundary kind="region" label={`${code} · ${r.name}`}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ids.map((id, i) => (
            <li key={id}>
              <Boundary kind="az" label={id}>
                <div className="flex gap-1.5" aria-hidden>
                  {Array.from({ length: DATA_CENTERS_PER_AZ }, (_, j) => (
                    <Building key={j} className="size-5 text-ink-3" />
                  ))}
                </div>
                <p className="mt-1 text-xs text-ink-3">One or more data centers</p>
                <ZoomButton onClick={() => onZoom(i)} target={id} />
              </Boundary>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-ink-2">
          All {r.azs} AZs are joined by fast, private, redundant fibre, and all are within 100 km (60 miles) of each other.
        </p>
      </Boundary>
      <WhatLivesHere
        items={[
          { name: 'S3 bucket', caption: 'Stores files', category: 'storage', icon: Boxes },
          { name: 'DynamoDB table', caption: 'Stores data records', category: 'database', icon: Table2 },
          { name: 'Lambda function', caption: 'Runs your code', category: 'compute', icon: Zap },
        ]}
        note={
          <>
            Regional services, such as <Term k="s3">S3</Term>, <Term k="dynamodb">DynamoDB</Term> and{' '}
            <Term k="lambda">Lambda</Term>: you choose the Region, and by default AWS spreads them across several of its AZs for
            you. (A few cheaper options, such as S3 One Zone storage, use just one AZ.)
          </>
        }
      />
      <p className="mt-3 text-xs text-ink-3">
        The labels such as {ids[0]} are AZ IDs. In your own account you will usually see AZ names such as {code}a instead.
      </p>
    </>
  )
}

export function AzView({
  code,
  azIndex,
  onZoom,
  focusOnMount,
}: {
  code: ZoomRegionCode
  azIndex: number
  onZoom: (dcIndex: number) => void
  focusOnMount: boolean
}) {
  const id = azIdsFor(code)[azIndex]
  return (
    <>
      <LevelHeader
        title={`Availability Zone ${id}`}
        explain="One or more data centers with their own power, cooling and network links. It sits many kilometres from the other AZs, so one fire, flood or power cut should not hit two AZs at once."
        fact="Simplified: AWS does not publish how many data centers each AZ has. We draw three."
        focusOnMount={focusOnMount}
      />
      <Boundary kind="az" label={`${id} · in ${code}`}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: DATA_CENTERS_PER_AZ }, (_, j) => (
            <li key={j}>
              <Boundary kind="datacenter" label={`Data center ${j + 1}`}>
                <MiniRacks />
                <ZoomButton onClick={() => onZoom(j)} text="Step inside" target={`data center ${j + 1}`} />
              </Boundary>
            </li>
          ))}
        </ul>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-2">
          <Facility icon={Zap} label="Its own power supply" />
          <Facility icon={Fan} label="Its own cooling" />
          <Facility icon={Cable} label="Its own network links" />
        </ul>
      </Boundary>
      <WhatLivesHere
        items={[
          { name: 'EC2 instance', caption: 'One virtual server', category: 'compute', icon: Server },
          { name: 'EBS volume', caption: 'A disk for that server', category: 'storage', icon: HardDrive },
          { name: 'Subnet', caption: 'A slice of your private network', category: 'networking', icon: Network },
        ]}
        note={
          <>
            Zonal resources, such as an <Term k="ec2">EC2</Term> instance, its <Term k="ebs">EBS</Term> disk and a{' '}
            <Term k="subnet">subnet</Term>: each one lives in exactly one AZ. If that AZ has a problem, so does the resource, which
            is why careful designs use two or more AZs.
          </>
        }
      />
    </>
  )
}

export function DataCenterView({
  code,
  azIndex,
  dcIndex,
  focusOnMount,
}: {
  code: ZoomRegionCode
  azIndex: number
  dcIndex: number
  focusOnMount: boolean
}) {
  const id = azIdsFor(code)[azIndex]
  return (
    <>
      <LevelHeader
        title={`Data center ${dcIndex + 1} in ${id}`}
        explain="One building: rows of racks full of servers, with power, backup power, cooling, network equipment and tight security."
        fact="Simplified: a real data center holds far more racks than this."
        focusOnMount={focusOnMount}
      />
      <Boundary kind="datacenter" label={`Data center ${dcIndex + 1} · ${id}`}>
        <div
          className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-2"
          role="img"
          aria-label="Ten racks, each holding ten servers"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <Rack key={i} />
          ))}
        </div>
        <ul className="mt-3 grid gap-x-5 gap-y-1.5 text-sm text-ink-2 sm:grid-cols-2 lg:grid-cols-3">
          <Facility icon={Zap} label="Power feeds" />
          <Facility icon={BatteryCharging} label="Backup power" />
          <Facility icon={Fan} label="Cooling" />
          <Facility icon={Cable} label="Network switches and fibre" />
          <Facility icon={ShieldCheck} label="Guards and access control" />
        </ul>
      </Boundary>
      <WhatLivesHere
        items={[]}
        note={
          <>
            Physical servers, disks and network gear. AWS staff run them, and you never touch this hardware. One server can run{' '}
            <Term k="virtual-machine">virtual machines</Term> for many different customers, kept apart by software.
          </>
        }
      />
    </>
  )
}

/* ---------------------------------------------------------- Little art */

function Facility({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Icon aria-hidden className="size-4 shrink-0 text-ink-3" />
      {label}
    </li>
  )
}

function MiniRacks() {
  return (
    <div className="flex gap-1" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="flex h-9 w-3 flex-col justify-between rounded-[2px] border border-line-strong bg-panel p-[2px]">
          <span className="h-[3px] rounded-[1px] bg-line-strong" />
          <span className="h-[3px] rounded-[1px] bg-line-strong" />
          <span className="h-[3px] rounded-[1px] bg-line-strong" />
          <span className="h-[3px] rounded-[1px] bg-line-strong" />
        </span>
      ))}
    </div>
  )
}

function Rack() {
  return (
    <div className="flex h-36 flex-col gap-[3px] rounded-[3px] border-2 border-ink-3 bg-sunken p-1">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="flex flex-1 items-center justify-end rounded-[1px] bg-panel px-0.5">
          <span className="size-1 rounded-full bg-line-strong" />
        </span>
      ))}
    </div>
  )
}
