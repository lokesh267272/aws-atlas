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
          {story.appName}&apos;s menu page needs a <Term k="server">server</Term>, so you will rent an{' '}
          <Term k="ec2">EC2</Term> <Term k="instance">instance</Term>: a slice of a real one.
        </p>
      </Prose>

      <Section title="A slice of a real server">
        <HostExplorer />
      </Section>

      <Section title="Launch your first server">
        <LaunchBuilder />
        <Callout kind="real-aws">
          <p>
            Linux launches get a new <Term k="security-group">security group</Term> that lets in{' '}
            <Term k="ssh">SSH</Term> from anywhere.
          </p>
        </Callout>
      </Section>

      <SetupDiagram step={1} />
    </>
  )
}
