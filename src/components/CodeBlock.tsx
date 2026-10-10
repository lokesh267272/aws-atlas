import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

type Lang = 'json' | 'shell' | 'python' | 'javascript' | 'text'

/** Token colours tuned for the dark screen background. */
const tok = {
  key: 'text-[#8fd0ff]',
  string: 'text-[#b9e37f]',
  number: 'text-[#ffc278]',
  keyword: 'text-[#ff9ccb]',
  comment: 'text-screen-dim italic',
  prompt: 'text-[#5fb3e6] select-none',
  punct: 'text-screen-dim',
}

function highlightJson(line: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d+(?:\.\d+)?\b)|\b(true|false|null)\b|([{}[\],])/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index))
    if (m[1]) {
      out.push(
        <span key={i++} className={m[2] ? tok.key : tok.string}>
          {m[1]}
        </span>,
      )
      if (m[2]) out.push(<span key={i++} className={tok.punct}>{m[2]}</span>)
    } else if (m[3]) out.push(<span key={i++} className={tok.number}>{m[3]}</span>)
    else if (m[4]) out.push(<span key={i++} className={tok.keyword}>{m[4]}</span>)
    else if (m[5]) out.push(<span key={i++} className={tok.punct}>{m[5]}</span>)
    last = re.lastIndex
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

function highlightCode(line: string, keywords: string[], comment: string): ReactNode[] {
  const ci = line.indexOf(comment)
  const code = ci >= 0 ? line.slice(0, ci) : line
  const out: ReactNode[] = []
  const re = new RegExp(`('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")|\\b(${keywords.join('|')})\\b|(\\b\\d+\\b)`, 'g')
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index))
    if (m[1]) out.push(<span key={i++} className={tok.string}>{m[1]}</span>)
    else if (m[2]) out.push(<span key={i++} className={tok.keyword}>{m[2]}</span>)
    else if (m[3]) out.push(<span key={i++} className={tok.number}>{m[3]}</span>)
    last = re.lastIndex
  }
  if (last < code.length) out.push(code.slice(last))
  if (ci >= 0) out.push(<span key={i++} className={tok.comment}>{line.slice(ci)}</span>)
  return out
}

function highlightShell(line: string, continued: boolean): ReactNode[] {
  if (line.trimStart().startsWith('#')) return [<span key="c" className={tok.comment}>{line}</span>]
  // A line after one ending in a backslash is still part of the same command.
  const m = continued ? ['', '', line] : /^(\$ )(.*)$/.exec(line)
  if (!m) return [line]
  const parts = m[2].split(/(\s--?[\w-]+)/g)
  return [
    m[1] ? (
      <span key="p" className={tok.prompt}>
        {m[1]}
      </span>
    ) : null,
    ...parts.map((p, i) =>
      /^\s--?[\w-]+$/.test(p) ? (
        <span key={i} className={tok.key}>
          {p}
        </span>
      ) : (
        <span key={i} className="text-white">
          {p}
        </span>
      ),
    ),
  ]
}

const pyKeywords = ['import', 'from', 'as', 'def', 'return', 'for', 'in', 'if', 'else', 'print', 'True', 'False', 'None', 'with']
const jsKeywords = ['import', 'from', 'const', 'let', 'await', 'async', 'new', 'return', 'export', 'function', 'true', 'false', 'null']

/**
 * Read-only code on a dark screen. Lines in `highlight` (1-based) get a
 * marker bar, for "look at this line" moments.
 * Shell lines that start with "$ " are drawn as commands; other lines as output.
 */
export function CodeBlock({
  code,
  lang = 'text',
  title,
  highlight = [],
  className,
}: {
  code: string
  lang?: Lang
  /** Shown above the code, e.g. a file name like "policy.json" */
  title?: string
  highlight?: number[]
  className?: string
}) {
  const lines = code.replace(/\n$/, '').split('\n')
  const preRef = useRef<HTMLPreElement>(null)
  const [scrolls, setScrolls] = useState(false)

  // Wide code scrolls sideways; make it reachable by keyboard only when it actually overflows.
  useEffect(() => {
    const el = preRef.current
    if (!el) return
    const check = () => setScrolls(el.scrollWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [code])

  const render = (line: string, i: number) => {
    switch (lang) {
      case 'json':
        return highlightJson(line)
      case 'python':
        return highlightCode(line, pyKeywords, '#')
      case 'javascript':
        return highlightCode(line, jsKeywords, '//')
      case 'shell':
        return highlightShell(line, i > 0 && /\\\s*$/.test(lines[i - 1]))
      default:
        return [line]
    }
  }
  return (
    <figure className={cn('my-6 overflow-hidden rounded-lg border border-screen-line bg-screen', className)}>
      {title && (
        <figcaption className="border-b border-screen-line px-4 py-2 font-mono text-xs text-screen-dim">{title}</figcaption>
      )}
      <pre
        ref={preRef}
        tabIndex={scrolls ? 0 : undefined}
        role={scrolls ? 'region' : undefined}
        aria-label={scrolls ? `${title ?? 'Code example'}, scrolls sideways` : undefined}
        className="overflow-x-auto py-3 font-mono text-[0.82rem] leading-relaxed text-screen-text focus-visible:outline-screen-accent"
      >
        <code>
          {lines.map((line, i) => (
            <span
              key={i}
              className={cn(
                'block border-l-2 px-4',
                highlight.includes(i + 1) ? 'border-[#5fb3e6] bg-white/[0.06]' : 'border-transparent',
              )}
            >
              {line ? render(line, i) : ' '}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}
