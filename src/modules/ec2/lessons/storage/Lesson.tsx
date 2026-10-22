import { Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'

/** Stub: replaced by the real lesson in a later task. */
export default function Lesson() {
  return (
    <>
      <Prose>
        <p>Servers come and go, so you will learn which disks keep their data and how <Term k="ebs">EBS</Term> backups work.</p>
      </Prose>
      <Section title="Disks that remember">
        <SetupDiagram step={3} />
      </Section>
    </>
  )
}
