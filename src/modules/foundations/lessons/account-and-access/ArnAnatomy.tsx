import { useState, Fragment } from 'react'
import { Segmented } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'

type Example = 'iam' | 's3' | 'vpc'

interface Part {
  label: string
  value: string
}

const LABELS = ['prefix', 'partition', 'service', 'region', 'account ID', 'resource']

const examples: Record<Example, { parts: string[]; note: string; what: string }> = {
  iam: {
    parts: ['arn', 'aws', 'iam', '', '123456789012', 'user/DevAdmin'],
    what: 'An IAM user called DevAdmin',
    note: 'The Region is empty because IAM is a global service. IAM users are not tied to any one Region.',
  },
  s3: {
    parts: ['arn', 'aws', 's3', '', '', 'example-bucket'],
    what: 'An S3 bucket called example-bucket',
    note: 'Both the Region and the account ID are empty. For an S3 bucket, the bucket name alone identifies it.',
  },
  vpc: {
    parts: ['arn', 'aws', 'ec2', 'us-east-1', '123456789012', 'vpc/vpc-0e9801d129EXAMPLE'],
    what: 'A VPC (a private network) in Northern Virginia',
    note: 'Every part is filled in. VPCs are managed by the EC2 service, so the service part is ec2. A VPC lives in one Region and belongs to one account, so the ARN says both.',
  },
}

const meaning: Record<string, string> = {
  prefix: 'Always the letters arn, so you know what you are reading.',
  partition:
    'Which group of Regions. Almost always aws (the standard Regions). Others include aws-cn (China), aws-us-gov (GovCloud US) and aws-eusc (AWS European Sovereign Cloud).',
  service: 'Which AWS service owns the resource: iam, s3, ec2 and so on.',
  region: 'The Region code where the resource lives, such as us-east-1. Empty for global resources.',
  'account ID': 'The 12-digit ID of the account that owns it. Empty when the resource does not need it.',
  resource: 'Which resource: often its type and name, such as user/DevAdmin.',
}

/** An ARN split into labelled parts, with three real-format examples. */
export function ArnAnatomy() {
  const [ex, setEx] = useState<Example>('iam')
  const current = examples[ex]
  const parts: Part[] = current.parts.map((value, i) => ({ value, label: LABELS[i] }))
  const full = current.parts.join(':')

  return (
    <figure className="my-8 rounded-lg border border-line bg-panel p-4 sm:p-5">
      <Segmented
        label="Example"
        value={ex}
        onChange={setEx}
        size="sm"
        options={[
          { value: 'iam', label: 'IAM user' },
          { value: 's3', label: 'S3 bucket' },
          { value: 'vpc', label: 'VPC' },
        ]}
      />
      <p className="mt-4 text-sm text-ink-3">{current.what}</p>
      <p className="mt-1 break-all font-mono text-[0.95rem] text-ink">
        {full}
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-x-1 gap-y-3" aria-hidden>
        {parts.map((p, i) => (
          <Fragment key={p.label}>
            {i > 0 && <span className="pt-1.5 font-mono text-lg text-ink-3">:</span>}
            <div className="flex min-w-[4.5rem] flex-col items-center">
              <span
                className={cn(
                  'w-full rounded-md border-2 [overflow-wrap:anywhere] px-2 py-1 text-center font-mono text-sm',
                  p.value ? 'border-line-strong bg-sunken text-ink' : 'border-dashed border-line-strong text-ink-3',
                )}
              >
                {p.value || 'empty'}
              </span>
              <span className="mt-1 text-xs font-bold text-ink-2">{p.label}</span>
            </div>
          </Fragment>
        ))}
      </div>

      <dl className="mt-5 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
        {parts.map((p) => (
          <div key={p.label} className="contents">
            <dt className="font-bold text-ink [overflow-wrap:anywhere]">
              {p.label}
              <span className="font-normal text-ink-3">{p.value ? `: ${p.value}` : ': (empty)'}</span>
            </dt>
            <dd className="mb-1.5 text-ink-2 sm:mb-0">{meaning[p.label]}</dd>
          </div>
        ))}
      </dl>
      <figcaption className="mt-4 rounded-md bg-signal-soft px-3 py-2.5 text-ink" aria-live="polite">
        {current.note}
      </figcaption>
    </figure>
  )
}
