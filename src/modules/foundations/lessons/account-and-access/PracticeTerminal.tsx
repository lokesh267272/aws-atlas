import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { initialUsers, runCommand, type LineKind } from './terminalCommands'
import type { CreatedUser } from './iamSim'

interface Line {
  id: number
  kind: LineKind
  text: string
  pre?: boolean
}

/** Keeps short words (such as Region codes) whole, so a line only wraps at spaces and tabs. */
function keepWords(text: string): ReactNode[] {
  return text.split(/(\s+)/).map((part, i) =>
    part.length > 0 && part.length <= 30 && !/\s/.test(part) ? (
      <span key={i} className="whitespace-nowrap">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

const MAX_LINES = 300

const SUGGESTIONS = [
  'help',
  'aws --version',
  'aws configure list',
  'aws sts get-caller-identity',
  'aws iam create-user --user-name Paulo',
  'aws iam list-users',
  'aws s3 ls',
  'aws ec2 describe-regions --query "Regions[].RegionName" --output text',
  'clear',
]

const lineStyle: Record<LineKind, string> = {
  cmd: 'text-white',
  out: 'text-screen-text',
  err: 'text-[#ff6b5e]',
  info: 'text-screen-dim',
  warn: 'text-[#ffc278]',
}

const welcome = (): Line[] => [
  { id: 1, kind: 'info', text: 'AWS CLI practice terminal (simulated). Nothing you type here reaches AWS.' },
  { id: 2, kind: 'info', text: 'Type help and press Enter, or pick a suggestion below.' },
]

/** Simulation 3: a fake terminal that answers a handful of real AWS CLI commands. */
export function PracticeTerminal() {
  const [lines, setLines] = useState<Line[]>(welcome)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histPos, setHistPos] = useState<number | null>(null)
  const [users, setUsers] = useState<CreatedUser[]>(initialUsers)
  const [announce, setAnnounce] = useState('')
  const nextId = useRef(3)
  const runCount = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const hintId = useId()

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines])

  const execute = (raw: string) => {
    const result = runCommand(raw, users)
    runCount.current += 1
    const pad = runCount.current % 2 ? ' ' : ''
    if (result.clear) {
      setLines([])
      setAnnounce(`Screen cleared.${pad}`)
    } else {
      const added: Line[] = [
        { id: nextId.current++, kind: 'cmd', text: result.echo },
        ...result.lines.map((l) => ({ id: nextId.current++, kind: l.kind, text: l.text, pre: l.pre })),
      ]
      setLines((prev) => [...prev, ...added].slice(-MAX_LINES))
      // Screen readers get a plain summary instead of raw JSON or tables when the command provides one.
      const spokenLines = result.spoken
        ? [result.spoken, ...result.lines.filter((l) => l.kind !== 'out').map((l) => l.text)]
        : result.lines.map((l) => l.text)
      const spoken = spokenLines.join(' ')
      setAnnounce((spoken.length > 400 ? `${spoken.slice(0, 400)}…` : spoken || 'Done.') + pad)
    }
    if (result.users) setUsers(result.users)
    const trimmed = raw.trim()
    if (trimmed && !result.secret) {
      setHistory((h) => (h[h.length - 1] === trimmed ? h : [...h, trimmed].slice(-50)))
    }
    setHistPos(null)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    execute(input)
    setInput('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      if (history.length === 0) return
      e.preventDefault()
      const pos = histPos === null ? history.length - 1 : Math.max(0, histPos - 1)
      setHistPos(pos)
      setInput(history[pos])
    } else if (e.key === 'ArrowDown') {
      if (histPos === null) return
      e.preventDefault()
      const pos = histPos + 1
      if (pos >= history.length) {
        setHistPos(null)
        setInput('')
      } else {
        setHistPos(pos)
        setInput(history[pos])
      }
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-screen-line bg-[#0e1821]">
        <div
          ref={scrollRef}
          role="region"
          aria-label="Terminal output"
          tabIndex={0}
          className="h-80 overflow-auto px-3 py-3 font-mono text-[0.8rem] leading-relaxed sm:text-[0.82rem]"
          style={{ tabSize: 4 }}
        >
          {lines.map((l) => (
            <div
              key={l.id}
              className={cn(l.pre ? 'whitespace-pre' : 'whitespace-pre-wrap [overflow-wrap:anywhere]', lineStyle[l.kind])}
            >
              {l.kind === 'cmd' && (
                <span aria-hidden className="select-none text-[#5fb3e6]">
                  ${' '}
                </span>
              )}
              {l.kind === 'out' && !l.pre ? keepWords(l.text) : l.text}
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-screen-line bg-screen-2 px-3 py-2">
          <span aria-hidden className="select-none font-mono text-[#5fb3e6]">
            $
          </span>
          <label htmlFor={inputId} className="sr-only">
            Command
          </label>
          <input
            id={inputId}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setHistPos(null)
            }}
            onKeyDown={onKeyDown}
            aria-describedby={hintId}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="type a command, e.g. aws s3 ls"
            className="h-9 min-w-0 flex-1 rounded-sm border border-screen-line bg-screen px-2 font-mono text-sm text-white placeholder:text-screen-dim"
          />
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-screen-line px-3 text-sm font-bold text-screen-text hover:bg-screen hover:text-white"
          >
            <CornerDownLeft aria-hidden className="size-4" />
            Run
          </button>
        </form>
      </div>
      <p id={hintId} className="mt-2 text-xs text-screen-dim">
        Press Enter to run. The up and down arrow keys bring back earlier commands.
      </p>

      <div className="mt-4">
        <p className="text-sm font-bold text-white">Suggestions (click to run)</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s} className="min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => execute(s)}
                className="max-w-full rounded-md border border-screen-line bg-screen-2 px-2.5 py-1 text-left font-mono text-xs text-screen-text [overflow-wrap:anywhere] hover:border-[#5fb3e6] hover:text-white"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  )
}
