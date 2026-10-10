import { useState, type ReactNode } from 'react'
import { Bench } from '../../../../components/lesson'
import { Segmented } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { ACCOUNT_ID } from './data'

type ExampleId = 'bucket' | 'object' | 'user' | 'instance'
type SegmentId = 'arn' | 'partition' | 'service' | 'region' | 'account' | 'resource'

const segmentNames: Record<SegmentId, string> = {
  arn: 'Prefix',
  partition: 'Partition',
  service: 'Service',
  region: 'Region',
  account: 'Account ID',
  resource: 'Resource',
}

const segmentOrder: SegmentId[] = ['arn', 'partition', 'service', 'region', 'account', 'resource']

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded-sm bg-sunken px-1 font-mono text-[0.86em] text-ink [overflow-wrap:anywhere]">{children}</code>
)

interface Example {
  label: string
  arn: string
  values: Record<SegmentId, string>
  explain: Record<SegmentId, ReactNode>
}

const common = {
  arn: <>Every ARN starts with the letters <C>arn</C>, so you can spot one at a glance.</>,
  partition: (
    <>
      <C>aws</C> is the partition: a group of Regions. Almost every account uses <C>aws</C>. A few separate
      partitions exist, such as <C>aws-cn</C> for the China Regions.
    </>
  ),
  account: (
    <>
      <C>{ACCOUNT_ID}</C> is the 12-digit ID of the AWS account that owns the resource, written without dashes.
    </>
  ),
}

const examples: Record<ExampleId, Example> = {
  bucket: {
    label: 'S3 bucket',
    arn: 'arn:aws:s3:::example-bucket',
    values: { arn: 'arn', partition: 'aws', service: 's3', region: '', account: '', resource: 'example-bucket' },
    explain: {
      arn: common.arn,
      partition: common.partition,
      service: <><C>s3</C> is the service that owns the resource. It is the same prefix you see in actions such as <C>s3:GetObject</C>.</>,
      region: <>Empty. S3 bucket ARNs leave out the Region: the bucket name alone is enough to find it.</>,
      account: (
        <>
          Empty. A general purpose bucket’s name is unique across all accounts in its partition, so the ARN does not
          need the account ID.
        </>
      ),
      resource: <><C>example-bucket</C> is the bucket name. This ARN means the bucket itself, not the files inside it.</>,
    },
  },
  object: {
    label: 'S3 object',
    arn: 'arn:aws:s3:::example-bucket/reports/q1.pdf',
    values: { arn: 'arn', partition: 'aws', service: 's3', region: '', account: '', resource: 'example-bucket/reports/q1.pdf' },
    explain: {
      arn: common.arn,
      partition: common.partition,
      service: <><C>s3</C>: an object is a file stored in Amazon S3.</>,
      region: <>Empty, as for every general purpose S3 bucket and object ARN.</>,
      account: <>Empty. The bucket name already identifies where the file lives.</>,
      resource: (
        <>
          The bucket name, a slash, then the object key: the file’s full name, including its “folder” part{' '}
          <C>reports/</C>. Object keys are case-sensitive, so <C>Q1.pdf</C> would be a different file.
        </>
      ),
    },
  },
  user: {
    label: 'IAM user',
    arn: `arn:aws:iam::${ACCOUNT_ID}:user/alice`,
    values: { arn: 'arn', partition: 'aws', service: 'iam', region: '', account: ACCOUNT_ID, resource: 'user/alice' },
    explain: {
      arn: common.arn,
      partition: common.partition,
      service: <><C>iam</C>: the user is an IAM resource.</>,
      region: <>Empty. IAM is a global service, so IAM resources never have a Region.</>,
      account: common.account,
      resource: (
        <>
          The resource type <C>user</C>, a slash, then the user name <C>alice</C>. User names are case-sensitive in
          policies and ARNs, even though sign-in ignores capitals.
        </>
      ),
    },
  },
  instance: {
    label: 'EC2 instance',
    arn: `arn:aws:ec2:us-east-1:${ACCOUNT_ID}:instance/i-0abcd1234example`,
    values: {
      arn: 'arn',
      partition: 'aws',
      service: 'ec2',
      region: 'us-east-1',
      account: ACCOUNT_ID,
      resource: 'instance/i-0abcd1234example',
    },
    explain: {
      arn: common.arn,
      partition: common.partition,
      service: <><C>ec2</C>: the virtual server belongs to Amazon EC2.</>,
      region: <><C>us-east-1</C> is the Region code (US East, N. Virginia) where this server runs. EC2 resources live in one Region.</>,
      account: common.account,
      resource: <>The resource type <C>instance</C>, a slash, then the instance ID that AWS gave the server.</>,
    },
  },
}

export function ArnExplorer() {
  const [exampleId, setExampleId] = useState<ExampleId>('bucket')
  const [segment, setSegment] = useState<SegmentId>('region')
  const ex = examples[exampleId]

  const reset = () => {
    setExampleId('bucket')
    setSegment('region')
  }

  return (
    <Bench
      title="Try it: read an ARN"
      intro="Pick a resource, then select any part of its ARN to see what it means. Notice which parts are empty, and that the colons stay even when a part is empty."
      onReset={reset}
    >
      <Segmented
        label="Resource"
        value={exampleId}
        onChange={setExampleId}
        options={(Object.keys(examples) as ExampleId[]).map((id) => ({ value: id, label: examples[id].label }))}
      />

      <div className="mt-5 overflow-x-auto rounded-lg border border-screen-line bg-screen px-4 py-3">
        <p className="sr-only">Full ARN:</p>
        <p className="font-mono text-sm break-all text-screen-text">{ex.arn}</p>
      </div>

      <div role="group" aria-label="Parts of the ARN" className="mt-4 flex flex-wrap items-stretch gap-x-1 gap-y-3">
        {segmentOrder.map((id, i) => {
          const value = ex.values[id]
          const selected = segment === id
          return (
            <div key={id} className={cn('flex items-stretch', id === 'resource' && 'min-w-0 max-w-full')}>
              <button
                type="button"
                onClick={() => setSegment(id)}
                aria-pressed={selected}
                className={cn(
                  'flex min-w-0 flex-col items-start rounded-md border-2 px-2.5 py-1.5 text-left transition-colors',
                  selected ? 'border-signal bg-signal-soft' : 'border-line bg-panel hover:border-line-strong',
                )}
              >
                <span
                  className={cn(
                    'max-w-full font-mono text-sm break-all',
                    value ? 'text-ink' : 'italic text-ink-3',
                  )}
                >
                  {value || 'empty'}
                </span>
                <span className="text-xs text-ink-3">{segmentNames[id]}</span>
              </button>
              {i < segmentOrder.length - 1 && (
                <span aria-hidden className="self-start px-0.5 pt-1.5 font-mono text-lg font-bold text-ink-3">
                  :
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div aria-live="polite" className="mt-4 rounded-md bg-paper px-4 py-3">
        <p className="font-bold text-ink">
          {segmentNames[segment]}
          {ex.values[segment] ? '' : ' (empty)'}
        </p>
        <p className="mt-1 text-ink-2">{ex.explain[segment]}</p>
      </div>
    </Bench>
  )
}
