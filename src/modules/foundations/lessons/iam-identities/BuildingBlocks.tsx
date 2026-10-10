import { useState, type ReactNode } from 'react'
import { FileBraces, HardHat, User, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Segmented } from '../../../../components/controls'
import { Boundary } from '../../../../components/diagram'
import { CodeBlock } from '../../../../components/CodeBlock'
import { Term } from '../../../../components/Term'
import { cn } from '../../../../lib/cn'
import { href } from '../../../../lib/router'

type Block = 'principal' | 'user' | 'group' | 'role' | 'policy'

const blockOptions: { value: Block; label: string }[] = [
  { value: 'principal', label: 'Principal' },
  { value: 'user', label: 'IAM user' },
  { value: 'group', label: 'IAM group' },
  { value: 'role', label: 'IAM role' },
  { value: 'policy', label: 'Policy' },
]

/** Which diagram pieces light up for each building block */
const lit: Record<Block, { users: boolean; group: boolean; role: boolean; policies: boolean }> = {
  principal: { users: true, group: false, role: true, policies: false },
  user: { users: true, group: false, role: false, policies: false },
  group: { users: false, group: true, role: false, policies: false },
  role: { users: false, group: false, role: true, policies: false },
  policy: { users: false, group: false, role: false, policies: true },
}

/* ------------------------------------------------------------------ Tiles */

function Tile({
  icon: Icon,
  name,
  caption,
  active,
  dimmed,
}: {
  icon: LucideIcon
  name: string
  caption: string
  active: boolean
  dimmed: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-md border bg-panel p-1.5 pr-2.5 transition-opacity',
        active ? 'border-signal bg-signal-soft outline-2 outline-signal' : 'border-line',
        dimmed && 'opacity-40',
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-[4px] bg-security text-white">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-bold leading-tight text-ink">{name}</span>
        <span className="block text-xs leading-tight text-ink-3">{caption}</span>
      </span>
      {active && <span className="sr-only">(highlighted)</span>}
    </div>
  )
}

/* ------------------------------------------------------------ Explanations */

const s3ReadOnlyJson = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:Get*", "s3:List*", "s3:Describe*",
                 "s3-object-lambda:Get*", "s3-object-lambda:List*"],
      "Resource": "*"
    }
  ]
}`

function Explanation({ block }: { block: Block }) {
  const body: Record<Block, ReactNode> = {
    principal: (
      <>
        <p>
          A <Term k="principal">principal</Term> is whoever is making a request to AWS right now: a person or an app,
          using an IAM user or an IAM role. The <Term k="root-user">root user</Term> is a principal too.
        </p>
        <ul>
          <li>Users can be principals, because they sign in.</li>
          <li>A role becomes a principal while someone or something has assumed it.</li>
          <li>
            A group is <strong>never</strong> a principal. It cannot sign in or send a request. It only hands
            permissions to its members.
          </li>
        </ul>
      </>
    ),
    user: (
      <>
        <p>
          An <Term k="iam-user">IAM user</Term> is an identity for one person or one app. It has long-term{' '}
          <Term k="credentials">credentials</Term>: a console password for the AWS website, and/or{' '}
          <Term k="access-key">access keys</Term> for the command line and code.
        </p>
        <ul>
          <li>Long-term means they keep working until someone changes or deletes them.</li>
          <li>
            A brand-new IAM user has <strong>no permissions at all</strong>.
          </li>
          <li>AWS now recommends other ways for people and apps to sign in. You will see them at the end of this lesson.</li>
        </ul>
      </>
    ),
    group: (
      <>
        <p>
          An <Term k="iam-group">IAM group</Term> is a set of IAM users that share permissions. Attach a policy to the
          group once, and every member gets it. Move a person to another group when their job changes.
        </p>
        <ul>
          <li>A user can be in several groups. Here, marcus is in none.</li>
          <li>Groups cannot contain other groups. They hold only users.</li>
          <li>A group cannot sign in, and you cannot name it as the principal in a policy.</li>
          <li>There is no built-in group that holds every user. You create the groups you need.</li>
        </ul>
      </>
    ),
    role: (
      <>
        <p>
          An <Term k="iam-role">IAM role</Term> has permissions but no password and no long-term keys. A trusted person,
          app or AWS service <Term k="assume-role">assumes</Term> it for a while and receives{' '}
          <Term k="temporary-credentials">temporary credentials</Term> that expire on their own.
        </p>
        <ul>
          <li>Here, an app on an EC2 server uses app-server-role to read files, with no keys stored on the server.</li>
          <li>
            You will set one up in{' '}
            <a href={href.lesson('foundations', 'iam-roles')}>Roles and temporary credentials</a>.
          </li>
        </ul>
      </>
    ),
    policy: (
      <>
        <p>
          A policy is a <Term k="json">JSON</Term> document that lists permissions: which actions are allowed or denied,
          on which resources. The policies in this lesson are attached to users, groups or roles, so they are called{' '}
          <Term k="identity-based-policy">identity-based policies</Term>. They come in three kinds:
        </p>
        <ul>
          <li>
            <strong>AWS managed</strong>: written and kept up to date by AWS. You can attach it but not edit it.
          </li>
          <li>
            <strong>Customer managed</strong>: written by you, and reusable on many identities.
          </li>
          <li>
            <strong>Inline</strong>: an <Term k="inline-policy">inline policy</Term> lives inside one identity and is
            deleted with it.
          </li>
        </ul>
        <p>
          Here is a real one: AmazonS3ReadOnlyAccess, which you will meet again in the team simulation. The highlighted
          lines list the actions it allows: anything in S3 whose name starts with Get, List or Describe. You will read
          policies line by line in the next lesson.
        </p>
      </>
    ),
  }
  return (
    <>
      <div className="prose-lesson max-w-none text-[0.98rem]">{body[block]}</div>
      {block === 'policy' && (
        <CodeBlock
          code={s3ReadOnlyJson}
          lang="json"
          title="AmazonS3ReadOnlyAccess (AWS managed)"
          highlight={[6, 7]}
          className="mb-0 mt-4"
        />
      )}
    </>
  )
}

/* -------------------------------------------------------------- Explorer */

export function BuildingBlocks() {
  const [block, setBlock] = useState<Block>('principal')
  const on = lit[block]
  const groupMuted = block === 'role' || block === 'policy'

  return (
    <Bench
      title="Try it: explore the building blocks"
      intro="Choose a building block. The parts of the account that match it light up, and the panel explains it."
    >
      <Segmented label="Building block" value={block} onChange={setBlock} options={blockOptions} size="sm" />

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <Boundary kind="account" label="AWS account 123456789012">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-3">
                <Boundary
                  kind="group"
                  icon={Users}
                  label="IAM group: Developers"
                  highlighted={on.group}
                  muted={groupMuted}
                >
                  <div className="grid gap-2">
                    <Tile icon={User} name="priya" caption="IAM user" active={on.users} dimmed={!on.users && !on.group && !groupMuted} />
                    <Tile icon={User} name="tom" caption="IAM user" active={on.users} dimmed={!on.users && !on.group && !groupMuted} />
                  </div>
                  {block === 'principal' && (
                    <p className="mt-2 text-xs font-bold text-ink-2">The group itself is not a principal.</p>
                  )}
                </Boundary>
                <Tile
                  icon={User}
                  name="marcus"
                  caption="IAM user, in no group"
                  active={on.users}
                  dimmed={!on.users}
                />
              </div>

              <div className="min-w-0 space-y-3">
                <Boundary
                  kind="group"
                  icon={HardHat}
                  label="IAM role: app-server-role"
                  highlighted={on.role}
                  muted={!on.role && block !== 'policy'}
                >
                  <p className="mb-2 text-xs text-ink-3">Assumed by an app on EC2</p>
                  <Tile
                    icon={FileBraces}
                    name="app-files-access"
                    caption="Inline policy, lives inside this role"
                    active={on.policies}
                    dimmed={!on.policies}
                  />
                </Boundary>
                <div className="space-y-2">
                  <Tile
                    icon={FileBraces}
                    name="AmazonS3FullAccess"
                    caption="AWS managed, attached to Developers"
                    active={on.policies}
                    dimmed={!on.policies}
                  />
                  <Tile
                    icon={FileBraces}
                    name="read-sales-data"
                    caption="Customer managed, attached to marcus"
                    active={on.policies}
                    dimmed={!on.policies}
                  />
                </div>
              </div>
            </div>
          </Boundary>
          <p className="mt-2 text-xs text-ink-3">
            Simplified: a real account usually holds many more users, groups, roles and policies. The user, role and
            customer policy names here are examples.
          </p>
        </div>

        <div className="order-first min-w-0 lg:order-none">
          <h4 className="display text-lg text-ink" aria-live="polite">
            {blockOptions.find((o) => o.value === block)?.label}
          </h4>
          <div className="mt-2">
            <Explanation block={block} />
          </div>
        </div>
      </div>
    </Bench>
  )
}
