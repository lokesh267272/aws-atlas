import { Callout, Explain, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { FileStoreDiagram } from '../../FileStoreDiagram'
import { s3Story } from '../../story'
import { FileHistory } from './FileHistory'
import { InternScript } from './InternScript'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {s3Story.appName}&apos;s new intern is about to run a script that blanks one menu photo and deletes two more. Those
          dish photos can&apos;t be made again without a new photo shoot, so the menu needs an undo button.
        </p>
      </Prose>

      <Section title="A photo's history">
        <Explain>
          <p>
            <Term k="versioning">Versioning</Term> is like an undo history for every file in a <Term k="bucket">bucket</Term>.
            It is off by default, so an overwrite or a delete is permanent. Turn it on and <Term k="s3">S3</Term> keeps every
            older version, each with its own <Term k="version-id">version ID</Term>, and a delete only hides the file behind a{' '}
            <Term k="delete-marker">delete marker</Term>. Once on, it can be suspended (paused), but never turned off again.
          </p>
        </Explain>
        <FileHistory />
      </Section>

      <Section title="The intern's bad script">
        <InternScript />
        <Callout kind="real-aws">
          <p>
            <Term k="object-lock">S3 Object Lock</Term> can block deleting a version for a set time (in compliance mode, not even the root user can), and{' '}
            <Term k="mfa-delete">MFA delete</Term> asks for a code before a version is deleted for good or versioning is changed.
          </p>
        </Callout>
      </Section>

      <FileStoreDiagram step={4} />
    </>
  )
}
