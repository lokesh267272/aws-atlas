/**
 * Shared, simplified IAM behaviour for this lesson's simulations.
 * Values follow the AWS documentation examples (account 123456789012,
 * access key AKIAIOSFODNN7EXAMPLE). Nothing here talks to AWS.
 */

export const ACCOUNT_ID = '123456789012'
export const CALLER_NAME = 'DevAdmin'
export const CALLER_ARN = `arn:aws:iam::${ACCOUNT_ID}:user/${CALLER_NAME}`
export const DENIED_CALLER_NAME = 'ReadOnlyAnna'
export const DENIED_CALLER_ARN = `arn:aws:iam::${ACCOUNT_ID}:user/${DENIED_CALLER_NAME}`
export const EXAMPLE_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE'

/** IAM CreateUser rule: 1-64 characters from [\w+=,.@-] (letters, digits and _ + = , . @ -). */
const ALLOWED = /^[A-Za-z0-9_+=,.@-]+$/
const MAX_LEN = 64

/** Returns a plain-language problem with the name, or null if IAM would accept it. */
export function userNameProblem(name: string): string | null {
  if (name.length === 0) return 'Type a user name first.'
  if (name.length > MAX_LEN) return `That name has ${name.length} characters. The limit is ${MAX_LEN}.`
  if (!ALLOWED.test(name)) {
    const bad = Array.from(new Set(name.split('').filter((c) => !/[A-Za-z0-9_+=,.@-]/.test(c))))
    const shown = bad.map((c) => (c === ' ' ? 'space' : `“${c}”`)).join(', ')
    return `Not allowed: ${shown}. Use letters, numbers and + = , . @ _ - only.`
  }
  return null
}

/** The error text real IAM returns for a name that breaks the rules (simplified). */
export function userNameApiError(name: string): string {
  if (name.length > MAX_LEN) {
    return `An error occurred (ValidationError) when calling the CreateUser operation: 1 validation error detected: Value '${name}' at 'userName' failed to satisfy constraint: Member must have length less than or equal to 64`
  }
  return `An error occurred (ValidationError) when calling the CreateUser operation: 1 validation error detected: Value '${name}' at 'userName' failed to satisfy constraint: Member must satisfy regular expression pattern: [\\w+=,.@-]+`
}

/** IAM user names are unique in an account and not distinguished by case. */
export function nameTaken(existing: string[], name: string): boolean {
  const lower = name.toLowerCase()
  return existing.some((n) => n.toLowerCase() === lower)
}

const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** A fake IAM user ID: real ones start with AIDA and are 21 characters long. */
export function fakeUserId(): string {
  let s = 'AIDA'
  for (let i = 0; i < 10; i++) s += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]
  return `${s}EXAMPLE`
}

/** ISO 8601 time in the style the AWS CLI prints, e.g. 2026-10-03T09:41:27+00:00 */
export function cliTimestamp(d = new Date()): string {
  return `${d.toISOString().slice(0, 19)}+00:00`
}

export interface CreatedUser {
  UserName: string
  UserId: string
  Arn: string
  Path: string
  CreateDate: string
}

export function makeUser(name: string): CreatedUser {
  return {
    UserName: name,
    Path: '/',
    CreateDate: cliTimestamp(),
    UserId: fakeUserId(),
    Arn: `arn:aws:iam::${ACCOUNT_ID}:user/${name}`,
  }
}

/** JSON with 4-space indentation, as the AWS CLI prints it. */
export function cliJson(value: unknown): string {
  return JSON.stringify(value, null, 4)
}

export const alreadyExistsError = (name: string) =>
  `An error occurred (EntityAlreadyExists) when calling the CreateUser operation: User with name ${name} already exists.`

export const accessDeniedError = (name: string) =>
  `An error occurred (AccessDenied) when calling the CreateUser operation: User: ${DENIED_CALLER_ARN} is not authorized to perform: iam:CreateUser on resource: arn:aws:iam::${ACCOUNT_ID}:user/${name} because no identity-based policy allows the iam:CreateUser action`
