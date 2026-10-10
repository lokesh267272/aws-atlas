import { useEffect, useId, useMemo, useRef } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '../../../../lib/cn'
import { explainCode, geographies, regionByCode, regions } from './regions'

/** "US East (N. Virginia)" becomes "N. Virginia"; "Canada (Central)" stays whole so it is not confused with Mexico (Central). */
function shortName(name: string) {
  const m = /\(([^)]*)\)$/.exec(name)
  if (!m) return name
  return m[1] === 'Central' ? name : m[1]
}

/** Details of the selected Region, announced to screen readers when it changes. */
export function RegionDetails({ code }: { code: string | null }) {
  const region = code ? regionByCode[code] : undefined
  return (
    <div aria-live="polite" className="rounded-md border border-screen-line bg-screen-2 p-3.5">
      {region ? (
        <>
          <p className="flex items-center gap-2">
            <MapPin aria-hidden className="size-4 shrink-0 text-region" />
            <span className="font-mono text-lg font-bold text-white">{region.code}</span>
          </p>
          <p className="mt-0.5 font-bold text-screen-text">{region.name}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-screen-dim">Where</dt>
            <dd className="text-screen-text">{region.area}</dd>
            <dt className="text-screen-dim">AZs</dt>
            <dd className="text-screen-text">
              {region.azs} Availability Zones{region.azNote ? ` (${region.azNote})` : ''}
            </dd>
            <dt className="text-screen-dim">New account</dt>
            <dd className="text-screen-text">{region.optIn ? 'Off until you turn it on (opt-in)' : 'On by default'}</dd>
          </dl>
          <p className="mt-2 text-sm text-screen-dim">
            <span className="font-bold text-screen-text">Reading the code: </span>
            {explainCode(region.code)}
          </p>
        </>
      ) : (
        <p className="text-sm text-screen-dim">
          No Region selected yet. Click a teal dot on the globe, or choose a Region from the list below.
        </p>
      )}
    </div>
  )
}

/** All Regions grouped by geography, as real buttons. The keyboard way to use the globe. */
export function RegionList({
  selected,
  onSelect,
  onPreview,
}: {
  selected: string | null
  onSelect: (code: string) => void
  /** Called on hover or focus so the globe can show a label; null when leaving */
  onPreview: (code: string | null) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const headingId = useId()
  const groups = useMemo(
    () => geographies.map((g) => ({ geography: g, items: regions.filter((r) => r.geography === g) })),
    [],
  )

  // Keep the selected Region visible inside the scrolling list (without scrolling the page).
  useEffect(() => {
    const box = listRef.current
    if (!box || !selected) return
    const btn = box.querySelector<HTMLElement>(`[data-code="${selected}"]`)
    if (!btn) return
    const b = box.getBoundingClientRect()
    const r = btn.getBoundingClientRect()
    if (r.top < b.top) box.scrollTop -= b.top - r.top + 8
    else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8
  }, [selected])

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-md border border-screen-line">
      <h4 id={headingId} className="border-b border-screen-line px-3 py-2 text-sm font-bold text-white">
        Regions by geography <span className="font-normal text-screen-dim">({regions.length})</span>
      </h4>
      <div
        ref={listRef}
        role="group"
        aria-labelledby={headingId}
        className="max-h-[20rem] min-h-0 flex-1 overflow-y-auto px-1.5 pb-2 @3xl:max-h-none"
      >
        {groups.map(({ geography, items }) => (
          <div key={geography} className="mt-2">
            <h5 className="px-1.5 text-xs font-bold text-screen-dim">
              {geography} <span className="font-normal">· {items.length}</span>
            </h5>
            <ul className="mt-0.5">
              {items.map((r) => {
                const isSel = r.code === selected
                return (
                  <li key={r.code}>
                    <button
                      type="button"
                      data-code={r.code}
                      // One Region is chosen at a time, so "current" fits better than a toggle's "pressed"
                      aria-current={isSel ? 'true' : undefined}
                      onClick={() => onSelect(r.code)}
                      onFocus={() => onPreview(r.code)}
                      onBlur={() => onPreview(null)}
                      onMouseEnter={() => onPreview(r.code)}
                      onMouseLeave={() => onPreview(null)}
                      className={cn(
                        'flex w-full items-baseline gap-2 rounded-[4px] border px-1.5 py-1 text-left text-sm transition-colors focus-visible:outline-[#5fb3e6]',
                        isSel
                          ? 'border-[#5fb3e6] bg-[#5fb3e6]/15 text-white'
                          : 'border-transparent text-screen-text hover:bg-screen-2',
                      )}
                    >
                      {/* Wide enough for the longest code (ap-southeast-7); long names wrap instead of being cut off */}
                      <span className="w-[7.25rem] shrink-0 font-mono text-[0.8rem]">{r.code}</span>
                      <span className="min-w-0 break-words text-screen-dim">{shortName(r.name)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
