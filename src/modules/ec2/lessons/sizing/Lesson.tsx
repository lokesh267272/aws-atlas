import { Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'

/** Stub: replaced by the real lesson in a later task. */
export default function Lesson() {
  return (
    <>
      <Prose>
        <p>Different jobs need different amounts of power, so you will choose an <Term k="instance">instance</Term> type for each.</p>
      </Prose>
      <Section title="Pick the right size">
        <SetupDiagram step={2} />
      </Section>
    </>
  )
}
