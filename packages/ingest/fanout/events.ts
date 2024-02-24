import { setTimeout } from 'timers/promises'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { abiutil, dates, math, mq, strider } from 'lib'
import { Contract, ContractSource } from 'lib/contracts'
import { getStrides } from '../db'
import { estimateHeight, getBlockNumber } from 'lib/blocks'

export default class EventsFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout(data: { contract: Contract, source: ContractSource }) {
    const { chainId, address, incept } = data.source
    const { abi: abiPath, fromIncept } = data.contract
    const abi = await abiutil.load(abiPath)
    const events = abiutil.events(abi)

    const defaultStartBlock = await estimateHeight(chainId, dates.DEFAULT_START())
    const from = fromIncept ? incept : math.max(incept, defaultStartBlock)
    const to = await getBlockNumber(chainId)
    const alreadyIndexed = await getStrides(chainId, address)
    const strides = strider.plan(from, to, alreadyIndexed)

    for (const stride of strides) {
      console.log('📤', 'stride', chainId, address, stride.from, stride.to)
      await walklog(stride, async (from, to) => {
        await this.queues[mq.q.extract].add(mq.job.extract.evmlog, {
          chainId, address, events: JSON.stringify(events), from, to
        })
      })
    }
  }
}

async function walklog(
  o: { from: bigint, to: bigint, stride?: bigint, rest?: number }, 
  f: (from: bigint, to: bigint) => Promise<void>
) {
  const stride = o.stride || BigInt(process.env.LOG_STRIDE || 10_000)
  for (let fromBlock = o.from; fromBlock <= o.to; fromBlock += stride) {
    const toBlock = fromBlock + stride - 1n < o.to ? fromBlock + stride - 1n : o.to
    await f(fromBlock, toBlock)
    await setTimeout(o.rest || 16)
  }
}
