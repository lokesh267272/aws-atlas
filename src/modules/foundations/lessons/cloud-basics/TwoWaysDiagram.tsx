import { Server, Store } from 'lucide-react'
import { Boundary, ServiceTile } from '../../../../components/diagram'
import { Term } from '../../../../components/Term'

function OwnedServer() {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-line-strong bg-panel p-1 pr-2">
      <span className="grid size-8 place-items-center rounded-[4px] bg-sunken text-ink-2">
        <Server aria-hidden className="size-4" />
      </span>
      <span className="text-xs font-bold leading-tight text-ink">
        Server
        <span className="block font-normal text-ink-3">you bought</span>
      </span>
    </span>
  )
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1 text-sm text-ink-2">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-line-strong" />
          {t}
        </li>
      ))}
    </ul>
  )
}

/** Option A and option B for the bakery, drawn the way AWS architecture diagrams draw places. */
export function TwoWaysDiagram() {
  return (
    <figure className="my-8">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-2 font-bold text-ink">Option A: buy your own (on-premises)</p>
          <Boundary kind="datacenter" label="Your back room" icon={Store}>
            <div className="flex flex-wrap gap-2">
              <OwnedServer />
              <OwnedServer />
              <OwnedServer />
            </div>
          </Boundary>
          <Points
            items={[
              'You pay for the servers before you know how busy you will be',
              'You power, cool, guard and repair them',
              'Getting more can take weeks',
            ]}
          />
        </div>
        <div className="min-w-0">
          <p className="mb-2 font-bold text-ink">Option B: rent from AWS (cloud)</p>
          <Boundary kind="cloud" label="AWS Cloud">
            <Boundary kind="datacenter" label="AWS data center">
              <div className="flex flex-wrap gap-2">
                <ServiceTile name="Amazon EC2" category="compute" icon={Server} caption="virtual servers you rent" />
              </div>
            </Boundary>
          </Boundary>
          <Points
            items={[
              'Nothing to buy up front; you pay for what you use',
              'AWS runs the buildings, power and hardware',
              'More servers in minutes, with a few clicks',
            ]}
          />
        </div>
      </div>
      <figcaption className="mt-3 max-w-[68ch] text-sm text-ink-3">
        Either way, customers reach your shop over the internet. The difference is who owns the computers and who
        looks after them. <Term k="ec2">Amazon EC2</Term> is the AWS service for renting virtual servers.
      </figcaption>
    </figure>
  )
}
