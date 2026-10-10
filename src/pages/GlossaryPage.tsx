import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { glossary } from '../course/registry'

export function GlossaryPage() {
  const [q, setQ] = useState('')
  const entries = useMemo(
    () => Object.entries(glossary).sort(([, a], [, b]) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' })),
    [],
  )
  const query = q.trim().toLowerCase()
  const shown = query
    ? entries.filter(([, e]) => e.term.toLowerCase().includes(query) || e.short.toLowerCase().includes(query))
    : entries

  const groups = useMemo(() => {
    const map = new Map<string, typeof shown>()
    for (const item of shown) {
      const letter = item[1].term[0].toUpperCase()
      map.set(letter, [...(map.get(letter) ?? []), item])
    }
    return [...map.entries()]
  }, [shown])

  return (
    <main id="main" className="mx-auto max-w-[52rem] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-2xl text-ink sm:text-3xl">Glossary</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-ink-2">
        Every technical word used in the course, in plain language. In lessons, words with a dotted underline open these
        definitions.
      </p>
      <div className="relative mt-6">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search terms, for example “region” or “role”"
          aria-label="Search the glossary"
          className="h-11 w-full rounded-md border border-line-strong bg-panel pl-9 pr-3 text-base text-ink placeholder:text-ink-3"
        />
      </div>
      <p className="mt-3 text-sm text-ink-3" aria-live="polite">
        {shown.length === entries.length ? `${entries.length} terms` : `${shown.length} of ${entries.length} terms match`}
      </p>

      {shown.length === 0 && (
        <p className="mt-8 text-ink-2">No terms match “{q}”. Try a shorter word, such as “key” or “zone”.</p>
      )}

      <div className="mt-6 space-y-10">
        {groups.map(([letter, items]) => (
          <section key={letter} aria-labelledby={`g-${letter}`}>
            <h2 id={`g-${letter}`} className="display border-b border-line pb-1 text-lg text-region-ink">
              {letter}
            </h2>
            <dl className="mt-3 space-y-4">
              {items.map(([key, e]) => (
                <div key={key} id={`term-${key}`}>
                  <dt className="font-bold text-ink">{e.term}</dt>
                  <dd className="mt-0.5 max-w-[66ch] text-ink-2">
                    {e.short}
                    {e.long && <span className="mt-1 block text-ink-3">{e.long}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </main>
  )
}
