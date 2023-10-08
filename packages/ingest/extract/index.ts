import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { EvmLogsExtractor } from './evmlogs'
import { ApetaxExtractor } from './apetax'
import { TvlExtractor } from './tvl'
import { VaultExtractor } from './vault'
import { HarvestExtractor } from './harvest'

export default class Extract implements Processor {
  worker: Worker | undefined

  extractors = {
    [mq.job.extract.evmlogs]: new EvmLogsExtractor(),
    [mq.job.extract.vault]: new VaultExtractor(),
    [mq.job.extract.harvest]: new HarvestExtractor(),
    [mq.job.extract.tvl]: new TvlExtractor(),
    [mq.job.extract.apetax]: new ApetaxExtractor()
  }

  async up() {
    await Promise.all(Object.values(this.extractors).map(e => e.up()))
    this.worker = mq.worker(mq.q.extract, async job => {
      console.log('⬇️', job.name)
      await this.extractors[job.name].extract(job.data)
    })
  }

  async down() {
    await this.worker?.close()
    await Promise.all(Object.values(this.extractors).map(e => e.down()))
  }
}
