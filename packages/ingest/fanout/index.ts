import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import HarvestAprFanout from './harvestApr'
import RegistryFanout from './registry'

export default class Fanout implements Processor {
  worker: Worker | undefined
  registry: RegistryFanout = new RegistryFanout()
  harvestApr: HarvestAprFanout = new HarvestAprFanout()

  async up() {
    await this.registry.up()
    await this.harvestApr.up()
    this.worker = mq.worker(mq.q.fanout, async job => {
      console.log('📤', job.name)
      if(job.name === mq.job.fanout.registry) {
        await this.registry?.do()

      } else if(job.name === mq.job.fanout.harvestApr) {
        await this.harvestApr?.do()

      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.harvestApr?.down()
    await this.registry?.down()
  }
}
