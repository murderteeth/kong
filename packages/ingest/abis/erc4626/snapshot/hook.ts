import { EvmAddressSchema, ThingSchema } from 'lib/types'
import { z } from 'zod'
import { fetchOrExtractErc20 } from '../../yearn/lib'
import { mq } from 'lib'

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { asset } = z.object({ asset: EvmAddressSchema }).parse(data)

  const erc20 = await fetchOrExtractErc20(chainId, asset)
  await mq.add(mq.job.load.thing, ThingSchema.parse({
    chainId, address: asset, label: 'erc20', defaults: erc20
  }))

  return { asset: erc20 }
}
