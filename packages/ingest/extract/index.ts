import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { EvmLogsExtractor } from './evmlogs'
import { ApetaxExtractor } from './apetax'
import { BlockExtractor } from './block'
import { RiskExtractor } from './risk'
import { MetaExtractor } from './meta'
import { WaveyDbExtractor } from './waveydb'
import { SnapshotExtractor } from './snapshot'
import { TimeseriesExtractor } from './timeseries'

export default class Extract implements Processor {
  worker: Worker | undefined

  extractors = {
    [mq.job.extract.block.name]: new BlockExtractor(),
    [mq.job.extract.evmlog.name]: new EvmLogsExtractor(),
    [mq.job.extract.apetax.name]: new ApetaxExtractor(),
    [mq.job.extract.risk.name]: new RiskExtractor(),
    [mq.job.extract.meta.name]: new MetaExtractor(),
    [mq.job.extract.waveydb.name]: new WaveyDbExtractor(),
    [mq.job.extract.snapshot.name]: new SnapshotExtractor(),
    [mq.job.extract.timeseries.name]: new TimeseriesExtractor()
  }

  async up() {
    this.worker = mq.worker(mq.q.extract, async job => {
      const label = job.data.replay 
      ? `🎭 ${job.name} ${job.id}`
      : `🛸 ${job.name} ${job.id}`
      console.time(label)
      await this.extractors[job.name].extract(job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
  }
}
