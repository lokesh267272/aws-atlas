import { useState, type ReactNode } from 'react'
import { ArrowDown, Boxes, Footprints, Server, Siren, UserRound, UserRoundCheck, Users, Zap } from 'lucide-react'
import { Segmented } from '../../../../components/controls'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import { ActorChip, FlowArrow, RoleTile } from './parts'

type UseId = 'services' | 'cross' | 'people' | 'emergency'

interface UseCase {
  label: string
  title: string
  body: ReactNode
  trusts: ReactNode
  diagram: ReactNode
}

const mono = (s: string) => <code className="font-mono text-[0.85em] text-ink wrap-anywhere">{s}</code>

const useCases: Record<UseId, UseCase> = {
  services: {
    label: 'AWS services',
    title: 'AWS services acting for you',
    body: (
      <>
        Many AWS services call other services on your behalf. You give them a role whose trust policy names the service. An EC2 instance
        wears its role through an instance profile; a Lambda function wears its execution role. Your code gets temporary credentials and never
        stores a key.
      </>
    ),
    trusts: (
      <>
        {mono('ec2.amazonaws.com')} for PhotoReader, {mono('lambda.amazonaws.com')} for ThumbnailMaker
      </>
    ),
    diagram: (
      <Boundary kind="account" label="Your account 123456789012">
        <div className="grid gap-4">
          <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-3">
            <ServiceTile name="EC2 instance" caption="runs the photo app" category="compute" icon={Server} />
            <FlowArrow label="wears, through an instance profile" />
            <RoleTile name="PhotoReader" />
          </div>
          <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-3">
            <ServiceTile name="Lambda function" caption="makes thumbnails" category="compute" icon={Zap} />
            <FlowArrow label="wears as its execution role" />
            <RoleTile name="ThumbnailMaker" />
          </div>
        </div>
      </Boundary>
    ),
  },
  cross: {
    label: 'Another account',
    title: 'Cross-account access',
    body: (
      <>
        Companies often use many AWS accounts, for example one per team. To let a partner team read your photos, you create a role in your
        account that trusts their account. Their admin then allows specific people to assume it. Both accounts must say yes.
      </>
    ),
    trusts: (
      <>
        {mono('arn:aws:iam::111122223333:root')} (the :root ending means the whole account, not its root user), which hands the final
        decision to that account’s admin
      </>
    ),
    diagram: (
      <div className="flex flex-col items-stretch gap-1 md:flex-row md:items-center md:gap-3">
        <Boundary kind="account" label="Partner account 111122223333" className="md:flex-1">
          <ActorChip name="Developer" caption="allowed sts:AssumeRole on PartnerReader" icon={UserRound} />
        </Boundary>
        <FlowArrow label="assumes" />
        <Boundary kind="account" label="Your account 123456789012" className="md:flex-1">
          <div className="grid gap-2">
            <RoleTile name="PartnerReader" caption="IAM role that trusts 111122223333" />
            <ServiceTile name="example-photos" caption="S3 bucket the role may read" category="storage" icon={Boxes} />
          </div>
        </Boundary>
      </div>
    ),
  },
  people: {
    label: 'People',
    title: 'People signing in through IAM Identity Center',
    body: (
      <>
        AWS recommends that people sign in through IAM Identity Center instead of using IAM users with long-term passwords and keys. An admin
        assigns a permission set to a person for an account, and Identity Center creates a matching IAM role in that account, with a name that
        starts with {mono('AWSReservedSSO_')}. Akua signs in once, picks an account and a role, and works with temporary credentials.
      </>
    ),
    trusts: <>IAM Identity Center sets up and manages these trust policies for you</>,
    diagram: (
      <div className="grid gap-1">
        <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-3">
          <ActorChip name="Akua" caption="signs in once at the AWS access portal" icon={UserRoundCheck} />
          <FlowArrow label="signs in" />
          <ServiceTile name="IAM Identity Center" caption="one sign-in for many accounts" category="security" icon={Users} />
        </div>
        <div className="flex items-center gap-1.5 py-1 text-ink-3">
          <ArrowDown aria-hidden className="size-5 shrink-0" />
          <span className="text-xs font-bold">assumes a role for her, in the account she picks</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Boundary kind="account" label="Account 123456789012">
            <RoleTile name="AWSReservedSSO_ReadOnly_1234567890abcdef" caption="made from the ReadOnly permission set" size="sm" />
          </Boundary>
          <Boundary kind="account" label="Account 111122223333">
            <RoleTile name="AWSReservedSSO_ReadOnly_abcdef0123456789" caption="same permission set, its own role" size="sm" />
          </Boundary>
        </div>
      </div>
    ),
  },
  emergency: {
    label: 'Emergencies',
    title: 'Break-glass emergency access',
    body: (
      <>
        If your normal sign-in system is down, you still need a way in. Teams prepare an emergency role or user ahead of time, protect it with
        MFA, use it only in a real emergency, and review every use. This path does not depend on IAM Identity Center, so it still works when
        Identity Center is down. Like a fire alarm behind glass: rarely touched, and noticed when it is.
      </>
    ),
    trusts: <>only a few named administrators, and only when they signed in with MFA</>,
    diagram: (
      <div className="flex flex-col items-stretch gap-1 md:flex-row md:items-center md:gap-3">
        <ActorChip name="On-call admin" caption="uses a separate emergency IAM user with MFA" icon={Siren} className="md:max-w-48" />
        <FlowArrow label="signs in as the emergency user (MFA), then assumes" />
        <Boundary kind="account" label="Your account 123456789012" className="md:flex-1">
          <div className="grid gap-2">
            <RoleTile name="BreakGlassAdmin" caption="IAM role, rarely used" />
            <ServiceTile name="CloudTrail" caption="records every use, so alerts can fire" category="management" icon={Footprints} />
          </div>
        </Boundary>
      </div>
    ),
  },
}

const order: UseId[] = ['services', 'cross', 'people', 'emergency']

export function RoleUses() {
  const [pick, setPick] = useState<UseId>('services')
  const u = useCases[pick]
  return (
    <figure className="my-8 rounded-lg border border-line bg-panel p-4 sm:p-5" aria-label="Where roles show up">
      <Segmented<UseId>
        label="Pick a situation"
        value={pick}
        onChange={setPick}
        options={order.map((id) => ({ value: id, label: useCases[id].label }))}
      />
      <div className="mt-5 min-w-0">{u.diagram}</div>
      <figcaption aria-live="polite" className="mt-5 max-w-[68ch] border-t border-line pt-4">
        <h3 className="font-bold text-ink">{u.title}</h3>
        <p className="mt-1 text-ink-2">{u.body}</p>
        <p className="mt-2 text-sm text-ink-2">
          <span className="font-bold text-ink">The trust policy names: </span>
          {u.trusts}
        </p>
      </figcaption>
    </figure>
  )
}
