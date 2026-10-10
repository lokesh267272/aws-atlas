import { useEffect, useId, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { Check, CircleCheck, GripVertical, Info, KeyRound, SquareDashed, X } from 'lucide-react'
import { Readout } from '../../../../components/controls'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import { cn } from '../../../../lib/cn'
import { pieceIds, pieces, trayOrder, type PieceId } from './mapPieces'

type Tone = 'neutral' | 'ok' | 'bad'
interface Message {
  tone: Tone
  text: string
}

const START: Message = {
  tone: 'neutral',
  text: 'Choose a piece, then choose the empty box where it belongs.',
}

const isPieceId = (v: string): v is PieceId => (pieceIds as string[]).includes(v)

const nothingPlaced = (): Record<PieceId, boolean> => ({
  cloud: false,
  iam: false,
  edge: false,
  region: false,
  az: false,
  datacenter: false,
})

/**
 * Simulation: rebuild the AWS map by putting six pieces into an empty,
 * nested diagram. Click a piece then a box (works with the keyboard),
 * or drag a piece onto a box.
 */
export function MapBuilder() {
  const [placed, setPlaced] = useState(nothingPlaced)
  const [selected, setSelected] = useState<PieceId | null>(null)
  const [wrong, setWrong] = useState<{ box: PieceId; piece: PieceId } | null>(null)
  const [message, setMessage] = useState<Message>(START)
  const [wrongTries, setWrongTries] = useState(0)
  const [dragOver, setDragOver] = useState<PieceId | null>(null)
  const trayLabelId = useId()

  const pieceRefs = useRef<Partial<Record<PieceId, HTMLButtonElement | null>>>({})
  const summaryRef = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef<PieceId | 'summary' | null>(null)

  const placedCount = pieceIds.filter((id) => placed[id]).length
  const complete = placedCount === pieceIds.length

  // After a correct placement the box's button disappears, so move focus somewhere useful.
  useEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    if (target === 'summary') summaryRef.current?.focus()
    else pieceRefs.current[target]?.focus()
  }, [placed])

  const choosePiece = (id: PieceId) => {
    if (placed[id]) return
    setWrong(null)
    if (selected === id) {
      setSelected(null)
      setMessage(START)
      return
    }
    setSelected(id)
    setMessage({ tone: 'neutral', text: `Selected: ${pieces[id].label}. Now choose the box where it belongs.` })
  }

  const tryPlace = (box: PieceId, piece: PieceId | null) => {
    if (placed[box]) return
    if (!piece) {
      setMessage({ tone: 'neutral', text: 'Choose a piece first, then choose the box where it belongs.' })
      return
    }
    if (piece === box) {
      const next = { ...placed, [box]: true }
      const nextPiece = trayOrder.find((id) => !next[id])
      pendingFocus.current = nextPiece ?? 'summary'
      setPlaced(next)
      setSelected(null)
      setWrong(null)
      setMessage({ tone: 'ok', text: `Right. ${pieces[piece].fits}` })
      return
    }
    setWrong({ box, piece })
    setWrongTries((n) => n + 1)
    setMessage({ tone: 'bad', text: `${pieces[piece].label} does not go in box ${pieces[box].box}. ${pieces[piece].hint}` })
  }

  const onDrop = (box: PieceId) => (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setDragOver(null)
    const id = e.dataTransfer.getData('text/plain')
    if (isPieceId(id)) tryPlace(box, id)
  }

  /** One box of the diagram: empty (a drop target) or filled with its real name. */
  const box = (id: PieceId, children?: ReactNode, className?: string) => {
    const p = pieces[id]
    if (placed[id]) {
      // IAM is a service, not a place, so it is drawn as a tile inside the place it lives in ("Global services").
      return (
        <Boundary kind={p.kind} label={p.placedLabel ?? p.label} icon={p.placedLabel ? undefined : p.icon} className={className}>
          {id === 'iam' && <ServiceTile name="IAM" category="security" icon={KeyRound} size="sm" className="mb-1.5" />}
          <p className="flex items-start gap-1.5 text-xs text-ink-2">
            <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ok" />
            <span>{p.caption}</span>
          </p>
          {children}
        </Boundary>
      )
    }
    const isWrong = wrong?.box === id
    const isOver = dragOver === id
    return (
      <Boundary kind="group" label={`Box ${p.box}`} icon={SquareDashed} className={className}>
        <button
          type="button"
          onClick={() => tryPlace(id, selected)}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            if (dragOver !== id) setDragOver(id)
          }}
          onDragLeave={() => setDragOver((cur) => (cur === id ? null : cur))}
          onDrop={onDrop(id)}
          className={cn(
            'flex w-full items-start gap-2 rounded-md border-2 border-dashed px-2.5 py-2 text-left text-sm transition-colors',
            isWrong
              ? 'border-bad bg-bad-soft'
              : isOver
                ? 'border-signal bg-signal-soft'
                : selected
                  ? 'border-signal/70 bg-signal-soft/40 hover:bg-signal-soft'
                  : 'border-line bg-paper hover:border-line-strong',
          )}
        >
          {isWrong ? (
            <X aria-hidden className="mt-0.5 size-4 shrink-0 text-bad" />
          ) : (
            <SquareDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
          )}
          <span className="min-w-0">
            <span className="sr-only">Box {p.box}, empty. Clue: </span>
            <span className="block text-ink-2">{p.clue}</span>
            {isWrong ? (
              <span className="mt-1 block font-bold text-bad">
                Not here: {pieces[wrong.piece].hint}
              </span>
            ) : selected ? (
              <span className="mt-1 block font-bold text-signal">Place {pieces[selected].label} here</span>
            ) : (
              <span aria-hidden className="mt-1 block font-bold text-signal">
                Empty
              </span>
            )}
          </span>
        </button>
        {children}
      </Boundary>
    )
  }

  const MsgIcon = message.tone === 'ok' ? Check : message.tone === 'bad' ? X : Info

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Tray, score and feedback */}
        <div className="min-w-0">
          <p id={trayLabelId} className="text-sm font-bold text-ink-2">
            Pieces to place
          </p>
          <ul aria-labelledby={trayLabelId} className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            {trayOrder.map((id) => {
              const p = pieces[id]
              const isPlaced = placed[id]
              const isSelected = selected === id
              return (
                <li key={id}>
                  <button
                    ref={(el) => {
                      pieceRefs.current[id] = el
                    }}
                    type="button"
                    draggable={!isPlaced}
                    disabled={isPlaced}
                    aria-pressed={isSelected}
                    onClick={() => choosePiece(id)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', id)
                      e.dataTransfer.effectAllowed = 'move'
                      setSelected(id)
                      setWrong(null)
                      setMessage({ tone: 'neutral', text: `Selected: ${p.label}. Now choose the box where it belongs.` })
                    }}
                    onDragEnd={(e) => {
                      setDragOver(null)
                      // Dropped outside any box: the drag was cancelled, so put the piece back.
                      if (e.dataTransfer.dropEffect === 'none') {
                        setSelected(null)
                        setMessage(START)
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-bold transition-colors disabled:cursor-default',
                      isPlaced
                        ? 'border-line bg-sunken text-ink-3'
                        : isSelected
                          ? 'border-signal bg-signal-soft text-ink outline-2 outline-signal'
                          : 'cursor-grab border-line-strong bg-panel text-ink hover:border-ink',
                    )}
                  >
                    {isPlaced ? (
                      <Check aria-hidden className="size-4 shrink-0 text-ok" />
                    ) : (
                      <GripVertical aria-hidden className="size-4 shrink-0 text-ink-3" />
                    )}
                    <span>{p.label}</span>
                    {isPlaced && <span className="ml-auto text-xs font-normal">placed</span>}
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="mt-4 flex gap-6">
            <Readout label="Placed" value={`${placedCount} of 6`} tone={complete ? 'ok' : 'neutral'} />
            <Readout label="Wrong tries" value={wrongTries} />
          </div>

          <p
            aria-live="polite"
            className={cn(
              'mt-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm',
              message.tone === 'ok' && 'bg-ok-soft text-ink',
              message.tone === 'bad' && 'bg-bad-soft text-ink',
              message.tone === 'neutral' && 'bg-sunken text-ink-2',
            )}
          >
            <MsgIcon
              aria-hidden
              className={cn(
                'mt-0.5 size-4 shrink-0',
                message.tone === 'ok' && 'text-ok',
                message.tone === 'bad' && 'text-bad',
                message.tone === 'neutral' && 'text-ink-3',
              )}
            />
            <span>{message.text}</span>
          </p>
        </div>

        {/* The empty diagram */}
        <div className="min-w-0">
          {box(
            'cloud',
            <>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {box('iam')}
                {box('edge')}
              </div>
              {box(
                'region',
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {box('az', <div className="mt-3">{box('datacenter')}</div>)}
                  {placed.az && (
                    <div aria-hidden>
                      <Boundary kind="az" label="Availability Zone" muted />
                    </div>
                  )}
                </div>,
                'mt-3',
              )}
            </>,
          )}
          <p className="mt-3 text-xs text-ink-3">
            Simplified: {placed.az && 'the faded box is a second Availability Zone, with its own data centers, power and network. '}
            Real Regions have at least three Availability Zones (newer accounts can use only two in US West (N.
            California)), each made of one or more data centers, and AWS has hundreds of edge locations around the world.
          </p>
        </div>
      </div>

      {complete && (
        <div className="mt-6 rounded-md border border-ok bg-ok-soft/50 p-4">
          <h4 ref={summaryRef} tabIndex={-1} className="flex items-center gap-2 font-bold text-ink">
            <CircleCheck aria-hidden className="size-5 shrink-0 text-ok" />
            Map rebuilt. Here is where each piece fits
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            {pieceIds.map((id) => {
              const p = pieces[id]
              const Icon = p.icon
              return (
                <li key={id} className="flex items-start gap-2">
                  <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
                  <span>
                    <strong className="text-ink">{p.label}.</strong> {p.fits}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-sm text-ink-2">
            {wrongTries === 0
              ? 'You placed every piece on the first try. '
              : `You needed ${wrongTries} wrong ${wrongTries === 1 ? 'try' : 'tries'} along the way, which is how maps get learned. `}
            Your AWS account spans all of this: you choose a Region for most things you create, such as virtual servers,
            while IAM is global and decides who may touch each one.
          </p>
        </div>
      )}
    </div>
  )
}
