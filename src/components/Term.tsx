import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { lookupTerm } from '../course/registry'

const warned = new Set<string>()

/**
 * A glossary word inside running text. Hover, focus or tap it to see a plain
 * definition.
 *
 *   <Term k="availability-zone">Availability Zones</Term>
 *   <Term k="region" />                       // shows the glossary's own wording
 *   <Term k="vpc" def="Your private network">VPC</Term>   // override the definition
 */
export function Term({ k, children, def }: { k: string; children?: ReactNode; def?: string }) {
  const entry = lookupTerm(k)
  const label = children ?? entry?.term ?? k
  const short = def ?? entry?.short
  const id = useId()
  const triggerRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const pointerType = useRef<string>('mouse')

  if (!short && import.meta.env.DEV && !warned.has(k)) {
    warned.add(k)
    console.warn(`[Term] No glossary entry for "${k}". Add it to the glossary or pass def="…".`)
  }

  const cancelClose = () => window.clearTimeout(closeTimer.current)
  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setOpen(false), 140)
  }

  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth
    const width = Math.min(320, vw - 24)
    const left = Math.min(Math.max(12, r.left + r.width / 2 - width / 2), vw - width - 12)
    const popH = popRef.current?.offsetHeight ?? 120
    const below = r.bottom + 8
    const top = below + popH > window.innerHeight - 8 && r.top - popH - 8 > 8 ? r.top - popH - 8 : below
    setPos({ top, left, width })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!triggerRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  useEffect(() => () => cancelClose(), [])

  if (!short) return <>{label}</>

  return (
    <>
      {/* A span, not a <button>: buttons are forced to inline-block, which lets a line break
          between the word and the punctuation after it. */}
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        className="term"
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onPointerDown={(e) => (pointerType.current = e.pointerType)}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return
          cancelClose()
          setOpen(true)
        }}
        onPointerLeave={(e) => e.pointerType === 'mouse' && scheduleClose()}
        onFocus={() => setOpen(true)}
        onBlur={scheduleClose}
        onClick={() => setOpen((o) => (pointerType.current === 'mouse' ? true : !o))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((o) => !o)
          }
        }}
      >
        {label}
      </span>
      {open &&
        createPortal(
          <div
            ref={popRef}
            id={id}
            role="tooltip"
            onPointerEnter={cancelClose}
            onPointerLeave={scheduleClose}
            style={{
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: pos?.width ?? 320,
            }}
            className="fixed z-50 rounded-md bg-ink px-3.5 py-3 text-left text-sm text-white shadow-[0_8px_24px_rgba(20,33,43,0.28)]"
          >
            <p className="font-bold">{entry?.term ?? label}</p>
            <p className="mt-1 leading-snug text-white/85">{short}</p>
            {!def && entry?.long && <p className="mt-2 leading-snug text-white/70">{entry.long}</p>}
          </div>,
          document.body,
        )}
    </>
  )
}
