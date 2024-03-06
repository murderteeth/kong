import { z } from 'zod'
import { mq } from 'lib'
import { toEventSelector } from 'viem'
import { estimateCreationBlock, getBlockTime } from 'lib/blocks'
import { ThingSchema, zhexstring } from 'lib/types'

export const topics = [
  `event NewDebtAllocator(address indexed allocator, address indexed vault)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { allocator, vault } = z.object({
    allocator: zhexstring,
    vault: zhexstring
  }).parse(data.args)

  const block = await estimateCreationBlock(chainId, vault)
  const inceptBlock = block.number
  const inceptTime = await getBlockTime(chainId, inceptBlock)

  await mq.add(mq.q.load, mq.job.load.thing, ThingSchema.parse({
    chainId,
    address: allocator,
    label: 'debtAllocator',
    defaults: {
      inceptBlock,
      inceptTime
    }
  }))

  await mq.add(mq.q.load, mq.job.load.thing, ThingSchema.parse({
    chainId,
    address: vault,
    label: 'vault',
    defaults: { debtAllocator: allocator }
  }))
}
