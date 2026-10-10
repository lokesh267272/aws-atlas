import { useEffect } from 'react'
import { ButtonLink } from './components/controls'
import { getLesson, getModule } from './course/registry'
import { cn } from './lib/cn'
import { href, useRoute } from './lib/router'
import { GlossaryPage } from './pages/GlossaryPage'
import { HomePage } from './pages/HomePage'
import { LessonPage } from './pages/LessonPage'
import { ModulePage } from './pages/ModulePage'

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className="size-7">
      <rect width="32" height="32" rx="6" fill="var(--color-ink)" />
      <rect x="5" y="5" width="22" height="22" rx="2" fill="none" stroke="var(--color-region)" strokeWidth="2" strokeDasharray="4 3" />
      <rect x="10" y="10" width="12" height="12" rx="1.5" fill="none" stroke="#5fb3e6" strokeWidth="2" strokeDasharray="3 2.5" />
      <circle cx="16" cy="16" r="2.5" fill="#fff" />
    </svg>
  )
}

function Header({ section }: { section: 'map' | 'glossary' | 'learn' }) {
  const link = (active: boolean) =>
    cn('whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-bold sm:px-3', active ? 'bg-sunken text-ink' : 'text-ink-2 hover:text-ink')
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          const main = document.getElementById('main')
          main?.setAttribute('tabindex', '-1')
          main?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 max-w-[84rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <a href={href.home()} className="flex shrink-0 items-center gap-2">
          <BrandMark />
          <span className="display whitespace-nowrap text-base text-ink">AWS Atlas</span>
        </a>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1">
          <a href={href.home()} className={link(section === 'map')} aria-current={section === 'map' ? 'page' : undefined}>
            <span className="sm:hidden">Map</span>
            <span className="max-sm:hidden">Course map</span>
          </a>
          <a
            href={href.glossary()}
            className={link(section === 'glossary')}
            aria-current={section === 'glossary' ? 'page' : undefined}
          >
            Glossary
          </a>
        </nav>
      </div>
    </header>
  )
}

function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-[52rem] px-4 py-20 sm:px-6">
      <h1 className="display text-2xl text-ink">That page is not on the map.</h1>
      <p className="mt-3 text-ink-2">The link may be out of date. Go back to the course map to find your place.</p>
      <ButtonLink variant="primary" href={href.home()} className="mt-6">
        Open the course map
      </ButtonLink>
    </main>
  )
}

export default function App() {
  const route = useRoute()

  // New page, new scroll position.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [route])

  let page = <NotFound />
  let section: 'map' | 'glossary' | 'learn' = 'learn'

  if (route.name === 'home') {
    page = <HomePage />
    section = 'map'
  } else if (route.name === 'glossary') {
    page = <GlossaryPage />
    section = 'glossary'
  } else if (route.name === 'module') {
    const m = getModule(route.moduleId)
    if (m) page = <ModulePage module={m} />
  } else if (route.name === 'lesson') {
    const found = getLesson(route.moduleId, route.lessonId)
    if (found) page = <LessonPage key={`${found.module.id}/${found.lesson.id}`} {...found} />
  }

  useEffect(() => {
    const titles: Record<string, string> = { home: 'AWS Atlas', glossary: 'Glossary · AWS Atlas' }
    if (route.name === 'lesson') {
      const found = getLesson(route.moduleId, route.lessonId)
      document.title = found ? `${found.lesson.title} · AWS Atlas` : 'AWS Atlas'
    } else if (route.name === 'module') {
      const m = getModule(route.moduleId)
      document.title = m ? `Module ${m.number}: ${m.title} · AWS Atlas` : 'AWS Atlas'
    } else {
      document.title = titles[route.name] ?? 'AWS Atlas'
    }
  }, [route])

  return (
    <div className="min-h-dvh">
      <Header section={section} />
      {page}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-[84rem] px-4 py-6 text-sm text-ink-3 sm:px-6 lg:px-8">
          AWS Atlas is an independent study project. It is not made or endorsed by Amazon Web Services. Simulations are
          simplified to teach the idea; check the AWS documentation before relying on a detail.
        </div>
      </footer>
    </div>
  )
}
