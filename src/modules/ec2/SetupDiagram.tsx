import { Camera, Database, HardDrive, KeyRound, Network, Scaling, Server, ShieldCheck } from 'lucide-react'
import { Bench } from '../../components/lesson'
import { Term } from '../../components/Term'
import { Boundary, ServiceTile } from '../../components/diagram'
import { story } from './story'

type Step = 1 | 2 | 3 | 4 | 5 | 6

/** "Your setup so far": the delivery app's architecture, growing one piece per lesson. The piece added at `step` is highlighted. */
export function SetupDiagram({ step }: { step: Step }) {
  return (
    <Bench title="Your setup so far" intro="The highlighted part is what this lesson added to the delivery app.">
      <Boundary kind="region" label={story.regionName}>
        <div className="flex flex-col gap-3">
          <Boundary kind="vpc" label={
              <>
                {story.appName} network (<Term k="vpc">VPC</Term>)
              </>
            }>
            {step >= 4 && (
              <div className="mb-3 flex flex-wrap gap-x-3 gap-y-2">
                <ServiceTile name="Security group" category="security" icon={ShieldCheck} selected={step === 4} />
              </div>
            )}
            {step === 6 ? <ScaledOut /> : <SingleAz step={step} />}
          </Boundary>
          {step >= 3 && (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <ServiceTile
                name="Snapshot"
                category="storage"
                icon={Camera}
                caption="backup outside the AZ"
                selected={step === 3}
              />
              {step >= 4 && (
                <ServiceTile
                  name="Server role"
                  category="security"
                  icon={KeyRound}
                  caption="attached to the server"
                  selected={step === 4}
                />
              )}
            </div>
          )}
        </div>
      </Boundary>
    </Bench>
  )
}

/** Steps 1 to 5: everything runs in one Availability Zone. */
function SingleAz({ step }: { step: Step }) {
  return (
    <Boundary kind="az" label={story.azs[0]}>
      <div className="flex flex-wrap gap-x-4 gap-y-3">
        {step === 5 ? (
          <>
            <ServiceTile name="Website" category="compute" icon={Server} caption="Savings Plan" selected />
            <ServiceTile name="Route planning" category="compute" icon={Server} caption="Spot" selected />
            <ServiceTile name="Busy-night extra" category="compute" icon={Server} caption="On-Demand" selected />
          </>
        ) : (
          <ServiceTile
            name="Server"
            category="compute"
            icon={Server}
            caption={step >= 2 ? 'right size' : undefined}
            selected={step <= 2}
          />
        )}
        {step >= 3 && (
          <ServiceTile name="Disk" category="storage" icon={HardDrive} caption="EBS volume" selected={step === 3} />
        )}
      </div>
    </Boundary>
  )
}

/** Step 6: a load balancer in front of servers in three AZs, with the orders database split across two of them. */
function ScaledOut() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <ServiceTile name="Load balancer" category="networking" icon={Network} selected />
        <ServiceTile name="Auto Scaling group" category="compute" icon={Scaling} caption="spans 3 AZs" selected />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {story.azs.map((az, i) => (
          <Boundary key={az} kind="az" label={az}>
            <div className="flex flex-col gap-3">
              <ServiceTile name="Server" category="compute" icon={Server} selected />
              {i < 2 && (
                <ServiceTile
                  name="Orders database"
                  category="database"
                  icon={Database}
                  caption={`${i === 0 ? 'primary' : 'standby'}, later module`}
                  muted
                />
              )}
            </div>
          </Boundary>
        ))}
      </div>
    </div>
  )
}
