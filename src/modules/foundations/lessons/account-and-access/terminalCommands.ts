/**
 * A tiny, fake AWS CLI for the practice terminal. Output formats follow the
 * AWS CLI documentation examples; every ID, key and date is an example value.
 */
import {
  ACCOUNT_ID,
  CALLER_ARN,
  CALLER_NAME,
  DENIED_CALLER_ARN,
  DENIED_CALLER_NAME,
  EXAMPLE_ACCESS_KEY,
  alreadyExistsError,
  cliJson,
  makeUser,
  nameTaken,
  userNameApiError,
  userNameProblem,
  type CreatedUser,
} from './iamSim'

export type LineKind = 'cmd' | 'out' | 'err' | 'info' | 'warn'
export interface OutLine {
  kind: LineKind
  text: string
  /** Keep the exact layout (JSON, tables): no wrapping, scroll sideways instead */
  pre?: boolean
}

export interface CmdResult {
  /** The command as it should be echoed (secrets masked) */
  echo: string
  lines: OutLine[]
  clear?: boolean
  /** New list of users, when the command changed it */
  users?: CreatedUser[]
  /** True when the input looked like a real secret: do not keep it in history */
  secret?: boolean
  /** A plain-language summary of the output for screen readers, used instead of raw JSON or tables */
  spoken?: string
}

export const initialUsers: CreatedUser[] = [
  {
    UserName: 'DevAdmin',
    Path: '/',
    CreateDate: '2026-01-12T08:30:00+00:00',
    UserId: 'AIDASAMPLEUSERID',
    Arn: CALLER_ARN,
  },
  {
    UserName: DENIED_CALLER_NAME,
    Path: '/',
    CreateDate: '2026-02-03T14:05:00+00:00',
    UserId: 'AIDACKCEVSQ6C2EXAMPLE',
    Arn: DENIED_CALLER_ARN,
  },
]

/** The 17 Regions that are enabled by default in every account (opt-in Regions are left out). */
const DEFAULT_REGIONS = [
  'eu-north-1', 'ap-south-1', 'eu-west-3', 'eu-west-2', 'eu-west-1', 'ap-northeast-3', 'ap-northeast-2',
  'ap-northeast-1', 'ca-central-1', 'sa-east-1', 'ap-southeast-1', 'ap-southeast-2', 'eu-central-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
]

const HELP = `Commands this practice terminal understands:
  aws --version                  which AWS CLI version is installed
  aws configure list             your profile, Region and (masked) keys
  aws sts get-caller-identity    who AWS thinks you are
  aws iam create-user --user-name NAME
                                 create an IAM user called NAME
  aws iam list-users             list the IAM users in the account
  aws s3 ls                      list your S3 buckets
  aws ec2 describe-regions --query "Regions[].RegionName" --output text
                                 list the Regions enabled for you
  clear                          clear the screen
Up and down arrows bring back earlier commands.
Simulated: nothing reaches AWS. IDs, dates and version numbers are examples.`

const SAFE_SECRETS = [EXAMPLE_ACCESS_KEY, 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY']
const KEY_ID = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g
const SECRET = /(?<![A-Za-z0-9/+])[A-Za-z0-9/+]{40}(?![A-Za-z0-9/+=])/g

/** Masks anything that looks like a real access key ID or secret access key. */
function maskSecrets(raw: string): { text: string; found: boolean } {
  let found = false
  const mask = (m: string) => {
    if (SAFE_SECRETS.includes(m)) return m
    found = true
    return '****************'
  }
  // A secret access key mixes upper case, lower case and digits; plain long words are left alone.
  const maskSecret = (m: string) => (/[A-Z]/.test(m) && /[a-z]/.test(m) && /\d/.test(m) ? mask(m) : m)
  const text = raw.replace(KEY_ID, mask).replace(SECRET, maskSecret)
  return { text, found }
}

/** Splits a command line into words, keeping quoted parts together. */
export function tokenize(input: string): string[] {
  const out: string[] = []
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input))) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

/** Reads `--name value` or `--name=value` and returns the value (or null), removing it from args. */
function takeOption(args: string[], name: string): string | null | undefined {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === name) {
      const v = args[i + 1]
      args.splice(i, v === undefined ? 1 : 2)
      return v ?? null
    }
    if (args[i].startsWith(`${name}=`)) {
      const v = args[i].slice(name.length + 1)
      args.splice(i, 1)
      return v
    }
  }
  return undefined
}

const out = (text: string): OutLine => ({ kind: 'out', text })
/** Output whose layout matters (JSON, tables) */
const block = (text: string): OutLine => ({ kind: 'out', text, pre: true })
const err = (text: string): OutLine => ({ kind: 'err', text })
const info = (text: string): OutLine => ({ kind: 'info', text })
const warn = (text: string): OutLine => ({ kind: 'warn', text })

const tryHelp = (what: string) =>
  info(`This practice terminal does not know “${what}” yet. Type help to see what you can try.`)

function describeRegions(args: string[]): { lines: OutLine[]; spoken?: string } {
  const query = takeOption(args, '--query')
  const output = takeOption(args, '--output') ?? 'json'
  if (args.length > 0) return { lines: [tryHelp(`aws ec2 describe-regions ${args.join(' ')}`)] }
  if (query === undefined || query === null) {
    const sample = DEFAULT_REGIONS.slice(0, 3)
    const regions = sample.map((r) => ({
      Endpoint: `ec2.${r}.amazonaws.com`,
      RegionName: r,
      OptInStatus: 'opt-in-not-required',
    }))
    return {
      lines: [
        block(cliJson({ Regions: regions })),
        info('(Simulated: list shortened to 3 Regions. Add --query "Regions[].RegionName" --output text to see all names.)'),
      ],
      spoken: `3 Regions, each with its endpoint and opt-in status: ${sample.join(', ')}.`,
    }
  }
  const spoken = `${DEFAULT_REGIONS.length} Regions: ${DEFAULT_REGIONS.join(', ')}.`
  const q = query.replace(/\s+/g, '')
  if (q === 'Regions[].RegionName') {
    return { lines: [output === 'text' ? out(DEFAULT_REGIONS.join('\t')) : block(cliJson(DEFAULT_REGIONS))], spoken }
  }
  if (q === 'Regions[].{Name:RegionName}') {
    return {
      lines: [block(output === 'text' ? DEFAULT_REGIONS.join('\n') : cliJson(DEFAULT_REGIONS.map((Name) => ({ Name }))))],
      spoken,
    }
  }
  return { lines: [info('This practice terminal only understands --query "Regions[].RegionName".')] }
}

function createUser(
  args: string[],
  users: CreatedUser[],
): { lines: OutLine[]; users?: CreatedUser[]; spoken?: string } {
  const name = takeOption(args, '--user-name')
  if (name === undefined || name === null) {
    return { lines: [err('aws: error: the following arguments are required: --user-name')] }
  }
  if (args.length > 0) return { lines: [tryHelp(`aws iam create-user … ${args.join(' ')}`)] }
  // The CLI itself rejects an empty name before sending anything (the API needs at least 1 character).
  if (name === '') {
    return { lines: [err('Parameter validation failed:\nInvalid length for parameter UserName, value: 0, valid min length: 1')] }
  }
  if (userNameProblem(name)) return { lines: [err(userNameApiError(name))] }
  if (nameTaken(users.map((u) => u.UserName), name)) return { lines: [err(alreadyExistsError(name))] }
  const user = makeUser(name)
  return {
    lines: [block(cliJson({ User: user }))],
    users: [...users, user],
    spoken: `Created the IAM user ${name}. Its ARN is ${user.Arn}.`,
  }
}

/** Runs one command line against the fake account. */
export function runCommand(raw: string, users: CreatedUser[]): CmdResult {
  const { text: echo, found } = maskSecrets(raw)
  if (found) {
    return {
      echo,
      secret: true,
      lines: [
        warn(
          'Warning: that looks like a real AWS access key. Never type real keys into a website or share them. It was not stored or sent anywhere. If it is real, deactivate it in IAM now.',
        ),
      ],
    }
  }

  const words = tokenize(raw.trim())
  if (words.length === 0) return { echo, lines: [] }
  const [first, ...rest] = words
  const cmd = first.toLowerCase()

  if (cmd === 'help') return { echo, lines: [out(HELP)] }
  if (cmd === 'clear' || cmd === 'cls') return { echo, lines: [], clear: true }
  if (cmd !== 'aws') {
    return { echo, lines: [info(`“${first}” is not available in this practice terminal. Type help to see what you can try.`)] }
  }

  // Global options that do not change the simulated result
  const args = [...rest]
  takeOption(args, '--region')
  takeOption(args, '--profile')
  const noPager = args.indexOf('--no-cli-pager')
  if (noPager >= 0) args.splice(noPager, 1)

  if (args.length === 0) {
    return {
      echo,
      lines: [
        err('usage: aws [options] <command> <subcommand> [<subcommand> ...] [parameters]'),
        err('aws: error: the following arguments are required: command'),
        info('Tip: type help to see what this practice terminal understands.'),
      ],
    }
  }
  if (args.includes('help')) {
    return { echo, lines: [info('Real help pages are not included here. Type help to see what this practice terminal understands.')] }
  }

  const [service, sub, ...more] = args
  const key = `${service.toLowerCase()} ${sub?.toLowerCase() ?? ''}`.trim()

  switch (key) {
    case '--version':
      return { echo, lines: [out('aws-cli/2.32.0 Python/3.13.9 Linux/5.10.205-195.807.amzn2.x86_64')] }
    case 'configure':
      return {
        echo,
        lines: [
          warn(
            'Warning: in a real terminal, aws configure asks you to paste a long-term access key. This practice terminal never asks for keys, and you should never type real keys into a website.',
          ),
          info('For real work, AWS recommends short-term credentials: aws login (uses your console sign-in) or aws configure sso (uses IAM Identity Center).'),
        ],
      }
    case 'configure list':
      return {
        echo,
        spoken:
          'Profile: not set. Access key and secret key: masked, read from the config file. Region: us-east-1, from the config file.',
        lines: [
          block(
            [
              'NAME       : VALUE                    : TYPE             : LOCATION',
              'profile    : <not set>                : None             : None',
              'access_key : ****************MPLE     : config_file      : ~/.aws/config',
              'secret_key : ****************EKEY     : config_file      : ~/.aws/config',
              'region     : us-east-1                : config_file      : ~/.aws/config',
            ].join('\n'),
          ),
        ],
      }
    case 'login':
    case 'configure sso':
    case 'sso login':
      return {
        echo,
        lines: [
          info(
            'Simulated: in a real terminal this opens your web browser so you can sign in, then gives the CLI short-term credentials. This practice terminal is already signed in as DevAdmin.',
          ),
        ],
      }
    case 'sts get-caller-identity':
      if (more.length) break
      return {
        echo,
        lines: [block(cliJson({ UserId: 'AIDASAMPLEUSERID', Account: ACCOUNT_ID, Arn: CALLER_ARN }))],
        spoken: `You are the IAM user ${CALLER_NAME} in account ${ACCOUNT_ID}. Your ARN is ${CALLER_ARN}.`,
      }
    case 'iam create-user': {
      const r = createUser(more, users)
      return { echo, lines: r.lines, users: r.users, spoken: r.spoken }
    }
    case 'iam list-users':
      if (more.length) break
      return {
        echo,
        lines: [block(cliJson({ Users: users }))],
        spoken: `${users.length} IAM users: ${users.map((u) => u.UserName).join(', ')}. Each entry shows the user’s ARN.`,
      }
    case 's3 ls':
      if (more.length) break
      return {
        echo,
        lines: [block('2026-03-14 10:22:05 example-bucket\n2026-07-02 16:47:51 example-logs-bucket')],
        spoken: 'Two buckets: example-bucket, created 14 March 2026, and example-logs-bucket, created 2 July 2026.',
      }
    case 'ec2 describe-regions': {
      const r = describeRegions(more)
      return { echo, lines: r.lines, spoken: r.spoken }
    }
  }
  return { echo, lines: [tryHelp(`aws ${args.join(' ')}`)] }
}
