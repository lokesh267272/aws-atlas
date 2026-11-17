import { s3Story } from '../../story'

/** "$10.00"; amounts too small to show in cents read "under $0.01". */
export function money(n: number): string {
  if (n > 0 && n < 0.005) return `under ${s3Story.currency}0.01`
  return `${s3Story.currency}${n.toFixed(2)}`
}

/** Whole currency units: "$38". */
export const dollars = (n: number) => `${s3Story.currency}${Math.round(n)}`

/** "2,000 GB", "20 GB", "50 MB", "3 MB" (1 GB = 1,000 MB, as in the example sizes). */
export function size(gb: number): string {
  if (gb < 1) return `${Math.round(gb * 1000).toLocaleString('en-US')} MB`
  return `${Math.round(gb).toLocaleString('en-US')} GB`
}

/** "1 second", "1 minute", "1 hour". */
export function within(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.round(seconds / 3600)
    return h === 1 ? '1 hour' : `${h} hours`
  }
  if (seconds >= 60) {
    const m = Math.round(seconds / 60)
    return m === 1 ? '1 minute' : `${m} minutes`
  }
  return seconds === 1 ? '1 second' : `${seconds} seconds`
}
