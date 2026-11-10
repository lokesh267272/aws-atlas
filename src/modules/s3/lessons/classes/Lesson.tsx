import { Callout, Explain, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { FileStoreDiagram } from '../../FileStoreDiagram'
import { s3Story } from '../../story'
import { MonthBoard } from './MonthBoard'
import { Shelves } from './Shelves'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {s3Story.appName} pays every month to keep its files in <Term k="s3">S3</Term>, and some are read all day while
          others almost never. You&apos;ll put each kind of file on the shelf that costs least but still works.
        </p>
      </Prose>

      <Section title="Seven shelves">
        <Explain>
          <p>
            Think of a restaurant&apos;s storage: space at the front counter costs the most, the basement is cheaper, and a
            warehouse across town is cheapest but a slow trip away. <Term k="s3">S3</Term> has shelves like these, called{' '}
            <Term k="storage-class">storage classes</Term>. Shelves further back cost less each month, but charge a{' '}
            <Term k="retrieval-fee">fee to fetch</Term> a file, or make you wait. One shelf even keeps it in a single{' '}
            <Term k="availability-zone">Availability Zone</Term>.
          </p>
        </Explain>
        <Shelves />
      </Section>

      <Section title="A month of files">
        <Explain>
          <p>
            Every shelf has two prices: one to keep a file each month, and one to fetch it. It&apos;s like a gym: a monthly
            pass pays off if you go daily, and pay-per-visit wins if you rarely go. Pick by how often a file is read and how
            soon it&apos;s needed. <Term k="s3-one-zone-ia">One Zone-IA</Term> keeps files in just one{' '}
            <Term k="availability-zone">AZ</Term>, so use it only for files you can make again.
          </p>
        </Explain>
        <MonthBoard />
        <Callout kind="real-aws">
          <p>
            If the <Term k="availability-zone">AZ</Term> holding <Term k="s3-one-zone-ia">One Zone-IA</Term> files is only
            down for a while, they can&apos;t be read until it&apos;s back; they are lost only if the AZ is destroyed, for
            example by a fire or flood.
          </p>
        </Callout>
      </Section>

      <FileStoreDiagram step={3} />
    </>
  )
}
