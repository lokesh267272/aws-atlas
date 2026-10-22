import { Callout, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'
import { story } from '../../story'
import { DiskLab } from './DiskLab'
import { SnapshotChallenge } from './SnapshotChallenge'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {story.appName} saves every order on a disk, and the orders must outlive a{' '}
          <Term k="instance">server</Term> that is stopped, replaced or broken.
        </p>
      </Prose>

      <Section title="Which disks remember">
        <DiskLab />
      </Section>

      <Section title="Keep every order">
        <SnapshotChallenge />
        <Callout kind="real-aws">
          <p>
            AWS doesn&apos;t back up your volumes unless you ask, but{' '}
            <Term k="data-lifecycle-manager">Amazon Data Lifecycle Manager</Term> can take{' '}
            <Term k="ebs-snapshot">snapshots</Term> on a schedule, such as every night after closing.
          </p>
        </Callout>
      </Section>

      <SetupDiagram step={3} />
    </>
  )
}
