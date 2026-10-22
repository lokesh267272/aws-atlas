import { story } from '../../story'

/** "$0.10", "$12.40": the lesson's one money format. Pass more digits to see tiny amounts move. */
export const money = (n: number, digits = 2) => `${story.currency}${n.toFixed(digits)}`

/** Tiny amounts need more digits to be seen moving. */
export const fineMoney = (n: number) => money(n, n < 1 ? 5 : 2)

/** Whole currency units: "$260". */
export const dollars = (n: number) => `${story.currency}${Math.round(n)}`

/** "3 am", "noon", "7 pm" */
export function hourName(h: number) {
  const hh = ((h % 24) + 24) % 24
  if (hh === 0) return '12 am'
  if (hh === 12) return 'noon'
  return hh < 12 ? `${hh} am` : `${hh - 12} pm`
}
