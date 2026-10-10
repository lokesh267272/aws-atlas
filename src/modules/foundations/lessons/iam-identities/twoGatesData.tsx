import type { ReactNode } from 'react'
import { Term } from '../../../../components/Term'

/*
  Steps for "Try it: authentication vs authorization".
  The setup matches the suggested setup in the team simulation:
  Sam is in ReadOnly (ReadOnlyAccess), Priya is in Developers
  (AmazonEC2FullAccess + AmazonS3FullAccess).
*/

export type Scenario = 'sam' | 'priya' | 'attacker'
export type StationId = 'person' | 'authn' | 'authz' | 'resource'
export type GateState = 'idle' | 'checking' | 'pass' | 'fail' | 'skipped'
export type FileState = 'present' | 'deleted' | 'untouched'

export interface PolicyCheck {
  policy: string
  via: string
  allows: string
  matches: boolean
}

export interface GateStep {
  at: StationId
  authn: GateState
  authz: GateState
  file: FileState
  title: string
  body: ReactNode
  /** Show the API request the console sends */
  request?: boolean
  /** Show the list of policies IAM checks */
  checks?: PolicyCheck[]
  outcome?: 'allowed' | 'denied' | 'blocked'
}

export const scenarioInfo: Record<Scenario, { label: string; who: string; user: string; isAttacker: boolean }> = {
  sam: { label: 'Sam, the intern', who: 'Sam', user: 'sam', isAttacker: false },
  priya: { label: 'Priya, the developer', who: 'Priya', user: 'priya', isAttacker: false },
  attacker: { label: 'Someone with Sam’s stolen password', who: 'The attacker', user: 'sam', isAttacker: true },
}

const signInSteps = (who: string, user: string, their: string): GateStep[] => [
  {
    at: 'person',
    authn: 'idle',
    authz: 'idle',
    file: 'present',
    title: `${who} wants to delete an old file`,
    body: (
      <p>
        {who} opens the AWS sign-in page. The goal: delete <strong>report.csv</strong> from the S3 bucket{' '}
        <strong>example-bucket</strong>.
      </p>
    ),
  },
  {
    at: 'authn',
    authn: 'checking',
    authz: 'idle',
    file: 'present',
    title: 'Gate 1: something you know',
    body: (
      <p>
        {who} types the account ID <strong>123456789012</strong>, the IAM user name <strong>{user}</strong> and{' '}
        {their} password. The password matches. That is the first proof: something {who} knows.
      </p>
    ),
  },
  {
    at: 'authn',
    authn: 'pass',
    authz: 'idle',
    file: 'present',
    title: 'Gate 1: something you have',
    body: (
      <p>
        {who}’s IAM user has an MFA device set up, so AWS asks for a code. {who} types the six-digit code from the
        authenticator app on {their} phone: a second proof, something {who} has. Both proofs match, so AWS now knows this really is {who}.{' '}
        <strong>Authentication passed.</strong>
      </p>
    ),
  },
  {
    at: 'authz',
    authn: 'pass',
    authz: 'checking',
    file: 'present',
    title: `${who} presses Delete`,
    body: (
      <p>
        {who} selects report.csv and presses Delete. The console turns that click into an <Term k="api">API</Term>{' '}
        request and sends it to AWS. IAM now has to answer the second question: is this identity allowed to do this exact thing?
      </p>
    ),
    request: true,
  },
]

export function stepsFor(s: Scenario): GateStep[] {
  if (s === 'sam') {
    return [
      ...signInSteps('Sam', 'sam', 'his'),
      {
        at: 'authz',
        authn: 'pass',
        authz: 'fail',
        file: 'present',
        title: 'Gate 2: IAM checks Sam’s policies',
        body: (
          <p>
            Sam is in the ReadOnly group, which has one policy: ReadOnlyAccess. It allows actions like s3:Get* and
            s3:List*, but nothing matches s3:DeleteObject. No policy says Allow, so the default deny wins.{' '}
            <strong>Authorization failed.</strong>
          </p>
        ),
        checks: [{ policy: 'ReadOnlyAccess', via: 'ReadOnly group', allows: 's3:Get*, s3:List* and other read actions', matches: false }],
      },
      {
        at: 'authz',
        authn: 'pass',
        authz: 'fail',
        file: 'untouched',
        title: 'Access denied, and the file is safe',
        body: (
          <p>
            S3 answers with an AccessDenied error (HTTP 403), and report.csv stays where it was. Notice what happened:
            AWS knew exactly who Sam was. He passed the first gate and failed the second. He is simply not allowed to
            delete.
          </p>
        ),
        outcome: 'denied',
      },
    ]
  }
  if (s === 'priya') {
    return [
      ...signInSteps('Priya', 'priya', 'her'),
      {
        at: 'authz',
        authn: 'pass',
        authz: 'pass',
        file: 'present',
        title: 'Gate 2: IAM checks Priya’s policies',
        body: (
          <p>
            Priya is in the Developers group, which has two policies. AmazonEC2FullAccess is about servers, so it does
            not match. AmazonS3FullAccess allows s3:*, which matches s3:DeleteObject. No policy says Deny, so the Allow
            stands.{' '}
            <strong>Authorization passed.</strong>
          </p>
        ),
        checks: [
          { policy: 'AmazonEC2FullAccess', via: 'Developers group', allows: 'ec2:* and a few related services', matches: false },
          { policy: 'AmazonS3FullAccess', via: 'Developers group', allows: 's3:* (every S3 action)', matches: true },
        ],
      },
      {
        at: 'resource',
        authn: 'pass',
        authz: 'pass',
        file: 'deleted',
        title: 'Allowed: the file is deleted',
        body: (
          <p>
            The request reaches S3, and report.csv is deleted. Same button, same bucket, different result: Priya’s
            policies allow it and Sam’s do not.
          </p>
        ),
        outcome: 'allowed',
      },
    ]
  }
  return [
    {
      at: 'person',
      authn: 'idle',
      authz: 'idle',
      file: 'present',
      title: 'A stolen password',
      body: (
        <p>
          Sam used the same password on another website, and that website was hacked. Now someone else tries to sign
          in as Sam, hoping to delete report.csv.
        </p>
      ),
    },
    {
      at: 'authn',
      authn: 'checking',
      authz: 'idle',
      file: 'present',
      title: 'Gate 1: the password is right',
      body: (
        <p>
          The attacker types the account ID 123456789012, the user name sam and the stolen password. The password
          matches. So far, AWS cannot tell this is not Sam.
        </p>
      ),
    },
    {
      at: 'authn',
      authn: 'fail',
      authz: 'idle',
      file: 'present',
      title: 'Gate 1: no MFA code',
      body: (
        <p>
          Sam set up MFA, so AWS asks for the code from the authenticator app on his phone. The attacker does not have
          the phone, so they cannot give a valid code. <strong>Authentication failed.</strong>
        </p>
      ),
    },
    {
      at: 'authn',
      authn: 'fail',
      authz: 'skipped',
      file: 'untouched',
      title: 'Stopped at the first gate',
      body: (
        <p>
          The attacker never gets an identity, so no request ever reaches the second gate, and report.csv is untouched.
          This is why MFA matters: a stolen password alone is not enough. If Sam had never set up MFA, the password
          alone would have let the attacker in with all of Sam’s permissions.
        </p>
      ),
      outcome: 'blocked',
    },
  ]
}
