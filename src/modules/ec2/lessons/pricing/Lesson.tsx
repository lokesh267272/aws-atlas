import { Callout, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'
import { story } from '../../story'
import { DemandPlanner } from './DemandPlanner'
import { LifecycleMeter } from './LifecycleMeter'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {story.appName} pays for every second its <Term k="instance">servers</Term> run, so you will find the cheapest
          way to pay for each part of its day without losing an order.
        </p>
      </Prose>

      <Section title="Pay only while it runs">
        <LifecycleMeter />
      </Section>

      <Section title="Three ways to pay">
        <DemandPlanner />
        <Callout kind="real-aws">
          <p>
            A real <Term k="savings-plan">Savings Plan</Term> is a promise to spend a set amount per hour for 1 or 3
            years, and <Term k="reserved-instance">Reserved Instances</Term> are the older way to commit.
          </p>
        </Callout>
        <SetupDiagram step={5} />
      </Section>
    </>
  )
}
