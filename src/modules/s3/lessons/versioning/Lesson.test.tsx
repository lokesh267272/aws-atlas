import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { checkTextBudget, S3_LIMITS } from '../../../../test/textBudget'
import { FileHistory, historyMessage } from './FileHistory'
import { GOAL, HINT, InternScript, MenuPreview, SUCCESS_NOTE } from './InternScript'
import { runMessage } from './internChallenge'
import Lesson from './Lesson'
import { ModeControl, VersionStack } from './parts'
import { terms } from './terms'
import { MENU_START, del, runScript, setMode } from './versioningModel'

const noop = () => {}
const textOf = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const sentences = (text: string) => (text.match(/[.!?](\s|$)/g) ?? []).length
const radio = (html: string, value: string) => new RegExp(`<input[^>]*value="${value}"[^>]*>`).exec(html)?.[0] ?? ''

describe('versioning lesson', () => {
  it('renders the challenge goal and the Run the script button in SSR', () => {
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/Run the script, then make the menu look exactly as it did before/)
    expect(html).toMatch(/Run the script<\/button>/)
  })

  it('stays within the Module 3 text budget', () => {
    expect(checkTextBudget(renderToStaticMarkup(<Lesson />), S3_LIMITS)).toEqual([])
  })

  it('explains versioning as an undo history', () => {
    const html = renderToStaticMarkup(<Lesson />)
    const explain = /<div data-explain=""[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? ''
    expect(textOf(explain)).toMatch(/undo history/)
    expect(textOf(explain)).toMatch(/off by default/)
  })

  it('adds only its own four terms, and Object Lock and MFA delete appear only as tappable terms', () => {
    expect(Object.keys(terms).sort()).toEqual(['delete-marker', 'mfa-delete', 'object-lock', 'version-id'])
    const html = renderToStaticMarkup(<Lesson />)
    expect(html).toMatch(/class="term"[^>]*>S3 Object Lock</)
    expect(html).toMatch(/class="term"[^>]*>MFA delete</)
    const withoutTerms = html.replace(/<span[^>]*class="term"[^>]*>[^<]*<\/span>/g, '')
    expect(withoutTerms).not.toMatch(/Object Lock|MFA delete/)
  })

  it('never says versioning can be turned off again', () => {
    const text = textOf(renderToStaticMarkup(<Lesson />))
    expect(text).not.toMatch(/turn(ed)? (it |versioning )?(back )?off(?! again)/i)
    expect(text).toMatch(/never turned off again/)
  })

  it('shows the photo saved before versioning with version ID null', () => {
    expect(renderToStaticMarkup(<FileHistory />)).toMatch(/>null</)
  })

  it('ties the versions stored to an example cost', () => {
    const html = renderToStaticMarkup(<FileHistory />)
    expect(html).toMatch(/Photo versions stored/)
    expect(html).toMatch(/Example prices/)
    // One version of 400 GB of menu photos on S3 Standard, at the shared example price.
    expect(html).toMatch(/\$10\.00 a month/)
  })

  it('offers upload, overwrite, delete and remove marker on the photo', () => {
    const html = renderToStaticMarkup(<FileHistory />)
    for (const label of ['Upload new photo', 'Overwrite with blank', 'Delete', 'Remove marker']) {
      expect(html).toContain(`${label}</button>`)
    }
  })

  it('status lines teach what each action did, one or two short sentences each', () => {
    const msg = historyMessage
    expect(msg({ kind: 'blank', mode: 'off', hadFile: true })).toMatch(/gone for good/)
    expect(msg({ kind: 'blank', mode: 'on', hadFile: true })).toMatch(/kept underneath/)
    expect(msg({ kind: 'delete', mode: 'off', hadFile: true })).toMatch(/deleted for good/)
    expect(msg({ kind: 'delete', mode: 'on', hadFile: true })).toMatch(/delete marker.*Older versions are kept/)
    expect(msg({ kind: 'restore', mode: 'on', hadFile: false })).toMatch(/new version/)
    expect(msg({ kind: 'restore', mode: 'suspended', hadFile: false })).toMatch(/null version/)
    expect(msg({ kind: 'delete-version', mode: 'on', hadFile: true, versionId: 'null' })).toMatch(/Version null is deleted for good/)
    expect(msg({ kind: 'mode', mode: 'on' })).toMatch(/version ID null/)
  })

  it('locks Off once versioning has been on, and suspend needs it on first', () => {
    const off = renderToStaticMarkup(<ModeControl mode="off" onChange={noop} />)
    expect(radio(off, 'off')).not.toMatch(/disabled/)
    expect(radio(off, 'suspended')).toMatch(/disabled/)
    const on = renderToStaticMarkup(<ModeControl mode="on" onChange={noop} />)
    expect(radio(on, 'off')).toMatch(/disabled/)
    expect(radio(on, 'suspended')).not.toMatch(/disabled/)
    expect(textOf(on)).toMatch(/can only be suspended/)
  })

  it('a delete with versioning on shows a delete marker on top, with the older photo kept below', () => {
    const versions = del(setMode(MENU_START, 'on'), 'menu/dosa.jpg').objects['menu/dosa.jpg']
    const html = renderToStaticMarkup(
      <VersionStack versions={versions} label="history" onRestore={noop} onRemoveMarker={noop} onDeleteVersion={noop} />,
    )
    const text = textOf(html)
    expect(text.indexOf('Delete marker')).toBeLessThan(text.indexOf('Dosa photo'))
    expect(html).toContain('Remove marker</button>')
    expect(html).toContain('Restore</button>')
  })

  it('after the script with versioning off, the menu shows the photos are gone for good', () => {
    const text = textOf(renderToStaticMarkup(<MenuPreview bucket={runScript(MENU_START)} ran onRestore={noop} onRemoveMarker={noop} />))
    expect(text.match(/gone for good/g)).toHaveLength(3)
    expect(text).not.toMatch(/Restore|Remove marker/)
  })

  it('after the script with versioning on, every broken file offers a way back', () => {
    const html = renderToStaticMarkup(
      <MenuPreview bucket={runScript(setMode(MENU_START, 'on'))} ran onRestore={noop} onRemoveMarker={noop} />,
    )
    expect(html.match(/Remove marker<\/button>/g)).toHaveLength(2)
    expect(html.match(/Restore<\/button>/g)).toHaveLength(3)
    expect(textOf(html)).not.toMatch(/gone for good/)
  })

  it('says what the run did', () => {
    expect(runMessage(runScript(MENU_START))).toMatch(/off.*gone for good/)
    expect(runMessage(runScript(setMode(setMode(MENU_START, 'on'), 'suspended')))).toMatch(/gone for good/)
    expect(runMessage(runScript(setMode(MENU_START, 'on')))).toMatch(/restore/i)
  })

  it('keeps challenge feedback to one sentence each, with the agreed hint', () => {
    const hint = textOf(renderToStaticMarkup(<>{HINT}</>))
    // Helps both stuck paths: versioning was off, or it was on but the restore step is unclear.
    expect(hint).toBe(
      'Turn versioning on before the script runs (Reset first), then use Restore or Remove marker on each broken file.',
    )
    expect(sentences(hint)).toBe(1)
    expect(sentences(textOf(renderToStaticMarkup(<>{SUCCESS_NOTE}</>)))).toBe(1)
    expect(sentences(textOf(renderToStaticMarkup(<>{GOAL}</>)))).toBeLessThanOrEqual(1)
    expect(sentences(runMessage(runScript(MENU_START)))).toBe(1)
    expect(sentences(runMessage(runScript(setMode(MENU_START, 'on'))))).toBe(1)
  })

  it('starts the challenge with versioning off and the menu intact', () => {
    const html = renderToStaticMarkup(<InternScript />)
    expect(radio(html, 'off')).toMatch(/checked/)
    expect(textOf(html).match(/as before/g)).toHaveLength(3)
  })

  it('offers Check the menu as the second main action, unavailable until the script has run', () => {
    const html = renderToStaticMarkup(<InternScript />)
    const check = /<button[^>]*>(?:(?!<\/button>)[\s\S])*Check the menu<\/button>/.exec(html)?.[0] ?? ''
    expect(check).not.toBe('')
    expect(check).toMatch(/aria-disabled="true"/)
  })

  it('ends with the file store at step 4', () => {
    expect(renderToStaticMarkup(<Lesson />)).toMatch(/Versioning on/)
  })
})
