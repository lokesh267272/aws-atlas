import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { BookOpen, Check, ChevronLeft, ChevronRight, RotateCw, Shuffle } from 'lucide-react'
import { Button, Readout, Switch } from '../../../../components/controls'
import { getModule, glossary } from '../../../../course/registry'
import { cn } from '../../../../lib/cn'
import { href } from '../../../../lib/router'
import { flashcardDeck } from './flashcardDeck'
import { shuffle } from './shuffle'

const deckKeys = flashcardDeck.map((c) => c.key)
const lessonOf: Record<string, string> = Object.fromEntries(flashcardDeck.map((c) => [c.key, c.lessonId]))

const lessonTitle = (lessonId: string) =>
  getModule('foundations')?.lessons.find((l) => l.id === lessonId)?.title ?? lessonId

/**
 * Simulation: flashcards for the module's core terms. Flip a card to check
 * your answer, step through the deck, shuffle it, and mark cards you know.
 */
export function Flashcards() {
  const reduceMotion = useReducedMotion()
  const helpId = useId()
  const [order, setOrder] = useState<string[]>(deckKeys)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<string[]>([])
  const [onlyUnknown, setOnlyUnknown] = useState(false)
  const cardRef = useRef<HTMLButtonElement>(null)
  const donePanelRef = useRef<HTMLDivElement>(null)
  // The focused button can disappear (last card marked, or the done panel closed), so move focus on purpose.
  const pendingFocus = useRef<'card' | 'done' | null>(null)

  const deck = useMemo(
    () => (onlyUnknown ? order.filter((k) => !known.includes(k)) : order),
    [onlyUnknown, order, known],
  )
  const pos = Math.min(index, Math.max(deck.length - 1, 0))
  const key = deck[pos]
  const entry = key ? glossary[key] : undefined
  const isKnown = key ? known.includes(key) : false

  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    if (target === 'card') cardRef.current?.focus()
    else donePanelRef.current?.querySelector('button')?.focus()
  }, [deck.length])

  const go = (step: number) => {
    if (deck.length === 0) return
    setIndex((pos + step + deck.length) % deck.length)
    setFlipped(false)
  }

  const toggleKnown = () => {
    if (!key) return
    if (onlyUnknown && !isKnown && deck.length === 1) pendingFocus.current = 'done'
    setKnown((k) => (k.includes(key) ? k.filter((x) => x !== key) : [...k, key]))
    // With the filter on, a newly known card leaves the deck and the next one slides into this spot.
    if (onlyUnknown) setFlipped(false)
  }

  const reshuffle = () => {
    setOrder(shuffle(deckKeys))
    setIndex(0)
    setFlipped(false)
  }

  const onCardKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(-1)
    }
  }

  const face = 'flex min-h-[13rem] flex-col rounded-lg border p-4 [backface-visibility:hidden] [grid-area:1/1] sm:p-6'

  return (
    <div className="mx-auto max-w-[40rem]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Readout label="Marked as known" value={`${known.length} of ${deckKeys.length}`} tone={known.length === deckKeys.length ? 'ok' : 'neutral'} />
        <Switch
          label="Only show cards I have not marked"
          checked={onlyUnknown}
          onChange={(v) => {
            setOnlyUnknown(v)
            setIndex(0)
            setFlipped(false)
          }}
        />
      </div>

      {entry && key ? (
        <>
          <button
            ref={cardRef}
            type="button"
            onClick={() => setFlipped((f) => !f)}
            onKeyDown={onCardKey}
            aria-describedby={helpId}
            className="mt-4 block w-full rounded-lg text-left [perspective:1400px]"
          >
            <motion.span
              key={key}
              className="grid [transform-style:preserve-3d]"
              initial={false}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.3, 0.7, 0.2, 1] }}
            >
              {/* Front: the term */}
              <span aria-hidden={flipped} className={cn(face, 'border-line-strong bg-panel')}>
                <span className="text-sm text-ink-3">
                  Card {pos + 1} of {deck.length}
                  {isKnown && ' · marked as known'}
                </span>
                <span className="display my-auto py-4 text-center text-xl text-ink sm:text-2xl">{entry.term}</span>
                <span className="flex items-center justify-center gap-1.5 text-sm font-bold text-signal">
                  <RotateCw aria-hidden className="size-4" />
                  Show the definition
                </span>
              </span>
              {/* Back: the definition */}
              <span
                aria-hidden={!flipped}
                className={cn(face, 'border-signal bg-signal-soft/40 [transform:rotateY(180deg)]')}
              >
                <span className="text-sm font-bold text-ink">{entry.term}</span>
                <span className="my-auto py-3 text-ink">{entry.short}</span>
                {entry.long && <span className="pb-3 text-sm text-ink-2">{entry.long}</span>}
                <span className="flex items-center justify-center gap-1.5 text-sm font-bold text-signal">
                  <RotateCw aria-hidden className="size-4" />
                  Show the term
                </span>
              </span>
            </motion.span>
          </button>
          <p id={helpId} className="sr-only">
            Press Enter to flip. Use the left and right arrow keys to move between cards.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => go(-1)} aria-label="Previous card">
                <ChevronLeft aria-hidden />
                <span className="hidden sm:inline">Previous</span>
              </Button>
              <Button size="sm" onClick={() => go(1)} aria-label="Next card">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight aria-hidden />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={isKnown ? 'primary' : 'secondary'}
                aria-pressed={isKnown}
                onClick={toggleKnown}
              >
                <Check aria-hidden />
                {isKnown ? 'Known' : 'Mark as known'}
              </Button>
              <Button size="sm" variant="ghost" onClick={reshuffle}>
                <Shuffle aria-hidden />
                Shuffle
              </Button>
            </div>
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-3">
            <BookOpen aria-hidden className="size-4 shrink-0" />
            <span>
              Taught in{' '}
              <a
                href={href.lesson('foundations', lessonOf[key])}
                className="font-bold text-signal underline underline-offset-2"
              >
                {lessonTitle(lessonOf[key])}
              </a>
            </span>
          </p>
        </>
      ) : (
        <div ref={donePanelRef} className="mt-4 rounded-lg border border-ok bg-ok-soft/50 p-5 text-center">
          <p className="font-bold text-ink">You marked all {deckKeys.length} cards as known.</p>
          <p className="mt-1 text-ink-2">Turn the filter off to flip through them once more.</p>
          <Button
            size="sm"
            className="mt-3"
            onClick={() => {
              pendingFocus.current = 'card'
              setOnlyUnknown(false)
              setIndex(0)
            }}
          >
            Show all cards
          </Button>
        </div>
      )}

      {/* One live region that stays mounted, so screen readers hear every change, including the finished deck. */}
      <p aria-live="polite" className="sr-only">
        {entry && key
          ? flipped
            ? `Definition: ${entry.short}`
            : `Card ${pos + 1} of ${deck.length}: ${entry.term}`
          : `You marked all ${deckKeys.length} cards as known. Turn the filter off to flip through them once more.`}
      </p>
    </div>
  )
}
