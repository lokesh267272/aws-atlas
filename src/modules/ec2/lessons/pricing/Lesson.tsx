import { Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'

/** Stub: replaced by the real lesson in a later task. */
export default function Lesson() {
  return (
    <>
      <Prose>
        <p>The same <Term k="instance">instance</Term> can cost very different amounts, so you will match each job to a price plan.</p>
      </Prose>
      <Section title="Pay less">
        <SetupDiagram step={5} />
      </Section>
    </>
  )
}
