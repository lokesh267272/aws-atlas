import { Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'

/** Stub: replaced by the real lesson in a later task. */
export default function Lesson() {
  return (
    <>
      <Prose>
        <p>Your delivery app needs a home, so you will rent an <Term k="ec2">EC2</Term> <Term k="instance">instance</Term> and put it online.</p>
      </Prose>
      <Section title="Rent and launch a server">
        <SetupDiagram step={1} />
      </Section>
    </>
  )
}
