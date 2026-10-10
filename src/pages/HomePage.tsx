import { AwsMap } from '../components/AwsMap'
import { ButtonLink } from '../components/controls'
import { modules } from '../course/registry'
import { href } from '../lib/router'
import { useProgress } from '../lib/progress'
import { ModuleRow } from './ModuleRow'

export function HomePage() {
  const { isComplete } = useProgress()
  const first = modules[0]
  // Resume at the first unfinished lesson of the first unfinished module.
  const resume = (() => {
    for (const m of modules) {
      const l = m.lessons.find((x) => !isComplete(m.id, x.id))
      if (l) return { m, l }
    }
    return null
  })()
  const started = modules.some((m) => m.lessons.some((l) => isComplete(m.id, l.id)))

  return (
    <main id="main" className="mx-auto max-w-[84rem] px-4 pb-24 sm:px-6 lg:px-8">
      <section className="pt-10 sm:pt-14">
        <h1 className="display max-w-[18ch] text-2xl text-ink sm:text-3xl lg:text-4xl">
          See where everything in AWS lives.
        </h1>
        <p className="mt-5 max-w-[62ch] text-lg text-ink-2">
          AWS has more than 200 services. They start to make sense once you know where each one sits: across the whole
          world, inside one Region, or inside a single data center. This map is the course. Each module lights up part of
          it and lets you try those services in a hands-on simulation.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          {resume ? (
            <ButtonLink variant="primary" href={href.lesson(resume.m.id, resume.l.id)}>
              {started ? `Continue: ${resume.l.title}` : `Start Module ${first.number}: ${first.title}`}
            </ButtonLink>
          ) : (
            <ButtonLink variant="primary" href={href.module(first.id)}>
              Review Module {first.number}
            </ButtonLink>
          )}
          <ButtonLink href={href.glossary()}>Look up a term</ButtonLink>
        </div>
      </section>

      <section aria-label="Course map" className="mt-10">
        <AwsMap animate />
      </section>

      <section aria-labelledby="modules-h" className="mt-16">
        <h2 id="modules-h" className="display text-xl text-ink sm:text-[1.75rem]">
          Modules
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-2">
          Work through them in order. Each one starts with what the service does, then how you use it, then where it fits
          on the map.
        </p>
        <ol className="mt-6 space-y-3">
          {modules.map((m) => (
            <li key={m.id}>
              <ModuleRow module={m} />
            </li>
          ))}
          <li className="rounded-lg border border-dashed border-line-strong px-5 py-4 text-ink-3">
            <span className="font-bold text-ink-2">Module {modules.length + 1}</span> is added once you have finished
            this one.
          </li>
        </ol>
      </section>
    </main>
  )
}
