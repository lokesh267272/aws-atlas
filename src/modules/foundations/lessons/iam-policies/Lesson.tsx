import type { ReactNode } from 'react'
import { Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { Checkpoint } from '../../../../components/Checkpoint'
import { CodeBlock } from '../../../../components/CodeBlock'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { PolicyAnatomy } from './PolicyAnatomy'
import { ArnExplorer } from './ArnExplorer'
import { WildcardTester } from './WildcardTester'
import { PolicySimulator } from './PolicySimulator'
import { PolicyChallenges } from './PolicyChallenges'

/** Inline code outside Prose (checkpoints, takeaways). Long ARNs may wrap anywhere, so phones never scroll sideways. */
const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded-sm bg-sunken px-1 font-mono text-[0.86em] text-ink [overflow-wrap:anywhere]">{children}</code>
)

/*
  JetBrains Mono turns "::" and ":::" into ligatures, which makes ARNs such as
  arn:aws:s3:::bucket look like they contain spaces. ARNs must be read
  character by character here, so code ligatures are switched off.
*/
const noCodeLigatures =
  "[&_code]:[font-feature-settings:'liga'_0,'calt'_0] [&_.font-mono]:[font-feature-settings:'liga'_0,'calt'_0]"

export default function Lesson() {
  return (
    <div className={noCodeLigatures}>
      <Section title="Read a policy line by line">
        <Prose>
          <p>
            Your company keeps its quarterly reports in an <Term k="s3">Amazon S3</Term> <Term k="bucket">bucket</Term>{' '}
            called <code>example-reports</code>. Priya, a new analyst, needs to open those reports. She must never
            delete one, not even by accident. Your team lead hands you a policy and asks: “Does this do what we want?”
          </p>
          <p>
            A <Term k="policy">policy</Term> is a short document, written in <Term k="json">JSON</Term>, that lists
            permissions. AWS reads the policies attached to Priya every time she tries to do something. To answer your
            team lead, read the policy the way AWS does: one part at a time.
          </p>
          <p>
            Every policy you attach to an <Term k="iam-user">IAM user</Term>, <Term k="iam-group">group</Term> or{' '}
            <Term k="iam-role">role</Term> has the same shape. At the top is a{' '}
            <Term k="policy-version">Version</Term> line. Below it is a list of{' '}
            <Term k="policy-statement">statements</Term>. Each statement is one rule with up to four main parts:
          </p>
          <ul>
            <li>
              <strong>
                <Term k="policy-effect">Effect</Term>
              </strong>
              : <code>Allow</code> or <code>Deny</code>. What happens when the rule matches.
            </li>
            <li>
              <strong>
                <Term k="action">Action</Term>
              </strong>
              : which operations, such as “read a file”.
            </li>
            <li>
              <strong>
                <Term k="resource">Resource</Term>
              </strong>
              : which things, such as one bucket or the files in it.
            </li>
            <li>
              <strong>
                <Term k="condition">Condition</Term>
              </strong>{' '}
              (optional): an extra test, such as “only after signing in with <Term k="mfa">MFA</Term>”.
            </li>
          </ul>
          <p>
            Policies attached to a resource instead, such as an S3 bucket policy, add one more part,{' '}
            <Term k="principal">Principal</Term>, which names who the rule is for. You will meet those later.
          </p>
        </Prose>

        <PolicyAnatomy />

        <Prose>
          <p>
            So, does the policy do what your team lead wanted? Yes. Priya can list the bucket and read every report.
            Nothing allows her to delete, and the Deny blocks <code>s3:DeleteObject</code> even if another policy
            allows it later. It is also a little stricter than asked: she must sign in with MFA first. That is worth
            mentioning to your team lead.
          </p>
          <p>
            Two lines carry no permissions at all. <code>"Version": "2012-10-17"</code> names the policy language, so
            copy it exactly. The <Term k="sid">Sid</Term> is a label for people, and AWS ignores it when deciding.
          </p>
        </Prose>

        <Callout kind="warning" title="Bucket ARN or object ARN?">
          <p>
            In S3, a bucket and the files in it (<Term k="object">objects</Term>) are different resources.{' '}
            <strong>s3:ListBucket</strong> acts on the bucket, so it needs <Code>arn:aws:s3:::example-reports</Code>.{' '}
            <strong>s3:GetObject</strong> acts on objects, so it needs an object ARN:{' '}
            <Code>arn:aws:s3:::example-reports/*</Code> for every file, or{' '}
            <Code>arn:aws:s3:::example-reports/q1.pdf</Code> for just one.
          </p>
          <p>
            Give GetObject only the bucket <Term k="arn">ARN</Term> (the resource’s address) and every download is
            refused. It is one of the most common policy mistakes.
          </p>
        </Callout>

        <Checkpoint
          question={
            <>
              A teammate’s policy allows <Code>s3:GetObject</Code> on <Code>arn:aws:s3:::example-reports</Code>. When
              they try to download <Code>example-reports/q1.pdf</Code>, AWS refuses. What is wrong?
            </>
          }
          options={[
            <>The Version must be today’s date, not 2012-10-17.</>,
            <>
              GetObject acts on objects, so the Resource must be <Code>arn:aws:s3:::example-reports/*</Code>.
            </>,
            <>Action names must be written in lowercase.</>,
            <>Every Allow statement needs a Sid.</>,
          ]}
          answer={1}
          explanation={
            <>
              <Code>s3:GetObject</Code> works on objects, and the bucket ARN does not match any object. Adding{' '}
              <Code>/*</Code> covers every file in the bucket. The Version is correct as 2012-10-17, action names ignore
              capital letters, and the Sid is optional.
            </>
          }
        />
      </Section>

      <Section title="Read an ARN, the address of a resource">
        <Prose>
          <p>
            The strings starting with <code>arn:</code> in that policy are <Term k="arn">ARNs</Term> (Amazon Resource
            Names). An ARN is a unique address for one resource. Policies use ARNs to say which resources a rule
            covers.
          </p>
          <p>
            You read an ARN left to right, a bit like a postal address: first the part of AWS, then the service, the
            Region and the account, and last the resource itself, with colons between the parts. Unlike a postal
            address, the parts are not boxes inside each other: one account can hold resources in every Region.
          </p>
        </Prose>

        <CodeBlock code="arn:partition:service:region:account-id:resource" lang="text" title="The ARN format" className="max-w-[68ch]" />

        <Prose>
          <p>
            The <Term k="arn-partition">partition</Term> is almost always <code>aws</code>. The service is the same
            short name you see in actions, such as <code>s3</code> or <code>iam</code>. The Region is a{' '}
            <Term k="region-code">Region code</Term> such as <code>us-east-1</code>, and the account is the 12-digit{' '}
            <Term k="account-id">account ID</Term> that owns the resource. The last part names the resource itself.
          </p>
        </Prose>

        <ArnExplorer />

        <Prose>
          <p>
            Some resources do not need every part. Ordinary (general purpose) S3 bucket and object ARNs leave the
            Region and account empty. <Term k="iam">IAM</Term> ARNs never have a Region, because IAM is global. The
            colons stay anyway, which is why these S3 ARNs contain three colons in a row: <code>arn:aws:s3:::</code>.
          </p>
          <p>
            You never have to guess an ARN’s format. The AWS documentation lists the exact format for every resource
            type, in a reference called the Service Authorization Reference.
          </p>
        </Prose>
      </Section>

      <Section title="Name actions and use wildcards">
        <Prose>
          <p>
            An action names one operation in one service, written <code>service:Operation</code>:
          </p>
          <ul>
            <li>
              <code>s3:GetObject</code> reads a file from S3.
            </li>
            <li>
              <code>ec2:RunInstances</code> launches virtual servers (<Term k="instance">instances</Term>) in{' '}
              <Term k="ec2">Amazon EC2</Term>.
            </li>
            <li>
              <code>iam:CreateUser</code> creates a new <Term k="iam-user">IAM user</Term>.
            </li>
          </ul>
          <p>
            Listing every action and every file one by one would be tiring, so policies support two{' '}
            <Term k="wildcard">wildcards</Term>:
          </p>
          <ul>
            <li>
              <code>*</code> matches any number of characters, including none. <code>s3:Get*</code> matches every S3
              action whose name starts with Get.
            </li>
            <li>
              <code>?</code> matches exactly one character. <code>q?.pdf</code> matches q1.pdf but not q10.pdf.
            </li>
          </ul>
          <h3>Capital letters</h3>
          <p>
            Action names ignore capital letters: <code>s3:getobject</code> and <code>s3:GetObject</code> are the same
            action. ARNs are <Term k="case-sensitive">case-sensitive</Term>. In S3, the{' '}
            <Term k="object-key">object key</Term> <code>reports/Q1.pdf</code> names a different file from{' '}
            <code>reports/q1.pdf</code>. Write action names the way the documentation does, and copy ARNs exactly.
          </p>
        </Prose>

        <WildcardTester />

        <Prose>
          <p>
            Did you notice that <code>example-reports/*</code> matched a file inside a “folder”? The star happily
            matches slashes. Also notice how much <code>s3:*</code> covers: it includes DeleteObject. A wildcard saves
            typing, but it can quietly grant far more than you meant.
          </p>
        </Prose>

        <Checkpoint
          question={
            <>
              Which Resource pattern matches <Code>arn:aws:s3:::example-reports/2026/q1.pdf</Code>?
            </>
          }
          options={[
            <Code key="a">arn:aws:s3:::example-reports</Code>,
            <Code key="b">arn:aws:s3:::example-reports/q?.pdf</Code>,
            <Code key="c">arn:aws:s3:::example-reports/*</Code>,
            <Code key="d">arn:aws:s3:::Example-Reports/*</Code>,
          ]}
          answer={2}
          explanation={
            <>
              The <Code>*</Code> matches any characters, including the slash in <Code>2026/</Code>, so{' '}
              <Code>example-reports/*</Code> covers this file. The bucket ARN means only the bucket itself.{' '}
              <Code>q?.pdf</Code> allows exactly one character between “q” and “.pdf”, with no folder in front.{' '}
              <Code>Example-Reports</Code> fails because ARNs are case-sensitive.
            </>
          }
        />
      </Section>

      <Section title="Predict how AWS decides: allow or deny">
        <Prose>
          <p>
            Every time someone clicks in the <Term k="management-console">console</Term> or runs a command, AWS
            receives a request: this{' '}
            <Term k="principal">principal</Term> wants to do this action on this resource. AWS checks every policy
            that applies and reaches one of two answers: allow or deny.
          </p>
          <p>
            For the <Term k="identity-based-policy">identity-based policies</Term> you have seen so far, inside one
            account, the rules fit in three lines:
          </p>
          <ol>
            <li>
              <strong>Start with deny.</strong> Every request is refused unless a policy says otherwise. This default
              is called the <Term k="implicit-deny">implicit deny</Term>.
            </li>
            <li>
              <strong>A matching Deny always wins.</strong> If any statement with <code>"Effect": "Deny"</code> matches
              the request, the answer is no. This is an <Term k="explicit-deny">explicit deny</Term>, and no Allow can
              undo it.
            </li>
            <li>
              <strong>Otherwise, a matching Allow grants it.</strong> If any statement with{' '}
              <code>"Effect": "Allow"</code> matches, the request is allowed. That is an{' '}
              <Term k="explicit-allow">explicit allow</Term>. If nothing matches, the starting deny stands.
            </li>
          </ol>
          <p>
            A statement matches only when all of its parts match: the action matches the requested action, the
            resource matches the requested ARN, and the condition, if there is one, is true. The order you write
            statements in makes no difference.
          </p>
        </Prose>

        <Callout kind="analogy">
          <p>
            Think of the front desk of an office building. Nobody gets in by default. If your name is on the guest
            list (an Allow), you get in. But if your name is also on the banned list (a Deny), the guard turns you
            away, whatever the guest list says.
          </p>
        </Callout>

        <PolicySimulator />

        <Prose>
          <p>Some experiments worth trying, predicting the answer each time before you press Evaluate:</p>
          <ul>
            <li>
              Request <code>s3:DeleteObject</code> on q1.pdf. Statement 2 refuses it at step 1, before any Allow is
              even checked.
            </li>
            <li>
              Change Statement 1’s action to <code>s3:*</code> and try the delete again. Statement 1 now matches too,
              but the Deny still wins.
            </li>
            <li>
              Request <code>iam:CreateUser</code>. No statement mentions IAM, so nothing allows it and the starting
              deny stands.
            </li>
            <li>
              Switch on the MFA condition in Statement 1, then evaluate GetObject with and without MFA. The condition
              decides whether the Allow matches at all.
            </li>
          </ul>
        </Prose>

        <Callout kind="real-aws">
          <p>
            The full evaluation logic has more layers, which later modules cover:{' '}
            <Term k="resource-based-policy">resource-based policies</Term> such as S3 bucket policies,{' '}
            <Term k="permissions-boundary">permissions boundaries</Term>,{' '}
            <Term k="session-policy">session policies</Term>, and <Term k="aws-organizations">AWS Organizations</Term>{' '}
            guardrails such as <Term k="scp">SCPs</Term>. The core stays the same: requests start denied, and an
            explicit Deny in any of these policies wins. The one exception to the starting deny is the account’s{' '}
            <Term k="root-user">root user</Term>, which has full access by default.
          </p>
          <p>
            Some of these layers can only limit. When a permissions boundary, a session policy or an SCP applies, it
            must also allow the request, so one matching Allow in an identity-based policy is no longer enough on its
            own.
          </p>
          <p>
            AWS also offers a real IAM policy simulator. It tests policies against requests you describe, without
            sending any real request to a service.
          </p>
        </Callout>

        <Checkpoint
          question={
            <>
              Lee has two policies. One allows <Code>s3:*</Code> on every resource. The other denies{' '}
              <Code>s3:DeleteObject</Code> on <Code>arn:aws:s3:::example-reports/*</Code>. Lee tries to delete{' '}
              <Code>example-reports/q1.pdf</Code>. What happens?
            </>
          }
          options={[
            <>Allowed, because the Allow covers more actions.</>,
            <>Allowed, because the newest policy wins.</>,
            <>Denied, because a matching explicit Deny always wins.</>,
            <>Denied, because nothing allowed it (an implicit deny).</>,
          ]}
          answer={2}
          explanation={
            <>
              Both statements match the request. When an Allow and a Deny both match, the Deny wins every time, so this
              is an explicit deny. It is not an implicit deny: an Allow did match, but it was overruled. How new or how
              broad a policy is makes no difference.
            </>
          }
        />
      </Section>

      <Section title="Write policies that pass the tests">
        <Prose>
          <p>
            Writing a policy is easier when you start from the requests. List what must work and what must never
            work, then write the smallest set of statements that gets every answer right. This habit is called{' '}
            <Term k="least-privilege">least privilege</Term>: each person gets exactly what the job needs, and nothing
            more.
          </p>
          <p>
            Each challenge below gives you a person, their job and a table of required results. The starting policies
            contain the kind of mistakes real teams make.
          </p>
        </Prose>

        <PolicyChallenges />

        <Prose>
          <p>
            Notice the pattern: one narrow Allow per task. Where a rule must hold even if someone later adds a broad
            Allow, as in challenges 1 and 2, add an explicit Deny. Challenge 3 shows the other half: anything you
            never allow is already denied. A broad <code>"Action": "*"</code> on <code>"Resource": "*"</code> passes
            the “allowed” rows and fails every other one.
          </p>
          <p>
            Next, in <a href={href.lesson('foundations', 'iam-roles')}>Roles and temporary credentials</a>, you will
            attach policies like these to roles, so apps and people can borrow permissions for a short time instead of
            holding long-term keys.
          </p>
        </Prose>
      </Section>

      <Takeaways
        items={[
          <>
            A policy is JSON: a Version line (always <Code>2012-10-17</Code>, the language version, not a date) and a
            list of statements.
          </>,
          <>
            Each statement has an Effect (Allow or Deny), an Action (<Code>service:Operation</Code>), a Resource (an
            ARN) and an optional Condition. It matches a request only when every part matches.
          </>,
          <>
            An ARN reads <Code>arn:partition:service:region:account-id:resource</Code>. Parts can be empty, as in S3
            bucket and object ARNs and in IAM ARNs, but the colons stay.
          </>,
          <>
            <Code>*</Code> matches any characters, slashes included, and <Code>?</Code> matches exactly one. Action
            names ignore capital letters; ARNs are case-sensitive.
          </>,
          <>
            In one account, with identity-based policies only: every request starts denied, a matching Allow grants
            it, and a matching Deny always wins.
          </>,
          <>
            Pair each action with the right resource type: <Code>s3:ListBucket</Code> needs the bucket ARN, and{' '}
            <Code>s3:GetObject</Code> needs an object ARN such as <Code>bucket/*</Code>.
          </>,
        ]}
      />
    </div>
  )
}
