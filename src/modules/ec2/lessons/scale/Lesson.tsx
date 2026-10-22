import { Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'

/** Stub: replaced by the real lesson in a later task. */
export default function Lesson() {
  return (
    <>
      <Prose>
        <p>One server is a single point of failure, so you will add a <Term k="load-balancer">load balancer</Term> and <Term k="auto-scaling">Auto Scaling</Term>.</p>
      </Prose>
      <Section title="Survive and scale">
        <SetupDiagram step={6} />
      </Section>
    </>
  )
}
