import { z } from 'zod'
import { mq } from 'lib'
import { OutputSchema, zhexstring } from 'lib/types'
import { ResolveHooks } from '../abis/types'
import { requireHooks } from '../abis'

export const DataSchema = z.object({
  abiPath: z.string(),
  chainId: z.number(),
  address: zhexstring,
  outputLabel: z.string(),
  blockTime: z.bigint({ coerce: true })
})

export type Data = z.infer<typeof DataSchema>

export class TimeseriesExtractor {
  resolveHooks: ResolveHooks | undefined

  async extract(data: Data) {
    data = DataSchema.parse(data)
    const { abiPath, chainId, address, outputLabel } = data
    if (!this.resolveHooks) this.resolveHooks = await requireHooks()

    const hooks = this.resolveHooks(abiPath, 'timeseries')
    const hook = hooks.find(hook => hook.module.outputLabel === outputLabel)
    if (!hook) throw new Error(`!hook, ${outputLabel}`)

    const outputs = OutputSchema.array().parse(
      await hook.module.default(chainId, address, data)
    )

    await mq.add(mq.job.load.output, { batch: outputs })
  }
}
