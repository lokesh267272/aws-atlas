import type { Statement } from './evaluate'

export interface PolicyJson {
  code: string
  /** 1-based [first, last] line numbers of each statement, for highlighting */
  ranges: Array<[number, number]>
}

const q = (s: string) => JSON.stringify(s)

/** The JSON lines for the lesson's one condition (see Statement.mfa in evaluate.ts). */
export function conditionLines(effect: Statement['effect']): string[] {
  return effect === 'Allow'
    ? ['"Condition": {', '  "Bool": {', '    "aws:MultiFactorAuthPresent": "true"', '  }', '}']
    : ['"Condition": {', '  "BoolIfExists": {', '    "aws:MultiFactorAuthPresent": "false"', '  }', '}']
}

/** Writes statements as a real-looking IAM policy, two-space indented like the AWS console does. */
export function policyToJson(statements: Statement[]): PolicyJson {
  const lines: string[] = ['{', '  "Version": "2012-10-17",']
  const ranges: Array<[number, number]> = []
  if (statements.length === 0) {
    lines.push('  "Statement": []', '}')
    return { code: lines.join('\n'), ranges }
  }
  lines.push('  "Statement": [')
  statements.forEach((s, i) => {
    const start = lines.length + 1
    const body = [
      `"Sid": ${q(`Statement${i + 1}`)},`,
      `"Effect": ${q(s.effect)},`,
      `"Action": ${q(s.action)},`,
      `"Resource": ${q(s.resource)}${s.mfa ? ',' : ''}`,
      ...(s.mfa ? conditionLines(s.effect) : []),
    ]
    lines.push('    {', ...body.map((l) => `      ${l}`), `    }${i < statements.length - 1 ? ',' : ''}`)
    ranges.push([start, lines.length])
  })
  lines.push('  ]', '}')
  return { code: lines.join('\n'), ranges }
}
