import { setTimeout } from 'timers/promises'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { dates, math, mq, multicall3, strider } from 'lib'
import { Contract, ContractSchema, SourceConfig, SourceConfigSchema } from 'lib/contracts'
import { estimateHeight, getBlockNumber } from 'lib/blocks'
import { getLocalStrides } from '../db'
import grove from 'lib/grove'
import { StrideSchema } from 'lib/types'

export default class EventsFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout(data: { contract: Contract, source: SourceConfig }) {
    const { chainId, address, inceptBlock } = SourceConfigSchema.parse(data.source)
    const { abiPath, fromIncept } = ContractSchema.parse(data.contract)

    const multicall3Activation = multicall3.getActivation(chainId)
    const defaultStartBlock = await estimateHeight(chainId, dates.DEFAULT_START())
    const from = fromIncept 
      ? inceptBlock 
      : math.max(inceptBlock, defaultStartBlock, multicall3Activation)
    const to = await getBlockNumber(chainId)

    const groveStrides = await grove().fetchStrides(chainId, address)
    const localStrides = await getLocalStrides(chainId, address)
    const nextStrides = strider.plan(from, to, localStrides)

    for (const stride of StrideSchema.array().parse(nextStrides)) {
      console.log('📤', 'stride', chainId, address, stride.from, stride.to)
      await walklog(stride, async (from, to) => {
        const useGrove = groveStrides.some(g => strider.contains(g, { from, to }))
        await this.queues[mq.q.extract].add(mq.job.extract.evmlog, {
          abiPath, chainId, address, from, to, useGrove
        })
      })
    }
  }
}

async function walklog(
  o: { from: bigint, to: bigint, stride?: bigint, throttle?: number }, 
  f: (from: bigint, to: bigint) => Promise<void>
) {
  const stride = o.stride || BigInt(process.env.LOG_STRIDE || 10_000)
  for (let fromBlock = o.from; fromBlock <= o.to; fromBlock += stride) {
    const toBlock = fromBlock + stride - 1n < o.to ? fromBlock + stride - 1n : o.to
    await f(fromBlock, toBlock)
    await setTimeout(o.throttle || 16)
  }
}
