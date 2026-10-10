/**
 * A small, pure model of IAM policy evaluation for ONE identity-based policy
 * inside ONE account. Used by the policy simulator, the challenges and the
 * wildcard tester, so they all agree.
 *
 * What it models (checked against the IAM User Guide, "Policy evaluation logic"):
 *  - Every request starts as an implicit deny.
 *  - If any Deny statement matches, the answer is an explicit deny. It always wins.
 *  - Otherwise, if any Allow statement matches, the request is allowed.
 *  - Otherwise it stays an implicit deny.
 *  - A statement matches when its Action, its Resource and its Condition all match.
 *  - Action names are case-insensitive. Resource ARNs are case-sensitive.
 *  - "*" matches any run of characters (including none and including "/"),
 *    "?" matches exactly one character.
 *
 * What it leaves out on purpose (the lesson labels these as simplifications):
 *  - Resource-based policies, permissions boundaries, session policies, SCPs and RCPs.
 *  - NotAction / NotResource, multiple actions or resources per statement.
 *  - The rule that a "*" at the end of an ARN segment may run past a colon.
 *    None of the patterns used in this lesson depend on it.
 */

export type Effect = 'Allow' | 'Deny'

export interface Statement {
  id: string
  effect: Effect
  /** One action pattern, e.g. "s3:GetObject" or "s3:Get*" */
  action: string
  /** One resource pattern, e.g. "arn:aws:s3:::example-reports/*" or "*" */
  resource: string
  /**
   * The lesson's one condition. On an Allow it means "only if signed in with MFA"
   * (Bool aws:MultiFactorAuthPresent "true"). On a Deny it means "only if NOT
   * signed in with MFA" (BoolIfExists aws:MultiFactorAuthPresent "false"),
   * which is the pattern AWS recommends for denying non-MFA requests.
   */
  mfa: boolean
}

export interface AccessRequest {
  /** A concrete action, e.g. "s3:GetObject" */
  action: string
  /** A concrete ARN, e.g. "arn:aws:s3:::example-reports/q1.pdf" */
  resource: string
  /** Did the caller sign in with MFA? */
  mfa: boolean
}

export type Decision = 'allowed' | 'implicit-deny' | 'explicit-deny'

export interface StatementCheck {
  index: number
  statement: Statement
  action: boolean
  resource: boolean
  /** null when the statement has no condition */
  condition: boolean | null
  matches: boolean
}

export interface Evaluation {
  decision: Decision
  checks: StatementCheck[]
  /** Indexes of Deny statements that matched */
  denyMatches: number[]
  /** Indexes of Allow statements that matched */
  allowMatches: number[]
  /** The statements that decided the outcome (empty for an implicit deny) */
  decidedBy: number[]
}

/* ------------------------------------------------------------ Wildcards */

const REGEX_SPECIAL = /[.+^${}()|[\]\\/]/g

/** Turns an IAM wildcard pattern into an anchored regular expression. */
export function globToRegExp(pattern: string, caseInsensitive: boolean): RegExp {
  let source = ''
  for (const ch of pattern) {
    if (ch === '*') source += '.*'
    else if (ch === '?') source += '.'
    else source += ch.replace(REGEX_SPECIAL, '\\$&')
  }
  return new RegExp(`^${source}$`, caseInsensitive ? 'is' : 's')
}

/** Action names (service prefix and operation) ignore capital letters. */
export function actionMatches(pattern: string, action: string): boolean {
  return globToRegExp(pattern.trim(), true).test(action.trim())
}

/** Splits an ARN into its six colon-separated parts; the last part may itself contain colons. */
export function splitArn(arn: string): string[] {
  const parts = arn.split(':')
  if (parts.length <= 6) return parts
  return [...parts.slice(0, 5), parts.slice(5).join(':')]
}

/**
 * Resource ARNs are case-sensitive and are compared part by part.
 * "*" on its own matches every resource. A pattern with fewer than six parts
 * is completed with "*" parts, as AWS does for identity-based policies.
 */
export function resourceMatches(pattern: string, arn: string): boolean {
  const p = pattern.trim()
  if (p === '*') return true
  const want = splitArn(p)
  const have = splitArn(arn.trim())
  while (want.length < 6) want.push('*')
  if (have.length !== 6) return false
  return want.every((segment, i) => globToRegExp(segment, false).test(have[i]))
}

/** Evaluates the lesson's single condition (see Statement.mfa). */
export function conditionMatches(statement: Statement, request: AccessRequest): boolean | null {
  if (!statement.mfa) return null
  return statement.effect === 'Allow' ? request.mfa : !request.mfa
}

/* ----------------------------------------------------------- Evaluation */

export function checkStatement(statement: Statement, index: number, request: AccessRequest): StatementCheck {
  const action = actionMatches(statement.action, request.action)
  const resource = resourceMatches(statement.resource, request.resource)
  const condition = conditionMatches(statement, request)
  return { index, statement, action, resource, condition, matches: action && resource && condition !== false }
}

export function evaluate(statements: Statement[], request: AccessRequest): Evaluation {
  const checks = statements.map((s, i) => checkStatement(s, i, request))
  const denyMatches = checks.filter((c) => c.matches && c.statement.effect === 'Deny').map((c) => c.index)
  const allowMatches = checks.filter((c) => c.matches && c.statement.effect === 'Allow').map((c) => c.index)
  if (denyMatches.length > 0) return { decision: 'explicit-deny', checks, denyMatches, allowMatches, decidedBy: denyMatches }
  if (allowMatches.length > 0) return { decision: 'allowed', checks, denyMatches, allowMatches, decidedBy: allowMatches }
  return { decision: 'implicit-deny', checks, denyMatches, allowMatches, decidedBy: [] }
}

/* ------------------------------------------------------------ Self-check */

/**
 * A tiny test suite (no test framework is installed). It runs once in
 * development builds when this module loads and reports failures with
 * console.error, so a broken matcher shows up immediately.
 */
function selfCheck() {
  const cases: Array<[string, boolean]> = [
    ['action exact', actionMatches('s3:GetObject', 's3:GetObject')],
    ['action ignores case', actionMatches('S3:getobject', 's3:GetObject')],
    ['action prefix wildcard', actionMatches('s3:Get*', 's3:GetObject')],
    ['action prefix wildcard rejects other verbs', !actionMatches('s3:Get*', 's3:PutObject')],
    ['action service wildcard', actionMatches('s3:*', 's3:DeleteObject')],
    ['action service wildcard stays in service', !actionMatches('s3:*', 'ec2:StopInstances')],
    ['action star matches all', actionMatches('*', 'iam:CreateUser')],
    ['action middle wildcard', actionMatches('s3:*Object', 's3:PutObject')],
    ['action question mark', actionMatches('s3:?etObject', 's3:GetObject')],
    ['dot is literal', !actionMatches('s3.GetObject', 's3:GetObject')],
    ['resource star', resourceMatches('*', 'arn:aws:iam::123456789012:user/alice')],
    ['bucket ARN is not an object ARN', !resourceMatches('arn:aws:s3:::example-reports', 'arn:aws:s3:::example-reports/q1.pdf')],
    ['object wildcard is not the bucket', !resourceMatches('arn:aws:s3:::example-reports/*', 'arn:aws:s3:::example-reports')],
    ['object wildcard crosses slashes', resourceMatches('arn:aws:s3:::example-reports/*', 'arn:aws:s3:::example-reports/2026/summary.pdf')],
    ['resource is case-sensitive', !resourceMatches('arn:aws:s3:::example-reports/q?.pdf', 'arn:aws:s3:::example-reports/Q2.pdf')],
    ['question mark is one character', resourceMatches('arn:aws:s3:::example-reports/q?.pdf', 'arn:aws:s3:::example-reports/q4.pdf')],
    ['question mark is not two', !resourceMatches('arn:aws:s3:::example-reports/q?.pdf', 'arn:aws:s3:::example-reports/q10.pdf')],
    ['prefix wildcard covers two buckets', resourceMatches('arn:aws:s3:::example-*', 'arn:aws:s3:::example-archive/2025.pdf')],
    ['service part must match', !resourceMatches('arn:aws:s3:::*', 'arn:aws:iam::123456789012:user/alice')],
    ['ec2 instance wildcard', resourceMatches('arn:aws:ec2:us-east-1:123456789012:instance/*', 'arn:aws:ec2:us-east-1:123456789012:instance/i-0abcd1234example')],
  ]

  const allowRead: Statement = { id: 'a', effect: 'Allow', action: 's3:GetObject', resource: 'arn:aws:s3:::example-reports/*', mfa: false }
  const denyAll: Statement = { id: 'd', effect: 'Deny', action: 's3:*', resource: '*', mfa: false }
  const allowMfa: Statement = { ...allowRead, id: 'm', mfa: true }
  const denyNoMfa: Statement = { id: 'n', effect: 'Deny', action: '*', resource: '*', mfa: true }
  const read: AccessRequest = { action: 's3:GetObject', resource: 'arn:aws:s3:::example-reports/q1.pdf', mfa: false }

  cases.push(
    ['empty policy is an implicit deny', evaluate([], read).decision === 'implicit-deny'],
    ['matching allow allows', evaluate([allowRead], read).decision === 'allowed'],
    ['explicit deny wins over allow', evaluate([allowRead, denyAll], read).decision === 'explicit-deny'],
    ['statement order does not matter', evaluate([denyAll, allowRead], read).decision === 'explicit-deny'],
    ['MFA allow needs MFA', evaluate([allowMfa], read).decision === 'implicit-deny'],
    ['MFA allow with MFA', evaluate([allowMfa], { ...read, mfa: true }).decision === 'allowed'],
    ['deny-without-MFA blocks', evaluate([allowRead, denyNoMfa], read).decision === 'explicit-deny'],
    ['deny-without-MFA lets MFA through', evaluate([allowRead, denyNoMfa], { ...read, mfa: true }).decision === 'allowed'],
  )

  for (const [name, ok] of cases) {
    if (!ok) console.error(`[iam-policies/evaluate] self-check failed: ${name}`)
  }
}

if (import.meta.env.DEV) selfCheck()
