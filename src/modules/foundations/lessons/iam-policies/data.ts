import type { AccessRequest, Statement } from './evaluate'

/*
  Fake data for the simulations. Account ID and naming follow the AWS
  documentation conventions (123456789012, example-… names).
*/

export const ACCOUNT_ID = '123456789012'

/* --------------------------------------------------- Policy option lists */

export interface PatternOption {
  value: string
  /** Plain-language meaning, shown under the dropdown */
  plain: string
}

export const actionPatterns: PatternOption[] = [
  { value: 's3:GetObject', plain: 'Read (download) one file.' },
  { value: 's3:ListBucket', plain: 'List the files in a bucket.' },
  { value: 's3:PutObject', plain: 'Upload or replace a file.' },
  { value: 's3:DeleteObject', plain: 'Delete a file.' },
  { value: 's3:Get*', plain: 'Every S3 action whose name starts with Get.' },
  { value: 's3:*Object', plain: 'Every S3 action whose name ends with Object, such as GetObject, PutObject and DeleteObject.' },
  { value: 's3:*', plain: 'Every S3 action, including deleting.' },
  { value: 'ec2:StopInstances', plain: 'Stop a virtual server.' },
  { value: 'ec2:*', plain: 'Every EC2 action.' },
  { value: 'iam:CreateUser', plain: 'Create a new IAM user.' },
  { value: 'iam:*', plain: 'Every IAM action, including handing out permissions.' },
  { value: '*', plain: 'Every action in every service. Very powerful.' },
]

export const resourcePatterns: PatternOption[] = [
  { value: 'arn:aws:s3:::example-reports', plain: 'The example-reports bucket itself (not the files in it).' },
  { value: 'arn:aws:s3:::example-reports/*', plain: 'Every file in example-reports, in any folder.' },
  { value: 'arn:aws:s3:::example-reports/drafts/*', plain: 'Every file under drafts/ in example-reports.' },
  { value: 'arn:aws:s3:::example-archive/*', plain: 'Every file in the example-archive bucket.' },
  { value: 'arn:aws:s3:::example-*', plain: 'Every bucket whose name starts with example-, and every file in them.' },
  { value: 'arn:aws:s3:::*', plain: 'Every S3 bucket and file.' },
  { value: `arn:aws:ec2:us-east-1:${ACCOUNT_ID}:instance/*`, plain: 'Every EC2 instance in us-east-1 in this account.' },
  { value: `arn:aws:iam::${ACCOUNT_ID}:user/*`, plain: 'Every IAM user in this account.' },
  { value: '*', plain: 'Every resource of every kind.' },
]

export const describeAction = (v: string) => actionPatterns.find((o) => o.value === v)?.plain ?? ''
export const describeResource = (v: string) => resourcePatterns.find((o) => o.value === v)?.plain ?? ''

/* ------------------------------------------------------ Request options */

export type ResourceKind = 'object' | 'bucket' | 'instance' | 'user'

export interface RequestAction {
  action: string
  kind: ResourceKind
  plain: string
}

/** Each real action works on one kind of resource, so the request form only offers matching ARNs. */
export const requestActions: RequestAction[] = [
  { action: 's3:GetObject', kind: 'object', plain: 'read a file' },
  { action: 's3:PutObject', kind: 'object', plain: 'upload a file' },
  { action: 's3:DeleteObject', kind: 'object', plain: 'delete a file' },
  { action: 's3:ListBucket', kind: 'bucket', plain: 'list a bucket' },
  { action: 'ec2:StopInstances', kind: 'instance', plain: 'stop a server' },
  { action: 'iam:CreateUser', kind: 'user', plain: 'create a user' },
]

export interface RequestResource {
  arn: string
  /** Short name for tables */
  short: string
}

export const requestResources: Record<ResourceKind, RequestResource[]> = {
  object: [
    { arn: 'arn:aws:s3:::example-reports/q1.pdf', short: 'example-reports/q1.pdf' },
    { arn: 'arn:aws:s3:::example-reports/drafts/q2.pdf', short: 'example-reports/drafts/q2.pdf' },
    { arn: 'arn:aws:s3:::example-archive/2025.pdf', short: 'example-archive/2025.pdf' },
  ],
  bucket: [
    { arn: 'arn:aws:s3:::example-reports', short: 'example-reports (bucket)' },
    { arn: 'arn:aws:s3:::example-archive', short: 'example-archive (bucket)' },
  ],
  instance: [{ arn: `arn:aws:ec2:us-east-1:${ACCOUNT_ID}:instance/i-0abcd1234example`, short: 'instance i-0abcd1234example' }],
  user: [{ arn: `arn:aws:iam::${ACCOUNT_ID}:user/alice`, short: 'IAM user alice' }],
}

export const kindOf = (action: string): ResourceKind =>
  requestActions.find((a) => a.action === action)?.kind ?? 'object'

export const shortResource = (arn: string) =>
  Object.values(requestResources)
    .flat()
    .find((r) => r.arn === arn)?.short ?? arn

/* ------------------------------------------------------------ Builders */

let counter = 0
export const newId = () => `st-${Date.now().toString(36)}-${(counter++).toString(36)}`

export const makeStatement = (s: Omit<Statement, 'id'>): Statement => ({ id: newId(), ...s })

/** Starting policy for the simulator: read the reports, never delete. */
export const simulatorStart = (): Statement[] => [
  makeStatement({ effect: 'Allow', action: 's3:GetObject', resource: 'arn:aws:s3:::example-reports/*', mfa: false }),
  makeStatement({ effect: 'Deny', action: 's3:DeleteObject', resource: '*', mfa: false }),
]

export const simulatorStartRequest = (): AccessRequest => ({
  action: 's3:GetObject',
  resource: 'arn:aws:s3:::example-reports/q1.pdf',
  mfa: false,
})

/* ---------------------------------------------------------- Challenges */

/** "denied" accepts either kind of deny; "explicit-deny" insists on a matching Deny statement. */
export type Expected = 'allowed' | 'denied' | 'explicit-deny'

export interface ChallengeTest {
  request: AccessRequest
  expected: Expected
}

export interface Challenge {
  id: string
  title: string
  who: string
  brief: string
  tests: ChallengeTest[]
  start: () => Statement[]
  hint: string
  solution: Omit<Statement, 'id'>[]
}

const R = {
  q1: 'arn:aws:s3:::example-reports/q1.pdf',
  draft: 'arn:aws:s3:::example-reports/drafts/q2.pdf',
  archive: 'arn:aws:s3:::example-archive/2025.pdf',
  reportsBucket: 'arn:aws:s3:::example-reports',
  instance: `arn:aws:ec2:us-east-1:${ACCOUNT_ID}:instance/i-0abcd1234example`,
  alice: `arn:aws:iam::${ACCOUNT_ID}:user/alice`,
}

export const challenges: Challenge[] = [
  {
    id: 'analyst',
    title: 'Analyst',
    who: 'Priya, analyst',
    brief:
      'Priya may read any file in example-reports and list the bucket. She must never delete a file, and that rule must hold even if someone later adds a broad Allow, so use an explicit Deny. (Simplified: in a bucket that keeps old versions of files, a complete rule would also deny s3:DeleteObjectVersion.)',
    tests: [
      { request: { action: 's3:GetObject', resource: R.q1, mfa: false }, expected: 'allowed' },
      { request: { action: 's3:GetObject', resource: R.draft, mfa: false }, expected: 'allowed' },
      { request: { action: 's3:ListBucket', resource: R.reportsBucket, mfa: false }, expected: 'allowed' },
      { request: { action: 's3:PutObject', resource: R.q1, mfa: false }, expected: 'denied' },
      { request: { action: 's3:GetObject', resource: R.archive, mfa: false }, expected: 'denied' },
      { request: { action: 's3:DeleteObject', resource: R.q1, mfa: false }, expected: 'explicit-deny' },
    ],
    start: () => [makeStatement({ effect: 'Allow', action: 's3:GetObject', resource: 'arn:aws:s3:::example-reports', mfa: false })],
    hint:
      'The starting statement gives GetObject only the bucket ARN, so no file matches. Files need the bucket/* form. Listing is a bucket action, so it needs the bucket ARN. This simulator allows one resource per statement, so add a second statement for it (a real policy could also list both ARNs in one statement, like the policy you took apart earlier). Then add a Deny for deleting.',
    solution: [
      { effect: 'Allow', action: 's3:GetObject', resource: 'arn:aws:s3:::example-reports/*', mfa: false },
      { effect: 'Allow', action: 's3:ListBucket', resource: 'arn:aws:s3:::example-reports', mfa: false },
      { effect: 'Deny', action: 's3:DeleteObject', resource: '*', mfa: false },
    ],
  },
  {
    id: 'editor',
    title: 'Editor',
    who: 'Sam, report editor',
    brief:
      'Sam may do anything with the files in example-reports and may list that bucket, but must not read, change or delete anything in the drafts/ folder, and must not touch the archive bucket.',
    tests: [
      { request: { action: 's3:GetObject', resource: R.q1, mfa: false }, expected: 'allowed' },
      { request: { action: 's3:PutObject', resource: R.q1, mfa: false }, expected: 'allowed' },
      { request: { action: 's3:ListBucket', resource: R.reportsBucket, mfa: false }, expected: 'allowed' },
      { request: { action: 's3:GetObject', resource: R.draft, mfa: false }, expected: 'denied' },
      { request: { action: 's3:DeleteObject', resource: R.draft, mfa: false }, expected: 'denied' },
      { request: { action: 's3:GetObject', resource: R.archive, mfa: false }, expected: 'denied' },
    ],
    start: () => [makeStatement({ effect: 'Allow', action: 's3:*', resource: 'arn:aws:s3:::example-*', mfa: false })],
    hint:
      'example-* also matches the archive bucket, so narrow the Allow to example-reports/*. That still includes drafts/, because * crosses slashes. An explicit Deny on drafts/* carves that folder out, since a Deny always beats an Allow. One thing this Deny cannot do: s3:ListBucket acts on the whole bucket, so Sam can still see the names of the files in drafts/. Hiding them needs a condition on the s3:prefix key, which this simulator leaves out.',
    solution: [
      { effect: 'Allow', action: 's3:*', resource: 'arn:aws:s3:::example-reports/*', mfa: false },
      { effect: 'Allow', action: 's3:ListBucket', resource: 'arn:aws:s3:::example-reports', mfa: false },
      { effect: 'Deny', action: 's3:*', resource: 'arn:aws:s3:::example-reports/drafts/*', mfa: false },
    ],
  },
  {
    id: 'admin',
    title: 'Admin with MFA',
    who: 'Lee, operations admin',
    brief:
      'Lee may create IAM users and stop servers, but only after signing in with MFA. Lee may read the reports with or without MFA, and must not delete them.',
    tests: [
      { request: { action: 'iam:CreateUser', resource: R.alice, mfa: true }, expected: 'allowed' },
      { request: { action: 'iam:CreateUser', resource: R.alice, mfa: false }, expected: 'denied' },
      { request: { action: 'ec2:StopInstances', resource: R.instance, mfa: true }, expected: 'allowed' },
      { request: { action: 'ec2:StopInstances', resource: R.instance, mfa: false }, expected: 'denied' },
      { request: { action: 's3:GetObject', resource: R.q1, mfa: false }, expected: 'allowed' },
      { request: { action: 's3:DeleteObject', resource: R.q1, mfa: true }, expected: 'denied' },
    ],
    start: () => [makeStatement({ effect: 'Allow', action: '*', resource: '*', mfa: false })],
    hint:
      'Allow * on * passes the "allowed" rows but fails every "denied" row: it is far too broad. Replace it with one Allow per job: CreateUser on IAM users and StopInstances on instances (both with the MFA condition), and GetObject on the report files without it.',
    solution: [
      { effect: 'Allow', action: 'iam:CreateUser', resource: `arn:aws:iam::${ACCOUNT_ID}:user/*`, mfa: true },
      { effect: 'Allow', action: 'ec2:StopInstances', resource: `arn:aws:ec2:us-east-1:${ACCOUNT_ID}:instance/*`, mfa: true },
      { effect: 'Allow', action: 's3:GetObject', resource: 'arn:aws:s3:::example-reports/*', mfa: false },
    ],
  },
]

export const MAX_STATEMENTS = 3
