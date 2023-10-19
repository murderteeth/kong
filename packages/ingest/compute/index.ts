import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { HarvestAprComputer } from './harvestApr'
import { TvlComputer } from './tvl'
import { ApyComputer } from './apy'

export default class Computer implements Processor {
  queue: Queue | undefined
  worker: Worker | undefined

  computers = {
    [mq.job.compute.tvl]: new TvlComputer(),
    [mq.job.compute.apy]: new ApyComputer(),
    [mq.job.compute.harvestApr]: new HarvestAprComputer()
  }

  async up() {
    await Promise.all(Object.values(this.computers).map(c => c.up()))
    this.worker = mq.worker(mq.q.compute, async job => {
      const label = `🧮 ${job.name} ${job.id}`
      console.time(label)
      await this.computers[job.name].compute(job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
    await Promise.all(Object.values(this.computers).map(c => c.down()))
  }
}
