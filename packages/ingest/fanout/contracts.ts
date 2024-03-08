import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { contracts, mq } from 'lib'
import * as things from '../things'

export default class ContractsFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.fanout] = mq.queue(mq.q.fanout)
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout(data: any) {
    for (const contract of contracts) {
      for (const source of contract.sources) {
        const _data = { ...data, contract, source }
        await this.queues[mq.q.fanout].add(mq.job.fanout.events, _data)
        await this.queues[mq.q.extract].add(mq.job.extract.snapshot, _data)
      }

      if(contract.things) {
        const _things = await things.get(contract.things)
        for (const _thing of _things) {
          const _data = { ...data, contract, source: { 
            chainId: _thing.chainId, 
            address: _thing.address, 
            inceptBlock: _thing.defaults.inceptBlock 
          } }
          await this.queues[mq.q.fanout].add(mq.job.fanout.events, _data)
          await this.queues[mq.q.extract].add(mq.job.extract.snapshot, _data)
        }
      }
    }
  }
}
