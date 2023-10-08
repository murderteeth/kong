import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { EvmLogsExtractor } from './evmlogs'
import { ApetaxExtractor } from './apetax'
import { VaultExtractor } from './vault'
import { HarvestExtractor } from './harvest'
import { StrategyExtractor } from './strategy'
import { TransferExtractor } from './transfer'
import { BlockExtractor } from './block'

export default class Extract implements Processor {
  worker: Worker | undefined

  extractors = {
    [mq.job.extract.block]: new BlockExtractor(),
    [mq.job.extract.evmlogs]: new EvmLogsExtractor(),
    [mq.job.extract.vault]: new VaultExtractor(),
    [mq.job.extract.strategy]: new StrategyExtractor(),
    [mq.job.extract.harvest]: new HarvestExtractor(),
    [mq.job.extract.apetax]: new ApetaxExtractor(),
    [mq.job.extract.transfer]: new TransferExtractor()
  }

  async up() {
    await Promise.all(Object.values(this.extractors).map(e => e.up()))
    this.worker = mq.worker(mq.q.extract, async job => {
      console.log('⬇️ ', job.name)
      await this.extractors[job.name].extract(job.data)
    })
  }

  async down() {
    await this.worker?.close()
    await Promise.all(Object.values(this.extractors).map(e => e.down()))
  }
}
