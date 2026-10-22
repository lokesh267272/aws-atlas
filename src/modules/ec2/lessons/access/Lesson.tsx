import { Bench, Callout, Prose, Section } from '../../../../components/lesson'
import { Term } from '../../../../components/Term'
import { SetupDiagram } from '../../SetupDiagram'
import { story } from '../../story'
import { AccessChallenge } from './AccessChallenge'
import { NEW_GROUP_RULES } from './accessModel'
import { KeyPairDemo } from './KeyPairDemo'
import { RoleVsKey } from './RoleVsKey'
import { TrafficGate, useGate } from './TrafficGate'

export default function Lesson() {
  return (
    <>
      <Prose>
        <p>
          {story.appName}’s <Term k="instance">server</Term> is running, so now you choose who can reach it and how the app reads its menu
          photos from <Term k="s3">S3</Term>.
        </p>
      </Prose>

      <Section title="A gate around the server">
        <GateBench />
        <Callout kind="real-aws">
          <p>
            <Term k="security-group">Security group</Term> rule changes apply automatically to every instance using that group, with no
            restart.
          </p>
        </Callout>
      </Section>

      <Section title="A key to log in">
        <KeyPairDemo />
      </Section>

      <Section title="Photos without a stored key">
        <RoleVsKey />
      </Section>

      <Section title="Challenge: lock it down">
        <AccessChallenge />
      </Section>

      <SetupDiagram step={4} />
    </>
  )
}

/** Free play: a new security group, Start traffic, and a rule builder. */
function GateBench() {
  const gate = useGate(NEW_GROUP_RULES)
  return (
    <Bench
      title="Try it: open only the doors you need"
      intro={
        <>
          Press Start traffic, add <Term k="sg-inbound-rule">inbound rules</Term> to let requests through, then switch off outbound and see
          what replies do.
        </>
      }
      onReset={gate.reset}
    >
      <TrafficGate gate={gate} onStart={gate.start} outboundToggle />
    </Bench>
  )
}
