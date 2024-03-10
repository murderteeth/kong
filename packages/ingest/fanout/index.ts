import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import HarvestAprFanout from './harvestApr'
import TvlFanout from './tvl'
import ApyFanout from './apy'
import ContractsFanout from './contracts'
import EventsFanout from './events'

export default class Fanout implements Processor {
  worker: Worker | undefined

  fanouts = {
    [mq.job.fanout.tvl.name]: new TvlFanout(),
    [mq.job.fanout.apy.name]: new ApyFanout(),
    [mq.job.fanout.harvestApr.name]: new HarvestAprFanout(),
    [mq.job.fanout.contracts.name]: new ContractsFanout(),
    [mq.job.fanout.events.name]: new EventsFanout()
  } as { [key: string]: Processor & { fanout: (data?: any) => Promise<void> } }

  async up() {
    this.worker = mq.worker(mq.q.fanout, async job => {
      const label = `🪭 ${job.name} ${job.id}`
      console.time(label)
      await this.fanouts[job.name].fanout(job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
  }
}
