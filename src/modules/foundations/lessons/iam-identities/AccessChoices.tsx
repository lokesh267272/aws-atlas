import type { ReactNode } from 'react'
import { KeyRound, Server, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Term } from '../../../../components/Term'

interface Row {
  icon: LucideIcon
  who: ReactNode
  use: ReactNode
  why: ReactNode
}

const rows: Row[] = [
  {
    icon: Users,
    who: 'People on your team, such as developers, analysts and finance staff',
    use: (
      <>
        <Term k="iam-identity-center">IAM Identity Center</Term>: one sign-in (<Term k="sso">single sign-on</Term>) to
        every AWS account they need
      </>
    ),
    why: 'They get temporary credentials that expire on their own. You can connect your company’s existing sign-in and manage everyone’s access in one place.',
  },
  {
    icon: Server,
    who: 'Apps and AWS services, such as code running on an EC2 server',
    use: 'An IAM role',
    why: 'AWS hands the app temporary credentials automatically, so there are no keys to store in code or to leak.',
  },
  {
    icon: KeyRound,
    who: 'A tool that can use neither, such as some third-party software',
    use: 'An IAM user with an access key, only as an exception',
    why: 'Keep the key out of your code, replace it when needed (for example when someone leaves), and delete it when nothing uses it.',
  },
]

/** Who should sign in how. Becomes stacked blocks on narrow screens. */
export function AccessChoices() {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-line bg-panel">
      <table className="w-full border-collapse text-left text-[0.98rem]">
        <caption className="sr-only">Recommended way to give access, by who needs it</caption>
        <thead className="bg-sunken text-sm max-sm:sr-only">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-bold text-ink-2">
              Who needs access
            </th>
            <th scope="col" className="px-4 py-2.5 font-bold text-ink-2">
              What AWS recommends
            </th>
            <th scope="col" className="px-4 py-2.5 font-bold text-ink-2">
              Why
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const Icon = r.icon
            return (
              <tr key={i} className="border-t border-line align-top first:border-t-0 sm:first:border-t max-sm:block max-sm:px-4 max-sm:py-3">
                <th scope="row" className="font-bold text-ink max-sm:block sm:w-[30%] sm:px-4 sm:py-3">
                  <span className="flex gap-2">
                    <Icon aria-hidden className="mt-1 size-4 shrink-0 text-ink-3" />
                    <span>{r.who}</span>
                  </span>
                </th>
                <td className="text-ink max-sm:mt-1.5 max-sm:block sm:w-[32%] sm:px-4 sm:py-3">
                  <span className="text-sm text-ink-3 sm:hidden">Use: </span>
                  {r.use}
                </td>
                <td className="text-ink-2 max-sm:mt-1.5 max-sm:block sm:px-4 sm:py-3">
                  <span className="text-sm text-ink-3 sm:hidden">Why: </span>
                  {r.why}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
