import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import HarvestAprFanout from './harvestApr'
import RegistryFanout from './registry'
import VaultFanout from './vault'
import TvlFanout from './tvl'

export default class Fanout implements Processor {
  worker: Worker | undefined

  fanouts = {
    [mq.job.fanout.registry]: new RegistryFanout(),
    [mq.job.fanout.vault]: new VaultFanout(),
    [mq.job.fanout.tvl]: new TvlFanout(),
    [mq.job.fanout.harvestApr]: new HarvestAprFanout()
  } as { [key: string]: Processor & { do: () => Promise<void> } }

  async up() {
    await Promise.all(Object.values(this.fanouts).map(f => f.up()))
    this.worker = mq.worker(mq.q.fanout, async job => {
      console.log('📤', job.name)
      this.fanouts[job.name].do()
    })
  }

  async down() {
    await this.worker?.close()
    await Promise.all(Object.values(this.fanouts).map(f => f.down()))
  }
}
