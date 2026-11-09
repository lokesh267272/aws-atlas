import { Archive, ArrowDown, ArrowLeft, KeyRound, Server, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bench } from '../../components/lesson'
import { Term } from '../../components/Term'
import { Boundary, ServiceTile } from '../../components/diagram'
import { cn } from '../../lib/cn'
import { classById } from './storageClasses'
import { FILE_TYPES, PREFIX_IDS, RECOMMENDED_CLASSES, s3Story } from './story'

type Step = 1 | 2 | 3 | 4 | 5 | 6

/** A fixed example name, the same for every learner. */
const BUCKET_NAME = 'mealhop-files'

const captions: Record<Step, string> = {
  1: "Mealhop's files sit in one bucket, in the Region but outside the network.",
  2: 'The server role and a link that expires are the only ways in.',
  3: 'Each kind of file now sits on the shelf that fits it.',
  4: 'Versioning keeps old copies, so a bad overwrite can be undone.',
  5: 'Lifecycle rules move or remove files as they age.',
  6: 'Complete: every piece of the file store is in place.',
}

/** A small badge; the piece added at the current step is highlighted. */
function Pill({ children, hot }: { children: ReactNode; hot: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs text-ink-2',
        hot && 'border-transparent bg-signal-soft outline-2 outline-signal',
      )}
    >
      {children}
    </span>
  )
}

/** "Your file store so far": Mealhop's S3 setup, growing one piece per lesson. The piece added at `step` is highlighted. */
export function FileStoreDiagram({ step }: { step: Step }) {
  const hot = (n: Step) => step === n
  const lifecyclePrefixes: string[] = ['receipts', 'delivery', 'backups']
  return (
    <Bench title="Your file store so far" intro={captions[step]}>
      <div className="flex flex-col gap-3">
        {step >= 2 && (
          // IAM is global: the role lives outside any Region.
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <ServiceTile
              name="Server role"
              category="security"
              icon={KeyRound}
              caption="global, attached to the servers"
              selected={hot(2)}
            />
          </div>
        )}
        <div data-part="region">
          <Boundary kind="region" label={s3Story.regionName}>
            <div className="flex flex-col gap-3">
              <div data-part="vpc">
                <Boundary
                  kind="vpc"
                  label={
                    <>
                      {s3Story.appName} network (<Term k="vpc">VPC</Term>)
                    </>
                  }
                >
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    <ServiceTile
                      name="Mealhop servers (Module 2)"
                      category="compute"
                      icon={Server}
                      caption="built last module"
                      muted
                    />
                  </div>
                </Boundary>
              </div>

              {/* The bucket is a regional service: in the Region, not inside the VPC. */}
              <div data-part="bucket" className="rounded-md border-2 border-line-strong bg-panel p-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <ServiceTile name="S3 bucket" category="storage" icon={Archive} caption={BUCKET_NAME} selected={hot(1)} />
                  {step >= 2 && (
                    <Pill hot={hot(2)}>
                      <ShieldCheck aria-hidden className="size-3.5" />
                      <Term k="block-public-access">Block Public Access</Term> on
                    </Pill>
                  )}
                  {step >= 4 && (
                    <Pill hot={hot(4)}>
                      <Term k="versioning">Versioning on</Term>
                    </Pill>
                  )}
                </div>
                <p className="mt-2 text-xs text-ink-3">Spread across {s3Story.azs.join(', ')}</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {PREFIX_IDS.map((id) => {
                    const ft = FILE_TYPES[id]
                    const cls = classById(RECOMMENDED_CLASSES[id])
                    const roleAccess = step >= 2 && (id === 'menu' || id === 'receipts')
                    const rule = step >= 5 && lifecyclePrefixes.includes(id)
                    const oldMenu = step >= 5 && id === 'menu'
                    return (
                      <li key={id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <code className="rounded bg-sunken px-1.5 py-0.5 text-xs font-bold text-ink">{ft.prefix}</code>
                        <span className="text-ink-2">{ft.label}</span>
                        {roleAccess && (
                          <Pill hot={hot(2)}>
                            <ArrowLeft aria-hidden className="size-3.5" />
                            role
                          </Pill>
                        )}
                        {step >= 3 && (
                          <Pill hot={hot(3)}>
                            <Term k={cls.termKey}>{cls.name}</Term>
                          </Pill>
                        )}
                        {rule && (
                          <Pill hot={hot(5)}>
                            <ArrowDown aria-hidden className="size-3.5" />
                            <Term k="lifecycle-rule">lifecycle rule</Term>
                          </Pill>
                        )}
                        {oldMenu && (
                          <Pill hot={hot(5)}>
                            <ArrowDown aria-hidden className="size-3.5" />
                            old versions
                          </Pill>
                        )}
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 text-xs text-ink-3">
                  Each name starts with a <Term k="prefix">prefix</Term>.
                </p>
              </div>
            </div>
          </Boundary>
        </div>

        {step >= 2 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ServiceTile name="Customer" category="networking" icon={Users} size="sm" selected={hot(2)} />
            <Pill hot={hot(2)}>
              <ArrowLeft aria-hidden className="size-3.5" />
              <Term k="presigned-url">link that expires</Term>
            </Pill>
          </div>
        )}
      </div>
    </Bench>
  )
}
