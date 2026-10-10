import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Check, CircleX, ShieldCheck, ShieldAlert } from 'lucide-react'
import { CodeBlock } from '../../../../components/CodeBlock'
import { Pill } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { CALLER_ARN, DENIED_CALLER_ARN, cliJson, type CreatedUser } from './iamSim'

export type Tool = 'console' | 'cli' | 'sdk'
export type Outcome = 'created' | 'exists' | 'denied'

export interface Run {
  n: number
  tool: Tool
  name: string
  outcome: Outcome
  user?: CreatedUser
  error?: string
}

export const toolNames: Record<Tool, string> = {
  console: 'Console',
  cli: 'AWS CLI',
  sdk: 'Python SDK (boto3)',
}

const buildText: Record<Tool, string> = {
  console: 'The console turns your click into an API request and signs it with your sign-in session.',
  cli: 'The AWS CLI turns your command into an API request and signs it with your credentials.',
  sdk: 'boto3 turns your function call into an API request and signs it with your credentials.',
}

const replyTitle: Record<Tool, string> = {
  console: 'The console shows the new user (here as JSON)',
  cli: 'The CLI prints the reply as JSON',
  sdk: 'boto3 hands your code the reply as a Python dictionary (here as JSON)',
}

const userAgent: Record<Tool, string> = {
  console: 'your web browser, via the console',
  cli: 'aws-cli/2.x …',
  sdk: 'Boto3/1.x …',
}

const STEP_TITLES = [
  'Your tool builds and signs a request',
  'It sends an HTTPS API call to IAM',
  'IAM asks: who is asking, and are they allowed?',
  'The result comes back',
  'CloudTrail records the event',
]

function ErrorText({ children }: { children: string }) {
  return (
    <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-screen-line bg-screen px-3 py-2.5 font-mono text-[0.8rem] leading-relaxed text-[#ff6b5e]">
      {children}
    </pre>
  )
}

function StepBody({ index, run }: { index: number; run: Run }) {
  const denied = run.outcome === 'denied'
  const callerArn = denied ? DENIED_CALLER_ARN : CALLER_ARN
  switch (index) {
    case 0:
      return <p>{buildText[run.tool]}</p>
    case 1:
      return (
        <div className="mt-1 overflow-x-auto rounded-md bg-sunken px-3 py-2 font-mono text-[0.8rem] leading-relaxed text-ink">
          <div>POST https://iam.amazonaws.com/</div>
          <div>Action: CreateUser</div>
          <div className="break-all">UserName: {run.name}</div>
          <div>Signature: SigV4, from {denied ? 'ReadOnlyAnna' : 'DevAdmin'}’s credentials</div>
        </div>
      )
    case 2:
      return (
        <ul className="mt-1 space-y-1.5">
          <li className="flex flex-wrap items-center gap-2">
            <span>Who:</span>
            <code className="break-all font-mono text-[0.8rem] text-ink">{callerArn}</code>
            <Pill tone="ok">
              <Check aria-hidden />
              Signature valid
            </Pill>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span>
              Allowed to do <code className="font-mono text-[0.8rem] text-ink">iam:CreateUser</code>?
            </span>
            {denied ? (
              <Pill tone="bad">
                <ShieldAlert aria-hidden />
                No: no policy allows it
              </Pill>
            ) : (
              <Pill tone="ok">
                <ShieldCheck aria-hidden />
                Yes: a policy allows it
              </Pill>
            )}
          </li>
        </ul>
      )
    case 3:
      if (run.outcome === 'created' && run.user) {
        return (
          <>
            <p>{replyTitle[run.tool]}:</p>
            <CodeBlock lang="json" code={cliJson({ User: run.user })} className="my-2" highlight={[7]} />
            <p className="text-sm">
              The new user’s ARN:{' '}
              <code className="font-mono text-ink [overflow-wrap:anywhere]">{run.user.Arn}</code>
            </p>
          </>
        )
      }
      return (
        <>
          <p>
            {denied
              ? 'AWS refuses before anything is created, and sends back an error:'
              : 'IAM refuses, because user names must be unique in the account (ignoring upper and lower case):'}
          </p>
          <ErrorText>{run.error ?? ''}</ErrorText>
        </>
      )
    default:
      return (
        <dl className="mt-1 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-ink-3">eventName</dt>
          <dd className="font-mono text-ink">CreateUser</dd>
          <dt className="text-ink-3">eventSource</dt>
          <dd className="font-mono text-ink">iam.amazonaws.com</dd>
          <dt className="text-ink-3">awsRegion</dt>
          <dd className="font-mono text-ink">us-east-1</dd>
          <dt className="text-ink-3">who</dt>
          <dd className="break-all font-mono text-ink">{denied ? 'ReadOnlyAnna' : 'DevAdmin'}</dd>
          <dt className="text-ink-3">userAgent</dt>
          <dd className="text-ink">{userAgent[run.tool]}</dd>
          {run.outcome !== 'created' && (
            <>
              <dt className="text-ink-3">errorCode</dt>
              <dd className="font-mono text-bad">{denied ? 'AccessDenied' : 'EntityAlreadyExistsException'}</dd>
            </>
          )}
        </dl>
      )
  }
}

/** The five steps every request takes, whichever tool sent it. */
export function RequestFlow({ run, stage }: { run: Run | null; stage: number }) {
  const reduce = useReducedMotion()
  return (
    <ol className="relative space-y-3" aria-label="Request flow">
      {STEP_TITLES.map((title, i) => {
        const reached = run !== null && stage > i
        // The step just revealed, while the request is still travelling
        const current = run !== null && stage === i + 1 && stage < STEP_TITLES.length
        // Where the request is refused: the permission check (denied) or the reply (name already taken)
        const failedAt = run?.outcome === 'denied' ? 2 : run?.outcome === 'exists' ? 3 : -1
        const failedHere = run !== null && reached && i === failedAt
        let marker: ReactNode = i + 1
        if (reached && !current) marker = <Check className="size-3.5" />
        if (failedHere) marker = <CircleX className="size-3.5" />
        return (
          <li key={title} className="relative flex gap-3">
            {i < STEP_TITLES.length - 1 && (
              <span aria-hidden className="absolute left-[0.6875rem] top-7 h-[calc(100%-1rem)] w-0.5 bg-line" />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-[1] mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
                failedHere
                  ? 'bg-bad text-white'
                  : reached
                    ? 'bg-ok text-white'
                    : 'border border-line-strong bg-panel text-ink-3',
                current && !failedHere && 'ring-4 ring-signal-soft',
              )}
            >
              {marker}
            </span>
            <div className={cn('min-w-0 flex-1 pb-1', !reached && 'text-ink-3')}>
              <p className={cn('font-bold', reached ? 'text-ink' : 'text-ink-3')}>
                {title}
                {reached && <span className="sr-only">{failedHere ? ' (refused)' : ' (done)'}</span>}
              </p>
              {reached && run && (
                <motion.div
                  key={`${run.n}-${i}`}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mt-0.5 text-[0.95rem] text-ink-2"
                >
                  <StepBody index={i} run={run} />
                </motion.div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
