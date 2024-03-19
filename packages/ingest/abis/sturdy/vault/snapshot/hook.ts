import { Thing, ThingSchema, zhexstring } from 'lib/types'
import { z } from 'zod'
import { fetchOrExtractErc20 } from '../../../yearn/lib'
import { mq } from 'lib'
import { estimateCreationBlock } from 'lib/blocks'
import { first } from '../../../../db'

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { apiVersion, name, asset } = z.object({
    apiVersion: z.string(),
    name: z.string(),
    asset: zhexstring
  }).parse(data)

  const erc20 = await fetchOrExtractErc20(chainId, asset)
  await mq.add(mq.job.load.thing, ThingSchema.parse({
    chainId, address: asset, label: 'erc20',
    defaults: erc20
  }))

  const vault = await first<Thing>(ThingSchema,
    'SELECT * FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3',
    [chainId, address, 'vault']
  )

  if (!vault) {
    const block = await estimateCreationBlock(chainId, address)
    const inceptBlock = block.number
    const inceptTime = block.timestamp
    await mq.add(mq.job.load.thing, ThingSchema.parse({
      chainId,
      address,
      label: 'vault',
      defaults: {
        apiVersion,
        registry: undefined,
        asset,
        decimals: erc20.decimals,
        inceptBlock,
        inceptTime
      }
    }))
  }

  return {}
}
