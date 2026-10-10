import type { ReactNode } from 'react'
import { FileCode, Layers, Monitor, SquareTerminal } from 'lucide-react'
import { Term } from '../../../../components/Term'

const rows: { icon: typeof Monitor; tool: ReactNode; does: ReactNode; goodFor: ReactNode }[] = [
  {
    icon: Monitor,
    tool: <Term k="management-console">AWS Management Console</Term>,
    does: 'Click through pages in your web browser.',
    goodFor: 'Exploring, learning, one-off changes, and seeing things at a glance.',
  },
  {
    icon: SquareTerminal,
    tool: <Term k="cli">AWS CLI</Term>,
    does: (
      <>
        Type commands in a <Term k="terminal">terminal</Term>, such as <code className="font-mono text-[0.9em]">aws s3 ls</code>.
      </>
    ),
    goodFor: 'Doing tasks quickly, repeating them exactly, and small scripts.',
  },
  {
    icon: FileCode,
    tool: <Term k="sdk">SDKs</Term>,
    does: (
      <>
        Call AWS from your own code, for example with <Term k="boto3">boto3</Term> in Python.
      </>
    ),
    goodFor: 'Apps that use AWS while they run, like uploading a photo when a customer posts it.',
  },
  {
    icon: Layers,
    tool: <Term k="infrastructure-as-code">Infrastructure as Code</Term>,
    does: (
      <>
        Describe what you want in files, using <Term k="cloudformation">CloudFormation</Term>,{' '}
        <Term k="aws-cdk">AWS CDK</Term> or <Term k="terraform">Terraform</Term>.
      </>
    ),
    goodFor: 'Building whole environments the same way every time, for example a test copy of production.',
  },
]

/** The four ways to work with AWS, as a table on wide screens and a stacked list on phones. */
export function ToolsTable() {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-line bg-panel">
      <div aria-hidden className="hidden border-b border-line-strong bg-paper px-4 py-2 text-sm font-bold text-ink-3 sm:grid sm:grid-cols-[14rem_1fr_1fr] sm:gap-4">
        <span>Tool</span>
        <span>What you do</span>
        <span>Good for</span>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r, i) => {
          const Icon = r.icon
          return (
            <li key={i} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[14rem_1fr_1fr] sm:gap-4">
              <p className="flex items-start gap-2 font-bold text-ink">
                <Icon aria-hidden className="mt-1 size-4 shrink-0 text-ink-2" />
                <span>{r.tool}</span>
              </p>
              <p className="text-ink-2">
                <span className="font-bold text-ink-3 sm:sr-only">What you do: </span>
                {r.does}
              </p>
              <p className="text-ink-2">
                <span className="font-bold text-ink-3 sm:sr-only">Good for: </span>
                {r.goodFor}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
