import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Segmented } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { actionMatches, resourceMatches } from './evaluate'

interface Pattern {
  value: string
  kind: 'action' | 'arn'
  why: string
}

const actionPatternList: Pattern[] = [
  { value: 's3:*', kind: 'action', why: 'After s3:, the * matches any name, so this is every S3 action. Nothing from other services.' },
  { value: 's3:Get*', kind: 'action', why: 'Every S3 action whose name starts with Get. Capitals do not matter in action names.' },
  { value: 's3:*Object', kind: 'action', why: 'A * can sit anywhere. This matches S3 actions ending in Object, including DeleteObject.' },
  { value: 'iam:*User', kind: 'action', why: 'IAM actions ending in User, such as CreateUser and DeleteUser.' },
  { value: '*', kind: 'action', why: 'A lone * matches every action in every service.' },
]

const arnPatternList: Pattern[] = [
  {
    value: 'arn:aws:s3:::example-reports/*',
    kind: 'arn',
    why: 'Every object in the bucket, even inside “folders”, because * also matches slashes. It does not match the bucket itself.',
  },
  {
    value: 'arn:aws:s3:::example-reports/q?.pdf',
    kind: 'arn',
    why: '? matches exactly one character: q1 and q4, but not q10. ARNs are case-sensitive, so Q2 does not match.',
  },
  {
    value: 'arn:aws:s3:::example-*',
    kind: 'arn',
    why: 'Every bucket whose name starts with example-, plus every object in those buckets. Wider than it looks.',
  },
]

const actionCandidates = [
  's3:GetObject',
  's3:GetBucketPolicy',
  's3:PutObject',
  's3:DeleteObject',
  's3:ListBucket',
  'S3:getobject',
  'iam:CreateUser',
  'iam:DeleteUser',
  'ec2:RunInstances',
]

const arnCandidates = [
  'arn:aws:s3:::example-reports',
  'arn:aws:s3:::example-reports/q1.pdf',
  'arn:aws:s3:::example-reports/q4.pdf',
  'arn:aws:s3:::example-reports/q10.pdf',
  'arn:aws:s3:::example-reports/Q2.pdf',
  'arn:aws:s3:::example-reports/2026/summary.pdf',
  'arn:aws:s3:::example-archive/q1.pdf',
]

const all = [...actionPatternList, ...arnPatternList]

export function WildcardTester() {
  const [value, setValue] = useState('s3:Get*')
  const pattern = all.find((p) => p.value === value) ?? actionPatternList[1]

  const rows = useMemo(() => {
    const list = pattern.kind === 'action' ? actionCandidates : arnCandidates
    return list.map((c) => ({
      candidate: c,
      match: pattern.kind === 'action' ? actionMatches(pattern.value, c) : resourceMatches(pattern.value, c),
    }))
  }, [pattern])
  const count = rows.filter((r) => r.match).length

  return (
    <Bench
      title="Try it: match with wildcards"
      intro="Choose a pattern and watch which actions or ARNs it matches. Look for the surprises: capital letters, slashes and the bucket itself."
      onReset={() => setValue('s3:Get*')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Segmented
          size="sm"
          label="Action patterns"
          value={value}
          onChange={setValue}
          options={actionPatternList.map((p) => ({ value: p.value, label: <span className="font-mono">{p.value}</span> }))}
        />
        <Segmented
          size="sm"
          label="ARN patterns"
          value={value}
          onChange={setValue}
          options={arnPatternList.map((p) => ({
            value: p.value,
            label: <span className="font-mono">{p.value.replace('arn:aws:s3:::', '…')}</span>,
            description: p.value,
          }))}
        />
      </div>

      <div className="mt-5 rounded-lg border border-line">
        <div className="border-b border-line bg-paper px-4 py-3">
          <p className="text-sm text-ink-3">Pattern</p>
          <p className="font-mono text-sm break-all text-ink">{pattern.value}</p>
          <p className="mt-1.5 text-ink-2">{pattern.why}</p>
        </div>
        <p aria-live="polite" className="px-4 pt-3 text-sm font-bold text-ink-2">
          {count} of {rows.length} match
        </p>
        <ul className="px-2 pb-2 pt-1">
          {rows.map((r) => (
            <li
              key={r.candidate}
              className={cn('flex items-center gap-3 rounded-md px-2 py-1.5', r.match ? 'bg-ok-soft' : '')}
            >
              {r.match ? (
                <Check aria-hidden className="size-4 shrink-0 text-ok" />
              ) : (
                <X aria-hidden className="size-4 shrink-0 text-ink-3" />
              )}
              <span className={cn('min-w-0 flex-1 font-mono text-sm break-all', r.match ? 'text-ink' : 'text-ink-3')}>
                {r.candidate}
              </span>
              <span className={cn('shrink-0 text-sm font-bold', r.match ? 'text-ok' : 'text-ink-3')}>
                {r.match ? 'Matches' : 'No match'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Bench>
  )
}
