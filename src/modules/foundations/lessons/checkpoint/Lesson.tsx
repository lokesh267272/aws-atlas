import { useState } from 'react'
import { AwsMap } from '../../../../components/AwsMap'
import { Bench, Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { Flashcards } from './Flashcards'
import { MapBuilder } from './MapBuilder'
import { Quiz } from './Quiz'

export default function Lesson() {
  // Changing a key remounts that simulation, which is how each Reset works.
  const [mapKey, setMapKey] = useState(0)
  const [quizKey, setQuizKey] = useState(0)
  const [cardsKey, setCardsKey] = useState(0)

  return (
    <>
      <Section title="The whole picture: where every piece lives">
        <Prose>
          <p>
            Picture your first day on a team that runs an online bakery on AWS. Your new manager hands you a marker and
            asks two questions: where does our shop actually run, and who is allowed to change it? After this module you
            can answer both, so let’s put the answers together.
          </p>
          <p>The whole module fits into three ideas:</p>
          <ul>
            <li>
              <strong>You rent, you don’t buy.</strong> <Term k="cloud-computing">Cloud computing</Term> means renting
              computers and storage and paying for what you use. Under the{' '}
              <Term k="shared-responsibility">shared responsibility model</Term>, AWS secures the buildings, hardware,
              network and the software that runs its services. You secure what you put in the cloud: your data, settings
              and users, plus the operating system and software on any server you rent.
            </li>
            <li>
              <strong>AWS is a map of places inside places.</strong> The AWS Cloud is made of{' '}
              <Term k="region">Regions</Term>, geographic areas such as Frankfurt. Each Region holds at least three{' '}
              <Term k="availability-zone">Availability Zones</Term>, and each Availability Zone is one or more{' '}
              <Term k="data-center">data centers</Term>. <Term k="edge-location">Edge locations</Term> sit outside
              Regions, in cities close to your users, where services such as <Term k="cloudfront">CloudFront</Term> and{' '}
              <Term k="route-53">Route 53</Term> answer them quickly.
            </li>
            <li>
              <strong>IAM decides who may do what.</strong> Everything you create lives in your{' '}
              <Term k="aws-account">AWS account</Term>. <Term k="iam">IAM</Term> controls who can sign in and what they
              may do, using <Term k="iam-user">users</Term>, <Term k="iam-group">groups</Term>,{' '}
              <Term k="iam-role">roles</Term> and <Term k="policy">policies</Term>.
            </li>
          </ul>
          <p>
            Now rebuild the map from memory. The boxes below are empty, but their nesting is real: a box drawn inside
            another box lives inside it.
          </p>
        </Prose>

        <Bench
          title="Try it: rebuild the map"
          intro={
            <>
              Choose a piece, then choose the empty box where it belongs. With a keyboard, press Tab to reach a piece,
              Enter to pick it up, then Tab to a box and Enter to place it. You can also drag pieces with a mouse.
              Notice which pieces sit inside a Region and which do not.
            </>
          }
          onReset={() => setMapKey((k) => k + 1)}
        >
          <MapBuilder key={mapKey} />
        </Bench>

        <Prose>
          <p>
            Two pieces live outside every Region, for different reasons. Edge locations are real sites in many
            cities, placed close to users so that answers travel a short distance. IAM is a{' '}
            <Term k="global-service">global service</Term>: there is one set of users, roles and policies for your whole
            account, and it applies in every Region.
          </p>
          <p>
            Here is the course map again. The bright service is IAM, the one this module covered. You now know every
            place on it except the <Term k="vpc">VPC</Term>, your private network, which comes in a later module. One
            simplification: a real VPC stretches across all the Availability Zones of its Region, and the map draws two
            zones inside it only to show where servers sit. The faded services come later too. Select a service, or the
            label of a place such as Region, to read about it.
          </p>
        </Prose>

        <div className="my-6">
          <AwsMap focusModuleId="foundations" />
        </div>

        <Callout kind="remember">
          A box inside a box means “lives inside”. When you meet a new service, ask where it lives: in one Availability
          Zone, in a whole Region, at the edge, or globally. That one question tells you a lot about how it fails and
          how you protect it.
        </Callout>
      </Section>

      <Section title="Test yourself on the whole module">
        <Prose>
          <p>
            Twelve questions cover every lesson, one at a time. Some are plain multiple choice. Others give you a short
            situation, a small <Term k="json">JSON</Term> policy to read, or an <Term k="arn">ARN</Term> (the address
            AWS gives every resource) to take apart.
          </p>
          <p>
            Some questions mention <Term k="ec2">EC2</Term>, the service for renting virtual servers, and{' '}
            <Term k="s3">S3</Term>, which stores files in <Term k="bucket">buckets</Term>. You see the answer and a short
            explanation straight away. At the end, every question you missed links back to the lesson that teaches it.
          </p>
        </Prose>

        <Bench
          title="Try it: the module quiz"
          intro="Pick an answer, then read the explanation, even when you are right: it often adds a useful detail. Reset starts a fresh attempt."
          onReset={() => setQuizKey((k) => k + 1)}
        >
          <Quiz key={quizKey} />
        </Bench>

        <Prose>
          <p>
            Look back at the two policy questions. They are the same rule seen from two sides: for IAM users and roles,
            AWS denies everything by default (an <Term k="implicit-deny">implicit deny</Term>), an Allow opens one
            specific door, and an <Term k="explicit-deny">explicit deny</Term> closes it again, whatever else says Allow.
          </p>
        </Prose>
      </Section>

      <Section title="Flip through the key terms">
        <Prose>
          <p>
            Sixteen words carry most of this module. Before you flip each card, say the definition to yourself. Pulling
            an idea out of memory makes it stick far better than reading it again.
          </p>
        </Prose>

        <Bench
          title="Try it: flashcards for Module 1"
          intro="Select a card to flip it. Mark the ones you know, then turn on the filter to practice only the rest. Shuffle when the order starts to feel familiar."
          onReset={() => setCardsKey((k) => k + 1)}
        >
          <Flashcards key={cardsKey} />
        </Bench>

        <Callout kind="tip">
          Can’t explain a card in your own words yet? Open the lesson linked under it, try that lesson’s simulation once
          more, and come back to the card afterwards.
        </Callout>
      </Section>

      <Section title="What comes next">
        <Prose>
          <p>
            Everything later in the course sits on this map. When you launch EC2 virtual servers, you will choose the
            Availability Zone each one runs in, and run copies in more than one zone so a failure does not take you down.
            When you store files in S3, you will choose the Region your bucket lives in. And every one of those actions, whether a person or a program makes
            it, passes through IAM, so the policies and roles you practiced here will come back in every module.
          </p>
        </Prose>
      </Section>

      <Takeaways
        items={[
          'The AWS Cloud contains Regions, each Region contains at least three Availability Zones, and each Availability Zone is one or more data centers.',
          'Edge locations sit outside Regions, close to users. IAM is global: one set of users, roles and policies covers every Region of your account.',
          <>
            Choose a Region by what the law requires first (<Term k="compliance">compliance</Term>), then by{' '}
            <Term k="latency">latency</Term>, the services you need and price. Use more than one Availability Zone so
            one failure does not stop you.
          </>,
          <>
            Protect the <Term k="root-user">root user</Term> with <Term k="mfa">MFA</Term> and keep it for rare tasks.
            Give every person and program only the permissions their job needs (
            <Term k="least-privilege">least privilege</Term>).
          </>,
          'AWS denies every request from an IAM user or role by default (the root user is the one exception). An Allow opens a specific door, and an explicit Deny always wins.',
          <>
            Apps and AWS services should use roles, which hand out{' '}
            <Term k="temporary-credentials">temporary credentials</Term>, instead of long-term{' '}
            <Term k="access-key">access keys</Term>.
          </>,
        ]}
      />
    </>
  )
}
