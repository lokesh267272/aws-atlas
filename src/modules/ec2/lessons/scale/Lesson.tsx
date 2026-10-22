import { Callout, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'
import { story } from '../../story'
import { BuildItAll } from './BuildItAll'
import { FleetLab } from './FleetLab'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          A lunch rush or one failing <Term k="availability-zone">AZ</Term> would swamp {story.appName}&apos;s single{' '}
          <Term k="instance">server</Term>, so you will spread servers across AZs with a{' '}
          <Term k="load-balancer">load balancer</Term> and <Term k="auto-scaling">Auto Scaling</Term>.
        </p>
      </Prose>

      <Section title="Spread out, heal, grow">
        <FleetLab />
        <Callout kind="real-aws">
          <p>
            A real <Term k="rds">RDS</Term> <Term k="multi-az">Multi-AZ</Term> <Term k="failover">failover</Term>{' '}
            typically takes one to two minutes, so the app retries its orders until the standby answers.
          </p>
        </Callout>
      </Section>

      <Section title="Build it all">
        <BuildItAll />
        <SetupDiagram step={6} />
      </Section>
    </>
  )
}
