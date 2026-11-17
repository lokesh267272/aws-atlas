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
            A <Term k="lifecycle-rule">lifecycle rule</Term> is a filing clerk with a calendar: after 30 days, move these
            files to a cheaper shelf; after 7 years, throw them out. Each rule picks files by <Term k="prefix">prefix</Term>,
            such as receipts/. Moves are <Term k="transition-action">transition actions</Term>; deletes are{' '}
            <Term k="expiration-action">expiration actions</Term>. With <Term k="versioning">versioning</Term> on, expiring a
            file only hides it and the old copy is still billed, so delete{' '}
            <Term k="noncurrent-version">old versions</Term> too.
          </p>
        </Explain>
        <RuleBuilder rules={rules} onChange={setRules} />
      </Section>

      <Section title="Seven years in a few seconds">
        <Explain>
          <p>
            Most cheaper shelves have a <Term k="minimum-storage-duration">minimum storage duration</Term>, from 30 to 180
            days. Move or delete a file sooner and you still pay for the whole minimum, like leaving a phone contract early.
            One rule also can&apos;t move files off a shelf it moved them to until that minimum is up. Each shelf shows its
            minimum, and the bill shows early charges on their own line.
          </p>
        </Explain>
        <Calendar rules={rules} onRules={setRules} />
      </Section>

      <FileStoreDiagram step={5} />
    </>
  )
}
