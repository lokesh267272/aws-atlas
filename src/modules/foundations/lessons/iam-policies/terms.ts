import type { Glossary } from '../../../../course/types'

/** Glossary terms this lesson adds (only ones missing from src/course/glossary.ts). */
export const terms: Glossary = {
  'policy-statement': {
    term: 'Statement',
    short:
      'One rule inside a policy. It says what happens (Effect), to which operations (Action), on which things (Resource) and, optionally, when (Condition). Policies attached to resources also name who the rule is for (Principal).',
  },
  'policy-effect': {
    term: 'Effect',
    short: 'The part of a statement that says what happens when it matches a request: "Allow" grants permission and "Deny" refuses it.',
  },
  sid: {
    term: 'Sid (statement ID)',
    short:
      'An optional label for a statement, such as "ReadReports". It helps people tell statements apart. AWS does not use it to decide anything.',
  },
  'policy-version': {
    term: 'Version (policy language)',
    short:
      'The "Version" line at the top of a policy. "2012-10-17" names the current edition of the policy language. It is not a date you update.',
  },
  'arn-partition': {
    term: 'Partition',
    short:
      'A group of AWS Regions, written as the second part of an ARN. Standard Regions use aws. A few separate partitions exist, such as aws-cn for the China Regions.',
  },
  'condition-key': {
    term: 'Condition key',
    short:
      'A named fact about a request that a condition can test, such as aws:MultiFactorAuthPresent (did the caller sign in with MFA?).',
  },
  'condition-operator': {
    term: 'Condition operator',
    short:
      'The kind of test a condition runs, such as Bool (true or false), StringEquals (exact text) or IpAddress (a range of addresses).',
  },
  'case-sensitive': {
    term: 'Case-sensitive',
    short: 'Capital and small letters count as different. In a case-sensitive name, Q1.pdf and q1.pdf are two different things.',
  },
  'session-policy': {
    term: 'Session policy',
    short:
      'An optional policy passed in when a program starts a temporary session, for example when it assumes a role. It can only narrow what that session may do.',
  },
  'object-key': {
    term: 'Object key',
    short:
      'The full name of a file in an S3 bucket, including any “folder” part, such as reports/q1.pdf. Keys are case-sensitive.',
  },
}
