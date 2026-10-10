import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Bench } from '../../../../components/lesson'
import { Segmented } from '../../../../components/controls'
import { cn } from '../../../../lib/cn'
import { LAYERS, MODELS, MODEL_ORDER, providerManages, type ModelId } from './layersData'
import { OwnerBadge, OwnerKey } from './OwnerBadge'
import { ownerRow } from './owner'

type LineTransition = { duration: number } | { type: 'spring'; stiffness: number; damping: number }

/** The divider between "you manage" and "the provider manages". It glides to its new place when the model changes. */
function ResponsibilityLine({
  transition,
  className,
  label = 'Line of responsibility',
}: {
  transition: LineTransition
  className?: string
  label?: string
}) {
  return (
    <motion.div
      layoutId="cloud-basics-responsibility-line"
      transition={transition}
      className={cn('flex items-center gap-2 text-xs font-bold text-ink-2', className)}
      aria-hidden
    >
      <span className="h-0.5 flex-1 bg-ink" />
      {label}
      <span className="h-0.5 flex-1 bg-ink" />
    </motion.div>
  )
}

export function LayersSim() {
  const reduce = useReducedMotion()
  const [modelId, setModelId] = useState<ModelId>('onprem')
  const model = MODELS[modelId]
  const youCount = LAYERS.length - model.providerLayers
  const providerName = modelId === 'saas' ? 'Provider' : 'AWS'
  const splitAt = LAYERS.length - model.providerLayers
  const transition = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 34 }

  return (
    <Bench
      title="Try it: who manages what"
      intro="Switch between the four ways to run an app. Everything above the line is your job; everything below it, the provider handles."
      onReset={() => setModelId('onprem')}
    >
      <Segmented<ModelId>
        label="How you run your app"
        value={modelId}
        onChange={setModelId}
        options={MODEL_ORDER.map((id) => ({
          value: id,
          label: MODELS[id].label,
          description: MODELS[id].example,
        }))}
      />

      <p className="mt-3 text-sm font-bold text-ink" aria-live="polite">
        You manage {youCount} of {LAYERS.length} layers
        {model.providerLayers > 0 ? `; ${model.provider} manages ${model.providerLayers}.` : '.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2" aria-hidden>
        <OwnerKey owner="you" label="You manage" />
        <OwnerKey
          owner="provider"
          label={
            modelId === 'saas'
              ? 'The provider manages'
              : modelId === 'onprem'
                ? 'A provider manages (none on-premises)'
                : 'AWS manages'
          }
        />
      </div>

      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_17rem]">
        <ol aria-label={`Layers for ${model.label}, top to bottom`} className="space-y-1.5">
          {LAYERS.map((layer, i) => {
            const owner = providerManages(model, i) ? 'provider' : 'you'
            const Icon = layer.icon
            const note = model.notes[layer.id]
            return (
              <motion.li key={layer.id} layout={reduce ? false : 'position'} transition={transition}>
                {i === splitAt && <ResponsibilityLine transition={transition} className="mb-1.5" />}
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border-2 px-3 py-2 transition-colors duration-300',
                    ownerRow[owner],
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{layer.name}</span>
                    {note && (
                      <span className={cn('block text-xs', owner === 'provider' ? 'text-white/80' : 'text-ink-3')}>
                        {note}
                      </span>
                    )}
                  </span>
                  <OwnerBadge owner={owner} providerName={providerName} />
                </div>
                {i === LAYERS.length - 1 && splitAt === LAYERS.length && (
                  <ResponsibilityLine transition={transition} className="mt-1.5" label="Everything above this line is yours" />
                )}
              </motion.li>
            )
          })}
        </ol>

        <aside className="self-start rounded-md border border-line bg-paper/60 p-4">
          <p className="display text-lg text-ink">{model.label}</p>
          <p className="text-sm text-ink-3">{model.example}</p>
          <p className="mt-3 text-ink-2">{model.summary}</p>
          <p className="mt-3 text-sm text-ink-2">
            <strong className="text-ink">Bakery version: </strong>
            {model.bakery}
          </p>
        </aside>
      </div>

      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
        Simplified: real services differ in the details. For example, with Elastic Beanstalk you choose whether AWS applies
        patch and minor operating system and runtime updates automatically, and moving to a new major version is up to
        you; on EC2 you still configure virtual network settings. In every model, your data and who can access it stay
        your responsibility.
      </p>
    </Bench>
  )
}
