import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { HarvestAprComputer } from './harvestApr'
import { TvlComputer } from './tvl'
import { ApyComputer } from './apy'

export default class Computer implements Processor {
  worker: Worker | undefined

  computers = {
    [mq.job.compute.tvl.name]: new TvlComputer(),
    [mq.job.compute.apy.name]: new ApyComputer(),
    [mq.job.compute.harvestApr.name]: new HarvestAprComputer()
  }

  async up() {
    this.worker = mq.worker(mq.q.compute, async job => {
      const label = `🧮 ${job.name} ${job.id}`
      console.time(label)
      await this.computers[job.name].compute(job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
  }
}
