import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import HarvestAprPoller from './harvestApr'

export default class Poller implements Processor {
  worker: Worker | undefined
  harvestApr: HarvestAprPoller = new HarvestAprPoller()

  async up() {
    await this.harvestApr.up()
    this.worker = mq.worker(mq.q.fanout, async job => {
      console.log('💈', job.name)
      if(job.name === mq.job.fanout.harvestApr) {
        await this.harvestApr?.do()
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.harvestApr?.down()
  }
}
