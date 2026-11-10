import { useState } from 'react'
import { Explain, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { FileStoreDiagram } from '../../FileStoreDiagram'
import { s3Story } from '../../story'
import { Calendar, START_RULES } from './Calendar'
import { RuleBuilder } from './RuleBuilder'
import type { Rule } from './lifecycleModel'

export default function Lesson() {
  // One set of rules: written on the cards, run on the calendar.
  const [rules, setRules] = useState<Rule[]>(START_RULES)
  return (
    <>
      <Prose>
        <p>
          {s3Story.appName}&apos;s accountant wants receipts kept 7 years, but delivery photos and backups are useless after
          30 days. Write rules that tidy the <Term k="bucket">bucket</Term> on a schedule, so 7 years of files stay cheap.
        </p>
      </Prose>

      <Section title="A rule for each kind of file">
        <Explain>
          <p>
            A <Term k="lifecycle-rule">lifecycle rule</Term> works like a filing clerk with a calendar: after 30 days, move
            these files to a cheaper shelf; after a year, archive them; after 7 years, throw them out. Each rule picks files by{' '}
            <Term k="prefix">prefix</Term>, such as receipts/. <Term k="transition-action">Transition actions</Term> move
            files down the shelves and <Term k="expiration-action">expiration actions</Term> delete them. With{' '}
            <Term k="versioning">versioning</Term> on, an expired file just becomes an{' '}
            <Term k="noncurrent-version">old version</Term>, so delete those too.
          </p>
        </Explain>
        <RuleBuilder rules={rules} onChange={setRules} />
      </Section>

      <Section title="Seven years in a few seconds">
        <Explain>
          <p>
            Most cheaper shelves have a <Term k="minimum-storage-duration">minimum storage duration</Term>, from 30 to 180
            days. Move or delete a file sooner and you still pay for the whole minimum, like leaving a phone contract early.
            Rules also can&apos;t move files to <Term k="s3-standard-ia">Standard-IA</Term> or{' '}
            <Term k="s3-one-zone-ia">One Zone-IA</Term> until they&apos;re 30 days old. Each shelf shows its minimum, and
            the bill shows early charges on their own line.
          </p>
        </Explain>
        <Calendar rules={rules} onRules={setRules} />
      </Section>

      <FileStoreDiagram step={5} />
    </>
  )
}
