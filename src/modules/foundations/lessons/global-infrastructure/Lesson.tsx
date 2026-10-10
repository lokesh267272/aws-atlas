import { Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { Readout } from '../../../../components/controls'
import { Checkpoint } from '../../../../components/Checkpoint'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { GlobeExplorer } from './GlobeExplorer'
import { PhotoTrip } from './PhotoTrip'
import { RegionCodeLab } from './RegionCodeLab'
import { ZoomExplorer } from './ZoomExplorer'
import { headline } from './regions'

function Totals() {
  return (
    <figure className="my-6 rounded-lg border border-line bg-panel px-5 py-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Readout label="Regions" value={headline.regions} />
        <Readout label="Availability Zones" value={headline.azs} />
        <Readout label="CloudFront points of presence" value={headline.cloudFrontPops} />
        <Readout label="Regions announced" value={headline.announcedRegions} hint={headline.announcedWhere} />
      </div>
      <figcaption className="mt-3 text-sm text-ink-3">
        As of {headline.asOf}, per aws.amazon.com. The {headline.regions} includes 5 Regions that need a special kind of account
        (explained below the globe); the globe shows the 34 that any standard account can use. AWS adds Regions and zones every
        year, so these numbers keep growing.
      </figcaption>
    </figure>
  )
}

export default function Lesson() {
  return (
    <>
      <Section title="The cloud is made of real buildings">
        <Prose>
          <p>
            You open a photo app and tap a picture a friend shared. A moment later it appears. In that moment, your request left your
            phone, travelled through cables to a building full of computers, and came back carrying the photo.
          </p>
          <p>
            That building is a <Term k="data-center">data center</Term>. <Term k="cloud-computing">The cloud</Term> is
            buildings like this one, filled with <Term k="server">servers</Term> that you rent over the internet. It is not in
            the sky. It sits on real land, in real cities.
          </p>
          <p>
            Where those buildings are matters, because nothing travels faster than light. Internet traffic travels as light through
            glass <Term k="fibre-optic">fibre-optic cables</Term>, and in glass, light covers about 200 km every{' '}
            <Term k="millisecond">millisecond</Term>. The wait between asking and getting an answer is called{' '}
            <Term k="latency">latency</Term>. The farther away the building, the longer you wait.
          </p>
          <p>
            AWS has groups of data centers in many parts of the world. Each group is called a{' '}
            <Term k="region">Region</Term>, and you will look at them closely in the next section. For now, try storing a photo
            in different Regions and see how long it takes to fetch.
          </p>
        </Prose>

        <PhotoTrip />

        <Prose>
          <p>
            What you just saw: distance turns directly into waiting time. A request to the other side of the planet and back
            takes more than a tenth of a second, even at the speed of light, while a building in your own city answers almost
            instantly. That is why AWS builds data centers all over the world, and why one of your first choices on AWS is where
            your things should live.
          </p>
        </Prose>
      </Section>

      <Section title="Regions: where AWS builds on the map">
        <Prose>
          <p>
            A <strong>Region</strong> is a geographic area, such as Northern Virginia, Frankfurt or Tokyo, where AWS runs a
            cluster of data centers. For most things you create on AWS, such as a store for files or a server, you first choose
            the Region it lives in. A few services, such as <Term k="iam">IAM</Term> (who can do what in your account), are{' '}
            <Term k="global-service">global</Term> instead.
          </p>
          <p>Two rules make Regions useful:</p>
          <ul>
            <li>
              <strong>Regions are built to be isolated and independent.</strong> A problem in one Region is designed to stay in that
              Region, so the rest of the world keeps working. (Simplified: a few global services, such as IAM, are managed from one
              Region, so a problem there can affect changes to them everywhere.)
            </li>
            <li>
              <strong>What you create in a Region stays there.</strong> Files you store in Frankfurt do not appear in Tokyo unless you
              copy them yourself or switch on a feature that copies them.
            </li>
          </ul>
          <p>Here is how big the AWS map is today:</p>
        </Prose>

        <Totals />

        <GlobeExplorer />

        <Prose>
          <p>
            What to notice: Regions cluster where many people and businesses are, in North America, Europe and Asia. Some large
            areas have only one: South America has São Paulo (a Region in Chile has been announced), and Africa has Cape Town.
            Each Region has a short code, such as <code>us-east-1</code>. You will learn to read these codes at the end of this
            lesson.
          </p>
        </Prose>

        <Callout kind="real-aws">
          <p>
            The globe shows the 34 Regions any standard AWS account can use. The headline total also counts Regions in separate{' '}
            <Term k="partition">partitions</Term>, which need their own kind of account: AWS GovCloud (US) for US government work,
            the two China Regions (Beijing and Ningxia), and the AWS European Sovereign Cloud in Germany.
          </p>
          <p>
            Also, Regions launched after 20 March 2019 are <Term k="opt-in-region">opt-in Regions</Term>: they stay switched off
            in a new account until you turn them on.
          </p>
        </Callout>

        <Checkpoint
          question="You store your customers’ photos in eu-west-2 (London) and change nothing else. Where do copies of those photos exist?"
          options={[
            'In every AWS Region, automatically',
            'In London and in us-east-1, as an automatic backup',
            'Only in the London Region',
            'In every edge location, permanently',
          ]}
          answer={2}
          explanation={
            <>
              Data stays in the Region where you put it. It does not appear in any other Region unless you switch on a feature
              that copies it there, or copy it yourself.
            </>
          }
        />
      </Section>

      <Section title="Inside a Region: Availability Zones and data centers">
        <Prose>
          <p>
            Zoom into a Region and you find several Availability Zones. An{' '}
            <Term k="availability-zone">Availability Zone</Term> (AZ for short) is one or more separate data centers with{' '}
            <Term k="redundancy">redundant</Term> power, networking and connections. Redundant means there is a spare, so one
            broken part does not stop the whole thing.
          </p>
          <p>
            Every Region has at least three AZs, although in a few older Regions a new account can use only some of them (two in
            N. California). AWS builds them many kilometres apart, so a flood, fire or power cut is unlikely to
            hit two at once. They are still close enough to work as a team: all AZs in a Region are within 100 km (60 miles) of each
            other, linked by fast, private, redundant fibre.
          </p>
          <h3>The whole hierarchy, biggest to smallest</h3>
          <ul>
            <li>
              <strong>AWS global network:</strong> every Region and edge location, joined by AWS’s own private network.
            </li>
            <li>
              <strong>Region:</strong> a geographic area. Isolated from other Regions. You choose it.
            </li>
            <li>
              <strong>Availability Zone:</strong> one or more data centers inside a Region, with their own power, cooling and
              network.
            </li>
            <li>
              <strong>Data center:</strong> one building full of <Term k="rack">racks</Term> of servers.
            </li>
          </ul>
        </Prose>

        <Callout kind="analogy">
          <p>
            Think of a Region as a city, and each AZ as a separate neighbourhood with its own power station and water supply. If one
            neighbourhood loses power, the others keep their lights on. The data centers are the buildings in each neighbourhood.
          </p>
        </Callout>

        <ZoomExplorer />

        <Prose>
          <p>
            Why this matters: if your app runs in one AZ and that AZ has a problem, your app stops. If you run copies in two or three
            AZs of the same Region, it keeps working. You will try exactly this in the{' '}
            <a href={href.lesson('foundations', 'regions-and-resilience')}>next lesson</a>.
          </p>
        </Prose>

        <Callout kind="real-aws" title="In real AWS: AZ names and AZ IDs">
          <p>
            In your account you see AZ names such as <code>us-east-1a</code>: the Region code plus a letter. Each AZ also has an{' '}
            <Term k="az-id">AZ ID</Term>, such as <code>use1-az1</code>, which means the same physical place in every account.
          </p>
          <p>
            In a few of the oldest Regions, AWS matched names to AZs separately for each account (for accounts created before
            November 2025). So your <code>us-east-1a</code> might be a different physical AZ from a colleague’s{' '}
            <code>us-east-1a</code>. When two accounts need to agree on a place, compare AZ IDs.
          </p>
        </Callout>

        <Checkpoint
          question="Which list goes from the biggest container to the smallest?"
          options={[
            'Region, then Availability Zone, then data center',
            'Availability Zone, then Region, then data center',
            'Region, then data center, then Availability Zone',
            'Data center, then Availability Zone, then Region',
          ]}
          answer={0}
          explanation={
            <>
              A Region contains at least three Availability Zones, and each AZ is made of one or more data centers. An AZ is never
              bigger than a Region, and a data center belongs to exactly one AZ.
            </>
          }
        />
      </Section>

      <Section title="Edge locations: AWS in your city">
        <Prose>
          <p>
            There are only a few dozen Regions, but your users live everywhere. To get closer to them, AWS also runs hundreds of
            smaller sites called <Term k="edge-location">edge locations</Term>, also known as{' '}
            <Term k="point-of-presence">points of presence (PoPs)</Term>. Edge locations do not run your main app. They do a few
            quick jobs very close to the people using it:
          </p>
          <ul>
            <li>
              <Term k="cloudfront">Amazon CloudFront</Term>, AWS’s <Term k="cdn">content delivery network</Term>, keeps copies
              (a cache) of your images, videos and web pages. When the second person in Paris asks for a photo, the nearby copy
              answers instead of the faraway Region.
            </li>
            <li>
              <Term k="route-53">Amazon Route 53</Term> answers <Term k="dns">DNS</Term> lookups: the “phone book” step that turns
              a name like example.com into the address of a server.
            </li>
          </ul>
          <p>
            An edge location is small and does a narrow job, so AWS can put one in far more cities than a full Region.
            CloudFront’s edge network has more than 750 points of presence in over 100 cities across more than 50 countries (as of
            October 2026, per aws.amazon.com), and Route 53 answers from many of the same sites. To see a sample, switch on edge
            locations on the globe above.
          </p>
          <h3>Extensions you will meet later</h3>
          <p>A few more kinds of AWS sites stretch a Region closer to where they are needed. You only need their names for now:</p>
          <ul>
            <li>
              <Term k="local-zone">Local Zones</Term> put AWS servers, storage, databases and some other services close to
              large cities and industry centres.
            </li>
            <li>
              <Term k="wavelength-zone">Wavelength Zones</Term> put AWS servers and storage at the edge of telecom companies’
              networks, close to mobile phone users.
            </li>
            <li>
              <Term k="aws-outposts">AWS Outposts</Term> brings AWS hardware and services into your own building, managed by AWS.
            </li>
          </ul>
        </Prose>

        <Checkpoint
          question="Why does AWS have hundreds of edge locations but only a few dozen Regions?"
          options={[
            'Edge locations are spare Regions that take over when a Region fails',
            'Edge locations are where you launch your main servers and databases',
            'Edge locations are cheaper, smaller versions of Availability Zones that you rent',
            'Edge locations are small sites with a few narrow jobs, so they fit in many more cities',
          ]}
          answer={3}
          explanation={
            <>
              Edge locations do a few narrow jobs, such as CloudFront caching and Route 53 DNS answers, close to users. Your servers
              and databases live in a Region’s Availability Zones. Edge locations are not backups for Regions.
            </>
          }
        />
      </Section>

      <Section title="How to read a Region code">
        <Prose>
          <p>
            In the <Term k="management-console">AWS Management Console</Term> you see friendly names such as US East (N.
            Virginia). On the <Term k="cli">command line</Term> and in code you use the{' '}
            <Term k="region-code">Region code</Term> instead: <code>us-east-1</code>. Every Region code in a standard AWS account
            has the same three parts: an area, a rough direction inside that area, and a number.
          </p>
        </Prose>

        <RegionCodeLab />

        <Prose>
          <p>
            The number only tells Regions with the same area and direction apart. <code>us-east-2</code> is not bigger or
            better than <code>us-east-1</code>; it is simply a different place (Ohio instead of Northern Virginia). Add a letter and you
            get an Availability Zone name, such as <code>us-east-1a</code>. You will type these codes often, for example{' '}
            <code>aws ec2 describe-availability-zones --region us-east-2</code> shows the AZs in Ohio.
          </p>
        </Prose>

        <Checkpoint
          question="What does the 2 in eu-west-2 tell you?"
          options={[
            'It is the second Availability Zone of eu-west-1',
            'It is a different Region from eu-west-1, in roughly the same part of Europe',
            'The Region has two Availability Zones',
            'The Region is twice as fast as eu-west-1',
          ]}
          answer={1}
          explanation={
            <>
              eu-west-2 is London and eu-west-1 is Ireland: two separate Regions. The number just tells them apart. AZs are named
              with a letter on the end (eu-west-2a), and every Region has at least three of them.
            </>
          }
        />

        <Takeaways
          items={[
            'The cloud is real buildings. Distance adds delay, so where your app runs affects how fast it feels.',
            'The hierarchy: the AWS global network contains Regions, each Region contains at least three Availability Zones, and each AZ is one or more data centers.',
            'Regions are built to be isolated from each other. What you create in a Region stays there unless you copy it.',
            'AZs in a Region have their own power and networking, sit many kilometres apart (within 100 km), and are linked by fast private fibre. Running in several AZs protects you from one failing.',
            'Edge locations, used by services such as CloudFront and Route 53, sit in more than 100 cities near users. They cache content and answer DNS; your main app lives in a Region.',
            'A Region code is area-direction-number, such as us-east-1. Add a letter for an AZ name, such as us-east-1a.',
          ]}
        />
      </Section>
    </>
  )
}
