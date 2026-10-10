import { useId, type FormEvent } from 'react'
import { Play, UserPlus } from 'lucide-react'
import { CodeBlock } from '../../../../components/CodeBlock'
import { Button, Pill } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'

interface PanelProps {
  name: string
  setName: (v: string) => void
  /** Plain-language problem with the name, or null */
  problem: string | null
  /** The existing user whose name matches (ignoring case), or null. IAM will refuse the name. */
  taken: string | null
  onRun: () => void
}

function Problem({ id, problem, taken, name }: { id: string; problem: string | null; taken: string | null; name: string }) {
  let text = 'Up to 64 characters: letters, numbers and + = , . @ _ -'
  if (problem) text = problem
  else if (taken) {
    text =
      taken === name
        ? `${name} already exists in this account, so IAM will refuse it. Change the name to see a success.`
        : `${taken} already exists, and IAM ignores upper and lower case, so it will refuse ${name}. Change the name to see a success.`
  }
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn('mt-1.5 min-h-[1.25rem] text-sm [overflow-wrap:anywhere]', problem ? 'font-bold text-bad' : taken ? 'text-ink-2' : 'text-ink-3')}
    >
      {text}
    </p>
  )
}

const submit = (e: FormEvent, problem: string | null, onRun: () => void) => {
  e.preventDefault()
  if (!problem) onRun()
}

/** A simplified, clearly simulated console form. */
export function ConsolePanel({ name, setName, problem, taken, onRun }: PanelProps) {
  const inputId = useId()
  const hintId = useId()
  return (
    <form onSubmit={(e) => submit(e, problem, onRun)} className="overflow-hidden rounded-md border border-line-strong">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-sunken px-3 py-2">
        <p className="text-sm text-ink-2">
          <span className="text-signal">IAM</span> <span aria-hidden>/</span> <span className="text-signal">Users</span>{' '}
          <span aria-hidden>/</span> Create user
        </p>
        <Pill>Simulated console</Pill>
      </div>
      <div className="bg-panel px-4 py-4">
        <h4 className="display text-lg text-ink">Specify user details</h4>
        <label htmlFor={inputId} className="mt-3 block text-sm font-bold text-ink">
          User name
        </label>
        <input
          id={inputId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-describedby={hintId}
          aria-invalid={problem ? true : undefined}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'mt-1 h-10 w-full max-w-sm rounded-md border bg-panel px-3 text-ink',
            problem ? 'border-bad' : 'border-line-strong',
          )}
        />
        <Problem id={hintId} problem={problem} taken={taken} name={name} />
        <div className="mt-3 flex justify-end">
          <Button type="submit" variant="primary" disabled={!!problem}>
            <UserPlus aria-hidden />
            Create user
          </Button>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Simplified: the real console spreads this over a few pages, including one for permissions.
        </p>
      </div>
    </form>
  )
}

/** The AWS CLI command, with the user name as an editable value. */
export function CliPanel({ name, setName, problem, taken, onRun }: PanelProps) {
  const inputId = useId()
  const hintId = useId()
  return (
    <form onSubmit={(e) => submit(e, problem, onRun)}>
      <div className="rounded-md border border-screen-line bg-screen px-3 py-3 font-mono text-[0.85rem] text-screen-text">
        <label htmlFor={inputId} className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span aria-hidden className="select-none text-[#5fb3e6]">
            $
          </span>
          <span className="text-white">aws iam create-user</span>
          <span className="text-[#8fd0ff]">--user-name</span>
          <span className="sr-only">value</span>
          <input
            id={inputId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-describedby={hintId}
            aria-invalid={problem ? true : undefined}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              'h-8 min-w-0 flex-1 basis-40 rounded-sm border bg-screen-2 px-2 font-mono text-white',
              problem ? 'border-[#ff6b5e]' : 'border-screen-line',
            )}
          />
        </label>
      </div>
      <Problem id={hintId} problem={problem} taken={taken} name={name} />
      <div className="mt-2 flex justify-end">
        <Button type="submit" variant="primary" disabled={!!problem}>
          <Play aria-hidden />
          Run command
        </Button>
      </div>
    </form>
  )
}

/** A short boto3 script. The user name is edited in a field above the code. */
export function SdkPanel({ name, setName, problem, taken, onRun }: PanelProps) {
  const inputId = useId()
  const hintId = useId()
  const shown = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const code = `import boto3

iam = boto3.client("iam")  # finds your credentials, like the CLI does
response = iam.create_user(UserName="${shown}")
print(response["User"]["Arn"])`
  return (
    <form onSubmit={(e) => submit(e, problem, onRun)}>
      <label htmlFor={inputId} className="block text-sm font-bold text-ink">
        Value for <code className="font-mono">UserName</code>
      </label>
      <input
        id={inputId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-describedby={hintId}
        aria-invalid={problem ? true : undefined}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          'mt-1 h-10 w-full max-w-sm rounded-md border bg-panel px-3 font-mono text-ink',
          problem ? 'border-bad' : 'border-line-strong',
        )}
      />
      <Problem id={hintId} problem={problem} taken={taken} name={name} />
      <CodeBlock lang="python" title="create_user.py" code={code} highlight={[4]} className="my-3" />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={!!problem}>
          <Play aria-hidden />
          Run script
        </Button>
      </div>
    </form>
  )
}
