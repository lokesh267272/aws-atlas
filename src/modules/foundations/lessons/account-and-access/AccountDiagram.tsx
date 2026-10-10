import { useState, type ReactNode } from 'react'
import { Ban, Boxes, Database, Receipt, Server, Users } from 'lucide-react'
import { Segmented } from '../../../../components/controls'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import { cn } from '../../../../lib/cn'

type Aspect = 'container' | 'bill' | 'security'

const explain: Record<Aspect, ReactNode> = {
  container: (
    <>
      <strong>A container.</strong> Everything you create lives inside exactly one account. The production server and the
      testing server sit in different accounts, so they never get mixed up.
    </>
  ),
  bill: (
    <>
      <strong>A billing boundary.</strong> AWS adds up what is used inside each account and bills it. A company with many
      accounts can use AWS Organizations to combine them into one bill.
    </>
  ),
  security: (
    <>
      <strong>A security boundary.</strong> Each account has its own root user and its own identities. People in the
      testing account cannot touch production unless someone deliberately allows it.
    </>
  ),
}

function Row({ icon: Icon, active, children }: { icon: typeof Receipt; active: boolean; children: ReactNode }) {
  return (
    <p
      className={cn(
        'mt-2 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
        active ? 'border-signal bg-signal-soft font-bold text-ink' : 'border-line text-ink-3',
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {children}
    </p>
  )
}

function AccountBox({
  name,
  id,
  servers,
  aspect,
}: {
  name: string
  id: string
  servers: { label: string; caption: string }[]
  aspect: Aspect
}) {
  const icons = [Server, Boxes, Database] as const
  const cats = ['compute', 'storage', 'database'] as const
  return (
    <Boundary kind="account" label={`${name} account`} highlighted={aspect === 'security'}>
      <p className="mb-1.5 font-mono text-xs text-ink-2">Account ID {id}</p>
      <div
        className={cn(
          'flex flex-wrap gap-1.5 rounded-md p-1 transition-colors',
          aspect === 'container' && 'bg-signal-soft outline-2 outline-signal',
        )}
      >
        {servers.map((s, i) => (
          <ServiceTile key={s.label} name={s.label} caption={s.caption} category={cats[i]} icon={icons[i]} size="sm" />
        ))}
      </div>
      <Row icon={Receipt} active={aspect === 'bill'}>
        Its own bill
      </Row>
      <Row icon={Users} active={aspect === 'security'}>
        Its own root user and identities
      </Row>
    </Boundary>
  )
}

/** Two accounts inside the AWS Cloud, with a switch for the three things an account is. */
export function AccountDiagram() {
  const [aspect, setAspect] = useState<Aspect>('container')
  return (
    <figure
      aria-label="Two AWS accounts, Production and Testing, inside the AWS Cloud"
      className="my-8 rounded-lg border border-line bg-panel p-4 sm:p-5"
    >
      <Segmented
        label="Look at an account as"
        value={aspect}
        onChange={setAspect}
        size="sm"
        options={[
          { value: 'container', label: 'A container' },
          { value: 'bill', label: 'A bill' },
          { value: 'security', label: 'A security boundary' },
        ]}
      />
      {/* The explanation sits right under the control, so it stays in view on phones when the choice changes. */}
      <p className="mt-3 max-w-[68ch] text-ink-2" aria-live="polite">
        {explain[aspect]}
      </p>
      <div className="mt-4">
        <Boundary kind="cloud" label="AWS Cloud">
          <div className="grid items-start gap-4 md:grid-cols-[1fr_auto_1fr]">
            <AccountBox
              name="Production"
              id="123456789012"
              aspect={aspect}
              servers={[
                { label: 'Web server', caption: 'the real shop' },
                { label: 'Photos', caption: 'product images' },
                { label: 'Orders', caption: 'customer orders' },
              ]}
            />
            <div
              className={cn(
                'flex items-center justify-center gap-2 self-center text-center text-xs font-bold transition-opacity md:w-24 md:flex-col',
                aspect === 'security' ? 'text-bad opacity-100' : 'text-ink-3 opacity-60',
              )}
            >
              <Ban aria-hidden className="size-5 shrink-0" />
              <span>No access across unless you allow it</span>
            </div>
            <AccountBox
              name="Testing"
              id="111122223333"
              aspect={aspect}
              servers={[
                { label: 'Test server', caption: 'try changes here' },
                { label: 'Test photos', caption: 'sample images' },
                { label: 'Test orders', caption: 'fake orders' },
              ]}
            />
          </div>
        </Boundary>
      </div>
    </figure>
  )
}
