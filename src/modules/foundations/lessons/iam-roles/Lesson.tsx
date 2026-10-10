import { Ticket } from 'lucide-react'
import { Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { Checkpoint } from '../../../../components/Checkpoint'
import { CodeBlock } from '../../../../components/CodeBlock'
import { ServiceCard } from '../../../../components/ServiceCard'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { KeyVsRoleSim } from './KeyVsRoleSim'
import { TrustSim } from './TrustSim'
import { SessionLengthSim } from './SessionLengthSim'
import { RoleUses } from './RoleUses'
import {
  assumeRoleCli,
  assumeRoleCliHighlight,
  badCode,
  badCodeHighlight,
  goodCode,
  goodCodeHighlight,
  permissionsPolicy,
  permissionsPolicyHighlight,
  trustPolicy,
  trustPolicyHighlight,
} from './samples'

export default function Lesson() {
  return (
    <>
      <Section title="Why an app should not carry a key">
        <Prose>
          <p>
            Picture a small photo-sharing app. It runs on an <Term k="ec2">Amazon EC2</Term> server, called an{' '}
            <Term k="instance">instance</Term>, and it needs to read photos stored in an <Term k="s3">Amazon S3</Term>{' '}
            <Term k="bucket">bucket</Term> named example-photos.
          </p>
          <p>
            AWS will not hand over a single photo until the app proves who it is. So the app needs{' '}
            <Term k="credentials">credentials</Term>: secrets it sends along with every request.
          </p>
          <p>
            The tempting shortcut is to create an <Term k="access-key">access key</Term> for an <Term k="iam-user">IAM user</Term>{' '}
            and paste it straight into the code. It works on the first try:
          </p>
        </Prose>
        <CodeBlock code={badCode} lang="python" title="app.py (the shortcut)" highlight={badCodeHighlight} />
        <Prose>
          <p>
            That is exactly what makes it dangerous. An access key is a <strong>long-term</strong> secret, and code travels:
          </p>
          <ul>
            <li>
              <strong>Code gets copied.</strong> The key ends up in your Git history (the saved record of every version of the code), on
              teammates’ laptops, in chat messages and in backups.
            </li>
            <li>
              <strong>Code gets published.</strong> One push to a public <Term k="code-repository">code repository</Term> and anyone on
              the internet can read the key.
            </li>
            <li>
              <strong>The key never expires on its own.</strong> A leaked key keeps working until someone notices and deletes it.
            </li>
            <li>
              <strong>AWS cannot tell who is holding it.</strong> Anyone with the key gets all of its power, exactly like your app.
            </li>
          </ul>
          <p>
            AWS’s own security advice is to keep long-term keys out of apps: workloads, meaning apps, scripts and background jobs, should
            borrow short-lived access instead of carrying a key. The rest of this lesson shows how that works.
          </p>
        </Prose>
      </Section>

      <Section title="A role is a badge you borrow, not a key you keep">
        <Callout kind="analogy">
          <p>
            Think of the visitor badges at a factory’s front desk, or the hard hats on hooks at a building site. A badge does not belong
            to one person. Anyone the factory trusts can wear one for a while, and it opens only certain doors. When the visit ends it goes
            back on the hook, and a badge someone forgets to return stops opening doors at the end of the day. In the diagrams below, a
            hard hat marks a role.
          </p>
        </Callout>
        <Prose>
          <p>
            An <Term k="iam-role">IAM role</Term> is an identity with permissions but no password and no long-term keys. Instead of
            belonging to one person, a role is meant to be used by anyone you trust: a person, an app or an AWS service.
          </p>
          <p>
            Putting a role on is called <Term k="assume-role">assuming the role</Term>. When someone assumes a role,{' '}
            <Term k="sts">AWS STS</Term> (Security Token Service) gives them <Term k="temporary-credentials">temporary credentials</Term>{' '}
            that work for a limited time and then stop.
          </p>
          <p>
            For a server, you attach the role to the EC2 instance through an <Term k="instance-profile">instance profile</Term>. After
            that, the AWS <Term k="sdk">SDK</Term> in your app collects credentials from the{' '}
            <Term k="instance-metadata-service">instance metadata service</Term> without any code from you. Follow both stories to see the
            difference.
          </p>
        </Prose>

        <KeyVsRoleSim />

        <Prose>
          <h3>What you just saw</h3>
          <p>
            In the key story, one secret was copied from place to place. Every copy worked for anyone, with no end date, and the only fix
            was to delete the key, which broke your own app too.
          </p>
          <p>
            In the role story, no secret was ever written down. The app received short-lived credentials, used them, and got fresh ones
            before they ran out. A stolen copy died on its own. This is all the code the app needs:
          </p>
        </Prose>
        <CodeBlock code={goodCode} lang="python" title="app.py (with a role)" highlight={goodCodeHighlight} />
        <Callout kind="real-aws">
          <p>
            In the EC2 console you pick the role when you launch an instance, under <strong>Advanced details</strong>, then{' '}
            <strong>IAM instance profile</strong>. For a running instance, choose <strong>Actions</strong>, <strong>Security</strong>,{' '}
            <strong>Modify IAM role</strong>. When you create a role for EC2 in the console, AWS makes the matching instance profile for
            you, with the same name.
          </p>
        </Callout>

        <Checkpoint
          question="Your photo app runs on an EC2 instance and needs to read files from an S3 bucket. What is the safest way to give it access?"
          options={[
            'Create an access key and paste it into the app’s code',
            'Create an access key and keep it in a settings file on the server',
            'Attach an IAM role to the instance through an instance profile',
            'Use the root user’s access key, because it can do anything',
          ]}
          answer={2}
          explanation={
            <>
              A role gives the app temporary credentials that EC2 delivers and refreshes for you, so there is no long-term secret to leak. A
              settings file still holds a key that never expires: anyone who copies the file or a backup of the server gets it. Root user
              keys are the worst choice of all, because they can do anything; AWS advises against creating them.
            </>
          }
        />
      </Section>

      <Section title="Every role has two policies: who and what">
        <Prose>
          <p>
            You met <Term k="policy">policies</Term> in{' '}
            <a href={href.lesson('foundations', 'iam-policies')}>the previous lesson</a>. A role carries two kinds, and each answers a
            different question.
          </p>
          <ul>
            <li>
              The <Term k="trust-policy">trust policy</Term> answers <strong>who may assume the role</strong>. It names one or more{' '}
              <Term k="principal">principals</Term>: an AWS service, a whole AWS account, a specific IAM user or role, or a sign-in
              system outside AWS, such as your company’s <Term k="identity-provider">identity provider</Term>.
            </li>
            <li>
              The <Term k="permissions-policy">permissions policy</Term> answers <strong>what the wearer may do</strong>, just like the
              policies you read last time.
            </li>
          </ul>
          <p>Here are both policies of the PhotoReader role from the story:</p>
        </Prose>
        <div className="my-6 grid gap-4 md:grid-cols-2">
          <CodeBlock
            code={trustPolicy}
            lang="json"
            title="Trust policy: who may assume PhotoReader"
            highlight={trustPolicyHighlight}
            className="my-0!"
          />
          <CodeBlock
            code={permissionsPolicy}
            lang="json"
            title="Permissions policy: what PhotoReader may do"
            highlight={permissionsPolicyHighlight}
            className="my-0!"
          />
        </div>
        <Prose>
          <p>Read the highlighted lines:</p>
          <ul>
            <li>
              <code>"Service": "ec2.amazonaws.com"</code> is a <Term k="service-principal">service principal</Term>. It means “the EC2
              service may assume this role”, which EC2 does for your instance.
            </li>
            <li>
              <code>"sts:AssumeRole"</code> is the act of putting the role on. A trust policy lists role-assumption actions like this
              one, from AWS STS. What the wearer may do in S3 or any other service belongs in the permissions policy.
            </li>
            <li>
              <code>"s3:GetObject"</code> lets the wearer read files, and nothing else: no uploading, no deleting.
            </li>
            <li>
              <code>arn:aws:s3:::example-photos/*</code> limits that to the files in one bucket. Giving only what the job needs is called{' '}
              <Term k="least-privilege">least privilege</Term>.
            </li>
          </ul>
          <p>
            Notice that only the trust policy has a <code>Principal</code> line. The permissions policy is attached to the role itself, so
            it is always about whoever is wearing it.
          </p>
        </Prose>
        <Callout kind="remember">
          <p>
            Both policies must say yes. If the trust policy names you but the permissions policy does not allow an action, you can put the
            role on but still cannot do that action. If the permissions policy is generous but the trust policy does not name you, you
            cannot use the role at all.
          </p>
        </Callout>

        <Prose>
          <p>
            The requesters below include an <Term k="lambda">AWS Lambda</Term> function: a small piece of code that AWS runs for you when
            something triggers it, with no server to manage.
          </p>
        </Prose>

        <TrustSim />

        <Prose>
          <p>
            Each requester was checked against the trust policy. AWS services are trusted through their service principal. Another account
            is trusted as a whole, and its admin then decides which of its people may use your role. That is called{' '}
            <Term k="cross-account-access">cross-account access</Term>, and it needs a yes from both sides. The stranger never had a
            chance, because nothing named them.
          </p>
        </Prose>

        <Checkpoint
          question="PhotoReader’s trust policy names account 111122223333. A developer in that account tries to assume it, but their own permissions do not include sts:AssumeRole. What happens?"
          options={[
            'It works, because the trust policy names their account',
            'It is refused, because cross-account access needs a yes from both accounts',
            'It works, but only for 15 minutes',
            'It is refused, because roles can never be used from another account',
          ]}
          answer={1}
          explanation={
            <>
              Naming an account in a trust policy hands the decision to that account’s admins. They still have to allow specific people to
              call sts:AssumeRole on your role. And roles are in fact the main way to share access between accounts, so the last option is
              wrong too.
            </>
          }
        />
      </Section>

      <Section title="Inside a set of temporary credentials">
        <Prose>
          <p>
            Whenever someone assumes a role, AWS STS creates a brand-new set of temporary credentials. Each set holds three values and an
            end time:
          </p>
          <ul>
            <li>
              <strong>Access key ID.</strong> Temporary ones start with <code>ASIA</code>. Long-term access keys start with{' '}
              <code>AKIA</code>.
            </li>
            <li>
              <strong>Secret access key.</strong> Used to sign each request, so AWS knows it really came from the holder.
            </li>
            <li>
              <strong>
                <Term k="session-token">Session token</Term>.
              </strong>{' '}
              Must travel with every request, or AWS refuses it.
            </li>
            <li>
              <strong>Expiration.</strong> After this moment AWS no longer accepts the set.
            </li>
          </ul>
          <p>
            Temporary credentials work almost exactly like a long-term access key, with two big differences. They are created when someone
            asks for them and are not stored with any user. And they expire on their own, so a leaked set soon becomes useless.
          </p>
          <p>
            When a script or the AWS CLI assumes a role, it can ask for a session length: from 15 minutes up to the role’s{' '}
            <Term k="max-session-duration">maximum session duration</Term>. That maximum is 1 hour unless an admin raises it, up to 12
            hours. If the script does not ask for a length, it gets 1 hour. (Switching roles in the console works differently: you get
            the role’s maximum, or what is left of your own session, whichever is shorter.)
          </p>
          <p>
            Here is a developer assuming a role called DeveloperReadOnly with the <Term k="cli">AWS CLI</Term>. The reply is the set of
            temporary credentials:
          </p>
        </Prose>
        <CodeBlock code={assumeRoleCli} lang="shell" title="Terminal" highlight={assumeRoleCliHighlight} />
        <Prose>
          <p>
            Apps on EC2 and Lambda never see this step. The service gets the credentials for them and refreshes them before they run out,
            and the role’s maximum session duration does not limit these sessions.
          </p>
        </Prose>

        <ServiceCard
          name="AWS STS"
          fullName="AWS Security Token Service"
          category="security"
          scope="global"
          icon={Ticket}
          what="Creates temporary credentials when someone assumes a role, or signs in through an identity provider that a role trusts."
          how={
            <>
              Mostly you do not call it yourself: EC2, Lambda and IAM Identity Center call it for you. Scripts can call it directly, for
              example with <code className="font-mono text-[0.85em]">aws sts assume-role</code>.
            </>
          }
          where="Behind every role. IAM is where you define roles and their policies; STS is the front desk that hands out the time-limited badges."
          cost="No extra charge. You pay only for the AWS services you use with the credentials."
        />

        <SessionLengthSim />

        <Prose>
          <p>
            Any length from 15 minutes up to the role’s maximum works, and anything longer fails outright. Shorter is safer: if a set of
            credentials leaks, it stops working sooner. So ask for the shortest session that gets the job done.
          </p>
        </Prose>

        <Checkpoint
          question="A role still has the default maximum session duration. A script asks AWS STS for a 2-hour session. What happens?"
          options={[
            'STS quietly gives it 1 hour instead',
            'The request fails, because 2 hours is more than the role’s 1-hour maximum',
            'STS gives it 2 hours, because the maximum applies only in the console',
            'STS gives it credentials that never expire',
          ]}
          answer={1}
          explanation={
            <>
              The default maximum is 1 hour, and asking for more than the role allows makes the request fail; STS does not trim it for you.
              If longer sessions are really needed, an admin can raise the role’s maximum to as much as 12 hours.
            </>
          }
        />
      </Section>

      <Section title="Where you will meet roles">
        <Prose>
          <p>Once you know what roles are, you start seeing them everywhere. Four situations come up again and again:</p>
          <ul>
            <li>
              <strong>AWS services acting for you</strong>, like the photo app on EC2, or a Lambda function wearing its{' '}
              <Term k="execution-role">execution role</Term>.
            </li>
            <li>
              <strong>Access across accounts</strong>, when people or apps in one AWS account need something in another.
            </li>
            <li>
              <strong>People signing in</strong> through <Term k="iam-identity-center">IAM Identity Center</Term>, AWS’s recommended way
              to give people <Term k="sso">single sign-on</Term> to their accounts. Signing in with an identity from elsewhere is called{' '}
              <Term k="federation">federation</Term>. Each <Term k="permission-set">permission set</Term> becomes a role in every account
              it is assigned to.
            </li>
            <li>
              <strong>
                <Term k="break-glass-access">Break-glass</Term> emergency access
              </strong>
              : a locked-away way in for when normal sign-in is broken, protected with <Term k="mfa">MFA</Term> and recorded by{' '}
              <Term k="cloudtrail">CloudTrail</Term>.
            </li>
          </ul>
          <p>Pick each situation to see who assumes which role, and in which account that role lives.</p>
        </Prose>

        <RoleUses />

        <Callout kind="real-aws">
          <p>
            As you use more services, roles you never created appear under <strong>Roles</strong> in the IAM console, with names that
            start with AWSServiceRoleFor. These are service-linked roles: an AWS service created them to do its job for you. You can view
            them, but you cannot edit their permissions.
          </p>
        </Callout>

        <Takeaways
          items={[
            'A role is an identity with permissions but no password or long-term keys. Trusted people, apps and AWS services assume it for a while.',
            'Never put access keys in an app’s code. On EC2 or Lambda, attach a role and the AWS SDK finds temporary credentials by itself.',
            'Every role has a trust policy (who may assume it) and a permissions policy (what the wearer may do). Both must say yes.',
            'AWS STS issues temporary credentials: an access key ID, a secret access key and a session token, plus an expiration time. You can ask for 15 minutes up to the role’s maximum session duration (1 hour unless an admin raises it, at most 12 hours). Ask for more and the request fails.',
            'Roles power AWS services acting for you, access across accounts, people signing in through IAM Identity Center, and break-glass emergency access.',
          ]}
        />
        <Prose>
          <p>
            Next, the <a href={href.lesson('foundations', 'checkpoint')}>module checkpoint</a> puts users, groups, roles and policies back
            together and tests you on the whole module.
          </p>
        </Prose>
      </Section>
    </>
  )
}
