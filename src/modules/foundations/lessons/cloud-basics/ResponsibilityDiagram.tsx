import type { ReactNode } from 'react'
import { Cloud, User } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { ownerRow, type Owner } from './owner'

const youJobs = [
  'Your data',
  'Encryption choices',
  'IAM users and permissions',
  'Firewall settings (security groups)',
  'Patching the guest operating system on EC2',
  'Your application code',
]

const awsJobs = [
  'Data center buildings and guards',
  'Servers, storage and other hardware',
  'The global network',
  'Virtualization (the hypervisor)',
]

function Band({ owner, title, jobs }: { owner: Owner; title: ReactNode; jobs: string[] }) {
  const Icon = owner === 'you' ? User : Cloud
  return (
    <div className={cn('rounded-md border-2 p-3 sm:p-4', ownerRow[owner])}>
      <p className="flex items-center gap-2 font-bold">
        <Icon aria-hidden className="size-4 shrink-0" />
        {title}
      </p>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {jobs.map((j) => (
          <li
            key={j}
            className={cn(
              'rounded-[4px] px-2 py-1 text-sm',
              owner === 'you' ? 'bg-sunken text-ink' : 'bg-white/10 text-white',
            )}
          >
            {j}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The classic two-layer picture: your part sits on top of AWS's part. */
export function ResponsibilityBands() {
  return (
    <figure className="my-8 max-w-[44rem]" aria-label="The shared responsibility model">
      <div className="space-y-1.5">
        <Band
          owner="you"
          title={
            <span>
              You: security <em>in</em> the cloud
            </span>
          }
          jobs={youJobs}
        />
        <Band
          owner="provider"
          title={
            <span>
              AWS: security <em>of</em> the cloud
            </span>
          }
          jobs={awsJobs}
        />
      </div>
      <figcaption className="mt-2 text-sm text-ink-3">
        Your part sits on top of AWS’s part. Listed for a server you run on Amazon EC2.
      </figcaption>
    </figure>
  )
}

const rows: { job: string; ec2: Owner; rds: Owner }[] = [
  { job: 'Power, network and cooling', ec2: 'provider', rds: 'provider' },
  { job: 'Server hardware', ec2: 'provider', rds: 'provider' },
  { job: 'Operating system patches', ec2: 'you', rds: 'provider' },
  { job: 'Database software install and patches', ec2: 'you', rds: 'provider' },
  { job: 'Database backups', ec2: 'you', rds: 'provider' },
  { job: 'Your data, and who can connect to it', ec2: 'you', rds: 'you' },
]

function Who({ owner }: { owner: Owner }) {
  const Icon = owner === 'you' ? User : Cloud
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold',
        owner === 'you' ? 'border border-ink bg-panel text-ink' : 'bg-cloud text-white',
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {owner === 'you' ? 'You' : 'AWS'}
    </span>
  )
}

/** Same job (run a database), two services: the more managed one moves work to AWS. */
export function DatabaseSplitTable() {
  return (
    <figure className="my-8 max-w-[44rem]">
      <div className="overflow-x-auto rounded-md border border-line bg-panel">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Who does each job when you run a database on Amazon EC2 or on Amazon RDS</caption>
          <thead className="border-b border-line bg-sunken text-ink">
            <tr>
              <th scope="col" className="w-1/2 px-2 py-2 font-bold sm:px-3">
                Job
              </th>
              <th scope="col" className="px-2 py-2 font-bold sm:px-3">
                On Amazon EC2 <span className="font-normal text-ink-3">(you install it)</span>
              </th>
              <th scope="col" className="px-2 py-2 font-bold sm:px-3">
                On Amazon RDS <span className="font-normal text-ink-3">(managed)</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.job} className="text-ink-2">
                <th scope="row" className="px-2 py-2 font-normal sm:px-3">
                  {r.job}
                </th>
                <td className="px-2 py-2 sm:px-3">
                  <Who owner={r.ec2} />
                </td>
                <td className="px-2 py-2 sm:px-3">
                  <Who owner={r.rds} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mt-2 text-sm text-ink-3">
        Based on AWS’s own comparison in the Amazon RDS documentation. Simplified: AWS applies routine updates in a weekly
        maintenance window that you can choose, and moving to a new major database version is a step you start yourself.
      </figcaption>
    </figure>
  )
}
