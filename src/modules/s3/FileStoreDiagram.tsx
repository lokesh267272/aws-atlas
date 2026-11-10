import { Archive, ArrowDown, ArrowLeft, KeyRound, Server, ShieldCheck, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { Bench } from '../../components/lesson'
import { Term } from '../../components/Term'
import { Boundary, ServiceTile } from '../../components/diagram'
import { cn } from '../../lib/cn'
import { classById } from './storageClasses'
import { FILE_TYPES, PREFIX_IDS, RECOMMENDED_CLASSES, s3Story } from './story'
import type { PrefixId } from './story'

type Step = 1 | 2 | 3 | 4 | 5 | 6

/** A fixed example name, the same for every learner. */
const BUCKET_NAME = 'mealhop-files'

/** The file types that get a lifecycle rule at step 5. */
const lifecyclePrefixes: PrefixId[] = ['receipts', 'delivery', 'backups']

/** What each step adds, for screen readers (the highlight alone is only visual). */
const added: Record<Step, string> = {
  1: 'the bucket, inside the Region and outside the network.',
  2: 'the ways in: a server role, a public-access block and links that expire.',
  3: 'a storage class on each kind of file.',
  4: 'versioning on the bucket.',
  5: 'lifecycle rules on receipts, delivery photos and backups.',
  6: 'nothing; the file store is complete.',
}

const captions: Record<Step, string> = {
  1: "Mealhop's files sit in one bucket, in the Region but outside the network.",
  2: 'The server role and a link that expires are the only ways in.',
  3: 'Each kind of file now sits on the shelf that fits it.',
  4: 'Versioning keeps old copies, so a bad overwrite can be undone.',
  5: 'Lifecycle rules move or remove files as they age.',
  6: 'Complete: every piece of the file store is in place.',
}

/** A small badge; the piece added at the current step is highlighted. */
function Pill({ children, hot, sr }: { children: ReactNode; hot: boolean; sr?: string }) {
  return (
    <span
      aria-current={hot ? 'true' : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-xs text-ink-2',
        hot && 'border-transparent bg-signal-soft outline-2 outline-signal',
      )}
    >
      {sr && <span className="sr-only">{sr} </span>}
      {children}
    </span>
  )
}

/** An actor outside AWS (not a service), so it takes no category colour. */
function Actor({ name, hot }: { name: string; hot: boolean }) {
  return (
    <span
      aria-current={hot ? 'true' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-panel px-2 py-1 text-xs font-bold text-ink-2',
        hot && 'border-transparent bg-signal-soft outline-2 outline-signal',
      )}
    >
      <Users aria-hidden className="size-4" />
      {name}
    </span>
  )
}

/** "Your file store so far": Mealhop's S3 setup, growing one piece per lesson. The piece added at `step` is highlighted. */
export function FileStoreDiagram({ step }: { step: Step }) {
  const hot = (n: Step) => step === n
  return (
    <Bench title="Your file store so far" intro={captions[step]}>
      <div className="flex flex-col gap-3">
        <p className="sr-only">New in this step: {added[step]}</p>
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
                    <Pill hot={hot(2)} sr="Bucket setting:">
                      <ShieldCheck aria-hidden className="size-3.5" />
                      <Term k="block-public-access">Block Public Access</Term> on
                    </Pill>
                  )}
                  {step >= 4 && (
                    <Pill hot={hot(4)} sr="Bucket setting:">
                      <Term k="versioning">Versioning on</Term>
                    </Pill>
                  )}
                </div>
                {/* One bucket, kept in every AZ of the Region: three AZ strips sit under the tile. */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {s3Story.azs.map((az) => (
                    <Boundary key={az} kind="az" label={az} className="min-w-28 flex-1" />
                  ))}
                </div>
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
                          <Pill hot={hot(2)} sr="Reached by the server">
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
                          <Pill hot={hot(5)} sr="Has a">
                            <ArrowDown aria-hidden className="size-3.5" />
                            <Term k="lifecycle-rule">lifecycle rule</Term>
                          </Pill>
                        )}
                        {oldMenu && (
                          <Pill hot={hot(5)} sr="Rule also covers">
                            <ArrowDown aria-hidden className="size-3.5" />
                            old versions
                          </Pill>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </Boundary>
        </div>

        {step >= 2 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Actor name="Customer" hot={hot(2)} />
            <Pill hot={hot(2)} sr="Customer reaches the bucket with a">
              <ArrowLeft aria-hidden className="size-3.5" />
              <Term k="presigned-url">link that expires</Term>
            </Pill>
          </div>
        )}
      </div>
    </Bench>
  )
}
