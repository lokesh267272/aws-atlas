import { Callout, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'
import { story } from '../../story'
import { FamilyShapes } from './FamilyShapes'
import { NameDecoder } from './NameDecoder'
import { SizingChallenge } from './SizingChallenge'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {story.appName} runs three jobs with very different needs, so you will pick the right{' '}
          <Term k="instance-type">instance type</Term> for each one.
        </p>
      </Prose>

      <Section title="Read the name">
        <NameDecoder />
      </Section>

      <Section title="Families have shapes">
        <FamilyShapes />
      </Section>

      <Section title="Size three jobs">
        <SizingChallenge />
        <Callout kind="real-aws">
          <p>
            You can usually resize later: stop the <Term k="instance">instance</Term>, choose a new{' '}
            <Term k="instance-type">instance type</Term> with the same kind of processor, then start it again.
          </p>
        </Callout>
      </Section>

      <SetupDiagram step={2} />
    </>
  )
}
