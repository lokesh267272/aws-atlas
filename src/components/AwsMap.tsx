import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { getMapService, mapPlaces, mapServices, type MapPlaceId } from '../course/awsMap'
import { categories, scopes } from '../course/categories'
import { coverage } from '../course/registry'
import type { Category } from '../course/types'
import { cn } from '../lib/cn'
import { href } from '../lib/router'
import { Boundary, ServiceTile } from './diagram'

type Selection = { kind: 'service'; id: string } | { kind: 'place'; id: MapPlaceId } | null

/** Staggered reveal from the outermost boundary inwards. Runs once, on load. */
function Reveal({ on, step, children, className }: { on: boolean; step: number; children: ReactNode; className?: string }) {
  if (!on) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 + step * 0.22, duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

/**
 * The course map: core AWS services drawn where they really live,
 * as nested boundaries (AWS Cloud > Region > VPC > Availability Zone).
 * Items taught by a module are shown in full colour; the rest are faded.
 */
export function AwsMap({
  focusModuleId,
  animate = false,
  className,
}: {
  /** Only light up what this module teaches (used on module pages) */
  focusModuleId?: string
  /** Play the one-time reveal (home page only) */
  animate?: boolean
  className?: string
}) {
  const [sel, setSel] = useState<Selection>(null)
  const reduceMotion = useReducedMotion()
  const play = animate && !reduceMotion

  const lit = (id: string) => (focusModuleId ? coverage[id]?.id === focusModuleId : Boolean(coverage[id]))

  const tile = (id: string, caption?: string, key?: string) => {
    const s = getMapService(id)
    if (!s) return null
    return (
      <ServiceTile
        key={key ?? id}
        name={s.name}
        category={s.category}
        icon={s.icon}
        caption={caption}
        muted={!lit(id)}
        selected={sel?.kind === 'service' && sel.id === id}
        onClick={() => setSel({ kind: 'service', id })}
      />
    )
  }

  const placeProps = (id: MapPlaceId) => ({
    onLabelClick: () => setSel({ kind: 'place', id }),
    labelPressed: sel?.kind === 'place' && sel.id === id,
    labelWrap: true,
  })

  return (
    <div className={cn('grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]', className)}>
      <div className="min-w-0 rounded-lg border border-line bg-panel p-3 sm:p-5">
        <Reveal on={play} step={0}>
          <Boundary kind="cloud" label="AWS Cloud" {...placeProps('cloud')}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <Reveal on={play} step={1}>
                <Boundary kind="global" label="Global services" className="h-full" {...placeProps('global')}>
                  <div className="flex flex-wrap gap-1">{tile('iam')}</div>
                </Boundary>
              </Reveal>
              <Reveal on={play} step={1}>
                <Boundary kind="edge" label="Edge locations, in 100+ cities" className="h-full" {...placeProps('edge')}>
                  <div className="flex flex-wrap gap-1">
                    {tile('route53')}
                    {tile('cloudfront')}
                  </div>
                </Boundary>
              </Reveal>
            </div>

            <Reveal on={play} step={2} className="mt-3">
              <Boundary kind="region" label="Region, such as us-east-1" {...placeProps('region')}>
                <div className="flex flex-wrap gap-1">
                  {['s3', 'dynamodb', 'lambda', 'apigateway', 'sqs', 'sns', 'cloudwatch', 'cloudtrail'].map((id) => tile(id))}
                </div>

                <Reveal on={play} step={3} className="mt-3">
                  <Boundary kind="vpc" label="VPC: your private network" {...placeProps('vpc')}>
                    <div className="flex justify-center">{tile('elb', 'spreads visitors across AZs')}</div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      {(['A', 'B'] as const).map((zone, i) => (
                        <Reveal key={zone} on={play} step={4 + i * 0.5}>
                          <Boundary kind="az" label={`Availability Zone ${zone}`} {...placeProps('az')}>
                            <div className="flex flex-wrap gap-1">
                              {tile('ec2', undefined, `ec2-${zone}`)}
                              {tile('ebs', undefined, `ebs-${zone}`)}
                              {tile('rds', zone === 'A' ? 'main copy' : 'standby copy', `rds-${zone}`)}
                            </div>
                          </Boundary>
                        </Reveal>
                      ))}
                    </div>
                  </Boundary>
                </Reveal>
              </Boundary>
            </Reveal>
          </Boundary>
        </Reveal>
        <p className="mt-3 text-xs text-ink-3">
          Simplified: real Regions have at least three Availability Zones. A VPC stretches across all the zones of its
          Region; the zones are drawn inside it, as AWS diagrams do, to show where its servers sit. You can use many
          Regions at once.
        </p>
      </div>

      <aside
        aria-live="polite"
        aria-label="Details for the selected item"
        className={cn(
          'rounded-lg border border-line bg-panel p-5 lg:sticky lg:top-20',
          // On small screens the details slide up as a bottom sheet, so they appear next to what was tapped.
          sel && 'max-lg:fixed max-lg:inset-x-3 max-lg:bottom-3 max-lg:z-30 max-lg:max-h-[55vh] max-lg:overflow-y-auto max-lg:shadow-[0_12px_40px_rgba(20,33,43,0.3)]',
        )}
      >
        {sel === null && <MapLegend focusModuleId={focusModuleId} />}
        {sel?.kind === 'service' && <ServiceInfo id={sel.id} onClose={() => setSel(null)} />}
        {sel?.kind === 'place' && <PlaceInfo id={sel.id} onClose={() => setSel(null)} />}
      </aside>
    </div>
  )
}

function CoverageNote({ id }: { id: string }) {
  const m = coverage[id]
  if (!m) {
    return <p className="mt-4 text-sm text-ink-3">Not covered yet. It lights up when its module is added.</p>
  }
  return (
    <p className="mt-4 text-sm text-ink-2">
      Taught in{' '}
      <a className="font-bold text-signal underline underline-offset-2" href={href.module(m.id)}>
        Module {m.number}: {m.title}
      </a>
    </p>
  )
}

function BackToLegend({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} className="mt-5 text-sm font-bold text-signal hover:underline">
      <span className="lg:hidden">Close</span>
      <span className="max-lg:hidden">How to read the map</span>
    </button>
  )
}

function ServiceInfo({ id, onClose }: { id: string; onClose: () => void }) {
  const s = getMapService(id)
  if (!s) return null
  const Icon = s.icon
  const cat = categories[s.category]
  const sc = scopes[s.scope]
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-md text-white" style={{ background: cat.color }}>
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="display text-lg leading-tight text-ink">{s.name}</h3>
          <p className="text-sm text-ink-3">{s.fullName}</p>
        </div>
      </div>
      <p className="mt-4 text-ink-2">{s.plain}</p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-ink-3">Where it lives</dt>
          <dd>
            <span className="font-bold text-ink">{sc.label}.</span> <span className="text-ink-2">{sc.explain}</span>
          </dd>
        </div>
        <div>
          <dt className="text-ink-3">Category</dt>
          <dd className="font-bold text-ink">{cat.label}</dd>
        </div>
      </dl>
      <CoverageNote id={id} />
      <BackToLegend onClose={onClose} />
    </div>
  )
}

function PlaceInfo({ id, onClose }: { id: MapPlaceId; onClose: () => void }) {
  const p = mapPlaces[id]
  return (
    <div>
      <h3 className="display text-lg leading-tight text-ink">{p.name}</h3>
      <p className="mt-3 text-ink-2">{p.plain}</p>
      <CoverageNote id={id} />
      <BackToLegend onClose={onClose} />
    </div>
  )
}

function MapLegend({ focusModuleId }: { focusModuleId?: string }) {
  const used = [...new Set(mapServices.map((s) => s.category))] as Category[]
  return (
    <div>
      <h3 className="font-bold text-ink">How to read the map</h3>
      <ul className="mt-3 space-y-3 text-sm text-ink-2">
        <li>
          <span className="font-bold text-ink">A box inside a box means “lives inside”.</span> An Availability Zone sits
          inside a Region, which sits inside the AWS Cloud.
        </li>
        <li>
          <span className="font-bold text-ink">Colour shows the kind of service</span>, using the colours AWS uses in its
          own diagrams.
        </li>
        <li>
          <span className="font-bold text-ink">Bright items are taught {focusModuleId ? 'in this module' : 'so far'}.</span>{' '}
          Faded ones come later.
        </li>
      </ul>
      <ul className="mt-4 grid grid-cols-1 gap-1.5 text-xs text-ink-2">
        {used.map((c) => (
          <li key={c} className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-[2px]" style={{ background: categories[c].color }} />
            {categories[c].label}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-bold text-signal">Select any service or box label to learn about it.</p>
    </div>
  )
}
