import { Bench, Explain, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { FileStoreDiagram } from '../../FileStoreDiagram'
import { s3Story } from '../../story'
import { NEW_BUCKET } from './accessModel'
import { LinkClock } from './LinkClock'
import { RequestGate, RightPeopleChallenge, useAccessGate } from './RequestGate'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {s3Story.appName}’s <Term k="bucket">bucket</Term> now holds menu photos and every customer’s receipts. The servers must read
          them, and each customer must get only their own receipt, while everyone else stays out.
        </p>
      </Prose>

      <Section title="A locked room">
        <Explain>
          <p>
            A new <Term k="bucket">bucket</Term> is like a locked room: every file starts private, and{' '}
            <Term k="block-public-access">Block Public Access</Term> is on so nobody opens it to the world by mistake. You let people in on
            purpose. {s3Story.appName}’s servers get a pass: an <Term k="identity-based-policy">IAM policy</Term> on their{' '}
            <Term k="iam-role">role</Term> naming the files they may read. A <Term k="bucket-policy">bucket policy</Term> on the door can
            allow or deny, and an <Term k="explicit-deny">explicit deny</Term> always wins.
          </p>
        </Explain>
        <GateBench />
      </Section>

      <Section title="A ticket that expires">
        <Explain>
          <p>
            A <Term k="presigned-url">presigned URL</Term> is like a cinema ticket: whoever holds it gets into one film, and only until the
            show is over. {s3Story.appName}’s servers sign each receipt link with their <Term k="iam-role">role</Term>, so the link works
            only if the role can read that file. A link dies when the <Term k="temporary-credentials">temporary credentials</Term> that
            signed it expire, so these links last at most 6 hours.
          </p>
        </Explain>
        <LinkClock />
      </Section>

      <Section title="Fix the leak">
        <RightPeopleChallenge />
      </Section>

      <FileStoreDiagram step={2} />
    </>
  )
}

/** Free play: a brand-new bucket, Send requests, and every switch. */
function GateBench() {
  const gate = useAccessGate(NEW_BUCKET)
  return (
    <Bench
      title="Try it: let the right requests in"
      intro="Press Send requests, flip one switch at a time, and watch which requests get in, bounce or leak."
      onReset={gate.reset}
    >
      <RequestGate gate={gate} onSend={gate.send} />
    </Bench>
  )
}
