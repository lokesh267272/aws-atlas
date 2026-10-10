import { useState } from 'react'
import { Footprints } from 'lucide-react'
import { Checkpoint } from '../../../../components/Checkpoint'
import { CodeBlock } from '../../../../components/CodeBlock'
import { Bench, Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { ServiceCard } from '../../../../components/ServiceCard'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { AccountDiagram } from './AccountDiagram'
import { ArnAnatomy } from './ArnAnatomy'
import { PracticeTerminal } from './PracticeTerminal'
import { SafetyChecklist } from './SafetyChecklist'
import { ThreeWays } from './ThreeWays'
import { ToolsTable } from './ToolsTable'

export default function Lesson() {
  const [checklistKey, setChecklistKey] = useState(0)
  const [threeWaysKey, setThreeWaysKey] = useState(0)
  const [terminalKey, setTerminalKey] = useState(0)

  return (
    <>
      <Section title="An account holds your resources, your bill and your security">
        <Prose>
          <p>
            Imagine you and a friend open a small online bakery. You need a website, somewhere to keep product photos, and a
            place to store orders. You decide to rent all of it from AWS, so the first thing you do is sign up. What you get
            back is an AWS account.
          </p>
          <p>
            An <Term k="aws-account">AWS account</Term> is your own walled-off space inside AWS. It does three jobs at once:
          </p>
          <ul>
            <li>
              <strong>It holds your resources.</strong> Every <Term k="resource">resource</Term> you create, from a{' '}
              <Term k="server">server</Term> to a storage bucket, belongs to exactly one account.
            </li>
            <li>
              <strong>It is a billing boundary.</strong> AWS adds up what is used inside the account and bills for it.
            </li>
            <li>
              <strong>It is a security boundary.</strong> People and programs in one account cannot touch another
              account’s resources unless someone allows it on purpose.
            </li>
          </ul>
          <p>
            Each account has a 12-digit <Term k="account-id">account ID</Term>, such as 123456789012. You will see it in
            resource addresses, logs and bills. It is not a secret, but share it with care.
          </p>
        </Prose>

        <AccountDiagram />

        <Prose>
          <p>
            As the bakery grows, one account is rarely enough. Companies usually keep testing and production in separate
            accounts, so an experiment can never break the real shop. <Term k="aws-organizations">AWS Organizations</Term>{' '}
            ties many accounts together, with shared rules and one combined bill.
          </p>
        </Prose>
      </Section>

      <Section title="The root user can do anything, so lock it away">
        <Prose>
          <p>
            When you sign up, AWS creates one identity for you: the <Term k="root-user">root user</Term>. You sign in as
            root with the email address and password you used to create the account.
          </p>
        </Prose>

        <Callout kind="real-aws" title="Two ways to sign up">
          <p>
            This lesson follows the standard sign-up, which AWS now calls Sign up for AWS (advanced). AWS is also trying
            out a simpler sign-up with some new customers. It sets your account up as a project and creates no root user,
            so some steps below will look different.
          </p>
        </Callout>

        <Prose>
          <p>
            The root user has complete access to everything in the account, including the bill and the account itself. In
            a standalone account (one that is not part of AWS Organizations), you cannot attach an <Term k="iam">IAM</Term>{' '}
            <Term k="policy">policy</Term> to the root user to limit it. (IAM is the AWS service that decides who may do
            what. Inside AWS Organizations, guardrails such as a <Term k="scp">service control policy</Term> can restrict
            the root user of a member account, meaning an account that belongs to an organization.)
          </p>
          <p>
            That much power is exactly why you should rarely use it. AWS lists only a few tasks that truly need root. For
            example:
          </p>
          <ul>
            <li>Changing the root user’s email address or password (in a standalone account)</li>
            <li>Closing the AWS account (in a standalone account)</li>
            <li>Restoring permissions after the only IAM administrator accidentally removed their own</li>
            <li>Turning on IAM access to the Billing and Cost Management console</li>
            <li>
              Unlocking an <Term k="s3">S3</Term> <Term k="bucket">bucket</Term> whose policy accidentally denies everyone,
              including administrators (a bucket’s own policy can shut root out, but root can always edit or delete it)
            </li>
          </ul>
          <p>Everything else, including all of your daily work, should happen under a different identity.</p>
        </Prose>

        <Callout kind="analogy">
          <p>
            The root user is the master key to a building. You do not carry it around for daily errands. You lock it in a
            safe, put an alarm on the safe, and use your own key card instead.
          </p>
        </Callout>

        <Prose>
          <h3>Protect it with MFA</h3>
          <p>
            <Term k="mfa">MFA (multi-factor authentication)</Term> means signing in with two proofs: your password, plus
            something you physically have, such as a phone app or a security key. AWS requires MFA for the root user of
            every account. If it is missing, AWS asks you to add it when you sign in, and allows at most 35 days from your first
            sign-in attempt.
          </p>
          <h3>Never create root access keys</h3>
          <p>
            An <Term k="access-key">access key</Term> is a long-term secret that lets the command line and programs act as
            an identity. A root access key would be a password with unlimited power that never asks for MFA. AWS strongly
            recommends that you never create one.
          </p>
          <p>
            The checklist below is what a careful person does on the first day with a new account. Work through it and
            watch the risks change.
          </p>
        </Prose>

        <Bench
          title="Try it: your first-day safety checklist"
          intro="Open each step to see why it matters and where you do it in AWS, then tick it off. Watch the risk change as you tick: each step closes one gap."
          onReset={() => setChecklistKey((k) => k + 1)}
        >
          <SafetyChecklist key={checklistKey} />
        </Bench>

        <Prose>
          <p>
            Notice the pattern. Two steps lock the master key away (MFA, no root keys). One step means you rarely need it
            (an everyday admin). The last three help you notice when something is off: a budget alert for money, the Region
            selector for “where did it go?”, and <Term k="cloudtrail">CloudTrail</Term> for “who did that?”.
          </p>
        </Prose>

        <Checkpoint
          question="Which of these jobs actually needs the root user?"
          options={[
            'Creating an S3 bucket for product photos',
            'Starting a new virtual server',
            'Closing a standalone AWS account',
            'Reading the CloudTrail event history',
          ]}
          answer={2}
          explanation="Closing a standalone account is one of the few tasks only root can do. Creating buckets, starting servers and reading CloudTrail are everyday work: do them with your admin identity, never as root."
        />
      </Section>

      <Section title="Many ways to talk to AWS, one API underneath">
        <Prose>
          <p>
            Back at the bakery, your friend prefers clicking, while you like typing commands. Later you will want a small
            program that uploads new product photos by itself. AWS has a tool for each style.
          </p>
        </Prose>

        <ToolsTable />

        <Prose>
          <p>
            Here is the key idea: these are all doors into the same room. Every console action that reads or changes
            something, every CLI command that talks to AWS and every SDK function call turns into the same thing, an{' '}
            <Term k="api">API</Term> call. An API is the list of requests a service accepts. <code>CreateUser</code> is one
            request on IAM’s list. Infrastructure as Code tools sit on top: they make the same API calls for you.
          </p>
          <p>
            Each API call travels over <Term k="https">HTTPS</Term> to the service’s <Term k="endpoint">endpoint</Term>,
            the web address it listens on (<code>iam.amazonaws.com</code> for IAM). Your tool{' '}
            <Term k="request-signing">signs</Term> the request with your <Term k="credentials">credentials</Term>, so AWS
            can check who sent it and that nobody changed it on the way. Then two things happen to a request like this one,
            whichever tool sent it:
          </p>
          <ul>
            <li>
              <strong>IAM checks it.</strong> Who is asking, and are they allowed to do this?
            </li>
            <li>
              <strong>CloudTrail records it.</strong> <Term k="cloudtrail">AWS CloudTrail</Term> turns the call into an
              event in the account’s activity log. By default it records{' '}
              <Term k="management-event">management events</Term>: calls that manage your account and resources, such as
              creating a user or listing your buckets. Very frequent calls on your data, such as uploading or reading single
              files in S3, are recorded only if you set up a trail that asks for them.
            </li>
          </ul>
          <p>
            In the next simulation you will create an <Term k="iam-user">IAM user</Term>: a named identity inside your
            account for one person or program, with its own password or keys. DevAdmin, who sends the request, is an IAM
            user too. You will meet IAM users properly in the next lesson.
          </p>
        </Prose>

        <Bench
          title="Try it: same action, three ways"
          intro="Create an IAM user from the console, the CLI or a Python script. Pick a tool, choose a name and run it. Then switch tools, reuse a name, or send the request as a user without permission, and compare the steps."
          onReset={() => setThreeWaysKey((k) => k + 1)}
        >
          <ThreeWays key={threeWaysKey} />
        </Bench>

        <Prose>
          <p>
            What you just saw: the console form, the CLI command and the Python script all sent <code>CreateUser</code> to
            the same endpoint. IAM ran the same check, the reply had the same fields (shown as{' '}
            <Term k="json">JSON</Term>), and CloudTrail logged the same event name. Fields such as <code>userAgent</code>{' '}
            hint at which tool you used.
          </p>
          <p>
            If you sent ReadOnlyAnna’s request, notice that her signature was valid, so AWS knew exactly who she was, and it
            still said no. Proving who you are and being allowed to act are two separate checks. You will take them apart in{' '}
            <a href={href.lesson('foundations', 'iam-identities')}>IAM: who can do what</a>.
          </p>
        </Prose>

        <ServiceCard
          name="CloudTrail"
          fullName="AWS CloudTrail"
          category="management"
          scope="regional"
          icon={Footprints}
          what="Records actions in your account as events: who did what, to which resource, when, and from where. Console actions, CLI commands and SDK calls all show up the same way."
          how={
            <ul>
              <li>Open the CloudTrail console and choose Event history to search the last 90 days of management events.</li>
              <li>Create a trail when you need to keep logs for longer, stored in an S3 bucket.</li>
            </ul>
          }
          where="Beside every other service. When something changes unexpectedly, CloudTrail is where you find out who did it, and auditors use it to check that rules were followed."
          cost="Viewing event history is free. Trails can add charges, for example for storing logs in S3."
        />

        <Checkpoint
          question="Maya creates an IAM user in the console. Sam creates another one with the AWS CLI. What will CloudTrail’s event history show?"
          options={[
            'Only Maya’s, because CloudTrail records console clicks but not commands',
            'Only Sam’s, because the console does not use the API',
            'Two CreateUser events, because both tools call the same API',
            'Nothing, because CloudTrail has to be switched on first',
          ]}
          answer={2}
          explanation="Both tools send the same CreateUser API call, and CloudTrail records API calls whichever tool sent them. Event history is on from the day the account is created and keeps 90 days of management events, so there is nothing to switch on. Because IAM is global, you would find both events in the event history for US East (N. Virginia)."
        />
      </Section>

      <Section title="ARNs: the full address of every resource">
        <Prose>
          <p>
            Look again at the reply from <code>CreateUser</code>. The <code>Arn</code> field held a long string such as{' '}
            <code className="[overflow-wrap:anywhere]">arn:aws:iam::123456789012:user/Bob</code>. That is an <Term k="arn">ARN (Amazon Resource Name)</Term>:
            the full address of one resource across all of AWS. Policies, logs and many commands use ARNs, so it pays to
            read one at a glance.
          </p>
          <p>An ARN is a list of parts separated by colons, always in the same order:</p>
        </Prose>

        <CodeBlock lang="text" code="arn:partition:service:region:account-id:resource" className="max-w-[68ch]" />

        <Prose>
          <p>
            The <Term k="partition">partition</Term> is almost always <code>aws</code>. Some parts can be empty, and that is
            not a mistake. Compare an IAM user with an <Term k="s3">S3</Term> <Term k="bucket">bucket</Term> and a{' '}
            <Term k="vpc">VPC</Term>:
          </p>
        </Prose>

        <ArnAnatomy />

        <Checkpoint
          question={
            <>
              In <code className="font-mono [overflow-wrap:anywhere]">arn:aws:iam::123456789012:user/Paulo</code>, why is there nothing between the
              two colons after <code className="font-mono">iam</code>?
            </>
          }
          options={[
            'The user was deleted, so its Region was removed',
            'IAM is a global service, so IAM ARNs never include a Region',
            'The account ID is secret, so AWS hides it',
            'Someone made a typing mistake',
          ]}
          answer={1}
          explanation="The empty slot is the Region. IAM is global: one set of users for the whole account, not one per Region. The account ID is still there (123456789012), and it is not a secret."
        />
      </Section>

      <Section title="Practise the CLI in a safe terminal">
        <Prose>
          <p>
            Ready to type? The terminal below behaves like a real one with the AWS CLI installed and signed in to an example
            account as the IAM user DevAdmin. It understands a handful of real commands and answers in the same format as
            the real CLI.
          </p>
          <p>Try this order:</p>
          <ol>
            <li>
              Run <code>aws sts get-caller-identity</code> to see which identity and account you are using. It belongs to{' '}
              <Term k="sts">AWS STS</Term> and works without any special permission.
            </li>
            <li>
              Run <code>aws configure list</code> to see your <Term k="cli-profile">profile</Term>, your Region and your
              masked keys.
            </li>
            <li>Create a user, then run <code>aws iam list-users</code> and find its ARN.</li>
          </ol>
        </Prose>

        <Callout kind="warning" title="Never type real keys into a website">
          <p>
            This practice terminal never asks for credentials, and no honest website will. If a page, an email or a person
            asks for your secret access key, treat it as a scam.
          </p>
        </Callout>

        <Bench
          title="Try it: a practice terminal"
          tone="screen"
          intro="Type a command and press Enter, or click a suggestion. The up arrow repeats earlier commands. Simulated: nothing reaches AWS, and the keys shown are AWS’s documentation examples."
          onReset={() => setTerminalKey((k) => k + 1)}
        >
          <PracticeTerminal key={terminalKey} />
        </Bench>

        <Prose>
          <p>
            In a real terminal, the <code>aws</code> commands that talk to AWS would be real API calls:{' '}
            <code>GetCallerIdentity</code>, <code>CreateUser</code>, <code>ListUsers</code>, <code>ListBuckets</code> and{' '}
            <code>DescribeRegions</code>. CloudTrail would record them, and IAM would check each one’s permissions, except{' '}
            <code>GetCallerIdentity</code>, which needs none. <code>aws --version</code> and{' '}
            <code>aws configure list</code> only look at your own computer. When you are ever unsure which account a
            terminal is pointing at, run <code>aws sts get-caller-identity</code> before you change anything.
          </p>
        </Prose>

        <Callout kind="real-aws" title="Signing in the real CLI">
          <p>
            AWS recommends <Term k="temporary-credentials">short-term credentials</Term> for the CLI. If you sign in
            through <Term k="iam-identity-center">IAM Identity Center</Term>, as the checklist suggested, run{' '}
            <code>aws configure sso</code>. If you sign in to the console as an IAM user, run <code>aws login</code> (it
            needs AWS CLI version 2.32.0 or later). Storing a long-term access key with <code>aws configure</code> still
            works, but AWS lists it as not recommended.
          </p>
        </Callout>

        <Takeaways
          items={[
            'An AWS account is a container for resources, a billing boundary and a security boundary, identified by a 12-digit account ID. Companies use several accounts, often grouped with AWS Organizations.',
            'The root user can do anything, and in a standalone account you cannot attach an IAM policy to limit it. Give it MFA, never give it access keys, and use it only for the few tasks that need it.',
            'On day one: MFA on root, no root keys, an everyday admin through IAM Identity Center, a budget alert, a check of your Region, and knowing that CloudTrail keeps 90 days of event history.',
            'The console, the CLI, the SDKs and Infrastructure as Code are different doors to the same signed HTTPS API calls. IAM checks each call, and CloudTrail records management calls such as CreateUser by default.',
            <>
              An ARN is a resource’s full address:{' '}
              <code className="font-mono text-[0.9em] [overflow-wrap:anywhere]">
                arn:partition:service:region:account-id:resource
              </code>
              . IAM ARNs leave the Region empty because IAM is global.
            </>,
            <>
              Before you change anything from a terminal, run <code className="font-mono text-[0.9em]">aws sts get-caller-identity</code>{' '}
              to see which identity and account you are using. Sign the real CLI in with short-term credentials, and never
              type keys into a website.
            </>,
          ]}
        />
      </Section>
    </>
  )
}
