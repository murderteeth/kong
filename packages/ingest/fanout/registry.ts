import { setTimeout } from 'timers/promises'
import { contracts } from 'lib/contracts/yearn/registries'
import { chains, mq } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { getBlockPointer, getLatestBlock, setBlockPointer } from '../db'

export default class RegistryFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async do() {
    for(const chain of chains) {
      const registries = contracts.for(chain.id)
      for(const key of Object.keys(registries)) {
        const registry = contracts.at(chain.id, key)
        const blockPointer = await getBlockPointer(chain.id, registry.address)
        const from = blockPointer || registry.incept
        const to = await getLatestBlock(chain.id)
        await this.fanoutExtract(
          chain.id,
          registry.address,
          registry.events, 
          from, to)
        await setBlockPointer(chain.id, registry.address, to)
      }
    }
  }

  async fanoutExtract(chainId: number, address: string, events: any, from: bigint, to: bigint) {
    console.log('📤', 'fanout', chainId, address, from, to)
    const stride = BigInt(process.env.LOG_STRIDE || 100_000)
    const throttle = 16
    for (let block = from; block <= to; block += stride) {
      const toBlock = block + stride - 1n < to ? block + stride - 1n : to
      const options = {
        chainId, address,
        events: JSON.stringify(events),
        from: block, to: toBlock,
        handler: 'registry'
      }
      await this.queues[mq.q.extract].add(mq.job.extract.evmlogs, options)
      await setTimeout(throttle)
    }
  }
}
