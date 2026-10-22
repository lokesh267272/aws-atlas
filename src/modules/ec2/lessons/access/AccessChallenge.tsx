import { useState } from 'react'
import { HardHat, KeyRound } from 'lucide-react'
import { Bench } from '../../../../components/lesson'
import { Pill, Segmented } from '../../../../components/controls'
import { Challenge, useChallenge } from '../../../../components/Challenge.tsx'
import { Term } from '../../../../components/Term'
import { challengeStart, checks, solution, solved, type PhotosAccess } from './accessModel'
import { TrafficGate, useGate } from './TrafficGate'

type Photos = Exclude<PhotosAccess, null>

/** "Challenge: lock it down": fix a setup that is too open, then press Start traffic to test it. */
export function AccessChallenge() {
  const gate = useGate(challengeStart.rules)
  const [photos, setPhotos] = useState<Photos>(challengeStart.photos)
  const challenge = useChallenge()
  const c = checks(gate.rules, photos)

  const start = () => {
    gate.start()
    if (solved(c)) challenge.solve()
    else challenge.fail()
  }
  const showMe = () => {
    gate.apply(solution.rules)
    setPhotos(solution.photos)
    challenge.show()
  }
  const reset = () => {
    gate.reset()
    setPhotos(challengeStart.photos)
    challenge.reset()
  }

  return (
    <Bench
      title="Challenge: lock down the server"
      intro={
        <>
          Fix the <Term k="security-group">security group</Term> and the photo access, then press Start traffic to test it.
        </>
      }
      onReset={reset}
    >
      <Challenge
        goal="Let customers in, keep SSH to the office, block the rest, and keep keys off the server."
        checks={[
          { label: 'Customers get in on HTTPS (443)', done: c.customersIn },
          { label: 'SSH (22) works only from the office', done: c.sshOfficeOnly },
          { label: 'Nothing else gets in', done: c.nothingElse },
          { label: 'The app reaches the photos without a stored key', done: c.photosWithoutKey },
        ]}
        state={challenge.state}
        hint="Customers come from anywhere, SSH only from the office address, the database port needs no rule, and a role replaces the key."
        onHint={challenge.hint}
        onShowMe={showMe}
        successNote="Only two doors are open, and the app borrows short-lived credentials instead of keeping a key."
      />

      <div className="mt-5">
        <TrafficGate
          gate={gate}
          onStart={start}
          serverBadge={
            photos === 'role' ? (
              <Pill tone="ok" className="max-w-full whitespace-normal text-center leading-tight [&_svg]:shrink-0">
                <HardHat aria-hidden />
                Role attached
              </Pill>
            ) : (
              <Pill tone="warn" className="max-w-full whitespace-normal text-center leading-tight [&_svg]:shrink-0">
                <KeyRound aria-hidden />
                Key on disk
              </Pill>
            )
          }
        />
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <Segmented<Photos>
          label="How the app reaches the menu photos"
          value={photos}
          onChange={setPhotos}
          options={[
            { value: 'access-key', label: 'Paste an access key' },
            { value: 'role', label: 'Attach a role' },
          ]}
        />
      </div>
    </Bench>
  )
}
