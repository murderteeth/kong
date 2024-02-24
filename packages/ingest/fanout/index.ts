import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import HarvestAprFanout from './harvestApr'
import RegistryFanout from './registry'
import VaultFanout from './vault'
import TvlFanout from './tvl'
import ApyFanout from './apy'
import FactoryFanout from './factory'
import ContractsFanout from './contracts'
import EventsFanout from './events'

export default class Fanout implements Processor {
  worker: Worker | undefined

  fanouts = {
    [mq.job.fanout.registry]: new RegistryFanout(),
    [mq.job.fanout.vault]: new VaultFanout(),
    [mq.job.fanout.tvl]: new TvlFanout(),
    [mq.job.fanout.apy]: new ApyFanout(),
    [mq.job.fanout.harvestApr]: new HarvestAprFanout(),
    [mq.job.fanout.factory]: new FactoryFanout(),
    [mq.job.fanout.contracts]: new ContractsFanout(),
    [mq.job.fanout.events]: new EventsFanout()
  } as { [key: string]: Processor & { fanout: (data?: any) => Promise<void> } }

  async up() {
    await Promise.all(Object.values(this.fanouts).map(f => f.up()))
    this.worker = mq.worker(mq.q.fanout, async job => {
      const label = `🪭 ${job.name} ${job.id}`
      console.time(label)
      await this.fanouts[job.name].fanout(job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
    await Promise.all(Object.values(this.fanouts).map(f => f.down()))
  }
}
