import { Explain, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { FileStoreDiagram } from '../../FileStoreDiagram'
import { s3Story } from '../../story'
import { YearRun } from './YearRun'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {s3Story.appName}&apos;s files now need everything from this module at once. Set up the whole{' '}
          <Term k="bucket">bucket</Term>, then run a year with a careless intern, a fire, a nosy bot and a very busy month.
        </p>
      </Prose>

      <Section title="One bucket, one whole year">
        <Explain>
          <p>
            Think of the <Term k="bucket">bucket</Term> as a shop&apos;s storeroom with a guard for each risk.{' '}
            <Term k="block-public-access">Block Public Access</Term> keeps strangers out, the server&apos;s{' '}
            <Term k="iam-role">role</Term> lets the app in, and a <Term k="presigned-url">presigned link</Term> lets one
            customer get one receipt. <Term k="storage-class">Storage classes</Term> keep costs down, and files you can&apos;t
            re-make need copies in 3 or more <Term k="availability-zone">AZs</Term>. <Term k="versioning">Versioning</Term>{' '}
            undoes a bad delete, and <Term k="lifecycle-rule">lifecycle rules</Term> clear out old files on time.
          </p>
        </Explain>
        <YearRun />
      </Section>

      <FileStoreDiagram step={6} />
    </>
  )
}
