import { KeyRound } from 'lucide-react'
import { Callout, Prose, Section, Takeaways } from '../../../../components/lesson'
import { ServiceCard } from '../../../../components/ServiceCard'
import { Checkpoint } from '../../../../components/Checkpoint'
import { Term } from '../../../../components/Term'
import { href } from '../../../../lib/router'
import { BuildingBlocks } from './BuildingBlocks'
import { TeamSetupSim } from './TeamSetupSim'
import { TwoGatesSim } from './TwoGatesSim'
import { AccessChoices } from './AccessChoices'

export default function Lesson() {
  return (
    <>
      <Section title="Badges and key cards: the two questions IAM answers">
        <Prose>
          <p>
            Picture your first morning at a new hospital job. At the front desk, a guard checks your photo ID and prints
            you a staff badge. Then you start walking around. Your key card opens the staff room and your own ward, but
            the pharmacy door stays shut.
          </p>
          <p>
            Two separate checks just happened. The front desk asked: <strong>who are you?</strong> Each door asked:{' '}
            <strong>are you allowed in here?</strong> Passing the first check does not open every door.
          </p>
          <p>
            AWS asks the same two questions about every request. Proving who you are is called{' '}
            <Term k="authentication">authentication</Term>. Deciding what you may do is called{' '}
            <Term k="authorization">authorization</Term>. The AWS service that handles both is{' '}
            <Term k="iam">IAM</Term>, short for AWS Identity and Access Management.
          </p>
        </Prose>

        <Callout kind="analogy">
          <p>
            IAM is the badge office and the key-card system in one. It creates the badges (
            <Term k="identity">identities</Term>), checks them when someone signs in, and programs each card with the
            doors it may open (<Term k="permission">permissions</Term>).
          </p>
        </Callout>

        <ServiceCard
          name="IAM"
          fullName="AWS Identity and Access Management"
          category="security"
          scope="global"
          icon={KeyRound}
          what={<p>Controls who can sign in to your AWS account, and what each person or program is allowed to do there.</p>}
          how={
            <ul>
              <li>Create identities: users, groups and roles.</li>
              <li>
                Attach <Term k="policy">policies</Term> that list what each identity may do.
              </li>
              <li>
                For people, prefer <Term k="iam-identity-center">IAM Identity Center</Term>. For apps, use{' '}
                <Term k="iam-role">roles</Term>.
              </li>
              <li>
                Turn on <Term k="mfa">MFA</Term> for every person who signs in.
              </li>
            </ul>
          }
          where={
            <p>
              IAM is global: one set of identities and policies for your whole account, not tied to a{' '}
              <Term k="region">Region</Term>. Almost every request to AWS, whether a{' '}
              <Term k="management-console">console</Term> click, a command or a line of code, must be authenticated and
              authorized by IAM. A few, such as downloads from a deliberately public S3 bucket, can be anonymous.
            </p>
          }
          cost="IAM is offered at no additional charge. You pay only for the AWS resources people use."
        />
      </Section>

      <Section title="The building blocks: users, groups, roles and policies">
        <Prose>
          <p>
            IAM is built from only a few parts. An <Term k="iam-user">IAM user</Term> stands for one person or app. An{' '}
            <Term k="iam-group">IAM group</Term> bundles users together. A role is an identity that people or apps
            borrow for a while. Policies are the permission lists you attach to all three.
          </p>
          <p>
            One more word comes up constantly: the <Term k="principal">principal</Term>. That is whoever is actually
            making a request right now. Choose each building block below to see where it sits inside an AWS account.
          </p>
        </Prose>

        <BuildingBlocks />

        <Prose>
          <h3>Everything starts as a no</h3>
          <p>
            Here is the rule that surprises most beginners. A new IAM user, group or role starts with{' '}
            <strong>no permissions at all</strong>. Every request is denied until a policy allows it. AWS calls this
            default the <Term k="implicit-deny">implicit deny</Term>.
          </p>
          <p>
            The big exception is the <Term k="root-user">root user</Term>, the identity created along with your
            account. It is allowed almost everything, which is exactly why you lock it away and use other identities
            for daily work.
          </p>
        </Prose>

        <Callout kind="remember">
          <p>No policy, no access. If nothing says Allow, the answer is Deny.</p>
        </Callout>

        <Checkpoint
          question="You create a new IAM user for Sam and attach no policies. He signs in and tries to list the S3 buckets. What happens?"
          options={[
            'He sees every bucket, because new users can read by default.',
            'He is denied, because a new identity has no permissions until a policy allows it.',
            'He can do whatever the root user can do, because he is in the same account.',
            'AWS asks the root user to approve the request.',
          ]}
          answer={1}
          explanation={
            <p>
              New IAM identities start with no permissions. With no policy saying Allow, every request falls through to
              the default deny. Being in the same account gives Sam nothing by itself.
            </p>
          }
        />
      </Section>

      <Section title="Give a small team the right access">
        <Prose>
          <p>
            Meet a small company with five people. Each has a different job, so each needs different access: launching
            servers in <Term k="ec2">Amazon EC2</Term>, reading files in <Term k="s3">Amazon S3</Term>, seeing the
            bill, or creating sign-ins for new staff.
          </p>
          <p>
            You could attach policies to each person one by one, but that gets messy fast. Instead, you make one group
            per job, attach policies to the groups, and put each person in the right group.
          </p>
          <p>
            The policies here are real <Term k="managed-policy">AWS managed policies</Term>: ready-made permission sets
            that AWS writes and keeps up to date. AdministratorAccess, PowerUserAccess, ReadOnlyAccess and Billing are
            also <Term k="job-function-policy">job function policies</Term>, built for common jobs at work.
          </p>
        </Prose>

        <TeamSetupSim />

        <Prose>
          <p>
            <strong>What you just saw.</strong> A person gets every permission from every policy on every group they
            are in. Their effective permissions are the sum of all of them. (Simplified: a policy can also say Deny, and
            a Deny beats every Allow. You will see that in the next lesson.) At the start, nobody was in a group, so the
            whole table said No: the default deny in action.
          </p>
          <p>
            Groups also make change easy. When Priya moves from development to analysis, you do not rewrite her
            permissions. You move her from Developers to Analysts, and her access follows.
          </p>
        </Prose>
      </Section>

      <Section title="Least privilege: start small, add when needed">
        <Prose>
          <p>
            The quickest way to get everyone working is to put everyone in Admins. Everything works and nobody is ever
            blocked, which is why the missions above would not let you do it. It is also the most dangerous setup you
            could choose.
          </p>
          <ul>
            <li>
              <strong>Mistakes grow.</strong> If Marcus has admin access, one wrong click can empty a whole bucket of
              customer files instead of just reading a report.
            </li>
            <li>
              <strong>
                Stolen <Term k="credentials">credentials</Term> do more harm.
              </strong>{' '}
              If an attacker steals the password of an admin, they can do almost anything: create their own sign-ins,
              delete backups, or run expensive servers on your bill.
            </li>
            <li>
              <strong>Nobody can tell who needs what.</strong> When everyone can do everything, a list of who has
              access tells you nothing.
            </li>
          </ul>
          <p>
            The fix is <Term k="least-privilege">least privilege</Term>: give each identity only the permissions its
            job needs, and nothing more. Start small. When someone is blocked from a task they really need, add that
            one permission.
          </p>
          <p>
            AWS managed policies are a good place to start, but they are written for every AWS customer, so they are
            often broader than you need. For Marcus, ReadOnlyAccess would also open every other service and your bills,
            and even AmazonS3ReadOnlyAccess lets him read every bucket, not only the sales files. As you learn what each person really uses, you can replace them with customer managed
            policies that you write yourself.
          </p>
        </Prose>

        <Callout kind="real-aws">
          <p>
            <Term k="iam-access-analyzer">IAM Access Analyzer</Term> can find access that nobody uses: unused roles,
            unused <Term k="access-key">access keys</Term> and passwords, and permissions that were granted but never used. Its unused-access
            analysis is a paid feature, even though IAM itself is free.
          </p>
        </Callout>

        <Checkpoint
          question="Marcus only needs to read sales files stored in S3. Which setup follows least privilege best?"
          options={[
            'Put him in Admins, so he is never blocked.',
            'Attach PowerUserAccess, because it cannot create IAM users.',
            'Attach ReadOnlyAccess, because it cannot change anything.',
            'Attach AmazonS3ReadOnlyAccess to the Analysts group, and add Marcus to that group.',
          ]}
          answer={3}
          explanation={
            <p>
              AmazonS3ReadOnlyAccess lets Marcus list and read files in every S3 bucket in the account, and nothing
              else. Of these choices it fits best, and attaching it to the Analysts group keeps access organised by
              job. ReadOnlyAccess is tempting, but it also lets him look through every other service and your bills.
              PowerUserAccess and AdministratorAccess let him change and delete almost everything. Tighter still would
              be a customer managed policy that allows reading only the sales bucket, like read-sales-data in the
              building blocks above.
            </p>
          }
        />
      </Section>

      <Section title="Two gates on every request">
        <Prose>
          <p>
            Back to the badge and the key card. Almost every request to AWS passes two gates, in order. First,
            authentication: AWS checks the credentials to find out who is asking. Second, authorization:
            IAM looks at that identity’s policies to decide whether this exact <Term k="action">action</Term> is
            allowed.
          </p>
          <p>
            Follow one request through both gates: deleting a file from an S3 <Term k="bucket">bucket</Term>. Sam and
            Priya are set up as in the team simulation’s suggested setup: Sam in ReadOnly, Priya in Developers.
          </p>
        </Prose>

        <TwoGatesSim />

        <Prose>
          <p>
            Sam and Priya both passed the first gate: AWS knew exactly who they were. Only the second gate treated them
            differently, because their policies differ. The attacker never got past the first gate, because Sam had MFA
            turned on and a stolen password without the MFA code is not enough.
          </p>
          <p>
            Keep the two gates apart in your head. An Access Denied error almost never means a wrong password. It means
            AWS knows who you are, but the policies that apply to the request do not allow that action. Usually those
            are your own policies, but sometimes it is a Deny somewhere else, which you will meet later.
          </p>
        </Prose>

        <Checkpoint
          question="Lena is in the Finance group, which has only the Billing policy. She signs in with her password and the code from her phone. Then she tries to launch an EC2 server and gets an error: You are not authorized to perform this operation. Which gate stopped her?"
          options={[
            'Authentication: AWS did not know who she was.',
            'Authorization: AWS knew who she was, but her policies do not allow launching servers.',
            'Both gates failed.',
            'Neither. That error means her password was wrong.',
          ]}
          answer={1}
          explanation={
            <p>
              She passed authentication when her password and MFA code matched. The error came from the authorization
              check: her only policy, Billing, does not allow ec2:RunInstances, so the default deny applies. (EC2 calls
              this error UnauthorizedOperation. S3 calls the same kind of error AccessDenied.)
            </p>
          }
        />
      </Section>

      <Section title="People sign in with Identity Center, apps use roles">
        <Prose>
          <p>
            So far, every person in this lesson had an IAM user with a password. That is the classic setup, and you
            will see it in many older accounts. Today AWS recommends something safer for most cases, because long-term
            credentials keep working until someone changes them, even if they leaked months ago.
          </p>
          <p>
            AWS’s security best practices ask for <Term k="temporary-credentials">temporary credentials</Term>{' '}
            wherever possible: for people through an{' '}
            <Term
              k="federation"
              def="A sign-in service, such as IAM Identity Center or your company login, that tells AWS who someone is."
            >
              identity provider
            </Term>{' '}
            such as IAM Identity Center, and for apps
            through IAM roles.
          </p>
        </Prose>

        <AccessChoices />

        <Prose>
          <p>
            Whichever you use, require MFA for every person who signs in, and above all for the root user. Where you
            can, AWS recommends MFA that resists <Term k="phishing">phishing</Term>, such as{' '}
            <Term k="passkey">passkeys or security keys</Term>. A fake sign-in page can trick someone into typing a
            six-digit code as well as a password, but a passkey only works on the real AWS site.
          </p>
        </Prose>

        <Callout kind="warning">
          <p>
            Never share one sign-in between people or apps. With a shared login you cannot tell who did what, and you
            cannot remove one person’s access without changing it for everyone else.
          </p>
        </Callout>

        <Prose>
          <p>
            Users, groups and policies are the foundation, and the same policy ideas apply to roles and to Identity
            Center. Next, you will open a policy and read it line by line in{' '}
            <a href={href.lesson('foundations', 'iam-policies')}>Reading and testing policies</a>.
          </p>
        </Prose>

        <Takeaways
          items={[
            <>
              IAM answers two questions about every request: who are you (authentication) and are you allowed
              (authorization). It is global and costs nothing extra.
            </>,
            <>
              Users, groups and roles are identities. Policies are JSON permission lists you attach to them. A group
              only hands out permissions: it cannot sign in or hold other groups.
            </>,
            <>Everything starts denied. A new identity can do nothing until a policy allows it.</>,
            <>
              Give access by job: make groups, attach policies to the groups, and put people in them. Follow least
              privilege: start small and add only what is needed.
            </>,
            <>
              Prefer IAM Identity Center for people and roles for apps, so credentials are temporary. Turn on MFA for
              every human sign-in.
            </>,
          ]}
        />
      </Section>
    </>
  )
}
