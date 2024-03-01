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
import { RiskExtractor } from './risk'
import { MetaExtractor } from './meta'
import { WaveyDbExtractor } from './waveydb'
import { SnapshotExtractor } from './snapshot'

export default class Extract implements Processor {
  worker: Worker | undefined

  extractors = {
    [mq.job.extract.block]: new BlockExtractor(),
    [mq.job.extract.evmlog]: new EvmLogsExtractor(),
    [mq.job.extract.vault]: new VaultExtractor(),
    [mq.job.extract.strategy]: new StrategyExtractor(),
    [mq.job.extract.harvest]: new HarvestExtractor(),
    [mq.job.extract.apetax]: new ApetaxExtractor(),
    [mq.job.extract.transfer]: new TransferExtractor(),
    [mq.job.extract.risk]: new RiskExtractor(),
    [mq.job.extract.meta]: new MetaExtractor(),
    [mq.job.extract.waveydb]: new WaveyDbExtractor(),
    [mq.job.extract.snapshot]: new SnapshotExtractor()
  }

  async up() {
    await Promise.all(Object.values(this.extractors).map(e => e.up()))
    this.worker = mq.worker(mq.q.extract, async job => {
      const label = `🛸 ${job.name} ${job.id}`
      console.time(label)
      await this.extractors[job.name].extract(job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
    await Promise.all(Object.values(this.extractors).map(e => e.down()))
  }
}
