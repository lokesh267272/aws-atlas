/**
 * Data and rules for "Try it: who can wear this role?".
 * The rules are a simplified version of how AWS STS decides AssumeRole requests.
 */

export type PrincipalId = 'ec2' | 'lambda' | 'account' | 'sso'
export type RequesterId = 'ec2' | 'lambda' | 'dev' | 'sso' | 'stranger'

export interface PrincipalOption {
  id: PrincipalId
  label: string
  /** The key inside "Principal": { ... } */
  key: 'Service' | 'AWS' | 'Federated'
  value: string
  action: string
}

export const principalOptions: PrincipalOption[] = [
  { id: 'ec2', label: 'The EC2 service', key: 'Service', value: 'ec2.amazonaws.com', action: 'sts:AssumeRole' },
  { id: 'lambda', label: 'The Lambda service', key: 'Service', value: 'lambda.amazonaws.com', action: 'sts:AssumeRole' },
  {
    id: 'account',
    label: 'Another AWS account (111122223333, the whole account)',
    key: 'AWS',
    value: 'arn:aws:iam::111122223333:root',
    action: 'sts:AssumeRole',
  },
  {
    id: 'sso',
    label: 'People signing in through your company’s identity provider (SAML)',
    key: 'Federated',
    value: 'arn:aws:iam::123456789012:saml-provider/ExampleCorpIdP',
    action: 'sts:AssumeRoleWithSAML',
  },
]

/** Builds the trust policy JSON for the chosen principals and the line numbers to highlight. */
export function buildTrustPolicy(trusted: ReadonlySet<PrincipalId>): { code: string; highlight: number[] } {
  const chosen = principalOptions.filter((o) => trusted.has(o.id))
  const lines: string[] = ['{', '  "Version": "2012-10-17",']
  const highlight: number[] = []
  if (chosen.length === 0) {
    lines.push('  "Statement": []')
  } else {
    lines.push('  "Statement": [')
    chosen.forEach((o, i) => {
      lines.push('    {')
      lines.push('      "Effect": "Allow",')
      lines.push(`      "Principal": { "${o.key}": "${o.value}" },`)
      highlight.push(lines.length)
      lines.push(`      "Action": "${o.action}"`)
      lines.push(i === chosen.length - 1 ? '    }' : '    },')
    })
    lines.push('  ]')
  }
  lines.push('}')
  return { code: lines.join('\n'), highlight }
}

export interface Verdict {
  ok: boolean
  reason: string
}

/** Decides whether one requester may assume PhotoReader. */
export function evaluate(id: RequesterId, trusted: ReadonlySet<PrincipalId>, devAllowed: boolean): Verdict {
  switch (id) {
    case 'ec2':
      return trusted.has('ec2')
        ? {
            ok: true,
            reason:
              'The trust policy names ec2.amazonaws.com. EC2 assumes the role for the instance and hands the temporary credentials to its apps.',
          }
        : {
            ok: false,
            reason: 'No statement names ec2.amazonaws.com, so AWS STS says no. The web server gets no credentials and cannot read the photos.',
          }
    case 'lambda':
      return trusted.has('lambda')
        ? { ok: true, reason: 'The trust policy names lambda.amazonaws.com. Lambda assumes the role each time the function runs.' }
        : {
            ok: false,
            reason: 'No statement names lambda.amazonaws.com. A Lambda function can only use a role that trusts the Lambda service.',
          }
    case 'dev':
      if (!trusted.has('account')) {
        return {
          ok: false,
          reason:
            'Your trust policy does not name account 111122223333, so nobody from that account can assume PhotoReader, whatever their own policies say.',
        }
      }
      return devAllowed
        ? {
            ok: true,
            reason:
              'Both sides agree. Your trust policy names account 111122223333, and that account’s admin allowed this developer to call sts:AssumeRole on PhotoReader.',
          }
        : {
            ok: false,
            reason:
              'Your trust policy names their account, but their own admin has not allowed them to call sts:AssumeRole on this role. Cross-account access needs a yes from both accounts.',
          }
    case 'sso':
      return trusted.has('sso')
        ? {
            ok: true,
            reason:
              'Akua signs in at your company’s identity provider, which vouches for her to AWS with a signed SAML message. The role trusts that provider, so AWS STS gives her temporary credentials (AssumeRoleWithSAML).',
          }
        : {
            ok: false,
            reason: 'No statement trusts your company’s identity provider, so signing in there does not get Akua this role.',
          }
    case 'stranger':
      return {
        ok: false,
        reason:
          'The stranger has no AWS identity that your trust policy names. With no matching statement the answer is always no. Never open a role to everyone with "Principal": { "AWS": "*" }.',
      }
  }
}
