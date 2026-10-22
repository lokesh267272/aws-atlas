import { Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'

/** Stub: replaced by the real lesson in a later task. */
export default function Lesson() {
  return (
    <>
      <Prose>
        <p>Not everyone should reach your server, so you will set a <Term k="security-group">security group</Term> and an <Term k="instance-profile">instance profile</Term>.</p>
      </Prose>
      <Section title="Who can reach it">
        <SetupDiagram step={4} />
      </Section>
    </>
  )
}
