import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { contracts, mq } from 'lib'

export default class ContractsFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.fanout] = mq.queue(mq.q.fanout)
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout() {
    for (const contract of contracts) {
      for (const source of contract.source || []) {
        const data = { contract, source }
        await this.queues[mq.q.fanout].add(mq.job.fanout.events, data)
        await this.queues[mq.q.extract].add(mq.job.extract.snapshot, data)
      }

      if(contract.thing) {
        // 👀
      }
    }
  }
}
