/**
 * Who looks after something: you, or the provider (AWS).
 * Every simulation in this lesson uses the same look:
 * "you" is a white box with a dark outline, the provider is a dark box.
 * Wherever it appears, an icon and a word go with it, so colour is never the only signal.
 */
export type Owner = 'you' | 'provider'

export const ownerRow: Record<Owner, string> = {
  you: 'border-ink bg-panel text-ink',
  provider: 'border-cloud bg-cloud text-white',
}
