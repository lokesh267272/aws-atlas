import { Callout, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'
import { story } from '../../story'
import { HostExplorer } from './HostExplorer'
import { LaunchBuilder } from './LaunchBuilder'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {story.appName}, a food delivery app, needs a <Term k="server">server</Term> for its menu page, so you will
          rent an <Term k="ec2">EC2</Term> <Term k="instance">instance</Term>: a slice of a real server.
        </p>
      </Prose>

      <Section title="A slice of a real server">
        <HostExplorer />
      </Section>

      <Section title="Launch your first instance">
        <LaunchBuilder />
        <Callout kind="real-aws">
          <p>
            The launch page fills in most parts for you, and the <Term k="security-group">security group</Term> it
            creates lets in only <Term k="ssh">SSH</Term>, from anywhere.
          </p>
        </Callout>
        <SetupDiagram step={1} />
      </Section>
    </>
  )
}
