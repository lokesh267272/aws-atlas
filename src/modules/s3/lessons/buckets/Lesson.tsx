import { Explain, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { FileStoreDiagram } from '../../FileStoreDiagram'
import { s3Story } from '../../story'
import { BucketMaker } from './BucketMaker'
import { CopiesView } from './CopiesView'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {s3Story.appName}&apos;s servers are running, but its dish photos, receipts and delivery photos need one safe
          place to live. You&apos;ll make that place in <Term k="s3">Amazon S3</Term> and stock the menu.
        </p>
      </Prose>

      <Section title="Make a bucket and fill it">
        <Explain>
          <p>
            <Term k="s3">Amazon S3</Term> is like a huge cupboard that AWS looks after for you. A{' '}
            <Term k="bucket">bucket</Term> is one named cupboard in one <Term k="region">Region</Term>, and its name is{' '}
            <Term k="globally-unique-name">unique across all AWS accounts</Term>. Each file you put in it is an{' '}
            <Term k="object">object</Term>, found by its full name, the <Term k="object-key">key</Term>. Names like{' '}
            <span className="font-mono text-sm">menu/dosa.jpg</span> look like folders, but{' '}
            <span className="font-mono text-sm">menu/</span> is just <Term k="prefix">the start of the key</Term>.
          </p>
        </Explain>
        <BucketMaker />
      </Section>

      <Section title="Where your file really lives">
        <Explain>
          <p>
            When you upload a file, <Term k="s3-standard">S3 Standard</Term> stores copies on several devices in at least
            three <Term k="availability-zone">Availability Zones</Term>. It&apos;s like leaving copies of a family photo
            with relatives in three parts of the city: one house fire can&apos;t take them all. An{' '}
            <Term k="ebs-volume">EBS volume</Term> from Module 2 lives in just one zone, so if that zone goes out, you
            can&apos;t read it.
          </p>
        </Explain>
        <CopiesView />
      </Section>

      <FileStoreDiagram step={1} />
    </>
  )
}
