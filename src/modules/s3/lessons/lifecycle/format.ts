import { classById, type ClassId } from '../../storageClasses'
import { s3Story } from '../../story'

/** 12345.6 → "12,346" */
export const whole = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** "$4,561" */
export const dollars = (n: number) => `${s3Story.currency}${whole(n)}`

/** "$12.40" */
export const money = (n: number) => `${s3Story.currency}${n.toFixed(2)}`

/** "1,234 GB" (under 10 GB keeps one decimal so small amounts still show). */
export const gb = (n: number) => (n > 0 && n < 10 ? `${n.toFixed(1)} GB` : `${whole(n)} GB`)

/** "S3 Glacier Deep Archive" → "Glacier Deep Archive" */
export const shortName = (id: ClassId) => classById(id).name.replace(/^S3 /, '')

/** Slider position (months) as words: "Day 0", "Month 5", "Month 12 (year 1)". */
export function monthName(m: number) {
  if (m === 0) return 'Day 0'
  return m % 12 === 0 ? `Month ${m} (year ${m / 12})` : `Month ${m}`
}
