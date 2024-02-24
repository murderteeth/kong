import { setTimeout } from 'timers/promises'
import { contracts } from './factories'
import { chains, mq } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { getAddressPointer, getLatestBlock, setAddressPointer } from '../../db'
import { max } from 'lib/math'

export default class FactoryFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout() {
    for(const chain of chains) {
      for(const factory of contracts.filter(c => c.chainId === chain.id)) {
        const blockPointer = await getAddressPointer(factory.chainId, factory.address)
        const from = max(blockPointer, factory.incept)
        const to = await getLatestBlock(chain.id)
        console.log('🪭', 'fanout', factory.chainId, factory.address, from, to)

        const stride = BigInt(process.env.LOG_STRIDE || 10_000)
        const throttle = 16
        for (let block = from; block <= to; block += stride) {
          const toBlock = block + stride - 1n < to ? block + stride - 1n : to
          const options = {
            chainId: factory.chainId, 
            address: factory.address,
            events: JSON.stringify(factory.events),
            from: block, to: toBlock,
            handler: factory.handler
          }
          await this.queues[mq.q.extract].add(mq.job.extract.evmlog, options)
          await setTimeout(throttle)
        }

        await setAddressPointer(factory.chainId, factory.address, to)
      }
    }
  }
}
